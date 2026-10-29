// Flowing light, for the stretches of a song with no beat to follow (feel.ts): a chorale, a free
// cadenza, a sung prayer like Ave Maria, the Toccata's free runs.
//
// The rest of the generator finds its timing in beats and drums; music that flows gives it no beat to hit.
// Here the light follows the music's breath and its melody instead:
//
//   breath   how full the music is at each moment: the show's level (level.ts, the song's arc) together with
//            the loudness against the rest of the flowing music, so the light swells with each sung phrase
//            and sinks between them as well as growing toward the climax
//   bed      lamps join and leave in layers as the breath rises and falls, on 2 s ramps, one layer at a
//            time with a short dwell so none flickers; each car uses lamps that read on it:
//                          Model Y            2025+ Model Y            Cybertruck
//              1           signatures         the fender repeaters     side markers
//              2           DRLs               -                        frunk light
//              3           fogs               the bar's centre         -
//              4           outer beams        outer beams              outer beams     (the bloom)
//            from layer 2 the tail lights glow too
//   truck    a Cybertruck's bar breathes: all of it glows with the breath (it dims, as no lamp can), brighter
//            with the voice and the lead (the 600 Hz-4 kHz band), with the melody as a bright spot gliding
//            along it and every note a comet at its pitch, faint for a quiet accompaniment, bright for a run
//   swoop    the melody gliding across the stage by pitch (low = crowd's left) on the inner beams, and across
//            a 2025+ Model Y's bar section by section (the bed adds its centre only from layer 3), each
//            phrase spread over the whole stage, smoothed over half a second: an arpeggio's turns cancel
//            out and the line moves slowly, while a run keeps its direction and sweeps the stage car to
//            car as fast as it is played. A passing run lights each beam crisply; a held note swells
//   colour   the interiors glow from deep blue toward warm gold as the breath swells
//   ending   a slow fade to dark as the music ends (no closing flash), when the song ends flowing
//
// Each flowing stretch fades in and out on the same ramps, so the beat sections around it take over
// without a seam. Car lamps can't hold a dim level - only on or off, with 0.5/1/2 s ramps (Tesla's README) -
// so the breath becomes how many lamps are lit, plus the parts that really dim: the bar and the interiors.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import type { Feel } from './feel';
import { END_LEDS } from './lamps';
import * as M from './moves';
import { STEPS } from './level';
import { clip, percentile, runs } from './np';

const RES = 0.25;                                  // seconds per step of the bed
const HYST = 0.04;                                 // a layer goes out this much below where it came in
const MIN_DWELL = 1.5;                             // seconds a layer stays once it changes
const GLIDE_S = 0.5;                               // the melody's smoothing
const HELD_S = 0.6;                                // a beam lit this long swells in; shorter, a run passing

