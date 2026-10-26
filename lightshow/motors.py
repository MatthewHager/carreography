"""The motor choreographer: closures as their own slow instruments, a side stage to the lights.

Lights flash in 20 ms; the motors move in seconds (mirrors 2 s, windows 4 s, frunk and liftgates
14 s up / 4 s down, charge port 2 s), and Tesla counts their commands per show *per closure*
(liftgate 6, each window 6, each mirror 20, charge port 3). So they get their own choreography,
planned from the form map and the crescendos rather than from the light cues, with its own moves:

  Lids (frunk + liftgates), one gesture per crescendo, spent on the three biggest:
    outside-in   the Ys lift first, the truck's frunk lands exactly on the peak
    wave         left to right a second apart, closing in the same order
    staircase    the truck starts first and goes highest, the Ys later and lower
    (a Stop on the peak freezes a lid part-way, so short builds still land on the beat)
  Windows (6 commands per window; all down at the start, left down at the end):
    travelling dance   fronts or rears dance for 6 s, car after car, direction alternating
    ripple glide       in a calm section the windows glide up car by car and back down
  Mirrors (20 commands per mirror, six mirrors across the lineup), on their own musical timing:
    wave left-right, wave right-left, outside-in, inside-out, alternate, wink, together
  Charge port (3 commands): opens ahead of its rainbow dance through the loud half, closes near the end.
"""

import numpy as np

from . import channels as C

LIFTGATE_OPEN_S = {"modely": 14.0, "cybertruck": 14.0}  # frunk time unpublished; assume the liftgate's
LIFTGATE_CLOSE_S = 4.0
WINDOW_S, PORT_S, MIRROR_S = 4.0, 2.0, 2.0


def _tier_at(an, t):
    from .choreo import _tier_at as f
    return f(an, t)


def _ceiling_at(an, t):
    from .choreo import _ceiling_at as f
    return f(an, t)


def _runs(mask):
    from .choreo import _runs as f
    return f(mask)


def _liftgate_windows(car, an):
    """[(start, end)] spans where the liftgate channel already carries commands, with travel."""
    col = car.frames[:, C.LIFTGATE]
    idx = np.flatnonzero(col)
    if not len(idx):
        return []
    spans, a = [], idx[0]
    for i, j in zip(idx[:-1], idx[1:]):
        if j - i > int(20.0 / an.step):
            spans.append((a * an.step - 1, i * an.step + 15))
            a = j
    spans.append((a * an.step - 1, idx[-1] * an.step + 15))
    return spans


def _crescendos(an, lead, max_n=3, spacing=24.0):
    """(peak_time, build_length, hold_until) for the biggest crescendos, in time order.

    A crescendo peak is where a sustained rise in loudness tops out: the end of each detected
    build, plus every arrival chord. Its build length is how long the loudness had been rising
    (back to where it was under 55% of the peak). Peaks are ranked by height x length, kept at
    least `spacing` apart, and the final climax of the piece is always included.
    """
    step, inten = an.step, an.intensity
    cands = []
    forced = list(getattr(an, "cue_peaks", None) or [])
    # The choreographer's own crescendo phrases are the best source: they end on the peak.
    for ph in getattr(an, "phrases", []) or []:
        if getattr(ph, "move", None) in ("out_in", "fill_stage", "bounce_build", "implode", "accelerando"):
            # The top of the build: the loudest instant in the last 3 s of the phrase.
            f0, f1 = int(max(ph.t0, ph.t1 - 3.0) / step), int(min(ph.t1 + 0.3, an.duration) / step)
            top_t = (f0 + int(np.argmax(an.loud_fast[f0:max(f1, f0 + 1)]))) * step
            cands.append((top_t, max(top_t - ph.t0, 1.0), 0.5))   # bonus: a choreographed build
        elif ph.gesture == "cadence":
            cands.append((ph.t0, None, 0.3))
    for a, b in _runs(an.build > 0):
        cands.append(((b - 1) * step, (b - a) * step, 0.0))
    ev = an.events
    if ev is not None:
        for t in ev.t[ev.arrival == 1]:
            cands.append((float(t), None, 0.2))
    peaks = []
    for t, blen, bonus in cands:
        f = min(int(t / step), len(inten) - 1)
        pk = inten[max(0, f - 5): f + 15].max()
        if blen is None:
            g = f
            while g > 0 and inten[g] > 0.55 * pk:
                g -= 1
            blen = max((f - g) * step, 3.0)
        # hold while it stays loud, at most 16 s
        h = f
        while h < len(inten) - 1 and inten[h] > 0.6 * pk and (h - f) * step < 16:
            h += 1
        peaks.append((t, float(np.clip(blen, 1.0, lead)), h * step, float(pk) + bonus))
    if not peaks:
        return []
    peaks.sort(key=lambda p: p[0])
    merged = []
    for p in peaks:  # within 6 s: one peak, keeping the longer build and the louder top
        if merged and p[0] - merged[-1][0] < 6:
            q = merged[-1]
            merged[-1] = (p[0] if p[3] >= q[3] else q[0], max(p[1], q[1]), max(p[2], q[2]), max(p[3], q[3]))
        else:
            merged.append(p)
    # The final climax: the last crescendo in the closing quarter (a piece's last build is its
    # ending gesture, whatever the meter says), as long as it is not a mere ripple.
    top = max(p[3] for p in merged)
    late = [p for p in merged if p[0] >= 0.75 * an.duration and p[3] >= 0.4 * top]
    final = max(late, key=lambda p: p[0]) if late else None
    ranked = []
    for t, blen, hold, is_final in forced:   # cue-sheet peaks come first, whatever the meter says
        hold_until = an.duration if is_final else (t + hold if hold else min(t + 8.0, an.duration))
        ranked.append((t, float(np.clip(blen, 1.0, lead)), hold_until, 10.0 if is_final else 9.0, True))
    if final and all(abs(final[0] - q[0]) >= 6 for q in ranked):
        ranked.append((final[0], final[1], an.duration, final[3] + 1.0, False))
    for p in sorted(merged, key=lambda p: p[3] * (0.5 + p[1] / lead), reverse=True):
        if all(abs(p[0] - q[0]) >= spacing for q in ranked):
            ranked.append((p[0], p[1], p[2], p[3], False))
    return ranked


