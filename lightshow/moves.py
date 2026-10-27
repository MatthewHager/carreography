"""The move library: whole-stage choreography for one phrase at a time, seen from the front.

Stage, left to right as the crowd sees it: left Model Y (two sides), Cybertruck (two headlight
sides plus a continuous 60-LED bar), right Model Y (two sides) — six slots and a bar.

  keyboard    lowest note on the left, highest on the right, one flash per note (the phrase's own
              pitch range is stretched across the stage, so every phrase uses every car)
  lr_notes    zigzag figuration: notes above the phrase's middle hit the right Y, below hit the
              left Y, the truck's bar tracks the pitch
  lr_beat     left Y / right Y alternate on the beat; notes only tick on the truck bar
  rotation    left, centre, right, left... one car per note
  mirror      low notes light both Ys together, high notes light the truck (symmetry)
  out_in      a crescendo: the lit region grows from the outer corners toward the truck, which
              pops at the end
  in_out      the reverse: from the truck outward
  meter       loudness: the truck bar fills from the centre with the volume, the Ys join as it rises;
              notes tick as comets
  pulse       slow notes: each held for its length with a soft release
  block       chords: every slot the chord spans, held
  all_on      a beat of black, then everything, released with a ramp
  shimmer     trills
  motif       the Toccata's mordent-and-run: quick notes on the truck, the run sweeps the stage,
              the landing note holds on the car it lands on while every interior glow
"""

import numpy as np

from . import channels as C

ON, OFF_500, ON_500, OFF_1000 = C.ON, C.OFF_500, C.ON_500, C.OFF_1000


# --- helpers -----------------------------------------------------------------------------------

def slots6(cars):
    """Every (car, side) on the stage, crowd-left to right."""
    return [(c, s) for c in cars for s in ("L", "R")]


def centre_truck(cars):
    """The centrepiece: the Cybertruck nearest the middle of the line (its 60-LED bar carries the
    comets, sweeps and crescendo pops), or None if the lineup has no Cybertruck."""
    trucks = [c for c in cars if c.is_ct]
    if not trucks:
        return None
    mid = (len(cars) - 1) / 2
    return min(trucks, key=lambda c: (abs(cars.index(c) - mid), cars.index(c)))


def sides(cars):
    """Every car but the centrepiece, crowd-left to right: the cars that play their 8 front lamps.
    In the classic Model Y | Cybertruck | Model Y line these are the two Ys."""
    ct = centre_truck(cars)
    return [c for c in cars if c is not ct] or list(cars)   # a lone truck plays both parts


CENTRE_SHARE = 4 / 3   # the centrepiece's share of the pitch range against a side car's (40% vs 30% of 3)


def slot_for(cars, pitch, lo, hi):
    """Pitch -> (car, side, position along a truck's bar or None): low notes on the crowd's left, high on the
    right; the centrepiece truck's bar takes a wider share so runs sweep across it."""
    pos = float(np.clip((pitch - lo) / max(hi - lo, 1e-9), 0, 1))
    ct = centre_truck(cars)
    widths = np.array([CENTRE_SHARE if c is ct else 1.0 for c in cars])
    edges = np.concatenate([[0.0], np.cumsum(widths) / widths.sum()])
    idx = min(len(cars) - 1, int(np.searchsorted(edges, pos, side="right")) - 1)
    within = (pos - edges[idx]) / (edges[idx + 1] - edges[idx])
    car = cars[idx]
    return car, ("L" if within < 0.5 else "R"), (within if car.is_ct else None)   # any truck plays its bar


def comet(car, t, pos, dur, amp=1.0, width=6):
    n = max(2, car.fr(t + dur) - car.fr(t))
    leds = np.arange(len(C.FRONT_BAR))
    shape = np.exp(-((leds - pos * (len(leds) - 1)) / width) ** 2)
    env = np.linspace(1, 0, n) ** 1.5
    car.pixels(C.FRONT_BAR, t, amp * env[:, None] * shape[None, :])


def bar_fill(car, t, dur, level, from_centre=True, env=None):
    """Light `level` (0..1) of the bar, growing from the centre (or from both edges inward)."""
    n = max(1, car.fr(t + dur) - car.fr(t))
    if not np.isscalar(level):
        n = min(n, len(level))
    leds = len(C.FRONT_BAR)
    d = np.abs(np.linspace(-1, 1, leds))            # 0 centre .. 1 edge
    lv = np.full(n, level) if np.isscalar(level) else np.asarray(level)[:n]
    mask = (d[None, :] <= lv[:, None]) if from_centre else ((1 - d)[None, :] <= lv[:, None])
    e = np.ones(n) if env is None else np.asarray(env)[:n]
    car.pixels(C.FRONT_BAR, t, mask * e[:, None])


def bar_flash(car, t, dur, level=1.0):
    n = max(2, car.fr(t + dur) - car.fr(t))
    env = np.linspace(level, 0, n)[:, None]
    car.pixels(C.FRONT_BAR, t, np.repeat(env, len(C.FRONT_BAR), 1))


def msd(car, side, cars=None):
    """Mirror a side for the car on the crowd's right, so "L" means *outer* on both outer cars.
    Used wherever a side is picked by rhythm or alternation rather than by pitch position; the
    stage-wide sweeps (keyboard, wave, motif) keep true left-to-right order."""
    centre = 1.0 if cars is None else sum(c.x for c in cars) / len(cars)
    if car.x > centre:
        return "R" if side == "L" else "L"
    return side


def hit(car, side, t, dur, heads=True, value=ON):
    """One slot flash: accents (Y) / side marker + headlight side (truck)."""
    chs = car.accents(side) + (car.heads(side) if heads or car.is_ct else [])
    car.light(chs, t, t + dur, value)


def flash_len(ev, i, fast_cut=9.0):
    d = float(ev.dur[i])
    return 0.08 if ev.density[i] >= fast_cut else float(np.clip(d, 0.1, 0.2))


def phrase_range(ph, an):
    """Pitch bounds used to spread this phrase across the stage."""
    if ph.hi - ph.lo >= 12:
        return ph.lo, ph.hi
    mid = (ph.lo + ph.hi) / 2
    return mid - 6, mid + 6


# --- moves -------------------------------------------------------------------------------------

def keyboard(cars, an, ph, heads=False):
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        voices = [ev.top[i]] if ev.kind[i] == 0 else [ev.top[i], ev.low[i]]
        for p in voices:
            car, side, within = slot_for(cars, p, lo, hi)
            if car.is_ct:
                comet(car, t, within, d + 0.15, amp=0.7 + 0.3 * ev.amp[i])
                car.flash(car.heads(side), t, d)
            else:
                hit(car, side, t, d, heads=heads)


def lr_notes(cars, an, ph):
    ev = an.events
    ct = centre_truck(cars)
    outer = sides(cars) or cars
    median = float(np.median(ev.top[ph.a:ph.b]))
    lo, hi = phrase_range(ph, an)
    # In band songs a note only strobes a Y when it sits on a beat subdivision (eighths); the rest
    # ride on the truck's bar, so the sides read as rhythm, not as blinking.
    band = getattr(an, "driver", "") in ("band", "vocal_band")
    sub = None
    if band and len(an.beats) > 2:
        b = an.beats
        sub = np.sort(np.concatenate([b, (b[:-1] + b[1:]) / 2]))
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        high = ev.top[i] >= median
        car = outer[-1] if high else outer[0]
        side = msd(car, "L" if (i - ph.a) % 2 == 0 else "R", cars)
        on_grid = sub is None or np.min(np.abs(sub - t)) < 0.07
        if on_grid:
            hit(car, side, t, d, heads=True)
        if ct is not None:
            pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 1))
            comet(ct, t, pos, d + 0.12, amp=0.8)


def lr_beat(cars, an, ph):
    ev = an.events
    ct = centre_truck(cars)
    outer = sides(cars) or cars
    beats = an.beats[(an.beats >= ph.t0 - 0.05) & (an.beats < ph.t1)]
    downs = set(np.round(an.downbeats, 3))
    for k, b in enumerate(beats):
        car = outer[k % len(outer)]
        hit(car, "L", b, 0.14, heads=True)
        hit(car, "R", b, 0.14, heads=True)
        if round(float(b), 3) in downs and ct is not None:
            bar_flash(ct, b, 0.3)
    lo, hi = phrase_range(ph, an)
    if ct is not None:
        for i in range(ph.a, ph.b):
            pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 1))
            comet(ct, float(ev.t[i]), pos, 0.2, amp=0.7)


def rotation(cars, an, ph, order=None):
    ev = an.events
    order = order or list(range(len(cars)))
    for k, i in enumerate(range(ph.a, ph.b)):
        car = cars[order[k % len(order)]]
        t, d = float(ev.t[i]), flash_len(ev, i)
        side = msd(car, "L" if k % 2 == 0 else "R", cars)
        hit(car, side, t, d, heads=True)
        if car.is_ct:
            comet(car, t, 0.3 if side == "L" else 0.7, d + 0.15)


def mirror(cars, an, ph):
    ev = an.events
    ct = centre_truck(cars)
    outer = sides(cars)
    median = float(np.median(ev.top[ph.a:ph.b]))
    for k, i in enumerate(range(ph.a, ph.b)):
        t, d = float(ev.t[i]), flash_len(ev, i)
        if ev.top[i] >= median and ct is not None:
            side = "L" if k % 2 == 0 else "R"
            ct.flash(ct.heads(side), t, d)
            comet(ct, t, 0.3 if side == "L" else 0.7, d + 0.15)
        else:
            # Mirrored: left Y's outer side with right Y's outer side, then the inner pair.
            inner = k % 2 == 1
            for c in outer:
                side = ("R" if c.x < (ct.x if ct else 1) else "L") if inner else ("L" if c.x < (ct.x if ct else 1) else "R")
                hit(c, side, t, d, heads=False)