/** [start, end] of the audible music: the first and last moments louder than 30 dB under its loud end. */
function musicSpan(an: Analysis): [number, number] {
  let first = -1, last = -1;
  for (let i = 0; i < an.loudness.length; i++) {
    if (an.loudness[i] > 0.25) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return [0.0, an.duration];
  return [first * an.step, (last + 1) * an.step];
}

/** Per frame, the breath (see the module notes), 0..1, where `here` is true; 0 elsewhere. */
function breath(an: Analysis, here: (t: number) => boolean): Float64Array {
  const n = an.nFrames, x = an.loudness, w = Math.round(0.3 / an.step), cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + x[i];
  const loud = Float64Array.from({ length: n }, (_, i) => {
    const a = Math.max(0, i - w), b = Math.min(n, i + w + 1);
    return (cs[b] - cs[a]) / (b - a);
  });
  const pool = Float64Array.from(loud.filter((_, i) => here(i * an.step))).sort();
  const out = new Float64Array(n);
  if (!pool.length) return out;
  const lo = percentile(pool, 5), hi = Math.max(percentile(pool, 95), lo + 1e-6);
  for (let i = 0; i < n; i++) {
    if (here(i * an.step)) out[i] = 0.5 * an.level![i] + 0.5 * clip((loud[i] - lo) / (hi - lo), 0, 1);
  }
  return out;
}

/** Layer count (0-4) per RES step: one more for each of the level's steps the breath reaches, with
 * hysteresis and a minimum dwell, one layer at a time. */
function layers(L: ArrayLike<number>): Int32Array {
  const out = new Int32Array(L.length);
  let cur = 0, since = -1e9;
  for (let i = 0; i < L.length; i++) {
    const v = L[i], t = i * RES;
    let want = cur;
    while (want < 4 && v >= STEPS[want]) want += 1;
    while (want > 0 && v < STEPS[want - 1] - HYST) want -= 1;
    if (want !== cur && t - since >= MIN_DWELL) {
      cur = cur + (want > cur ? 1 : -1);       // one layer at a time
      since = t;
    }
    out[i] = cur;
  }
  return out;
}

/** The lamps of a car's bed, layer 1 to 4 (see the module notes). */
function bedLamps(c: Car): number[][] {
  if (c.isCt) return [c.sig(), c.frunk(), [], c.outer()];
  if (c.juniper) return [c.markers(), [], c.fogs(), c.outer()];
  return [c.sig(), c.drl(), c.fogs(), c.outer()];
}

/** The lamps ramp up (over 2 s, or as `up` says) and stay on from t0 to t1, then fade (over 2 s, or as `down`
 * says). */
function glow(car: Car, chs: readonly number[], t0: number, t1: number, up: number = C.ON_2000,
  down: number = C.OFF_2000): void {
  const tail = down === C.OFF_2000 ? 2.0 : down === C.OFF_1000 ? 1.0 : 0.5;
  car.light(chs, t0, t1, up);
  car.light(chs, t1, t1 + tail, down);
}

/**
 * Stage position 0-1 (crowd's left to right) of the melody per frame, NaN where no melody sounds: the top
 * notes of the transcription (the louder two thirds), each phrase spreading its own range across the stage
 * as the moves do, smoothed over GLIDE_S.
 */
function melodyPath(an: Analysis): Float64Array {
  const ev = an.events, n = an.nFrames, step = an.step;
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
    const a = Math.trunc(ev.t[i] / step);
    const b = Math.trunc(Math.min(ev.t[i] + Math.max(ev.dur[i], 0.4), next) / step) + 1;
    const [lo, hi] = range[i];
    pos.fill(clip((ev.top[i] - lo) / Math.max(hi - lo, 1), 0, 1), Math.min(a, n), Math.min(b, n));
  });
  const w = Math.round(GLIDE_S / 2 / step), out = new Float64Array(n).fill(NaN);
  let sum = 0, cnt = 0;
  for (let i = -w; i < n; i++) {             // a running mean of what sounds over the window
    const add = i + w, drop = i - w - 1;
    if (add < n && !Number.isNaN(pos[add])) [sum, cnt] = [sum + pos[add], cnt + 1];
    if (drop >= 0 && !Number.isNaN(pos[drop])) [sum, cnt] = [sum - pos[drop], cnt - 1];
    if (i >= 0 && !Number.isNaN(pos[i]) && cnt) out[i] = sum / cnt;
  }
  return out;
}

/** The lights for the stretches that flow (the motors are scheduled separately, as for any song). Says
 * whether the music ends flowing, in which case this has already faded the show out. */
