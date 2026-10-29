// The motor choreographer: closures as their own slow instruments, a side stage to the lights.
//
// Lights flash in 20 ms; the motors move in seconds (mirrors 2 s, windows 4 s, frunk and liftgates
// 14 s up / 4 s down - the Cybertruck's frunk 10 s up - charge port 2 s), and Tesla counts their commands
// per show *per closure*
// (liftgate 6, each window 6, each mirror 20, charge port 3). So they get their own choreography,
// planned from the form map and the crescendos rather than from the lights, with its own moves:
//
//   Lids (frunk + liftgates), one gesture per crescendo, biggest first:
//     dance        the biggest builds: every lid opens fully, lands on the peak a relay after its
//                  neighbour (relay: RELAY_MAX_S), dances through the loud stretch and closes (Open + Dance +
//                  Close)
//     relay / alternate / wave   part-way lifts (a Stop on the peak) for the rest (Open + Close)
//   Windows (6 commands per window; down at the start as a relay across the cars, left down at the end):
//     travelling dance   fronts then rears dance ~4.5 s, car after car a window's travel apart, direction
//                        alternating
//     peak dance         every window dances 10 s on the biggest peak, car after car (about 24 s per window
//                        in all)
//   Mirrors (20 commands per mirror, six mirrors across the lineup), on their own musical timing:
//     a tempo pulse in the steadiest section; figures on the biggest landings (wave left-right, wave
//     right-left, outside-in, inside-out, alternate, Ys-vs-truck); and wherever nothing
//     has moved for 12 s of lively music (30 s of calm), another figure on the next downbeat.
//   Charge port (3 commands): its Dance is a rainbow light, so it opens for the most exciting stretch of
//     the song, at most PORT_DANCE_MAX_S, the cars its travel time apart: a relay of rainbows over the peak.

import type { Analysis, Section } from './analysis';
import type { Car } from './car';
import * as C from './channels';
import { flowsAt } from './feel';
import { DRIVE, GROOVE, levelAt, levelOver, PEAK, stepOf } from './level';
import * as np from './np';
import { builds, drops } from './pulse';
import { barLen, beatLen } from './tempo';

const LIVELY = GROOVE;                // motors move only where the music is at least this lively (a groove)
const LOUD = DRIVE;                  // ... and spend the most where it is loud (drive and the peak)

// the Cybertruck's frunk timed on the truck, Oct 2026
export const LIFTGATE_OPEN_S: Record<string, number> = { modely: 14.0, cybertruck: 10.0 };
export const LIFTGATE_CLOSE_S = 4.0;
export const WINDOW_S = 4.0, PORT_S = 2.0, MIRROR_S = 2.0;
const WINDOW_BURST_S = 4.5, WINDOW_PEAK_DANCE_S = 10.0;   // window dances: ~3 x 4.5 + 10 = 24 s, under 30 s
const LID_DANCE_MIN_S = 4.0, LID_DANCE_MAX_S = 9.0, LID_DANCE_BUDGET_S = 20.0;   // a lid's dance on a peak
const LID_OPEN_MARGIN_S = 0.8;          // a lid only dances once fully open: land a little early
const PORT_DANCE_MAX_S = 30.0;          // the port's rainbow: about 30 s of dancing a show, as for the motors
const STILL_LIVELY_S = 12.0, STILL_CALM_S = 30.0;   // longest still stretch, loud and in a groove
const ARRIVE_S = 0.5, BUILT = 0.55, HOLDS = 0.8, HOLD_MAX_S = 16, SPACING_S = 24;   // crescendos()
const MIRROR_PULSE_CYCLES = 4;          // the steady mirror pulse, leaving commands for the rest of the song
const SHUT_BY_S = 1.0;                  // every lid is shut this long before the show ends
const RELAY_MAX_S = 4.0;                // the longest a car waits for the one before it (a lid's close)

/** How long after the car before it a car starts a motor's figure: that motor's travel time (at most
 * RELAY_MAX_S for the slow lids and doors), so each car moves while the one before it is on its way: a
 * relay across the lineup, never a unison. */
const relay = (travel: number) => Math.min(travel, RELAY_MAX_S);

/** (peak_time, build_length, hold_until, score) */
type Crescendo = [number, number, number, number];
/** The mirrors in a row, crowd-left to crowd-right: [car, mirror channel]. */
type Line = [Car, number][];
/** Commands spent so far per (car, mirror). */
type Spent = Map<Car, Map<number, number>>;
/** (need, t0, t1, lively) */
type Gap = [number, number, number, boolean];

const spentOf = (spent: Spent, c: Car, m: number) => spent.get(c)!.get(m)!;
const addSpent = (spent: Spent, c: Car, m: number, k: number) => spent.get(c)!.set(m, spentOf(spent, c, m) + k);

const used = (c: Car, ch: number) => c.closureCounts.get(ch) ?? 0;

/** Whether any frame in [f0, f1) of the channel carries a command. */
function anyIn(car: Car, ch: number, f0: number, f1: number): boolean {
  const end = Math.min(f1, car.nFrames);
  for (let f = Math.max(f0, 0); f < end; f++) if (car.get(f, ch)) return true;
  return false;
}

/** (peak_time, build_length, hold_until, score) for the biggest moments, the song's peak first and then
 * the rest by size.
 *
 * A moment is where the music arrives somewhere loud: the start of the peak (the level's top step), each
 * build's landing and drop (pulse.ts), and the arrival chords. Its size is the level it reaches within
 * ARRIVE_S. Its build length is how long the level had been rising to it (back to where it was under BUILT of
 * that), and it holds while the level stays over HOLDS of it, at most HOLD_MAX_S (the peak: while the music
 * stays at drive or above). Moments are ranked by their size and build, kept at least SPACING_S apart.
 */
