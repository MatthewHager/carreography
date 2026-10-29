// Music analysis on the show's frame grid: what the choreography reacts to.
//   hits      the strongest accents in the whole piece
//   beats / downbeats, tempo-following (the neural tracker's, where its grid keeps a pulse)
//   events    the transcribed notes grouped into key presses and chords (texture.ts)
//   sections  the form map (form.ts)
//   and what a music visualizer shows: loudness, band levels, the drum kit piece by piece, brightness,
//   chroma, novelty, how much a kit is playing and how clear the beat is (visual.ts)
// Everything comes from the full mix: there is no source separation.

import type { Analysis } from '../analysis';
import { analyzeForm } from './form';
import { argmax, diff, mean, median, quantile, sum } from '../np';
import { groupEvents, labelPhrases, pitchScale } from './texture';
import {
  beatTrack, framesToTime, HOP, localTempo, onsetDetect, onsetStrength, powerToDb, spectrum, SR,
} from './dsp';
import { visuals } from './visual';

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

const BREAK = 2.5;        // a gap this many times the usual one is a break in the music, not a beat

/** Each beat gap over the median of the eight around it (1 = in step with its neighbours). */
function localRatio(g: ArrayLike<number>): Float64Array {
  return Float64Array.from(g, (x, i) => x / median(Array.from(g).slice(Math.max(0, i - 4), i + 5)));
}

/** Beats and downbeats from the neural tracker, where its grid keeps a pulse: at least `minSteady` of the
 * beat gaps within 10 % of the gaps around them. Measured locally, so a performer who speeds up (Hall of
 * the Mountain King doubles its tempo) or holds back keeps the tracker's beats; an erratic grid, which is
 * where the tracker is guessing, gives null. Breaks (gaps over BREAK times the usual) don't count. Where
 * it slips into half time for a while, the missing beats are put back (mendHalves). */
function neuralBeats(d: NeuralBeats | null | undefined, env: Float32Array, minSteady = 0.85)
  : [number[], number[]] | null {
  if (!d) return null;
  const b = d.beats, db = d.downbeats;
  if (b.length < 16) return null;
  const all = diff(b), usual = median(all);
  const g = all.filter((x) => x < BREAK * usual);
  if (g.length < 8) return null;
  let steady = 0;
  for (const r of localRatio(g)) if (Math.abs(r - 1) < 0.1) steady++;
  if (steady / g.length < minSteady) return null;
  return [mendHalves(b, env), db.slice()];
}

const HALF = [1.75, 2.3];    // a gap this many times the steady one is a beat dropped (twice, give or take)
const IN_STEP = 0.15;         // gaps within this share of each other keep the same pace

/** The beats with the tracker's half-time slips mended: where a run of beat gaps (at least two, each IN_STEP
 * of the one before) is twice the steady gaps just before it (HALF) and the music still hits halfway between
 * (the onset curve `env` there at least half as strong as on the beats), the halfway beats go back in. */
function mendHalves(b: number[], env: Float32Array): number[] {
  const at = (t: number) => {
    const i = Math.round(t / (HOP / SR));
    let m = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(env.length - 1, i + 2); k++) m = Math.max(m, env[k]);
    return m;
  };
  const g = diff(b), out: number[] = [b[0]], brk = BREAK * median(g);
  let ref = median(Array.from(g).slice(0, 8));
  for (let i = 0; i < g.length; i++) {
    const r = g[i] / ref;
    if (r > HALF[0] && r < HALF[1] && g[i] < brk) {
      let j = i + 1;      // the slow beats run on while each gap is in step with the one before
      while (j < g.length && Math.abs(g[j] / g[j - 1] - 1) < IN_STEP) j++;
      const mids = [];
      for (let k = i; k < j; k++) mids.push((b[k] + b[k + 1]) / 2);
      const onBeats = median(b.slice(i, j + 1).map(at)), between = median(mids.map(at));
      if (j - i >= 2 && between >= 0.5 * onBeats) {
        for (let k = i; k < j; k++) out.push(mids[k - i], b[k + 1]);
        i = j - 1;
        continue;
      }
    }
    out.push(b[i + 1]);
    if (g[i] < brk && Math.abs(r - 1) < IN_STEP) ref = 0.75 * ref + 0.25 * g[i];   // follows the tempo
  }
  return out;
}

function gather(env: Float32Array, frames: ArrayLike<number>, start = 0, by = 1): Float32Array {
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

  const spec = spectrum(y);
  const T = spec.T;
  const melDb = powerToDb(spec.mel96!, 'max');

  // --- Beats, tempo-following ---
  const fullEnv = onsetStrength(melDb, T, 0, 96);
  const localBpm = localTempo(fullEnv);
  const beatFrames = beatTrack(fullEnv, localBpm);
  let tempo = median(localBpm);
  let beats = beatFrames.map((f) => framesToTime(f));
  const every4 = (a: number[], from: number) => a.filter((_, i) => i >= from && (i - from) % 4 === 0);
  let downbeats: number[];
  if (beatFrames.length >= 8) {
    const sums = [0, 1, 2, 3].map((p) => sum(gather(fullEnv, beatFrames, p, 4)));
    downbeats = every4(beats, argmax(sums));
  } else {
    downbeats = every4(beats, 0);
  }

  // --- Global accents: strongest onsets anywhere, >= 0.5 s apart ---
  const frames = onsetDetect(fullEnv);
  const hits: number[] = [];
  if (frames.length) {
    const s = frames.map((f) => fullEnv[f]);
    const cut = quantile(s, 0.93);
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

  const beatScore = mean(gather(fullEnv, beatFrames)) / Math.max(mean(fullEnv), 1e-9);

  // --- Form map: sections, repeats, per-section tempo ---
  const sections = analyzeForm(y, duration, spec);
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
          ? mean(gather(fullEnv, fb, 1, 2)) > mean(gather(fullEnv, fb, 0, 2)) : false;
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
  const neural = neuralBeats(opts.neuralBeats, fullEnv);
  if (neural !== null) {
    // the neural tracker's grid wherever it keeps a pulse: it reads swing, shuffles, fills and a
    // performer's tempo far better than onset autocorrelation, so it replaces the per-section tracking below
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
        const phase = argmax([0, 1, 2, 3].map((p) => sum(gather(fullEnv, bf, p, 4))));
        downs.push(every4(sb, phase));
      } else if (sb.length) {
        downs.push(every4(sb, 0));
      }
    }
    if (downs.length) downbeats = downs.flat();
  }

  const events = labelPhrases(groupEvents(opts.notes));
  const [pitchLo, pitchHi] = pitchScale(events);

  return {
    duration, nFrames, step, tempo, beats, downbeats, hits, events, pitchLo, pitchHi, beatScore, sections,
    heardBeats: opts.neuralBeats?.beats.slice() ?? null,
    pulseEnv: Array.from(fullEnv), pulseHop: HOP / SR,
    ...visuals(y, spec, fullEnv, beats, nFrames, step),
  };
}
