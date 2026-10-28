// Music analysis on the show's frame grid: what the choreography reacts to.
//   bass      low-frequency hits (kick, timpani, low brass, organ pedal)
//   highs     bright transients (cymbals, xylophone, string attacks)
//   hits      the strongest accents in the whole piece
//   beats / downbeats, tempo-following (the neural tracker's, where its grid is steady)
//   intensity per frame 0..1: loudness weighted so the show builds across the piece
//   tier      per frame 0..3: intensity in four steps
//   build     per frame: inside a crescendo (energy rising steadily), with its 0..1 progress
//   events    the transcribed notes grouped into key presses and chords (texture.ts)
//   sections  the form map (form.ts)
// Everything comes from the full mix: there is no source separation.

import type { Analysis } from '../analysis';
import { analyzeForm } from '../form';
import {
  argmax, clip, convolveSame, diff, interp, linspace, max, mean32, median, percentile, quantile, quantiles,
  searchsorted, sum32,
} from '../np';
import { groupEvents, labelPhrases, pitchScale } from '../texture';
import {
  beatTrack, framesToTime, HOP, localTempo, melFrequencies, onsetDetect, onsetStrength, powerToDb, spectrum,
  SR,
} from './dsp';

const f32 = Math.fround;

interface NeuralBeats {
  beats: number[];
  downbeats: number[];
}

interface AnalyzeOptions {
  stepMs: number;
  /** basic-pitch notes: rows of (start s, end s, midi pitch, amplitude 0..1), sorted by start */
  notes: number[][];
  /** the neural beat tracker's grid (beat-this), if it ran */
  neuralBeats?: NeuralBeats | null;
}

/** Beats and downbeats from the neural tracker, but only when its grid is steady - at least `minSteady`
 * of the beat gaps within 10 % of the median gap - which is where it is reliable (songs with a drum kit).
 * A share rather than a standard deviation, so one long gap (a break, the fade-out) doesn't disqualify a
 * steady song. Otherwise null. */
function neuralBeats(d: NeuralBeats | null | undefined, minSteady = 0.9): [number[], number[]] | null {
  if (!d) return null;
  const b = d.beats, db = d.downbeats;
  if (b.length < 16) return null;
  const g = diff(b), med = median(g);
  let steady = 0;
  for (const x of g) if (Math.abs(x / med - 1) < 0.1) steady++;
  if (steady / g.length < minSteady) return null;
  return [b.slice(), db.slice()];
}

function toGrid(values: ArrayLike<number>, times: ArrayLike<number>, grid: ArrayLike<number>): Float64Array {
  return interp(grid, times, values);
}

/** [time, strength 0..1] of the onsets in the spectral flux of a mel-band slice (rows [r0, r1) of the
 * dB mel). */
function bandOnsets(melDb: Float32Array, T: number, r0: number, r1: number, delta: number, wait: number)
  : number[][] {
  const env = onsetStrength(melDb, T, r0, r1, { lag: 2, aggregate: 'mean' });
  const frames = onsetDetect(env, { delta, wait });
  if (frames.length === 0) return [];
  const s = frames.map((f) => env[f]);
  const lo = quantile(env.filter((v) => v > 0), 0.5), hi = quantile(s, 0.97);
  // float32, as numpy keeps the envelope's dtype against float64 scalars
  const lo32 = f32(lo), span = f32(Math.max(hi - lo, 1e-9));
  return frames.map((f, i) => [framesToTime(f), clip(f32(f32(s[i] - lo32) / span), 0, 1)]);
}

/** Runs shorter than `minLen` take the value before them, so a level never flickers. */
function stabilize(level: ArrayLike<number>, minLen: number): number[] {
  const out = Array.from(level);
  let i = 0;
  while (i < out.length) {
    let j = i;
    while (j < out.length && out[j] === out[i]) j++;
    if (j - i < minLen && i > 0) for (let k = i; k < j; k++) out[k] = out[i - 1];
    i = j;
  }
  return out;
}

function gather32(env: Float32Array, frames: ArrayLike<number>, start = 0, by = 1): Float32Array {
  const out: number[] = [];
  for (let i = start; i < frames.length; i += by) out.push(env[Math.min(frames[i], env.length - 1)]);
  return Float32Array.from(out);
}