function crescendos(an: Analysis, lead: number): Crescendo[] {
  const step = an.step, lv = an.level!;
  const cands: [number, number | null, number][] = [];
  let top = -1;
  for (let f = 0; f < lv.length; f++) if (lv[f] >= PEAK) { top = f; break; }
  for (const [t0, land] of builds(an)) cands.push([land, land - t0, 0.5]);
  for (const d of drops(an)) cands.push([d, null, 0.3]);
  const ev = an.events;
  for (let i = 0; i < ev.t.length; i++) {
    if (ev.arrival[i] === 1 && levelAt(an, ev.t[i]) >= LOUD) cands.push([ev.t[i], null, 0.2]);
  }
  const peaks: Crescendo[] = [];
  for (const [t, blen0, bonus] of cands) {
    const f = Math.min(Math.trunc(t / step), lv.length - 1);
    const pk = np.max(lv, f, Math.min(f + Math.round(ARRIVE_S / step), lv.length));
    let blen = blen0;
    if (blen === null) {
      let g = f;
      while (g > 0 && lv[g] > BUILT * pk) g--;
      blen = Math.max((f - g) * step, 3.0);
    }
    let h = f;
    while (h < lv.length - 1 && lv[h] > HOLDS * pk && (h - f) * step < HOLD_MAX_S) h++;
    peaks.push([t, np.clip(blen, 1.0, lead), h * step, pk + bonus]);
  }
  if (top >= 0) {                                   // the peak: the moment the show was saving its top for
    let h = top;
    while (h < lv.length - 1 && stepOf(lv[h]) >= 3) h++;
    let g = top;
    while (g > 0 && lv[g] > BUILT * lv[top]) g--;
    peaks.push([onBeat(an, top * step), np.clip((top - g) * step, 1.0, lead), h * step, 3.0]);
  }
  if (!peaks.length) return [];
  peaks.sort((p, q) => p[0] - q[0]);
  const merged: Crescendo[] = [];
  for (const p of peaks) {  // within 6 s: one moment, keeping the longer build and hold, the higher score
    const q = merged[merged.length - 1];
    if (q && p[0] - q[0] < 6) {
      merged[merged.length - 1] = [p[3] >= q[3] ? p[0] : q[0], Math.max(p[1], q[1]), Math.max(p[2], q[2]),
        Math.max(p[3], q[3])];
    } else {
      merged.push(p);
    }
  }
  const ranked: Crescendo[] = [];
  const byScore = merged.slice().sort((p, q) => q[3] * (0.5 + q[1] / lead) - p[3] * (0.5 + p[1] / lead));
  for (const p of byScore) if (ranked.every((q) => Math.abs(p[0] - q[0]) >= SPACING_S)) ranked.push(p);
  return ranked;
}

/** `t` moved onto the nearest beat if one is within `reach` s: a motor starting to move, or a
 * lid stopping at its peak, is a visible accent and should land with the music. */
function onBeat(an: Analysis, t: number, reach = 0.35): number {
  const b = an.beats ?? [];
  if (!b.length) return t;
  const d = new Float64Array(b.length);
  for (let k = 0; k < b.length; k++) d[k] = Math.abs(b[k] - t);
  const i = np.argmin(d);
  return Math.abs(b[i] - t) <= reach ? b[i] : t;
}

/** The lid plan for one crescendo: per car (open_at, stop_at | null, close_at, dance span | null). */
type LidPlan = Map<Car, [number, number | null, number, [number, number] | null]>;

/** Every closure's part in the show, in the order they are planned. */
export function choreograph(cars: Car[], an: Analysis): void {
  windows(cars, an);
  chargePort(cars, an);
  lids(cars, an);
  const [line, spent] = mirrors(cars, an);
  fillStill(cars, an, line, spent);
  spendLeftovers(cars, an, line, spent);
  falconDoors(cars, an);
  finishWindows(cars, an);
}

/** Windows: 6 commands *per window*, and they never close during the show - Tesla's README notes the
 * music only plays from the cabin speakers, so the crowd hears it through the open windows. They go down as
 * the music starts, a relay: car by car from the crowd's left a beat apart, the fronts and then the rears.
 * The waves are Dance bursts instead (a lowered window dancing bobs up a little and back): fronts first,
 * rears half a burst later, rolling across the cars a window's travel apart - left to right, then right to
 * left. The biggest peak gets a longer dance from every window, car after car; a final Open puts every window
 * fully down again (finishWindows). Dancing stays well under Tesla's ~30 s per show recommendation
 * (thermal limits). */
