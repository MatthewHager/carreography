// One car's show: a frame per 20 ms, 200 channels per frame, and the lamp groups the moves speak.
//
// All sides in the choreography are the CROWD's left/right (facing the cars' fronts). Tesla's "Left"
// channels are the vehicle's left (driver's side), which is on the crowd's right, so every group
// method flips, and the front bar's pixels are written crowd-left to crowd-right (Tesla numbers the
// LEDs from the vehicle's left).

import * as C from './channels';
import { u8 } from './np';
import { lineupCars } from './vehicles';

const LIGHT_LEAD_S = 0.02;   // lights fire one frame before the sound so they read as on the beat

export type Side = 'L' | 'R' | null | undefined;
type Chs = number | readonly number[];

const list = (chs: Chs): readonly number[] => (typeof chs === 'number' ? [chs] : chs);

export class Car {
  readonly frames: Uint8Array;
  readonly closureCounts = new Map<number, number>();
  /** Spans [t0, t1] in which the windows must not move (a Model X's doors are moving). */
  readonly windowsStill: [number, number][] = [];

  constructor(
    readonly kind: 'modely' | 'cybertruck',
    readonly name: string,
    /** Place in the line, 0 on the crowd's left. A lineup's cars are always in this order. */
    readonly x: number,
    readonly nFrames: number,
    readonly step: number,
    /** A 2025+ Model Y: what a Model Y shows on its signature strips and fogs goes to the light bar
     * (lamps.ts). */
    readonly juniper: boolean,
    /** A Model X: falcon doors (motors.ts). */
    readonly falcon: boolean,
  ) {
    this.frames = new Uint8Array(nFrames * C.N_CHANNELS);
  }

  /** The same car with nothing on it. */
  blank(): Car {
    return new Car(this.kind, this.name, this.x, this.nFrames, this.step, this.juniper, this.falcon);
  }

  get isCt() {
    return this.kind === 'cybertruck';
  }

  /** A front light bar across the nose: the Cybertruck, and the 2025+ Model Y. */
  get hasBar() {
    return this.isCt || this.juniper;
  }

  static veh(side: Side): Side {
    return side === 'L' ? 'R' : side === 'R' ? 'L' : side;
  }

  get(f: number, ch: number): number {
    return this.frames[f * C.N_CHANNELS + ch];
  }

  put(f: number, ch: number, v: number) {
    this.frames[f * C.N_CHANNELS + ch] = v;
  }

  fr(t: number): number {
    return Math.min(Math.max(Math.round((t - LIGHT_LEAD_S) / this.step), 0), this.nFrames);
  }

  light(chs: Chs, t0: number, t1: number, value = C.ON) {
    const a = this.fr(t0), b = this.fr(t1);
    const cs = list(chs);
    if (b <= a || !cs.length) return;
    const F = this.frames, N = C.N_CHANNELS;
    for (const ch of cs) for (let f = a; f < b; f++) if (F[f * N + ch] < value) F[f * N + ch] = value;
  }

  flash(chs: Chs, t: number, dur: number, value = C.ON) {
    this.light(chs, t, t + Math.max(dur, 0.1), value);
  }

  set(chs: Chs, t0: number, t1: number, value: number) {
    const a = this.fr(t0), b = this.fr(t1);
    for (const ch of list(chs)) for (let f = a; f < b; f++) this.frames[f * C.N_CHANNELS + ch] = value;
  }

  /** values: one row per frame from t0, one 0..1 value per channel in `chs` (crowd order for the bar). */
  pixels(chs: readonly number[], t0: number, values: ArrayLike<ArrayLike<number>>) {
    const a = this.fr(t0);
    const b = Math.min(this.nFrames, a + values.length);
    if (b <= a) return;
    const flip = chs.length === C.FRONT_BAR.length && chs.every((c, i) => c === C.FRONT_BAR[i]);
    const n = chs.length, F = this.frames, N = C.N_CHANNELS;
    for (let f = a; f < b; f++) {
      const row = values[f - a];
      for (let k = 0; k < n; k++) {
        const v = u8(Math.min(Math.max(row[flip ? n - 1 - k : k] * 255, 0), 255));
        const at = f * N + chs[k];
        if (F[at] < v) F[at] = v;
      }
    }
  }

  rgb(t0: number, t1: number, color: readonly number[], scale = 1.0) {
    const a = this.fr(t0), b = this.fr(t1);
    for (const base of C.ALL_RGB) {
      for (let i = 0; i < 3; i++) {
        const v = Math.trunc(color[i] * scale);
        for (let f = a; f < b; f++) {
          const at = f * C.N_CHANNELS + base + i;
          if (this.frames[at] < v) this.frames[at] = v;
        }
      }
    }
  }

  closure(ch: number, t0: number, t1: number, cmd: number): boolean {
    if (cmd === C.CLOSURE_OPEN || cmd === C.CLOSURE_CLOSE || cmd === C.CLOSURE_DANCE) {
      const n = this.closureCounts.get(ch) ?? 0;
      if (n >= C.CLOSURE_LIMITS[ch]) return false;
      this.closureCounts.set(ch, n + 1);
    }
    this.set(ch, t0, t1, cmd);
    return true;
  }

