// The beat layer: the pulse under the choreography, on the headlights, the lamps with the most visual mass
// (concert lighting gives the beat to its biggest fixtures and the effects to the rest). How it hits
// follows the level at each beat (level.ts):
//
//   hush    nothing
//   calm    a soft tick of the middle car's inner beams on each downbeat, where the beat is very clear
//   groove  1 and 3 on every car's inner beams, the bars glinting on the 1
//   drive   every beat on every car's inner beams, the bars on the 1
//   peak    every beat on the outer beams, and every lamp of every car flashing on the 1, the bars full
//           white: the inner beams are the moves', so the climax travels the stage as it thumps
//
// Each hit is a bright attack that decays on the shortest of Tesla's ramps (0.5, 1 or 2 s) that lasts until
// the next hit, the way the drum it follows sounds, so every beat lands as a thump from a glow, never from
// black. While a hit rings its beams are the beat's (ownership): where the music strikes most beats, the
// moves leave them to the pulse. The other lamps are the moves', so a figure travelling the stage shows over
// the thump.
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
import { CALM, DRIVE, GROOVE, levelAt, levelOver, stepOf } from './level';
import * as M from './moves';
import { clip, quantile } from './np';
import { beatLen } from './tempo';

const OWNERS = new Set(['cadence', 'motif']);     // phrase shapes whose moves own the whole stage
const CLEAR = 0.6, FAINT = 0.25, SURE = 0.9;       // how clear the beat is (an.beatConfidence): a full pulse,
                                                   // downbeats only, a calm tick
const DROP_EVERY_S = 100, DROP_GAP_S = 30, BUILD_S = 4;
const DROP_MIN = 0.25, DROP_ALONE = 0.45;          // a drop's size (plan): with a build or a kit, or on its own
const PEAK_BONUS = 0.2;                            // a drop onto the peak (level.ts) counts as this much more
const MUSIC_LEAD_S = 8;                            // no drop this soon after the music starts: nothing to build

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
  while (first < an.nFrames && an.level![first] < CALM) first++;
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

const ATTACK_S = [0.1, 0.2];     // a hit holds full this long, from a groove to the peak, then decays: a thump
const RAMPS: [number, number][] = [[0.5, C.OFF_500], [1.0, C.OFF_1000], [2.0, C.OFF_2000]];

/** One hit of the layer: its beat, kind ('tick' the calm downbeat, 'big' on the 1, 'beat' the others, ''
 * a build's beat, which buildPulse plays), the headlights it owns while it rings (0 none, 1 the inner beams,
 * 2 the outer, 3 both), how long its attack holds, the ramp it decays on, and when it stops ringing: when
 * the next hit lands or the ramp ends, whichever is first. */
interface Hit { t: number; kind: string; own: number; hold: number; ramp: number; end: number }

/** Every hit the layer plays (see the module notes). Each decays on the shortest of Tesla's ramps that lasts
 * until the next, so a beat lands while the last still glows. */
function hits(an: Analysis): Hit[] {
  const b = an.beats, pos = M.barPositions(an), spans = builds(an), on = struckBeats(an);
  const out: Hit[] = [];
  const owners = (an.phrases ?? []).filter((ph) => OWNERS.has(ph.gesture));
  for (let i = 0; i < b.length; i++) {
    const t = b[i], next = b[i + 1] ?? t + beatLen(an);
    if (flowsAt(an, t) || owners.some((ph) => t >= ph.t0 - 0.05 && t < ph.t1)) continue;
    if (spans.some(([s0, land]) => t >= s0 && t < land)) {                     // the build's own pulse
      out.push({ t, kind: '', own: 3, hold: 0, ramp: 0, end: next });
      continue;
    }
    const s = levelAt(an, t), step = stepOf(s), clear = clearAt(an, t);
    if (step === 0 || clear < FAINT || !on[i]) continue;
    const every = clear >= CLEAR ? (step === 2 ? 2 : 1) : 0;    // how often it hits off the 1
    const kind = step === 1 ? (pos[i] === 0 && clear >= SURE ? 'tick' : '')
      : pos[i] === 0 && (step >= 3 || every) ? 'big' : every && pos[i] % every === 0 ? 'beat' : '';
    if (!kind) continue;
    const plays = every && struckShare(an, b[Math.max(0, i - 4)], b[i + 4] ?? t + 1) >= 0.5;
    const loud = clip((s - GROOVE) / (1 - GROOVE), 0, 1);
    const hold = Math.min(ATTACK_S[0] + (ATTACK_S[1] - ATTACK_S[0]) * loud, 0.4 * (next - t));
    out.push({ t, kind, own: plays ? (step === 4 ? 2 : 1) : 0, hold, ramp: 0, end: 0 });
  }
  out.forEach((h, k) => {
    if (!h.kind) return;
    const next = out[k + 1]?.t ?? Infinity;
    const [len, code] = RAMPS.find(([s]) => s >= next - h.t - h.hold) ?? RAMPS[RAMPS.length - 1];
    h.ramp = code;
    h.end = Math.min(next, h.t + h.hold + len);
  });
  return out;
}

/** Per frame, the headlights the beat layer owns (as Hit.own says), from each hit until it stops ringing.
 * The moves leave what it owns alone (moves.half); choreograph sets it on the analysis before they play. */
export function ownership(an: Analysis): Uint8Array {
  const out = new Uint8Array(an.nFrames);
  const f = (x: number) => clip(Math.round(x / an.step) - 1, 0, an.nFrames);     // the lights lead a frame
  for (const h of hits(an)) if (h.own) out.fill(h.own, f(h.t), f(h.end));
  return out;
}

/** Lay the beat layer over the choreography (after the moves and drums), then the builds and the drops. */
export function apply(cars: Car[], an: Analysis): void {
  if (an.beats.length < 4) return;
  const mid = M.centreTruck(cars) ?? cars[Math.floor(cars.length / 2)];
  for (const { t, kind, hold, ramp, end } of hits(an)) {
    const peak = stepOf(levelAt(an, t)) === 4;
    const hit = (c: Car, chs: number[], dur: number, until = end, code = ramp) => {
      c.light(chs, t, t + dur);
      c.light(chs, t + dur, until, code);
    };
    if (kind === 'tick') hit(mid, mid.inner(), ATTACK_S[0]);
    if (kind !== 'big' && kind !== 'beat') continue;
    for (const c of cars) {
      hit(c, peak ? c.outer() : c.inner(), kind === 'big' ? hold * 1.25 : hold);
      if (kind === 'big' && peak) hit(c, c.everything(), hold, t + hold + 1, C.OFF_1000);   // flashes, fades
      if (kind === 'big' && c.hasBar) M.barFlash(c, t, Math.min(0.3, end - t), peak ? 1.0 : 0.5);
    }
  }
  for (const [s0, land] of builds(an)) buildPulse(cars, an, s0, land);
  dropHits(cars, an);
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
      const lamps = (c: Car) => (levelAt(an, t) >= DRIVE ? c.heads() : c.inner());
      for (const c of order.slice(0, reach)) c.light(lamps(c), t, t + hold);
    }
  });
}

/** Each drop: black for a beat before it, then every lamp of every car on together for a beat. */
function dropHits(cars: Car[], an: Analysis): void {
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
