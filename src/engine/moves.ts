// The move library: whole-stage choreography for one phrase at a time, seen from the front.
//
// The stage, crowd-left to right, is two slots a car: each car's crowd-left half and crowd-right half. In
// any lineup "the truck" is the Cybertruck nearest the middle (centreTruck), whose 60-LED front bar plays
// what lamps can't: comets at a note's pitch, fills and sweeps. Every move lights the whole lineup.
//
// Every hit is sized by the level at its moment (level.ts), so one move grows with the music: at a hush a
// note lights a single lamp and fades; then a half car's signature and DRL; from a groove its inner beam
// too, from drive both headlights - except the headlights the beat layer rings on there (pulse.ts), which
// the moves leave to the beat. What each move looks like is in catalog.ts (MOVES.md);
// MOVES at the end is how the choreographer finds one by name.

import type { Analysis, Phrase } from './analysis';
import type { Car } from './car';
import * as C from './channels';
import { CALM, DRIVE, GROOVE, levelAt, PEAK, stepOf } from './level';
import { arange, clip, cumsum, diff, linspace, quantiles, runs, searchsorted, sum } from './np';
import { beatLen } from './tempo';

const ON_500 = C.ON_500, OFF_500 = C.OFF_500, OFF_1000 = C.OFF_1000;
const BAR = C.FRONT_BAR.length;   // 60 LEDs

type LR = 'L' | 'R';
type Rows = Float64Array[];
/** A phrase as far as the time helpers need one (the choreographer also passes stand-ins). */
type Span = Pick<Phrase, 't0' | 't1'>;

// --- the stage -----------------------------------------------------------------------------------

/** The centrepiece: the Cybertruck nearest the middle of the line, or null without one. */
export function centreTruck(cars: Car[]): Car | null {
  const trucks = cars.filter((c) => c.isCt);
  if (!trucks.length) return null;
  const mid = (cars.length - 1) / 2;
  let best: Car | null = null, bd = Infinity;
  for (const c of trucks) {
    const d = Math.abs(cars.indexOf(c) - mid);
    if (d < bd) [best, bd] = [c, d];
  }
  return best;
}

/** Every (car, half) on the stage, crowd-left to right. */
function slots(cars: Car[]): [Car, LR][] {
  return cars.flatMap((c) => [[c, 'L'], [c, 'R']] as [Car, LR][]);
}

const CENTRE_SHARE = 4 / 3;   // the centrepiece's share of the pitch range against another car's

/** A place on the stage (0 the crowd's left end, 1 the right) -> (car, half, place across that car 0..1):
 * the centre truck takes a wider share, so a run sweeps visibly along its bar. Every style places the
 * melody this way, so a note sits in the same place whether the music beats or flows. */
export function slotAt(cars: Car[], pos: number): [Car, LR, number] {
  const ct = centreTruck(cars);
  const widths = cars.map((c) => (c === ct ? CENTRE_SHARE : 1.0));
  const edges = [0.0, ...Array.from(cumsum(widths), (v) => v / sum(widths))];
  const idx = Math.min(cars.length - 1, searchsorted(edges, clip(pos, 0, 1), 'right') - 1);
  const w = clip((pos - edges[idx]) / (edges[idx + 1] - edges[idx]), 0, 1);
  const car = cars[idx];
  return [car, w < 0.5 ? 'L' : 'R', w];
}

/** Pitch -> (car, half, place across it): low notes on the crowd's left, high on the right. */
const slotFor = (cars: Car[], pitch: number, lo: number, hi: number) => slotAt(cars, posOf(pitch, lo, hi));

/** The pitch range a phrase spreads across the stage: its own, at least an octave wide. */
export function phraseRange(ph: Pick<Phrase, 'lo' | 'hi'>): [number, number] {
  if (ph.hi - ph.lo >= 12) return [ph.lo, ph.hi];
  const mid = (ph.lo + ph.hi) / 2;
  return [mid - 6, mid + 6];
}

const LOCAL_S = 3;

/** Per note of a phrase, the pitch range the stage spreads over around it: the range (phraseRange) of the
 * phrase's top notes within LOCAL_S of it, so wherever the melody wanders it uses the whole stage and
 * neither end sits idle for long. */
export function localRanges(an: Analysis, ph: Pick<Phrase, 'a' | 'b'>): [number, number][] {
  const ev = an.events, out: [number, number][] = [];
  let a = ph.a, b = ph.a;
  for (let i = ph.a; i < ph.b; i++) {
    while (ev.t[a] < ev.t[i] - LOCAL_S) a++;
    while (b < ph.b && ev.t[b] <= ev.t[i] + LOCAL_S) b++;
    const [lo, hi] = quantiles(ev.top.slice(a, b), [0.1, 0.9]);
    out.push(phraseRange({ lo, hi }));
  }
  return out;
}

const posOf = (p: number, lo: number, hi: number) => clip((p - lo) / Math.max(hi - lo, 1e-9), 0, 1);

// --- size ------------------------------------------------------------------------------------------

/** The headlights the beat layer owns at t (pulse.ownership): 1 the inner beams, 2 the outer, 3 both. */
export const owned = (an: Analysis, t: number) =>
  an.beatLamps?.[clip(Math.trunc(t / an.step), 0, an.nFrames - 1)] ?? 0;

