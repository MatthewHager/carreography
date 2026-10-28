// Lining LRCLIB's lines up with the recording that was dropped in. LRCLIB's times belong to some
// release of the song; this file may start earlier or later (a longer intro, a trimmed edit).
//
// The singer is nearly always in the middle of the stereo picture while much of the band is spread out,
// so "how much more of the 200-4000 Hz band is in the middle than at the sides" rises while someone
// sings. Each line is taken to be sung for a time that follows its length in words, and the lines are
// slid across the song (up to 15 s either way) to where they best cover that curve. A song's verses look
// alike, so a slide by a bar or a phrase can look nearly as good: the slide is trusted only when the
// first, middle and last thirds of the lines, slid on their own, mostly agree with it. When they don't,
// LRCLIB's own times are kept if its release is as long as this file and the voice doesn't clearly
// prefer somewhere else; otherwise the lyrics are left out rather than shown in the wrong places.
//
// Checked against Whisper's word times on the five sung Halloween songs: line starts land a median
// 0.13-0.75 s from where the line is sung, against 0.15-0.51 s for LRCLIB's times at their single best
// offset. With the first 7.3 s cut off, four of the five are still found the same; Whisper's own misses
// make the 90th percentiles (0.7-6 s) mostly noise. The wrong song's lyrics were turned away 18 times
// in 20.

import type { LyricLine } from '../analysis';
import { sungFor } from '../lyrics';
import { realFft } from './fft';
import type { Candidate } from './lrclib';

export const STEP = 0.02;              // the show's frame
const N_FFT = 2048;
const F_LO = 200, F_HI = 4000;         // the voice's band
const MAX_SHIFT_S = 15;
const AGREE_S = 0.6;                   // thirds agreeing this closely back the slide
const SAME_LENGTH_S = 3;               // LRCLIB's release and this file are the same length
const NEAR_S = 1;
const MIN_SUPPORT = 0.6;               // ... and the voice doesn't clearly prefer another place
const MIN_LINES = 6;

/** Per 20 ms frame: how far the voice band leans to the middle of the stereo picture (mean log ratio of
 * mid to side power). null for a mono recording, which has no sides to compare with. */
export function vocalCurve(left: Float32Array, right: Float32Array, sr: number): Float64Array | null {
  const n = left.length, hop = Math.round(sr * STEP), nFrames = Math.floor(n / hop) + 1;
  const fft = realFft(N_FFT), half = N_FFT / 2;
  const k0 = Math.ceil((F_LO * N_FFT) / sr), k1 = Math.min(half, Math.floor((F_HI * N_FFT) / sr));
  const win = Float64Array.from({ length: N_FFT }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N_FFT));
  const m = new Float64Array(N_FFT), s = new Float64Array(N_FFT);
  const mr = new Float64Array(half + 1), mi = new Float64Array(half + 1);
  const sr_ = new Float64Array(half + 1), si = new Float64Array(half + 1);
  const nb = k1 - k0 + 1;
  // a floor under each bin's power, so near-silent bins don't swing the ratio (the window's sum squared:
  // 1e-9 of a full-scale bin)
  const floor = 1e-9 * (N_FFT / 2) ** 2;
  const raw = new Float64Array(nFrames);
  let midSum = 0, sideSum = 0;
  for (let f = 0; f < nFrames; f++) {
    const start = f * hop - half;      // frames are centred on their time
    for (let i = 0; i < N_FFT; i++) {
      const j = start + i;
      const l = j >= 0 && j < n ? left[j] : 0, r = j >= 0 && j < n ? right[j] : 0;
      m[i] = (l + r) * win[i];
      s[i] = (l - r) * win[i];
    }
    fft.forward(m, mr, mi);
    fft.forward(s, sr_, si);
    let acc = 0;
    for (let k = k0; k <= k1; k++) {
      const pm = mr[k] * mr[k] + mi[k] * mi[k], ps = sr_[k] * sr_[k] + si[k] * si[k];
      acc += Math.log(pm + floor) - Math.log(ps + floor);
      midSum += pm;
      sideSum += ps;
    }
    raw[f] = acc / nb;
  }
  if (sideSum < 1e-6 * midSum) return null;
  // a tenth of a second's average, centred
  const out = new Float64Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    let acc = 0, c = 0;
    for (let k = Math.max(0, f - 2); k <= Math.min(nFrames - 1, f + 2); k++, c++) acc += raw[k];
    out[f] = acc / c;
  }
  return out;
}