function windows(cars: Car[], an: Analysis): void {
  const end = an.duration;
  const first = an.beats.find((b) => b >= 0.2) ?? 0.2, opening = Math.min(beatLen(an), 1.0);
  for (const c of cars) {
    const idx = cars.indexOf(c);
    for (const w of C.WINDOWS) {
      const rear = w === C.L_REAR_WINDOW || w === C.R_REAR_WINDOW;
      const t = first + opening * (idx + (rear ? cars.length : 0));
      c.closure(w, t, t + 0.5, C.CLOSURE_OPEN);
    }
    const nCars = cars.length;
    const secs = an.sections ?? [];
    const peaks = crescendos(an, LIFTGATE_OPEN_S[c.kind]).sort((p, q) => -p[3] - -q[3]);
    const bar = barLen(an);
    const beat = bar / 4;
    const burst = beat * Math.max(2, Math.round(WINDOW_BURST_S / beat));      // ~4.5 s, a whole number of beats
    const half = beat * Math.max(1, Math.floor(Math.round(burst / beat) / 2));
    const peakT = peaks.length ? onBeat(an, peaks[0][0]) : null;
    // wave moments: starts of loud sections, spread over the piece, clear of the peak dance
    const loud = secs.filter((sc) => levelOver(an, sc.t0, sc.t1) >= LOUD && 8 < sc.t0 && sc.t0 < end - 20
      && !flowsAt(an, sc.t0));
    const waveCands = Array.from(new Set(loud.map((sc) => Math.round(sc.t0 * 10) / 10))).sort((p, q) => p - q);
    const waves: number[] = [];
    let last = -1e9;
    const clear = (t: number) => peakT === null || t + 2 * burst < peakT
      || t > peakT + WINDOW_PEAK_DANCE_S + burst;
    for (const t of waveCands) {
      if (t - last >= Math.max(30.0, (end - 20) / 5) && clear(t)) {
        waves.push(t);
        last = t;
      }
      if (waves.length >= 3) break;
    }
    const fronts = [C.L_FRONT_WINDOW, C.R_FRONT_WINDOW], rears = [C.L_REAR_WINDOW, C.R_REAR_WINDOW];
    waves.forEach((t, k) => {
      const lag = relay(WINDOW_S) * (k % 2 === 0 ? idx : nCars - 1 - idx);    // left to right, then back
      const t0 = onBeat(an, t + lag);
      for (const w of fronts) c.closure(w, t0, t0 + burst, C.CLOSURE_DANCE);
      for (const w of rears) c.closure(w, t0 + half, t0 + half + burst, C.CLOSURE_DANCE);
    });
    if (peakT !== null && !flowsAt(an, peakT)) {
      const span = WINDOW_PEAK_DANCE_S;
      let t0 = onBeat(an, peakT + idx * relay(WINDOW_S));
      if (t0 + span > end - 6) t0 = Math.max(1.0, end - 6 - span);
      C.WINDOWS.forEach((w, j) => c.closure(w, t0 + 0.3 * j, t0 + 0.3 * j + span, C.CLOSURE_DANCE));
    }
  }
}

/** Charge port: its Dance is the rainbow light, so it joins the colours for the most exciting stretch of
 * the song - Open, Dance, Close (its 3 commands) - the cars its travel apart from the crowd's left, so the
 * rainbows arrive as a relay and leave the same way. */
function chargePort(cars: Car[], an: Analysis): void {
  const port = portWindow(an);
  if (port !== null) {
    for (const c of cars) {
      const lag = onBeat(an, port[0] + relay(PORT_S) * cars.indexOf(c)) - port[0];
      const danceFrom = port[0] + lag, danceEnd = port[1] + lag;
      const openAt = danceFrom - PORT_S - 0.5;
      c.closure(C.CHARGE_PORT, openAt, openAt + 0.5, C.CLOSURE_OPEN);
      c.closure(C.CHARGE_PORT, danceFrom, danceEnd, C.CLOSURE_DANCE);
      c.closure(C.CHARGE_PORT, danceEnd + 0.3, danceEnd + 0.8, C.CLOSURE_CLOSE);
    }
  }
}

/** Liftgate / frunk: the opening *is* the crescendo. For each of the biggest builds, start opening
 * `build length` before the peak so it is still rising all the way up, Stop on the peak (partial for
 * short builds, full for 14 s ones), hold through the loud stretch, then close in the quiet after so it
 * can do it again. Open + Close count: 3 crescendos per show. */
