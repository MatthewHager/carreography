// The beat layer: makes the audience feel the pulse under all the choreography.
//
// Concert lighting keeps a show readable by splitting the rig: the fixtures with the most visual mass
// bump on the beat, the rest carry the effects. Here the headlights of every car are the beat
// layer wherever the music is lively and its pulse is clear; every move keeps the signatures, DRLs,
// fogs, turns, markers and the truck's bar. Hits are short and hard (about 120 ms, never more than a
// third of the beat) with real darkness between them, because a pulse needs an off state to read.
//
// Accents follow the bar, with the downbeat the biggest:
//     downbeat (1)    every headlight on every car, plus a flash of the truck's bar
//     beat 3          every headlight
//     beats 2 and 4   the two Ys' headlights only
//     off-beats       the truck's inner beams (frenzy only)
//
// and the pattern follows the mood (mood.ts):
//     calm      no hard pulse; where the beat is strong, a soft glow of the truck's inner beams on each downbeat
//     groove    half-time feel: 1 and 3
//     drive     every beat
//     frenzy    every beat plus the off-beats
//
// Builds and cadences own the whole stage while they play: the pulse drops out under a build (the
// pull-back) and comes back full-size on the landing. Where the music has no clear pulse - rubato
// organ, a free cadenza, Ave Maria - the layer backs off (downbeats only, or nothing at all).

import type { Analysis, Phrase } from './analysis';
import { BUILDS } from './catalog';
import * as C from './channels';
import type { Car } from './car';
import * as M from './moves';
import { moodAt } from './mood';
import { clip, diff, max, mean32, median, round, searchsorted } from './np';
import { beatLen } from './tempo';

const HEADS = [C.L_OUTER_MAIN, C.R_OUTER_MAIN, C.L_INNER_MAIN, C.R_INNER_MAIN];
const INNER = [C.L_INNER_MAIN, C.R_INNER_MAIN];
const PATTERN: Record<string, Record<number, string>> = {
  groove: { 0: 'big', 2: 'mid' },
  drive: { 0: 'big', 1: 'small', 2: 'mid', 3: 'small' },
  frenzy: { 0: 'big', 1: 'small', 2: 'mid', 3: 'small' },
};
const OWNERS = new Set(['cadence', 'motif']);
const LEAD_S = 0.02;            // the beat's light lands a frame early: the eye forgives early, not late

/** A phrase, or a stretch between phrases (see segments). */
interface Segment {
  t0: number;
  t1: number;
  move?: string;
  mood?: string;
}

/**
 * How clearly the music beats here: pulse-envelope strength on the beats over its mean
 * (1 = no beat to speak of; a steady band groove is 3 and up). Measured over the phrase plus
 * `reach` seconds either side, so a two-beat phrase isn't judged on two samples.
 */
export function clarity(an: Analysis, t0: number, t1: number, reach = 4.0): number {
  t0 = Math.max(0.0, t0 - reach);
  t1 = t1 + reach;
  const env = an.pulseEnv;
  const b: number[] = [];
  for (const x of an.beats) if (x >= t0 && x < t1) b.push(x);
  if (env === undefined || env === null || b.length < 3) return 1.0;
  const hop = an.pulseHop ?? 512 / 22050;
  const i0 = Math.trunc(t0 / hop);
  const i1 = Math.max(Math.trunc(t0 / hop) + 1, Math.trunc(t1 / hop));
  const w = Math.max(1, Math.trunc(round(0.03 / hop)));
  const peaks: number[] = [];
  for (const x of b) {
    const i = clip(round(x / hop), 0, env.length - 1);
    let m = -Infinity;
    for (let k = Math.max(0, i - w); k < Math.min(env.length, i + w + 1); k++) if (env[k] > m) m = env[k];
    peaks.push(m);
  }
  const on = mean32(peaks, 0, peaks.length);
  return on / (mean32(env, Math.min(i0, env.length), Math.min(i1, env.length)) + 1e-9);
}

