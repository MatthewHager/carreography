// The move library: whole-stage choreography for one phrase at a time, seen from the front.
//
// Stage, left to right as the crowd sees it: left Model Y (two sides), Cybertruck (two headlight
// sides plus a continuous 60-LED bar), right Model Y (two sides) — six slots and a bar.
//
//   keyboard    lowest note on the left, highest on the right, one flash per note (the phrase's own
//               pitch range is stretched across the stage, so every phrase uses every car)
//   lr_notes    zigzag figuration: notes above the phrase's middle hit the right Y, below hit the
//               left Y, the truck's bar tracks the pitch
//   lr_beat     left Y / right Y alternate on the beat; notes only tick on the truck bar
//   rotation    left, centre, right, left... one car per note
//   mirror      low notes light both Ys together, high notes light the truck (symmetry)
//   out_in      a crescendo: the lit region grows from the outer corners toward the truck, which
//               pops at the end
//   in_out      the reverse: from the truck outward
//   meter       loudness: the truck bar fills from the centre with the volume, the Ys join as it rises;
//               notes tick as comets
//   pulse       slow notes: each held for its length with a soft release
//   block       chords: every slot the chord spans, held
//   all_on      a beat of black, then everything, released with a ramp
//   shimmer     trills
//   motif       the Toccata's mordent-and-run: quick notes on the truck, the run sweeps the stage,
//               the landing note holds on the car it lands on while every interior glow
//
// A line-by-line port of lightshow/moves.py: the same analysis gives the same frames.

import type { Analysis, Events, Phrase } from './analysis';
import type { Car, Side } from './car';
import * as C from './channels';
import { arange, argmin, clip, cumsum, diff, linspace, mean, median, quantile, round, searchsorted, sum } from './np';
import { pacedGrid } from './mood';
import { Rng } from './rng';

const ON = C.ON, OFF_500 = C.OFF_500, ON_500 = C.ON_500, OFF_1000 = C.OFF_1000;
const BAR = C.FRONT_BAR.length;   // 60 LEDs

type LR = 'L' | 'R';
type Rows = Float64Array[];
type Level = number | ArrayLike<number>;
/** A phrase as far as the time-grid helpers need one (the choreographer also passes stand-ins). */
type Span = Pick<Phrase, 't0' | 't1'>;

// --- Python/numpy behaviour the moves rely on ---------------------------------------------------

/** a[i] with Python's negative indexing. */
function at<T>(a: ArrayLike<T>, i: number): T {
  return a[i < 0 ? a.length + i : i];
}

/** Python's % (the sign of the divisor), also numpy's float remainder. */
function pymod(a: number, b: number): number {
  let m = a % b;
  if (m !== 0 && (b < 0) !== (m < 0)) m += b;
  return m;
}

/** np.round(x, decimals): rint(x * 10**d) / 10**d. */
function npRoundTo(x: number, d: number): number {
  const f = 10 ** d;
  return round(x * f) / f;
}

/** Python's round(x, ndigits) for a float: the correctly rounded decimal, ties to even. */
function pyRoundTo(x: number, d: number): number {
  if (!Number.isFinite(x) || Math.abs(x) >= 1e21) return x;
  const exact = Math.abs(x).toFixed(100);       // the exact binary value in decimal
  const dot = exact.indexOf('.');
  const tail = exact.slice(dot + 1 + d);
  let s = Math.abs(x).toFixed(d);                // ties round away from zero here
  if (/^50*$/.test(tail)) {
    const kept = exact.slice(0, dot + 1 + d).replace('.', '');
    const last = Number(kept[kept.length - 1]);
    if (last % 2 === 0) s = exact.slice(0, dot + (d ? 1 + d : 0));   // the even neighbour is below
  }
  const v = Number(s);
  return x < 0 ? -v : v;
}

function nps(x: number): number {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

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

/** The same row n times (np.repeat(row[None, :], n, 0)). */
function repeatRow(row: Float64Array, n: number): Rows {
  return Array.from({ length: Math.max(0, n) }, () => row);
}

/** Each frame's value across the whole bar (np.repeat(env[:, None], BAR, 1)). */
function repeatCol(env: ArrayLike<number>, w = BAR): Rows {
  return Array.from({ length: env.length }, (_, f) => new Float64Array(w).fill(env[f]));
}

function concat(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const out = new Float64Array(a.length + b.length);
  out.set(a as ArrayLike<number>, 0);
  out.set(b as ArrayLike<number>, a.length);
  return out;
}

function ones(n: number): Float64Array {
  return new Float64Array(Math.max(0, n)).fill(1);
}

function within(a: ArrayLike<number>, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] >= lo && a[i] < hi) out.push(a[i]);
  return out;
}

function every<T>(a: ArrayLike<T>, step: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < a.length; i += step) out.push(a[i]);
  return out;
}

const nEvents = (ev: Events) => ev.t.length;
const posOf = (p: number, lo: number, hi: number, top = 1) => clip((p - lo) / Math.max(hi - lo, 1e-9), 0, top);

// --- helpers -----------------------------------------------------------------------------------

/** Every (car, side) on the stage, crowd-left to right. */
export function slots6(cars: Car[]): [Car, LR][] {
  const out: [Car, LR][] = [];
  for (const c of cars) for (const s of ['L', 'R'] as const) out.push([c, s]);
  return out;
}

/** The centrepiece: the Cybertruck nearest the middle of the line (its 60-LED bar carries the
 * comets, sweeps and crescendo pops), or null if the lineup has no Cybertruck. */
export function centreTruck(cars: Car[]): Car | null {
  const trucks = cars.filter((c) => c.isCt);
  if (!trucks.length) return null;
  const mid = (cars.length - 1) / 2;
  let best: Car | null = null, bd = Infinity, bi = Infinity;
  for (const c of trucks) {
    const i = cars.indexOf(c), d = Math.abs(i - mid);
    if (d < bd || (d === bd && i < bi)) [best, bd, bi] = [c, d, i];
  }
  return best;
}

/** Every car but the centrepiece, crowd-left to right: the cars that play their 8 front lamps.
 * In the classic Model Y | Cybertruck | Model Y line these are the two Ys. */
export function sides(cars: Car[]): Car[] {
  const ct = centreTruck(cars);
  const out = cars.filter((c) => c !== ct);
  return out.length ? out : [...cars];   // a lone truck plays both parts
}

export const CENTRE_SHARE = 4 / 3;   // the centrepiece's share of the pitch range against a side car's (40% vs 30% of 3)

/** Pitch -> (car, side, position along a truck's bar or null): low notes on the crowd's left, high on
 * the right; the centrepiece truck's bar takes a wider share so runs sweep across it. */
export function slotFor(cars: Car[], pitch: number, lo: number, hi: number): [Car, LR, number | null] {
  const pos = clip((pitch - lo) / Math.max(hi - lo, 1e-9), 0, 1);
  const ct = centreTruck(cars);
  const widths = cars.map((c) => (c === ct ? CENTRE_SHARE : 1.0));
  const total = sum(widths);
  const cs = cumsum(widths);
  const edges = [0.0, ...Array.from(cs, (v) => v / total)];
  const idx = Math.min(cars.length - 1, searchsorted(edges, pos, 'right') - 1);
  const w = (pos - at(edges, idx)) / (at(edges, idx + 1) - at(edges, idx));
  const car = at(cars, idx);
  return [car, w < 0.5 ? 'L' : 'R', car.isCt ? w : null];   // any truck plays its bar
}

export function comet(car: Car, t: number, pos: number, dur: number, amp = 1.0, width = 6) {
  const n = Math.max(2, car.fr(t + dur) - car.fr(t));
  const shape = new Float64Array(BAR);
  for (let k = 0; k < BAR; k++) {
    const x = (k - pos * (BAR - 1)) / width;
    shape[k] = Math.exp(-(x * x));
  }
  const lin = linspace(1, 0, n);
  car.pixels(C.FRONT_BAR, t, rows(n, (f, k) => (amp * lin[f] ** 1.5) * shape[k]));
}

/** Light `level` (0..1) of the bar, growing from the centre (or from both edges inward). */
export function barFill(car: Car, t: number, dur: number, level: Level, fromCentre = true,
  env: ArrayLike<number> | null = null) {
  let n = Math.max(1, car.fr(t + dur) - car.fr(t));
  const scalar = typeof level === 'number';
  if (!scalar) n = Math.min(n, level.length);
  const d = linspace(-1, 1, BAR).map(Math.abs);   // 0 centre .. 1 edge
  const lv = (f: number) => (scalar ? level : level[f]);
  car.pixels(C.FRONT_BAR, t, rows(n, (f, k) => {
    const m = fromCentre ? d[k] <= lv(f) : 1 - d[k] <= lv(f);
    const e = env === null ? 1 : env[f];
    return m ? e : 0;
  }));
}

export function barFlash(car: Car, t: number, dur: number, level = 1.0) {
  const n = Math.max(2, car.fr(t + dur) - car.fr(t));
  car.pixels(C.FRONT_BAR, t, repeatCol(linspace(level, 0, n)));
}

/** Mirror a side for the car on the crowd's right, so "L" means *outer* on both outer cars.
 * Used wherever a side is picked by rhythm or alternation rather than by pitch position; the
 * stage-wide sweeps (keyboard, wave, motif) keep true left-to-right order. */
export function msd(car: Car, side: LR, cars: Car[] | null = null): LR {
  let centre = 1.0;
  if (cars !== null) {
    let s = 0;
    for (const c of cars) s += c.x;
    centre = s / cars.length;
  }
  if (car.x > centre) return side === 'L' ? 'R' : 'L';
  return side;
}

/** One slot flash: accents (Y) / side marker + headlight side (truck). */
export function hit(car: Car, side: Side, t: number, dur: number, heads = true, value = ON) {
  const chs = [...car.accents(side), ...(heads || car.isCt ? car.heads(side) : [])];
  car.light(chs, t, t + dur, value);
}

export function flashLen(ev: Events, i: number, fastCut = 9.0): number {
  const d = ev.dur[i];
  return ev.density[i] >= fastCut ? 0.08 : clip(d, 0.1, 0.2);
}

/** Pitch bounds used to spread this phrase across the stage. */
export function phraseRange(ph: Pick<Phrase, 'lo' | 'hi'>, _an?: Analysis): [number, number] {
  if (ph.hi - ph.lo >= 12) return [ph.lo, ph.hi];
  const mid = (ph.lo + ph.hi) / 2;
  return [mid - 6, mid + 6];
}

// --- moves -------------------------------------------------------------------------------------

export function keyboard(cars: Car[], an: Analysis, ph: Phrase, heads = false) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const voices = ev.kind[i] === 0 ? [ev.top[i]] : [ev.top[i], ev.low[i]];
    for (const p of voices) {
      const [car, side, w] = slotFor(cars, p, lo, hi);
      if (car.isCt) {
        comet(car, t, w as number, d + 0.15, 0.7 + 0.3 * ev.amp[i]);
        car.flash(car.heads(side), t, d);
      } else {
        hit(car, side, t, d, heads);
      }
    }
  }
}

export function lrNotes(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const outer = sides(cars);
  const med = median(ev.top.slice(ph.a, ph.b));
  const [lo, hi] = phraseRange(ph, an);
  // In band songs a note only strobes a Y when it sits on a beat subdivision (eighths); the rest
  // ride on the truck's bar, so the sides read as rhythm, not as blinking.
  const band = an.driver === 'band' || an.driver === 'vocal_band';
  let sub: Float64Array | null = null;
  if (band && an.beats.length > 2) {
    const b = an.beats;
    const mids: number[] = [];
    for (let k = 0; k + 1 < b.length; k++) mids.push((b[k] + b[k + 1]) / 2);
    sub = Float64Array.from([...b, ...mids]).sort();
  }
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const high = ev.top[i] >= med;
    const car = high ? at(outer, -1) : outer[0];
    const side = msd(car, (i - ph.a) % 2 === 0 ? 'L' : 'R', cars);
    let onGrid = sub === null;
    if (sub !== null) {
      let m = Infinity;
      for (const s of sub) m = Math.min(m, Math.abs(s - t));
      onGrid = m < 0.07;
    }
    if (onGrid) hit(car, side, t, d, true);
    if (ct !== null) comet(ct, t, posOf(ev.top[i], lo, hi), d + 0.12, 0.8);
  }
}

