// The beat layer: the pulse under the choreography, on the headlights, the lamps with the most visual mass
// (concert lighting gives the beat to its biggest fixtures and the effects to the rest). How it hits
// follows the level at each beat (level.ts):
//
//   hush    nothing
//   calm    a soft tick of the middle car's inner beams on each downbeat, where the beat is very clear
//   groove  1 and 3 on every car's inner beams, the bars glinting on the 1
//   drive   every beat on every car's inner beams, the bars on the 1
//   peak    every beat on both headlights, the off-beats on the middle car: the whole stage
//
// The headlights it plays are the beat's (ownership): where the music strikes most beats, the moves leave a
// car's inner beams to the pulse from a groove up, and both headlights at the peak. Each hit is a bright
// attack that decays on Tesla's half-second ramp, the way the drum it follows sounds, and those lamps alone
// go dark for DIP_S before the next, so every beat lands as a thump while the rest of the stage stays lit.
// The outer beams are the moves' below the peak, and the bars and every other lamp always are, so a figure
// travelling the stage shows over the thump.
// A beat the music doesn't strike gets no hit. Where the beat is unclear (an.beatConfidence under CLEAR, and
// the tracker not keeping steady time either) the layer plays only the downbeats from drive up, and where
// the music flows (feel.ts) it isn't there.
//
// Builds: where the music climbs into its biggest step up, the pulse speeds up and spreads out - half
// notes, then every beat, then eighths in the last bar - growing from the middle car out to the ends; then a
// beat of black, and the whole stage hits the landing together (drops). A song gets at most one drop for
// every DROP_EVERY_S of its length, the biggest steps up that land from a build or onto a drum kit, so a
// drop stays an event; that beat of black is the show's only deliberate pull-back.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { flowsAt, kitAt, steadyAt, struckBeats, struckShare } from './feel';
import { levelAt, levelOver, STEPS, stepOf } from './level';
import * as M from './moves';
import { clip, quantile, searchsorted } from './np';
import { beatLen } from './tempo';

const OWNERS = new Set(['cadence', 'motif']);     // phrase shapes whose moves own the whole stage
const CLEAR = 0.6, FAINT = 0.25, SURE = 0.9;       // how clear the beat is (an.beatConfidence): a full pulse,
                                                   // downbeats only, a calm tick
const DIP_S = 0.06;                                // the beat's lamps are dark this long before each hit
const DROP_EVERY_S = 100, DROP_GAP_S = 30, BUILD_S = 4;
const DROP_MIN = 0.25, DROP_ALONE = 0.45;          // a drop's size (plan): with a build or a kit, or on its own
const PEAK_BONUS = 0.2;                            // a drop onto the peak (level.ts) counts as this much more
const MUSIC_LEAD_S = 8;                            // no drop this soon after the music starts: nothing to build

/** Beat index within its bar (0 = downbeat) for every tracked beat. */
function position(an: Analysis): Int32Array {
  const b = an.beats, downs = new Set<number>();
  for (const x of an.downbeats) {
    const k = clip(searchsorted(b, x - 0.01), 0, Math.max(0, b.length - 1));
    if (b.length && Math.abs(b[k] - x) < 0.05) downs.add(k);
  }
  const pos = new Int32Array(b.length);
  let last: number | null = null;
  for (let i = 0; i < b.length; i++) {
    if (downs.has(i)) last = i;
    pos[i] = last !== null ? (((i - last) % 4) + 4) % 4 : i % 4;
  }
  return pos;
}

const cached = new WeakMap<Analysis, { drops: number[]; builds: [number, number][] }>();

/** The level that holds over [t0, t1): its quieter quarter, so a lone loud moment doesn't count. */
function held(an: Analysis, t0: number, t1: number): number {
  const lv = an.level!, a = clip(Math.trunc(t0 / an.step), 0, lv.length - 1);
  return quantile(lv.subarray(a, clip(Math.trunc(t1 / an.step), a + 1, lv.length)), 0.25);
}

/** The drops: downbeats where the music lands a step higher and stays there - the level held over the four
 * seconds after a step above the two before, into a drive or the peak - none in the first MUSIC_LEAD_S of
 * the music or where it flows or is about to. Each may have a build: the climb into it, where the level has
 * been rising for BUILD_S or more (a crescendo, a riser). A drop's size is the jump, the climb into it, and
 * PEAK_BONUS for landing on the song's peak; it counts from DROP_MIN where it has a build to land from or
 * a drum kit to drop, and from DROP_ALONE without (an organ's entrance is no drop). Of these the biggest,
 * one for every DROP_EVERY_S of the song, at least DROP_GAP_S apart; a song can have none. */