def out_in(cars, an, ph, reverse=False):
    """A crescendo: participation grows from the Ys' outer corners inward to the truck. Every note
    ticks (short flashes) in whatever part of the stage is active; the truck bar fills toward the
    centre; the truck's headlights join only in the last stage; a beat of black, then the pop."""
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    ct = centre_truck(cars)
    ys = sides(cars)
    f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
    e = an.intensity[f0:f1]
    rising = len(e) > 10 and e[-len(e) // 4:].mean() > e[: len(e) // 4].mean() * 1.15
    span = max(ph.t1 - ph.t0, 0.5)
    # Stage k lights these (car, lamp-list) groups per note.
    stages = []
    for k in range(4):
        groups = []
        for c in ys:
            outer = "L" if c.x < (ct.x if ct else 1) else "R"
            inner = "R" if outer == "L" else "L"
            if k >= 0: groups.append((c, c.sig(outer) + c.drl(outer)))
            if k >= 1: groups.append((c, c.sig(inner) + c.drl(inner)))
            if k >= 2: groups.append((c, c.heads(outer)))
            if k >= 3: groups.append((c, c.heads(inner)))
        stages.append(groups)
    if reverse:
        stages = stages[::-1]
    if ct is not None:
        # The bar fills a step per note (stairs, not a ramp), each new step flaring then settling,
        # so the growth is felt as the music drives it.
        n = f1 - f0
        count = max(1, ph.b - ph.a)
        level = np.zeros(n)
        flare = np.zeros(n)
        for j, i in enumerate(range(ph.a, ph.b)):
            k = max(0, min(n - 1, int((float(ev.t[i]) - ph.t0) / an.step)))
            level[k:] = (j + 1) / count
            flare[k:k + 6] = np.maximum(flare[k:k + 6], np.linspace(1, 0, min(6, n - k)))
        lv = level if not reverse else 1 - level
        bar_fill(ct, ph.t0, span, lv * 0.9, from_centre=reverse, env=0.55 + 0.45 * flare)
    for j, i in enumerate(range(ph.a, ph.b)):
        t = float(ev.t[i])
        k = min(3, int((t - ph.t0) / span * 4))
        groups = stages[k]
        car, chs = groups[j % len(groups)]
        car.light(chs, t, t + 0.08)
        if ct is not None:
            pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 1))
            comet(ct, t, pos, 0.15, amp=0.4 + 0.2 * k)
            if k >= 3:
                ct.flash(ct.heads("L" if pos < 0.5 else "R"), t, 0.08)
    # The swell: from 60% through, the Ys' inner beams ramp up over 2 s; from 80%, the outer
    # beams too, so the build gets physically brighter on the way up.
    for c in ys:
        c.light(c.inner(), ph.t0 + 0.6 * span, ph.t1, C.ON_2000)
        c.light(c.outer(), ph.t0 + 0.8 * span, ph.t1, C.ON_2000)
    _land(cars, an, ph, ct, pop=(rising or _lands_on_hold(an, ph)))


def _lands_on_hold(an, ph):
    ev = an.events
    return ev.dur[ph.b - 1] >= 0.8 or (ph.b < len(ev) and ev.kind[ph.b] >= 2 and ev.t[ph.b] - ph.t1 < 0.6)


def _land(cars, an, ph, ct, pop):
    """The top of a build: a beat of black, the pop, and if the music lands on a held chord,
    everything stays on for the chord and releases with it."""
    if not pop:
        return
    ev = an.events
    hold = float(min(2.5, max(0.35, ev.dur[ph.b - 1] if ev.dur[ph.b - 1] >= 0.8 else 0.35)))
    for c in cars:
        c.set(c.everything(), ph.t1 - 0.16, ph.t1, 0)
        c.set(list(C.FRONT_BAR), ph.t1 - 0.16, ph.t1, 0)
        c.light(c.everything(), ph.t1, ph.t1 + hold)
        c.light(c.everything(), ph.t1 + hold, ph.t1 + hold + 0.8, OFF_500)
        c.rgb(ph.t1, ph.t1 + hold, (255, 255, 255), 0.8)
    if ct is not None:
        n = max(2, ct.fr(ph.t1 + hold + 0.5) - ct.fr(ph.t1))
        env = np.concatenate([np.ones(max(1, n - 25)), np.linspace(1, 0, min(n, 25))])[:n, None]
        ct.pixels(C.FRONT_BAR, ph.t1, np.repeat(env, len(C.FRONT_BAR), 1))


def meter(cars, an, ph):
    ev = an.events
    ct = centre_truck(cars)
    f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
    e = an.loud_fast[f0:f1]          # fast loudness: the bar breathes with every note and swell
    e = (e - e.min()) / max(np.ptp(e), 1e-6) if np.ptp(e) > 0.05 else np.full_like(e, 0.5)
    if ct is not None:
        bar_fill(ct, ph.t0, ph.t1 - ph.t0, 0.2 + 0.75 * e, from_centre=True)
    outer = sides(cars)
    # The Ys answer the volume on each beat: inner sides above 0.45, the whole front above 0.75.
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    for b in beats:
        lvl = float(e[min(len(e) - 1, int((b - ph.t0) / an.step))])
        for c in outer:
            inner = "R" if c.x < (ct.x if ct else 1) else "L"
            outer_side = "L" if inner == "R" else "R"
            if lvl > 0.45:
                c.flash(c.accents(inner), b, 0.12 + 0.2 * lvl)
            if lvl > 0.75:
                c.flash(c.accents(outer_side) + c.heads(), b, 0.12 + 0.2 * lvl)
    # Every note still ticks: a comet on the bar, and a short keyboard tick on the Ys' accents,
    # so the Ys read the melody while the truck reads the volume.
    lo, hi = phrase_range(ph, an)
    for i in range(ph.a, ph.b):
        t = float(ev.t[i])
        car, side, within = slot_for(cars, ev.top[i], lo, hi)
        if car.is_ct:
            if ct is not None:
                comet(ct, t, within if within is not None else 0.5, 0.2, amp=0.9)
        else:
            car.flash(car.accents(side), t, 0.08)


def pulse(cars, an, ph):
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), float(np.clip(ev.dur[i], 0.15, 1.5))
        car, side, within = slot_for(cars, ev.top[i], lo, hi)
        car.light(car.accents(side), t, t + d)
        car.light(car.accents(side), t + d, t + d + 0.6, OFF_500)
        if car.is_ct:
            comet(car, t, within if within is not None else 0.5, d + 0.3, width=9)
            car.light(car.heads(side), t, t + d, ON_500)
            car.light(car.heads(side), t + d, t + d + 0.6, OFF_500)


def block(cars, an, ph, beat_len):
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    ct = centre_truck(cars)
    for i in range(ph.a, ph.b):
        t, dur = float(ev.t[i]), float(ev.dur[i])
        hold = float(np.clip(dur, 0.15, max(0.3, 2 * beat_len)))
        a = slot_for(cars, ev.low[i], lo, hi)
        b = slot_for(cars, ev.high[i], lo, hi)
        order = slots6(cars)
        ia, ib = order.index((a[0], a[1])), order.index((b[0], b[1]))
        span = order[min(ia, ib): max(ia, ib) + 1]
        big = ev.kind[i] == 3 or len(span) >= 5
        if big:
            span = order
        for car, side in span:
            car.light(car.accents(side), t, t + hold)
            if big:
                car.flash(car.heads(side), t, 0.12)
            if hold > 0.8:
                car.light(car.accents(side), t + hold, t + hold + 0.6, OFF_500)
        if ct is not None and any(c.is_ct for c, _ in span):
            w0 = a[2] if a[0] is ct else (0.0 if a[0].x < ct.x else 1.0)
            w1 = b[2] if b[0] is ct else (0.0 if b[0].x < ct.x else 1.0)
            if big:
                w0, w1 = 0.0, 1.0
            n = max(2, ct.fr(t + hold) - ct.fr(t))
            leds = np.linspace(0, 1, len(C.FRONT_BAR))
            mask = ((leds >= min(w0, w1) - 0.04) & (leds <= max(w0, w1) + 0.04)) * (0.5 + 0.5 * ev.amp[i])
            env = np.ones(n)
            if hold > 0.8:
                env[-15:] = np.linspace(1, 0, min(15, n))
            ct.pixels(C.FRONT_BAR, t, env[:, None] * mask[None, :])


def all_on(cars, t, hold, blackout=True):
    for c in cars:
        if blackout:
            c.set(c.everything(), t - 0.16, t, 0)
            c.set(list(C.FRONT_BAR) + list(C.REAR_BAR), t - 0.16, t, 0)
        c.light(c.everything(), t, t + hold)
        c.light(c.everything(), t + hold, t + hold + 0.6, OFF_500)
        if c.is_ct:
            n = c.fr(t + hold + 0.4) - c.fr(t)
            env = np.concatenate([np.ones(max(1, n - 20)), np.linspace(1, 0, min(n, 20))])[:n, None]
            c.pixels(C.FRONT_BAR, t, np.repeat(env, len(C.FRONT_BAR), 1))
            c.pixels(C.REAR_BAR, t, np.repeat(env, len(C.REAR_BAR), 1))


def cadence(cars, an, ph):
    ev = an.events
    for i in range(ph.a, ph.b):
        t = float(ev.t[i])
        all_on(cars, t, float(np.clip(ev.dur[i], 0.3, 1.5)), blackout=(i == ph.a))


def shimmer(cars, an, ph):
    ev = an.events
    ct = centre_truck(cars)
    car, _, _ = slot_for(cars, float(np.median(ev.top[ph.a:ph.b])), an.pitch_lo, an.pitch_hi)
    for k, i in enumerate(range(ph.a, ph.b)):
        t = float(ev.t[i])
        side = "L" if k % 2 == 0 else "R"
        car.flash(car.accents(side) + car.turns(side)[:1], t, 0.07)
        if ct is not None:
            n = max(1, ct.fr(t + 0.1) - ct.fr(t))
            sparkle = (np.random.default_rng(k).random(len(C.FRONT_BAR)) < 0.25).astype(float)
            ct.pixels(C.FRONT_BAR, t, np.repeat(sparkle[None, :], n, 0))


