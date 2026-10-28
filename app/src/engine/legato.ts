// The legato style: light for slow, flowing music with no beat to lock to (Ave Maria).
//
// The rest of the generator finds its timing in beats, drums and note attacks; a sustained, rubato
// song gives it little of either, and the beat-driven moves leave long stretches dark. Here the light
// follows the music's breath and its melody instead:
//
//   bed      lamps join and leave in layers as the music swells and fades, always on 2 s ramps:
//              0  the truck's bar glows softly (dimmable, so its brightness follows the loudness)
//              1  the Ys' signature strips              (most of the song)
//              2  the Ys' DRLs                          (louder than ~40 % of the song)
//              3  every fog lamp                        (louder than ~70 %)
//              4  every headlight - the bloom           (the loudest ~10 %: the climax)
//            thresholds come from the song's own loudness, with hysteresis and a minimum dwell so a
//            layer never flickers; the stage is never dark while music plays
//   swoop    the melody as one soft light gliding across the stage by pitch (low = crowd's left):
//            a bright spot sliding along the truck's bar, and on the Ys the inner beam on that side
//            fading in and out as the melody passes - legato, overlapping, never a blink. The
//            headlights are kept for the swoop and the bloom, so the swoop always shows
//   colour   the interiors glow from deep blue toward warm gold as the music swells
//   ending   a slow fade to dark as the music ends (no closing flash)
//
// Car lamps can't hold a dim level - only on or off, with 0.5/1/2 s ramps (Tesla's README) - so
// loudness becomes how many lamps are lit, plus the parts that really dim: the bar and the interiors.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import * as M from './moves';
import { argsort, clip, convolveSame, interp, max, mean, percentile, runs } from './np';

const RES = 0.25;                                  // seconds per control step
const LAYER_PCT = [12, 40, 70, 90];                 // loudness percentiles at which layers 1-4 come in
const HYST = 0.04;                                  // ...and go out this much lower
const MIN_DWELL = 2.5;                              // seconds a layer stays once it changes

/**
 * Loudness 0-1 on a RES grid: the intensity curve smoothed over ~3 s, ranked within the song
 * and blended with its level below the song's peak (so a quiet song still breathes).
 */
function loudness(an: Analysis): Float64Array {
  const step = an.step;
  const k = Math.max(1, Math.trunc(3.0 / step));
  const sm = convolveSame(an.intensity, new Float64Array(k).fill(1 / k));
  const db = new Float64Array(sm.length);
  for (let i = 0; i < db.length; i++) db[i] = 20 * Math.log10(Math.max(sm[i], 1e-4));
  const dbMax = max(db);
  const order = argsort(argsort(sm));
  const d = Math.max(sm.length - 1, 1);
  const level = new Float64Array(sm.length);
  for (let i = 0; i < level.length; i++) {
    const absolute = clip((db[i] - (dbMax - 24)) / 24, 0, 1);
    level[i] = 0.55 * absolute + 0.45 * (order[i] / d);
  }
  const stride = Math.max(1, Math.trunc(RES / step));
  const out: number[] = [];
  for (let i = 0; i < level.length; i += stride) out.push(level[i]);
  return Float64Array.from(out);
}