function lids(cars: Car[], an: Analysis): void {
  const end = an.duration;
  const n = cars.length;
  let ctIdx = cars.findIndex((q) => q.isCt);
  if (ctIdx < 0) ctIdx = Math.floor(n / 2);
  let cmdsLeft = C.CLOSURE_LIMITS[C.LIFTGATE];                 // Open + Dance + Close / Open + Close
  let danced = 0.0;
  const lead = Math.max(...cars.map((c) => LIFTGATE_OPEN_S[c.kind]));
  const accepted: number[] = [];                                // shared: the cars move as one lineup
  const busyBy = new Map<Car, [number, number][]>(cars.map((c) => [c, []]));

  /** Per car [open at, stop at or null, close at] for one crescendo. Every figure is a
   * cross-car one rather than three lids rising together:
   *   relay      one lid lifts part way and Stops; as it drops the next lifts; the last rises
   *              all the way onto the peak (crowd-left to right, then right to left next time)
   *   alternate  the two Ys lift together and, as they drop, the truck's frunk rises to the peak
   *   wave       left to right two seconds apart, closing in the same order */
  const lidPlan = (pattern: number, k: number, peak: number, buildLen: number, holdUntil: number): LidPlan => {
    const travel = Math.max(3.5, Math.min(lead, Math.max(buildLen, 6.0)));     // the lid that lands on the peak
    const rise = Math.max(5.0, Math.min(lead * 0.5, buildLen / 2));      // a part-way lift (a third of the way)
    const plan: LidPlan = new Map();
    cars.forEach((c, idx) => {
      let lag = 0.0;
      let stopAt: number | null = null;
      let openAt = 0, closeAt = 0;
      if (pattern === 0) {
        const stage = k % 2 ? (n - 1 - idx) : idx;
        if (stage === n - 1) {
          openAt = peak - travel;
        } else {
          let openNext = peak - travel;
          for (let _ = 0; _ < n - 1 - stage; _++) {          // each lid closes 0.8 s before the next lifts
            openNext = openNext - 0.8 - 0.3 - rise;
          }
          openAt = openNext;
          stopAt = openAt + rise;
          closeAt = stopAt + 0.3;
        }
      } else if (pattern === 1) {
        if (c.isCt) {
          openAt = peak - travel;
        } else {
          closeAt = peak - travel - 0.8;
          stopAt = closeAt - 0.3;
          openAt = stopAt - rise;
        }
      } else {
        lag = (idx - ctIdx) * 2.0;
        openAt = peak + lag - travel;
      }
      if (stopAt === null) {
        closeAt = Math.min(Math.max(holdUntil, peak + 2.0), end - LIFTGATE_CLOSE_S - 2.5) + Math.max(lag, 0.0);
        if (travel < lead - 0.5) {                      // short build: freeze part-way, on the peak
          stopAt = peak + lag;
        }
      }
      plan.set(c, [openAt, stopAt, closeAt, null]);
    });
    return plan;
  };

  /** Per car [open at, null, close at, [dance from, dance to]]: every lid opens fully and
   * lands on the peak a relay after its neighbour (left to right, then right to left the
   * next time), dances through the loud stretch (the song's peak through as much of it as the budget
   * allows), then closes in the same order. */
  const dancePlan = (k: number, peak: number, holdUntil: number): LidPlan => {
    const most = k === 0 ? LID_DANCE_BUDGET_S : Math.min(LID_DANCE_MAX_S, LID_DANCE_BUDGET_S - danced);
    const danceLen = np.clip(holdUntil - peak, LID_DANCE_MIN_S, most);
    // the last car still lands inside the loud stretch, and every lid is shut before the show ends
    const each = Math.min(...cars.map((c) => relay(LIFTGATE_OPEN_S[c.kind])), danceLen / Math.max(n - 1, 1));
    const plan: LidPlan = new Map();
    cars.forEach((c, idx) => {
      const land = onBeat(an, peak + each * (k % 2 ? (n - 1 - idx) : idx));
      const openAt = land - LIFTGATE_OPEN_S[c.kind] - LID_OPEN_MARGIN_S;
      const len = Math.min(danceLen, end - SHUT_BY_S - LIFTGATE_CLOSE_S - 0.3 - land);
      plan.set(c, [openAt, null, land + len + 0.3, [land, land + len]]);
    });
    return plan;
  };

  for (const cr of crescendos(an, lead)) {
    const buildLen = cr[1], holdUntil = cr[2];
    const peak = onBeat(an, cr[0]);
    if (cmdsLeft < 2) break;
    const k = accepted.length;
    const dancing = cmdsLeft >= 3 && holdUntil - peak >= LID_DANCE_MIN_S && !flowsAt(an, peak)
      && danced + LID_DANCE_MIN_S <= LID_DANCE_BUDGET_S;
    const plan = dancing ? dancePlan(k, peak, holdUntil) : lidPlan(k % 3, k, peak, buildLen, holdUntil);
    let ok = true;
    for (const c of cars) {
      const [openAt, , closeAt] = plan.get(c)!;
      const win = [openAt - 1.0, closeAt + LIFTGATE_CLOSE_S + 1.0];
      const dance = plan.get(c)![3];
      if (openAt < 0.8 || closeAt <= openAt + 2.0 || closeAt + LIFTGATE_CLOSE_S > end - SHUT_BY_S
        || (dance && dance[1] - dance[0] < LID_DANCE_MIN_S)
        || busyBy.get(c)!.some(([a, b]) => !(win[1] < a || win[0] > b))) {
        ok = false;
      }
    }
    if (!ok) continue;
    accepted.push(peak);
    cmdsLeft -= dancing ? 3 : 2;
    for (const c of cars) {
      const [openAt, stopAt, closeAt] = plan.get(c)!;
      busyBy.get(c)!.push([openAt - 1.0, closeAt + LIFTGATE_CLOSE_S + 1.0]);
      c.closure(C.LIFTGATE, openAt, openAt + 0.5, C.CLOSURE_OPEN);
      if (stopAt !== null) c.set(C.LIFTGATE, stopAt, stopAt + 0.3, C.CLOSURE_STOP);
      if (dancing) {
        const [d0, d1] = plan.get(c)![3]!;
        c.closure(C.LIFTGATE, d0, d1, C.CLOSURE_DANCE);
      }
      c.closure(C.LIFTGATE, closeAt, closeAt + 0.5, C.CLOSURE_CLOSE);
    }
    if (dancing) {
      danced += Math.max(...Array.from(plan.values()).map((p) => p[3]![1] - p[3]![0]));
    }
  }
}

/** Mirrors: 20 commands *per mirror*, two mirrors a car, on their own musical clock.
 *   tempo pulse   in the steadiest loud section: fold on one bar, unfold on the next, the Ys and the
 *                 truck alternating, so the line keeps time
 *   gestures      fold-and-unfold figures spread over the piece on the biggest landings (wave
 *                 left-right, Ys-then-truck, outside-in, ...)
 * Returns the line of mirrors and the commands each has spent, for fillStill and spendLeftovers. */