export function lrBeat(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const outer = sides(cars);
  const beats = within(an.beats, ph.t0 - 0.05, ph.t1);
  const downs = new Set(an.downbeats.map((d) => npRoundTo(d, 3)));
  beats.forEach((b, k) => {
    const car = outer[k % outer.length];
    hit(car, 'L', b, 0.14, true);
    hit(car, 'R', b, 0.14, true);
    if (downs.has(pyRoundTo(b, 3)) && ct !== null) barFlash(ct, b, 0.3);
  });
  const [lo, hi] = phraseRange(ph, an);
  if (ct !== null) {
    for (let i = ph.a; i < ph.b; i++) comet(ct, ev.t[i], posOf(ev.top[i], lo, hi), 0.2, 0.7);
  }
}

export function rotation(cars: Car[], an: Analysis, ph: Phrase, order: number[] | null = null) {
  const ev = an.events;
  const ord = order && order.length ? order : cars.map((_, i) => i);
  for (let k = 0, i = ph.a; i < ph.b; k++, i++) {
    const car = at(cars, ord[k % ord.length]);
    const t = ev.t[i], d = flashLen(ev, i);
    const side = msd(car, k % 2 === 0 ? 'L' : 'R', cars);
    hit(car, side, t, d, true);
    if (car.isCt) comet(car, t, side === 'L' ? 0.3 : 0.7, d + 0.15);
  }
}

export function mirror(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const outer = sides(cars);
  const med = median(ev.top.slice(ph.a, ph.b));
  for (let k = 0, i = ph.a; i < ph.b; k++, i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    if (ev.top[i] >= med && ct !== null) {
      const side = k % 2 === 0 ? 'L' : 'R';
      ct.flash(ct.heads(side), t, d);
      comet(ct, t, side === 'L' ? 0.3 : 0.7, d + 0.15);
    } else {
      // Mirrored: left Y's outer side with right Y's outer side, then the inner pair.
      const inner = k % 2 === 1;
      const cx = ct ? ct.x : 1;
      for (const c of outer) {
        const side = inner ? (c.x < cx ? 'R' : 'L') : (c.x < cx ? 'L' : 'R');
        hit(c, side, t, d, false);
      }
    }
  }
}

/** A crescendo: participation grows from the Ys' outer corners inward to the truck. Every note
 * ticks (short flashes) in whatever part of the stage is active; the truck bar fills toward the
 * centre; the truck's headlights join only in the last stage; a beat of black, then the pop. */
export function outIn(cars: Car[], an: Analysis, ph: Phrase, reverse = false) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const f0 = Math.trunc(ph.t0 / an.step), f1 = Math.max(Math.trunc(ph.t0 / an.step) + 1, Math.trunc(ph.t1 / an.step));
  const e = an.intensity.slice(f0, f1);
  const L = e.length;
  const rising = L > 10 && mean(e, L - Math.ceil(L / 4), L) > mean(e, 0, Math.floor(L / 4)) * 1.15;
  const span = Math.max(ph.t1 - ph.t0, 0.5);
  // Stage k lights these (car, lamp-list) groups per note.
  let stages: [Car, number[]][][] = [];
  for (let k = 0; k < 4; k++) {
    const groups: [Car, number[]][] = [];
    for (const c of ys) {
      const outer: LR = c.x < (ct ? ct.x : 1) ? 'L' : 'R';
      const inner: LR = outer === 'L' ? 'R' : 'L';
      if (k >= 0) groups.push([c, [...c.sig(outer), ...c.drl(outer)]]);
      if (k >= 1) groups.push([c, [...c.sig(inner), ...c.drl(inner)]]);
      if (k >= 2) groups.push([c, c.heads(outer)]);
      if (k >= 3) groups.push([c, c.heads(inner)]);
    }
    stages.push(groups);
  }
  if (reverse) stages = stages.reverse();
  if (ct !== null) {
    // The bar fills a step per note (stairs, not a ramp), each new step flaring then settling,
    // so the growth is felt as the music drives it.
    const n = f1 - f0;
    const count = Math.max(1, ph.b - ph.a);
    const level = new Float64Array(n);
    const flare = new Float64Array(n);
    for (let j = 0, i = ph.a; i < ph.b; j++, i++) {
      const k = Math.max(0, Math.min(n - 1, Math.trunc((ev.t[i] - ph.t0) / an.step)));
      level.fill((j + 1) / count, k);
      const ramp = linspace(1, 0, Math.min(6, n - k));
      for (let q = 0; q < ramp.length; q++) flare[k + q] = Math.max(flare[k + q], ramp[q]);
    }
    const lv = level.map((v) => (reverse ? 1 - v : v) * 0.9);
    barFill(ct, ph.t0, span, lv, reverse, flare.map((v) => 0.55 + 0.45 * v));
  }
  for (let j = 0, i = ph.a; i < ph.b; j++, i++) {
    const t = ev.t[i];
    const k = Math.min(3, Math.trunc(((t - ph.t0) / span) * 4));
    const groups = at(stages, k);
    const [car, chs] = groups[j % groups.length];
    car.light(chs, t, t + 0.08);
    if (ct !== null) {
      const pos = posOf(ev.top[i], lo, hi);
      comet(ct, t, pos, 0.15, 0.4 + 0.2 * k);
      if (k >= 3) ct.flash(ct.heads(pos < 0.5 ? 'L' : 'R'), t, 0.08);
    }
  }
  // The swell: from 60% through, the Ys' inner beams ramp up over 2 s; from 80%, the outer
  // beams too, so the build gets physically brighter on the way up.
  for (const c of ys) {
    c.light(c.inner(), ph.t0 + 0.6 * span, ph.t1, C.ON_2000);
    c.light(c.outer(), ph.t0 + 0.8 * span, ph.t1, C.ON_2000);
  }
  land(cars, an, ph, ct, rising || landsOnHold(an, ph));
}

export function landsOnHold(an: Analysis, ph: Phrase): boolean {
  const ev = an.events;
  return at(ev.dur, ph.b - 1) >= 0.8 || (ph.b < nEvents(ev) && ev.kind[ph.b] >= 2 && ev.t[ph.b] - ph.t1 < 0.6);
}

/** The top of a build: a beat of black, the pop, and if the music lands on a held chord,
 * everything stays on for the chord and releases with it. */
export function land(cars: Car[], an: Analysis, ph: Phrase, ct: Car | null, pop: boolean) {
  if (!pop) return;
  const ev = an.events;
  const last = at(ev.dur, ph.b - 1);
  const hold = Math.min(2.5, Math.max(0.35, last >= 0.8 ? last : 0.35));
  for (const c of cars) {
    c.set(c.everything(), ph.t1 - 0.16, ph.t1, 0);
    c.set(C.FRONT_BAR, ph.t1 - 0.16, ph.t1, 0);
    c.light(c.everything(), ph.t1, ph.t1 + hold);
    c.light(c.everything(), ph.t1 + hold, ph.t1 + hold + 0.8, OFF_500);
    c.rgb(ph.t1, ph.t1 + hold, [255, 255, 255], 0.8);
  }
  if (ct !== null) {
    const n = Math.max(2, ct.fr(ph.t1 + hold + 0.5) - ct.fr(ph.t1));
    const env = concat(ones(Math.max(1, n - 25)), linspace(1, 0, Math.min(n, 25))).slice(0, n);
    ct.pixels(C.FRONT_BAR, ph.t1, repeatCol(env));
  }
}

/** an.loud_fast over the phrase, stretched to 0..1 (or a flat 0.5 when it barely moves). */
function loudness(an: Analysis, ph: Phrase): Float64Array {
  const f0 = Math.trunc(ph.t0 / an.step), f1 = Math.max(Math.trunc(ph.t0 / an.step) + 1, Math.trunc(ph.t1 / an.step));
  const e = Float64Array.from(an.loudFast.slice(f0, f1));
  let lo = Infinity, hi = -Infinity;
  for (const v of e) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const ptp = hi - lo;
  return ptp > 0.05 ? e.map((v) => (v - lo) / Math.max(ptp, 1e-6)) : e.fill(0.5);
}

export function meter(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const e = loudness(an, ph);         // fast loudness: the bar breathes with every note and swell
  if (ct !== null) barFill(ct, ph.t0, ph.t1 - ph.t0, e.map((v) => 0.2 + 0.75 * v), true);
  const outer = sides(cars);
  // The Ys answer the volume on each beat: inner sides above 0.45, the whole front above 0.75.
  for (const b of within(an.beats, ph.t0, ph.t1)) {
    const lvl = e[Math.min(e.length - 1, Math.trunc((b - ph.t0) / an.step))];
    for (const c of outer) {
      const inner: LR = c.x < (ct ? ct.x : 1) ? 'R' : 'L';
      const outerSide: LR = inner === 'R' ? 'L' : 'R';
      if (lvl > 0.45) c.flash(c.accents(inner), b, 0.12 + 0.2 * lvl);
      if (lvl > 0.75) c.flash([...c.accents(outerSide), ...c.heads()], b, 0.12 + 0.2 * lvl);
    }
  }
  // Every note still ticks: a comet on the bar, and a short keyboard tick on the Ys' accents,
  // so the Ys read the melody while the truck reads the volume.
  const [lo, hi] = phraseRange(ph, an);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i];
    const [car, side, w] = slotFor(cars, ev.top[i], lo, hi);
    if (car.isCt) {
      if (ct !== null) comet(ct, t, w !== null ? w : 0.5, 0.2, 0.9);
    } else {
      car.flash(car.accents(side), t, 0.08);
    }
  }
}

export function pulse(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = clip(ev.dur[i], 0.15, 1.5);
    const [car, side, w] = slotFor(cars, ev.top[i], lo, hi);
    car.light(car.accents(side), t, t + d);
    car.light(car.accents(side), t + d, t + d + 0.6, OFF_500);
    if (car.isCt) {
      comet(car, t, w !== null ? w : 0.5, d + 0.3, 1.0, 9);
      car.light(car.heads(side), t, t + d, ON_500);
      car.light(car.heads(side), t + d, t + d + 0.6, OFF_500);
    }
  }
}

export function block(cars: Car[], an: Analysis, ph: Phrase, beatLen: number) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  const ct = centreTruck(cars);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], dur = ev.dur[i];
    const hold = clip(dur, 0.15, Math.max(0.3, 2 * beatLen));
    const a = slotFor(cars, ev.low[i], lo, hi);
    const b = slotFor(cars, ev.high[i], lo, hi);
    const order = slots6(cars);
    const ia = order.findIndex(([c, s]) => c === a[0] && s === a[1]);
    const ib = order.findIndex(([c, s]) => c === b[0] && s === b[1]);
    let span = order.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
    const big = ev.kind[i] === 3 || span.length >= 5;
    if (big) span = order;
    for (const [car, side] of span) {
      car.light(car.accents(side), t, t + hold);
      if (big) car.flash(car.heads(side), t, 0.12);
      if (hold > 0.8) car.light(car.accents(side), t + hold, t + hold + 0.6, OFF_500);
    }
    if (ct !== null && span.some(([c]) => c.isCt)) {
      let w0 = a[0] === ct ? (a[2] as number) : (a[0].x < ct.x ? 0.0 : 1.0);
      let w1 = b[0] === ct ? (b[2] as number) : (b[0].x < ct.x ? 0.0 : 1.0);
      if (big) [w0, w1] = [0.0, 1.0];
      const n = Math.max(2, ct.fr(t + hold) - ct.fr(t));
      const leds = linspace(0, 1, BAR);
      const lo2 = Math.min(w0, w1) - 0.04, hi2 = Math.max(w0, w1) + 0.04, v = 0.5 + 0.5 * ev.amp[i];
      const mask = leds.map((x) => (x >= lo2 && x <= hi2 ? 1 : 0) * v);
      const env = ones(n);
      if (hold > 0.8) env.set(linspace(1, 0, Math.min(15, n)), Math.max(0, n - 15));
      ct.pixels(C.FRONT_BAR, t, rows(n, (f, k) => env[f] * mask[k]));
    }
  }
}

