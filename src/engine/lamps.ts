// How a lamp channel looks over time, and the 2025+ Model Y ("Juniper") lamp map.
//
// Tesla's light channels are on/off with ramp codes (see channels.ts): a byte of 128 or more is on,
// and the six ramp bytes fade the lamp up or down over 0.5, 1 or 2 s. `lampLevel` replays that frame
// by frame, giving 0..1 brightness.
//
// The Juniper came out after Tesla's last light show documentation (Dec 2024). Two on-car tests in
// Oct 2026 - teslamotors/light-show issue #183 and github.com/Nghtmare7509/tesla-lightshow-juniper
// (CHANNELS.md, every channel tested alone) - agree:
//
//   1/2 headlights, 3/4 lower white lamps, 13/14 amber turns - as before
//   7/8   ("channel 4")  the front light bar's OUTER ends, one per side, fading
//   11/12 ("channel 6")  the bar's whole CENTRE section, either channel, fading
//   21/22 side repeaters on the front fenders (on/off)
//   nothing: signature (5/6), channel 5 (9/10), fogs (15/16), aux park (17/18), side markers (19/20),
//            and channels 47-174 - the bar is NOT 60 separately controlled LEDs (an earlier community
//            claim, #144/#166, that it is was never shown on a car)
//
// The choreography still speaks the Model Y's lamp vocabulary; `juniperOutput` translates it to
// the lamps the Juniper has, at the end:
//
//   signature on the crowd's left/right   -> that outer end of the bar, plus the centre: a side's accents
//                                          read as end + centre, both sides as the whole bar
//   channels 4-5 (the DRL) on one side     -> that outer end alone
//   fogs (low glow, bass pulses)       -> the bar's centre
//   side markers / aux park            -> the fender repeaters
//   flashes drawn on the bar's pixels (downbeats) -> the matching sections
//
// It also keeps the 60-pixel picture on channels 47-106, in case a software version reads them.

import * as C from './channels';
import type { Car } from './car';
import { clip, mean, u8 } from './np';

const RAMP_STEP = new Map<number, number>([
  [C.ON_500, +0.04], [C.ON_1000, +0.02], [C.ON_2000, +0.01],
  [C.OFF_500, -0.04], [C.OFF_1000, -0.02], [C.OFF_2000, -0.01],
]);
const BAR_ON = 0.35;        // a pixel flash at least this bright switches its bar section on
export const END_LEDS = 15;       // the share of the 60-pixel picture each outer end stands for

/** 0..1 brightness of one lamp channel per 20 ms frame, following Tesla's ramp codes. */
function lampLevel(col: ArrayLike<number>): Float64Array {
  const out = new Float64Array(col.length);
  let ramp = false;
  for (let i = 0; i < col.length; i++) if (RAMP_STEP.has(col[i])) { ramp = true; break; }
  if (!ramp) {
    for (let i = 0; i < col.length; i++) out[i] = col[i] >= 128 ? 1 : 0;
    return out;
  }
  let lv = 0.0;
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    const step = RAMP_STEP.get(v);
    if (step !== undefined) lv = Math.min(1.0, Math.max(0.0, lv + step));
    else lv = v >= 128 ? 1.0 : 0.0;
    out[i] = lv;
  }
  return out;
}

/** Translate a Model Y's lamp writes to the Juniper's lamps (see the module notes). */
export function juniperOutput(car: Car): void {
  const blend = 6;                                       // LEDs over which the left half fades into the right
  const f = car.frames;
  const N = C.N_CHANNELS;
  const nF = car.nFrames;
  const bar = [...C.FRONT_BAR];
  const n = bar.length;
  const accL = car.accents('L'), accR = car.accents('R'), sigL = car.sig('L'), sigR = car.sig('R');
  const fogs = car.fogs();
  const maxOf = (chs: readonly number[], fr: number) => {
    let m = 0;
    for (const ch of chs) if (f[fr * N + ch] > m) m = f[fr * N + ch];
    return m;
  };
  const lit = (x: number) => (x >= BAR_ON ? C.ON : 0);
  const fogArr = new Uint8Array(nF);
  const endL = new Uint8Array(nF), endR = new Uint8Array(nF), centre = new Uint8Array(nF);
  const row = new Float64Array(n);                       // flashes drawn on the bar, crowd-left first
  for (let fr = 0; fr < nF; fr++) {
    for (let k = 0; k < n; k++) row[k] = f[fr * N + bar[n - 1 - k]] / 255;
    const al = maxOf(accL, fr), ar = maxOf(accR, fr), fg = maxOf(fogs, fr);
    fogArr[fr] = fg;
    endL[fr] = Math.max(al, lit(mean(row, 0, END_LEDS)));
    endR[fr] = Math.max(ar, lit(mean(row, n - END_LEDS, n)));
    centre[fr] = Math.max(maxOf(sigL, fr), maxOf(sigR, fr), fg, lit(mean(row, END_LEDS, n - END_LEDS)));
  }
  // the 60-pixel picture, for a car that reads the pixels: accents by halves, fogs in the middle
  const colLevels = (chs: readonly number[]) => chs.map((ch) => {
    const col = new Uint8Array(nF);
    for (let fr = 0; fr < nF; fr++) col[fr] = f[fr * N + ch];
    return lampLevel(col);
  });
  const maxLevels = (ls: Float64Array[]) => {
    const out = new Float64Array(nF);
    for (let fr = 0; fr < nF; fr++) {
      let m = -Infinity;
      for (const l of ls) if (l[fr] > m) m = l[fr];
      out[fr] = m;
    }
    return out;
  };
  const left = maxLevels(colLevels(accL));
  const right = maxLevels(colLevels(accR));
  const w = new Float64Array(n);
  for (let k = 0; k < n; k++) w[k] = clip((k - (n / 2 - blend / 2)) / blend, 0, 1);
  const fogLevel = lampLevel(fogArr);
  const mid = new Float64Array(n);
  for (let k = 0; k < n; k++) mid[k] = Math.abs(k - n / 2) < n / 4 ? 1 : 0;
  for (let fr = 0; fr < nF; fr++) {
    for (let k = 0; k < n; k++) {
      let p = left[fr] * (1 - w[k]) + right[fr] * w[k];
      p = Math.max(p, fogLevel[fr] * mid[k]);
      const v = u8(clip(p * 255, 0, 255));
      const at = fr * N + bar[n - 1 - k];            // reversed: Tesla numbers it from the vehicle's left
      if (f[at] < v) f[at] = v;
    }
  }
  // the sections: crowd-left end is the vehicle's right ("Right Channel 4")
  for (let fr = 0; fr < nF; fr++) {
    f[fr * N + C.R_CH4] = endL[fr];
    f[fr * N + C.L_CH4] = endR[fr];
    f[fr * N + C.L_CH6] = f[fr * N + C.R_CH6] = centre[fr];
  }
  const markers = car.markers();
  for (let fr = 0; fr < nF; fr++) {
    const rep = maxOf(markers, fr);
    f[fr * N + C.L_SIDE_REPEATER] = Math.max(f[fr * N + C.L_SIDE_REPEATER], rep);
    f[fr * N + C.R_SIDE_REPEATER] = Math.max(f[fr * N + C.R_SIDE_REPEATER], rep);
  }
}