/** What one hit lights of a car's half at level s: a single lamp at a hush, then the signature and DRL, from
 * a groove the inner headlight too, from drive the outer one as well, leaving the headlights the beat layer
 * owns (`own`, as owned() says) to the beat. A truck's half is its side marker and headlights (its bar is
 * drawn separately). */
export function half(car: Car, side: LR, s: number, own = 0): number[] {
  const out = car.isCt || s < CALM ? car.sig(side) : car.accents(side);
  if (s >= GROOVE) out.push(...car.inner(side));
  if (s >= DRIVE) out.push(...car.outer(side));
  return free(car, out, own);
}

/** `chs` without the headlights the beat layer owns (`own`, as owned() says). */
const free = (car: Car, chs: number[], own: number) =>
  chs.filter((ch) => !(own & 1 && car.inner().includes(ch)) && !(own & 2 && car.outer().includes(ch)));

const whole = (car: Car, s: number, own = 0) => [...half(car, 'L', s, own), ...half(car, 'R', s, own)];

const HELD_NOTE_S = 0.6, SWELL_MAX_S = 2.5;     // a note this long is held: it swells, for up to this long

/** One note's light, shaped like its sound (Tesla's ramps are the envelopes). Calm: a short note flashes
 * and fades over half a second, a pluck; a held note swells in, holds as long as it sounds (up to
 * SWELL_MAX_S) and fades over a second, a pad. From a
 * groove up, every note is struck and held for its length, at least most of the way to the next one, so the
 * light moves from lamp to lamp rather than blinking. */
export function note(car: Car, chs: number[], t: number, dur: number, s: number, next = Infinity) {
  if (s < GROOVE) {
    if (dur >= HELD_NOTE_S) {
      const end = t + Math.min(dur, SWELL_MAX_S);
      car.light(chs, t, end, ON_500);
      car.light(chs, end, end + 1.0, OFF_1000);
    } else {
      const end = t + clip(dur, 0.1, 0.2);
      car.light(chs, t, end);
      car.light(chs, end, end + 0.5, OFF_500);
    }
    return;
  }
  let hold = clip(dur, 0.1, 1.2);
  if (next < Infinity) hold = Math.max(hold, Math.min(0.8 * (next - t), 0.6));
  car.light(chs, t, t + hold);
}

// --- the bar ---------------------------------------------------------------------------------------

/** n rows of BAR values from fn(frame, led). */
function rows(n: number, fn: (f: number, k: number) => number, w = BAR): Rows {
  const out: Rows = [];
  for (let f = 0; f < n; f++) {
    const r = new Float64Array(w);
    for (let k = 0; k < w; k++) r[k] = fn(f, k);
    out.push(r);
  }
  return out;
}

const frames = (car: Car, t: number, dur: number) => Math.max(2, car.fr(t + dur) - car.fr(t));

/** A note as a comet at `pos` (0..1 along the bar), wider and brighter as the level rises (times `gain`): a
 * short note plucks and fades, a held one swells in over a third of its length and fades through the rest. */
export function comet(car: Car, t: number, pos: number, noteDur: number, s: number, gain = 1) {
  const held = noteDur >= HELD_NOTE_S;
  const dur = held ? Math.min(noteDur, SWELL_MAX_S) : clip(noteDur, 0.15, 0.5) + 0.15;
  const width = 3 + 8 * s, amp = (0.55 + 0.45 * s) * gain, n = frames(car, t, dur);
  const env = (f: number) => (held ? Math.min(1, (3 * f) / n) * (1 - f / n) ** 0.5 : (1 - f / n) ** 1.5);
  car.pixels(C.FRONT_BAR, t, rows(n, (f, k) => {
    const x = (k - pos * (BAR - 1)) / width;
    return amp * env(f) * Math.exp(-(x * x));
  }));
}

/** LEDs a..b (fractions of the bar, crowd-left first) at `level`, fading to 30 % over `dur`. */
function barSpan(car: Car, t: number, dur: number, a: number, b: number, level = 1.0) {
  const n = frames(car, t, dur), fade = linspace(1, 0.3, n);
  const lo = Math.round(a * BAR), hi = Math.round(b * BAR);
  car.pixels(C.FRONT_BAR, t, rows(n, (f, k) => (k >= lo && k < hi ? level * fade[f] : 0)));
}

/** The bar lit to `level` (0..1 per frame, or one value) from its centre outward, or from both ends in. */
function barFill(car: Car, t: number, dur: number, level: number | ArrayLike<number>, fromCentre = true) {
  const n = typeof level === 'number' ? frames(car, t, dur) : level.length;
  const d = linspace(-1, 1, BAR).map(Math.abs);
  const lv = (f: number) => (typeof level === 'number' ? level : level[f]);
  car.pixels(C.FRONT_BAR, t, rows(n, (f, k) => ((fromCentre ? d[k] : 1 - d[k]) <= lv(f) ? 1 : 0)));
}

/** The whole bar flashing to `level` and fading over `dur`. */
export function barFlash(car: Car, t: number, dur: number, level = 1.0) {
  const n = frames(car, t, dur), fade = linspace(level, 0, n);
  car.pixels(C.FRONT_BAR, t, rows(n, (f) => fade[f]));
}

/** The part of a truck's bar its half `side` stands for. */
const barHalf = (side: LR): [number, number] => (side === 'L' ? [0, 0.5] : [0.5, 1]);

/** A slot's hit: the half's lamps, and on a truck that half of its bar. */
function slotHit(car: Car, side: LR, t: number, dur: number, s: number, own = 0) {
  car.light(half(car, side, s, own), t, t + dur);
  if (car.isCt) barSpan(car, t, dur + 0.1, ...barHalf(side), 0.5 + 0.5 * s);
}

