// The beat layer: the pulse under the choreography, on the headlights, the lamps with the most visual mass
// (concert lighting gives the beat to its biggest fixtures and the effects to the rest). How it hits
// follows the level at each beat (level.ts):
//
//   hush    nothing
//   calm    a soft tick of the middle car's inner beams on each downbeat, where the beat is very clear
//   groove  1 and 3 on every car's inner beams, the bars glinting on the 1
//   drive   every beat on every car's inner beams, the bars on the 1
//   peak    every beat on every headlight and every bar, the off-beats on the middle car: the whole stage
//
// The headlights it plays are the beat's (ownership): where the music strikes most beats, the moves leave a
// car's inner beams to the pulse from a groove up, and both headlights at the peak, so between the hits they
// stay dark and every beat lands dark
// to bright; from drive up the sustained lamps also dip just before each (the producer's sidechain). The
// outer beams are the moves' below the peak, so a figure travelling the stage shows over the thump.
// A beat the music doesn't strike gets no hit. Where the beat is unclear (an.beatConfidence under CLEAR, and
// the tracker not keeping steady time either) the layer plays only the downbeats from drive up, and where
// the music flows (feel.ts) it isn't there.
//
// Builds: where the music climbs into its biggest step up, the pulse speeds up and spreads out - half
// notes, then every beat, then eighths in the last bar - growing from the middle car out to the ends; then a
// beat of black, and the whole stage hits the landing together (drops). A song gets one drop for every
// DROP_EVERY_S of its length, the biggest steps up, so a drop stays an event.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { flowsAt, steadyAt } from './feel';
import { levelAt, levelOver, STEPS, stepOf } from './level';
import * as M from './moves';
import { clip, quantile, searchsorted } from './np';
import { beatLen } from './tempo';

const OWNERS = new Set(['cadence', 'motif']);     // phrase shapes whose moves own the whole stage
const CLEAR = 0.6, FAINT = 0.25, SURE = 0.9;       // how clear the beat is (an.beatConfidence): a full pulse,
                                                   // downbeats only, a calm tick
const STRUCK = 1.3;
const DIP_S = 0.06;                                // the dark before a hit (tidy keeps gaps of three frames)
const DROP_EVERY_S = 100, DROP_GAP_S = 30, BUILD_S = 4;
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
 * been rising for BUILD_S or more (a crescendo, a riser). Of these the biggest - the jump and the climb into
 * it, and the landing on the song's peak above all - one for every DROP_EVERY_S of the song, at least
 * DROP_GAP_S apart. */
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
  for (const c of [...cands].sort((p, q) => q.size - p.size)) {
    if (kept.length < most && kept.every((k) => Math.abs(k.d - c.d) >= DROP_GAP_S)) kept.push(c);
  }
  kept.sort((p, q) => p.d - q.d);
  out = { drops: kept.map((k) => k.d), builds: kept.flatMap((k) => (k.b ? [k.b] : [])) };
  cached.set(an, out);
  return out;
}

export const drops = (an: Analysis) => plan(an).drops;
export const builds = (an: Analysis) => plan(an).builds;

/** Whether the music strikes on the beat at t: the onset curve within 30 ms of it at least STRUCK times its
 * mean over the two seconds around. A beat the tracker carried on through a held chord or a free passage
 * gets no hit. */
function struck(an: Analysis, t: number): boolean {
  const env = an.pulseEnv, hop = an.pulseHop;
  const i = Math.round(t / hop), w = Math.max(1, Math.round(0.03 / hop)), r = Math.round(2 / hop);
  let peak = 0, sum = 0, n = 0;
  for (let k = Math.max(0, i - w); k <= Math.min(env.length - 1, i + w); k++) peak = Math.max(peak, env[k]);
  for (let k = Math.max(0, i - r); k <= Math.min(env.length - 1, i + r); k++, n++) sum += env[k];
  return n > 0 && peak >= STRUCK * (sum / n);
}

