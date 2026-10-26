"""The legato style: light for slow, flowing music with no beat to lock to (Ave Maria).

The rest of the generator finds its timing in beats, drums and note attacks; a sustained, rubato
song gives it little of either, and the beat-driven moves leave long stretches dark. Here the light
follows the music's breath and its melody instead:

  bed      lamps join and leave in layers as the music swells and fades, always on 2 s ramps:
             0  the truck's bar glows softly (dimmable, so its brightness follows the loudness)
             1  the Ys' signature strips              (most of the song)
             2  the Ys' DRLs                          (louder than ~40 % of the song)
             3  every fog lamp                        (louder than ~70 %)
             4  every headlight - the bloom           (the loudest ~10 %: the climax)
           thresholds come from the song's own loudness, with hysteresis and a minimum dwell so a
           layer never flickers; the stage is never dark while music plays
  swoop    the melody as one soft light gliding across the stage by pitch (low = crowd's left):
           a bright spot sliding along the truck's bar, and on the Ys the inner beam on that side
           fading in and out as the melody passes - legato, overlapping, never a blink. The
           headlights are kept for the swoop and the bloom, so the swoop always shows
  colour   the interiors glow from deep blue toward warm gold as the music swells
  ending   a slow fade to dark as the music ends (no closing flash)

Car lamps can't hold a dim level - only on or off, with 0.5/1/2 s ramps (Tesla's README) - so
loudness becomes how many lamps are lit, plus the parts that really dim: the bar and the interiors.
"""

import numpy as np

from . import channels as C

RES = 0.25                                  # seconds per control step
LAYER_PCT = (12, 40, 70, 90)                 # loudness percentiles at which layers 1-4 come in
HYST = 0.04                                  # ...and go out this much lower
MIN_DWELL = 2.5                              # seconds a layer stays once it changes


def loudness(an):
    """Loudness 0-1 on a RES grid: the intensity curve smoothed over ~3 s, ranked within the song
    and blended with its level below the song's peak (so a quiet song still breathes)."""
    step = an.step
    k = max(1, int(3.0 / step))
    sm = np.convolve(an.intensity, np.ones(k) / k, mode="same")
    db = 20 * np.log10(np.maximum(sm, 1e-4))
    absolute = np.clip((db - (db.max() - 24)) / 24, 0, 1)
    rank = np.argsort(np.argsort(sm)) / max(len(sm) - 1, 1)
    level = 0.55 * absolute + 0.45 * rank
    idx = np.arange(0, len(level), max(1, int(RES / step)))
    return level[idx]


def music_span(an):
    """(start, end) of the audible music: the first and last moments within 30 dB of the peak."""
    db = 20 * np.log10(np.maximum(an.intensity, 1e-4))
    on = np.flatnonzero(db > db.max() - 30)
    if not len(on):
        return 0.0, an.duration
    return on[0] * an.step, (on[-1] + 1) * an.step


def layers(L, live):
    """Layer count (0-4) per RES step, with hysteresis and a minimum dwell; the thresholds are
    percentiles of the song's own loudness, so every song uses its whole range."""
    up = np.percentile(L[live], LAYER_PCT) if np.any(live) else np.array([0.2, 0.4, 0.6, 0.8])
    out = np.zeros(len(L), int)
    cur, since = 0, -1e9
    for i, v in enumerate(L):
        t = i * RES
        want = cur
        while want < 4 and v >= up[want]:
            want += 1
        while want > 0 and v < up[want - 1] - HYST:
            want -= 1
        if want != cur and t - since >= MIN_DWELL:
            cur = cur + (1 if want > cur else -1)       # one layer at a time
            since = t
        out[i] = cur
    return out


def _runs(mask):
    edges = np.flatnonzero(np.diff(np.concatenate([[0], mask.astype(int), [0]])))
    return list(zip(edges[::2], edges[1::2]))


def _glow(car, chs, t0, t1, up=C.ON_2000, down=C.OFF_2000, down_s=2.0):
    car.light(chs, t0, t1, up)
    car.light(chs, t1, t1 + down_s, down)


