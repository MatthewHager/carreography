// Mood and pacing: how hard the lights should hit, phrase by phrase.
//
// Every phrase gets an energy in 0..1 from three things:
//   loudness   the smoothed level, as a rank within the song blended with distance below its peak
//   form       the section's ceiling from the form map (0..3)
//   density    how many notes per second the phrase plays, as a rank within the song
//
// and a mood with a hit rate to match:
//   calm    one hit a bar (every 4 beats; 2 when the tempo is slow), soft ramped glows, slow swoops
//   groove  every other beat
//   drive   every beat
//   frenzy  every half beat - kept for climaxes, trills and the top of a build
//
// Note-following moves are thinned to the mood's rate (each window keeps its strongest note and
// holds it until the next), so a calm passage swoops through the stage instead of ticking every note,
// and every-beat hitting is saved for the parts where the music picks up.

import type { Analysis, Events, Phrase } from './analysis';
import { ceilingAt } from './arc';
import { frameSpan } from './phrases';
import { argsort, clip, convolveSame, diff, max, mean, median } from './np';
import { clarity } from './feel';
import { beatLen } from './tempo';

const BEATS_PER_HIT: Record<string, number> = { calm: 4, groove: 2, drive: 1, frenzy: 0.5 };
const MIN_GAP_S: Record<string, number> = { calm: 1.5, groove: 0.7, drive: 0.0, frenzy: 0.0 };   // never faster than this

function rank(x: ArrayLike<number>): Float64Array {
  const order = argsort(argsort(x));
  const d = Math.max(x.length - 1, 1);
  const out = new Float64Array(x.length);
  for (let i = 0; i < out.length; i++) out[i] = order[i] / d;
  return out;
}

/** Per-frame energy 0..1. */
function energyCurve(an: Analysis): Float64Array {
  const step = an.step;
  const n = an.intensity.length;
  const win = Math.max(1, Math.trunc(3.0 / step));
  const kern = new Float64Array(win).fill(1 / win);
  const loud = convolveSame(an.intensity, kern);
  const db = new Float64Array(loud.length);
  for (let i = 0; i < db.length; i++) db[i] = 20 * Math.log10(Math.max(loud[i], 1e-4));
  const dbMax = max(db);
  const absolute = new Float64Array(db.length);
  for (let i = 0; i < db.length; i++) absolute[i] = clip((db[i] - (dbMax - 18)) / 18, 0, 1);
  const loudRank = rank(loud);
  const loudE = new Float64Array(loud.length);
  for (let i = 0; i < loudE.length; i++) loudE[i] = 0.5 * loudRank[i] + 0.5 * absolute[i];
  const hasSecs = !!(an.sections && an.sections.length);
  const ceil = new Float64Array(n);
  if (hasSecs) {
    const nBlocks = Math.ceil(n / 25);
    const c = new Float64Array(nBlocks);
    for (let k = 0; k < nBlocks; k++) c[k] = ceilingAt(an, k * 25 * step);
    for (let i = 0; i < n; i++) ceil[i] = c[Math.floor(i / 25)] / 3.0;
  } else {
    ceil.fill(2 / 3);
  }
  const ev = an.events;
  let dens: Float64Array = new Float64Array(n);
  if (ev.t.length) {
    for (let i = 0; i < ev.t.length; i++) {
      const idx = clip(Math.trunc(ev.t[i] / step), 0, n - 1);
      dens[idx] += 1.0;
    }
    dens = convolveSame(dens, new Float64Array(Math.trunc(2.0 / step)).fill(1 / 2.0));   // notes per second
  }
  const densE = rank(dens);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = clip(0.5 * loudE[i] + 0.3 * ceil[i] + 0.2 * densE[i], 0, 1);
  return out;
}

/** Set ph.energy, ph.mood and ph.pace (seconds between hits) on every phrase. */
export function assign(an: Analysis, phrases: Phrase[]): void {
  const e = energyCurve(an);
  an.energy = e;
  const beat = beatLen(an);
  for (const ph of phrases) {
    const [a, b] = frameSpan(an, ph);
    ph.energy = b > a && a < e.length ? mean(e, a, Math.min(b, e.length)) : NaN;
    ph.mood = moodFor(ph.energy);
    // a steady, clearly struck beat keeps a phrase out of "calm" (Thriller's quiet groove intro),
    // but rhythm alone never pushes it higher - the dynamics still come from the music's energy
    if (ph.mood === 'calm' && clarity(an, ph.t0, ph.t1) >= 4.0) ph.mood = 'groove';
    ph.pace = paceS(ph.mood, beat);
  }
  // A trill or a dense run in a lively section is frenzy material whatever the loudness says.
  for (const ph of phrases) {
    if (ph.gesture === 'trill' && (ph.energy as number) >= 0.45) {
      ph.mood = 'frenzy';
      ph.pace = paceS('frenzy', beat);
    }
  }
}