// --- time ------------------------------------------------------------------------------------------

/** The length of the tracked beat around t. */
export function beatAt(an: Analysis, t: number): number {
  const b = an.beats, nominal = beatLen(an);
  if (b.length < 2) return nominal;
  const i = clip(searchsorted(b, t, 'right'), 1, b.length - 1);
  return Math.min(b[i] - b[i - 1], 1.5 * nominal);       // across a fermata: a normal beat
}

const within = (a: ArrayLike<number>, lo: number, hi: number) => Array.from(a).filter((x) => x >= lo && x < hi);

const positions = new WeakMap<Analysis, Int32Array>();

/** Every tracked beat's place in its bar (0 the downbeat), counted from the downbeat before it. */
export function barPositions(an: Analysis): Int32Array {
  let pos = positions.get(an);
  if (pos) return pos;
  const b = an.beats, downs = new Set<number>();
  for (const x of an.downbeats) {
    const k = clip(searchsorted(b, x - 0.01), 0, Math.max(0, b.length - 1));
    if (b.length && Math.abs(b[k] - x) < 0.05) downs.add(k);
  }
  pos = new Int32Array(b.length);
  let last: number | null = null;
  for (let i = 0; i < b.length; i++) {
    if (downs.has(i)) last = i;
    pos[i] = last !== null ? (i - last) % 4 : i % 4;
  }
  positions.set(an, pos);
  return pos;
}

/** Beats at the level's pace there, counted in the bar so none is lost where the performer's beats are
 * uneven: every one from drive up, 1 and 3 in a groove, the downbeat when calm, so a calm passage swoops
 * and every-beat hitting is kept for the climbs. */
function paced(an: Analysis, beats: number[]): number[] {
  const pos = barPositions(an), b = an.beats;
  return beats.filter((t, k) => {
    const st = stepOf(levelAt(an, t)), every = st >= 3 ? 1 : st === 2 ? 2 : 4;
    const i = searchsorted(b, t - 0.01);
    return (i < b.length && Math.abs(b[i] - t) < 0.02 ? pos[i] : k) % every === 0;
  });
}

/** The beats (or downbeats) inside a phrase, thinned to the level's pace (paced). Where the tracker has
 * none, the last beat's pace carries on for at most a bar: past that the music has stopped keeping time,
 * and a grid drawn on would be a metronome of our own. */
function grid(an: Analysis, ph: Span, kind: 'beats' | 'downbeats' = 'beats'): number[] {
  let g = within(kind === 'beats' ? an.beats : an.downbeats, ph.t0 - 0.02, ph.t1);
  if (g.length < 2) {
    const prev = an.beats.filter((x) => x <= ph.t0);
    const start = prev.length ? prev[prev.length - 1] : ph.t0, beat = beatAt(an, start);
    const end = Math.min(ph.t1, Math.max(start, ph.t0) + 4 * beat);
    g = Array.from(arange(start, end, (kind === 'beats' ? 1 : 4) * beat)).filter((x) => x >= ph.t0 - 0.02);
    if (!g.length) g = [ph.t0];
  }
  return kind === 'beats' ? paced(an, g) : g;
}

const subGrids = new WeakMap<Analysis, Map<number, Float64Array>>();

/** Every 1/div beat of the tracked beats (sixteenths for div 4), following the music's own spacing. */
function subGrid(an: Analysis, div = 4): Float64Array {
  let cache = subGrids.get(an);
  if (!cache) subGrids.set(an, (cache = new Map()));
  let g = cache.get(div);
  if (g === undefined) {
    const b: ArrayLike<number> = an.beats.length >= 2 ? an.beats : arange(0, an.duration, beatLen(an));
    const gaps = diff(b), out = new Float64Array(b.length * div);
    for (let i = 0; i < b.length; i++) {
      const gap = gaps[Math.min(i, gaps.length - 1)];
      for (let j = 0; j < div; j++) out[i * div + j] = b[i] + (gap * j) / div;
    }
    cache.set(div, (g = out));
  }
  return g;
}

/** `t` on the nearest sixteenth (1/div beat) of the performer-following beat map, and from there on a note
 * played within an eighth of it (at most 40 ms): the grid bends with the tempo, the light lands on the
 * attack. */
export function snap(an: Analysis, t: number, div = 4): number {
  const g = subGrid(an, div);
  const i = clip(searchsorted(g, t), 1, g.length - 1);
  const q = t - g[i - 1] <= g[i] - t ? g[i - 1] : g[i];
  const et = an.events.t;
  if (et.length > 1) {
    const tol = Math.min(0.04, beatAt(an, q) / (2 * div));
    const j = clip(searchsorted(et, q), 1, et.length - 1);
    const near = q - et[j - 1] <= et[j] - q ? et[j - 1] : et[j];
    if (Math.abs(near - q) <= tol) return near;
  }
  return q;
}

/** `n` evenly spread steps over [t, t + span), each on the nearest sixteenth. */
const steps = (an: Analysis, t: number, span: number, n: number) =>
  Array.from({ length: n }, (_, i) => snap(an, t + (i * span) / Math.max(n, 1)));

const next = (g: number[], k: number, fallback: number) => (k + 1 < g.length ? g[k + 1] : g[k] + fallback);