const struckMemo = new WeakMap<Analysis, Uint8Array>();

/** Per tracked beat, whether the music strikes it (struck). */
function struckBeats(an: Analysis): Uint8Array {
  let out = struckMemo.get(an);
  if (!out) struckMemo.set(an, (out = Uint8Array.from(an.beats, (t) => (struck(an, t) ? 1 : 0))));
  return out;
}

/** The share of the beats in [t0, t1) that the music strikes: where it is under a half, the music doesn't
 * play on the beat (a held chord, a free passage) and the beat figures and the pulse have nothing to hit. */
export function struckShare(an: Analysis, t0: number, t1: number): number {
  const a = searchsorted(an.beats, t0), b = searchsorted(an.beats, t1), on = struckBeats(an);
  let n = 0;
  for (let i = a; i < b; i++) n += on[i];
  return b > a ? n / (b - a) : 0;
}

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
    const f = (x: number) => clip(Math.round((x - DIP_S) / an.step), 0, an.nFrames);
    if (own) out.fill(own, f(t), f(t + gap));
  }
  return out;
}

/** Lay the beat layer over the choreography (after the moves and drums). */
export function apply(cars: Car[], an: Analysis): void {
  if (an.beats.length < 4) return;
  const ct = M.centreTruck(cars), mid = ct ?? cars[Math.floor(cars.length / 2)];
  const inner = (c: Car) => c.inner(), heads = (c: Car) => c.heads();
  for (const [t, gap, kind] of beatPlan(an)) {
    if (!kind) continue;
    const s = levelAt(an, t), step = stepOf(s);
    // the louder, the longer each hit holds: a tick at a groove, most of the beat at the peak
    const hold = clip(gap * (0.3 + clip((s - STEPS[2]) / (1 - STEPS[2]), 0, 1) * 0.35), 0.1, 0.4);
    const lamps = step === 4 ? heads : inner;
    const hit = (who: Car[], dur: number) => {
      for (const c of who) {
        c.set(lamps(c), t - DIP_S, t, 0);
        c.set(lamps(c), t, t + dur, C.ON);
      }
    };
    if (kind === 'tick') {
      mid.light(mid.inner(), t, t + 0.15, C.ON);
      mid.light(mid.inner(), t + 0.15, t + 0.65, C.OFF_500);
    } else if (kind === 'big') {
      hit(cars, hold + 0.04);
      for (const c of cars) if (c.hasBar) M.barFlash(c, t, Math.min(0.3, gap * 0.6), step === 2 ? 0.5 : 1.0);
    } else if (kind === 'mid' || step >= 3) {
      hit(cars, hold);
      if (step === 4) for (const c of cars) if (c.hasBar) M.barFlash(c, t, Math.min(0.25, gap * 0.5), 0.8);
    }
    if (step >= 3) duck(cars, t, gap);
    const off = t + gap / 2;
    if (step === 4 && off > t + hold + 0.04) mid.set(mid.inner(), off, off + Math.min(0.1, gap * 0.25), C.ON);
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

/**
 * Sidechain ducking, as producers make a kick cut through sustained pads: the sustained lamps - the side
 * cars' signature and DRL strips, which sit in the headlight housing, and the front bars - go dark for a
 * few frames just before a beat, so the beat lands as a dark-to-bright step.
 */
function duck(cars: Car[], t: number, gap: number): void {
  const d = clip(gap * 0.15, 0.06, 0.1);
  for (const c of cars) {
    if (c.hasBar) c.set(C.FRONT_BAR, t - d, t, 0);
    if (!c.isCt) c.set([...c.sig(), ...c.drl()], t - d, t, 0);
  }
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
    M.allOn(cars, d, clip(beat, 0.3, 0.6), false);
    for (const c of cars) c.rgb(d, d + clip(beat, 0.3, 0.6), [255, 255, 255]);
  }
}