function mirrors(cars: Car[], an: Analysis): [Line, Spent] {
  const end = an.duration;
  const line: Line = [];
  for (const c of cars) for (const m of [C.R_MIRROR, C.L_MIRROR]) line.push([c, m]);   // crowd-left first
  const spent: Spent = new Map(cars.map((c) => [c, new Map([[C.R_MIRROR, 0], [C.L_MIRROR, 0]])]));
  const secs = an.sections ?? [];
  const bar = barLen(an);
  // fold on one beat of the cycle, unfold half a cycle later: half a cycle must cover the whole
  // 2 s fold, so slow songs pulse every second (or third) bar rather than half-folding
  const cycle = bar * Math.ceil((2 * MIRROR_S + 0.1) / bar);
  // 1. The tempo pulse: the longest loud section with a usable beat.
  let pulse: Section | null = null;
  if (an.beatScore >= 2.0) {
    // how evenly the tracked beats fill the section (1 = metronomic)
    const regularity = (sc: Section): number => {
      const b = an.beats.filter((x) => x >= sc.t0 && x < sc.t1);
      if (b.length < 8) return 0.0;
      const gaps = np.diff(b);
      return np.clip(1 - np.std(gaps) / Math.max(np.mean(gaps), 1e-6), 0, 1);
    };
    const loud = (sc: Section) => levelOver(an, sc.t0, sc.t1);
    const cands = secs.filter((sc) => loud(sc) >= LOUD && sc.t1 - sc.t0 >= 6 * cycle + 4 && sc.t0 > 6
      && !flowsAt(an, (sc.t0 + sc.t1) / 2)
      && regularity(sc) >= 0.6);
    for (const sc of cands) {
      if (pulse === null) {
        pulse = sc;
        continue;
      }
      // the most regular beat over the longest time; the first of equals wins
      if (regularity(sc) * (sc.t1 - sc.t0) > regularity(pulse) * (pulse.t1 - pulse.t0)) {
        pulse = sc;
      }
    }
  }
  let pulseWindow: [number, number] | null = null;
  if (pulse !== null) {
    const beats = an.beats.filter((x) => x >= pulse!.t0 + 1 && x < pulse!.t1 - 4);
    // Walk the section's own beats at the mirrors' cycle (one or two bars), so the pulse
    // stays on the music's grid even when the tempo drifts a little.
    let grid: number[] = [];
    if (beats.length >= 8) {
      const per = Math.max(1, Math.round(cycle / Math.max(np.median(np.diff(beats)), 0.2)));
      for (let i = 0; i < beats.length; i += per) grid.push(beats[i]);
    }
    if (grid.length < 4 || Math.abs(np.median(np.diff(grid)) - cycle) > 0.3 * cycle) {
      grid = Array.from(np.arange(pulse.t0 + 1, pulse.t1 - 4, cycle));   // the tracker is unsure: even time
    }
    let tPrev = -9;
    let cycles = 0;
    for (const d of grid) {
      if (d - tPrev < cycle - 0.1 || cycles >= MIRROR_PULSE_CYCLES) continue;
      const parity = cycles % 2;                      // the Ys on one cycle, the trucks on the next
      for (const [c, m] of line) {
        if ((c.isCt ? 0 : 1) !== parity || spentOf(spent, c, m) + 2 > C.CLOSURE_LIMITS[m] - 8) continue;
        c.closure(m, d, d + 0.4, C.CLOSURE_CLOSE);
        c.closure(m, d + cycle / 2, d + cycle / 2 + 0.4, C.CLOSURE_OPEN);
        addSpent(spent, c, m, 2);
      }
      tPrev = d;
      cycles++;
    }
    pulseWindow = [pulse.t0, pulse.t1];
  }
  // 2. Gestures on the biggest landings, spread over the piece.
  const moments: [number, number][] = [];
  for (const [, land] of builds(an)) moments.push([land, 3.0]);
  const ev = an.events;
  for (let i = 0; i < ev.arrival.length; i++) if (ev.arrival[i] === 1) moments.push([ev.t[i], 2.0]);
  for (const h of an.hits) {
    if (levelAt(an, h) >= LOUD) moments.push([h, 1.0]);
  }
  moments.sort((p, q) => -p[1] - -q[1]);
  const picks: number[] = [];
  for (const [t] of moments.filter(([m]) => !flowsAt(an, m))) {
    if (t < 3 || t > end - 9) continue;
    if (pulseWindow && pulseWindow[0] - 4 < t && t < pulseWindow[1] + 4) continue;
    if (picks.every((q) => Math.abs(t - q) >= Math.max(25.0, (end - 12) / 6))) picks.push(t);
  }
  picks.sort((p, q) => p - q);
  const patterns = ['wave_lr', 'car_alternate', 'outside_in', 'alternate', 'wave_rl', 'inside_out'];
  picks.forEach((t, k) => {
    mirrorGesture(an, line, spent, onBeat(an, t), patterns[k % patterns.length]);
  });
  return [line, spent];
}


// ---- Model X falcon doors ----------------------------------------------------------------------
// The Model X's showpiece: both falcon doors rise (20 s), land on the song's biggest peak a beat
// after the car to their left - as the windows' peak dance does on the other cars - dance through
// the loud stretch and close (8 s): Open + Dance + Close of the doors' 6 commands each. Tesla's
// README warns that windows moving while the doors move can trip the pinch detection and stop the
// show, so the car's windows keep still for the whole gesture (window commands there are dropped).
// The front doors (22 s up) are left alone.

export const FALCON_OPEN_S = 20.0, FALCON_CLOSE_S = 8.0;
const FALCON_DANCE_S = WINDOW_PEAK_DANCE_S;