/** How long a beat-locked hit holds: most of the way to the next, never under a flash. */
const holdFor = (gap: number, share = 0.85, most = 0.6) => clip(gap * share, 0.12, most);

// --- note moves -----------------------------------------------------------------------------------

type Move = (cars: Car[], an: Analysis, ph: Phrase) => void;

/** Notes across the stage like a keyboard, low on the crowd's left, with the melody along the trucks' bars.
 * Loud chords span from their lowest note's slot to their highest. */
const keyboard: Move = (cars, an, ph) => {
  const ev = an.events, ranges = localRanges(an, ph), all = slots(cars);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), own = owned(an, t), nxt = ev.t[i + 1] ?? Infinity;
    const [lo, hi] = ranges[i - ph.a];
    const top = slotFor(cars, ev.top[i], lo, hi);
    let span: [Car, LR][] = [[top[0], top[1]]];
    if (ev.kind[i] >= 2 && s >= DRIVE) {
      const low = slotFor(cars, ev.low[i], lo, hi);
      const a = all.findIndex(([c, d]) => c === low[0] && d === low[1]);
      const b = all.findIndex(([c, d]) => c === top[0] && d === top[1]);
      span = all.slice(Math.min(a, b), Math.max(a, b) + 1);
    }
    for (const [car, side] of span) {
      if (!car.isCt || s >= GROOVE) note(car, half(car, side, s, own), t, ev.dur[i], s, nxt);
    }
  }
  barMelody(cars, an, ph);
};

/** A light runs the stage note by note, through every lamp and along the bar, turning when the melody
 * turns and bouncing off the ends; at a high level each step lights the whole half it reaches. */
const relay: Move = (cars, an, ph) => {
  const ev = an.events;
  const stations: [Car, LR, number[] | number][] = [];   // a lamp, or a sixth of a truck's bar
  for (const c of cars) {
    if (c.isCt) for (let k = 0; k < 6; k++) stations.push([c, k < 3 ? 'L' : 'R', k]);
    else c.lamps().forEach((lamp, k) => stations.push([c, k < 4 ? 'L' : 'R', lamp]));
  }
  const n = stations.length;
  let dir = ph.up >= 0.5 ? 1 : -1, pos = dir > 0 ? 0 : n - 1;
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), own = owned(an, t);
    const [car, side, st] = stations[pos];
    const hold = Math.max(clip(ev.dur[i], 0.1, 0.25), 0.2 + 0.2 * s);    // a trail, longer when loud
    if (typeof st === 'number') {
      barSpan(car, t, hold + 0.1, st / 6, (st + 1) / 6, 0.6 + 0.4 * s);
      if (s >= DRIVE) car.light(half(car, side, s, own), t, t + hold);
    } else {
      car.light(s >= DRIVE ? half(car, side, s, own) : free(car, st, own), t, t + hold);
    }
    if (i + 1 < ph.b) {
      const step = Math.sign(ev.top[i + 1] - ev.top[i]);
      if (step !== 0) dir = step;
    }
    pos += dir;
    if (pos >= n || pos < 0) {
      dir = -dir;
      pos = clip(pos + 2 * dir, 0, n - 1);
    }
  }
  barMelody(cars, an, ph);
};

/** Pitch is the distance from the middle: low notes light the centre, high notes both ends at once, so a
 * rising line opens out from the middle and a falling one closes in; on the truck's bar two comets as far
 * out from its centre. */
const mirror: Move = (cars, an, ph) => {
  const ev = an.events, ranges = localRanges(an, ph), all = slots(cars), n = all.length;
  const rings = n / 2;
  const ct = centreTruck(cars);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), own = owned(an, t), p = posOf(ev.top[i], ...ranges[i - ph.a]);
    const nxt = ev.t[i + 1] ?? Infinity;
    const r = Math.min(rings - 1, Math.trunc(p * rings));          // 0: the middle pair
    for (const k of new Set([rings - 1 - r, rings + r])) {
      const [car, side] = all[k];
      if (!car.isCt || s >= GROOVE) note(car, half(car, side, s, own), t, ev.dur[i], s, nxt);
    }
    if (ct !== null) {
      for (const at of [0.5 - 0.45 * p, 0.5 + 0.45 * p]) comet(ct, t, at, ev.dur[i], s);
    }
  }
};

/** The stage's left and right halves for a stereo picture: every car's slots on the crowd's left of the
 * middle, and those on the right. */
function halves(cars: Car[]): [[Car, LR][], [Car, LR][]] {
  const all = slots(cars), n = all.length;
  return [all.slice(0, n / 2), all.slice(n / 2)];
}

/** Call and response: bar by bar the phrase passes between the left and the right half of the stage, and
 * within the half that has it each note sits where its pitch puts it. */
const antiphony: Move = (cars, an, ph) => {
  const ev = an.events, ranges = localRanges(an, ph), sidesOf = halves(cars);
  const downs = an.downbeats.filter((d) => d > ph.t0 + 0.3 && d < ph.t1);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), nxt = ev.t[i + 1] ?? Infinity;
    const turn = downs.filter((d) => d <= t + 0.02).length % 2;
    const group = sidesOf[turn], p = posOf(ev.top[i], ...ranges[i - ph.a]);
    const [car, side] = group[Math.min(group.length - 1, Math.trunc(p * group.length))];
    note(car, half(car, side, s, owned(an, t)), t, ev.dur[i], s, nxt);
  }
  barMelody(cars, an, ph);
};

