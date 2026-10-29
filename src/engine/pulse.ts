// The beat layer: the pulse under the choreography, on the headlights, the lamps with the most visual mass
// (concert lighting gives the beat to its biggest fixtures and the effects to the rest). How it hits
// follows the level at each beat (level.ts):
//
//   hush    nothing
//   calm    a soft tick of the middle car's inner beams on each downbeat, where the beat is clear
//   groove  1 and 3 on every car's inner beams, the bars glinting on the 1
//   drive   every beat: 1 and 3 on every headlight with the bars on the 1, 2 and 4 on the outer cars
//   peak    every beat on every headlight, the off-beats on the middle car, the bars on 1 and 3
//
// Hits are short (about 120 ms in a groove, most of the beat at the peak) with darkness between, and from
// drive up the sustained lamps dip just before each (the producer's sidechain), so every beat lands dark
// to bright. A beat the music doesn't strike gets no hit; where the beat is unclear the layer backs off,
// and where the music flows (feel.ts) it isn't there.
//
// Builds: where the music climbs into a loud passage, the pulse speeds up and spreads out - half notes,
// then every beat, then eighths in the last bar - growing from the middle car out to the ends; then a beat
// of black, and the whole stage hits the landing together (drops).

import type { Analysis, Phrase } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { clarity, flowsAt } from './feel';
import { levelAt, levelOver, stepOf } from './level';
import * as M from './moves';
import { clip, searchsorted } from './np';
import { beatLen } from './tempo';

const HEADS = [C.L_OUTER_MAIN, C.R_OUTER_MAIN, C.L_INNER_MAIN, C.R_INNER_MAIN];
const INNER = [C.L_INNER_MAIN, C.R_INNER_MAIN];
const OWNERS = new Set(['cadence', 'motif']);     // moves that own the whole stage while they play
const CLEAR = 1.6, FAINT = 1.25;                  // clarity (feel.ts) for a full pulse, for downbeats only
const STRUCK = 1.3;
const DROP_GAP_S = 15, BUILD_S = 4;

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

/** The drops: the downbeats where the music lands a step higher and stays there - the level over the four
 * seconds after a step above the two before, into a drive or the peak - the biggest jump of any close
 * together, at most one every DROP_GAP_S, none where the music flows. And the builds: the climb into a
 * drop, where the level has been rising for BUILD_S or more (a crescendo, a riser). */