function falconDoors(cars: Car[], an: Analysis): void {
  const end = an.duration;
  const peaks = crescendos(an, FALCON_OPEN_S).sort((p, q) => -p[3] - -q[3]);
  for (const c of cars) {
    if (!c.falcon) continue;
    const idx = cars.indexOf(c);
    for (const [peak, , holdUntil] of peaks) {
      const land = onBeat(an, peak + idx * relay(FALCON_OPEN_S));
      const openAt = land - FALCON_OPEN_S - LID_OPEN_MARGIN_S;
      const danceEnd = land + np.clip(holdUntil - land, LID_DANCE_MIN_S, FALCON_DANCE_S);
      const closeAt = danceEnd + 0.3;
      // after the windows' opening Open, and shut in time for their last Open (finishWindows) to follow
      if (openAt < 0.7 + WINDOW_S + 0.5 || closeAt + FALCON_CLOSE_S + 0.5 > end - 2.0) continue;
      for (const door of [C.L_FALCON, C.R_FALCON]) {
        c.closure(door, openAt, openAt + 0.5, C.CLOSURE_OPEN);
        c.closure(door, land, danceEnd, C.CLOSURE_DANCE);
        c.closure(door, closeAt, closeAt + 0.5, C.CLOSURE_CLOSE);
      }
      const still: [number, number] = [openAt - 0.5, closeAt + FALCON_CLOSE_S + 0.5];
      c.windowsStill.push(still);
      for (const w of C.WINDOWS) {
        // every window command that would have the window moving in the span: a whole run, plus travel
        for (const [a, b] of commandRuns(c, w)) {
          if (a * an.step >= still[1] || b * an.step + WINDOW_S <= still[0]) continue;
          for (let f = a; f < b; f++) c.put(f, w, 0);
        }
      }
      break;
    }
  }
}

/** [first frame, end frame) of each run of one command on a channel. */
function commandRuns(car: Car, ch: number): [number, number][] {
  const out: [number, number][] = [];
  for (let f = 0; f < car.nFrames;) {
    const v = car.get(f, ch);
    if (!v) {
      f++;
      continue;
    }
    let g = f;
    while (g < car.nFrames && car.get(g, ch) === v) g++;
    out.push([f, g]);
    f = g;
  }
  return out;
}


// ---- Using the whole budget --------------------------------------------------------------------
// Tesla's limits per show: Open/Close/Dance commands per closure (lid 6, each window 6, each mirror
// 20, port 3) and ~30 s of dancing per closure before thermal cut-outs. The planners above spend
// them on the music's big moments; what is left goes where it helps most - the longest stretch with
// nothing moving, again and again - keeping DANCE_CAP_S of dancing per closure as a safety margin.

const DANCE_CAP_S = 27.0;


function danced(car: Car, ch: number, step: number): number {
  let n = 0;
  for (let f = 0; f < car.nFrames; f++) {
    const v = car.get(f, ch);
    if (v >= 96 && v < 160) n++;
  }
  return n * step;
}


function free(car: Car, ch: number, t0: number, t1: number): boolean {
  return !anyIn(car, ch, Math.max(0, car.fr(t0)), car.fr(t1));
}


/** [first, end) frames of each stretch with no motor moving, from 4 s in to 10 s before the end, and
 * whether the music there is loud (mostly drive or the peak). */
function stillRuns(mask: ArrayLike<number | boolean>, an: Analysis): [number, number, boolean][] {
  const lo = Math.trunc(4.0 / an.step), hi = Math.trunc((an.duration - 10) / an.step);
  const inv = new Uint8Array(Math.max(0, Math.min(Math.max(hi, lo), mask.length) - lo));
  for (let i = 0; i < inv.length; i++) inv[i] = mask[lo + i] ? 0 : 1;
  return np.runs(inv).map(([a, b]) => {
    const lively = levelOver(an, (a + lo) * an.step, (b + lo) * an.step) >= LOUD;
    return [a + lo, b + lo, lively];
  });
}

/** Still stretches, longest (relative to its threshold) first: [(need, t0, t1, lively)]. */
function gaps(mask: ArrayLike<number | boolean>, an: Analysis): Gap[] {
  const step = an.step;
  const out: Gap[] = [];
  for (const [a, b, lively] of stillRuns(mask, an)) {
    const need = (b - a) * step / (lively ? STILL_LIVELY_S : STILL_CALM_S);
    out.push([need, a * step, b * step, lively]);
  }
  // biggest need first; equal needs by the later start, then the later end
  return out.sort((p, q) => {
    for (let i = 0; i < 4; i++) {
      const x = Number(p[i]), y = Number(q[i]);
      if (x !== y) return y - x;
    }
    return 0;
  });
}