function plan(an: Analysis) {
  let out = cached.get(an);
  if (out) return out;
  let first = 0;
  while (first < an.nFrames && an.level![first] < STEPS[0]) first++;
  const start = first * an.step;
  const jump = (d: number) => held(an, d + 0.1, d + 4) - levelOver(an, d - 2, d - 0.1);
  const smooth = (t: number) => levelOver(an, t - 2, t);
  const buildInto = (d: number): [number, number] | null => {
    let t0 = d;                                      // back while the level keeps falling the earlier we look
    while (t0 > start + 4 && d - t0 < 16 && smooth(t0 - 2) <= smooth(t0) + 0.02) t0 -= 2;
    return d - t0 >= BUILD_S && smooth(d) - smooth(t0) >= 0.1 ? [Math.max(start + 2, t0 - 2), d] : null;
  };
  const cands = an.downbeats.filter((d) => {
    const before = stepOf(levelOver(an, d - 2, d - 0.1)), after = stepOf(held(an, d + 0.1, d + 4));
    return d > start + MUSIC_LEAD_S && after >= 3 && after > before && jump(d) >= 0.08
      && [0, 2, 4, 6].every((k) => !flowsAt(an, d + k));
  }).map((d) => {
    const b = buildInto(d);
    const peak = stepOf(held(an, d + 0.1, d + 4)) === 4 ? PEAK_BONUS : 0;
    return { d, b, size: jump(d) + (b ? smooth(d) - smooth(b[0] + 2) : 0) + peak };
  });
  const most = Math.max(1, Math.round(an.duration / DROP_EVERY_S));
  const kept: typeof cands = [];
  const lands = (c: (typeof cands)[number]) =>
    c.size >= DROP_MIN && (c.b !== null || kitAt(an, c.d + 2) || c.size >= DROP_ALONE);
  for (const c of cands.filter(lands).sort((p, q) => q.size - p.size)) {
    if (kept.length < most && kept.every((k) => Math.abs(k.d - c.d) >= DROP_GAP_S)) kept.push(c);
  }
  kept.sort((p, q) => p.d - q.d);
  out = { drops: kept.map((k) => k.d), builds: kept.flatMap((k) => (k.b ? [k.b] : [])) };
  cached.set(an, out);
  return out;
}

export const drops = (an: Analysis) => plan(an).drops;
export const builds = (an: Analysis) => plan(an).builds;

/** How clear the beat at t is: the listening's beat confidence, or CLEAR where the tracker keeps steady
 * time. */
const clearAt = (an: Analysis, t: number) =>
  Math.max(an.beatConfidence[clip(Math.round(t / an.step), 0, an.nFrames - 1)], steadyAt(an, t) ? CLEAR : 0);

/** Per beat, what the layer plays there: [beat, gap to the next, kind ('' none, 'tick', 'big' on the 1,
 * 'mid' on the 3, 'beat' on the others), how much of the headlights it owns (0, 1 the inner beams, 2 both)]. */
function beatPlan(an: Analysis): [number, number, string, number][] {
  const b = an.beats, pos = position(an), spans = builds(an), on = struckBeats(an);
  const out: [number, number, string, number][] = [];
  const owned = (an.phrases ?? []).filter((ph) => OWNERS.has(ph.gesture));
  for (let i = 0; i < b.length; i++) {
    const t = b[i], gap = (b[i + 1] ?? t + beatLen(an)) - t;
    if (flowsAt(an, t) || owned.some((ph) => t >= ph.t0 - 0.05 && t < ph.t1)) continue;
    if (spans.some(([s0, land]) => t >= s0 && t < land)) {                     // the build's own pulse
      out.push([t, gap, '', 2]);
      continue;
    }
    const step = stepOf(levelAt(an, t)), clear = clearAt(an, t);
    if (step === 0 || clear < FAINT) continue;
    let kind = '';
    if (step === 1) kind = pos[i] === 0 && clear >= SURE ? 'tick' : '';
    else if (clear < CLEAR) kind = pos[i] === 0 && step >= 3 ? 'big' : '';
    else if (step === 2) kind = pos[i] === 0 ? 'big' : pos[i] === 2 ? 'mid' : '';
    else kind = pos[i] === 0 ? 'big' : pos[i] === 2 ? 'mid' : 'beat';
    const around = struckShare(an, b[Math.max(0, i - 4)], b[i + 4] ?? t + 1);
    const plays = step >= 2 && clear >= CLEAR && around >= 0.5;
    out.push([t, gap, kind && on[i] ? kind : '', plays ? (step === 4 ? 2 : 1) : 0]);
  }
  return out;
}