def melody_path(an, t0, t1, n):
    """Stage position 0-1 (crowd's left to right) of the melody on a RES grid, None where no melody
    sounds: the top notes of the transcription, gliding from one note to the next."""
    ev = an.events
    pos = np.full(n, np.nan)
    if ev is None or not len(ev):
        return pos
    lo, hi = np.percentile(ev.top, 5), np.percentile(ev.top, 95)
    strong = ev.amp >= np.percentile(ev.amp, 35)
    t, top, dur = ev.t[strong], ev.top[strong], ev.dur[strong]
    for i in range(len(t)):
        a = int(t[i] / RES)
        b = int(min(t[i] + max(dur[i], 0.4), t[i + 1] if i + 1 < len(t) else t[i] + dur[i]) / RES) + 1
        p = float(np.clip((top[i] - lo) / max(hi - lo, 1), 0, 1))
        pos[a:min(b, n)] = p
    # glide: smooth across ~0.75 s where the melody is continuous
    k = 3
    out = pos.copy()
    for i in range(n):
        w = pos[max(0, i - k):i + k + 1]
        w = w[~np.isnan(w)]
        if len(w) and not np.isnan(pos[i]):
            out[i] = w.mean()
    a, b = int(t0 / RES), int(t1 / RES)
    out[:a] = np.nan
    out[b:] = np.nan
    return out


def choreograph(cars, an):
    """All the lights for a legato song (the motors are scheduled separately, as for any song)."""
    ct = next((c for c in cars if c.is_ct), None)
    order = sorted(cars, key=lambda q: q.x)
    start, end = music_span(an)
    L = loudness(an)
    n = len(L)
    tt = np.arange(n) * RES
    live = (tt >= start) & (tt < end)
    L = np.where(live, L, 0)
    lay = np.where(live, layers(L, live), -1)

    # 1. the bed, layer by layer
    groups = {1: lambda c: c.sig() if not c.is_ct else [],
              2: lambda c: c.drl() if not c.is_ct else [],
              3: lambda c: c.fogs(),
              4: lambda c: c.heads()}
    for k, group in groups.items():
        for a, b in _runs(lay >= k):
            for c in cars:
                chs = group(c)
                if chs:
                    _glow(c, chs, a * RES, b * RES)

    # the truck's bar: a glow that follows the loudness (it dims), plus the melody's spot below
    if ct is not None:
        f0, f1 = ct.fr(start), ct.fr(end)
        frame_t = np.arange(f0, f1) * ct.step
        level = np.interp(frame_t, tt, L)
        fade_in = np.clip((frame_t - start) / 4.0, 0, 1)
        fade_out = np.clip((end - frame_t) / 3.0, 0, 1)
        base = (0.06 + 0.24 * level) * fade_in * fade_out
        ct.pixels(C.FRONT_BAR, start, np.repeat(base[:, None], len(C.FRONT_BAR), 1))

    # 2. the swoop: the melody gliding across the stage
    path = melody_path(an, start, end, n)
    stage = path * 6                                   # six slots: Y-left, Y-left, truck, truck, Y-right, Y-right
    for slot in range(6):
        car = order[slot // 2]
        side = "L" if slot % 2 == 0 else "R"
        if car.is_ct:
            continue
        here = (~np.isnan(stage)) & (np.floor(np.nan_to_num(stage, nan=-1)) == slot)
        for a, b in _runs(here):
            if (b - a) * RES >= 0.5:
                _glow(car, car.inner(side), a * RES, b * RES + 0.25, up=C.ON_1000, down=C.OFF_2000)
    if ct is not None:
        f0 = ct.fr(start)
        m = ct.fr(end) - f0
        frame_t = f0 * ct.step + np.arange(m) * ct.step
        s = np.interp(frame_t, tt, np.nan_to_num(stage, nan=-10))
        on_truck = (s >= 1.5) & (s <= 4.5)
        centre = np.clip((s - 2) / 2, 0, 1) * (len(C.FRONT_BAR) - 1)
        leds = np.arange(len(C.FRONT_BAR))
        spot = np.exp(-((leds[None, :] - centre[:, None]) / 6.0) ** 2) * on_truck[:, None] * 0.9
        ct.pixels(C.FRONT_BAR, start, spot)

    # 3. colour: the interiors from deep blue toward warm gold as the music swells
    cold, warm = np.array([20, 40, 140]), np.array([255, 160, 50])
    for i in range(n):
        if not live[i]:
            continue
        v = float(L[i])
        colour = (cold + (warm - cold) * v).astype(int)
        for c in cars:
            c.rgb(i * RES, (i + 1) * RES, colour, scale=0.3 + 0.7 * v)

    # 4. the ending: everything that's lit fades out slowly as the music ends
    for c in cars:
        c.set(c.everything(), end, an.duration, 0)
        lit = [ch for ch in c.everything() if c.frames[min(c.fr(end) - 1, c.n_frames - 1), ch] > 0]
        if lit:
            c.light(lit, end, min(an.duration, end + 2.0), C.OFF_2000)
    return {"start": start, "end": end, "layers": lay}