export function choreograph(cars: Car[], an: Analysis, spans: Feel[]): boolean {
  const ct = M.centreTruck(cars), step = an.step, n = an.nFrames;
  const [start, end] = musicSpan(an);
  const flows = (t: number) => t >= start && t < end && spans.some((s) => s.t0 <= t && t < s.t1);
  const B = breath(an, flows);

  // 1. the bed, layer by layer, and the tail lights from layer 2
  const stride = Math.max(1, Math.round(RES / step));
  const coarse = Array.from({ length: Math.ceil(n / stride) }, (_, i) => B[i * stride]);
  const lay = layers(coarse).map((v, i) => (flows(i * RES) ? v : -1));
  for (let k = 1; k <= 4; k++) {
    for (const [a, b] of runs(Array.from(lay, (v) => v >= k))) {
      for (const c of cars) {
        const chs = bedLamps(c)[k - 1];
        if (chs.length) glow(c, chs, a * RES, b * RES);
        if (k === 2 && c.tails().length) glow(c, c.tails(), a * RES, b * RES);
      }
    }
  }

  // 2. the swoop: the melody gliding across the stage on the inner beams
  const path = melodyPath(an).map((v, i) => (flows(i * step) ? v : NaN));
  for (let slot = 0; slot < 2 * cars.length; slot++) {
    const car = cars[Math.floor(slot / 2)], side = slot % 2 === 0 ? 'L' : 'R';
    const slotOf = (v: number) => Math.min(2 * cars.length - 1, Math.floor(v * 2 * cars.length));
    const on = Array.from(path, (v) => !Number.isNaN(v) && slotOf(v) === slot);
    for (const [a, b] of runs(on)) {
      const held = (b - a) * step >= HELD_S;
      glow(car, car.inner(side), a * step, b * step + (held ? 0.25 : 0.1), held ? C.ON_1000 : C.ON,
        held ? C.OFF_1000 : C.OFF_500);
    }
  }
  // a 2025+ Model Y's bar in its three sections (lamps.ts lights each from the picture): the melody crosses
  // the car end, centre, end
  const bar = C.FRONT_BAR.length, sections = [[0, END_LEDS], [END_LEDS, bar - END_LEDS], [bar - END_LEDS, bar]];
  for (const car of cars.filter((c) => c.juniper)) {
    const x = cars.indexOf(car);
    for (let k = 0; k < 3; k++) {
      const on = Array.from(path, (v) => !Number.isNaN(v) && Math.floor((v * cars.length - x) * 3) === k);
      for (const [a, b] of runs(on)) {
        const [lo, hi] = sections[k], tail = (b - a) * step >= HELD_S ? 12 : 5;
        car.pixels(C.FRONT_BAR, a * step, Array.from({ length: b - a + tail }, () =>
          Float64Array.from(C.FRONT_BAR, (_, j) => (j >= lo && j < hi ? 1 : 0))));
      }
    }
  }

  // 3. the trucks' bars: the breath, the voice, the melody's spot and every note
  for (const c of cars.filter((q) => q.isCt)) {
    const nLed = C.FRONT_BAR.length, k = 2 * cars.indexOf(c);       // the truck's two slots: k and k + 1
    for (const [a, b] of runs(Array.from({ length: n }, (_, f) => flows(f * step)))) {
      const t0 = a * step, t1 = b * step, rows: Float64Array[] = [];
      for (let f = a; f < b; f++) {
        const t = f * step, fade = clip((t - t0) / 2.0, 0, 1) * clip((t1 - t) / 2.0, 0, 1);
        const glowAt = fade * (0.08 + 0.6 * B[f] ** 1.5) * (0.6 + 0.4 * an.bands.highMid[f]);
        const spot = path[f] * 2 * cars.length - k, centre = clip(spot / 2, 0, 1) * (nLed - 1);
        const onTruck = c === ct && spot >= -0.5 && spot <= 2.5;
        const row = new Float64Array(nLed);
        for (let j = 0; j < nLed; j++) {
          const z = (j - centre) / 6.0;
          row[j] = Math.max(glowAt, onTruck ? 0.9 * fade * Math.exp(-(z * z)) : 0);
        }
        rows.push(row);
      }
      c.pixels(C.FRONT_BAR, t0, rows);
    }
  }
  const trucks = cars.filter((q) => q.isCt), ev = an.events;
  const quiet = percentile(ev.amp, 30), loud = Math.max(percentile(ev.amp, 95), quiet + 1e-6);
  for (const ph of trucks.length ? an.phrases ?? [] : []) {
    if (!flows(ph.t0)) continue;
    const [lo, hi] = M.phraseRange(ph);
    for (let i = ph.a; i < ph.b; i++) {
      const t = ev.t[i], strength = clip((ev.amp[i] - quiet) / (loud - quiet), 0, 1);
      const s = 0.25 + 0.75 * strength * Math.max(B[clip(Math.round(t / step), 0, n - 1)], 0.3);
      const at = clip((ev.top[i] - lo) / Math.max(hi - lo, 1), 0, 1);
      for (const c of trucks) M.comet(c, t, at, clip(ev.dur[i], 0.15, 0.5) + 0.15, s);
    }
  }

  // 4. colour: the interiors from deep blue toward warm gold as the breath swells
  const cold = [20, 40, 140], warm = [255, 160, 50];
  for (let i = 0; i < coarse.length; i++) {
    if (!flows(i * RES)) continue;
    const v = coarse[i], colour = cold.map((c0, j) => Math.trunc(c0 + (warm[j] - c0) * v));
    for (const c of cars) c.rgb(i * RES, (i + 1) * RES, colour, 0.3 + 0.7 * v);
  }

  // 5. the ending, when the song ends flowing: everything that's lit fades out slowly as the music ends
  if (!flows(end - RES)) return false;
  for (const c of cars) {
    c.set(c.everything(), end, an.duration, 0);
    const row = Math.max(0, Math.min(c.fr(end) - 1, c.nFrames - 1));
    const lit = c.everything().filter((ch) => c.get(row, ch) > 0);
    if (lit.length) c.light(lit, end, Math.min(an.duration, end + 2.0), C.OFF_2000);
  }
  return true;
}