/** Beat index within its bar (0 = downbeat) for every tracked beat. */
function position(an: Analysis): Int32Array {
  const b = an.beats;
  const d = an.downbeats;
  const downs = new Set<number>();
  if (b.length) {
    for (const x of d) {
      const k = clip(searchsorted(b, x - 0.01), 0, Math.max(0, b.length - 1));
      if (Math.abs(b[k] - x) < 0.05) downs.add(k);
    }
  }
  const pos = new Int32Array(b.length);
  let last: number | null = null;
  for (let i = 0; i < b.length; i++) {
    if (downs.has(i)) last = i;
    pos[i] = last !== null ? (((i - last) % 4) + 4) % 4 : i % 4;
  }
  return pos;
}

/** Lay the beat layer over the choreography (after the moves and drums, before the cues). */
export function apply(cars: Car[], an: Analysis, phrases: Phrase[]): void {
  const ys = M.sides(cars);
  const ct = M.centreTruck(cars);
  const beats = an.beats;
  if (beats.length < 4) return;
  const pos = position(an);
  const capped = Math.trunc(max(an.tier)) <= 1;          // a song held quiet on purpose (Ave Maria)
  const organ = (an.driver ?? '') === 'organ';
  for (const ph of segments(an, phrases)) {
    const move = ph.move ?? '';
    const parts = move.split(' → ');
    const name = parts[parts.length - 1].split('+')[0].trim();
    const mood = ph.mood ?? 'drive';
    if (capped || OWNERS.has(name)) continue;      // a song held quiet, or a cadence that owns the stage
    if (BUILDS.has(name)) {
      buildPulse(cars, ph, beats);
      continue;
    }
    const clear = clarity(an, ph.t0, ph.t1);
    if (mood === 'calm') {
      // a quiet passage over a strong beat (a march under a soft verse): a small half-time
      // step on the inner beams - both Ys on 1, the truck on 3 - so the pulse never vanishes
      if (clear >= 3.0 && !organ) {
        for (let i = 0; i < beats.length; i++) {
          if (!(beats[i] >= ph.t0 && beats[i] < ph.t1 && (pos[i] === 0 || pos[i] === 2))) continue;
          const t = beats[i] - LEAD_S;
          for (const c of pos[i] === 0 ? ys : (ct !== null ? [ct] : [])) c.set(c.inner(), t, t + 0.12, C.ON);
        }
      }
      continue;
    }
    let pattern: Record<number, string>;
    if (clear < 1.6) {                  // no clear beat here: downbeats only, and only when lively
      pattern = (mood === 'drive' || mood === 'frenzy') && clear >= 1.25 ? { 0: 'big' } : {};
    } else if (organ) {                 // the organ: half-time, unless the music itself pounds every beat
      pattern = mood === 'frenzy' || (mood === 'drive' && clear >= 3.0) ? PATTERN.drive : PATTERN.groove;
    } else if (mood === 'groove' && clear >= 3.0) {
      pattern = PATTERN.drive;          // a strong beat under a groove: every beat, light backbeats
    } else {
      pattern = PATTERN[mood];
    }
    if (!Object.keys(pattern).length || move.startsWith('teardown')) continue;
    // the headlights belong to the beat for this phrase: clear what the moves wrote there
    for (const c of cars) c.set(HEADS, ph.t0, ph.t1, 0);
    // the beat grows with the music: a groove thumps on the inner beams, drive and frenzy on
    // every headlight - so the intro's pulse is smaller than the chorus's
    const lamps = mood === 'groove' ? INNER : HEADS;
    const barLevel = mood === 'groove' ? 0.6 : 1.0;
    for (let i = 0; i < beats.length; i++) {
      if (!(beats[i] >= ph.t0 - 0.01 && beats[i] < ph.t1)) continue;
      const b = beats[i];
      const nxt = i + 1 < beats.length ? beats[i + 1] : b + beatLen(an);
      const gap = nxt - b;
      const hold = clip(gap * 0.3, 0.1, 0.14);
      const kind = pattern[pos[i]];
      const t = b - LEAD_S;
      if (kind === 'big') {
        for (const c of cars) c.set(lamps, t, t + hold + 0.04, C.ON);
        for (const c of cars) {                  // every front light bar flashes on the one
          if (c.hasBar) M.barFlash(c, t, Math.min(0.3, gap * 0.6), barLevel);
        }
      } else if (kind === 'mid') {
        for (const c of cars) c.set(lamps, t, t + hold, C.ON);
      } else if (kind === 'small') {
        for (const c of ys) c.set(lamps, t, t + hold, C.ON);
      }
      if (kind && (mood === 'drive' || mood === 'frenzy')) duck(cars, t, gap);
      if (mood === 'frenzy' && ct !== null) {
        const off = b + gap / 2 - LEAD_S;
        if (off + 0.1 < nxt - LEAD_S) ct.set(ct.inner(), off, off + Math.min(0.1, gap * 0.25), C.ON);
      }
    }
  }
}

