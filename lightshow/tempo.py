"""Continuous quantization: a beat map that follows the performer, not a metronome.

The beat tracker gives a reasonable grid for band songs, but organ and orchestral recordings
speed up, hold back and breathe, and its beats drift off what is actually played. Here each
tracked beat is pulled onto the strongest played onset near it (a note, a chord, a bass attack),
beats with nothing played near them are re-spaced between their anchored neighbours so the tempo
changes smoothly, and the result is the grid every move quantizes to (moves._sub_grid / _snap).
"""

import numpy as np


def _onsets(an):
    """(times, strengths) of the played attacks: transcribed note events (chords count more) and
    the bass onsets."""
    ev = an.events
    t = [np.asarray(ev.t, float)]
    w = [np.asarray(ev.amp, float) * (1 + 0.5 * (np.asarray(ev.kind) >= 2))]
    if len(an.bass):
        t.append(np.asarray(an.bass)[:, 0].astype(float))
        w.append(np.asarray(an.bass)[:, 1].astype(float))
    t, w = np.concatenate(t), np.concatenate(w)
    order = np.argsort(t)
    t, w = t[order], w[order]
    if len(w):
        w = w / (np.median(w) + 1e-9)
    return t, w


def follow(an, reach=0.16, min_strength=0.6, span=3, agree=0.06):
    """Beat times that follow what is played. Two passes:
      1. anchor: each tracked beat moves to the strongest played onset within `reach` x the local
         beat (only attacks at least `min_strength` x the median count);
      2. flow: a straight line is fitted through the anchors of the `span` beats either side, which
         is the local tempo. A beat keeps its anchor - the exact played time - when the anchor is
         within `agree` x the local beat of that line; otherwise (an off-beat note was grabbed, or
         nothing was played) it sits on the line. The tempo then glides through rubato and only
         ever lands on real attacks or on the smooth flow between them.
    Returns (beats, anchored_mask)."""
    b0 = np.asarray(an.beats, float)
    if len(b0) < 4:
        return b0.copy(), np.zeros(len(b0), bool)
    t, w = _onsets(an)
    keep = w >= min_strength
    t, w = t[keep], w[keep]
    gaps = np.diff(b0)
    local = np.concatenate([[gaps[0]], 0.5 * (gaps[:-1] + gaps[1:]), [gaps[-1]]])
    anchor = b0.copy()
    has = np.zeros(len(b0), bool)
    for i in range(len(b0)):
        lo, hi = np.searchsorted(t, [b0[i] - reach * local[i], b0[i] + reach * local[i]])
        if hi > lo:
            cand = np.arange(lo, hi)
            score = w[cand] - np.abs(t[cand] - b0[i]) / (reach * local[i])
            anchor[i] = t[cand[np.argmax(score)]]
            has[i] = True
    out = b0.copy()
    final = np.zeros(len(b0), bool)
    idx = np.arange(len(b0))
    for i in range(len(b0)):
        lo, hi = max(0, i - span), min(len(b0), i + span + 1)
        # don't fit across a fermata / silence: stop at gaps over twice the local beat
        seg = np.arange(lo, hi)
        brk = np.flatnonzero(gaps[lo:hi - 1] > 2 * local[i])
        for k in brk:
            if lo + k < i:
                seg = seg[seg > lo + k]
            else:
                seg = seg[seg <= lo + k]
        pts = seg[has[seg]]
        if len(pts) >= 3:
            c = np.polyfit(idx[pts], anchor[pts], 1)
            line = float(np.polyval(c, i))
        else:
            line = b0[i]
        if has[i] and abs(anchor[i] - line) <= agree * local[i]:
            out[i], final[i] = anchor[i], True
        else:
            out[i] = line
    # A tracked beat already sitting on a played attack (within 30 ms) is left exactly where it is:
    # only the beats that drifted are moved, so a steady band track keeps its steady grid.
    i_on = np.clip(np.searchsorted(t, b0), 1, max(1, len(t) - 1))
    if len(t) >= 2:
        dist = np.minimum(np.abs(b0 - t[i_on - 1]), np.abs(t[i_on] - b0))
        good = dist <= 0.03
        out[good], final[good] = b0[good], True
    for i in range(1, len(out)):                       # strictly increasing
        if out[i] <= out[i - 1] + 0.3 * local[i]:
            out[i] = out[i - 1] + 0.3 * local[i]
            final[i] = False
    return out, final


