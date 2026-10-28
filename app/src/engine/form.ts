// The form map: the shape of the whole piece, read before any phrase is choreographed.
//
//   sections   boundaries from beat-synchronous chroma + timbre (agglomerative clustering)
//   letters    repeated material gets the same letter (A, B, A', ...) by chroma/timbre similarity
//   energy     mean loudness per section; the climax section is the loudest in the second half
//   ceiling    the intensity each section is allowed (0..3): an arc that saves the top for the climax,
//              with every repeat of a letter allowed one step more than the last ("escalation")
//   repeatOf   index of the first section with the same letter, for callbacks

import type { Section } from './analysis';
import { chromaCqt } from './listen/cqt';
import {
  agglomerative, beatTrackY, framesToTime, HOP, mfcc, normalizeColumns, spectrum, sync, type Spectrum,
} from './listen/dsp';
import { clip, mean, mean32, round } from './np';

/** The form map of `y` (mono, 22050 Hz): its sections, from the spectrum audio.ts already took of the
 * same samples. */
export function analyzeForm(y: Float32Array, sr: number, intensity: ArrayLike<number>, step: number,
  duration: number, spec?: Spectrum): Section[] {
  const hop = HOP;
  const s = spec ?? spectrum(y);
  const T = s.T;
  const chroma = chromaCqt(y, s.tuning);
  const mf = mfcc(s.mel128, T);
  let beatFrames = beatTrackY(y, s).beats;
  if (beatFrames.length < 8) beatFrames = Array.from({ length: Math.ceil(T / 20) }, (_, i) => i * 20);
  const Cs = sync(chroma, 12, T, beatFrames, 'median');
  const Ms = sync(mf, 13, T, beatFrames, 'mean');
  const nc = Cs.nc, Cn = normalizeColumns(Cs.data, 12, nc), Mn = normalizeColumns(Ms.data, 13, nc);
  const X = new Float32Array(25 * nc);
  X.set(Cn);
  for (let i = 0; i < 13 * nc; i++) X[12 * nc + i] = 0.5 * Mn[i];
  let k = clip(round(duration / 22.0), 3, 14);
  k = Math.min(k, nc - 1);
  const raw = agglomerative(X, 25, nc, k);
  const bt = beatFrames.map((f) => framesToTime(f, sr, hop));
  const bounds = [...new Set([0, ...raw])].sort((a, b) => a - b);
  const colMean = (b: number, e: number) => {
    const out = new Float64Array(25), row = new Float32Array(Math.max(0, Math.min(e, nc) - b));
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < row.length; c++) row[c] = X[r * nc + b + c];
      out[r] = row.length ? mean32(row) : NaN;
    }
    return out;
  };
  const spans: [number, number, Float64Array][] = [];
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    const e = i + 1 < bounds.length ? bounds[i + 1] : bt.length;
    const t0 = i ? bt[Math.min(b, bt.length - 1)] : 0.0;
    const t1 = e < bt.length ? bt[Math.min(e, bt.length - 1)] : duration;
    if (t1 - t0 >= 4.0 || !spans.length) spans.push([t0, t1, colMean(b, Math.max(e, b + 1))]);
    else spans[spans.length - 1][1] = t1;   // too short: absorb into the previous
  }
  spans[spans.length - 1][1] = duration;

  // Letters: sections whose feature profile and length match get the same letter.
  const letters: string[] = [], feats: [Float64Array, number][] = [];
  const dot = (a: Float64Array, b: Float64Array) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  for (const [t0, t1, f] of spans) {
    let letter: string | null = null;
    for (let L = 0; L < feats.length; L++) {
      const [g, length] = feats[L];
      const cos = dot(f, g) / Math.max(Math.sqrt(dot(f, f)) * Math.sqrt(dot(g, g)), 1e-9);
      const ratio = (t1 - t0) / Math.max(length, 1e-9);
      if (cos >= 0.93 && ratio >= 0.6 && ratio <= 1.6) {
        letter = String.fromCharCode(65 + L);
        break;
      }
    }
    if (letter === null) {
      feats.push([f, t1 - t0]);
      letter = String.fromCharCode(65 + feats.length - 1);
    }
    letters.push(letter);
  }

  const sections: Section[] = spans.map(([t0, t1], i) => {
    const a = Math.trunc(t0 / step), b = Math.min(Math.max(a + 1, Math.trunc(t1 / step)), intensity.length);
    const e = a < b ? mean(intensity, a, b) : NaN;
    return { t0, t1, letter: letters[i], energy: e, ceiling: 3, repeatOf: -1, index: i, nth: 0, tempo: 0.0,
      beats: [] };
  });
  const first = new Map<string, Section>();
  for (const s of sections) {
    const f = first.get(s.letter);
    if (f) {
      s.repeatOf = f.index;
      s.nth = sections.slice(0, s.index).filter((q) => q.letter === s.letter).length;
    } else first.set(s.letter, s);
  }

  // The arc: the climax is the loudest section in the second half (or the loudest overall).
  let late = sections.filter((s) => s.t0 >= 0.45 * duration);
  if (!late.length) late = sections;
  const climax = late.reduce((best, s) => (s.energy > best.energy ? s : best));
  const top = Math.max(...sections.map((s) => s.energy));
  const order = [...sections].sort((a, b) => a.energy - b.energy);
  const n = order.length;
  order.forEach((s, rank) => {           // ceilings by rank: loudest third 3, middle 2, rest 1
    const frac = (rank + 1) / n;
    let ceiling = frac > 2 / 3 ? 3 : frac > 1 / 3 ? 2 : 1;
    const rel = s.energy / Math.max(top, 1e-9);
    if (rel < 0.15) ceiling = 0;
    else if (rel < 0.3) ceiling = Math.min(ceiling, 1);
    if (s.index < climax.index) ceiling = Math.min(ceiling, 2);   // nothing before the climax gets the top tier...
    if (s.nth > 0) ceiling = Math.min(3, ceiling + 1);            // ...except that every repeat escalates one step
    if (s === climax || (s.index > climax.index && rel >= 0.7)) ceiling = 3;
    s.ceiling = ceiling;
  });
  // The opening stays modest unless it is genuinely the loudest thing in the piece.
  if (sections[0] !== climax) {
    sections[0].ceiling = Math.min(sections[0].ceiling, sections[0].energy / top < 0.6 ? 1 : 2);
  }

  // Per-section tempo and beats, so beat-locked moves survive tempo changes.
  for (const s of sections) {
    const a = Math.trunc(s.t0 * sr), b = Math.trunc(s.t1 * sr);
    const seg = y.subarray(a, Math.max(a, b));
    if (seg.length > sr * 3) {
      try {
        const { tempo, beats } = beatTrackY(seg);
        s.tempo = tempo;
        s.beats = beats.map((f) => framesToTime(f, sr, hop) + s.t0);
      } catch {
        // as Python: a section the tracker can't read keeps no tempo
      }
    }
  }
  return sections;
}

export function sectionAt(sections: Section[], t: number): Section {
  for (const s of sections) if (s.t0 <= t && t < s.t1) return s;
  return sections[sections.length - 1];
}