/** Per frame, how much of the headlights the beat layer owns: 0 none, 1 the inner beams, 2 both. The moves
 * leave what it owns alone (moves.half); choreograph sets it on the analysis before the moves play. */
export function ownership(an: Analysis): Uint8Array {
  const out = new Uint8Array(an.nFrames);
  for (const [t, gap, , own] of beatPlan(an)) {
    const f = (x: number) => clip(Math.round(x / an.step) - 1, 0, an.nFrames);     // the lights lead a frame
    if (own) out.fill(own, f(t), f(t + gap));
  }
  return out;
}

/** Lay the beat layer over the choreography (after the moves and drums). */
export function apply(cars: Car[], an: Analysis): void {
  if (an.beats.length < 4) return;
  const ct = M.centreTruck(cars), mid = ct ?? cars[Math.floor(cars.length / 2)];
  for (const [t, gap, kind] of beatPlan(an)) {
    if (!kind) continue;
    const s = levelAt(an, t), step = stepOf(s);
    // the louder, the longer the attack holds before it decays: a tick at a groove, a third of the beat at the
    // peak
    const hold = clip(gap * (0.2 + clip((s - STEPS[2]) / (1 - STEPS[2]), 0, 1) * 0.15), 0.1, 0.2);
    const hit = (c: Car, chs: number[], at: number, dur: number) => {
      c.light(chs, at, at + dur);
      c.light(chs, at + dur, at + gap - DIP_S, C.OFF_500);
    };
    if (kind === 'tick') {
      mid.light(mid.inner(), t, t + 0.15, C.ON);
      mid.light(mid.inner(), t + 0.15, t + 0.65, C.OFF_500);
      continue;
    }
    if (kind === 'big' || kind === 'mid' || step >= 3) {
      for (const c of cars) hit(c, step === 4 ? c.heads() : c.inner(), t, kind === 'big' ? hold + 0.04 : hold);
    }
    if (kind === 'big') for (const c of cars) if (c.hasBar) M.barFlash(c, t, Math.min(0.3, gap * 0.6), 0.5);
    const off = t + gap / 2;
    if (step === 4 && off > t + hold + 0.04) hit(mid, mid.inner(), off, Math.min(0.1, gap * 0.25));
  }
  for (const [s0, land] of builds(an)) buildPulse(cars, an, s0, land);
}

/** The pulse through a build: half notes, then every beat, then eighths in the last bar - the middle car
 * first, its neighbours joining, every car by the last third - and a beat of black before the landing. */
function buildPulse(cars: Car[], an: Analysis, t0: number, land: number): void {
  const fromMiddle = (c: Car) => Math.abs(c.x - (cars.length - 1) / 2);
  const order = [...cars].sort((p, q) => fromMiddle(p) - fromMiddle(q));
  const beats = an.beats.filter((x) => x >= t0 - 0.01 && x < land);
  if (beats.length < 2) return;
  const span = Math.max(land - t0, 1e-3);
  beats.forEach((x, k) => {
    const gap = (beats[k + 1] ?? land) - x, left = land - x, u = (x - t0) / span;
    const bar = 4 * gap;
    const ticks = left <= bar + 0.01 ? [x, x + gap / 2] : left <= 3 * bar ? [x] : k % 2 === 0 ? [x] : [];
    const reach = clip(Math.floor(order.length * (0.34 + u)), 1, order.length);
    for (const t of ticks) {
      if (t >= land - gap - 0.01) continue;                             // the beat of black before the landing
      const hold = clip(gap * 0.3, 0.08, 0.14);
      const lamps = (c: Car) => (levelAt(an, t) >= STEPS[2] ? c.heads() : c.inner());
      for (const c of order.slice(0, reach)) c.set(lamps(c), t, t + hold, C.ON);
    }
  });
}

/** Each drop: black for a beat before it, then every lamp of every car on together for a beat. */
export function dropHits(cars: Car[], an: Analysis): void {
  for (const d of drops(an)) {
    const beat = M.beatAt(an, d), gap = clip(beat, 0.25, 0.6);
    for (const c of cars) {
      c.set(c.everything(), d - gap, d, 0);
      c.set([...C.FRONT_BAR, ...C.REAR_BAR, ...C.OFFROAD_BAR], d - gap, d, 0);
      c.set(C.ALL_RGB.flatMap((ch) => [ch, ch + 1, ch + 2]), d - gap, d, 0);
    }
    M.allOn(cars, d, clip(beat, 0.3, 0.6));
    for (const c of cars) c.rgb(d, d + clip(beat, 0.3, 0.6), [255, 255, 255]);
  }
}