def motif(cars, an, ph):
    """Mordent-and-run: quick ornament on the truck, the run sweeps the stage toward where it
    lands, and the landing note holds on that car while every interior glow."""
    ev = an.events
    ct = centre_truck(cars)
    idx = list(range(ph.a, ph.b))
    land = idx[-1]
    pre = idx[:-1]
    # Ornament: the first notes before any wide leap.
    orn = []
    for j, i in enumerate(pre):
        if j and abs(ev.top[i] - ev.top[pre[j - 1]]) > 4:
            break
        orn.append(i)
    run = [i for i in pre if i not in orn]
    for k, i in enumerate(orn):
        t = float(ev.t[i])
        if ct is not None:
            side = "L" if k % 2 == 0 else "R"
            ct.flash(ct.heads(side), t, 0.1)
            comet(ct, t, 0.35 if side == "L" else 0.65, 0.25)
        else:
            cars[len(cars) // 2].flash(cars[len(cars) // 2].heads(), t, 0.1)
    land_car, land_side, within = slot_for(cars, ev.top[land], an.pitch_lo, an.pitch_hi)
    # Sweep: slots in order from the far side of the stage to the landing slot.
    order = slots6(cars)
    target = order.index((land_car, land_side))
    far = 0 if target >= len(order) / 2 else len(order) - 1
    path = order[far:target + 1] if far < target else order[far:target - 1 if target else None:-1]
    for k, i in enumerate(run):
        car, side = path[min(k, len(path) - 1)] if path else (land_car, land_side)
        t = float(ev.t[i])
        hit(car, side, t, 0.1, heads=True)
        if ct is not None and car is not ct:
            comet(ct, t, 0.5, 0.15, amp=0.5, width=12)
    t, hold = float(ev.t[land]), float(np.clip(ev.dur[land], 0.4, 3.0))
    land_car.light(land_car.accents(land_side) + land_car.heads(land_side), t, t + hold)
    land_car.light(land_car.accents(land_side) + land_car.heads(land_side), t + hold, t + hold + 0.8, OFF_500)
    if land_car.is_ct:
        comet(ct, t, within if within is not None else 0.5, hold + 0.5, width=10)
    for c in cars:
        c.rgb(t, t + hold, (255, 255, 255), 0.6)


# --- Model Y moves (the sides) ------------------------------------------------------------------
# A Model Y's front has 8 separately drivable lamps, left to right: signature strip, DRL segments,
# outer beam, inner beam, then the mirror image. Across two Ys that is a 16-lamp line with the
# truck in the middle. Signature, DRL and inner beams can ramp (500/1000/2000 ms), the rest snap.

def _y_line(ys):
    """All Y lamps left to right across the stage: [(car, channels), ...]."""
    out = []
    for c in ys:
        out += [(c, lp) for lp in c.lamps()]
    return out


def y_keyboard(ys, an, ph, weight=1):
    """Keyboard on the sides only, pitch spread over the 16 Y lamps. `weight` sets how much of
    the car each note lights: 0 one lamp, 1 the signature + DRL of that side, 2 the whole half-car
    (so a note reads from the crowd in a loud section)."""
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    line = _y_line(ys)
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
        car, chs = line[int(pos * len(line))]
        if weight >= 1:
            side = "L" if (int(pos * len(line)) % 8) < 4 else "R"
            chs = car.sig(side) + car.drl(side) + (car.heads(side) if weight >= 2 else [])
        car.light(chs, t, t + d)


def y_ripple(ys, an, ph, inward=True):
    """On every beat a ripple runs through each Y's lamps, mirrored on the two cars: inward
    (toward the truck) or outward. The ripple spans half a beat, so it starts on the beat and
    finishes on the "and" whatever the tempo."""
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    for b in beats:
        lamp_dt = _beat_at(an, b) / 2 / 8
        for c in ys:
            lamps = c.lamps()
            left_car = c.x < 1.0 if len(ys) == 2 else c.x < np.mean([y.x for y in ys])
            seq = lamps if (inward == left_car) else lamps[::-1]
            for k, chs in enumerate(seq):
                c.light(chs, b + lamp_dt * k, b + lamp_dt * k + 0.1)


def y_breathe(ys, an, ph, period=None):
    """Slow mirrored swells on the ramping lamps (signature + DRL), the two Ys in antiphase."""
    period = period or max(2.0, 4 * 60.0 / max(an.tempo, 40))
    on_v, off_v, half = (ON_500, OFF_500, 0.5) if period < 3.0 else (C.ON_1000, OFF_1000, 1.0)
    for k, c in enumerate(ys):
        t = ph.t0 + (period / 2 if k % 2 else 0)
        while t < ph.t1 - 0.3:
            mid, stop = min(t + period / 2, ph.t1), min(t + period, ph.t1)
            c.light(c.sig() + c.drl(), t, mid, on_v)
            c.light(c.sig() + c.drl(), mid, stop, off_v)
            t += period


def y_turn_ticks(ys, an, ph):
    """Amber turn signals tick on the off-beats (mirrored on the two cars) under a keyboard of
    the melody on the signature and DRL lamps."""
    y_keyboard(ys, an, ph, weight=1)
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    for k in range(len(beats) - 1):
        half = (beats[k] + beats[k + 1]) / 2
        for c in ys:
            side = msd(c, "L" if k % 2 == 0 else "R", ys)
            c.flash(c.turns(side)[:1], half, 0.08)


def y_bass_fogs(ys, an, ph):
    """Low-mounted fog lights thump on low notes."""
    ev = an.events
    for i in range(ph.a, ph.b):
        if ev.low[i] <= 48 and ev.kind[i] <= 1:
            for c in ys:
                c.flash(c.fogs(), float(ev.t[i]), 0.1)


def y_chords(ys, an, ph, beat_len):
    """Chords on the sides: the lamps spanned by the chord, held; big chords take all 16."""
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    line = _y_line(ys)
    n = len(line)
    for i in range(ph.a, ph.b):
        if ev.kind[i] == 0:
            pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
            car, chs = line[int(pos * n)]
            car.flash(chs, float(ev.t[i]), flash_len(ev, i))
            continue
        t, hold = float(ev.t[i]), float(np.clip(ev.dur[i], 0.15, 2 * beat_len))
        p0 = float(np.clip((ev.low[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
        p1 = float(np.clip((ev.high[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
        a, b = sorted((int(p0 * n), int(p1 * n)))
        if ev.kind[i] == 3:
            a, b = 0, n - 1
        for car, chs in line[a:b + 1]:
            car.light(chs, t, t + hold)


# --- Cybertruck moves (the centre) --------------------------------------------------------------

def ct_scan(ct, an, ph):
    """A comet scans the bar left to right on one beat and back on the next (tempo-locked)."""
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1 + 0.5)]
    for k in range(len(beats) - 1):
        b0, b1 = beats[k], min(beats[k + 1], ph.t1)
        n = max(2, ct.fr(b1) - ct.fr(b0))
        leds = np.arange(len(C.FRONT_BAR))
        centre = np.linspace(0, len(leds) - 1, n) if k % 2 == 0 else np.linspace(len(leds) - 1, 0, n)
        shape = np.exp(-((leds[None, :] - centre[:, None]) / 4) ** 2)
        ct.pixels(C.FRONT_BAR, b0, shape)


def ct_edge_pulse(ct, an, ph):
    """Each beat: the bar fills from both edges to the centre and fades, like a breath in."""
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    for b in beats:
        dur = min(0.4, max(0.2, 60.0 / max(an.tempo, 40) * 0.8))
        n = max(2, ct.fr(b + dur) - ct.fr(b))
        prog = np.linspace(0, 1, n)
        bar_fill(ct, b, dur, prog, from_centre=False, env=np.linspace(1, 0.3, n))


def ct_swell(ct, an, ph):
    """The truck's ramping lights breathe slowly: outer beams swell over 2 s, the bar follows."""
    period = max(3.0, min(8.0, ph.t1 - ph.t0))
    t = ph.t0
    while t < ph.t1 - 0.5:
        mid, stop = min(t + period / 2, ph.t1), min(t + period, ph.t1)
        ct.light(ct.outer() + ct.sig(), t, mid, C.ON_2000)
        ct.light(ct.outer() + ct.sig(), mid, stop, C.OFF_2000)
        n = max(2, ct.fr(stop) - ct.fr(t))
        env = np.sin(np.linspace(0, np.pi, n)) ** 2
        bar_fill(ct, t, stop - t, 0.1 + 0.9 * env, from_centre=True)
        t += period


def ct_comets(ct, an, ph):
    """Every note as a comet at its pitch position on the bar; headlights only on strong notes."""
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    strong = ev.amp >= np.quantile(ev.amp, 0.8)
    for i in range(ph.a, ph.b):
        t = float(ev.t[i])
        pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 1))
        comet(ct, t, pos, 0.18 + 0.15 * ev.amp[i], amp=0.7 + 0.3 * ev.amp[i])
        if strong[i]:
            ct.flash(ct.heads("L" if pos < 0.5 else "R"), t, 0.1)


def ct_meter(ct, an, ph):
    f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
    e = an.loud_fast[f0:f1]
    e = (e - e.min()) / max(np.ptp(e), 1e-6) if np.ptp(e) > 0.05 else np.full_like(e, 0.5)
    bar_fill(ct, ph.t0, ph.t1 - ph.t0, 0.2 + 0.75 * e, from_centre=True)


# --- More all-car moves -------------------------------------------------------------------------

def wave(cars, an, ph):
    """Once per bar a single light travels the whole stage: through the left Y's 8 lamps, across
    the truck bar as a comet, through the right Y's lamps; direction alternates each bar."""
    ct = centre_truck(cars)
    ys = sides(cars)
    downs = an.downbeats[(an.downbeats >= ph.t0) & (an.downbeats < ph.t1)]
    bar = 4 * 60.0 / max(an.tempo, 40)
    for k, d in enumerate(downs):
        span = min(bar, ph.t1 - d)
        stations = []
        for c in ys[:1]:
            stations += [(c, lp) for lp in c.lamps()]
        stations.append(None)  # the truck bar
        for c in ys[1:]:
            stations += [(c, lp) for lp in c.lamps()]
        if k % 2:
            stations = stations[::-1]
        per = span / len(stations)
        times = _q_steps(an, d, span, len(stations))
        for j, st in enumerate(stations):
            t = float(times[j])
            if st is None:
                if ct is not None:
                    n = max(2, ct.fr(t + per * 2) - ct.fr(t))
                    leds = np.arange(len(C.FRONT_BAR))
                    centre = np.linspace(0, len(leds) - 1, n) if k % 2 == 0 else np.linspace(len(leds) - 1, 0, n)
                    ct.pixels(C.FRONT_BAR, t, np.exp(-((leds[None, :] - centre[:, None]) / 4) ** 2))
            else:
                st[0].light(st[1], t, t + max(0.1, per * 1.5))


def converge(cars, an, ph):
    """Every beat: both Ys ripple inward, then the truck bar closes from the edges to the centre."""
    ct = centre_truck(cars)
    ys = sides(cars)
    y_ripple(ys, an, ph, inward=True)
    if ct is not None:
        beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
        half = 30.0 / max(an.tempo, 40)               # the "and" of the beat
        for b in beats:
            n = max(2, ct.fr(b + half) - ct.fr(b + half / 2))
            bar_fill(ct, b + half / 2, half / 2, np.linspace(0, 1, n), from_centre=False)
            ct.flash(ct.heads(), b + half, 0.1)


def heartbeat(cars, an, ph):
    """Two quick pulses per bar on every car's headlights, with the truck bar thumping; the
    ominous move for slow, dark passages."""
    downs = _grid(an, ph, "downbeats")
    for d in downs:
        for dt in (0.0, _beat_at(an, d) / 4):
            for c in cars:
                c.flash(c.heads(), d + dt, 0.1)
                if c.is_ct:
                    bar_flash(c, d + dt, 0.25, 0.9)


def call_response(cars, an, ph):
    """The sides play the first half of the phrase, the truck answers with the second half."""
    ev = an.events
    ys = sides(cars)
    ct = centre_truck(cars)
    mid = ph.a + (ph.b - ph.a) // 2
    class Half:  # a view of the phrase restricted to one half
        pass
    h1, h2 = Half(), Half()
    for h, (a, b) in ((h1, (ph.a, mid)), (h2, (mid, ph.b))):
        h.a, h.b = a, b
        h.t0, h.t1 = float(ev.t[a]), float(ev.t[b - 1] + min(ev.dur[b - 1], 2.0))
        h.lo, h.hi = ph.lo, ph.hi
    y_keyboard(ys, an, h1)
    if ct is not None:
        ct_comets(ct, an, h2)
    else:
        keyboard(cars, an, h2)


# --- Round three: showing off the cars' sync -----------------------------------------------

def _stations(cars):
    """Every light on the stage in crowd order: left Y lamps, the truck bar (as a token), right Y
    lamps. Returns [(car, channels) | ('bar', k)] where the bar is split into 6 segments."""
    out = []
    ys = sides(cars)
    ct = centre_truck(cars)
    left = [c for c in ys if ct is None or c.x < ct.x]
    for c in left:
        out += [(c, lp) for lp in c.lamps()]
    if ct is not None:
        out += [("bar", k) for k in range(6)]
    for c in ys:
        if c not in left:
            out += [(c, lp) for lp in c.lamps()]
    return out, ct


def _bar_segment(ct, t, dur, k, n=6, level=1.0):
    leds = len(C.FRONT_BAR)
    a, b = int(k * leds / n), int((k + 1) * leds / n)
    m = max(2, ct.fr(t + dur) - ct.fr(t))
    mask = np.zeros(leds)
    mask[a:b] = level
    env = np.linspace(1, 0.3, m)
    ct.pixels(C.FRONT_BAR, t, env[:, None] * mask[None, :])


def _bar_half(ct, t, dur, side, level=1.0):
    """The crowd-left ("L") or crowd-right half of the bar, fading over `dur`."""
    leds = len(C.FRONT_BAR)
    m = max(2, ct.fr(t + dur) - ct.fr(t))
    mask = np.zeros(leds)
    if side == "L":
        mask[: leds // 2] = level
    else:
        mask[leds // 2:] = level
    env = np.linspace(1, 0.3, m)
    ct.pixels(C.FRONT_BAR, t, env[:, None] * mask[None, :])


def relay(cars, an, ph):
    """One light runs the whole stage one note at a time: through the left Y's lamps, along the
    truck bar, through the right Y's lamps, and back. Direction follows the run. Best for scale
    runs and long single-note passages: every note is a step of a single moving light."""
    ev = an.events
    stations, ct = _stations(cars)
    n = len(stations)
    k = 0
    direction = 1 if ph.up >= 0.5 else -1
    pos = 0 if direction > 0 else n - 1
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        st = stations[pos]
        hold = max(d, 0.26)              # a short trail: two or three stations lit at once
        if st[0] == "bar":
            _bar_segment(ct, t, hold + 0.1, st[1])
            ct.flash(ct.heads("L" if st[1] < 3 else "R"), t, 0.08)
        else:
            st[0].light(st[1], t, t + hold)
        # Change direction when the melody turns, else keep walking; bounce at the ends.
        if i > ph.a and i + 1 < ph.b:
            step = np.sign(ev.top[i + 1] - ev.top[i])
            if step != 0:
                direction = int(step)
        pos += direction
        if pos >= n or pos < 0:
            direction = -direction
            pos = max(0, min(n - 1, pos + 2 * direction))
        k += 1


def pinball(cars, an, ph):
    """On every beat a light bounces between the outer Ys, passing through the truck: the bar
    scans in the travel direction and the Y it lands on flashes its whole front. Best for steady,
    medium-intensity beat passages: pure synchronization on display."""
    ys = sides(cars)
    ct = centre_truck(cars)
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1 + 0.3)]
    for k in range(len(beats) - 1):
        b0, b1 = float(beats[k]), float(min(beats[k + 1], ph.t1))
        if ys:
            land = ys[k % len(ys)]
            land.flash(land.sig() + land.drl() + land.heads(), b0, 0.12)
        if ct is not None and b1 > b0 + 0.1:
            m = max(2, ct.fr(b1) - ct.fr(b0 + 0.05))
            leds = np.arange(len(C.FRONT_BAR))
            goes_right = (k % 2 == 0)
            centre = np.linspace(0, len(leds) - 1, m) if goes_right else np.linspace(len(leds) - 1, 0, m)
            ct.pixels(C.FRONT_BAR, b0 + 0.05, np.exp(-((leds[None, :] - centre[:, None]) / 3.5) ** 2))


def _grid(an, ph, kind="downbeats"):
    """Beats/downbeats inside the phrase, or an even grid at the piece's tempo when the tracker
    has none there (rubato passages), so beat-shaped moves never go dark."""
    src = an.downbeats if kind == "downbeats" else an.beats
    g = src[(src >= ph.t0 - 0.02) & (src < ph.t1)]
    if len(g) < 2:
        b = np.asarray(an.beats, float)
        inb = np.flatnonzero((b >= ph.t0 - 0.02) & (b < ph.t1))
        if kind == "downbeats" and len(inb) >= 2:
            # a phrase shorter than two bars: half-bars, in phase with the bar's downbeat
            d_idx = np.searchsorted(b, an.downbeats)
            ref = d_idx[np.argmin(np.abs(an.downbeats - ph.t0))] if len(d_idx) else inb[0]
            g = b[inb[(inb - ref) % 2 == 0]]
        elif kind == "beats" and len(inb) >= 2:
            g = b[inb]
        else:
            # no tracked beats here (a fermata): carry on from the last beat at the local pace
            prev = b[b <= ph.t0]
            start = float(prev[-1]) if len(prev) else ph.t0
            period = (4 if kind == "downbeats" else 1) * _beat_at(an, start)
            g = start + period * np.arange(int((ph.t1 - start) / period) + 1)
            g = g[g >= ph.t0 - 0.02]
            if len(g) == 0:
                g = np.array([ph.t0])
    pace = getattr(an, "pace", None)          # calm: every 4th beat, groove: every 2nd (mood.py)
    if pace and kind == "beats" and len(g) > 1 and pace > np.median(np.diff(g)) * 1.25:
        from .mood import paced_grid
        g = paced_grid(g, pace)
    return g


def _sub_grid(an, div=4):
    """Every 1/div-beat point of the tracked beats (sixteenths for div=4), following the music's
    own beat spacing - not a fixed tempo - so rubato and drift are followed too. Cached."""
    key = f"_grid{div}"
    g = getattr(an, key, None)
    if g is None:
        b = np.asarray(an.beats, dtype=float)
        if len(b) < 2:
            b = np.arange(0, an.duration, 60.0 / max(an.tempo, 40))
        gaps = np.diff(b)
        g = (b[:-1, None] + gaps[:, None] * np.arange(div)[None, :] / div).ravel()
        g = np.append(g, b[-1] + np.arange(div) * gaps[-1] / div)
        setattr(an, key, g)
    return g


def _snap(an, t, div=4):
    """`t` moved to the nearest sixteenth (1/div beat) of the performer-following beat map
    (tempo.py), and from there onto a note that was actually played, if one starts within an
    eighth of that subdivision (at most 40 ms) - continuous quantization: the grid bends with the
    tempo, and the light lands on the real attack rather than on the theoretical one."""
    g = _sub_grid(an, div)
    i = int(np.clip(np.searchsorted(g, t), 1, len(g) - 1))
    q = float(g[i - 1] if t - g[i - 1] <= g[i] - t else g[i])
    ev = getattr(an, "events", None)
    if ev is not None and len(ev):
        tol = min(0.04, _beat_at(an, q) / (2 * div))
        j = int(np.clip(np.searchsorted(ev.t, q), 1, len(ev.t) - 1))
        near = ev.t[j - 1] if q - ev.t[j - 1] <= ev.t[j] - q else ev.t[j]
        if abs(near - q) <= tol:
            return float(near)
    return q


def _beat_at(an, t):
    """Length of the tracked beat around time `t` (seconds)."""
    b = an.beats
    nominal = 60.0 / max(an.tempo, 40)
    if len(b) < 2:
        return nominal
    i = int(np.clip(np.searchsorted(b, t, side="right"), 1, len(b) - 1))
    return float(min(b[i] - b[i - 1], 1.5 * nominal))       # across a fermata: a normal beat


def _q_steps(an, d, span, n):
    """Start times for `n` evenly spread steps over [d, d + span), each snapped to the nearest
    sixteenth note of the tracked beats - so a sweep across the stage moves in time with the
    music instead of at an arbitrary rate. Several steps may share a sixteenth."""
    raw = d + np.arange(n) * span / max(n, 1)
    return np.array([_snap(an, t) for t in raw])


def expand_contract(cars, an, ph):
    """Breathing stage: on one bar the lit region grows from the truck's centre out to the Ys'
    outer corners, on the next it contracts back. Best for sustained chords and long notes in
    loud sections, where there are no notes to tick but the sound is big."""
    ct = centre_truck(cars)
    ys = sides(cars)
    downs = _grid(an, ph, "downbeats")
    bar = 4 * 60.0 / max(an.tempo, 40)
    for k, d in enumerate(downs):
        span = min(bar, ph.t1 - d)
        expanding = k % 2 == 0
        steps = 4
        for j in range(steps):
            ts = _snap(an, d + span * j / steps)
            te = _snap(an, d + span * (j + 1) / steps)
            lvl = (j + 1) / steps if expanding else 1 - j / steps
            if ct is not None:
                bar_fill(ct, ts, te - ts, lvl * 0.9, from_centre=True)
            for c in ys:
                outer = "L" if c.x < (ct.x if ct else 1) else "R"
                inner = "R" if outer == "L" else "L"
                on = []
                if lvl >= 0.5: on += c.sig(inner) + c.drl(inner)
                if lvl >= 0.75: on += c.heads(inner) + c.heads(outer)
                if lvl >= 1.0: on += c.sig(outer) + c.drl(outer)
                if on:
                    c.light(on, ts, te)


def lightning(cars, t, flashes=3):
    """Three stage-wide strobes, 60 ms on / 70 ms off, then black. The Halloween hit: for arrival
    chords and accents, alternating with the plain all-on."""
    for k in range(flashes):
        t0 = t + k * 0.13
        for c in cars:
            c.set(c.everything(), t0 - 0.01, t0, 0)
            c.light(c.everything(), t0, t0 + 0.06)
            if c.is_ct:
                bar_flash(c, t0, 0.07, 1.0)
    for c in cars:
        c.set(c.everything(), t + flashes * 0.13, t + flashes * 0.13 + 0.25, 0)
        c.set(list(C.FRONT_BAR), t + flashes * 0.13, t + flashes * 0.13 + 0.25, 0)


def syncopate(cars, an, ph):
    """The Ys hit the beats together (mirrored, whole fronts); the truck answers on the off-beats
    with a bar flash and its headlights. Best for beat-locked loud passages (the band songs)."""
    ys = sides(cars)
    ct = centre_truck(cars)
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    for k, b in enumerate(beats):
        side = "L" if k % 2 == 0 else "R"
        for c in ys:
            s = msd(c, side, ys)
            c.flash(c.sig(s) + c.drl(s) + c.heads(s), float(b), 0.12)
        if ct is not None and k + 1 < len(beats):
            half = (float(b) + float(beats[k + 1])) / 2
            bar_flash(ct, half, 0.18, 0.9)
            ct.flash(ct.heads(), half, 0.08)


def rain(cars, an, ph):
    """Twinkle: random LEDs sparkle across the truck bar and the Ys' markers and signatures
    flicker, denser with the loudness. Best for tremolos, trills and shimmering sustained textures
    (strings, xylophone), where single notes are not the point."""
    ct = centre_truck(cars)
    ys = sides(cars)
    f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
    rng = np.random.default_rng(int(ph.t0 * 100))
    n = f1 - f0
    if ct is not None:
        lv = an.loud_fast[f0:f1]
        field = np.zeros((n, len(C.FRONT_BAR)))
        for k in range(0, n, 2):
            density = 0.04 + 0.16 * float(lv[min(k, len(lv) - 1)])
            spark = rng.random(len(C.FRONT_BAR)) < density
            field[k:k + 3, spark] = 1.0
        ct.pixels(C.FRONT_BAR, ph.t0, field)
    for c in ys:
        lamps = [c.sig("L"), c.sig("R"), c.drl("L"), c.drl("R"), [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_AUX_PARK, C.R_AUX_PARK]]
        for k in range(0, n, 4):
            if rng.random() < 0.35:
                chs = lamps[rng.integers(len(lamps))]
                c.light(chs, ph.t0 + k * an.step, ph.t0 + (k + 4) * an.step)


def fill_stage(cars, an, ph):
    """Accumulation: one more light comes on with every note, left to right across all three
    cars, and stays, until the whole stage is lit at the phrase's end; then everything releases.
    Best for a long crescendo that ends on a hit, as an alternative to the outside-in build."""
    ev = an.events
    stations, ct = _stations(cars)
    n = len(stations)
    count = max(1, ph.b - ph.a)
    for j, i in enumerate(range(ph.a, ph.b)):
        t = float(ev.t[i])
        idx = min(n - 1, int(j / count * n))
        st = stations[idx]
        if st[0] == "bar":
            _bar_segment(ct, t, ph.t1 - t, st[1], level=0.8)
        else:
            st[0].light(st[1], t, ph.t1)
        # and a tick on the newest light's neighbour so the motion reads
        nxt = stations[min(n - 1, idx + 1)]
        if nxt[0] != "bar":
            nxt[0].flash(nxt[1], t, 0.08)
    if _lands_on_hold(an, ph):
        _land(cars, an, ph, ct, pop=True)
    else:
        for c in cars:
            c.light(c.everything(), ph.t1, ph.t1 + 0.6, OFF_500)


def bar_collide(ct, an, ph):
    """Truck solo: two comets launch from the bar's ends on each chord and collide in the middle
    with a flash; single notes are plain comets. Best for chordal passages on the truck."""
    ev = an.events
    for i in range(ph.a, ph.b):
        t = float(ev.t[i])
        if ev.kind[i] >= 1:
            m = max(4, ct.fr(t + 0.3) - ct.fr(t))
            leds = np.arange(len(C.FRONT_BAR))
            half = (len(leds) - 1) / 2
            cl = np.linspace(0, half, m)
            cr = np.linspace(len(leds) - 1, half, m)
            field = np.exp(-((leds[None, :] - cl[:, None]) / 3) ** 2) + np.exp(-((leds[None, :] - cr[:, None]) / 3) ** 2)
            ct.pixels(C.FRONT_BAR, t, np.clip(field, 0, 1))
            bar_flash(ct, t + 0.3, 0.2, 1.0)
            ct.flash(ct.heads(), t + 0.3, 0.1)
        else:
            lo, hi = phrase_range(ph, an)
            pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 1))
            comet(ct, t, pos, 0.2)


def y_wink(ys, an, ph):
    """The two Ys trade phrases: one plays a bar of the melody (its lamps by pitch) while the
    other holds a soft glow, then they swap. Best for antiphonal or conversational passages."""
    ev, (lo, hi) = an.events, phrase_range(ph, an)
    if len(ys) < 2:
        return y_keyboard(ys, an, ph)
    bar = 4 * 60.0 / max(an.tempo, 40)
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        who = int((t - ph.t0) / bar) % 2
        car, other = ys[who], ys[1 - who]
        lamps = car.lamps()
        pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
        car.light(lamps[int(pos * len(lamps))], t, t + d)
    k = 0
    t = ph.t0
    while t < ph.t1:
        other = ys[1 - (k % 2)]
        other.light(other.sig(), t, min(t + bar, ph.t1), ON_500)
        t += bar
        k += 1


# --- Round four: whole-lineup collaboration on steady beats ---------------------------------------

def march(cars, an, ph):
    """A single light marches car to car on the beat - left, centre, right, centre, left... - the
    arriving car's whole front comes on while the car it left ramps off, so it reads as one light
    travelling, not three blinking. On fast beats it steps every other beat."""
    order = sorted(cars, key=lambda q: q.x)
    seq = order + order[-2:0:-1]            # ping-pong order over the lineup
    beats = _grid(an, ph, "beats")
    if len(beats) > 1 and np.median(np.diff(beats)) < 0.4:
        beats = beats[::2]
    for k, b in enumerate(beats):
        car = seq[k % len(seq)]
        nxt = beats[k + 1] if k + 1 < len(beats) else b + 0.5
        hold = max(0.15, min(0.6, (nxt - b) * 0.9))
        car.light(car.sig() + car.drl() + car.heads(), b, b + hold)
        car.light(car.sig() + car.drl(), b + hold, b + hold + 0.5, OFF_500)
        if car.is_ct:
            bar_flash(car, b, hold + 0.1, 1.0)


def cascade(cars, an, ph):
    """Every bar a quick ripple runs across the lineup - left Y, truck, right Y, 120 ms apart - and
    the next bar runs back. Fast enough to read as a swipe, slow enough to see every car."""
    order = sorted(cars, key=lambda q: q.x)
    downs = _grid(an, ph, "downbeats")
    for k, d in enumerate(downs):
        seq = order if k % 2 == 0 else order[::-1]
        for j, car in enumerate(seq):
            t = d + _beat_at(an, d) / 8 * j                 # a flam on thirty-second notes
            car.flash(car.sig() + car.drl() + car.heads(), t, 0.16)
            if car.is_ct:
                n = max(2, car.fr(t + 0.3) - car.fr(t))
                leds = np.arange(len(C.FRONT_BAR))
                centre = np.linspace(0, len(leds) - 1, n) if k % 2 == 0 else np.linspace(len(leds) - 1, 0, n)
                car.pixels(C.FRONT_BAR, t, np.exp(-((leds[None, :] - centre[:, None]) / 5) ** 2))


def tug_of_war(cars, an, ph):
    """Light fills the stage left to right one slot per beat (six slots: both halves of each car),
    holds, then drains back right to left; the truck bar fills and empties with it."""
    slots = slots6(cars)
    ct = centre_truck(cars)
    beats = _grid(an, ph, "beats")
    n = len(slots)
    k = 0
    while k + 2 * n <= len(beats) or (k < len(beats) and k == 0):
        for j in range(n):
            if k + j >= len(beats):
                break
            car, side = slots[j]
            start = beats[k + j]
            end = beats[min(len(beats) - 1, k + 2 * n - 1 - j)]
            car.light(car.accents(side) + car.heads(side), start, end)
            if ct is not None and car.is_ct:
                _bar_segment(ct, start, end - start, 0 if side == "L" else 3, n=6, level=0.9)
                _bar_segment(ct, start, end - start, 1 if side == "L" else 4, n=6, level=0.9)
                _bar_segment(ct, start, end - start, 2 if side == "L" else 5, n=6, level=0.9)
        k += 2 * n


def bounce_build(cars, an, ph):
    """An accelerating ping-pong for a build: the ball crosses the lineup every bar, then every
    half bar, then every beat, then every half beat, and everything lands together at the end."""
    order = sorted(cars, key=lambda q: q.x)
    ct = centre_truck(cars)
    span = max(ph.t1 - ph.t0, 1.0)
    beat = 60.0 / max(an.tempo, 40)
    t = ph.t0
    k = 0
    while t < ph.t1 - 0.1:
        u = (t - ph.t0) / span
        step = beat * (4 if u < 0.3 else 2 if u < 0.6 else 1 if u < 0.85 else 0.5)
        ts = _snap(an, t, 2)                    # the hit lands on the beat grid; the clock runs on
        car = order[[0, 1, 2, 1][k % 4] % len(order)]
        car.flash(car.sig() + car.drl() + car.heads(), ts, min(0.14, step * 0.6))
        if ct is not None:
            nxt = order[[0, 1, 2, 1][(k + 1) % 4] % len(order)]
            goes_right = nxt.x > car.x
            m = max(2, ct.fr(ts + step) - ct.fr(ts))
            leds = np.arange(len(C.FRONT_BAR))
            centre = np.linspace(0, len(leds) - 1, m) if goes_right else np.linspace(len(leds) - 1, 0, m)
            ct.pixels(C.FRONT_BAR, ts, 0.7 * np.exp(-((leds[None, :] - centre[:, None]) / 4) ** 2))
        t += step
        k += 1
    for c in cars:
        c.set(c.everything(), ph.t1 - 0.16, ph.t1, 0)
        c.light(c.everything(), ph.t1, ph.t1 + 0.4)
        c.light(c.everything(), ph.t1 + 0.4, ph.t1 + 1.0, OFF_500)
    if ct is not None:
        bar_flash(ct, ph.t1, 0.6, 1.0)


def antiphony(cars, an, ph):
    """Bar-level call and response: the truck plays a bar of the melody (comets and headlights),
    then the two Ys answer the next bar in mirror (keyboard on their lamps), and so on."""
    ev = an.events
    ys = sides(cars)
    ct = centre_truck(cars)
    bar = 4 * 60.0 / max(an.tempo, 40)
    lo, hi = phrase_range(ph, an)
    for i in range(ph.a, ph.b):
        t, d = float(ev.t[i]), flash_len(ev, i)
        pos = float(np.clip((ev.top[i] - lo) / max(hi - lo, 1e-9), 0, 0.999))
        truck_turn = int((t - ph.t0) / bar) % 2 == 0
        if truck_turn and ct is not None:
            comet(ct, t, pos, d + 0.15)
            ct.flash(ct.heads("L" if pos < 0.5 else "R"), t, d)
        else:
            for c in ys:
                lamps = c.lamps()
                j = int(pos * len(lamps))
                if c.x > (ct.x if ct else 1):
                    j = len(lamps) - 1 - j          # mirrored on the right-hand car
                c.light(lamps[j], t, t + d)


# --- Round five: patterns across the stage ------------------------------------------------------

def checker(cars, an, ph):
    """Checkerboard across the six slots and the bar: on one beat the even slots are lit (and every
    other block of the bar), on the next the odd ones - a flickering lattice across the cars."""
    slots = slots6(cars)
    ct = centre_truck(cars)
    beats = _grid(an, ph, "beats")
    leds = len(C.FRONT_BAR)
    block = leds // 6
    for k, b in enumerate(beats):
        nxt = beats[k + 1] if k + 1 < len(beats) else b + 0.4
        hold = max(0.12, min(0.5, (nxt - b) * 0.85))
        for j, (car, side) in enumerate(slots):
            if j % 2 == k % 2:
                car.light(car.accents(side) + car.heads(side), b, b + hold)
        if ct is not None:
            mask = np.zeros(leds)
            for j in range(6):
                if j % 2 == k % 2:
                    mask[j * block:(j + 1) * block] = 1.0
            n = max(2, ct.fr(b + hold) - ct.fr(b))
            ct.pixels(C.FRONT_BAR, b, np.repeat(mask[None, :], n, 0))


def beam(cars, an, ph):
    """A searchlight two slots wide sweeps across the stage over each bar, left to right then back,
    with the bar lighting the part of itself the beam is crossing."""
    slots = slots6(cars)
    ct = centre_truck(cars)
    downs = _grid(an, ph, "downbeats")
    bar = 4 * 60.0 / max(an.tempo, 40)
    n = len(slots)
    for k, d in enumerate(downs):
        span = min(bar, ph.t1 - d)
        if span < 0.4:
            continue
        per = span / (n + 1)
        times = _q_steps(an, d, span, n + 1)
        for step in range(n + 1):
            t = float(times[step])
            pos = step if k % 2 == 0 else n - step
            for j in (pos - 1, pos):
                if 0 <= j < n:
                    car, side = slots[j]
                    car.light(car.accents(side) + car.heads(side), t, t + per * 1.1)
            if ct is not None:
                m = max(2, ct.fr(t + per * 1.1) - ct.fr(t))
                leds = np.arange(len(C.FRONT_BAR))
                centre = (pos - 2.5) / 2 * (len(leds) - 1) + (len(leds) - 1) / 2   # slots 2,3 are the bar
                field = np.exp(-((leds[None, :] - centre) / 7) ** 2)
                ct.pixels(C.FRONT_BAR, t, np.repeat(field, m, 0))


def lr_channel(cars, an, ph):
    """Left channel, right channel: the whole left half of the stage (left Y, the truck's crowd-left
    headlight and half of the bar) on one beat, the whole right half on the next."""
    ys = sides(cars)
    ct = centre_truck(cars)
    beats = _grid(an, ph, "beats")
    if len(beats) > 1 and np.median(np.diff(beats)) < 0.3:
        beats = beats[::2]
    for k, b in enumerate(beats):
        nxt = beats[k + 1] if k + 1 < len(beats) else b + 0.4
        hold = max(0.12, min(0.45, (nxt - b) * 0.8))
        left = k % 2 == 0
        if ys:
            car = ys[0] if left else ys[-1]
            car.light(car.sig() + car.drl() + car.heads(), b, b + hold)
        if ct is not None:
            ct.light(ct.heads("L" if left else "R"), b, b + hold)
            _bar_half(ct, b, hold, "L" if left else "R", 1.0)


def implode(cars, an, ph):
    """Build into the middle, then let go: over the phrase the slots come on from the outer corners
    inward and stay, the bar fills from both ends, the truck pops at the top, and then everything
    fades out slowly (2 s ramps) instead of cutting."""
    slots = slots6(cars)
    ct = centre_truck(cars)
    n = len(slots)
    order = []                                  # outer corners first, truck last
    for k in range(n // 2):
        order += [slots[k], slots[n - 1 - k]]
    top = _snap(an, ph.t1 - 0.4, 1)
    starts = _q_steps(an, ph.t0, (top - ph.t0) * 0.85, len(order))
    for j, (car, side) in enumerate(order):
        ts = float(starts[j])
        car.light(car.accents(side), ts, top)
        if j >= len(order) - 2:
            car.light(car.heads(side), ts, top)
    if ct is not None:
        m = max(2, ct.fr(top) - ct.fr(ph.t0))
        bar_fill(ct, ph.t0, top - ph.t0, np.linspace(0, 1, m) * 0.9, from_centre=False)
        bar_flash(ct, top, 0.5, 1.0)
    for c in cars:
        c.set(c.everything(), top - 0.14, top, 0)
        c.light(c.everything(), top, top + 0.35)
        c.light(c.inner() + c.sig() + c.drl(), top + 0.35, top + 2.5, C.OFF_2000)


def fade_cross(cars, an, ph):
    """A slow crossfade from one side of the stage to the other on the ramping lamps: the left Y
    ramps up over a second while the right ramps down, the truck's outer beams follow the louder
    side, then it swaps every two bars."""
    ys = sides(cars)
    ct = centre_truck(cars)
    downs = list(_grid(an, ph, "downbeats")[::2]) + [ph.t1]
    k = 0
    for t, stop in zip(downs[:-1], downs[1:]):
        t, stop = float(t), float(min(stop, ph.t1))
        if stop - t < 0.3:
            continue
        up, down = (ys[0], ys[-1]) if k % 2 == 0 else (ys[-1], ys[0])
        if len(ys) >= 2:
            up.light(up.sig() + up.drl() + up.inner(), t, stop, C.ON_1000)
            down.light(down.sig() + down.drl() + down.inner(), t, stop, C.OFF_1000)
        if ct is not None:
            side = "L" if up is ys[0] else "R"
            ct.light(ct.outer(side), t, stop, C.ON_1000)
            ct.light(ct.outer("R" if side == "L" else "L"), t, stop, C.OFF_1000)
            m = max(2, ct.fr(stop) - ct.fr(t))
            leds = np.linspace(0, 1, len(C.FRONT_BAR))
            ramp = np.linspace(0, 1, m)[:, None]
            field = (1 - ramp) * (1 - leds)[None, :] + ramp * leds[None, :] if side == "R" else ramp * (1 - leds)[None, :] + (1 - ramp) * leds[None, :]
            ct.pixels(C.FRONT_BAR, t, 0.6 * field)
        k += 1


# --- Round six: the community-show vocabulary, beat-locked -------------------------------------
# From the xLights sequences of Tesla's 5-car "The Arrival", the 4-car "Cyber Symphony" and the
# community Toccata (Curtain, Color Wash, Marquee, Morph, Shockwave, Snowstorm, SingleStrand), plus
# stage-lighting builds and releases. Every move starts on the song's tracked beats or downbeats
# (`_grid`, which the mood pacing thins to every 2nd/4th beat in calm passages) and spans whole
# beats or bars, so nothing floats free of the tempo.

def _bar_len(an):
    return 4 * 60.0 / max(an.tempo, 40)


def _next(grid, k, fallback):
    return float(grid[k + 1]) if k + 1 < len(grid) else float(grid[k]) + fallback


def _inner_side(car, cars):
    """The side of an outer car that faces the truck, in crowd terms."""
    centre = sum(c.x for c in cars) / len(cars)
    return "R" if car.x < centre else "L"


def curtain(cars, an, ph):
    """Curtain (the most-used non-On effect in the community shows). On the phrase's first downbeat
    the stage is unveiled crowd-left to right, slot by slot over one bar, and stays lit - signatures,
    DRLs and inner beams - with the headlights punching each downbeat in between; on the last bar the
    curtain draws closed right to left. The truck's bar opens and closes with it, LED by LED.
    Suits section starts and sustained, singing material in groove/drive; not strobe-y."""
    slots = slots6(cars)
    n = len(slots)
    ct = centre_truck(cars)
    downs = _grid(an, ph, "downbeats")
    bar = _bar_len(an)
    t_open = float(downs[0])
    span = ph.t1 - t_open
    if span < 1.5:
        return
    sweep = min(bar, span / 3)
    t_close = max(t_open + sweep, float(downs[-1]) if len(downs) > 2 else ph.t1 - sweep)
    on_at = list(_q_steps(an, t_open, sweep, n))
    off_at = list(_q_steps(an, t_close, sweep, n))[::-1]
    for j, (car, side) in enumerate(slots):
        car.light(car.accents(side) + car.inner(side), on_at[j], off_at[j])
        car.light(car.accents(side) + car.inner(side), off_at[j], off_at[j] + 0.6, OFF_500)
    for d in downs[1:]:
        if t_open + sweep < d < t_close - 0.1:
            for car in cars:
                car.flash(car.outer(), float(d), 0.18)
    if ct is not None:
        m = max(2, ct.fr(t_close + sweep) - ct.fr(t_open))
        tt = t_open + np.arange(m) * ct.step
        pos = np.linspace(0, 1, len(C.FRONT_BAR))
        # the truck owns slots 2 and 3, i.e. the middle third of the sweep
        opened = np.clip((tt[:, None] - t_open) / sweep * n - 2 - 2 * pos[None, :], 0, 1)
        closed = np.clip((tt[:, None] - t_close) / sweep * n - (n - 4) - 2 * (1 - pos[None, :]), 0, 1)
        ct.pixels(C.FRONT_BAR, t_open, 0.85 * opened * (1 - closed))


def breathe_wash(cars, an, ph):
    """Colour-wash breathing (the Arrival's long Color Wash blocks). Each car's signature and DRLs
    glow up on a 1 s ramp and fade on a 2 s ramp, the cars a beat apart so the breath rolls
    across the stage and back; the truck's bar swells and ebbs with it. One breath per two bars,
    started on the downbeats. The calmest collaborative move: intros, quiet verses, held chords."""
    order = sorted(cars, key=lambda q: q.x)
    downs = _grid(an, ph, "downbeats")
    beat = 60.0 / max(an.tempo, 40)
    bar = _bar_len(an)
    for k, d in enumerate(downs[::2]):
        d = float(d)
        if d > ph.t1 - 1.0:
            break
        seq = order if k % 2 == 0 else order[::-1]
        after = an.beats[an.beats >= d - 0.01]
        for j, car in enumerate(seq):
            ts = float(after[j]) if j < len(after) else d + j * beat
            up = min(ts + bar, ph.t1)
            if up - ts < 0.6:
                continue
            car.light(car.sig() + car.drl(), ts, up, C.ON_1000)
            car.light(car.sig() + car.drl(), up, up + 2.0, C.OFF_2000)
            if car.is_ct:
                car.light(car.inner(), ts, up, C.ON_1000)
                car.light(car.inner(), up, up + 2.0, C.OFF_2000)
                m = max(2, car.fr(up + 1.5) - car.fr(ts))
                env = np.sin(np.linspace(0, np.pi, m)) ** 1.5 * 0.7
                car.pixels(C.FRONT_BAR, ts, np.repeat(env[:, None], len(C.FRONT_BAR), 1))


def marquee(cars, an, ph):
    """Marquee / theatre chase (the Arrival, 45-50 s). Along the whole line of front lamps - eight
    per Y with the truck's between them - every third lamp is lit, and the pattern steps one lamp on
    each hit, so light crawls across every car; the bar chases in blocks of five LEDs. It turns
    round every two bars. Steps on the beat grid (every other beat when calm). Groove material."""
    order = sorted(cars, key=lambda q: q.x)
    line = [(c, lamp) for c in order for lamp in c.lamps()]
    ct = centre_truck(cars)
    hits = _grid(an, ph, "beats")
    beat = 60.0 / max(an.tempo, 40)
    per_turn = max(4, int(round(2 * _bar_len(an) / max(np.median(np.diff(hits)) if len(hits) > 1 else beat, 0.1))))
    phase = 0
    for k, b in enumerate(hits):
        b = float(b)
        hold = max(0.12, min(0.8, (_next(hits, k, beat) - b) * 0.92))
        phase = (phase + (1 if (k // per_turn) % 2 == 0 else -1)) % 3
        for i, (car, lamp) in enumerate(line):
            if i % 3 == phase:
                car.light(lamp, b, b + hold)
        if ct is not None:
            mask = ((np.arange(len(C.FRONT_BAR)) // 5) % 3 == phase).astype(float)
            m = max(2, ct.fr(b + hold) - ct.fr(b))
            ct.pixels(C.FRONT_BAR, b, np.repeat(mask[None, :], m, 0))


def crossing(cars, an, ph):
    """Crossing sweeps (the opposed Morph pair in Tesla's 5-car example). Two lights start at the
    two ends of the stage on the downbeat and run toward each other slot by slot, cross at the truck
    - its bar flares where they pass - and carry on to the far ends. One crossing per bar, two per
    bar in a frenzy. Big and kinetic: choruses, drive and climax passages, fast runs."""
    slots = slots6(cars)
    n = len(slots)
    ct = centre_truck(cars)
    downs = _grid(an, ph, "downbeats")
    bar = _bar_len(an)
    per_bar = 2 if getattr(ph, "mood", "") == "frenzy" else 1
    starts = [float(d) + bar * h / per_bar for d in downs for h in range(per_bar)]
    for d in starts:
        span = min(bar / per_bar, ph.t1 - d)
        if span < 0.4:
            continue
        per = span / n
        times = _q_steps(an, d, span, n)
        for s in range(n):
            t = float(times[s])
            for j in {s, n - 1 - s}:
                car, side = slots[j]
                car.light(car.accents(side) + car.heads(side), t, t + per * 1.15)
            if ct is not None and s in (n // 2 - 1, n // 2):
                bar_flash(ct, t, per * 1.6, 1.0)


def shockwave(cars, an, ph):
    """Shockwave (Toccata and Cyber Symphony). On each hit a ring leaves the truck: its bar flares
    from the centre outward, then 70 ms later the Ys' inner lamps, then their outer lamps, then the
    fogs and markers - the hit visibly travels out through the line. On downbeats in groove/drive,
    on every beat in a frenzy. For arrivals, drops after a build, and big accents."""
    ct = centre_truck(cars)
    ys = sides(cars)
    grid = _grid(an, ph, "beats" if getattr(ph, "mood", "") == "frenzy" else "downbeats")
    for k, t in enumerate(grid):
        t = float(t)
        ring = _beat_at(an, t) / 8                    # rings travel on thirty-second notes
        if k % 2 == 1:                          # the return: a ring collapsing from the Ys into the truck
            for y in ys:
                inner = _inner_side(y, cars)
                outer = "L" if inner == "R" else "R"
                y.flash(y.fogs() + y.markers(), t, 0.12)
                y.flash(y.heads(outer) + y.accents(outer), t + ring, 0.12)
                y.flash(y.accents(inner) + y.inner(inner), t + 2 * ring, 0.12)
            if ct is not None:
                m = max(2, ct.fr(t + 3 * ring + 0.3) - ct.fr(t + 3 * ring))
                bar_fill(ct, t + 3 * ring, 0.3, np.clip(np.linspace(1, 0, m), 0, 1), from_centre=True)
                ct.flash(ct.heads(), t + 3 * ring, 0.15)
            continue
        if ct is not None:
            m = max(2, ct.fr(t + 0.45) - ct.fr(t))
            grow = np.clip(np.linspace(0, 3.0, m), 0, 1)
            fade = np.clip(np.linspace(1.6, 0, m), 0, 1)
            bar_fill(ct, t, 0.45, grow, from_centre=True, env=fade)
            ct.flash(ct.heads(), t, 0.12)
        for y in ys:
            inner = _inner_side(y, cars)
            outer = "L" if inner == "R" else "R"
            y.flash(y.accents(inner) + y.inner(inner), t + ring, 0.12)
            y.flash(y.heads(outer) + y.accents(outer), t + 2 * ring, 0.12)
            y.flash(y.fogs() + y.markers(), t + 3 * ring, 0.14)


def sparkle(cars, an, ph):
    """Twinkle (the community Toccata's Snowstorm). Single lamps anywhere on the stage wink on at
    random, quantized to subdivisions of the beat, with sparkles darting along the truck's bar.
    Calm: one soft twinkle per beat that glows and fades. Frenzy: three sharp ones per sixteenth.
    For shimmering textures, trills, high bells, magical moments, and the quiet after a climax."""
    rng = np.random.default_rng(int(ph.t0 * 1000) % (2 ** 32))
    order = sorted(cars, key=lambda q: q.x)
    lamps = [(c, lamp) for c in order for lamp in c.lamps()]
    ct = centre_truck(cars)
    mood = getattr(ph, "mood", "groove")
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    if len(beats) < 2:
        beats = np.arange(ph.t0, ph.t1, 60.0 / max(an.tempo, 40))
    sub = {"calm": 1, "groove": 2, "drive": 2, "frenzy": 4}[mood]
    count = {"calm": 1, "groove": 1, "drive": 2, "frenzy": 3}[mood]
    hold = {"calm": 0.7, "groove": 0.25, "drive": 0.15, "frenzy": 0.08}[mood]
    ticks = [float(b) + _beat_at(an, float(b)) * s / sub for b in beats for s in range(sub)]
    for t in ticks:
        if t >= ph.t1 - 0.05:
            break
        for _ in range(count):
            car, lamp = lamps[rng.integers(len(lamps))]
            car.light(lamp, t, t + hold)
        if ct is not None:
            m = max(2, ct.fr(t + max(hold, 0.2)) - ct.fr(t))
            mask = np.zeros(len(C.FRONT_BAR))
            mask[rng.choice(len(C.FRONT_BAR), size=2 * count, replace=False)] = 1.0
            env = np.linspace(1, 0, m)[:, None]
            ct.pixels(C.FRONT_BAR, t, env * mask[None, :])


def sunrise(cars, an, ph):
    """Sunrise and sunset. Over the phrase the stage dawns from the truck outward on 2 s ramps -
    the truck, then the Ys' inner halves, then their outer halves, each on a downbeat - holds, and
    sets again from the outside in over the last bars. The bar glows from its centre. For the
    opening and closing of quiet pieces and long held passages: calm only."""
    slots = slots6(cars)
    n = len(slots)
    ct = centre_truck(cars)
    downs = list(_grid(an, ph, "downbeats"))
    if ph.t1 - ph.t0 < 3.0:
        return
    rings = sorted({int(abs(j - (n - 1) / 2)) for j in range(n)})       # 0 = truck, 2 = outer halves
    rise_at = [float(downs[min(r, len(downs) - 1)]) for r in rings]
    set_from = float(downs[-len(rings)]) if len(downs) >= 2 * len(rings) else ph.t1 - (ph.t1 - ph.t0) * 0.3
    set_step = max(0.4, (ph.t1 - set_from) / len(rings))
    for j, (car, side) in enumerate(slots):
        r = int(abs(j - (n - 1) / 2))
        on = rise_at[r]
        off = set_from + (len(rings) - 1 - r) * set_step
        if off - on < 0.8:
            continue
        chs = car.accents(side) + (car.inner(side) if r == 0 else [])
        car.light(chs, on, off, C.ON_2000)
        car.light(chs, off, off + 2.0, C.OFF_2000)
    if ct is not None:
        t0, t1 = rise_at[0], ph.t1
        m = max(2, ct.fr(t1) - ct.fr(t0))
        x = np.linspace(0, 1, m)
        level = np.clip(np.minimum(x / 0.4, (1 - x) / 0.3), 0, 1) * 0.6
        bar_fill(ct, t0, t1 - t0, level, from_centre=True, env=np.full(m, 0.6))


def scanner(cars, an, ph):
    """Larson scanner (the community Toccata's SingleStrand chase). A bright eye with a fading tail
    sweeps the truck's bar end to end, one sweep per hit interval, and the Y at whichever end it
    reaches answers with its near headlight - so the sweep bounces off the outer cars like a ball
    between walls. Ys idle on a dim DRL. Groove/drive; nice for ostinatos and walking basslines."""
    ct = centre_truck(cars)
    order = sorted(cars, key=lambda q: q.x)
    if ct is None:
        return wave(cars, an, ph)
    hits = _grid(an, ph, "beats")
    beat = 60.0 / max(an.tempo, 40)
    leds = np.arange(len(C.FRONT_BAR))
    for y in (order[0], order[-1]):
        if not y.is_ct:
            y.light(y.drl(), ph.t0, ph.t1, C.ON_1000)
    for k, b in enumerate(hits):
        b = float(b)
        dur = max(0.2, _next(hits, k, beat) - b)
        ltr = k % 2 == 0
        m = max(2, ct.fr(b + dur) - ct.fr(b))
        pos = np.linspace(0, len(leds) - 1, m)
        if not ltr:
            pos = pos[::-1]
        behind = (leds[None, :] - pos[:, None]) * (-1 if ltr else 1)      # >0 behind the eye
        field = np.where(behind >= 0, np.exp(-behind / 6.0), np.exp(behind / 1.5))
        ct.pixels(C.FRONT_BAR, b, field)
        end_car = order[-1] if ltr else order[0]
        if not end_car.is_ct:
            side = _inner_side(end_car, cars)
            end_car.flash(end_car.heads(side) + end_car.accents(side), b + dur, min(0.25, dur * 0.6))


def accelerando(cars, an, ph):
    """Build: a strobe roll with a stack, the club build-up. The hits subdivide as the phrase climbs
    - every two beats, every beat, eighths, then sixteenths in the last stretch - while lamp layers
    join one at a time (markers, fogs, signatures and DRLs, then headlights) and the truck's bar
    fills in from both ends. Half a beat of black before the end, then the whole stage lands on the
    next downbeat. For crescendos and pre-chorus climbs; never in calm passages."""
    beat = 60.0 / max(an.tempo, 40)
    ct = centre_truck(cars)
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    if len(beats) < 4:
        beats = np.arange(ph.t0, ph.t1, beat)
    land = float(an.beats[an.beats >= ph.t1 - 0.1][0]) if np.any(an.beats >= ph.t1 - 0.1) else ph.t1
    stop = land - beat / 2
    span = max(stop - ph.t0, 0.5)
    layers = [lambda c: c.markers(), lambda c: c.fogs(), lambda c: c.accents(), lambda c: c.heads()]
    ticks = []
    for b in beats:
        b = float(b)
        q = min(3, int(4 * (b - ph.t0) / span))
        sub = [0.5, 1, 2, 4][q]
        if sub < 1:
            if len(ticks) and b - ticks[-1][0] < 2 * beat * 0.9:
                continue
            ticks.append((b, q))
        else:
            ticks += [(b + beat * s / sub, q) for s in range(int(sub))]
    for t, q in ticks:
        if t >= stop:
            break
        flash = min(0.12, beat / [0.5, 1, 2, 4][q] * 0.5)
        for c in cars:
            chs = sum((layer(c) for layer in layers[:q + 1]), [])
            c.flash(chs, t, flash)
    if ct is not None:
        m = max(2, ct.fr(stop) - ct.fr(ph.t0))
        bar_fill(ct, ph.t0, stop - ph.t0, np.linspace(0, 1, m) ** 1.5, from_centre=False)
    for c in cars:
        c.set(c.everything(), stop, land, 0)
        c.set(list(C.FRONT_BAR), stop, land, 0)
    all_on(cars, land, 0.5, blackout=False)


def teardown(cars, an, t0, span):
    """Release after a peak (an un-stack): the whole stage is on at t0, then comes apart layer by
    layer at a slowing rate - fogs and markers, the Ys' headlights, the truck's headlights, then the
    signatures - each fading on a 1 s ramp, until only the DRLs glow and fade out. The bar dissolves
    LED by LED from its ends. Called by the choreographer on the downbeat after a build when the
    music drops, for `span` seconds (about two bars)."""
    ct = centre_truck(cars)
    ys = sides(cars)
    stages = [(0.15, lambda c: c.fogs() + c.markers(), cars),
              (0.35, lambda c: c.heads(), ys),
              (0.6, lambda c: c.heads(), [ct] if ct else []),
              (0.85, lambda c: c.sig(), cars)]
    for frac, group, who in stages:
        for c in who:
            off = t0 + span * frac
            c.light(group(c), t0, off)
            c.light(group(c), off, off + 1.0, OFF_1000)
    for c in cars:
        c.light(c.drl(), t0, t0 + span, ON)
        c.light(c.drl(), t0 + span, t0 + span + 2.0, C.OFF_2000)
    if ct is not None:
        m = max(2, ct.fr(t0 + span) - ct.fr(t0))
        rng = np.random.default_rng(int(t0 * 1000) % (2 ** 32))
        d = np.abs(np.linspace(-1, 1, len(C.FRONT_BAR)))
        die = np.clip((1 - d) * 0.8 + rng.random(len(C.FRONT_BAR)) * 0.2, 0, 1)     # ends die first
        x = np.linspace(0, 1, m)[:, None]
        ct.pixels(C.FRONT_BAR, t0, (x < die[None, :]).astype(float))


# --- Round seven: more from the community shows' timing data ------------------------------------

def ping_pong(cars, an, ph):
    """Ping-pong lead (Cyber Symphony): the two Ys trade hits half a beat apart - one on the beat,
    the other on the "and" - and the lead swaps every bar, while the truck's bar answers on each
    downbeat. Reads as a rally between the outer cars. Groove/drive."""
    order = sorted(cars, key=lambda q: q.x)
    ys = [c for c in order if not c.is_ct]
    ct = centre_truck(cars)
    if len(ys) < 2:
        return lr_beat(cars, an, ph)
    beats = _grid(an, ph, "beats")
    half = 30.0 / max(an.tempo, 40)
    downs = set(np.round(an.downbeats, 2))
    bar_k = 0
    for b in beats:
        b = float(b)
        if round(b, 2) in downs:
            bar_k += 1
            if ct is not None:
                bar_flash(ct, b, 0.3, 0.9)
        lead, follow = (ys[0], ys[-1]) if bar_k % 2 == 0 else (ys[-1], ys[0])
        half = _beat_at(an, b) / 2
        lead.flash(lead.heads() + lead.accents(), b, min(0.2, half * 0.8))
        follow.flash(follow.heads() + follow.accents(), _snap(an, b + half, 2), min(0.2, half * 0.8))


def metronome(cars, an, ph):
    """Metronome car (the 5-car Arrival): the stage holds a soft glow while one car at a time
    takes a slow solo pulse, moving left, centre, right, centre on each hit (every bar when calm).
    Spacious and patient: calm intros and quiet verses with a steady pulse underneath."""
    order = sorted(cars, key=lambda q: q.x)
    seq = order + order[-2:0:-1]
    hits = _grid(an, ph, "beats")
    beat = 60.0 / max(an.tempo, 40)
    for c in cars:
        c.light(c.drl(), ph.t0, ph.t1, C.ON_1000)
        c.light(c.drl(), ph.t1, ph.t1 + 1.0, OFF_1000)
    for k, b in enumerate(hits):
        b = float(b)
        car = seq[k % len(seq)]
        hold = max(0.3, min(1.2, (_next(hits, k, beat) - b) * 0.6))
        car.light(car.sig() + car.inner(), b, b + hold, C.ON_500)
        car.light(car.sig() + car.inner(), b + hold, b + hold + 1.0, OFF_1000)
        if car.is_ct:
            m = max(2, car.fr(b + hold + 0.5) - car.fr(b))
            env = np.concatenate([np.linspace(0, 0.8, max(1, m // 3)), np.linspace(0.8, 0, m - max(1, m // 3))])
            car.pixels(C.FRONT_BAR, b, np.repeat(env[:, None], len(C.FRONT_BAR), 1))


def stripes(cars, an, ph):
    """Stripe scroll (Cyber Symphony's Bars): four bright stripes scroll along the truck's bar for
    two beats, then reverse; the Ys answer as a mirrored pair - inner halves on one two-beat block,
    outer halves on the next. Groove/drive under a steady rhythm section."""
    ct = centre_truck(cars)
    ys = sides(cars)
    beats = _grid(an, ph, "beats")
    beat = 60.0 / max(an.tempo, 40)
    blocks = beats[::2]
    leds = np.arange(len(C.FRONT_BAR))
    for k, b in enumerate(blocks):
        b = float(b)
        dur = max(0.3, _next(blocks, k, 2 * beat) - b)
        for y in ys:
            inner = _inner_side(y, cars)
            side = inner if k % 2 == 0 else ("L" if inner == "R" else "R")
            y.light(y.accents(side) + y.heads(side), b, b + min(dur * 0.9, beat * 1.2))
        if ct is not None:
            m = max(2, ct.fr(b + dur) - ct.fr(b))
            shift = np.linspace(0, 2.5 * len(leds) / 4, m) * (1 if k % 2 == 0 else -1)
            field = ((((leds[None, :] + shift[:, None]) % (len(leds) / 4)) < 4).astype(float))
            ct.pixels(C.FRONT_BAR, b, field)


def flutter(cars, an, ph):
    """Flutter (the Arrival's six quick washes): the whole stage flickers on sixteenths, the outer
    pair against the truck, for a beat at a time with a beat's rest between - a shiver of light
    for trills, tremolo strings and the last bar before a drop. Frenzy only."""
    order = sorted(cars, key=lambda q: q.x)
    ct = centre_truck(cars)
    ys = [c for c in order if not c.is_ct]
    beats = an.beats[(an.beats >= ph.t0) & (an.beats < ph.t1)]
    if len(beats) < 2:
        beats = np.arange(ph.t0, ph.t1, 60.0 / max(an.tempo, 40))
    for k, b in enumerate(beats):
        if k % 2:
            continue
        six = _beat_at(an, float(b)) / 4
        for s in range(4):
            t = float(b) + s * six
            who = ys if s % 2 == 0 else ([ct] if ct else [])
            for c in who:
                c.flash(c.heads() + c.accents(), t, six * 0.6)
            if ct is not None and s % 2 == 1:
                bar_flash(ct, t, six * 0.8, 1.0)