export function allOn(cars: Car[], t: number, hold: number, blackout = true) {
  for (const c of cars) {
    if (blackout) {
      c.set(c.everything(), t - 0.16, t, 0);
      c.set([...C.FRONT_BAR, ...C.REAR_BAR], t - 0.16, t, 0);
    }
    c.light(c.everything(), t, t + hold);
    c.light(c.everything(), t + hold, t + hold + 0.6, OFF_500);
    if (c.isCt) {
      const n = c.fr(t + hold + 0.4) - c.fr(t);
      const env = concat(ones(Math.max(1, n - 20)), linspace(1, 0, Math.min(n, 20))).slice(0, Math.max(0, n));
      c.pixels(C.FRONT_BAR, t, repeatCol(env));
      c.pixels(C.REAR_BAR, t, repeatCol(env, C.REAR_BAR.length));
    }
  }
}

export function cadence(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  for (let i = ph.a; i < ph.b; i++) allOn(cars, ev.t[i], clip(ev.dur[i], 0.3, 1.5), i === ph.a);
}

export function shimmer(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const [car] = slotFor(cars, median(ev.top.slice(ph.a, ph.b)), an.pitchLo, an.pitchHi);
  for (let k = 0, i = ph.a; i < ph.b; k++, i++) {
    const t = ev.t[i];
    const side = k % 2 === 0 ? 'L' : 'R';
    car.flash([...car.accents(side), ...car.turns(side).slice(0, 1)], t, 0.07);
    if (ct !== null) {
      const n = Math.max(1, ct.fr(t + 0.1) - ct.fr(t));
      const sparkle = new Rng(k).randoms(BAR).map((r) => (r < 0.25 ? 1 : 0));
      ct.pixels(C.FRONT_BAR, t, repeatRow(sparkle, n));
    }
  }
}

/** Mordent-and-run: quick ornament on the truck, the run sweeps the stage toward where it
 * lands, and the landing note holds on that car while every interior glow. */
export function motif(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ct = centreTruck(cars);
  const idx: number[] = [];
  for (let i = ph.a; i < ph.b; i++) idx.push(i);
  const landI = at(idx, -1);
  const pre = idx.slice(0, -1);
  // Ornament: the first notes before any wide leap.
  const orn: number[] = [];
  for (let j = 0; j < pre.length; j++) {
    const i = pre[j];
    if (j && Math.abs(ev.top[i] - ev.top[pre[j - 1]]) > 4) break;
    orn.push(i);
  }
  const run = pre.filter((i) => !orn.includes(i));
  orn.forEach((i, k) => {
    const t = ev.t[i];
    if (ct !== null) {
      const side = k % 2 === 0 ? 'L' : 'R';
      ct.flash(ct.heads(side), t, 0.1);
      comet(ct, t, side === 'L' ? 0.35 : 0.65, 0.25);
    } else {
      const mid = cars[Math.floor(cars.length / 2)];
      mid.flash(mid.heads(), t, 0.1);
    }
  });
  const [landCar, landSide, w] = slotFor(cars, at(ev.top, landI), an.pitchLo, an.pitchHi);
  // Sweep: slots in order from the far side of the stage to the landing slot.
  const order = slots6(cars);
  const target = order.findIndex(([c, s]) => c === landCar && s === landSide);
  const far = target >= order.length / 2 ? 0 : order.length - 1;
  const path: [Car, LR][] = [];
  if (far < target) for (let q = far; q <= target; q++) path.push(order[q]);
  else for (let q = far; q >= target; q--) path.push(order[q]);
  run.forEach((i, k) => {
    const [car, side] = path.length ? path[Math.min(k, path.length - 1)] : [landCar, landSide];
    const t = ev.t[i];
    hit(car, side, t, 0.1, true);
    if (ct !== null && car !== ct) comet(ct, t, 0.5, 0.15, 0.5, 12);
  });
  const t = at(ev.t, landI), hold = clip(at(ev.dur, landI), 0.4, 3.0);
  landCar.light([...landCar.accents(landSide), ...landCar.heads(landSide)], t, t + hold);
  landCar.light([...landCar.accents(landSide), ...landCar.heads(landSide)], t + hold, t + hold + 0.8, OFF_500);
  // the comet goes on the centrepiece even when another truck is the one landed on
  if (landCar.isCt) comet(ct as Car, t, w !== null ? w : 0.5, hold + 0.5, 1.0, 10);
  for (const c of cars) c.rgb(t, t + hold, [255, 255, 255], 0.6);
}

// --- Model Y moves (the sides) ------------------------------------------------------------------
// A Model Y's front has 8 separately drivable lamps, left to right: signature strip, DRL segments,
// outer beam, inner beam, then the mirror image. Across two Ys that is a 16-lamp line with the
// truck in the middle. Signature, DRL and inner beams can ramp (500/1000/2000 ms), the rest snap.

/** All Y lamps left to right across the stage: [(car, channels), ...]. */
export function yLine(ys: Car[]): [Car, number[]][] {
  const out: [Car, number[]][] = [];
  for (const c of ys) for (const lp of c.lamps()) out.push([c, lp]);
  return out;
}

/** Keyboard on the sides only, pitch spread over the 16 Y lamps. `weight` sets how much of
 * the car each note lights: 0 one lamp, 1 the signature + DRL of that side, 2 the whole half-car
 * (so a note reads from the crowd in a loud section). */
export function yKeyboard(ys: Car[], an: Analysis, ph: Phrase, weight = 1) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  const line = yLine(ys);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const pos = posOf(ev.top[i], lo, hi, 0.999);
    let [car, chs] = line[Math.trunc(pos * line.length)];
    if (weight >= 1) {
      const side = Math.trunc(pos * line.length) % 8 < 4 ? 'L' : 'R';
      chs = [...car.sig(side), ...car.drl(side), ...(weight >= 2 ? car.heads(side) : [])];
    }
    car.light(chs, t, t + d);
  }
}

/** On every beat a ripple runs through each Y's lamps, mirrored on the two cars: inward
 * (toward the truck) or outward. The ripple spans half a beat, so it starts on the beat and
 * finishes on the "and" whatever the tempo. */
export function yRipple(ys: Car[], an: Analysis, ph: Phrase, inward = true) {
  for (const b of within(an.beats, ph.t0, ph.t1)) {
    const lampDt = beatAt(an, b) / 2 / 8;
    for (const c of ys) {
      const lamps = c.lamps();
      const leftCar = ys.length === 2 ? c.x < 1.0 : c.x < mean(ys.map((y) => y.x));
      const seq = inward === leftCar ? lamps : [...lamps].reverse();
      seq.forEach((chs, k) => c.light(chs, b + lampDt * k, b + lampDt * k + 0.1));
    }
  }
}

/** Slow mirrored swells on the ramping lamps (signature + DRL), the two Ys in antiphase. */
export function yBreathe(ys: Car[], an: Analysis, ph: Phrase, period: number | null = null) {
  const p = period || Math.max(2.0, (4 * 60.0) / Math.max(an.tempo, 40));
  const [onV, offV] = p < 3.0 ? [ON_500, OFF_500] : [C.ON_1000, OFF_1000];
  ys.forEach((c, k) => {
    let t = ph.t0 + (k % 2 ? p / 2 : 0);
    while (t < ph.t1 - 0.3) {
      const mid = Math.min(t + p / 2, ph.t1), stop = Math.min(t + p, ph.t1);
      c.light([...c.sig(), ...c.drl()], t, mid, onV);
      c.light([...c.sig(), ...c.drl()], mid, stop, offV);
      t += p;
    }
  });
}

/** Amber turn signals tick on the off-beats (mirrored on the two cars) under a keyboard of
 * the melody on the signature and DRL lamps. */
export function yTurnTicks(ys: Car[], an: Analysis, ph: Phrase) {
  yKeyboard(ys, an, ph, 1);
  const beats = within(an.beats, ph.t0, ph.t1);
  for (let k = 0; k < beats.length - 1; k++) {
    const half = (beats[k] + beats[k + 1]) / 2;
    for (const c of ys) {
      const side = msd(c, k % 2 === 0 ? 'L' : 'R', ys);
      c.flash(c.turns(side).slice(0, 1), half, 0.08);
    }
  }
}

/** Low-mounted fog lights thump on low notes. */
export function yBassFogs(ys: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  for (let i = ph.a; i < ph.b; i++) {
    if (ev.low[i] <= 48 && ev.kind[i] <= 1) for (const c of ys) c.flash(c.fogs(), ev.t[i], 0.1);
  }
}

/** Chords on the sides: the lamps spanned by the chord, held; big chords take all 16. */
export function yChords(ys: Car[], an: Analysis, ph: Phrase, beatLen: number) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  const line = yLine(ys);
  const n = line.length;
  for (let i = ph.a; i < ph.b; i++) {
    if (ev.kind[i] === 0) {
      const pos = posOf(ev.top[i], lo, hi, 0.999);
      const [car, chs] = line[Math.trunc(pos * n)];
      car.flash(chs, ev.t[i], flashLen(ev, i));
      continue;
    }
    const t = ev.t[i], hold = clip(ev.dur[i], 0.15, 2 * beatLen);
    const p0 = posOf(ev.low[i], lo, hi, 0.999);
    const p1 = posOf(ev.high[i], lo, hi, 0.999);
    let a = Math.min(Math.trunc(p0 * n), Math.trunc(p1 * n)), b = Math.max(Math.trunc(p0 * n), Math.trunc(p1 * n));
    if (ev.kind[i] === 3) [a, b] = [0, n - 1];
    for (const [car, chs] of line.slice(a, b + 1)) car.light(chs, t, t + hold);
  }
}

// --- Cybertruck moves (the centre) --------------------------------------------------------------

/** A comet scanning the bar over n frames: Gaussian blobs of the given width along `centre`. */
function sweep(centre: ArrayLike<number>, width: number, scale = 1): Rows {
  return rows(centre.length, (f, k) => {
    const x = (k - centre[f]) / width;
    return scale === 1 ? Math.exp(-(x * x)) : scale * Math.exp(-(x * x));
  });
}

/** A comet scans the bar left to right on one beat and back on the next (tempo-locked). */
export function ctScan(ct: Car, an: Analysis, ph: Phrase) {
  const beats = within(an.beats, ph.t0, ph.t1 + 0.5);
  for (let k = 0; k < beats.length - 1; k++) {
    const b0 = beats[k], b1 = Math.min(beats[k + 1], ph.t1);
    const n = Math.max(2, ct.fr(b1) - ct.fr(b0));
    const centre = k % 2 === 0 ? linspace(0, BAR - 1, n) : linspace(BAR - 1, 0, n);
    ct.pixels(C.FRONT_BAR, b0, sweep(centre, 4));
  }
}

/** Each beat: the bar fills from both edges to the centre and fades, like a breath in. */
export function ctEdgePulse(ct: Car, an: Analysis, ph: Phrase) {
  for (const b of within(an.beats, ph.t0, ph.t1)) {
    const dur = Math.min(0.4, Math.max(0.2, (60.0 / Math.max(an.tempo, 40)) * 0.8));
    const n = Math.max(2, ct.fr(b + dur) - ct.fr(b));
    barFill(ct, b, dur, linspace(0, 1, n), false, linspace(1, 0.3, n));
  }
}

/** The truck's ramping lights breathe slowly: outer beams swell over 2 s, the bar follows. */
export function ctSwell(ct: Car, _an: Analysis, ph: Phrase) {
  const period = Math.max(3.0, Math.min(8.0, ph.t1 - ph.t0));
  let t = ph.t0;
  while (t < ph.t1 - 0.5) {
    const mid = Math.min(t + period / 2, ph.t1), stop = Math.min(t + period, ph.t1);
    ct.light([...ct.outer(), ...ct.sig()], t, mid, C.ON_2000);
    ct.light([...ct.outer(), ...ct.sig()], mid, stop, C.OFF_2000);
    const n = Math.max(2, ct.fr(stop) - ct.fr(t));
    const env = linspace(0, Math.PI, n).map((x) => Math.sin(x) * Math.sin(x));
    barFill(ct, t, stop - t, env.map((v) => 0.1 + 0.9 * v), true);
    t += period;
  }
}