/** Chords as blocks of light across the slots between their lowest and highest notes, held as long as the
 * chord; a big chord fills the stage. Quiet chords swell in and fade, loud ones are struck. */
const block: Move = (cars, an, ph) => {
  const ev = an.events, ranges = localRanges(an, ph), all = slots(cars);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), nxt = ev.t[i + 1] ?? Infinity, [lo, hi] = ranges[i - ph.a];
    const a = slotFor(cars, ev.low[i], lo, hi), b = slotFor(cars, ev.high[i], lo, hi);
    const ia = all.findIndex(([c, d]) => c === a[0] && d === a[1]);
    const ib = all.findIndex(([c, d]) => c === b[0] && d === b[1]);
    const big = ev.kind[i] === 3 || Math.abs(ib - ia) + 1 >= all.length - 1;
    const span = big ? all : all.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
    const dur = Math.max(ev.dur[i], 0.3);
    for (const [car, side] of span) {
      note(car, half(car, side, s, owned(an, t)), t, dur, s, nxt);
      if (car.isCt) barSpan(car, t, Math.min(dur, nxt - t), ...barHalf(side), 0.4 + 0.6 * s);
    }
  }
};

/** A trill shimmers: the two halves of the car where it sits flicker in turn, and from the middle level up
 * every car flickers, mirrored. */
const shimmer: Move = (cars, an, ph) => {
  const ev = an.events, [lo, hi] = phraseRange(ph);
  const mid = (ph.lo + ph.hi) / 2, [home] = slotFor(cars, mid, lo, hi);
  for (let k = 0, i = ph.a; i < ph.b; k++, i++) {
    const t = ev.t[i], s = levelAt(an, t), side: LR = k % 2 === 0 ? 'L' : 'R';
    for (const car of s >= GROOVE ? cars : [home]) {
      const sd = car.x > home.x ? (side === 'L' ? 'R' : 'L') : side;
      slotHit(car, sd, t, 0.07, s, owned(an, t));
    }
  }
};

/** The signature motif: an ornament on the middle car, the run sweeping the stage toward where it lands,
 * and the landing held there while every cabin glows. */
const motif: Move = (cars, an, ph) => {
  const ev = an.events, all = slots(cars);
  const idx = Array.from({ length: ph.b - ph.a }, (_, k) => ph.a + k);
  const landI = idx[idx.length - 1], pre = idx.slice(0, -1);
  const orn: number[] = [];
  for (let j = 0; j < pre.length; j++) {
    if (j && Math.abs(ev.top[pre[j]] - ev.top[pre[j - 1]]) > 4) break;
    orn.push(pre[j]);
  }
  const run = pre.filter((i) => !orn.includes(i));
  const mid = cars[Math.floor(cars.length / 2)];
  orn.forEach((i, k) => slotHit(mid, k % 2 === 0 ? 'L' : 'R', ev.t[i], 0.1, levelAt(an, ev.t[i])));
  const [landCar, landSide] = slotFor(cars, ev.top[landI], an.pitchLo, an.pitchHi);
  const target = all.findIndex(([c, d]) => c === landCar && d === landSide);
  const far = target >= all.length / 2 ? 0 : all.length - 1;
  const path = far < target ? all.slice(far, target + 1) : all.slice(target, far + 1).reverse();
  run.forEach((i, k) => {
    const [car, side] = path[Math.min(k, path.length - 1)];
    slotHit(car, side, ev.t[i], 0.1, Math.max(DRIVE, levelAt(an, ev.t[i])));
  });
  const t = ev.t[landI], hold = clip(ev.dur[landI], 0.4, 3.0), s = Math.max(PEAK, levelAt(an, t));
  landCar.light(half(landCar, landSide, s), t, t + hold);
  landCar.light(half(landCar, landSide, s), t + hold, t + hold + 0.8, OFF_500);
  if (landCar.isCt) barSpan(landCar, t, hold + 0.5, ...barHalf(landSide));
  for (const c of cars) c.rgb(t, t + hold, [255, 255, 255], 0.6);
};

const SWELL_WAVE_S = 0.5;     // each car further from the middle swells this much later: a slow wave out
const CHORD_S = 1.5;          // a chord struck this long after the last swells on its own

/** A held chord with no beat to hit swells: from the middle car out, each car's lamps for the level (every
 * lamp at the peak) ramp up and hold while the chord sounds; each new chord struck (among the loudest fifth
 * of the attacks) breathes out and swells in again from the middle, so a run of held chords ripples rather
 * than standing lit. The trucks' bars fill from their centres as loud as the music is. */
const swell: Move = (cars, an, ph) => {
  const mid = (cars.length - 1) / 2, ev = an.events, lv = an.level!, chords = [ph.t0];
  const strong = ph.b > ph.a ? quantiles(ev.amp.slice(ph.a, ph.b), [0.8])[0] : Infinity;
  for (let i = ph.a; i < ph.b; i++) {
    if (ev.amp[i] >= strong && ev.t[i] - chords[chords.length - 1] >= CHORD_S && ph.t1 - ev.t[i] >= CHORD_S) {
      chords.push(ev.t[i]);
    }
  }
  chords.forEach((a, k) => {
    const b = chords[k + 1] ?? ph.t1, last = k === chords.length - 1;
    for (const c of cars) {
      const t0 = a + Math.abs(c.x - mid) * SWELL_WAVE_S, t1 = last ? b : b - 0.2;
      if (t0 >= t1) continue;
      const s = levelAt(an, t0), chs = s >= PEAK ? c.everything() : whole(c, s, owned(an, t0));
      c.light(chs, t0, t1, k ? C.ON_1000 : C.ON_2000);
      c.light(chs, t1, t1 + (last ? 2.0 : 0.5), last ? C.OFF_2000 : OFF_500);
      if (!c.isCt) continue;
      const f0 = Math.trunc(t0 / an.step), n = frames(c, t0, t1 - t0), up = (k ? 1.0 : 2.0) / an.step;
      barFill(c, t0, t1 - t0, Array.from({ length: n }, (_, f) => Math.min(1, f / up) * lv[f0 + f]));
    }
  });
};

