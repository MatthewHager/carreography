"""How a lamp channel looks over time, and the 2025+ Model Y ("Juniper") lamp map.

Tesla's light channels are on/off with ramp codes (see channels.py): a byte of 128 or more is on,
and the six ramp bytes fade the lamp up or down over 0.5, 1 or 2 s. `lamp_level` replays that frame
by frame, giving 0..1 brightness.

The Juniper came out after Tesla's last light show documentation (Dec 2024). Two on-car tests in
Oct 2026 - teslamotors/light-show issue #183 and github.com/Nghtmare7509/tesla-lightshow-juniper
(CHANNELS.md, every channel tested alone) - agree:

  1/2 headlights, 3/4 lower white lamps, 13/14 amber turns - as before
  7/8   ("channel 4")  the front light bar's OUTER ends, one per side, fading
  11/12 ("channel 6")  the bar's whole CENTRE section, either channel, fading
  21/22 side repeaters on the front fenders (on/off)
  nothing: signature (5/6), channel 5 (9/10), fogs (15/16), aux park (17/18), side markers (19/20),
           and channels 47-174 - the bar is NOT 60 separately controlled LEDs (an earlier community
           claim, #144/#166, that it is was never shown on a car)

The choreography still speaks the Model Y's lamp vocabulary; `juniper_output` translates it to
the lamps the Juniper has, at the end:

  accents (signature + channels 4-5) on the crowd's left/right -> that outer end of the bar, plus
                                         the centre - so a side reads as end + centre, both as the whole bar
  fogs (low glow, bass pulses)       -> the bar's centre
  side markers / aux park            -> the fender repeaters
  flashes drawn on the bar's pixels (downbeats) -> the matching sections

It also keeps the 60-pixel picture on channels 47-106, in case a software version reads them.
"""

import numpy as np

from . import channels as C

RAMP_STEP = {C.ON_500: +0.04, C.ON_1000: +0.02, C.ON_2000: +0.01,
             C.OFF_500: -0.04, C.OFF_1000: -0.02, C.OFF_2000: -0.01}
BAR_ON = 0.35        # a pixel flash at least this bright switches its bar section on
END_LEDS = 15        # the share of the 60-pixel picture each outer end stands for


def lamp_level(col):
    """0..1 brightness of one lamp channel per 20 ms frame, following Tesla's ramp codes."""
    col = np.asarray(col)
    ramp = np.isin(col, list(RAMP_STEP))
    if not ramp.any():
        return (col >= 128).astype(float)
    out = np.zeros(len(col))
    lv = 0.0
    for i, v in enumerate(col):
        if ramp[i]:
            lv = min(1.0, max(0.0, lv + RAMP_STEP[int(v)]))
        else:
            lv = 1.0 if v >= 128 else 0.0
        out[i] = lv
    return out


def juniper_output(car, blend=6):
    """Translate a Model Y's lamp writes to the Juniper's lamps (see the module notes)."""
    f = car.frames
    bar = list(C.FRONT_BAR)
    n = len(bar)
    direct = f[:, bar].astype(float)[:, ::-1] / 255        # flashes drawn on the bar, crowd-left first
    acc_l = f[:, car.accents("L")].max(1)                   # bytes, so ramps stay ramps
    acc_r = f[:, car.accents("R")].max(1)
    fog = f[:, car.fogs()].max(1)
    lit = lambda x: np.where(x >= BAR_ON, C.ON, 0).astype(np.uint8)
    end_l = np.maximum(acc_l, lit(direct[:, :END_LEDS].mean(1)))
    end_r = np.maximum(acc_r, lit(direct[:, n - END_LEDS:].mean(1)))
    centre = np.maximum.reduce([acc_l, acc_r, fog, lit(direct[:, END_LEDS:n - END_LEDS].mean(1))])
    # the 60-pixel picture, for a car that reads the pixels: accents by halves, fogs in the middle
    left = np.max([lamp_level(f[:, ch]) for ch in car.accents("L")], axis=0)
    right = np.max([lamp_level(f[:, ch]) for ch in car.accents("R")], axis=0)
    w = np.clip((np.arange(n) - (n / 2 - blend / 2)) / blend, 0, 1)
    picture = left[:, None] * (1 - w)[None, :] + right[:, None] * w[None, :]
    picture = np.maximum(picture, lamp_level(fog)[:, None] * (np.abs(np.arange(n) - n / 2) < n / 4)[None, :])
    v = np.clip(picture * 255, 0, 255).astype(np.uint8)[:, ::-1]
    f[:, bar] = np.maximum(f[:, bar], v)
    # the sections: crowd-left end is the vehicle's right ("Right Channel 4")
    f[:, C.R_CH4], f[:, C.L_CH4] = end_l, end_r
    f[:, C.L_CH6] = f[:, C.R_CH6] = centre
    rep = f[:, car.markers()].max(1)
    f[:, C.L_SIDE_REPEATER] = np.maximum(f[:, C.L_SIDE_REPEATER], rep)
    f[:, C.R_SIDE_REPEATER] = np.maximum(f[:, C.R_SIDE_REPEATER], rep)