/** For each slide of the lines (frames, -max..max), the curve's mean over the time they're sung. */
export function slideScores(curve: Float64Array, lines: LyricLine[], maxShift: number): Float64Array {
  const n = curve.length;
  let mean = 0;
  for (const v of curve) mean += v / n;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + curve[i] - mean;
  const spans = lines.map((l) => [Math.round(l.t / STEP), Math.round((l.t + sungFor(l)) / STEP)]);
  const out = new Float64Array(2 * maxShift + 1);
  for (let k = -maxShift; k <= maxShift; k++) {
    let sum = 0, len = 0;
    for (const [a, b] of spans) {
      const lo = Math.max(0, a + k), hi = Math.min(n, b + k);
      if (hi > lo) [sum, len] = [sum + prefix[hi] - prefix[lo], len + hi - lo];
    }
    out[k + maxShift] = len ? sum / len : -Infinity;
  }
  return out;
}

const bestShift = (scores: Float64Array, maxShift: number) => {
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  return best - maxShift;
};

export interface Alignment {
  offset: number;                 // seconds to add to LRCLIB's times
  by: 'voice' | 'length';         // found in the audio, or LRCLIB's times kept for a same-length release
  agree: number;                  // thirds of the lines that agreed with the slide (0-3)
}

/** Where `lines` fall in this recording, or null when that can't be told with confidence.
 * `curve` is vocalCurve's (null for mono), `duration` the recording's length, `lyricsDuration` the
 * length of the release LRCLIB timed the lines on. */
export function align(lines: LyricLine[], curve: Float64Array | null, duration: number, lyricsDuration: number,
  maxShiftS = MAX_SHIFT_S): Alignment | null {
  let agree = 0, support = 1;
  const max = Math.round(maxShiftS / STEP);
  const scores = curve && lines.length >= MIN_LINES ? slideScores(curve, lines, max) : null;
  let mean = 0;
  for (const s of scores ?? []) mean += s / scores!.length;
  const whole = scores ? bestShift(scores, max) : 0;
  if (scores && scores[whole + max] - mean > 1e-9) {       // (a flat curve says nothing)
    for (let p = 0; p < 3; p++) {
      const third = lines.slice(Math.floor((p * lines.length) / 3), Math.floor(((p + 1) * lines.length) / 3));
      if (Math.abs(bestShift(slideScores(curve!, third, max), max) - whole) * STEP <= AGREE_S) agree++;
    }
    if (agree >= 2) return { offset: round2(whole * STEP), by: 'voice', agree };
    // how well LRCLIB's own times (give or take a second) fit, against the best slide
    let near = -Infinity;
    const w = Math.round(NEAR_S / STEP);
    for (let k = max - w; k <= max + w; k++) near = Math.max(near, scores[k]);
    support = (near - mean) / (scores[whole + max] - mean);
  }
  if (Math.abs(lyricsDuration - duration) <= SAME_LENGTH_S && support >= MIN_SUPPORT) {
    return { offset: 0, by: 'length', agree };
  }
  return null;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** What became of the song's lyrics, for the page to say. */
export interface LyricsReport {
  status: 'found' | 'none' | 'instrumental' | 'unsynced' | 'unplaced' | 'failed';
  lines: number;                  // lines placed in the song
  offset: number | null;
  by: Alignment['by'] | null;
}

/** The first of LRCLIB's versions (best guess first) that can be placed in this recording, moved into place. */
export function place(candidates: Candidate[], curve: Float64Array | null, duration: number)
  : { lines: LyricLine[] | null; report: LyricsReport } {
  for (const c of candidates) {
    const a = align(c.lines, curve, duration, c.duration);
    if (!a) continue;
    const lines = shiftLines(c.lines, a.offset, duration);
    if (lines.length) return { lines, report: { status: 'found', lines: lines.length, offset: a.offset, by: a.by } };
  }
  return { lines: null, report: { status: 'unplaced', lines: 0, offset: null, by: null } };
}

/** The lines moved by `offset` seconds, keeping only those that start inside the song. */
export function shiftLines(lines: LyricLine[], offset: number, duration: number): LyricLine[] {
  return lines.map((l) => ({ t: round2(l.t + offset), end: round2(Math.min(l.end + offset, duration)), text: l.text }))
    .filter((l) => l.t >= 0 && l.t < duration - 0.5);
}