/** Every note as a comet at its pitch position on the bar; headlights only on strong notes. */
export function ctComets(ct: Car, an: Analysis, ph: Phrase) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  const q = quantile(ev.amp, 0.8);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i];
    const pos = posOf(ev.top[i], lo, hi);
    comet(ct, t, pos, 0.18 + 0.15 * ev.amp[i], 0.7 + 0.3 * ev.amp[i]);
    if (ev.amp[i] >= q) ct.flash(ct.heads(pos < 0.5 ? 'L' : 'R'), t, 0.1);
  }
}

export function ctMeter(ct: Car, an: Analysis, ph: Phrase) {
  const e = loudness(an, ph);
  barFill(ct, ph.t0, ph.t1 - ph.t0, e.map((v) => 0.2 + 0.75 * v), true);
}

// --- More all-car moves -------------------------------------------------------------------------

/** Once per bar a single light travels the whole stage: through the left Y's 8 lamps, across
 * the truck bar as a comet, through the right Y's lamps; direction alternates each bar. */
export function wave(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const downs = within(an.downbeats, ph.t0, ph.t1);
  const bar = (4 * 60.0) / Math.max(an.tempo, 40);
  downs.forEach((d, k) => {
    const span = Math.min(bar, ph.t1 - d);
    let stations: ([Car, number[]] | null)[] = [];
    for (const c of ys.slice(0, 1)) for (const lp of c.lamps()) stations.push([c, lp]);
    stations.push(null);  // the truck bar
    for (const c of ys.slice(1)) for (const lp of c.lamps()) stations.push([c, lp]);
    if (k % 2) stations = stations.reverse();
    const per = span / stations.length;
    const times = qSteps(an, d, span, stations.length);
    stations.forEach((st, j) => {
      const t = times[j];
      if (st === null) {
        if (ct !== null) {
          const n = Math.max(2, ct.fr(t + per * 2) - ct.fr(t));
          const centre = k % 2 === 0 ? linspace(0, BAR - 1, n) : linspace(BAR - 1, 0, n);
          ct.pixels(C.FRONT_BAR, t, sweep(centre, 4));
        }
      } else {
        st[0].light(st[1], t, t + Math.max(0.1, per * 1.5));
      }
    });
  });
}

/** Every beat: both Ys ripple inward, then the truck bar closes from the edges to the centre. */
export function converge(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  yRipple(ys, an, ph, true);
  if (ct !== null) {
    const half = 30.0 / Math.max(an.tempo, 40);               // the "and" of the beat
    for (const b of within(an.beats, ph.t0, ph.t1)) {
      const n = Math.max(2, ct.fr(b + half) - ct.fr(b + half / 2));
      barFill(ct, b + half / 2, half / 2, linspace(0, 1, n), false);
      ct.flash(ct.heads(), b + half, 0.1);
    }
  }
}

/** Two quick pulses per bar on every car's headlights, with the truck bar thumping; the
 * ominous move for slow, dark passages. */
export function heartbeat(cars: Car[], an: Analysis, ph: Phrase) {
  for (const d of grid(an, ph, 'downbeats')) {
    for (const dt of [0.0, beatAt(an, d) / 4]) {
      for (const c of cars) {
        c.flash(c.heads(), d + dt, 0.1);
        if (c.isCt) barFlash(c, d + dt, 0.25, 0.9);
      }
    }
  }
}

/** The sides play the first half of the phrase, the truck answers with the second half. */
export function callResponse(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const mid = ph.a + Math.floor((ph.b - ph.a) / 2);
  // a view of the phrase restricted to one half
  const half = (a: number, b: number): Phrase => ({
    ...ph, a, b, t0: at(ev.t, a), t1: at(ev.t, b - 1) + Math.min(at(ev.dur, b - 1), 2.0), lo: ph.lo, hi: ph.hi,
  });
  const h1 = half(ph.a, mid), h2 = half(mid, ph.b);
  yKeyboard(ys, an, h1);
  if (ct !== null) ctComets(ct, an, h2);
  else keyboard(cars, an, h2);
}

// --- Round three: showing off the cars' sync -----------------------------------------------

/** A stop on the stage's line of lights: a car's lamp, or segment k of the truck's bar. */
export type Station = { car: Car; chs: number[] } | { bar: number };

/** Every light on the stage in crowd order: left Y lamps, the truck bar (as a token), right Y
 * lamps. Returns [stations, ct] where the bar is split into 6 segments. */
export function stations(cars: Car[]): [Station[], Car | null] {
  const out: Station[] = [];
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const left = ys.filter((c) => ct === null || c.x < ct.x);
  for (const c of left) for (const lp of c.lamps()) out.push({ car: c, chs: lp });
  if (ct !== null) for (let k = 0; k < 6; k++) out.push({ bar: k });
  for (const c of ys) if (!left.includes(c)) for (const lp of c.lamps()) out.push({ car: c, chs: lp });
  return [out, ct];
}

export function barSegment(ct: Car, t: number, dur: number, k: number, n = 6, level = 1.0) {
  const a = Math.trunc((k * BAR) / n), b = Math.trunc(((k + 1) * BAR) / n);
  const m = Math.max(2, ct.fr(t + dur) - ct.fr(t));
  const mask = new Float64Array(BAR);
  mask.fill(level, a, b);
  const env = linspace(1, 0.3, m);
  ct.pixels(C.FRONT_BAR, t, rows(m, (f, q) => env[f] * mask[q]));
}

/** The crowd-left ("L") or crowd-right half of the bar, fading over `dur`. */
export function barHalf(ct: Car, t: number, dur: number, side: LR, level = 1.0) {
  const m = Math.max(2, ct.fr(t + dur) - ct.fr(t));
  const mask = new Float64Array(BAR);
  if (side === 'L') mask.fill(level, 0, Math.floor(BAR / 2));
  else mask.fill(level, Math.floor(BAR / 2));
  const env = linspace(1, 0.3, m);
  ct.pixels(C.FRONT_BAR, t, rows(m, (f, q) => env[f] * mask[q]));
}

/** One light runs the whole stage one note at a time: through the left Y's lamps, along the
 * truck bar, through the right Y's lamps, and back. Direction follows the run. Best for scale
 * runs and long single-note passages: every note is a step of a single moving light. */
export function relay(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const [st6, ct] = stations(cars);
  const n = st6.length;
  let direction = ph.up >= 0.5 ? 1 : -1;
  let pos = direction > 0 ? 0 : n - 1;
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const st = st6[pos];
    const hold = Math.max(d, 0.26);              // a short trail: two or three stations lit at once
    if ('bar' in st) {
      const c = ct as Car;
      barSegment(c, t, hold + 0.1, st.bar);
      c.flash(c.heads(st.bar < 3 ? 'L' : 'R'), t, 0.08);
    } else {
      st.car.light(st.chs, t, t + hold);
    }
    // Change direction when the melody turns, else keep walking; bounce at the ends.
    if (i > ph.a && i + 1 < ph.b) {
      const step = nps(ev.top[i + 1] - ev.top[i]);
      if (step !== 0) direction = step;
    }
    pos += direction;
    if (pos >= n || pos < 0) {
      direction = -direction;
      pos = Math.max(0, Math.min(n - 1, pos + 2 * direction));
    }
  }
}

/** On every beat a light bounces between the outer Ys, passing through the truck: the bar
 * scans in the travel direction and the Y it lands on flashes its whole front. Best for steady,
 * medium-intensity beat passages: pure synchronization on display. */
export function pinball(cars: Car[], an: Analysis, ph: Phrase) {
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const beats = within(an.beats, ph.t0, ph.t1 + 0.3);
  for (let k = 0; k < beats.length - 1; k++) {
    const b0 = beats[k], b1 = Math.min(beats[k + 1], ph.t1);
    if (ys.length) {
      const landCar = ys[k % ys.length];
      landCar.flash([...landCar.sig(), ...landCar.drl(), ...landCar.heads()], b0, 0.12);
    }
    if (ct !== null && b1 > b0 + 0.1) {
      const m = Math.max(2, ct.fr(b1) - ct.fr(b0 + 0.05));
      const centre = k % 2 === 0 ? linspace(0, BAR - 1, m) : linspace(BAR - 1, 0, m);
      ct.pixels(C.FRONT_BAR, b0 + 0.05, sweep(centre, 3.5));
    }
  }
}

/** Beats/downbeats inside the phrase, or an even grid at the piece's tempo when the tracker
 * has none there (rubato passages), so beat-shaped moves never go dark. */
export function grid(an: Analysis, ph: Span, kind: 'downbeats' | 'beats' = 'downbeats'): number[] {
  const src = kind === 'downbeats' ? an.downbeats : an.beats;
  let g = within(src, ph.t0 - 0.02, ph.t1);
  if (g.length < 2) {
    const b = an.beats;
    const inb: number[] = [];
    for (let i = 0; i < b.length; i++) if (b[i] >= ph.t0 - 0.02 && b[i] < ph.t1) inb.push(i);
    if (kind === 'downbeats' && inb.length >= 2) {
      // a phrase shorter than two bars: half-bars, in phase with the bar's downbeat
      const ref = an.downbeats.length
        ? searchsorted(b, an.downbeats[argmin(an.downbeats.map((d) => Math.abs(d - ph.t0)))])
        : inb[0];
      g = inb.filter((i) => (i - ref) % 2 === 0).map((i) => b[i]);
    } else if (kind === 'beats' && inb.length >= 2) {
      g = inb.map((i) => b[i]);
    } else {
      // no tracked beats here (a fermata): carry on from the last beat at the local pace
      const prev = b.filter((x) => x <= ph.t0);
      const start = prev.length ? at(prev, -1) : ph.t0;
      const period = (kind === 'downbeats' ? 4 : 1) * beatAt(an, start);
      const count = Math.trunc((ph.t1 - start) / period) + 1;
      g = [];
      for (let i = 0; i < count; i++) g.push(start + period * i);
      g = g.filter((x) => x >= ph.t0 - 0.02);
      if (g.length === 0) g = [ph.t0];
    }
  }
  const pace = an.pace as number | null | undefined;   // calm: every 4th beat, groove: every 2nd (mood.py)
  if (pace && kind === 'beats' && g.length > 1 && pace > median(diff(g)) * 1.25) g = Array.from(pacedGrid(g, pace));
  return g;
}

const subGrids = new WeakMap<Analysis, Map<number, Float64Array>>();

/** Every 1/div-beat point of the tracked beats (sixteenths for div=4), following the music's
 * own beat spacing - not a fixed tempo - so rubato and drift are followed too. Cached. */
export function subGrid(an: Analysis, div = 4): Float64Array {
  let cache = subGrids.get(an);
  if (!cache) subGrids.set(an, (cache = new Map()));
  let g = cache.get(div);
  if (g === undefined) {
    let b: ArrayLike<number> = an.beats;
    if (b.length < 2) b = arange(0, an.duration, 60.0 / Math.max(an.tempo, 40));
    const gaps = diff(b);
    const out = new Float64Array(b.length * div);
    for (let i = 0; i + 1 < b.length; i++) for (let j = 0; j < div; j++) out[i * div + j] = b[i] + (gaps[i] * j) / div;
    const lastB = at(b, -1), lastGap = at(gaps, -1);
    for (let j = 0; j < div; j++) out[(b.length - 1) * div + j] = lastB + (j * lastGap) / div;
    g = out;
    cache.set(div, g);
  }
  return g;
}

/** `t` moved to the nearest sixteenth (1/div beat) of the performer-following beat map
 * (tempo.py), and from there onto a note that was actually played, if one starts within an
 * eighth of that subdivision (at most 40 ms) - continuous quantization: the grid bends with the
 * tempo, and the light lands on the real attack rather than on the theoretical one. */
export function snap(an: Analysis, t: number, div = 4): number {
  const g = subGrid(an, div);
  const i = Math.min(Math.max(searchsorted(g, t), 1), g.length - 1);
  const q = t - at(g, i - 1) <= at(g, i) - t ? at(g, i - 1) : at(g, i);
  const ev = an.events;
  if (ev && nEvents(ev)) {
    const tol = Math.min(0.04, beatAt(an, q) / (2 * div));
    const et = ev.t;
    const j = Math.min(Math.max(searchsorted(et, q), 1), et.length - 1);
    const near = q - at(et, j - 1) <= at(et, j) - q ? at(et, j - 1) : at(et, j);
    if (Math.abs(near - q) <= tol) return near;
  }
  return q;
}