/** A big closing chord: the whole stage on for the chord. */
const cadence: Move = (cars, an, ph) => {
  const ev = an.events;
  for (let i = ph.a; i < ph.b; i++) allOn(cars, ev.t[i], clip(ev.dur[i], 0.3, 1.5));
};

/** The melody along every truck's bar: a comet at each note's pitch, faint when the music is quiet, so the
 * truck carries the tune under whatever the move does (a beat move, or a note move whose notes are on other
 * cars). */
export const barMelody: Move = (cars, an, ph) => {
  const trucks = cars.filter((c) => c.isCt), ev = an.events;
  if (!trucks.length) return;
  const ranges = localRanges(an, ph);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], s = levelAt(an, t), at = posOf(ev.top[i], ...ranges[i - ph.a]);
    for (const c of trucks) comet(c, t, at, ev.dur[i], s, 0.6 + 0.4 * s);
  }
};

// --- beat moves ------------------------------------------------------------------------------------
// Locked to the beat map: every beat from the middle level up, every second or fourth when calm (the
// phrase's pace), each hit sized by the level.

/** The units a beat move passes the light between: the cars, or a lone car's two halves. */
function units(cars: Car[]): [Car, LR | null][] {
  return cars.length > 1 ? cars.map((c) => [c, null]) : [[cars[0], 'L'], [cars[0], 'R']];
}

function unitHit(car: Car, side: LR | null, t: number, dur: number, s: number, own: number) {
  if (side) return slotHit(car, side, t, dur, s, own);
  car.light(whole(car, Math.max(s, GROOVE), own), t, t + dur);
  if (car.isCt) barFlash(car, t, dur + 0.1, 0.5 + 0.5 * s);
}

/** A light marches car to car on the beat, there and back - left, centre, right, centre - the arriving car's
 * whole front on while the one it left fades. */
const march: Move = (cars, an, ph) => {
  const u = units(cars), seq = [...u, ...u.slice(1, -1).reverse()];
  const beats = grid(an, ph);
  beats.forEach((b, k) => {
    const [car, side] = seq[k % seq.length], s = levelAt(an, b), own = owned(an, b);
    const hold = holdFor(next(beats, k, 0.5) - b, 0.9);
    unitHit(car, side, b, hold, s, own);
    car.light(side ? half(car, side, s, own) : whole(car, s, own), b + hold, b + hold + 0.5, OFF_500);
  });
};

/** Left channel, right channel: the whole left half of the stage on one beat, the right half on the next. */
const lrChannel: Move = (cars, an, ph) => {
  const sidesOf = halves(cars), beats = grid(an, ph);
  beats.forEach((b, k) => {
    const s = levelAt(an, b), hold = holdFor(next(beats, k, 0.4) - b, 0.8, 0.45);
    for (const [car, side] of sidesOf[k % 2]) slotHit(car, side, b, hold, s, owned(an, b));
  });
};

/** A checkerboard: every other car on one beat, the others on the next (a lone car's two halves), the trucks'
 * bars in blocks flipping with them. */
const checker: Move = (cars, an, ph) => {
  const u = units(cars), beats = grid(an, ph);
  beats.forEach((b, k) => {
    const s = levelAt(an, b), hold = holdFor(next(beats, k, 0.4) - b);
    u.forEach(([car, side], j) => {
      const own = owned(an, b);
      if (j % 2 === k % 2) car.light(side ? half(car, side, s, own) : whole(car, s, own), b, b + hold);
    });
    for (const car of cars.filter((c) => c.isCt)) {
      const n = frames(car, b, hold);
      car.pixels(C.FRONT_BAR, b, rows(n, (_, q) => (Math.floor(q / 10) % 2 === k % 2 ? 0.5 + 0.5 * s : 0)));
    }
  });
};

/** Tug of war: the light fills the stage slot by slot on the beat, crowd-left to right, then drains back. */
const tugOfWar: Move = (cars, an, ph) => {
  const all = slots(cars), n = all.length, beats = grid(an, ph);
  for (let k0 = 0; k0 < beats.length; k0 += 2 * n) {
    for (let j = 0; j < n && k0 + j < beats.length; j++) {
      const [car, side] = all[j], start = beats[k0 + j];
      const end = beats[Math.min(beats.length - 1, k0 + 2 * n - 1 - j)] + 0.12;
      const s = levelAt(an, start);
      car.light(half(car, side, s, owned(an, start)), start, Math.max(end, start + 0.15));
      if (car.isCt) barSpan(car, start, Math.max(end - start, 0.15), ...barHalf(side), 0.5 + 0.5 * s);
    }
  }
};