function moodFor(energy: number): string {
  if (energy < 0.36) return 'calm';
  if (energy < 0.55) return 'groove';
  if (energy < 0.78) return 'drive';
  return 'frenzy';
}

function paceS(mood: string, beat: number): number {
  const k = BEATS_PER_HIT[mood];
  let p = k * beat;
  while (p < MIN_GAP_S[mood]) p *= 2;
  return p;
}

export function moodAt(an: Analysis, t: number): string {
  const e = an.energy;
  if (!e) return 'drive';
  return moodFor(e[Math.min(e.length - 1, Math.max(0, Math.trunc(t / an.step)))]);
}

/** Thin a beat grid so hits are at least `pace` apart (calm/groove), or double it (frenzy). */
export function pacedGrid(times: ArrayLike<number>, pace: number): Float64Array {
  const ts = Float64Array.from(times);
  if (ts.length < 2) return ts;
  const d = diff(ts);
  const gap = median(d);
  if (pace < gap * 0.75) {                      // frenzy: add the off-beats
    const all = new Float64Array(ts.length * 2 - 1);
    for (let i = 0; i < ts.length; i++) all[i] = ts[i];
    for (let i = 0; i < d.length; i++) all[ts.length + i] = ts[i] + d[i] / 2;
    return all.sort();
  }
  const keep: number[] = [];
  let last = -1e9;
  for (const t of ts) {
    if (t - last >= pace * 0.9) {
      keep.push(t);
      last = t;
    }
  }
  return Float64Array.from(keep);
}

/**
 * [events, phrase] with the phrase's notes thinned to its pace: in each window of `pace`
 * seconds keep the strongest note (loud and long wins) and let it ring until the next one.
 * Returns the originals when the mood hits on every note anyway.
 */
export function thinned(an: Analysis, ph: Phrase): [Events, Phrase] {
  const ev = an.events;
  const pace = ph.pace ?? 0.0;
  if (['drive', 'frenzy'].includes(ph.mood ?? 'drive') || ph.b - ph.a < 3) return [ev, ph];
  const idx: number[] = [];
  for (let i = ph.a; i < ph.b; i++) idx.push(i);
  const score = idx.map((i) => ev.amp[i] * (1 + Math.min(ev.dur[i], 2.0)) + 0.3 * (ev.kind[i] >= 2 ? 1 : 0));
  const bins = idx.map((i) => Math.trunc((ev.t[i] - ph.t0) / pace));
  const uniq = [...new Set(bins)].sort((x, y) => x - y);
  const keepArr: number[] = [];
  for (const k of uniq) {
    let best = -1;
    for (let j = 0; j < idx.length; j++) {
      if (bins[j] !== k) continue;
      if (best < 0 || score[j] > score[best]) best = j;
    }
    keepArr.push(idx[best]);
  }
  const keep = keepArr.sort((x, y) => x - y);
  if (keep.length === idx.length) return [ev, ph];
  const nEv = ev.t.length;
  const order: number[] = [];
  for (let i = 0; i < ph.a; i++) order.push(i);
  for (const i of keep) order.push(i);
  for (let i = ph.b; i < nEv; i++) order.push(i);
  const fields: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(ev)) {
    fields[name] = Array.isArray(v) && v.length === nEv ? order.map((i) => v[i]) : v;
  }
  const ev2 = fields as unknown as Events;
  // ring each kept note until the next kept one (a swoop, not a tick)
  const k0 = ph.a, k1 = ph.a + keep.length;
  for (let k = k0; k < k1; k++) {
    const nxt = k + 1 < k1 ? ev2.t[k + 1] : ph.t1;
    ev2.dur[k] = Math.max(ev2.dur[k], Math.min(nxt - ev2.t[k] - 0.05, 3.0));
  }
  const ph2: Phrase = { ...ph };
  ph2.b = k1;
  return [ev2, ph2];
}