  // --- Light groups ---
  private pick(side: Side, L: number[], R: number[]): number[] {
    const s = Car.veh(side);
    return s === 'L' ? L : s === 'R' ? R : [...L, ...R];
  }

  heads(side?: Side) {
    return this.pick(side, [C.L_OUTER_MAIN, C.L_INNER_MAIN], [C.R_OUTER_MAIN, C.R_INNER_MAIN]);
  }

  inner(side?: Side) {
    return this.pick(side, [C.L_INNER_MAIN], [C.R_INNER_MAIN]);
  }

  outer(side?: Side) {
    return this.pick(side, [C.L_OUTER_MAIN], [C.R_OUTER_MAIN]);
  }

  /** Model Y signature strip (ramping). Cybertruck: front side marker (ramping). */
  sig(side?: Side) {
    return this.isCt
      ? this.pick(side, [C.L_SIDE_MARKER], [C.R_SIDE_MARKER])
      : this.pick(side, [C.L_SIGNATURE], [C.R_SIGNATURE]);
  }

  /** Model Y channels 4-6 (one combined output per side, ramping); on a 2025+ Model Y channel 6 is the
   * whole front bar, so only 4-5 (the outer strips). Cybertruck: front turn. */
  drl(side?: Side) {
    return this.isCt
      ? this.pick(side, [C.L_FRONT_TURN], [C.R_FRONT_TURN])
      : this.pick(side, this.drlVeh('L'), this.drlVeh('R'));
  }

  /** Distinct front lamps left to right as the crowd sees them (8 on a Model Y). */
  lamps() {
    return [this.sig('L'), this.drl('L'), this.outer('L'), this.inner('L'),
      this.inner('R'), this.outer('R'), this.drl('R'), this.sig('R')];
  }

  /** Model Y signature + channels 4-6 (4-5 on a 2025+ Model Y, whose bar then shows them; see
   * lamps.ts). Cybertruck: front side markers. */
  accents(side?: Side) {
    return this.isCt
      ? this.pick(side, [C.L_SIDE_MARKER], [C.R_SIDE_MARKER])
      : this.pick(side, [C.L_SIGNATURE, ...this.drlVeh('L')], [C.R_SIGNATURE, ...this.drlVeh('R')]);
  }

  private drlVeh(vside: 'L' | 'R') {
    if (this.juniper) return vside === 'L' ? [C.L_CH4, C.L_CH5] : [C.R_CH4, C.R_CH5];
    return vside === 'L' ? [C.L_CH4, C.L_CH5, C.L_CH6] : [C.R_CH4, C.R_CH5, C.R_CH6];
  }

  turns(side?: Side) {
    return this.isCt
      ? this.pick(side, [C.L_FRONT_TURN], [C.R_FRONT_TURN])
      : this.pick(side, [C.L_FRONT_TURN, C.L_REAR_TURN], [C.R_FRONT_TURN, C.R_REAR_TURN]);
  }

  markers() {
    if (this.isCt) return [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_SIDE_REPEATER, C.R_SIDE_REPEATER];
    return [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_AUX_PARK, C.R_AUX_PARK];   // one output on Model Y
  }

  fogs() {
    return [C.L_FRONT_FOG, C.R_FRONT_FOG];
  }

  /** A Cybertruck's frunk light, low in the nose (a Model Y's aux park lamps are among its markers). */
  frunk() {
    return this.isCt ? [C.L_AUX_PARK] : [];
  }

  /** The red tail lights. A Cybertruck's channels there are white reverse lights: its tail is the rear bar. */
  tails() {
    return this.isCt ? [] : [C.L_TAIL, C.R_TAIL];
  }

  /** The rear turn signals (a Cybertruck has none of its own: its front turn channels light the corners). */
  rearTurns() {
    return this.isCt ? [] : [C.L_REAR_TURN, C.R_REAR_TURN];
  }

  rear() {
    const chs = [C.BRAKE, C.L_TAIL, C.R_TAIL, C.LICENSE_PLATE];
    return [...chs, ...(this.isCt ? [C.L_SIDE_REPEATER, C.R_SIDE_REPEATER] : [C.REAR_FOG])];
  }

  everything() {
    return [...this.heads(), ...this.accents(), ...this.turns(), ...this.markers(), ...this.fogs(), ...this.rear()];
  }

  /** One channel's column, frame by frame (a copy). */
  column(ch: number): Uint8Array {
    const out = new Uint8Array(this.nFrames);
    for (let f = 0; f < this.nFrames; f++) out[f] = this.frames[f * C.N_CHANNELS + ch];
    return out;
  }
}

/** One Car per letter, crowd-left to right (vehicles.ts). */
export function makeLineup(layout: string, nFrames: number, step: number): Car[] {
  return lineupCars(layout).map(([name, v], i) => new Car(v.kind, name, i, nFrames, step, v.juniper, !!v.falcon));
}