/** A searchlight two slots wide sweeps the stage over each bar, left to right and back the next. */
const beam: Move = (cars, an, ph) => {
  const all = slots(cars), n = all.length;
  grid(an, ph, 'downbeats').forEach((d, k, downs) => {
    // to the next downbeat: where the tracker missed one, the sweep slows over two bars rather than stopping
    const span = Math.min((downs[k + 1] ?? Infinity) - d, 8 * beatAt(an, d), ph.t1 - d);
    if (span < 0.4) return;
    const per = span / (n + 1), times = steps(an, d, span, n + 1);
    times.forEach((t, step) => {
      const pos = k % 2 === 0 ? step : n - step, s = levelAt(an, t);
      for (const j of [pos - 1, pos]) {
        if (j < 0 || j >= n) continue;
        const [car, side] = all[j];
        car.light(half(car, side, Math.max(s, GROOVE), owned(an, t)), t, t + per * 1.2);
        if (car.isCt) {
          const centre = side === 'L' ? 0.25 : 0.75;
          barSpan(car, t, per * 1.2, centre - 0.25, centre + 0.25, 0.6 + 0.4 * s);
        }
      }
    });
  });
};

/** Every beat the light runs in from both ends of the stage and meets in the middle, on the "and". */
const converge: Move = (cars, an, ph) => {
  const all = slots(cars), n = all.length, rings = n / 2, beats = grid(an, ph);
  beats.forEach((b, k) => {
    const s = levelAt(an, b), half8 = beatAt(an, b) / 2, end = b + holdFor(next(beats, k, 2 * half8) - b);
    for (let r = 0; r < rings; r++) {                     // r = 0: the two ends; the middle on the "and"
      const t = b + (half8 * r) / Math.max(1, rings - 1);
      for (const j of new Set([r, n - 1 - r])) ring(all[j], t, Math.max(end, t + 0.12), s, owned(an, t));
    }
    for (const car of cars.filter((c) => c.isCt)) {
      const m = frames(car, b, half8);
      barFill(car, b, half8, linspace(0, 1, m), false);
    }
  });
};

/** On the beat (at the level's pace) a ring of light leaves the middle of the stage and travels out through
 * every car to both ends. */
const shockwave: Move = (cars, an, ph) => {
  const all = slots(cars), n = all.length, rings = n / 2, beats = grid(an, ph);
  beats.forEach((d, k) => {
    const s = Math.max(levelAt(an, d), GROOVE), step = beatAt(an, d) / 8;
    const end = d + holdFor(next(beats, k, 0.5) - d);
    for (let r = 0; r < rings; r++) {                              // r = 0: the middle pair
      const t = d + r * step;
      const own = owned(an, t);
      for (const j of new Set([rings - 1 - r, rings + r])) ring(all[j], t, Math.max(end, t + 0.14), s, own);
    }
    for (const car of cars.filter((c) => c.isCt)) {
      const m = frames(car, d, 0.45);
      car.pixels(C.FRONT_BAR, d, rows(m, (f, q) => {
        const reach = clip((3 * f) / m, 0, 1), fade = clip(1.6 - (1.6 * f) / m, 0, 1);
        return Math.abs(q / (BAR - 1) - 0.5) * 2 <= reach ? fade : 0;
      }));
    }
  });
};

/** A slot of a travelling figure lit from t until `end` (most of the way to the next beat), then fading, so
 * the stage fills as the figure travels and breathes out before the next beat rather than blinking. */
function ring([car, side]: [Car, LR], t: number, end: number, s: number, own: number) {
  const chs = half(car, side, s, own);
  car.light(chs, t, end);
  car.light(chs, end, end + 0.5, OFF_500);
}

// --- flowing moves ---------------------------------------------------------------------------------
// With no beat to follow, the light glides with the melody instead of hitting.

const GLIDE_S = 0.5, SPREAD_S = 3;     // the melody's place is smoothed over this, then spread over this
const paths = new WeakMap<Analysis, Float64Array>();

/** Per frame, the melody's place on the stage, 0..1 (NaN where none sounds): the louder two thirds of the
 * notes, each placed by the range around it (localRanges), smoothed over GLIDE_S, so an arpeggio's turns
 * cancel out and the line drifts while a run keeps its way, then spread over the stage again by its own
 * range within SPREAD_S, so a quiet fugue entry still passes from end to end. */
function melodyPath(an: Analysis): Float64Array {
  let out = paths.get(an);
  if (out) return out;
  const ev = an.events, n = an.nFrames, step = an.step, pos = new Float64Array(n).fill(NaN);
  const range: [number, number][] = [];
  for (const ph of an.phrases ?? []) range.splice(ph.a, ph.b - ph.a, ...localRanges(an, ph));
  const cut = ev.amp.length ? quantiles(ev.amp, [0.35])[0] : 0;
  const kept = ev.t.flatMap((_, i) => (ev.amp[i] >= cut && range[i] ? [i] : []));
  kept.forEach((i, k) => {
    const end = Math.min(ev.t[i] + Math.max(ev.dur[i], 0.4), ev.t[kept[k + 1]] ?? Infinity);
    pos.fill(posOf(ev.top[i], ...range[i]), Math.min(n, Math.trunc(ev.t[i] / step)),
      Math.min(n, Math.trunc(end / step) + 1));
  });
  const w = Math.round(GLIDE_S / 2 / step), mean = new Float64Array(n).fill(NaN);
  let sum = 0, cnt = 0;
  for (let i = -w; i < n; i++) {             // a running mean of what sounds over the window
    const add = i + w, drop = i - w - 1;
    if (add < n && !Number.isNaN(pos[add])) [sum, cnt] = [sum + pos[add], cnt + 1];
    if (drop >= 0 && !Number.isNaN(pos[drop])) [sum, cnt] = [sum - pos[drop], cnt - 1];
    if (i >= 0 && !Number.isNaN(pos[i]) && cnt) mean[i] = sum / cnt;
  }
  const r = Math.round(SPREAD_S / step), stride = 5;
  out = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i += stride) {
    let lo = Infinity, hi = -Infinity;
    for (let j = Math.max(0, i - r); j < Math.min(n, i + r); j += stride) {
      if (!Number.isNaN(mean[j])) [lo, hi] = [Math.min(lo, mean[j]), Math.max(hi, mean[j])];
    }
    for (let f = i; f < Math.min(n, i + stride); f++) {
      if (!Number.isNaN(mean[f])) out[f] = hi - lo > 0.1 ? (mean[f] - lo) / (hi - lo) : mean[f];
    }
  }
  paths.set(an, out);
  return out;
}