def _on_beat(an, t, reach=0.35):
    """`t` moved onto the nearest beat if one is within `reach` s: a motor starting to move, or a
    lid stopping at its peak, is a visible accent and should land with the music."""
    b = np.asarray(getattr(an, "beats", []), float)
    if not len(b):
        return t
    i = int(np.argmin(np.abs(b - t)))
    return float(b[i]) if abs(b[i] - t) <= reach else t


def _loud_stretches(an, tier=3):
    return sorted([(a * an.step, b * an.step) for a, b in _runs(an.tier >= tier)], key=lambda s: s[0] - s[1])


def choreograph(cars, an, use_liftgate):
    end = an.duration
    loud = _loud_stretches(an, 3) or _loud_stretches(an, 2)
    climax = loud[0] if loud else None

    for c in cars:
        # Windows: 6 commands *per window*, and they never close during the show - Tesla's README
        # notes the music only plays from the cabin speakers, so the crowd hears it through the open
        # windows. All four go down at the start. The waves are Dance bursts instead (a lowered window
        # dancing bobs up a little and back): fronts first, rears half a burst later, rolling across
        # the cars - left to right, then right to left, then Ys-then-truck. The biggest peak gets a
        # longer dance from every window; a final Open puts every window fully down again. Dancing
        # stays well under Tesla's ~30 s per show recommendation (thermal limits).
        for w in C.WINDOWS:
            c.closure(w, 0.2, 0.7, C.CLOSURE_OPEN)
        order = sorted(cars, key=lambda q: q.x)
        idx = order.index(c)
        n_cars = len(order)
        secs = getattr(an, "sections", None) or []
        peaks = sorted(_crescendos(an, LIFTGATE_OPEN_S[c.kind]), key=lambda p: -p[3])
        bar = 4 * 60.0 / max(an.tempo, 40)
        beat = bar / 4
        burst = beat * max(2, round(2.5 / beat))                 # ~2.5 s, a whole number of beats
        half = beat * max(1, round(burst / beat) // 2)
        peak_t = _on_beat(an, peaks[0][0]) if peaks else None
        # wave moments: starts of lively sections, spread over the piece, clear of the peak dance
        wave_cands = sorted({round(sc.t0, 1) for sc in secs if sc.ceiling >= 2 and 8 < sc.t0 < end - 20})
        waves, last = [], -1e9
        for t in wave_cands:
            if t - last >= max(30.0, (end - 20) / 5) and (peak_t is None or abs(t - peak_t) > 15):
                waves.append(t)
                last = t
            if len(waves) >= 3:
                break
        fronts, rears = [C.L_FRONT_WINDOW, C.R_FRONT_WINDOW], [C.L_REAR_WINDOW, C.R_REAR_WINDOW]
        for k, t in enumerate(waves):
            if k % 3 == 0:
                lag = idx * half                                        # left to right
            elif k % 3 == 1:
                lag = (n_cars - 1 - idx) * half                         # right to left
            else:
                lag = 0.0 if not c.is_ct else burst                     # the Ys, then the truck
            t0 = _on_beat(an, t + lag)
            for w in fronts:
                c.closure(w, t0, t0 + burst, C.CLOSURE_DANCE)
            for w in rears:
                c.closure(w, t0 + half, t0 + half + burst, C.CLOSURE_DANCE)
        if peak_t is not None:
            span = 8.0
            t0 = peak_t + idx * beat
            if t0 + span > end - 6:
                t0 = max(1.0, end - 6 - span)
            if all(abs(t0 - w0) > span + 3 * burst for w0 in waves):
                for j, w in enumerate(C.WINDOWS):
                    c.closure(w, t0 + 0.3 * j, t0 + 0.3 * j + span, C.CLOSURE_DANCE)
        last_dance = max([w0 + 3 * burst for w0 in waves] + ([t0 + span + 1.5] if peak_t is not None else [0.0]))
        if last_dance > 1.0:
            for w in C.WINDOWS:                                         # back fully down
                c.closure(w, min(end - 2.0, last_dance + 1.0), min(end - 1.5, last_dance + 1.5), C.CLOSURE_OPEN)

    if climax:
        a, b = climax
        for c in cars:
            # Charge port: open ahead so the rainbow starts on the climax; dance for at most 30 s
            # (Tesla's recommendation for any closure), well inside the 2-minute auto-close.
            open_at = max(0.8, _on_beat(an, a) - PORT_S - 0.5)      # the rainbow starts on a beat
            dance_end = min(max(b, open_at + PORT_S + 8.0), open_at + PORT_S + 0.5 + 29.5, end - 6)
            c.closure(C.CHARGE_PORT, open_at, open_at + 0.5, C.CLOSURE_OPEN)
            c.closure(C.CHARGE_PORT, open_at + PORT_S + 0.5, dance_end, C.CLOSURE_DANCE)
            c.closure(C.CHARGE_PORT, dance_end + 0.3, dance_end + 0.8, C.CLOSURE_CLOSE)
    # Liftgate / frunk: the opening *is* the crescendo. For each of the biggest builds, start
    # opening `build length` before the peak so it is still rising all the way up, Stop on the
    # peak (partial for short builds, full for 14 s ones), hold through the loud stretch, then
    # close in the quiet after so it can do it again. Open + Close count: 3 crescendos per show.
    if use_liftgate:
        order = sorted(cars, key=lambda q: q.x)
        n = len(order)
        ct_idx = next((i for i, q in enumerate(order) if q.is_ct), n // 2)
        budget = C.CLOSURE_LIMITS[C.LIFTGATE] // 2                # open + close per crescendo
        lead = max(LIFTGATE_OPEN_S[c.kind] for c in cars)
        accepted = []                                            # shared: the cars move as one lineup
        busy = {id(c): [] for c in cars}

        def lid_plan(pattern, k, peak, build_len, hold_until):
            """Per-car (open_at, stop_at|None, close_at) for one crescendo. Every figure is a
            cross-car one rather than three lids rising together:
              relay      one lid lifts part way and Stops; as it drops the next lifts; the last rises
                         all the way onto the peak (crowd-left to right, then right to left next time)
              alternate  the two Ys lift together and, as they drop, the truck's frunk rises to the peak
              wave       left to right two seconds apart, closing in the same order"""
            travel = max(3.5, min(lead, max(build_len, 6.0)))     # the lid that lands on the peak
            rise = max(5.0, min(lead * 0.5, build_len / 2))      # a part-way lift (about a third of the travel)
            plan = {}
            for idx, c in enumerate(order):
                lag, stop_at = 0.0, None
                if pattern == 0:
                    stage = (n - 1 - idx) if k % 2 else idx
                    if stage == n - 1:
                        open_at = peak - travel
                    else:
                        open_next = peak - travel
                        for _ in range(n - 1 - stage):          # each lid closes 0.8 s before the next lifts
                            open_next = open_next - 0.8 - 0.3 - rise
                        open_at = open_next
                        stop_at = open_at + rise
                        close_at = stop_at + 0.3
                elif pattern == 1:
                    if c.is_ct:
                        open_at = peak - travel
                    else:
                        close_at = peak - travel - 0.8
                        stop_at = close_at - 0.3
                        open_at = stop_at - rise
                else:
                    lag = (idx - ct_idx) * 2.0
                    open_at = peak + lag - travel
                if stop_at is None:
                    close_at = min(max(hold_until, peak + 2.0), end - LIFTGATE_CLOSE_S - 2.5) + max(lag, 0.0)
                    if travel < lead - 0.5:                      # short build: freeze part-way, on the peak
                        stop_at = peak + lag
                plan[id(c)] = (open_at, stop_at, close_at)
            return plan

        for peak, build_len, hold_until, _score, forced in _crescendos(an, lead):
            peak = _on_beat(an, peak)
            if len(accepted) >= budget:
                break
            k = len(accepted)
            plan = lid_plan(k % 3, k, peak, build_len, hold_until)
            ok = True
            for c in cars:
                open_at, stop_at, close_at = plan[id(c)]
                win = (open_at - 1.0, close_at + LIFTGATE_CLOSE_S + 1.0)
                if open_at < 0.8 or close_at <= open_at + 2.0 or any(not (win[1] < a or win[0] > b) for a, b in busy[id(c)]):
                    ok = False
            if not ok:
                continue
            accepted.append(peak)
            for c in cars:
                open_at, stop_at, close_at = plan[id(c)]
                busy[id(c)].append((open_at - 1.0, close_at + LIFTGATE_CLOSE_S + 1.0))
                c.closure(C.LIFTGATE, open_at, open_at + 0.5, C.CLOSURE_OPEN)
                if stop_at is not None:
                    c.set(C.LIFTGATE, stop_at, stop_at + 0.3, C.CLOSURE_STOP)
                c.closure(C.LIFTGATE, close_at, close_at + 0.5, C.CLOSURE_CLOSE)
        for c in cars:
            lead = LIFTGATE_OPEN_S[c.kind]
            idx = order.index(c)
            # Any pairs left over become slow "breaths" on long calm phrases: open half way
            # (7 s), hold, close (4 s), ending with the phrase - each car 2.5 s after the one to
            # its left, so even the breath rolls across the stage.
            busy = _liftgate_windows(c, an)
            calm = sorted((ph for ph in getattr(an, "phrases", []) or []
                           if ph.gesture in ("recitative", "chords") and ph.t1 - ph.t0 >= 12),
                          key=lambda ph: ph.t1 - ph.t0, reverse=True)
            for ph in calm:
                if c.closure_counts[C.LIFTGATE] > C.CLOSURE_LIMITS[C.LIFTGATE] - 2:
                    break
                t_open = ph.t0 + 0.5 + idx * 2.5
                t_close = ph.t1 - LIFTGATE_CLOSE_S - 0.5
                if t_close - t_open < 9 or any(not (t_close + LIFTGATE_CLOSE_S < a or t_open > b) for a, b in busy):
                    continue
                c.closure(C.LIFTGATE, t_open, t_open + 0.5, C.CLOSURE_OPEN)
                c.set(C.LIFTGATE, t_open + lead / 2, t_open + lead / 2 + 0.3, C.CLOSURE_STOP)
                c.closure(C.LIFTGATE, t_close, t_close + 0.5, C.CLOSURE_CLOSE)
                busy.append((t_open - 1, t_close + LIFTGATE_CLOSE_S + 1))

    # Mirrors: 20 commands *per mirror*, six mirrors across the lineup, on their own musical clock.
    #   tempo pulse   in the steadiest loud section: fold on one bar, unfold on the next, the left
    #                 mirrors and the right mirrors alternating, so the line keeps time (6 cycles each)
    #   gestures      four fold-and-unfold figures spread over the piece on the biggest landings:
    #                 wave left-right, outside-in, wave right-left, inside-out
    order = sorted(cars, key=lambda q: q.x)
    line = [(c, m) for c in order for m in (C.R_MIRROR, C.L_MIRROR)]     # crowd-left to crowd-right
    n = len(line)
    spent = {(id(c), m): 0 for c, m in line}
    secs = getattr(an, "sections", None) or []
    bar = 4 * 60.0 / max(an.tempo, 40)
    # fold on one beat of the cycle, unfold half a cycle later: half a cycle must cover the whole
    # 2 s fold, so slow songs pulse every second (or third) bar rather than half-folding
    cycle = bar * int(np.ceil((2 * MIRROR_S + 0.1) / bar))
    # 1. The tempo pulse: the longest section with ceiling >= 2 and a usable beat.
    pulse = None
    if an.beat_score >= 2.0:
        def regularity(sc):   # how evenly the tracked beats fill the section (1 = metronomic)
            b = an.beats[(an.beats >= sc.t0) & (an.beats < sc.t1)]
            if len(b) < 8:
                return 0.0
            gaps = np.diff(b)
            return float(np.clip(1 - np.std(gaps) / max(np.mean(gaps), 1e-6), 0, 1))
        cands = [sc for sc in secs if sc.ceiling >= 2 and sc.t1 - sc.t0 >= 6 * cycle + 4 and sc.t0 > 6
                 and regularity(sc) >= 0.6]
        if cands:
            pulse = max(cands, key=lambda sc: (sc.ceiling, regularity(sc) * (sc.t1 - sc.t0)))
    pulse_window = None
    if pulse is not None:
        beats = an.beats[(an.beats >= pulse.t0 + 1) & (an.beats < pulse.t1 - 4)]
        # Walk the section's own beats at the mirrors' cycle (one or two bars), so the pulse
        # stays on the music's grid even when the tempo drifts a little.
        grid = []
        if len(beats) >= 8:
            per = max(1, int(round(cycle / max(np.median(np.diff(beats)), 0.2))))
            grid = list(beats[::per])
        if len(grid) < 4 or abs(np.median(np.diff(grid)) - cycle) > 0.3 * cycle:
            grid = list(np.arange(pulse.t0 + 1, pulse.t1 - 4, cycle))   # the tracker is unsure: even time
        t_prev = -9
        cycles = 0
        for d in grid:
            if d - t_prev < cycle - 0.1 or cycles >= 12:
                continue
            parity = cycles % 2
            mode = (cycles // 4) % 3        # four cycles each: Ys vs truck, left half vs right half, ripple
            for j, (c, m) in enumerate(line):
                if mode == 0:
                    on = (0 if c.is_ct else 1) == parity
                elif mode == 1:
                    on = (j < n // 2) == (parity == 0)
                else:
                    on = True
                if not on or spent[(id(c), m)] + 2 > C.CLOSURE_LIMITS[m] - 8:
                    continue
                lag = (j if parity == 0 else n - 1 - j) * (cycle / 2 - MIRROR_S) / max(n - 1, 1) if mode == 2 else 0.0
                c.closure(m, d + lag, d + lag + 0.4, C.CLOSURE_CLOSE)
                c.closure(m, d + lag + cycle / 2, d + lag + cycle / 2 + 0.4, C.CLOSURE_OPEN)
                spent[(id(c), m)] += 2
            t_prev = d
            cycles += 1
        pulse_window = (pulse.t0, pulse.t1)
    # 2. Gestures on the biggest landings, spread over the piece.
    moments = []
    for ph in getattr(an, "phrases", []) or []:
        if getattr(ph, "move", "") in ("out_in", "fill_stage", "bounce_build", "implode", "accelerando"):
            moments.append((ph.t1, 3.0))
    ev = an.events
    for i in np.flatnonzero(ev.arrival == 1):
        moments.append((float(ev.t[i]), 2.0))
    for h in an.hits:
        if _tier_at(an, float(h)) >= 2:
            moments.append((float(h), 1.0))
    moments.sort(key=lambda m: -m[1])
    picks = []
    for t, _w in moments:
        if t < 3 or t > end - 9:
            continue
        if pulse_window and pulse_window[0] - 4 < t < pulse_window[1] + 4:
            continue
        if all(abs(t - q) >= max(25.0, (end - 12) / 6) for q in picks):
            picks.append(t)
    picks.sort()
    patterns = ["wave_lr", "car_alternate", "outside_in", "alternate", "wave_rl", "inside_out", "together"]
    beat = bar / 4
    step = max(0.2, beat / 2)                               # an eighth note between neighbours
    hold = beat * int(np.ceil((MIRROR_S + 0.5) / beat))     # fold to unfold: whole beats, >= the 2 s fold
    for k, t in enumerate(picks):
        t = _on_beat(an, t)
        pat = patterns[k % len(patterns)]
        for j, (c, m) in enumerate(line):
            if pat == "wave_lr":
                lag = j * step
            elif pat == "wave_rl":
                lag = (n - 1 - j) * step
            elif pat == "outside_in":
                lag = min(j, n - 1 - j) * beat
            elif pat == "inside_out":
                lag = (n // 2 - 1 - min(j, n - 1 - j)) * beat
            elif pat == "alternate":                        # every other mirror, then the rest as they unfold
                lag = (j % 2) * hold
            elif pat == "car_alternate":                    # the Ys fold, the truck folds as they unfold
                lag = hold if c.is_ct else 0.0
            else:
                lag = 0.0
            if spent[(id(c), m)] + 2 > C.CLOSURE_LIMITS[m]:
                continue
            c.closure(m, t + lag, t + lag + 0.4, C.CLOSURE_CLOSE)
            c.closure(m, t + lag + hold, t + lag + hold + 0.4, C.CLOSURE_OPEN)
            spent[(id(c), m)] += 2