/** Length of the tracked beat around time `t` (seconds). */
export function beatAt(an: Analysis, t: number): number {
  const b = an.beats;
  const nominal = 60.0 / Math.max(an.tempo, 40);
  if (b.length < 2) return nominal;
  const i = Math.min(Math.max(searchsorted(b, t, 'right'), 1), b.length - 1);
  return Math.min(b[i] - b[i - 1], 1.5 * nominal);       // across a fermata: a normal beat
}

/** Start times for `n` evenly spread steps over [d, d + span), each snapped to the nearest
 * sixteenth note of the tracked beats - so a sweep across the stage moves in time with the
 * music instead of at an arbitrary rate. Several steps may share a sixteenth. */
export function qSteps(an: Analysis, d: number, span: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(snap(an, d + (i * span) / Math.max(n, 1)));
  return out;
}

/** Breathing stage: on one bar the lit region grows from the truck's centre out to the Ys'
 * outer corners, on the next it contracts back. Best for sustained chords and long notes in
 * loud sections, where there are no notes to tick but the sound is big. */
export function expandContract(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const downs = grid(an, ph, 'downbeats');
  const bar = (4 * 60.0) / Math.max(an.tempo, 40);
  downs.forEach((d, k) => {
    const span = Math.min(bar, ph.t1 - d);
    const expanding = k % 2 === 0;
    const steps = 4;
    for (let j = 0; j < steps; j++) {
      const ts = snap(an, d + (span * j) / steps);
      const te = snap(an, d + (span * (j + 1)) / steps);
      const lvl = expanding ? (j + 1) / steps : 1 - j / steps;
      if (ct !== null) barFill(ct, ts, te - ts, lvl * 0.9, true);
      for (const c of ys) {
        const outer: LR = c.x < (ct ? ct.x : 1) ? 'L' : 'R';
        const inner: LR = outer === 'L' ? 'R' : 'L';
        const on: number[] = [];
        if (lvl >= 0.5) on.push(...c.sig(inner), ...c.drl(inner));
        if (lvl >= 0.75) on.push(...c.heads(inner), ...c.heads(outer));
        if (lvl >= 1.0) on.push(...c.sig(outer), ...c.drl(outer));
        if (on.length) c.light(on, ts, te);
      }
    }
  });
}

/** Three stage-wide strobes, 60 ms on / 70 ms off, then black. The Halloween hit: for arrival
 * chords and accents, alternating with the plain all-on. */
export function lightning(cars: Car[], t: number, flashes = 3) {
  for (let k = 0; k < flashes; k++) {
    const t0 = t + k * 0.13;
    for (const c of cars) {
      c.set(c.everything(), t0 - 0.01, t0, 0);
      c.light(c.everything(), t0, t0 + 0.06);
      if (c.isCt) barFlash(c, t0, 0.07, 1.0);
    }
  }
  for (const c of cars) {
    c.set(c.everything(), t + flashes * 0.13, t + flashes * 0.13 + 0.25, 0);
    c.set(C.FRONT_BAR, t + flashes * 0.13, t + flashes * 0.13 + 0.25, 0);
  }
}

/** The Ys hit the beats together (mirrored, whole fronts); the truck answers on the off-beats
 * with a bar flash and its headlights. Best for beat-locked loud passages (the band songs). */
export function syncopate(cars: Car[], an: Analysis, ph: Phrase) {
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const beats = within(an.beats, ph.t0, ph.t1);
  beats.forEach((b, k) => {
    const side = k % 2 === 0 ? 'L' : 'R';
    for (const c of ys) {
      const s = msd(c, side, ys);
      c.flash([...c.sig(s), ...c.drl(s), ...c.heads(s)], b, 0.12);
    }
    if (ct !== null && k + 1 < beats.length) {
      const half = (b + beats[k + 1]) / 2;
      barFlash(ct, half, 0.18, 0.9);
      ct.flash(ct.heads(), half, 0.08);
    }
  });
}

/** Twinkle: random LEDs sparkle across the truck bar and the Ys' markers and signatures
 * flicker, denser with the loudness. Best for tremolos, trills and shimmering sustained textures
 * (strings, xylophone), where single notes are not the point. */
export function rain(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const f0 = Math.trunc(ph.t0 / an.step), f1 = Math.max(Math.trunc(ph.t0 / an.step) + 1, Math.trunc(ph.t1 / an.step));
  const rng = new Rng(Math.trunc(ph.t0 * 100));
  const n = f1 - f0;
  if (ct !== null) {
    const lv = an.loudFast.slice(f0, f1);
    const field = Array.from({ length: n }, () => new Float64Array(BAR));
    for (let k = 0; k < n; k += 2) {
      const density = 0.04 + 0.16 * at(lv, Math.min(k, lv.length - 1));
      const spark = rng.randoms(BAR);
      for (let r = k; r < Math.min(n, k + 3); r++) for (let q = 0; q < BAR; q++) if (spark[q] < density) field[r][q] = 1.0;
    }
    ct.pixels(C.FRONT_BAR, ph.t0, field);
  }
  for (const c of ys) {
    const lamps = [c.sig('L'), c.sig('R'), c.drl('L'), c.drl('R'),
      [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_AUX_PARK, C.R_AUX_PARK]];
    for (let k = 0; k < n; k += 4) {
      if (rng.random() < 0.35) {
        const chs = lamps[rng.integers(lamps.length)];
        c.light(chs, ph.t0 + k * an.step, ph.t0 + (k + 4) * an.step);
      }
    }
  }
}

/** Accumulation: one more light comes on with every note, left to right across all three
 * cars, and stays, until the whole stage is lit at the phrase's end; then everything releases.
 * Best for a long crescendo that ends on a hit, as an alternative to the outside-in build. */
export function fillStage(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const [st6, ct] = stations(cars);
  const n = st6.length;
  const count = Math.max(1, ph.b - ph.a);
  for (let j = 0, i = ph.a; i < ph.b; j++, i++) {
    const t = ev.t[i];
    const idx = Math.min(n - 1, Math.trunc((j / count) * n));
    const st = st6[idx];
    if ('bar' in st) barSegment(ct as Car, t, ph.t1 - t, st.bar, 6, 0.8);
    else st.car.light(st.chs, t, ph.t1);
    // and a tick on the newest light's neighbour so the motion reads
    const nxt = st6[Math.min(n - 1, idx + 1)];
    if (!('bar' in nxt)) nxt.car.flash(nxt.chs, t, 0.08);
  }
  if (landsOnHold(an, ph)) {
    land(cars, an, ph, ct, true);
  } else {
    for (const c of cars) c.light(c.everything(), ph.t1, ph.t1 + 0.6, OFF_500);
  }
}

/** Truck solo: two comets launch from the bar's ends on each chord and collide in the middle
 * with a flash; single notes are plain comets. Best for chordal passages on the truck. */
export function barCollide(ct: Car, an: Analysis, ph: Phrase) {
  const ev = an.events;
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i];
    if (ev.kind[i] >= 1) {
      const m = Math.max(4, ct.fr(t + 0.3) - ct.fr(t));
      const half = (BAR - 1) / 2;
      const cl = linspace(0, half, m);
      const cr = linspace(BAR - 1, half, m);
      ct.pixels(C.FRONT_BAR, t, rows(m, (f, k) => {
        const a = (k - cl[f]) / 3, b = (k - cr[f]) / 3;
        return clip(Math.exp(-(a * a)) + Math.exp(-(b * b)), 0, 1);
      }));
      barFlash(ct, t + 0.3, 0.2, 1.0);
      ct.flash(ct.heads(), t + 0.3, 0.1);
    } else {
      const [lo, hi] = phraseRange(ph, an);
      comet(ct, t, posOf(ev.top[i], lo, hi), 0.2);
    }
  }
}

/** The two Ys trade phrases: one plays a bar of the melody (its lamps by pitch) while the
 * other holds a soft glow, then they swap. Best for antiphonal or conversational passages. */
export function yWink(ys: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events, [lo, hi] = phraseRange(ph, an);
  if (ys.length < 2) return yKeyboard(ys, an, ph);
  const bar = (4 * 60.0) / Math.max(an.tempo, 40);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const who = pymod(Math.trunc((t - ph.t0) / bar), 2);
    const car = ys[who];
    const lamps = car.lamps();
    const pos = posOf(ev.top[i], lo, hi, 0.999);
    car.light(lamps[Math.trunc(pos * lamps.length)], t, t + d);
  }
  let k = 0;
  let t = ph.t0;
  while (t < ph.t1) {
    const other = ys[1 - (k % 2)];
    other.light(other.sig(), t, Math.min(t + bar, ph.t1), ON_500);
    t += bar;
    k += 1;
  }
}

// --- Round four: whole-lineup collaboration on steady beats ---------------------------------------

const byX = (cars: Car[]) => [...cars].sort((p, q) => p.x - q.x);

/** order + order[-2:0:-1]: the ping-pong order over the lineup. */
function pingPongOrder(order: Car[]): Car[] {
  const seq = [...order];
  for (let i = order.length - 2; i >= 1; i--) seq.push(order[i]);
  return seq;
}

/** A single light marches car to car on the beat - left, centre, right, centre, left... - the
 * arriving car's whole front comes on while the car it left ramps off, so it reads as one light
 * travelling, not three blinking. On fast beats it steps every other beat. */
export function march(cars: Car[], an: Analysis, ph: Phrase) {
  const seq = pingPongOrder(byX(cars));            // ping-pong order over the lineup
  let beats = grid(an, ph, 'beats');
  if (beats.length > 1 && median(diff(beats)) < 0.4) beats = every(beats, 2);
  beats.forEach((b, k) => {
    const car = seq[k % seq.length];
    const nxt = k + 1 < beats.length ? beats[k + 1] : b + 0.5;
    const hold = Math.max(0.15, Math.min(0.6, (nxt - b) * 0.9));
    car.light([...car.sig(), ...car.drl(), ...car.heads()], b, b + hold);
    car.light([...car.sig(), ...car.drl()], b + hold, b + hold + 0.5, OFF_500);
    if (car.isCt) barFlash(car, b, hold + 0.1, 1.0);
  });
}

/** Every bar a quick ripple runs across the lineup - left Y, truck, right Y, 120 ms apart - and
 * the next bar runs back. Fast enough to read as a swipe, slow enough to see every car. */
export function cascade(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  grid(an, ph, 'downbeats').forEach((d, k) => {
    const seq = k % 2 === 0 ? order : [...order].reverse();
    seq.forEach((car, j) => {
      const t = d + (beatAt(an, d) / 8) * j;                 // a flam on thirty-second notes
      car.flash([...car.sig(), ...car.drl(), ...car.heads()], t, 0.16);
      if (car.isCt) {
        const n = Math.max(2, car.fr(t + 0.3) - car.fr(t));
        const centre = k % 2 === 0 ? linspace(0, BAR - 1, n) : linspace(BAR - 1, 0, n);
        car.pixels(C.FRONT_BAR, t, sweep(centre, 5));
      }
    });
  });
}

/** Light fills the stage left to right one slot per beat (six slots: both halves of each car),
 * holds, then drains back right to left; the truck bar fills and empties with it. */
export function tugOfWar(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const ct = centreTruck(cars);
  const beats = grid(an, ph, 'beats');
  const n = slots.length;
  let k = 0;
  while (k + 2 * n <= beats.length || (k < beats.length && k === 0)) {
    for (let j = 0; j < n; j++) {
      if (k + j >= beats.length) break;
      const [car, side] = slots[j];
      const start = beats[k + j];
      const end = beats[Math.min(beats.length - 1, k + 2 * n - 1 - j)];
      car.light([...car.accents(side), ...car.heads(side)], start, end);
      if (ct !== null && car.isCt) {
        barSegment(ct, start, end - start, side === 'L' ? 0 : 3, 6, 0.9);
        barSegment(ct, start, end - start, side === 'L' ? 1 : 4, 6, 0.9);
        barSegment(ct, start, end - start, side === 'L' ? 2 : 5, 6, 0.9);
      }
    }
    k += 2 * n;
  }
}

/** An accelerating ping-pong for a build: the ball crosses the lineup every bar, then every
 * half bar, then every beat, then every half beat, and everything lands together at the end. */