function plan(an: Analysis) {
  let out = cached.get(an);
  if (out) return out;
  const jump = (d: number) => levelOver(an, d + 0.1, d + 1.5) - levelOver(an, d - 2, d - 0.1);
  const cands = an.downbeats.filter((d) => {
    const before = stepOf(levelOver(an, d - 2, d - 0.1)), after = stepOf(levelOver(an, d + 0.1, d + 4));
    return d > 2 && after >= 3 && after > before && jump(d) >= 0.08 && !flowsAt(an, d);
  });
  const drops: number[] = [];
  for (const d of cands) {
    if (cands.some((e) => Math.abs(e - d) < 6 && e !== d && jump(e) > jump(d))) continue;
    if (!drops.length || d - drops[drops.length - 1] >= DROP_GAP_S) drops.push(d);
  }
  const builds: [number, number][] = [];
  const smooth = (t: number) => levelOver(an, t - 2, t);
  for (const d of drops) {
    let t0 = d;                                      // back while the level keeps falling the earlier we look
    while (t0 > 2 && d - t0 < 16 && smooth(t0 - 2) <= smooth(t0) + 0.02) t0 -= 2;
    if (d - t0 >= BUILD_S && smooth(d) - smooth(t0) >= 0.1) builds.push([Math.max(0, t0 - 2), d]);
  }
  cached.set(an, (out = { drops, builds }));
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

/** Lay the beat layer over the choreography (after the moves and drums). */
export function apply(cars: Car[], an: Analysis, phrases: Phrase[]): void {
  const b = an.beats;
  if (b.length < 4) return;
  const ys = M.sides(cars), ct = M.centreTruck(cars), mid = ct ?? cars[Math.floor(cars.length / 2)];
  const pos = position(an);
  const spans = builds(an);
  const owned = phrases.filter((ph) => OWNERS.has(ph.move ?? ''));
  const hits: [number, number, string, number][] = [];       // beat time, gap, kind, level
  for (let i = 0; i < b.length; i++) {
    const t = b[i], gap = (b[i + 1] ?? t + beatLen(an)) - t;
    if (flowsAt(an, t) || owned.some((ph) => t >= ph.t0 - 0.05 && t < ph.t1)) continue;
    if (spans.some(([s0, land]) => t >= s0 && t < land)) continue;              // the build's own pulse
    const s = levelAt(an, t), step = stepOf(s);
    const clear = clarity(an, t - 2, t + 2);
    if (step === 0 || clear < FAINT) continue;
    let kind = '';
    if (step === 1) kind = pos[i] === 0 && clear >= 2.5 ? 'tick' : '';
    else if (clear < CLEAR) kind = pos[i] === 0 && step >= 3 ? 'big' : '';
    else if (step === 2) kind = pos[i] === 0 ? 'big' : pos[i] === 2 ? 'mid' : '';
    else kind = pos[i] === 0 ? 'big' : pos[i] === 2 ? 'mid' : step === 4 ? 'mid' : 'small';
    // where the pulse runs in full, the headlights are the beat's: clear what the moves wrote there
    if (step >= 2 && clear >= CLEAR) for (const c of cars) c.set(HEADS, t - 0.04, t + gap - 0.04, 0);
    if (kind && struck(an, t)) hits.push([t, gap, kind, s]);
  }
  for (const [t, gap, kind, s] of hits) {
    const step = stepOf(s);
    // the louder, the longer each hit holds: a tick at a groove, most of the beat at the peak
    const hold = clip(gap * (0.3 + clip((s - 0.6) / 0.4, 0, 1) * 0.35), 0.1, 0.4);
    const lamps = step === 2 ? INNER : HEADS;
    if (kind === 'tick') {
      mid.light(INNER, t, t + 0.15, C.ON);
      mid.light(INNER, t + 0.15, t + 0.65, C.OFF_500);
    } else if (kind === 'big') {
      for (const c of cars) {
        c.set(lamps, t, t + hold + 0.04, C.ON);
        if (c.hasBar) M.barFlash(c, t, Math.min(0.3, gap * 0.6), step === 2 ? 0.5 : 1.0);
      }
    } else if (kind === 'mid') {
      for (const c of cars) {
        c.set(lamps, t, t + hold, C.ON);
        if (step === 4 && c.hasBar) M.barFlash(c, t, Math.min(0.25, gap * 0.5), 0.8);
      }
    } else {
      for (const c of ys) c.set(lamps, t, t + hold, C.ON);
    }
    if (step >= 3) duck(cars, t, gap);
    const off = t + gap / 2;
    if (step === 4 && off > t + hold + 0.04) mid.set(INNER, off, off + Math.min(0.1, gap * 0.25), C.ON);
  }
  for (const [s0, land] of spans) buildPulse(cars, an, s0, land);
}

/** The pulse through a build: half notes, then every beat, then eighths in the last bar - the middle car
 * first, its neighbours joining, every car by the last third - and a beat of black before the landing. */
function buildPulse(cars: Car[], an: Analysis, t0: number, land: number): void {
  const order = [...cars].sort((p, q) => Math.abs(p.x - (cars.length - 1) / 2) - Math.abs(q.x - (cars.length - 1) / 2));
  const beats = an.beats.filter((x) => x >= t0 - 0.01 && x < land);
  for (const c of cars) c.set(HEADS, t0, land, 0);
  if (beats.length < 2) return;
  const span = Math.max(land - t0, 1e-3);
  beats.forEach((x, k) => {
    const gap = (beats[k + 1] ?? land) - x, left = land - x, u = (x - t0) / span;
    const bar = 4 * gap;
    const ticks = left <= bar + 0.01 ? [x, x + gap / 2] : left <= 3 * bar ? [x] : k % 2 === 0 ? [x] : [];
    const reach = clip(Math.floor(order.length * (0.34 + u)), 1, order.length);
    for (const t of ticks) {
      if (t >= land - gap - 0.01) continue;                             // the beat of black before the landing
      const s = levelAt(an, t), hold = clip(gap * 0.3, 0.08, 0.14);
      for (const c of order.slice(0, reach)) c.set(s >= 0.6 ? HEADS : INNER, t, t + hold, C.ON);
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
