// Flowing light, for the stretches of a song with no beat to follow (feel.ts): a chorale, a free
// cadenza, a sung prayer like Ave Maria.
//
// The rest of the generator finds its timing in beats, drums and note attacks; sustained, rubato music
// gives it little of either, and the beat-driven moves leave long stretches dark. Here the light follows
// the music's breath and its melody instead:
//
//   bed      lamps join and leave in layers as the music swells and fades, always on 2 s ramps:
//              0  the truck's bar glows softly (dimmable, so its brightness follows the loudness)
//              1  the Ys' signature strips              (most of the song)
//              2  the Ys' DRLs                          (louder than ~40 % of the song)
//              3  every fog lamp                        (louder than ~70 %)
//              4  every headlight - the bloom           (the loudest ~10 %: the climax)
//            thresholds come from the whole song's loudness, with hysteresis and a minimum dwell so
//            a layer never flickers; the stage is never dark while music plays
//   swoop    the melody as one soft light gliding across the stage by pitch (low = crowd's left),
//            each phrase spread over the whole stage: a bright spot sliding along the truck's bar,
//            and on the Ys the inner beam on that side fading in and out as the melody passes (a run
//            sweeps through on half-second ramps, a held note swells over a second) - overlapping,
//            never a blink. The headlights are kept for the swoop and the bloom, so it always shows
//   colour   the interiors glow from deep blue toward warm gold as the music swells
//   ending   a slow fade to dark as the music ends (no closing flash), when the song ends flowing
//
// Each flowing stretch fades in and out on the same ramps, so the beat sections around it take over
// without a seam.
//
// Car lamps can't hold a dim level - only on or off, with 0.5/1/2 s ramps (Tesla's README) - so
// loudness becomes how many lamps are lit, plus the parts that really dim: the bar and the interiors.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import type { Feel } from './feel';
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

/** The lamps ramp up (over 2 s, or as `up` says) and stay on from t0 to t1, then fade over 2 s. */
function glow(car: Car, chs: readonly number[], t0: number, t1: number, up: number = C.ON_2000): void {
  car.light(chs, t0, t1, up);
  car.light(chs, t1, t1 + 2.0, C.OFF_2000);
}

/**
 * Stage position 0-1 (crowd's left to right) of the melody on a RES grid, NaN where no melody
 * sounds: the top notes of the transcription, gliding from one note to the next. Each phrase spreads
 * its own range across the stage, as the moves do, so the melody reaches every car.
 */
