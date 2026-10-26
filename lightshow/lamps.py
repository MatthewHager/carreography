"""How a lamp channel looks over time, and the 2025+ Model Y ("Juniper") front light bar.

Tesla's light channels are on/off with ramp codes (see channels.py): a byte of 128 or more is on,
and the six ramp bytes fade the lamp up or down over 0.5, 1 or 2 s. `lamp_level` replays that frame
by frame, giving 0..1 brightness.

The Juniper Model Y came out after Tesla's last light show documentation (Dec 2024), and the
community reports two different ways its front light bar is driven:

  * a 60-LED pixel bar on the Cybertruck's front-bar channels (47-106, 1-based), reported in
    teslamotors/light-show issues #144 and #166;
  * the whole bar as one lamp on channel 6 (11 or 12, 1-based), fading with the ramp codes, with
    the pixel channels doing nothing - an on-car test of a 2027 Model Y in issue #183. The same
    test found channel 4 drives the outer white strips by the headlights.

So a Juniper car gets both, carrying the same picture: the pixels for spatial effects if the car
reads them, and channel 6 for the bar as a whole if it reads that instead. On the Juniper the bar
takes the place the signature/DRL strip had on earlier Model Ys, so the bar shows the car's accent
lamps - the crowd-left accents on the crowd-left half, the right ones on the right half - plus
anything the choreography wrote to the bar's pixels directly (downbeat flashes).
"""

import numpy as np

from . import channels as C

RAMP_STEP = {C.ON_500: +0.04, C.ON_1000: +0.02, C.ON_2000: +0.01,
             C.OFF_500: -0.04, C.OFF_1000: -0.02, C.OFF_2000: -0.01}
BAR_ON = 0.35        # a pixel picture at least this bright switches the whole-bar channel on


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


def juniper_bar(car, blend=6):
    """Fill a Juniper Model Y's front bar from its accent lamps and drive the whole-bar channel."""
    bar = list(C.FRONT_BAR)
    n = len(bar)
    direct = car.frames[:, bar].max(1) / 255.0              # what the choreography wrote itself
    left = np.max([lamp_level(car.frames[:, ch]) for ch in car.accents("L")], axis=0)
    right = np.max([lamp_level(car.frames[:, ch]) for ch in car.accents("R")], axis=0)
    # crowd-left half follows the crowd-left accents, with a short crossfade in the middle
    w = np.clip((np.arange(n) - (n / 2 - blend / 2)) / blend, 0, 1)     # 0 left .. 1 right
    picture = left[:, None] * (1 - w)[None, :] + right[:, None] * w[None, :]
    v = np.clip(picture * 255, 0, 255).astype(np.uint8)[:, ::-1]   # LEDs count from the vehicle's left
    car.frames[:, bar] = np.maximum(car.frames[:, bar], v)
    # whole bar: the accent bytes themselves (so ramps stay ramps), or on while a flash is bright
    whole = car.frames[:, car.accents()].max(1)
    whole = np.where(direct >= BAR_ON, np.maximum(whole, C.ON), whole)
    for ch in (C.L_CH6, C.R_CH6):
        car.frames[:, ch] = whole

