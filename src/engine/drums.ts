// The drums, voice by voice, each on lamps of its own, wherever that voice plays (a band's kit, a finger
// snap, a timpani, a clap): not only where a whole kit is heard.
//
//   kick    (kick drum, timpani, a bass note's attack)   the fogs, low on every car; from drive up also the
//                                                        brake lights and the trucks' rear bars
//   snare   (snare, clap, snap, a crash)                 the amber turn signals, front and back
//   hats    (hi-hats, ride, shakers)                     the side markers, at the peak only (hat-rate flashing
//                                                        everywhere else would tire the eye)
//
// A voice plays its lamps where it is present: at least a hit every other beat (a hat every beat) over the
// four seconds around, so a stray detection lights nothing. Quiet music gets short, small hits.

import type { Analysis } from './analysis';
import * as C from './channels';
import type { Car } from './car';
import { flowsAt } from './feel';
import { levelAt } from './level';
import { clip } from './np';

const REACH_S = 2.0;            // presence is counted over this much either side of a hit
const MIN_STRENGTH = 0.2;

/** Per hit of `hits`, how many hits of at least MIN_STRENGTH a beat there are around it. */
function presence(an: Analysis, hits: number[][]): number[] {
  const strong = hits.filter((h) => h[1] >= MIN_STRENGTH).map((h) => h[0]);
  const beats = an.beats;
  const count = (a: ArrayLike<number>, t0: number, t1: number) => {
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] >= t0 && a[i] < t1) n++;
    return n;
  };
  return hits.map(([t]) => {
    const n = count(strong, t - REACH_S, t + REACH_S);
    const nb = Math.max(2, count(beats, t - REACH_S, t + REACH_S));
    return n / nb;
  });
}

/** The drum layer (after the moves, before the beat layer). */
export function apply(cars: Car[], an: Analysis): void {
  const play = (hits: number[][], need: number, fn: (t: number, strength: number, s: number) => void) => {
    const p = presence(an, hits);
    hits.forEach(([t, strength], i) => {
      if (strength < MIN_STRENGTH || p[i] < need || flowsAt(an, t)) return;
      const s = levelAt(an, t);
      if (s >= 0.1) fn(t, strength, s);
    });
  };
  play(an.kick, 0.4, (t, strength, s) => {
    const hold = 0.08 + 0.08 * strength * s;
    for (const c of cars) {
      if (!c.isCt) c.light(c.fogs(), t, t + hold);
      else c.light([C.L_AUX_PARK], t, t + hold);                       // the truck's frunk light
      if (s >= 0.6) {
        c.light([C.BRAKE], t, t + hold + 0.04);
        if (c.isCt) rearBar(c, t, hold + 0.15, 0.6 + 0.4 * strength);
      }
    }
  });
  play(an.snare, 0.3, (t, strength, s) => {
    const hold = clip(0.06 + 0.1 * s, 0.08, 0.16);
    for (const c of cars) {
      c.light(c.isCt ? c.turns() : [C.L_FRONT_TURN, C.R_FRONT_TURN], t, t + hold);
      if (s >= 0.45 && !c.isCt) c.light([C.L_REAR_TURN, C.R_REAR_TURN], t, t + hold);
      if (c.isCt && s >= 0.6) c.pixels(C.OFFROAD_BAR, t, Array.from({ length: c.fr(t + hold) - c.fr(t) },
        () => new Float64Array(C.OFFROAD_BAR.length).fill(strength)));
    }
  });
  play(an.hats, 0.9, (t, _, s) => {
    if (s < 0.8) return;
    for (const c of cars) c.light(c.markers(), t, t + 0.06);
  });
}

/** A truck's rear bar flashing to `level` and fading over `dur`. */
function rearBar(c: Car, t: number, dur: number, level: number) {
  const n = Math.max(2, c.fr(t + dur) - c.fr(t));
  c.pixels(C.REAR_BAR, t, Array.from({ length: n }, (_, f) => new Float64Array(C.REAR_BAR.length)
    .fill(level * (1 - f / n))));
}