export function bounceBuild(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  const ct = centreTruck(cars);
  const span = Math.max(ph.t1 - ph.t0, 1.0);
  const beat = 60.0 / Math.max(an.tempo, 40);
  const hop = [0, 1, 2, 1];
  let t = ph.t0;
  let k = 0;
  while (t < ph.t1 - 0.1) {
    const u = (t - ph.t0) / span;
    const step = beat * (u < 0.3 ? 4 : u < 0.6 ? 2 : u < 0.85 ? 1 : 0.5);
    const ts = snap(an, t, 2);                    // the hit lands on the beat grid; the clock runs on
    const car = order[hop[k % 4] % order.length];
    car.flash([...car.sig(), ...car.drl(), ...car.heads()], ts, Math.min(0.14, step * 0.6));
    if (ct !== null) {
      const nxt = order[hop[(k + 1) % 4] % order.length];
      const goesRight = nxt.x > car.x;
      const m = Math.max(2, ct.fr(ts + step) - ct.fr(ts));
      const centre = goesRight ? linspace(0, BAR - 1, m) : linspace(BAR - 1, 0, m);
      ct.pixels(C.FRONT_BAR, ts, sweep(centre, 4, 0.7));
    }
    t += step;
    k += 1;
  }
  for (const c of cars) {
    c.set(c.everything(), ph.t1 - 0.16, ph.t1, 0);
    c.light(c.everything(), ph.t1, ph.t1 + 0.4);
    c.light(c.everything(), ph.t1 + 0.4, ph.t1 + 1.0, OFF_500);
  }
  if (ct !== null) barFlash(ct, ph.t1, 0.6, 1.0);
}

/** Bar-level call and response: the truck plays a bar of the melody (comets and headlights),
 * then the two Ys answer the next bar in mirror (keyboard on their lamps), and so on. */
export function antiphony(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const bar = (4 * 60.0) / Math.max(an.tempo, 40);
  const [lo, hi] = phraseRange(ph, an);
  for (let i = ph.a; i < ph.b; i++) {
    const t = ev.t[i], d = flashLen(ev, i);
    const pos = posOf(ev.top[i], lo, hi, 0.999);
    const truckTurn = pymod(Math.trunc((t - ph.t0) / bar), 2) === 0;
    if (truckTurn && ct !== null) {
      comet(ct, t, pos, d + 0.15);
      ct.flash(ct.heads(pos < 0.5 ? 'L' : 'R'), t, d);
    } else {
      for (const c of ys) {
        const lamps = c.lamps();
        let j = Math.trunc(pos * lamps.length);
        if (c.x > (ct ? ct.x : 1)) j = lamps.length - 1 - j;          // mirrored on the right-hand car
        c.light(lamps[j], t, t + d);
      }
    }
  }
}

// --- Round five: patterns across the stage ------------------------------------------------------

/** Checkerboard across the six slots and the bar: on one beat the even slots are lit (and every
 * other block of the bar), on the next the odd ones - a flickering lattice across the cars. */
export function checker(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const ct = centreTruck(cars);
  const beats = grid(an, ph, 'beats');
  const blk = Math.floor(BAR / 6);
  beats.forEach((b, k) => {
    const nxt = k + 1 < beats.length ? beats[k + 1] : b + 0.4;
    const hold = Math.max(0.12, Math.min(0.5, (nxt - b) * 0.85));
    slots.forEach(([car, side], j) => {
      if (j % 2 === k % 2) car.light([...car.accents(side), ...car.heads(side)], b, b + hold);
    });
    if (ct !== null) {
      const mask = new Float64Array(BAR);
      for (let j = 0; j < 6; j++) if (j % 2 === k % 2) mask.fill(1.0, j * blk, (j + 1) * blk);
      const n = Math.max(2, ct.fr(b + hold) - ct.fr(b));
      ct.pixels(C.FRONT_BAR, b, repeatRow(mask, n));
    }
  });
}

/** A searchlight two slots wide sweeps across the stage over each bar, left to right then back,
 * with the bar lighting the part of itself the beam is crossing. */
export function beam(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const ct = centreTruck(cars);
  const downs = grid(an, ph, 'downbeats');
  const bar = (4 * 60.0) / Math.max(an.tempo, 40);
  const n = slots.length;
  downs.forEach((d, k) => {
    const span = Math.min(bar, ph.t1 - d);
    if (span < 0.4) return;
    const per = span / (n + 1);
    const times = qSteps(an, d, span, n + 1);
    for (let step = 0; step < n + 1; step++) {
      const t = times[step];
      const pos = k % 2 === 0 ? step : n - step;
      for (const j of [pos - 1, pos]) {
        if (j >= 0 && j < n) {
          const [car, side] = slots[j];
          car.light([...car.accents(side), ...car.heads(side)], t, t + per * 1.1);
        }
      }
      if (ct !== null) {
        const m = Math.max(2, ct.fr(t + per * 1.1) - ct.fr(t));
        const centre = ((pos - 2.5) / 2) * (BAR - 1) + (BAR - 1) / 2;   // slots 2,3 are the bar
        const field = new Float64Array(BAR);
        for (let q = 0; q < BAR; q++) {
          const x = (q - centre) / 7;
          field[q] = Math.exp(-(x * x));
        }
        ct.pixels(C.FRONT_BAR, t, repeatRow(field, m));
      }
    }
  });
}

/** Left channel, right channel: the whole left half of the stage (left Y, the truck's crowd-left
 * headlight and half of the bar) on one beat, the whole right half on the next. */
export function lrChannel(cars: Car[], an: Analysis, ph: Phrase) {
  const ys = sides(cars);
  const ct = centreTruck(cars);
  let beats = grid(an, ph, 'beats');
  if (beats.length > 1 && median(diff(beats)) < 0.3) beats = every(beats, 2);
  beats.forEach((b, k) => {
    const nxt = k + 1 < beats.length ? beats[k + 1] : b + 0.4;
    const hold = Math.max(0.12, Math.min(0.45, (nxt - b) * 0.8));
    const left = k % 2 === 0;
    if (ys.length) {
      const car = left ? ys[0] : at(ys, -1);
      car.light([...car.sig(), ...car.drl(), ...car.heads()], b, b + hold);
    }
    if (ct !== null) {
      ct.light(ct.heads(left ? 'L' : 'R'), b, b + hold);
      barHalf(ct, b, hold, left ? 'L' : 'R', 1.0);
    }
  });
}

/** Build into the middle, then let go: over the phrase the slots come on from the outer corners
 * inward and stay, the bar fills from both ends, the truck pops at the top, and then everything
 * fades out slowly (2 s ramps) instead of cutting. */
export function implode(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const ct = centreTruck(cars);
  const n = slots.length;
  const order: [Car, LR][] = [];                                  // outer corners first, truck last
  for (let k = 0; k < Math.floor(n / 2); k++) order.push(slots[k], slots[n - 1 - k]);
  const top = snap(an, ph.t1 - 0.4, 1);
  const starts = qSteps(an, ph.t0, (top - ph.t0) * 0.85, order.length);
  order.forEach(([car, side], j) => {
    const ts = starts[j];
    car.light(car.accents(side), ts, top);
    if (j >= order.length - 2) car.light(car.heads(side), ts, top);
  });
  if (ct !== null) {
    const m = Math.max(2, ct.fr(top) - ct.fr(ph.t0));
    barFill(ct, ph.t0, top - ph.t0, linspace(0, 1, m).map((v) => v * 0.9), false);
    barFlash(ct, top, 0.5, 1.0);
  }
  for (const c of cars) {
    c.set(c.everything(), top - 0.14, top, 0);
    c.light(c.everything(), top, top + 0.35);
    c.light([...c.inner(), ...c.sig(), ...c.drl()], top + 0.35, top + 2.5, C.OFF_2000);
  }
}

/** A slow crossfade from one side of the stage to the other on the ramping lamps: the left Y
 * ramps up over a second while the right ramps down, the truck's outer beams follow the louder
 * side, then it swaps every two bars. */
export function fadeCross(cars: Car[], an: Analysis, ph: Phrase) {
  const ys = sides(cars);
  const ct = centreTruck(cars);
  const downs = [...every(grid(an, ph, 'downbeats'), 2), ph.t1];
  let k = 0;
  for (let q = 0; q + 1 < downs.length; q++) {
    const t = downs[q], stop = Math.min(downs[q + 1], ph.t1);
    if (stop - t < 0.3) continue;
    const [up, down] = k % 2 === 0 ? [ys[0], at(ys, -1)] : [at(ys, -1), ys[0]];
    if (ys.length >= 2) {
      up.light([...up.sig(), ...up.drl(), ...up.inner()], t, stop, C.ON_1000);
      down.light([...down.sig(), ...down.drl(), ...down.inner()], t, stop, C.OFF_1000);
    }
    if (ct !== null) {
      const side: LR = up === ys[0] ? 'L' : 'R';
      ct.light(ct.outer(side), t, stop, C.ON_1000);
      ct.light(ct.outer(side === 'L' ? 'R' : 'L'), t, stop, C.OFF_1000);
      const m = Math.max(2, ct.fr(stop) - ct.fr(t));
      const leds = linspace(0, 1, BAR);
      const ramp = linspace(0, 1, m);
      ct.pixels(C.FRONT_BAR, t, rows(m, (f, j) => {
        const r = ramp[f], l = leds[j];
        return 0.6 * (side === 'R' ? (1 - r) * (1 - l) + r * l : r * (1 - l) + (1 - r) * l);
      }));
    }
    k += 1;
  }
}

// --- Round six: the community-show vocabulary, beat-locked -------------------------------------
// From the xLights sequences of Tesla's 5-car "The Arrival", the 4-car "Cyber Symphony" and the
// community Toccata (Curtain, Color Wash, Marquee, Morph, Shockwave, Snowstorm, SingleStrand), plus
// stage-lighting builds and releases. Every move starts on the song's tracked beats or downbeats
// (`grid`, which the mood pacing thins to every 2nd/4th beat in calm passages) and spans whole
// beats or bars, so nothing floats free of the tempo.

export function barLen(an: Analysis): number {
  return (4 * 60.0) / Math.max(an.tempo, 40);
}

export function next(g: ArrayLike<number>, k: number, fallback: number): number {
  return k + 1 < g.length ? g[k + 1] : g[k] + fallback;
}

/** The side of an outer car that faces the truck, in crowd terms. */
export function innerSide(car: Car, cars: Car[]): LR {
  let s = 0;
  for (const c of cars) s += c.x;
  const centre = s / cars.length;
  return car.x < centre ? 'R' : 'L';
}

/** Curtain (the most-used non-On effect in the community shows). On the phrase's first downbeat
 * the stage is unveiled crowd-left to right, slot by slot over one bar, and stays lit - signatures,
 * DRLs and inner beams - with the headlights punching each downbeat in between; on the last bar the
 * curtain draws closed right to left. The truck's bar opens and closes with it, LED by LED.
 * Suits section starts and sustained, singing material in groove/drive; not strobe-y. */
export function curtain(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const n = slots.length;
  const ct = centreTruck(cars);
  const downs = grid(an, ph, 'downbeats');
  const bar = barLen(an);
  const tOpen = downs[0];
  const span = ph.t1 - tOpen;
  if (span < 1.5) return;
  const sw = Math.min(bar, span / 3);
  const tClose = Math.max(tOpen + sw, downs.length > 2 ? at(downs, -1) : ph.t1 - sw);
  const onAt = qSteps(an, tOpen, sw, n);
  const offAt = qSteps(an, tClose, sw, n).reverse();
  slots.forEach(([car, side], j) => {
    car.light([...car.accents(side), ...car.inner(side)], onAt[j], offAt[j]);
    car.light([...car.accents(side), ...car.inner(side)], offAt[j], offAt[j] + 0.6, OFF_500);
  });
  for (const d of downs.slice(1)) {
    if (tOpen + sw < d && d < tClose - 0.1) for (const car of cars) car.flash(car.outer(), d, 0.18);
  }
  if (ct !== null) {
    const m = Math.max(2, ct.fr(tClose + sw) - ct.fr(tOpen));
    const pos = linspace(0, 1, BAR);
    // the truck owns slots 2 and 3, i.e. the middle third of the sweep
    ct.pixels(C.FRONT_BAR, tOpen, rows(m, (f, k) => {
      const tt = tOpen + f * ct.step;
      const opened = clip(((tt - tOpen) / sw) * n - 2 - 2 * pos[k], 0, 1);
      const closed = clip(((tt - tClose) / sw) * n - (n - 4) - 2 * (1 - pos[k]), 0, 1);
      return 0.85 * opened * (1 - closed);
    }));
  }
}

