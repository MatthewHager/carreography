// The 2025+ Model Y's ("Juniper") lamps, which came out after Tesla's last light show documentation (Dec
// 2024). Two on-car tests in Oct 2026 - teslamotors/light-show issue #183 and
// github.com/Nghtmare7509/tesla-lightshow-juniper (CHANNELS.md, every channel tested alone) - agree:
//
//   1/2 headlights, 3/4 lower white lamps, 13/14 amber turns - as before
//   7/8   ("channel 4")  the front light bar's OUTER ends, one per side, fading
//   11/12 ("channel 6")  the bar's whole CENTRE section, either channel, fading
//   21/22 side repeaters on the front fenders (on/off)
//   nothing: signature (5/6), channel 5 (9/10), fogs (15/16), aux park (17/18), side markers (19/20),
//            and channels 47-174 - the bar is NOT 60 separately controlled LEDs
//
// The choreography speaks the Model Y's lamp vocabulary; `juniperOutput` translates it to the lamps the
// Juniper has, at the end, since Tesla's hardware reads only these:
//
//   signature on the crowd's left/right   -> that outer end of the bar, plus the centre: a side's accents
//                                          read as end + centre, both sides as the whole bar
//   channels 4-5 (the DRL) on one side     -> that outer end alone
//   fogs (low glow, bass pulses)           -> the bar's centre
//   side markers / aux park                -> the fender repeaters
//   flashes drawn on the bar's pixels      -> the matching sections

import * as C from './channels';
import type { Car } from './car';
import { mean } from './np';

const BAR_ON = 0.35;              // a pixel flash at least this bright switches its bar section on
const END_LEDS = 15;              // the share of the 60-pixel picture each outer end stands for

/** Translate a Model Y's lamp writes to the Juniper's lamps (see the module notes). */
export function juniperOutput(car: Car): void {
  const f = car.frames, N = C.N_CHANNELS, bar = C.FRONT_BAR, n = bar.length;
  const accL = car.accents('L'), accR = car.accents('R'), sigs = [...car.sig('L'), ...car.sig('R')];
  const fogs = car.fogs(), markers = car.markers();
  const maxOf = (chs: readonly number[], fr: number) => {
    let m = 0;
    for (const ch of chs) if (f[fr * N + ch] > m) m = f[fr * N + ch];
    return m;
  };
  const lit = (a: number, b: number, fr: number) => {      // pixels a..b of the bar, crowd-left first
    const row = Array.from({ length: b - a }, (_, k) => f[fr * N + bar[n - 1 - a - k]] / 255);
    return mean(row) >= BAR_ON ? C.ON : 0;
  };
  for (let fr = 0; fr < car.nFrames; fr++) {
    // the crowd-left end is the vehicle's right ("Right Channel 4")
    const endL = Math.max(maxOf(accL, fr), lit(0, END_LEDS, fr));
    const endR = Math.max(maxOf(accR, fr), lit(n - END_LEDS, n, fr));
    const centre = Math.max(maxOf(sigs, fr), maxOf(fogs, fr), lit(END_LEDS, n - END_LEDS, fr));
    f[fr * N + C.R_CH4] = endL;
    f[fr * N + C.L_CH4] = endR;
    f[fr * N + C.L_CH6] = f[fr * N + C.R_CH6] = centre;
    const rep = maxOf(markers, fr);
    for (const ch of [C.L_SIDE_REPEATER, C.R_SIDE_REPEATER]) f[fr * N + ch] = Math.max(f[fr * N + ch], rep);
  }
}