function melodyPath(an: Analysis, t0: number, t1: number, n: number): Float64Array {
  const ev = an.events;
  const pos = new Float64Array(n).fill(NaN);
  if (!ev?.t.length) return pos;
  const song = { lo: percentile(ev.top, 5), hi: percentile(ev.top, 95) };
  const range = new Array<[number, number]>(ev.t.length).fill(M.phraseRange(song));
  for (const ph of an.phrases ?? []) range.fill(M.phraseRange(ph), ph.a, ph.b);
  const ampCut = percentile(ev.amp, 35);
  const kept: number[] = [];
  for (let i = 0; i < ev.t.length; i++) if (ev.amp[i] >= ampCut) kept.push(i);
  kept.forEach((i, k) => {
    const next = k + 1 < kept.length ? ev.t[kept[k + 1]] : ev.t[i] + ev.dur[i];
    const a = Math.trunc(ev.t[i] / RES);
    const b = Math.trunc(Math.min(ev.t[i] + Math.max(ev.dur[i], 0.4), next) / RES) + 1;
    const [lo, hi] = range[i];
    const p = clip((ev.top[i] - lo) / Math.max(hi - lo, 1), 0, 1);
    for (let q = a; q < Math.min(b, n); q++) pos[q] = p;
  });
  // glide: smooth across half a second where the melody is continuous
  const k = 1;
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

/** The lights for the stretches that flow (the motors are scheduled separately, as for any song). */
export function choreograph(cars: Car[], an: Analysis, spans: Feel[]): void {
  const ct = M.centreTruck(cars);
  const [start, end] = musicSpan(an);
  const flows = (t: number) => t >= start && t < end && spans.some((s) => s.t0 <= t && t < s.t1);
  let L = loudness(an);
  const n = L.length;
  const tt = new Float64Array(n);
  for (let i = 0; i < n; i++) tt[i] = i * RES;
  const audible = Array.from(tt, (t) => t >= start && t < end);
  const here = Array.from(tt, flows);
  L = L.map((v, i) => (audible[i] ? v : 0));
  const lay = layers(L, audible).map((v, i) => (here[i] ? v : -1));

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

  // the truck's bar, through each flowing stretch: a glow that follows the loudness (it dims), fading in
  // over 4 s and out over 3 s, with the melody's spot over it
  const path = melodyPath(an, start, end, n).map((v, i) => (here[i] ? v : NaN));
  const stage = path.map((v) => v * 2 * cars.length);    // two slots per car, crowd-left to right
  if (ct !== null) {
    const k = 2 * cars.indexOf(ct);                        // the truck's two slots: k and k + 1
    const nLed = C.FRONT_BAR.length;
    const s = stage.map((v) => (Number.isNaN(v) ? -10 : v));
    for (const [a, b] of runs(here)) {
      const t0 = a * RES, t1 = b * RES;
      const f0 = ct.fr(t0), m = Math.max(0, ct.fr(t1) - f0);
      const frameT = Float64Array.from({ length: m }, (_, i) => (f0 + i) * ct.step);
      const level = interp(frameT, tt, L), spot = interp(frameT, tt, s);
      const rows: Float64Array[] = [];
      for (let i = 0; i < m; i++) {
        const fade = clip((frameT[i] - t0) / 4.0, 0, 1) * clip((t1 - frameT[i]) / 3.0, 0, 1);
        const onTruck = spot[i] >= k - 0.5 && spot[i] <= k + 2.5;
        const centre = clip((spot[i] - k) / 2, 0, 1) * (nLed - 1);
        const row = new Float64Array(nLed);
        for (let j = 0; j < nLed; j++) {
          const z = (j - centre) / 6.0;
          row[j] = Math.max((0.06 + 0.24 * level[i]) * fade, onTruck ? 0.9 * Math.exp(-(z * z)) : 0);
        }
        rows.push(row);
      }
      ct.pixels(C.FRONT_BAR, t0, rows);
    }
  }

  // 2. the swoop: the melody gliding across the stage
  for (let slot = 0; slot < 2 * cars.length; slot++) {
    const car = cars[Math.floor(slot / 2)];
    const side = slot % 2 === 0 ? 'L' : 'R';
    if (car === ct) continue;
    const on = Array.from(stage, (v) => !Number.isNaN(v) && Math.floor(v) === slot);
    for (const [a, b] of runs(on)) {         // a passing run lights each car briefly, a held note swells
      glow(car, car.inner(side), a * RES, b * RES + 0.25, (b - a) * RES >= 1 ? C.ON_1000 : C.ON_500);
    }
  }

  // 3. colour: the interiors from deep blue toward warm gold as the music swells
  const cold = [20, 40, 140], warm = [255, 160, 50];
  for (let i = 0; i < n; i++) {
    if (!here[i]) continue;
    const v = L[i];
    const colour = cold.map((c0, j) => Math.trunc(c0 + (warm[j] - c0) * v));
    for (const c of cars) c.rgb(i * RES, (i + 1) * RES, colour, 0.3 + 0.7 * v);
  }

  // 4. the ending, when the song ends flowing: everything that's lit fades out slowly as the music ends
  if (!flows(end - RES)) return;
  for (const c of cars) {
    c.set(c.everything(), end, an.duration, 0);
    const row = Math.max(0, Math.min(c.fr(end) - 1, c.nFrames - 1));
    const lit = c.everything().filter((ch) => c.get(row, ch) > 0);
    if (lit.length) c.light(lit, end, Math.min(an.duration, end + 2.0), C.OFF_2000);
  }
}