/** Colour-wash breathing (the Arrival's long Color Wash blocks). Each car's signature and DRLs
 * glow up on a 1 s ramp and fade on a 2 s ramp, the cars a beat apart so the breath rolls
 * across the stage and back; the truck's bar swells and ebbs with it. One breath per two bars,
 * started on the downbeats. The calmest collaborative move: intros, quiet verses, held chords. */
export function breatheWash(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  const downs = grid(an, ph, 'downbeats');
  const beat = 60.0 / Math.max(an.tempo, 40);
  const bar = barLen(an);
  const ds = every(downs, 2);
  for (let k = 0; k < ds.length; k++) {
    const d = ds[k];
    if (d > ph.t1 - 1.0) break;
    const seq = k % 2 === 0 ? order : [...order].reverse();
    const after = an.beats.filter((x) => x >= d - 0.01);
    seq.forEach((car, j) => {
      const ts = j < after.length ? after[j] : d + j * beat;
      const up = Math.min(ts + bar, ph.t1);
      if (up - ts < 0.6) return;
      car.light([...car.sig(), ...car.drl()], ts, up, C.ON_1000);
      car.light([...car.sig(), ...car.drl()], up, up + 2.0, C.OFF_2000);
      if (car.isCt) {
        car.light(car.inner(), ts, up, C.ON_1000);
        car.light(car.inner(), up, up + 2.0, C.OFF_2000);
        const m = Math.max(2, car.fr(up + 1.5) - car.fr(ts));
        const env = linspace(0, Math.PI, m).map((x) => Math.sin(x) ** 1.5 * 0.7);
        car.pixels(C.FRONT_BAR, ts, repeatCol(env));
      }
    });
  }
}

/** Marquee / theatre chase (the Arrival, 45-50 s). Along the whole line of front lamps - eight
 * per Y with the truck's between them - every third lamp is lit, and the pattern steps one lamp on
 * each hit, so light crawls across every car; the bar chases in blocks of five LEDs. It turns
 * round every two bars. Steps on the beat grid (every other beat when calm). Groove material. */
export function marquee(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  const line: [Car, number[]][] = [];
  for (const c of order) for (const lamp of c.lamps()) line.push([c, lamp]);
  const ct = centreTruck(cars);
  const hits = grid(an, ph, 'beats');
  const beat = 60.0 / Math.max(an.tempo, 40);
  const perTurn = Math.max(4, Math.trunc(round((2 * barLen(an)) / Math.max(hits.length > 1 ? median(diff(hits)) : beat, 0.1))));
  let phase = 0;
  hits.forEach((b, k) => {
    const hold = Math.max(0.12, Math.min(0.8, (next(hits, k, beat) - b) * 0.92));
    phase = pymod(phase + (Math.floor(k / perTurn) % 2 === 0 ? 1 : -1), 3);
    line.forEach(([car, lamp], i) => {
      if (i % 3 === phase) car.light(lamp, b, b + hold);
    });
    if (ct !== null) {
      const mask = new Float64Array(BAR);
      for (let q = 0; q < BAR; q++) mask[q] = Math.floor(q / 5) % 3 === phase ? 1 : 0;
      const m = Math.max(2, ct.fr(b + hold) - ct.fr(b));
      ct.pixels(C.FRONT_BAR, b, repeatRow(mask, m));
    }
  });
}

/** Crossing sweeps (the opposed Morph pair in Tesla's 5-car example). Two lights start at the
 * two ends of the stage on the downbeat and run toward each other slot by slot, cross at the truck
 * - its bar flares where they pass - and carry on to the far ends. One crossing per bar, two per
 * bar in a frenzy. Big and kinetic: choruses, drive and climax passages, fast runs. */
export function crossing(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const n = slots.length;
  const ct = centreTruck(cars);
  const downs = grid(an, ph, 'downbeats');
  const bar = barLen(an);
  const perBar = ph.mood === 'frenzy' ? 2 : 1;
  const starts: number[] = [];
  for (const d of downs) for (let h = 0; h < perBar; h++) starts.push(d + (bar * h) / perBar);
  for (const d of starts) {
    const span = Math.min(bar / perBar, ph.t1 - d);
    if (span < 0.4) continue;
    const per = span / n;
    const times = qSteps(an, d, span, n);
    for (let s = 0; s < n; s++) {
      const t = times[s];
      // a Python set {s, n-1-s}: two different slots, lit in either order
      for (const j of new Set([s, n - 1 - s])) {
        const [car, side] = slots[j];
        car.light([...car.accents(side), ...car.heads(side)], t, t + per * 1.15);
      }
      if (ct !== null && (s === Math.floor(n / 2) - 1 || s === Math.floor(n / 2))) barFlash(ct, t, per * 1.6, 1.0);
    }
  }
}

/** Shockwave (Toccata and Cyber Symphony). On each hit a ring leaves the truck: its bar flares
 * from the centre outward, then 70 ms later the Ys' inner lamps, then their outer lamps, then the
 * fogs and markers - the hit visibly travels out through the line. On downbeats in groove/drive,
 * on every beat in a frenzy. For arrivals, drops after a build, and big accents. */
export function shockwave(cars: Car[], an: Analysis, ph: Pick<Phrase, 't0' | 't1' | 'mood'>) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const g = grid(an, ph, ph.mood === 'frenzy' ? 'beats' : 'downbeats');
  g.forEach((t, k) => {
    const ring = beatAt(an, t) / 8;                    // rings travel on thirty-second notes
    if (k % 2 === 1) {                          // the return: a ring collapsing from the Ys into the truck
      for (const y of ys) {
        const inner = innerSide(y, cars);
        const outer: LR = inner === 'R' ? 'L' : 'R';
        y.flash([...y.fogs(), ...y.markers()], t, 0.12);
        y.flash([...y.heads(outer), ...y.accents(outer)], t + ring, 0.12);
        y.flash([...y.accents(inner), ...y.inner(inner)], t + 2 * ring, 0.12);
      }
      if (ct !== null) {
        const m = Math.max(2, ct.fr(t + 3 * ring + 0.3) - ct.fr(t + 3 * ring));
        barFill(ct, t + 3 * ring, 0.3, linspace(1, 0, m).map((v) => clip(v, 0, 1)), true);
        ct.flash(ct.heads(), t + 3 * ring, 0.15);
      }
      return;
    }
    if (ct !== null) {
      const m = Math.max(2, ct.fr(t + 0.45) - ct.fr(t));
      const grow = linspace(0, 3.0, m).map((v) => clip(v, 0, 1));
      const fade = linspace(1.6, 0, m).map((v) => clip(v, 0, 1));
      barFill(ct, t, 0.45, grow, true, fade);
      ct.flash(ct.heads(), t, 0.12);
    }
    for (const y of ys) {
      const inner = innerSide(y, cars);
      const outer: LR = inner === 'R' ? 'L' : 'R';
      y.flash([...y.accents(inner), ...y.inner(inner)], t + ring, 0.12);
      y.flash([...y.heads(outer), ...y.accents(outer)], t + 2 * ring, 0.12);
      y.flash([...y.fogs(), ...y.markers()], t + 3 * ring, 0.14);
    }
  });
}

const SPARKLE: Record<string, [number, number, number]> = {   // mood: subdivisions, lamps per tick, hold
  calm: [1, 1, 0.7], groove: [2, 1, 0.25], drive: [2, 2, 0.15], frenzy: [4, 3, 0.08],
};

/** Twinkle (the community Toccata's Snowstorm). Single lamps anywhere on the stage wink on at
 * random, quantized to subdivisions of the beat, with sparkles darting along the truck's bar.
 * Calm: one soft twinkle per beat that glows and fades. Frenzy: three sharp ones per sixteenth.
 * For shimmering textures, trills, high bells, magical moments, and the quiet after a climax. */
export function sparkle(cars: Car[], an: Analysis, ph: Phrase) {
  const rng = new Rng(pymod(Math.trunc(ph.t0 * 1000), 2 ** 32));
  const order = byX(cars);
  const lamps: [Car, number[]][] = [];
  for (const c of order) for (const lamp of c.lamps()) lamps.push([c, lamp]);
  const ct = centreTruck(cars);
  const mood = ph.mood ?? 'groove';
  let beats: ArrayLike<number> = within(an.beats, ph.t0, ph.t1);
  if (beats.length < 2) beats = arange(ph.t0, ph.t1, 60.0 / Math.max(an.tempo, 40));
  if (!(mood in SPARKLE)) throw new Error(`sparkle: no mood ${mood}`);
  const [sub, count, hold] = SPARKLE[mood];
  const ticks: number[] = [];
  for (const b of Array.from(beats)) for (let s = 0; s < sub; s++) ticks.push(b + (beatAt(an, b) * s) / sub);
  for (const t of ticks) {
    if (t >= ph.t1 - 0.05) break;
    for (let q = 0; q < count; q++) {
      const [car, lamp] = lamps[rng.integers(lamps.length)];
      car.light(lamp, t, t + hold);
    }
    if (ct !== null) {
      const m = Math.max(2, ct.fr(t + Math.max(hold, 0.2)) - ct.fr(t));
      const mask = new Float64Array(BAR);
      for (const j of rng.choiceNoReplace(BAR, 2 * count)) mask[j] = 1.0;
      const env = linspace(1, 0, m);
      ct.pixels(C.FRONT_BAR, t, rows(m, (f, k) => env[f] * mask[k]));
    }
  }
}

/** Sunrise and sunset. Over the phrase the stage dawns from the truck outward on 2 s ramps -
 * the truck, then the Ys' inner halves, then their outer halves, each on a downbeat - holds, and
 * sets again from the outside in over the last bars. The bar glows from its centre. For the
 * opening and closing of quiet pieces and long held passages: calm only. */
export function sunrise(cars: Car[], an: Analysis, ph: Phrase) {
  const slots = slots6(cars);
  const n = slots.length;
  const ct = centreTruck(cars);
  const downs = grid(an, ph, 'downbeats');
  if (ph.t1 - ph.t0 < 3.0) return;
  const ringOf = (j: number) => Math.trunc(Math.abs(j - (n - 1) / 2));
  const rings = [...new Set(slots.map((_, j) => ringOf(j)))].sort((p, q) => p - q);   // 0 = truck, 2 = outer halves
  const riseAt = rings.map((r) => downs[Math.min(r, downs.length - 1)]);
  const setFrom = downs.length >= 2 * rings.length ? at(downs, -rings.length) : ph.t1 - (ph.t1 - ph.t0) * 0.3;
  const setStep = Math.max(0.4, (ph.t1 - setFrom) / rings.length);
  slots.forEach(([car, side], j) => {
    const r = ringOf(j);
    const on = riseAt[r];
    const off = setFrom + (rings.length - 1 - r) * setStep;
    if (off - on < 0.8) return;
    const chs = [...car.accents(side), ...(r === 0 ? car.inner(side) : [])];
    car.light(chs, on, off, C.ON_2000);
    car.light(chs, off, off + 2.0, C.OFF_2000);
  });
  if (ct !== null) {
    const t0 = riseAt[0], t1 = ph.t1;
    const m = Math.max(2, ct.fr(t1) - ct.fr(t0));
    const level = linspace(0, 1, m).map((x) => clip(Math.min(x / 0.4, (1 - x) / 0.3), 0, 1) * 0.6);
    barFill(ct, t0, t1 - t0, level, true, new Float64Array(m).fill(0.6));
  }
}

/** Larson scanner (the community Toccata's SingleStrand chase). A bright eye with a fading tail
 * sweeps the truck's bar end to end, one sweep per hit interval, and the Y at whichever end it
 * reaches answers with its near headlight - so the sweep bounces off the outer cars like a ball
 * between walls. Ys idle on a dim DRL. Groove/drive; nice for ostinatos and walking basslines. */
