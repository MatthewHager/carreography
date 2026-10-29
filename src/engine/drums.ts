// The drums, voice by voice, each on lamps of its own, wherever that voice keeps time (a band's kit, a
// finger snap, a timpani, a clap): not only where a whole kit is heard.
//
//   kick    (kick drum, timpani, a bass note's attack)   the fogs (a truck's frunk light), low on every car;
//                                                        from drive up also the brake lights and the trucks'
//                                                        rear bars
//   snare   (snare, clap, snap, a crash)                 the amber turn signals, the rear ones from a groove
//                                                        up, a truck's off-road bar from drive
//   hats    (hi-hats, ride, shakers)                     the side markers, at the peak only (hat-rate flashing
//                                                        everywhere else would tire the eye)
//
// A voice keeps time where its hits land on the beat or halfway between (within GRID_S) and come often: at
// least NEED hits a beat over the four seconds around (a kick every two or three beats, a snare every three
// or four, a hat nearly every beat), so a stray detection lights nothing, and neither does an organ's or a
// piano's attack, which the listening may hear as a kick but which falls anywhere. Quiet music gets short,
// small hits.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { flowsAt } from './feel';
import { DRIVE, GROOVE, levelAt, PEAK } from './level';
import { clip, searchsorted } from './np';

const REACH_S = 2.0;            // presence is counted over this much either side of a hit
const GRID_S = 0.05;            // a hit this close to a beat or an eighth keeps time
const MIN_STRENGTH = 0.2;
const NEED = { kick: 0.4, snare: 0.3, hats: 0.9 };
const HEARD = 0.1;              // below this level the music is barely there: no drums

/** Whether t lands on a beat or halfway between two (`beats` sorted). */
function onGrid(beats: number[], t: number): boolean {
  const i = searchsorted(beats, t);
  for (const k of [i - 1, i]) {
    if (k < 0 || k >= beats.length) continue;
    if (Math.abs(beats[k] - t) <= GRID_S) return true;
    const next = beats[k + 1];
    if (next !== undefined && Math.abs((beats[k] + next) / 2 - t) <= GRID_S) return true;
  }
  return false;
}

/** Per hit of `hits`, whether it keeps time: on the grid, and with at least `need` such hits of MIN_STRENGTH
 * a beat around it. */
function keepsTime(an: Analysis, hits: number[][], need: number): boolean[] {
  const beats = an.beats, on = hits.map(([t, s]) => s >= MIN_STRENGTH && onGrid(beats, t));
  const strong = hits.filter((_, i) => on[i]).map(([t]) => t);
  const count = (a: number[], t0: number, t1: number) => searchsorted(a, t1) - searchsorted(a, t0);
  return hits.map(([t], i) => on[i]
    && count(strong, t - REACH_S, t + REACH_S) / Math.max(2, count(beats, t - REACH_S, t + REACH_S)) >= need);
}

/** The drum layer (after the moves, before the beat layer). */
export function apply(cars: Car[], an: Analysis): void {
  const play = (hits: number[][], need: number, fn: (t: number, strength: number, s: number) => void) => {
    const keeps = keepsTime(an, hits, need);
    hits.forEach(([t, strength], i) => {
      if (!keeps[i] || flowsAt(an, t)) return;
      const s = levelAt(an, t);
      if (s >= HEARD) fn(t, strength, s);
    });
  };
  play(an.kick, NEED.kick, (t, strength, s) => {
    const hold = 0.08 + 0.08 * strength * s;
    for (const c of cars) {
      c.light(c.isCt ? c.frunk() : c.fogs(), t, t + hold);
      if (s >= DRIVE) {
        c.light([C.BRAKE], t, t + hold + 0.04);
        if (c.isCt) rearBar(c, t, hold + 0.15, 0.6 + 0.4 * strength);
      }
    }
  });
  play(an.snare, NEED.snare, (t, strength, s) => {
    const hold = clip(0.06 + 0.1 * s, 0.08, 0.16);
    for (const c of cars) {
      c.light(c.turns().filter((ch) => !c.rearTurns().includes(ch)), t, t + hold);
      if (s >= GROOVE) c.light(c.rearTurns(), t, t + hold);
      if (c.isCt && s >= DRIVE) c.pixels(C.OFFROAD_BAR, t, Array.from({ length: c.fr(t + hold) - c.fr(t) },
        () => new Float64Array(C.OFFROAD_BAR.length).fill(strength)));
    }
  });
  play(an.hats, NEED.hats, (t, _, s) => {
    if (s < PEAK) return;
    for (const c of cars) c.light(c.markers(), t, t + 0.06);
  });
}

/** A truck's rear bar flashing to `level` and fading over `dur`. */
function rearBar(c: Car, t: number, dur: number, level: number) {
  const n = Math.max(2, c.fr(t + dur) - c.fr(t));
  c.pixels(C.REAR_BAR, t, Array.from({ length: n }, (_, f) => new Float64Array(C.REAR_BAR.length)
    .fill(level * (1 - f / n))));
}