function spendLeftovers(cars: Car[], an: Analysis, line: Line, spent: Spent): void {
  const beat = beatLen(an);
  const step = an.step;
  // 1. Windows: extra travelling dances in the stillness (one command kept for the final Open).
  const burst = beat * Math.max(2, Math.round(WINDOW_BURST_S / beat));
  for (let k = 0; k < 12; k++) {
    const mask = motion(cars, an);
    let placed = false;
    for (const [need, g0, g1] of gaps(mask, an)) {
      if (g1 - g0 < burst + 3 * beat + 2 || need < 0.5) continue;
      const t0 = onBeat(an, (g0 + g1) / 2 - (burst + 2 * beat) / 2);
      cars.forEach((c, idx) => {
        const lag = relay(WINDOW_S) * (k % 2 === 0 ? idx : cars.length - 1 - idx);
        C.WINDOWS.forEach((w, j) => {
          const a = t0 + lag + (j % 2 === 0 ? 0 : beat / 2);
          if (used(c, w) < C.CLOSURE_LIMITS[w] - 1 && danced(c, w, step) + burst <= DANCE_CAP_S
            && free(c, w, a - 0.5, a + burst + 0.5)) {
            c.closure(w, a, a + burst, C.CLOSURE_DANCE);
            placed = true;
          }
        });
      });
      if (placed) break;
    }
    if (!placed) break;
  }
  // 2. Lids: a lift across the lineup in the longest stillness - opening fully and dancing
  //    when three commands and the time allow, else part way (Open, Stop, Close).
  for (let k = 0; k < 3; k++) {
    const mask = motion(cars, an);
    let placed = false;
    for (const [, g0, g1] of gaps(mask, an)) {
      cars.forEach((c, idx) => {
        const left = C.CLOSURE_LIMITS[C.LIFTGATE] - used(c, C.LIFTGATE);
        if (left < 2) return;
        const lag = relay(LIFTGATE_OPEN_S[c.kind]) * (k % 2 === 0 ? idx : cars.length - 1 - idx);
        const full = LIFTGATE_OPEN_S[c.kind] + LID_OPEN_MARGIN_S;
        const tOpen = g0 + 1.0 + lag;
        const dance = left >= 3 && g1 - tOpen >= full + LID_DANCE_MIN_S + LIFTGATE_CLOSE_S + 1
          && danced(c, C.LIFTGATE, step) + LID_DANCE_MIN_S <= DANCE_CAP_S;
        let d0 = 0, d1 = 0, stop = 0, tClose: number;
        if (dance) {
          d0 = onBeat(an, tOpen + full);
          d1 = Math.min(d0 + LID_DANCE_MAX_S, g1 - LIFTGATE_CLOSE_S - 1,
            d0 + DANCE_CAP_S - danced(c, C.LIFTGATE, step));
          tClose = d1 + 0.3;
        } else {
          stop = onBeat(an, tOpen + LIFTGATE_OPEN_S[c.kind] * 0.5);
          tClose = stop + Math.max(2.0, 2 * beat);
        }
        if (tClose + LIFTGATE_CLOSE_S > Math.min(g1 + 2, an.duration - 3)
          || !free(c, C.LIFTGATE, tOpen - 1.0, tClose + LIFTGATE_CLOSE_S + 1.0)) {
          return;
        }
        c.closure(C.LIFTGATE, tOpen, tOpen + 0.5, C.CLOSURE_OPEN);
        if (dance) c.closure(C.LIFTGATE, d0, d1, C.CLOSURE_DANCE);
        else c.set(C.LIFTGATE, stop, stop + 0.3, C.CLOSURE_STOP);
        c.closure(C.LIFTGATE, tClose, tClose + 0.5, C.CLOSURE_CLOSE);
        placed = true;
      });
      if (placed) break;
    }
    if (!placed) break;
  }
  // 3. Mirrors: whatever commands are left, into the longest stillness (lively or calm), down to
  //    stretches of about 8 s of calm music.
  fillStill(cars, an, line, spent, 0.5);
  fillStill(cars, an, line, spent, 0.27);
}


/** After a window's last dance, one Open puts it fully down again for the rest of the show. */
function finishWindows(cars: Car[], an: Analysis): void {
  for (const c of cars) {
    for (const w of C.WINDOWS) {
      let last = -1;
      for (let f = 0; f < c.nFrames; f++) {
        const v = c.get(f, w);
        if (v >= 96 && v < 160) last = f;
      }
      if (last < 0) continue;
      let t = (last + 1) * an.step + 1.0;
      for (const [a, b] of c.windowsStill) if (t + WINDOW_S > a && t < b) t = b;   // not while the doors move
      c.closure(w, Math.min(an.duration - 2.0, t), Math.min(an.duration - 1.5, t + 0.5), C.CLOSURE_OPEN);
    }
  }
}


/** One fold-and-unfold figure across the six mirrors, starting at `t`:
 *   wave_lr / wave_rl     an eighth note apart, crowd-left to right / right to left
 *   outside_in / inside_out  a beat apart, from the ends to the middle / the middle outward
 *   alternate             every other mirror, then the rest as they unfold
 *   car_alternate         the Ys fold, the truck folds as they unfold
 * With freeOnly, a mirror that is already moving nearby sits this one out. */
function mirrorGesture(
  an: Analysis, line: Line, spent: Spent, t: number, pat: string, freeOnly = false,
): [number, number] {
  const n = line.length;
  const beat = beatLen(an);
  const step = Math.max(0.2, beat / 2);                               // an eighth note between neighbours
  const hold = beat * Math.ceil((MIRROR_S + 0.5) / beat);     // fold to unfold: whole beats, >= the 2 s fold
  let placed = 0;
  line.forEach(([c, m], j) => {
    let lag: number;
    if (pat === 'wave_lr') lag = j * step;
    else if (pat === 'wave_rl') lag = (n - 1 - j) * step;
    else if (pat === 'outside_in') lag = Math.min(j, n - 1 - j) * beat;
    else if (pat === 'inside_out') lag = (Math.floor(n / 2) - 1 - Math.min(j, n - 1 - j)) * beat;
    else if (pat === 'alternate') lag = (j % 2) * hold;
    else if (pat === 'car_alternate') lag = c.isCt ? hold : 0.0;
    else lag = 0.0;
    if (spentOf(spent, c, m) + 2 > C.CLOSURE_LIMITS[m]) return;
    const a = t + lag, b = t + lag + hold;
    if (a + 0.5 > an.duration - 3 - hold) return;
    if (freeOnly && anyIn(c, m, c.fr(a - MIRROR_S - 0.5), c.fr(b + MIRROR_S + 0.5))) return;
    c.closure(m, a, a + 0.4, C.CLOSURE_CLOSE);
    c.closure(m, b, b + 0.4, C.CLOSURE_OPEN);
    addSpent(spent, c, m, 2);
    placed++;
  });
  return [placed, hold + (n - 1) * Math.max(step, beat) + MIRROR_S];
}


/** Per frame: is any motor on any car visibly moving (travelling or dancing), or does the music not want one
 * (below a groove, flowing, or in the song's first quarter, so the budget isn't spent before the song has
 * built)? The charge port's dance is a light, not movement, so it doesn't count. */