export function scanner(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const order = byX(cars);
  if (ct === null) return wave(cars, an, ph);
  const hits = grid(an, ph, 'beats');
  const beat = 60.0 / Math.max(an.tempo, 40);
  for (const y of [order[0], at(order, -1)]) if (!y.isCt) y.light(y.drl(), ph.t0, ph.t1, C.ON_1000);
  hits.forEach((b, k) => {
    const dur = Math.max(0.2, next(hits, k, beat) - b);
    const ltr = k % 2 === 0;
    const m = Math.max(2, ct.fr(b + dur) - ct.fr(b));
    let pos = linspace(0, BAR - 1, m);
    if (!ltr) pos = pos.reverse();
    ct.pixels(C.FRONT_BAR, b, rows(m, (f, q) => {
      const behind = (q - pos[f]) * (ltr ? -1 : 1);      // >0 behind the eye
      return behind >= 0 ? Math.exp(-behind / 6.0) : Math.exp(behind / 1.5);
    }));
    const endCar = ltr ? at(order, -1) : order[0];
    if (!endCar.isCt) {
      const side = innerSide(endCar, cars);
      endCar.flash([...endCar.heads(side), ...endCar.accents(side)], b + dur, Math.min(0.25, dur * 0.6));
    }
  });
}

/** Build: a strobe roll with a stack, the club build-up. The hits subdivide as the phrase climbs
 * - every two beats, every beat, eighths, then sixteenths in the last stretch - while lamp layers
 * join one at a time (markers, fogs, signatures and DRLs, then headlights) and the truck's bar
 * fills in from both ends. Half a beat of black before the end, then the whole stage lands on the
 * next downbeat. For crescendos and pre-chorus climbs; never in calm passages. */
export function accelerando(cars: Car[], an: Analysis, ph: Phrase) {
  const beat = 60.0 / Math.max(an.tempo, 40);
  const ct = centreTruck(cars);
  let beats: ArrayLike<number> = within(an.beats, ph.t0, ph.t1);
  if (beats.length < 4) beats = arange(ph.t0, ph.t1, beat);
  const landAt = an.beats.find((x) => x >= ph.t1 - 0.1);
  const landT = landAt !== undefined ? landAt : ph.t1;
  const stop = landT - beat / 2;
  const span = Math.max(stop - ph.t0, 0.5);
  const layers = [(c: Car) => c.markers(), (c: Car) => c.fogs(), (c: Car) => c.accents(), (c: Car) => c.heads()];
  const subs = [0.5, 1, 2, 4];
  const ticks: [number, number][] = [];
  for (const b of Array.from(beats)) {
    const q = Math.min(3, Math.trunc((4 * (b - ph.t0)) / span));
    const sub = subs[q];
    if (sub < 1) {
      if (ticks.length && b - at(ticks, -1)[0] < 2 * beat * 0.9) continue;
      ticks.push([b, q]);
    } else {
      for (let s = 0; s < Math.trunc(sub); s++) ticks.push([b + (beat * s) / sub, q]);
    }
  }
  for (const [t, q] of ticks) {
    if (t >= stop) break;
    const flash = Math.min(0.12, (beat / subs[q]) * 0.5);
    for (const c of cars) {
      const chs: number[] = [];
      for (const layer of layers.slice(0, q + 1)) chs.push(...layer(c));
      c.flash(chs, t, flash);
    }
  }
  if (ct !== null) {
    const m = Math.max(2, ct.fr(stop) - ct.fr(ph.t0));
    barFill(ct, ph.t0, stop - ph.t0, linspace(0, 1, m).map((v) => v ** 1.5), false);
  }
  for (const c of cars) {
    c.set(c.everything(), stop, landT, 0);
    c.set(C.FRONT_BAR, stop, landT, 0);
  }
  allOn(cars, landT, 0.5, false);
}

/** Release after a peak (an un-stack): the whole stage is on at t0, then comes apart layer by
 * layer at a slowing rate - fogs and markers, the Ys' headlights, the truck's headlights, then the
 * signatures - each fading on a 1 s ramp, until only the DRLs glow and fade out. The bar dissolves
 * LED by LED from its ends. Called by the choreographer on the downbeat after a build when the
 * music drops, for `span` seconds (about two bars). */
export function teardown(cars: Car[], _an: Analysis, t0: number, span: number) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const stages: [number, (c: Car) => number[], Car[]][] = [
    [0.15, (c) => [...c.fogs(), ...c.markers()], cars],
    [0.35, (c) => c.heads(), ys],
    [0.6, (c) => c.heads(), ct ? [ct] : []],
    [0.85, (c) => c.sig(), cars],
  ];
  for (const [frac, group, who] of stages) {
    for (const c of who) {
      const off = t0 + span * frac;
      c.light(group(c), t0, off);
      c.light(group(c), off, off + 1.0, OFF_1000);
    }
  }
  for (const c of cars) {
    c.light(c.drl(), t0, t0 + span, ON);
    c.light(c.drl(), t0 + span, t0 + span + 2.0, C.OFF_2000);
  }
  if (ct !== null) {
    const m = Math.max(2, ct.fr(t0 + span) - ct.fr(t0));
    const rng = new Rng(pymod(Math.trunc(t0 * 1000), 2 ** 32));
    const d = linspace(-1, 1, BAR).map(Math.abs);
    const r = rng.randoms(BAR);
    const die = d.map((v, k) => clip((1 - v) * 0.8 + r[k] * 0.2, 0, 1));     // ends die first
    const x = linspace(0, 1, m);
    ct.pixels(C.FRONT_BAR, t0, rows(m, (f, k) => (x[f] < die[k] ? 1 : 0)));
  }
}

// --- Round seven: more from the community shows' timing data ------------------------------------

/** Ping-pong lead (Cyber Symphony): the two Ys trade hits half a beat apart - one on the beat,
 * the other on the "and" - and the lead swaps every bar, while the truck's bar answers on each
 * downbeat. Reads as a rally between the outer cars. Groove/drive. */
export function pingPong(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  const ys = order.filter((c) => !c.isCt);
  const ct = centreTruck(cars);
  if (ys.length < 2) return lrBeat(cars, an, ph);
  const beats = grid(an, ph, 'beats');
  const downs = new Set(an.downbeats.map((d) => npRoundTo(d, 2)));
  let barK = 0;
  for (const b of beats) {
    if (downs.has(pyRoundTo(b, 2))) {
      barK += 1;
      if (ct !== null) barFlash(ct, b, 0.3, 0.9);
    }
    const [lead, follow] = barK % 2 === 0 ? [ys[0], at(ys, -1)] : [at(ys, -1), ys[0]];
    const half = beatAt(an, b) / 2;
    lead.flash([...lead.heads(), ...lead.accents()], b, Math.min(0.2, half * 0.8));
    follow.flash([...follow.heads(), ...follow.accents()], snap(an, b + half, 2), Math.min(0.2, half * 0.8));
  }
}

/** Metronome car (the 5-car Arrival): the stage holds a soft glow while one car at a time
 * takes a slow solo pulse, moving left, centre, right, centre on each hit (every bar when calm).
 * Spacious and patient: calm intros and quiet verses with a steady pulse underneath. */
export function metronome(cars: Car[], an: Analysis, ph: Phrase) {
  const seq = pingPongOrder(byX(cars));
  const hits = grid(an, ph, 'beats');
  const beat = 60.0 / Math.max(an.tempo, 40);
  for (const c of cars) {
    c.light(c.drl(), ph.t0, ph.t1, C.ON_1000);
    c.light(c.drl(), ph.t1, ph.t1 + 1.0, OFF_1000);
  }
  hits.forEach((b, k) => {
    const car = seq[k % seq.length];
    const hold = Math.max(0.3, Math.min(1.2, (next(hits, k, beat) - b) * 0.6));
    car.light([...car.sig(), ...car.inner()], b, b + hold, C.ON_500);
    car.light([...car.sig(), ...car.inner()], b + hold, b + hold + 1.0, OFF_1000);
    if (car.isCt) {
      const m = Math.max(2, car.fr(b + hold + 0.5) - car.fr(b));
      const third = Math.max(1, Math.floor(m / 3));
      const env = concat(linspace(0, 0.8, third), linspace(0.8, 0, m - third));
      car.pixels(C.FRONT_BAR, b, repeatCol(env));
    }
  });
}

/** Stripe scroll (Cyber Symphony's Bars): four bright stripes scroll along the truck's bar for
 * two beats, then reverse; the Ys answer as a mirrored pair - inner halves on one two-beat block,
 * outer halves on the next. Groove/drive under a steady rhythm section. */
export function stripes(cars: Car[], an: Analysis, ph: Phrase) {
  const ct = centreTruck(cars);
  const ys = sides(cars);
  const beats = grid(an, ph, 'beats');
  const beat = 60.0 / Math.max(an.tempo, 40);
  const blocks = every(beats, 2);
  blocks.forEach((b, k) => {
    const dur = Math.max(0.3, next(blocks, k, 2 * beat) - b);
    for (const y of ys) {
      const inner = innerSide(y, cars);
      const side: LR = k % 2 === 0 ? inner : inner === 'R' ? 'L' : 'R';
      y.light([...y.accents(side), ...y.heads(side)], b, b + Math.min(dur * 0.9, beat * 1.2));
    }
    if (ct !== null) {
      const m = Math.max(2, ct.fr(b + dur) - ct.fr(b));
      const shift = linspace(0, (2.5 * BAR) / 4, m).map((v) => v * (k % 2 === 0 ? 1 : -1));
      ct.pixels(C.FRONT_BAR, b, rows(m, (f, q) => (pymod(q + shift[f], BAR / 4) < 4 ? 1 : 0)));
    }
  });
}

/** Flutter (the Arrival's six quick washes): the whole stage flickers on sixteenths, the outer
 * pair against the truck, for a beat at a time with a beat's rest between - a shiver of light
 * for trills, tremolo strings and the last bar before a drop. Frenzy only. */
export function flutter(cars: Car[], an: Analysis, ph: Phrase) {
  const order = byX(cars);
  const ct = centreTruck(cars);
  const ys = order.filter((c) => !c.isCt);
  let beats: ArrayLike<number> = within(an.beats, ph.t0, ph.t1);
  if (beats.length < 2) beats = arange(ph.t0, ph.t1, 60.0 / Math.max(an.tempo, 40));
  for (let k = 0; k < beats.length; k++) {
    if (k % 2) continue;
    const b = beats[k];
    const six = beatAt(an, b) / 4;
    for (let s = 0; s < 4; s++) {
      const t = b + s * six;
      const who = s % 2 === 0 ? ys : ct ? [ct] : [];
      for (const c of who) c.flash([...c.heads(), ...c.accents()], t, six * 0.6);
      if (ct !== null && s % 2 === 1) barFlash(ct, t, six * 0.8, 1.0);
    }
  }
}

export type Move = (cars: Car[], an: Analysis, ph: Phrase) => void;

/** Every unison move by its Python name (catalog.UNISON), called as moves.<name>(cars, an, ph).
 * keyboard and out_in take their defaults here; block gets the piece's nominal beat. The
 * choreographer passes its own arguments for those three (choreo._play_phrases `special`). */
export const BY_NAME: Record<string, Move> = {
  keyboard: (cars, an, ph) => keyboard(cars, an, ph),
  relay,
  lr_notes: lrNotes,
  rotation: (cars, an, ph) => rotation(cars, an, ph),
  mirror,
  call_response: callResponse,
  antiphony,
  pulse,
  block: (cars, an, ph) => block(cars, an, ph, 60.0 / Math.max(an.tempo, 40)),
  rain,
  motif,
  shimmer,
  cadence,
  meter,
  wave,
  converge,
  lr_beat: lrBeat,
  pinball,
  syncopate,
  march,
  tug_of_war: tugOfWar,
  checker,
  lr_channel: lrChannel,
  heartbeat,
  marquee,
  scanner,
  sparkle,
  ping_pong: pingPong,
  metronome,
  stripes,
  flutter,
  cascade,
  beam,
  expand_contract: expandContract,
  fade_cross: fadeCross,
  curtain,
  breathe_wash: breatheWash,
  sunrise,
  crossing,
  shockwave,
  out_in: (cars, an, ph) => outIn(cars, an, ph),
  fill_stage: fillStage,
  bounce_build: bounceBuild,
  implode,
  accelerando,
};
