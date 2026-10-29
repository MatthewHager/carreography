// The base look under the moves: what is lit steadily, growing with the level (level.ts), so the whole
// stage carries the song's arc while the moves, the beat and the drums play on top.
//
//   rear       the tail lights from groove up, the number plates, rear fogs and a truck's bed lights from
//              drive up; a truck's rear bar glows brighter as the level rises
//   front bar  a truck's front bar glows under the comets, from a groove up, to nearly half at the peak
//   cabins     the interiors take the harmony's colour, bar by bar (the bar's strongest pitch class, round
//              the circle of fifths, so related keys sit near each other), brighter as the level rises; from
//              drive up they flash on the downbeats and on the big accents
//
// Where the music flows (feel.ts) the legato style has its own bed.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { flowsAt } from './feel';
import { STEPS } from './level';
import { clip, runs } from './np';

const DWELL_S = 4.0;          // a lamp of the bed stays at least this long once it changes
const PURPLE = [110, 0, 200], ORANGE = [255, 90, 0];

/** Per frame, whether the level is at `at` or above, held for DWELL_S so a lamp never flickers. */
function above(an: Analysis, at: number): boolean[] {
  const lv = an.level!, dwell = Math.round(DWELL_S / an.step), out: boolean[] = [];
  let on = false, since = -dwell;
  for (let f = 0; f < lv.length; f++) {
    const want: boolean = on ? lv[f] >= at - 0.08 : lv[f] >= at;
    if (want !== on && f - since >= dwell) [on, since] = [want, f];
    out.push(on && !flowsAt(an, f * an.step));
  }
  return out;
}

/** A colour for pitch class `pc` (0 C .. 11 B): its place on the circle of fifths as a hue. */
export function hueOf(pc: number): number[] {
  const h = (((pc * 7) % 12) / 12) * 6, x = 1 - Math.abs((h % 2) - 1);
  const [r, g, b] = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1]
    : [1, 0, x];
  return [r * 255, g * 255, b * 255];
}

export function apply(cars: Car[], an: Analysis): void {
  const lv = an.level!, step = an.step;
  const lit: [number, (c: Car) => number[]][] = [
    [STEPS[1], () => [C.L_TAIL, C.R_TAIL]],
    [STEPS[2], (c) => [C.LICENSE_PLATE, c.isCt ? C.REVERSE : C.REAR_FOG]],
  ];
  for (const [at, chs] of lit) {
    for (const [a, b] of runs(above(an, at))) for (const c of cars) c.light(chs(c), a * step, b * step);
  }
  const glow = (f: number, from: number, top: number) => clip((lv[f] - from) / (1 - from), 0, 1) * top;
  for (const c of cars.filter((q) => q.isCt)) {
    const front: Float64Array[] = [], rear: Float64Array[] = [];
    for (let f = 0; f < an.nFrames; f++) {
      const on = !flowsAt(an, f * step);
      front.push(new Float64Array(C.FRONT_BAR.length).fill(on ? glow(f, STEPS[1], 0.2) + glow(f, STEPS[3], 0.25) : 0));
      rear.push(new Float64Array(C.REAR_BAR.length).fill(on ? glow(f, STEPS[0], 0.6) : 0));
    }
    c.pixels(C.FRONT_BAR, 0, front);
    c.pixels(C.REAR_BAR, 0, rear);
  }
  cabins(cars, an);
}

/** The spans the cabins hold one colour over: bar to bar (downbeat to downbeat), or two seconds at a time
 * where there are no downbeats. */
function bars(an: Analysis): [number, number][] {
  const d = an.downbeats.filter((x, i, all) => i === 0 || x - all[i - 1] > 0.5);
  const edges = [0];
  for (const x of d) {
    while (x - edges[edges.length - 1] > 4) edges.push(edges[edges.length - 1] + 2);
    if (x - edges[edges.length - 1] > 0.5) edges.push(x);
  }
  while (an.duration - edges[edges.length - 1] > 2) edges.push(edges[edges.length - 1] + 2);
  edges.push(an.duration);
  return edges.slice(1).map((e, i) => [edges[i], e]);
}

/** The interiors: the bar's harmony as a colour (its strongest pitch class, held through the bar so the
 * colour changes as the chords do), toward purple when quiet and orange when loud where the harmony is
 * unclear, brighter as the level rises; from drive up a white flash on each downbeat and big accent. */
function cabins(cars: Car[], an: Analysis): void {
  const lv = an.level!, step = an.step, sum = new Float64Array(12);
  for (const [t0, t1] of bars(an)) {
    const a = Math.trunc(t0 / step), b = Math.min(an.nFrames, Math.trunc(t1 / step));
    sum.fill(0);
    for (let f = a; f < b; f++) for (let k = 0; k < 12; k++) sum[k] += an.chroma[f * 12 + k] * an.loudness[f];
    let pc = 0, tot = 0;
    for (let k = 0; k < 12; k++) {
      tot += sum[k];
      if (sum[k] > sum[pc]) pc = k;
    }
    const sure = sum[pc] > 0 ? clip(((1 - tot / sum[pc] / 12) * 12) / 11, 0, 1) : 0;
    for (let f = a; f < b; f += 5) {
      if (flowsAt(an, f * step)) continue;
      const s = lv[f];
      const base = ORANGE.map((o, i) => PURPLE[i] + (o - PURPLE[i]) * s);
      const colour = hueOf(pc).map((h, i) => h * sure + base[i] * (1 - sure));
      for (const c of cars) c.rgb(f * step, Math.min(f + 5, b) * step, colour, 0.1 + 0.9 * s * s);
    }
  }
  const loud = (t: number) => lv[clip(Math.trunc(t / step), 0, lv.length - 1)];
  for (const d of an.downbeats) {
    if (loud(d) >= STEPS[2] && !flowsAt(an, d)) for (const c of cars) c.rgb(d, d + 0.1, [255, 255, 255], 0.8);
  }
  for (const h of an.hits) {
    if (loud(h) >= STEPS[1] && !flowsAt(an, h)) for (const c of cars) c.rgb(h, h + 0.12, [255, 255, 255]);
  }
}