function motion(cars: Car[], an: Analysis): Uint8Array {
  const mask = new Uint8Array(an.nFrames), early = Math.trunc((0.25 * an.duration) / an.step);
  for (let f = 0; f < mask.length; f++) {
    if (f < early || an.level![f] < LIVELY || flowsAt(an, f * an.step)) mask[f] = 1;
  }
  const spans: [number, number | null][] = [[C.LIFTGATE, null], [C.L_MIRROR, MIRROR_S], [C.R_MIRROR, MIRROR_S]];
  for (const w of C.WINDOWS) spans.push([w, WINDOW_S]);
  for (const c of cars) {
    for (const [ch, travel] of spans) {
      const col = c.column(ch);
      const idx: number[] = [];
      for (let f = 0; f < col.length; f++) if (col[f]) idx.push(f);
      if (!idx.length) continue;
      const starts: number[] = [idx[0]];
      for (let i = 1; i < idx.length; i++) {
        if (idx[i] - idx[i - 1] > 1 || col[idx[i]] !== col[idx[i - 1]]) starts.push(idx[i]);
      }
      starts.forEach((f0, k) => {
        const v = col[f0];
        let f1 = f0;
        while (f1 < col.length && col[f1] === v) f1++;
        if (v >= 96 && v < 160) {                              // dance: for as long as it is held
          mask.fill(1, f0, Math.min(f1, mask.length));
        } else if (v < 224) {                                  // open / close: the travel time
          const t = travel || (v < 96 ? LIFTGATE_OPEN_S[c.kind] : LIFTGATE_CLOSE_S);
          const nxt = k + 1 < starts.length ? starts[k + 1] : col.length;
          mask.fill(1, f0, Math.min(nxt, f0 + Math.trunc(t / an.step), mask.length));
        }
      });
    }
  }
  return mask;
}


/** No long stretch without something moving. The mirrors' commands are limited (20 each), so
 * they go where they help most: again and again, the longest still stretch - measured against
 * STILL_LIVELY_S in lively music, STILL_CALM_S in calm music - gets a mirror figure in its middle,
 * on a downbeat, until no stretch is too long or the commands run out. */
function fillStill(cars: Car[], an: Analysis, line: Line, spent: Spent, scale = 1.0): void {
  const step = an.step;
  const mask = motion(cars, an);
  let downbeats: ArrayLike<number> = an.downbeats ?? [];
  if (!downbeats.length) downbeats = an.beats;
  const patterns = ['wave_lr', 'wave_rl', 'outside_in', 'car_alternate', 'inside_out', 'alternate'];
  const blocked = new Set<string>();
  for (let k = 0; k < 40; k++) {
    let best: [number, number, number] | null = null;
    for (const [a, b, lively] of stillRuns(mask, an)) {
      if (blocked.has(`${a},${b}`)) continue;
      const need = (b - a) * step / (scale * (lively ? STILL_LIVELY_S : STILL_CALM_S));
      if (need > 1 && (best === null || need > best[0])) best = [need, a, b];
    }
    if (best === null) return;
    const [, a, b] = best;
    const mid = (a + b) / 2 * step;
    const near: number[] = [];
    for (let i = 0; i < downbeats.length; i++) if (Math.abs(downbeats[i] - mid) < 3.0) near.push(downbeats[i]);
    let at = mid;
    if (near.length) {
      const d = near.map((x) => Math.abs(x - mid));
      at = near[np.argmin(d)];
    }
    const [placed, span] = mirrorGesture(an, line, spent, at, patterns[k % patterns.length], true);
    if (!placed) {
      let all = true;
      for (const [c, m] of line) if (!(spentOf(spent, c, m) + 2 > C.CLOSURE_LIMITS[m])) all = false;
      if (all) return;                                  // every mirror's commands are spent
      blocked.add(`${a},${b}`);
      continue;
    }
    mask.fill(1, Math.trunc(at / step), Math.min(Math.trunc((at + span) / step), mask.length));
  }
}


/** (dance_from, dance_to) for the charge port's rainbow: the most exciting stretch of up to
 * PORT_DANCE_MAX_S (loud sections count double), starting on a beat; null for a song that never
 * gets lively (Ave Maria). */
function portWindow(an: Analysis): [number, number] | null {
  const lv = an.level!, exc = new Float64Array(lv.length);
  let total = 0;
  for (let i = 0; i < exc.length; i++) {
    exc[i] = (lv[i] >= LOUD ? 1 : 0) + (lv[i] >= PEAK ? 1 : 0);
    total += exc[i];
  }
  if (total === 0) return null;
  const step = an.step, end = an.duration;
  const w = Math.trunc(PORT_DANCE_MAX_S / step);
  const first = PORT_S + 1.5;                                 // room to open before it dances
  const lo = Math.trunc(first / step);
  const hi = Math.max(Math.trunc(first / step) + 1, Math.trunc((end - 6 - PORT_DANCE_MAX_S) / step));
  const csum = new Float64Array(exc.length + 1);
  for (let i = 0; i < exc.length; i++) csum[i + 1] = csum[i] + exc[i];
  const last = Math.min(hi, exc.length);
  let f0 = lo, bestScore = -Infinity;
  for (let s = lo; s <= last; s++) {
    const score = csum[Math.min(s + w, exc.length)] - csum[s];
    if (score > bestScore) {
      bestScore = score;
      f0 = s;
    }
  }
  let liveFirst = -1, liveLast = -1;
  for (let i = f0; i < Math.min(f0 + w, exc.length); i++) {
    if (exc[i] > 0) {
      if (liveFirst < 0) liveFirst = i - f0;
      liveLast = i - f0;
    }
  }
  let a = onBeat(an, (f0 + liveFirst) * step);
  a = Math.max(a, first);
  const b = Math.min((f0 + liveLast) * step + 2.0, a + PORT_DANCE_MAX_S, end - 6);
  return b - a >= 6 ? [a, b] : null;
}