def phase_lock(an, window=8, gain=1.3):
    """Shift any run of beats that sits anti-phase (or a quarter off) with the music's pulse.

    For each window of `window` beats the pulse envelope (drums when separated) is sampled at the
    beats shifted by 0, +/-1/4 and 1/2 of the local beat; if a shift scores `gain` x better than
    the beats as tracked, those beats move. Neighbouring windows vote, so a single loud fill
    doesn't flip a section. Returns the share of beats moved."""
    env = getattr(an, "pulse_env", None)
    b = np.asarray(an.beats, float)
    if env is None or len(b) < 2 * window:
        return 0.0
    hop = getattr(an, "pulse_hop", 512 / 22050)

    def score(times):
        idx = np.clip(np.round(times / hop).astype(int), 0, len(env) - 1)
        w = max(1, int(round(0.03 / hop)))
        return np.array([env[max(0, i - w):i + w + 1].max() for i in idx])

    gaps = np.diff(b)
    gap = np.concatenate([gaps, gaps[-1:]])
    shifts = (0.0, 0.5, 0.25, -0.25)
    per_beat = np.array([score(b + s * gap) for s in shifts])            # shifts x beats
    choice = np.zeros(len(b))
    for a in range(0, len(b), window // 2):
        sl = slice(max(0, a - window // 2), min(len(b), a + window + window // 2))
        sc = per_beat[:, sl].mean(1)
        k = int(np.argmax(sc))
        if k != 0 and sc[k] > gain * sc[0]:
            choice[a:a + window // 2] = shifts[k]
    # majority smoothing over 3 windows
    out = b + choice * gap
    order = np.argsort(out)
    an.beats = out[order]
    moved = float(np.mean(choice != 0))
    if moved:
        d = np.asarray(an.downbeats, float)
        i = np.clip(np.searchsorted(b, d - 1e-6), 0, len(b) - 1)
        an.downbeats = np.sort(out[i])
    return moved


def snap_to_pulse(an, reach=0.045):
    """Each beat moved onto the peak of the music's attack curve (the drums when separated) within
    `reach` seconds, refined between analysis frames by fitting a parabola through the peak - the
    tracker works on 23 ms frames and can sit a whole frame after the hit (Thriller did). Beats
    with no peak nearby stay where they are. Returns the median shift in ms."""
    env = getattr(an, "pulse_env", None)
    b = np.asarray(an.beats, float)
    if env is None or len(b) < 4:
        return 0.0
    hop = getattr(an, "pulse_hop", 512 / 22050)
    w = max(1, int(round(reach / hop)))
    out = b.copy()
    for k, t in enumerate(b):
        i = int(round(t / hop))
        lo, hi = max(1, i - w), min(len(env) - 1, i + w + 1)
        if hi - lo < 2:
            continue
        j = lo + int(np.argmax(env[lo:hi]))
        if j <= 0 or j >= len(env) - 1 or env[j] <= np.median(env[lo:hi]) * 1.5:
            continue                                   # no real attack near this beat
        y0, y1, y2 = env[j - 1], env[j], env[j + 1]
        den = y0 - 2 * y1 + y2
        d = 0.5 * (y0 - y2) / den if den < 0 else 0.0
        out[k] = (j + float(np.clip(d, -0.5, 0.5))) * hop
    out = np.maximum.accumulate(out)
    shift = float(np.median(out - b) * 1000)
    if np.any(out != b):
        idx = np.clip(np.searchsorted(b, np.asarray(an.downbeats, float) - 1e-6), 0, len(b) - 1)
        an.beats = out
        an.downbeats = out[np.unique(idx)]
    return shift


def apply(an):
    """Replace an.beats / an.downbeats with the performer-following map (downbeats keep their
    beat indices). Returns the share of beats anchored to a played onset."""
    an.beats_phase_moved = phase_lock(an)
    an.beats_snap_ms = snap_to_pulse(an)
    old = np.asarray(an.beats, float)
    if len(old) < 4:
        return 0.0
    new, anchored = follow(an)
    idx = np.clip(np.searchsorted(old, np.asarray(an.downbeats, float) - 1e-6), 0, len(old) - 1)
    an.beats = new
    an.downbeats = new[np.unique(idx)]
    for key in ("_grid2", "_grid4", "_grid8", "_grid1"):        # cached subdivision grids
        if hasattr(an, key):
            delattr(an, key)
    return float(anchored.mean())