/** The analysis of `y` (mono, 22050 Hz samples) on a grid of `stepMs` frames. */
export function analyze(y: Float32Array, opts: AnalyzeOptions): Analysis {
  const sr = SR;
  const duration = y.length / sr;
  const step = opts.stepMs / 1000.0;
  const nFrames = Math.ceil(duration / step);
  const grid = new Float64Array(nFrames);
  for (let i = 0; i < nFrames; i++) grid[i] = i * step;

  const spec = spectrum(y);
  const T = spec.T;
  const melDb = powerToDb(spec.mel96!, 'max');
  const melF = melFrequencies(96, 0, 8000);
  const frameT = Float64Array.from({ length: T }, (_, i) => framesToTime(i));

  // --- Beats, tempo-following ---
  const fullEnv = onsetStrength(melDb, T, 0, 96);
  const localBpm = localTempo(fullEnv);
  const beatFrames = beatTrack(fullEnv, localBpm);
  let tempo = median(localBpm);
  let beats = beatFrames.map((f) => framesToTime(f));
  const every4 = (a: number[], from: number) => a.filter((_, i) => i >= from && (i - from) % 4 === 0);
  let downbeats: number[];
  if (beatFrames.length >= 8) {
    const sums = [0, 1, 2, 3].map((p) => sum32(gather32(fullEnv, beatFrames, p, 4)));
    downbeats = every4(beats, argmax(sums));
  } else {
    downbeats = every4(beats, 0);
  }

  // --- Per-band onsets ---
  const rowsWhere = (ok: (f: number) => boolean): [number, number] => {
    const idx = [...melF.keys()].filter((i) => ok(melF[i]));
    return idx.length ? [idx[0], idx[idx.length - 1] + 1] : [0, 0];
  };
  const [b0, b1] = rowsWhere((f) => f < 180);
  const [h0, h1] = rowsWhere((f) => f >= 2000);
  const bass = bandOnsets(melDb, T, b0, b1, 0.12, 4);
  const highs = bandOnsets(melDb, T, h0, h1, 0.10, 2);

  // --- Global accents: strongest onsets anywhere, >= 0.5 s apart ---
  const frames = onsetDetect(fullEnv);
  const hits: number[] = [];
  if (frames.length) {
    const s = frames.map((f) => fullEnv[f]);
    const cut = f32(quantile(s, 0.93));
    let last = -1.0;
    frames.forEach((f, i) => {
      if (s[i] < cut) return;
      const t = framesToTime(f);
      if (t - last >= 0.5) {
        hits.push(t);
        last = t;
      }
    });
  }

  // --- Loudness and intensity ---
  const loud = toGrid(spec.rms!, frameT, grid);
  const smooth = (x: ArrayLike<number>, secs: number) => {
    const k = Math.max(1, Math.trunc(secs / step));
    return convolveSame(x, new Float64Array(k).fill(1 / k));
  };
  const fast = smooth(loud, 0.1);
  const [f05, f99] = quantiles(fast, [0.05, 0.99]);
  const loudFast = Array.from(fast, (v) => clip((v - f05) / Math.max(f99 - f05, 1e-9), 0, 1));
  const energyRaw = smooth(loud, 1.5);
  const [lo, hi] = quantiles(energyRaw, [0.05, 0.985]);
  const db = Float64Array.from(energyRaw, (v) => 20 * Math.log10(Math.max(v, 1e-6)));
  const dynRange = percentile(db, 95) - percentile(db, 10);   // ~25-35 dB classical, 8-13 dB pop
  const energy = Float64Array.from(energyRaw, (v) => clip((v - lo) / Math.max(hi - lo, 1e-9), 0, 1));
  // Later sections count for more, so the show keeps building across the piece.
  const position = (i: number) => grid[i] / Math.max(duration, 1e-9);
  const intensity = Array.from(energy, (e, i) => clip(e * (0.75 + 0.35 * position(i)), 0, 1));

  // Tiers are quantiles of intensity, so every piece gets calm, lively and all-out stretches; a
  // compressed, uniformly loud recording (small dynamic range) spends most of its time up top.
  const compression = clip((16 - dynRange) / 10, 0, 1);
  const wide = [0.30, 0.55, 0.80], flat = [0.10, 0.30, 0.60];
  const cuts = quantiles(intensity, wide.map((w, i) => w + (flat[i] - w) * compression));
  const tier = stabilize(intensity.map((v) => searchsorted(cuts, v, 'right')), Math.trunc(3.0 / step));

  // --- Builds: energy rising for 4 s or more ---
  const slow = smooth(loud, 3.0);
  const slowMax = Math.max(max(slow), 1e-9);
  const rising = stabilize(Array.from(slow, (_, i) => {
    const g = nFrames < 2 ? 0 : i === 0 ? slow[1] - slow[0] : i === nFrames - 1 ? slow[i] - slow[i - 1]
      : (slow[i + 1] - slow[i - 1]) / 2.0;
    return g / slowMax / step > 0.04 ? 1 : 0;   // fraction of max per second
  }), Math.trunc(1.0 / step)).map((v) => v !== 0);
  const build = new Array<number>(nFrames).fill(0);
  for (let i = 0; i < nFrames;) {
    if (rising[i]) {
      let j = i;
      while (j < nFrames && rising[j]) j++;
      if ((j - i) * step >= 4.0) linspace(0, 1, j - i).forEach((v, k) => (build[i + k] = v));
      i = j;
    } else i++;
  }

  const beatScore = f32(mean32(gather32(fullEnv, beatFrames)) / Math.max(mean32(fullEnv), 1e-9));

  // --- Form map: sections, repeats, arc ceilings, per-section tempo ---
  const sections = analyzeForm(y, intensity, step, duration, spec);
  let secBeats: number[][] = [];
  const toFrames = (ts: number[]) => ts.map((t) => Math.min(Math.trunc((t * sr) / HOP), fullEnv.length - 1));
  for (const sec of sections) {
    if (sec.tempo > 0 && sec.beats.length >= 4) {
      // fold half/double-time readings back toward the piece's tempo
      if (sec.tempo > tempo * 1.6) {
        // keep whichever half of the beats lands on the stronger hits - taking every other
        // beat from the first can lock the whole section onto the off-beats
        const fb = toFrames(sec.beats);
        const odd = fb.length >= 4
          ? mean32(gather32(fullEnv, fb, 1, 2)) > mean32(gather32(fullEnv, fb, 0, 2)) : false;
        sec.beats = sec.beats.filter((_, i) => i % 2 === (odd ? 1 : 0));
        sec.tempo = sec.tempo / 2;
      } else if (sec.tempo < tempo / 1.6) {
        const mids = sec.beats.slice(1).map((b, i) => (sec.beats[i] + b) / 2);
        sec.beats = [...sec.beats, ...mids].sort((a, b) => a - b);
        sec.tempo = sec.tempo * 2;
      }
      secBeats.push(sec.beats.filter((b) => b >= sec.t0 && b < sec.t1));
    }
  }
  const neural = neuralBeats(opts.neuralBeats);
  if (neural !== null) {
    // a steady grid from the neural tracker (band songs): it reads swing, shuffles and fills
    // far better than onset autocorrelation, so it replaces the per-section tracking below
    [beats, downbeats] = neural;
    tempo = 60.0 / median(diff(beats));
    secBeats = [];
  }
  if (secBeats.length && secBeats.reduce((n, b) => n + b.length, 0) >= 0.7 * beats.length) {
    beats = secBeats.flat();
    // downbeats phased section by section (a section can start on any beat of the bar)
    const downs: number[][] = [];
    for (const sb of secBeats) {
      if (sb.length >= 8) {
        const bf = toFrames(sb);
        const phase = argmax([0, 1, 2, 3].map((p) => sum32(gather32(fullEnv, bf, p, 4))));
        downs.push(every4(sb, phase));
      } else if (sb.length) {
        downs.push(every4(sb, 0));
      }
    }
    if (downs.length) downbeats = downs.flat();
  }

  const events = labelPhrases(groupEvents(opts.notes),
    (t) => tier[Math.min(Math.trunc(t / step), nFrames - 1)]);
  const [pitchLo, pitchHi] = pitchScale(events);

  return {
    duration, nFrames, step, tempo, beats, downbeats, bass, highs, hits, intensity, build, tier,
    loudFast, events, pitchLo, pitchHi, beatScore, sections,
    pulseEnv: Array.from(fullEnv), pulseHop: HOP / SR,
  };
}