/** [start, end] of the audible music: the first and last moments within 30 dB of the peak. */
function musicSpan(an: Analysis): [number, number] {
  const db = new Float64Array(an.intensity.length);
  for (let i = 0; i < db.length; i++) db[i] = 20 * Math.log10(Math.max(an.intensity[i], 1e-4));
  const lim = max(db) - 30;
  let first = -1, last = -1;
  for (let i = 0; i < db.length; i++) {
    if (db[i] > lim) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return [0.0, an.duration];
  return [first * an.step, (last + 1) * an.step];
}

/**
 * Layer count (0-4) per RES step, with hysteresis and a minimum dwell; the thresholds are
 * percentiles of the song's own loudness, so every song uses its whole range.
 */
function layers(L: ArrayLike<number>, live: ArrayLike<boolean>): Int32Array {
  const liveL: number[] = [];
  for (let i = 0; i < L.length; i++) if (live[i]) liveL.push(L[i]);
  const up = liveL.length ? LAYER_PCT.map((p) => percentile(liveL, p)) : [0.2, 0.4, 0.6, 0.8];
  const out = new Int32Array(L.length);
  let cur = 0, since = -1e9;
  for (let i = 0; i < L.length; i++) {
    const v = L[i];
    const t = i * RES;
    let want = cur;
    while (want < 4 && v >= up[want]) want += 1;
    while (want > 0 && v < up[want - 1] - HYST) want -= 1;
    if (want !== cur && t - since >= MIN_DWELL) {
      cur = cur + (want > cur ? 1 : -1);       // one layer at a time
      since = t;
    }
    out[i] = cur;
  }
  return out;
}

function glow(car: Car, chs: readonly number[], t0: number, t1: number, up: number = C.ON_2000,
  down: number = C.OFF_2000, downS = 2.0): void {
  car.light(chs, t0, t1, up);
  car.light(chs, t1, t1 + downS, down);
}

/**
 * Stage position 0-1 (crowd's left to right) of the melody on a RES grid, NaN where no melody
 * sounds: the top notes of the transcription, gliding from one note to the next.
 */
function melodyPath(an: Analysis, t0: number, t1: number, n: number): Float64Array {
  const ev = an.events;
  const pos = new Float64Array(n).fill(NaN);
  if (ev === undefined || ev === null || !ev.t.length) return pos;
  const lo = percentile(ev.top, 5), hi = percentile(ev.top, 95);
  const ampCut = percentile(ev.amp, 35);
  const t: number[] = [], top: number[] = [], dur: number[] = [];
  for (let i = 0; i < ev.t.length; i++) {
    if (ev.amp[i] >= ampCut) {
      t.push(ev.t[i]);
      top.push(ev.top[i]);
      dur.push(ev.dur[i]);
    }
  }
  for (let i = 0; i < t.length; i++) {
    const a = Math.trunc(t[i] / RES);
    const b = Math.trunc(Math.min(t[i] + Math.max(dur[i], 0.4), i + 1 < t.length ? t[i + 1] : t[i] + dur[i]) / RES) + 1;
    const p = clip((top[i] - lo) / Math.max(hi - lo, 1), 0, 1);
    for (let k = a; k < Math.min(b, n); k++) pos[k] = p;
  }
  // glide: smooth across ~0.75 s where the melody is continuous
  const k = 3;
  const out = Float64Array.from(pos);
  for (let i = 0; i < n; i++) {
    const w: number[] = [];
    for (let j = Math.max(0, i - k); j < Math.min(n, i + k + 1); j++) if (!Number.isNaN(pos[j])) w.push(pos[j]);
    if (w.length && !Number.isNaN(pos[i])) out[i] = mean(w);
  }
  const a = Math.trunc(t0 / RES), b = Math.trunc(t1 / RES);
  out.fill(NaN, 0, Math.min(a, n));
  out.fill(NaN, Math.min(b, n));
  return out;
}

/** All the lights for a legato song (the motors are scheduled separately, as for any song). */
export function choreograph(cars: Car[], an: Analysis): void {
  const ct = M.centreTruck(cars);
  const [start, end] = musicSpan(an);
  let L = loudness(an);
  const n = L.length;
  const tt = new Float64Array(n);
  for (let i = 0; i < n; i++) tt[i] = i * RES;
  const live: boolean[] = [];
  for (let i = 0; i < n; i++) live.push(tt[i] >= start && tt[i] < end);
  L = L.map((v, i) => (live[i] ? v : 0));
  const lay = layers(L, live).map((v, i) => (live[i] ? v : -1));

  // 1. the bed, layer by layer
  const groups: [number, (c: Car) => readonly number[]][] = [
    [1, (c) => (!c.isCt ? c.sig() : [])],
    [2, (c) => (!c.isCt ? c.drl() : [])],
    [3, (c) => c.fogs()],
    [4, (c) => c.heads()],
  ];
  for (const [k, group] of groups) {
    for (const [a, b] of runs(Array.from(lay, (v) => v >= k))) {
      for (const c of cars) {
        const chs = group(c);
        if (chs.length) glow(c, chs, a * RES, b * RES);
      }
    }
  }

  // the truck's bar: a glow that follows the loudness (it dims), plus the melody's spot below
  if (ct !== null) {
    const f0 = ct.fr(start), f1 = ct.fr(end);
    const m = Math.max(0, f1 - f0);
    const frameT = new Float64Array(m);
    for (let i = 0; i < m; i++) frameT[i] = (f0 + i) * ct.step;
    const level = interp(frameT, tt, L);
    const rows: Float64Array[] = [];
    for (let i = 0; i < m; i++) {
      const fadeIn = clip((frameT[i] - start) / 4.0, 0, 1);
      const fadeOut = clip((end - frameT[i]) / 3.0, 0, 1);
      const base = (0.06 + 0.24 * level[i]) * fadeIn * fadeOut;
      rows.push(new Float64Array(C.FRONT_BAR.length).fill(base));
    }
    ct.pixels(C.FRONT_BAR, start, rows);
  }

  // 2. the swoop: the melody gliding across the stage
  const path = melodyPath(an, start, end, n);
  const stage = path.map((v) => v * 2 * cars.length);    // two slots per car (its left and right), crowd-left to right
  for (let slot = 0; slot < 2 * cars.length; slot++) {
    const car = cars[Math.floor(slot / 2)];
    const side = slot % 2 === 0 ? 'L' : 'R';
    if (car === ct) continue;
    const here = Array.from(stage, (v) => !Number.isNaN(v) && Math.floor(v) === slot);
    for (const [a, b] of runs(here)) {
      if ((b - a) * RES >= 0.5) glow(car, car.inner(side), a * RES, b * RES + 0.25, C.ON_1000, C.OFF_2000);
    }
  }
  if (ct !== null) {
    const f0 = ct.fr(start);
    const m = Math.max(0, ct.fr(end) - f0);
    const frameT = new Float64Array(m);
    for (let i = 0; i < m; i++) frameT[i] = f0 * ct.step + i * ct.step;
    const s = interp(frameT, tt, stage.map((v) => (Number.isNaN(v) ? -10 : v)));
    const k = 2 * cars.indexOf(ct);                        // the truck's two slots: k and k + 1
    const nLed = C.FRONT_BAR.length;
    const spot: Float64Array[] = [];
    for (let i = 0; i < m; i++) {
      const onTruck = s[i] >= k - 0.5 && s[i] <= k + 2.5;
      const centre = clip((s[i] - k) / 2, 0, 1) * (nLed - 1);
      const row = new Float64Array(nLed);
      for (let j = 0; j < nLed; j++) {
        const z = (j - centre) / 6.0;
        row[j] = Math.exp(-(z * z)) * (onTruck ? 1 : 0) * 0.9;
      }
      spot.push(row);
    }
    ct.pixels(C.FRONT_BAR, start, spot);
  }

  // 3. colour: the interiors from deep blue toward warm gold as the music swells
  const cold = [20, 40, 140], warm = [255, 160, 50];
  for (let i = 0; i < n; i++) {
    if (!live[i]) continue;
    const v = L[i];
    const colour = cold.map((c0, j) => Math.trunc(c0 + (warm[j] - c0) * v));
    for (const c of cars) c.rgb(i * RES, (i + 1) * RES, colour, 0.3 + 0.7 * v);
  }

  // 4. the ending: everything that's lit fades out slowly as the music ends
  for (const c of cars) {
    c.set(c.everything(), end, an.duration, 0);
    let row = Math.min(c.fr(end) - 1, c.nFrames - 1);
    if (row < 0) row += c.nFrames;                          // numpy's negative index
    const lit = c.everything().filter((ch) => c.get(row, ch) > 0);
    if (lit.length) c.light(lit, end, Math.min(an.duration, end + 2.0), C.OFF_2000);
  }
}