/**
 * The pulse through a crescendo: it intensifies instead of stepping aside. First half: the two
 * Ys' headlights on every beat; then every car; the last bar in eighths; then half a beat of
 * black, and the build's own landing hits the next downbeat. The build move keeps its shape on
 * the feature lamps (signatures, DRLs, fogs, the bar).
 */
function buildPulse(cars: Car[], ph: Segment, beats: ArrayLike<number>): void {
  const ys = M.sides(cars);
  for (const c of cars) c.set(HEADS, ph.t0, ph.t1, 0);
  const b: number[] = [];
  for (let i = 0; i < beats.length; i++) if (beats[i] >= ph.t0 - 0.01 && beats[i] < ph.t1) b.push(beats[i]);
  if (b.length < 2) return;
  const gap = median(diff(b));
  const land = ph.t1;
  const span = Math.max(land - ph.t0, 1e-3);
  const ticks: [number, number][] = [];
  for (const x of b) {
    const u = (x - ph.t0) / span;
    ticks.push([x, u]);
    if (land - x <= 4 * gap + 0.01) {                      // the last bar: eighths
      ticks.push([x + gap / 2, (x + gap / 2 - ph.t0) / span]);
    }
  }
  for (const [t, u] of ticks) {
    if (t >= land - gap / 2 - 0.01) continue;              // the pull-back before the landing
    const who = u < 0.5 ? ys : cars;
    const hold = clip(gap * (u < 0.75 ? 0.3 : 0.2), 0.08, 0.14);
    for (const c of who) c.set(HEADS, t - LEAD_S, t - LEAD_S + hold, C.ON);
  }
}

/**
 * Sidechain ducking, as music producers do to make a kick cut through sustained pads: the
 * sustained feature lamps - the Ys' signature and DRL strips, which sit in the headlight housing,
 * and the truck's bar - go dark for a few frames just before a beat hit, so the hit lands as a
 * dark-to-bright step instead of brightening something already lit. The moves keep their shape
 * between beats.
 */
function duck(cars: Car[], t: number, gap: number): void {
  const d = clip(gap * 0.15, 0.06, 0.1);
  for (const c of cars) {
    if (c.hasBar) c.set(C.FRONT_BAR, t - d, t, 0);
    if (!c.isCt) c.set([...c.sig(), ...c.drl()], t - d, t, 0);
  }
}

/**
 * The phrases plus the stretches between them. Phrases come from the transcribed notes, so
 * where the melody rests and only the band plays (a drum break, a vamp) there is no phrase - but
 * the beat doesn't stop, so each such gap becomes a segment of its own, with its mood read from
 * the energy curve (a clearly struck beat keeps it out of calm).
 */
function segments(an: Analysis, phrases: Phrase[], minGap = 0.6): Segment[] {
  const out: Segment[] = [];
  let last = 0.0;
  const gaps: [number, number][] = [];
  for (const ph of [...phrases].sort((p, q) => p.t0 - q.t0)) {
    if (ph.t0 - last >= minGap) gaps.push([last, ph.t0]);
    out.push(ph);
    last = Math.max(last, ph.t1);
  }
  if (an.duration - last >= minGap) gaps.push([last, an.duration]);
  const organ = (an.driver ?? '') === 'organ';
  for (const [a, b] of gaps) {
    let mood = moodAt(an, (a + b) / 2);
    if (mood === 'calm' && !organ && clarity(an, a, b) >= 4.0) mood = 'groove';
    out.push({ t0: a, t1: b, move: '(between phrases)', mood });
  }
  return out.sort((p, q) => p.t0 - q.t0);
}