/** The melody gliding across the stage on the inner beams, lit at each of `places(p)` for its place p (0..1):
 * a beam it passes lights crisply, one it rests on swells in and out; a 2025+ Model Y's bar takes it end,
 * centre, end, a truck's bar as a bright spot where it sits, with every note a comet on it. */
const flowing = (places: (p: number) => number[]): Move => (cars, an, ph) => {
  const path = melodyPath(an), step = an.step, a = Math.trunc(ph.t0 / step);
  const b = Math.min(path.length, Math.trunc(ph.t1 / step));
  const lit = new Map<string, Uint8Array>();          // per car and inner beam or bar section, the frames lit
  const spot = new Map<Car, Rows>();
  const mark = (key: string, f: number) => {
    if (!lit.has(key)) lit.set(key, new Uint8Array(b - a));
    lit.get(key)![f - a] = 1;
  };
  for (let f = a; f < b; f++) {
    if (Number.isNaN(path[f])) continue;
    for (const q of places(path[f])) {
      const [car, side, w] = slotAt(cars, q), k = cars.indexOf(car);
      mark(`${k} ${side}`, f);
      if (car.juniper) mark(`${k} ${Math.min(2, Math.floor(w * 3))}`, f);
      if (!car.isCt) continue;
      if (!spot.has(car)) spot.set(car, rows(b - a, () => 0));
      const row = spot.get(car)![f - a];
      for (let j = 0; j < BAR; j++) row[j] = Math.max(row[j], 0.9 * Math.exp(-(((j - w * (BAR - 1)) / 6) ** 2)));
    }
  }
  for (const [key, on] of lit) {
    const [k, part] = key.split(' '), car = cars[Number(k)];
    for (const [f0, f1] of runs(on)) {
      const t0 = (a + f0) * step, held = (f1 - f0) * step >= HELD_NOTE_S, t1 = (a + f1) * step + (held ? 0.25 : 0.1);
      if (part === 'L' || part === 'R') {
        car.light(car.inner(part), t0, t1, held ? C.ON_1000 : C.ON);
        car.light(car.inner(part), t1, t1 + (held ? 1 : 0.5), held ? OFF_1000 : OFF_500);
      } else {
        const [lo, hi] = [[0, 0.25], [0.25, 0.75], [0.75, 1]][Number(part)];
        barSpan(car, t0, t1 - t0, lo, hi);
      }
    }
  }
  for (const [car, r] of spot) car.pixels(C.FRONT_BAR, ph.t0, r);
  barMelody(cars, an, ph);
};

/** The melody gliding across the stage by pitch, low on the crowd's left. */
const glide = flowing((p) => [p]);

/** The melody as the distance from the middle: low notes at the centre, high ones at both ends at once. */
const bloom = flowing((p) => [0.5 - p / 2, 0.5 + p / 2]);

// --- hits ------------------------------------------------------------------------------------------

/** Every lamp of every car on at t for `hold`, then a half-second fade. */
export function allOn(cars: Car[], t: number, hold: number) {
  for (const c of cars) {
    c.light(c.everything(), t, t + hold);
    c.light(c.everything(), t + hold, t + hold + 0.6, OFF_500);
    if (c.isCt) {
      const n = frames(c, t, hold + 0.4), fade = linspace(1.6, 0, n).map((v) => clip(v, 0, 1));
      c.pixels(C.FRONT_BAR, t, rows(n, (f) => fade[f]));
      c.pixels(C.REAR_BAR, t, rows(n, (f) => fade[f], C.REAR_BAR.length));
    }
  }
}

/** Three stage-wide strobes, 100 ms on and 80 ms off, then black for a quarter of a second. */
export function lightning(cars: Car[], t: number) {
  for (const c of cars) {
    for (let k = 0; k < 3; k++) {
      const t0 = t + k * 0.18;
      c.light(c.everything(), t0, t0 + 0.1);
      if (c.isCt) barFlash(c, t0, 0.1, 1.0);
      c.set([...c.everything(), ...C.FRONT_BAR], t0 + 0.1, t0 + (k < 2 ? 0.18 : 0.45), 0);
    }
  }
}

/** Every move by its catalogue name (catalog.ts). */
export const MOVES: Record<string, Move> = {
  keyboard, relay, mirror, antiphony, block, shimmer, motif, cadence, swell,
  march, lr_channel: lrChannel, checker, tug_of_war: tugOfWar, beam, converge, shockwave, glide, bloom,
};
