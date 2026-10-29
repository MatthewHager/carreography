// How big the show is at each moment: one level, 0..1 per frame, that every layer reads. It follows the
// music's loudness, so a pianissimo is sparse and soft and a fortissimo fills every car, and it saves its
// top for the song's peak, as a lighting designer keeps the full look for the biggest chorus.
//
//   loudness   half of it: the mix's level in dB (an.loudness: the song's loud end 1, 40 dB below it 0),
//              rising at once and falling over a second and a half, so a hit lands at full size and a fade
//              lingers; to the power 1.5, so the steps are wider at the loud end, where music builds
//   rank       two fifths: how loud the music is here against the rest of the song (its loudness over three
//              seconds, ranked): a pop song's verse is only a few decibels under its chorus, but it is
//              the quieter part of the song, and the show should say so
//   activity   a tenth: the notes and drum hits a second, as a rank within the song
//   the top    step 4 only in the peak: the loudest section in the second half of the song, with the
//              as-loud sections just before it and any as loud after it; everywhere else the level stops
//              just under it
//
// Five steps, each with a pace (mood.ts) and a size:
//   0  hush     single soft lamps, no pulse, no motors
//   1  calm     a lamp or two a note, soft fades, a pulse on the downbeats where the beat is clear
//   2  groove   half cars, the pulse on 1 and 3, the drums
//   3  drive    every beat, half cars with headlights, the rear lit, the motors
//   4  peak     everything: whole cars, every beat and its off-beat, the lids dancing

import type { Analysis } from './analysis';
import { clip, quantile } from './np';

export const STEPS = [0.2, 0.4, 0.6, 0.8];
const TOP = STEPS[3];
const RISE_S = 0.15, FALL_S = 1.5;

/** Per frame: notes and drum hits a second, over the two seconds around. */
function activity(an: Analysis): Float32Array {
  const n = an.nFrames, hits = new Float32Array(n);
  const add = (t: number) => {
    const f = Math.round(t / an.step);
    if (f >= 0 && f < n) hits[f] += 1;
  };
  for (const t of an.events.t) add(t);
  for (const list of [an.kick, an.snare, an.hats]) for (const [t, s] of list) if (s >= 0.25) add(t);
  const half = Math.round(1 / an.step), out = new Float32Array(n), cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + hits[i];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half), b = Math.min(n, i + half + 1);
    out[i] = (cs[b] - cs[a]) / ((b - a) * an.step);
  }
  return out;
}

/** Each value's rank among `pool` (sorted), 0..1. */
function rankIn(pool: Float64Array, v: number): number {
  let lo = 0, hi = pool.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (pool[m] < v) lo = m + 1;
    else hi = m;
  }
  return pool.length > 1 ? lo / (pool.length - 1) : 0.5;
}

/** The level curve: see the module notes. */
export function levelCurve(an: Analysis): Float32Array {
  const n = an.nFrames, x = an.loudness;
  const up = 1 - Math.exp(-an.step / RISE_S), down = 1 - Math.exp(-an.step / FALL_S);
  const loud = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) loud[i] = y += (x[i] - y) * (x[i] > y ? up : down);
  const half = Math.round(1.5 / an.step), cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + x[i];
  const slow = Float64Array.from({ length: n }, (_, i) => {
    const a = Math.max(0, i - half), b = Math.min(n, i + half + 1);
    return (cs[b] - cs[a]) / (b - a);
  });
  const heard = slow.filter((v) => v > 0.05).sort();
  const act = activity(an), lo = quantile(act, 0.1), hi = Math.max(quantile(act, 0.95), lo + 1e-6);
  const out = loud.map((v, i) => clip(0.5 * v ** 1.5 + 0.4 * rankIn(heard, slow[i])
    + 0.1 * clip((act[i] - lo) / (hi - lo), 0, 1), 0, 1));
  // the top step is the peak's alone
  const secs = an.sections?.length ? an.sections : [{ t0: 0, t1: an.duration }];
  const mean = secs.map((s) => {
    const a = Math.trunc(s.t0 / an.step), b = Math.min(n, Math.max(a + 1, Math.trunc(s.t1 / an.step)));
    let m = 0;
    for (let i = a; i < b; i++) m += out[i];
    return m / Math.max(1, b - a);
  });
  const late = secs.map((_, i) => i).filter((i) => secs[i].t0 >= 0.45 * an.duration);
  const pool = late.length ? late : secs.map((_, i) => i);
  const peak = pool.reduce((best, i) => (mean[i] > mean[best] ? i : best), pool[0]);
  let first = peak;                                  // the peak takes in the as-loud sections just before it
  while (first > 0 && mean[first - 1] >= 0.95 * mean[peak]) first--;
  secs.forEach((sec, i) => {
    if ((i >= first && i <= peak) || (i > peak && mean[i] >= 0.95 * mean[peak])) return;
    const a = Math.trunc(sec.t0 / an.step), b = Math.min(n, Math.trunc(sec.t1 / an.step));
    for (let f = a; f < b; f++) out[f] = Math.min(out[f], TOP - 0.01);
  });
  return out;
}

/** The level at t, 0..1 (choreograph sets an.level). */
export function levelAt(an: Analysis, t: number): number {
  const lv = an.level!;
  return lv[clip(Math.trunc(t / an.step), 0, lv.length - 1)];
}

/** The level's step, 0 (hush) to 4 (the peak). */
export function stepOf(level: number): number {
  let k = 0;
  while (k < STEPS.length && level >= STEPS[k]) k++;
  return k;
}

export const stepAt = (an: Analysis, t: number) => stepOf(levelAt(an, t));

/** The mean level over [t0, t1). */
export function levelOver(an: Analysis, t0: number, t1: number): number {
  const lv = an.level!;
  const a = clip(Math.trunc(t0 / an.step), 0, lv.length - 1), b = clip(Math.trunc(t1 / an.step), a + 1, lv.length);
  let m = 0;
  for (let i = a; i < b; i++) m += lv[i];
  return m / (b - a);
}
