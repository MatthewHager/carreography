"""Read the music the way a player would: notes become events (a key press or a chord), and
each stretch gets a texture: a single-note run, chords, a trill, a held pedal, an arrival.

Event fields (one row per onset group):
  t, dur, n (distinct pitch classes), low, high (midi), top (melodic pitch), amp,
  kind: 0 single note, 1 dyad, 2 chord, 3 big chord
  trill: 1 if part of a rapid two-note alternation
  arrival: 1 if a strong chord that lands after a run or a gap
  run_dir: -1 descending, +1 ascending, 0 neither (over the previous few events)
"""

from dataclasses import dataclass

import numpy as np

GROUP_WINDOW = 0.045   # onsets this close together are one event (one hand, one chord)


@dataclass
class Events:
    t: np.ndarray
    dur: np.ndarray
    n: np.ndarray
    low: np.ndarray
    high: np.ndarray
    top: np.ndarray
    amp: np.ndarray
    kind: np.ndarray
    trill: np.ndarray
    arrival: np.ndarray
    run_dir: np.ndarray
    density: np.ndarray    # events per second around each event (1 s window)
    phrase: np.ndarray = None   # texture label per event, see PHRASES
    phrase_idx: np.ndarray = None  # index of the event within its phrase (0 = first)

    def __len__(self):
        return len(self.t)


def group_events(notes: np.ndarray) -> Events:
    if len(notes) == 0:
        z = np.zeros(0)
        return Events(z, z, z, z, z, z, z, z, z, z, z, z)
    starts = notes[:, 0]
    groups, i = [], 0
    while i < len(notes):
        j = i
        while j < len(notes) and starts[j] - starts[i] < GROUP_WINDOW:
            j += 1
        groups.append((i, j))
        i = j

    t, dur, n, low, high, top, amp = ([] for _ in range(7))
    for a, b in groups:
        g = notes[a:b]
        # Collapse octave doublings: one voice per pitch class, keep the loudest.
        by_pc = {}
        for s, e, p, v in g:
            pc = int(p) % 12
            if pc not in by_pc or v > by_pc[pc][3]:
                by_pc[pc] = (s, e, p, v)
        voices = np.array(list(by_pc.values()))
        t.append(g[:, 0].min())
        dur.append(float(np.median(g[:, 1]) - g[:, 0].min()))
        n.append(len(voices))
        low.append(g[:, 2].min())
        high.append(g[:, 2].max())
        top.append(voices[np.argmax(voices[:, 2]), 2])
        amp.append(float(np.max(g[:, 3])))
    t, dur, n, low, high, top, amp = map(np.array, (t, dur, n, low, high, top, amp))

    kind = np.where(n >= 5, 3, np.where(n >= 3, 2, np.where(n == 2, 1, 0)))

    # Density: events in the surrounding second.
    density = np.array([np.sum(np.abs(t - ti) <= 0.5) for ti in t], dtype=float)

    # Trills: rapid alternation between two nearby pitch classes.
    trill = np.zeros(len(t), int)
    for i in range(3, len(t)):
        if n[i - 3:i + 1].max() <= 2 and (t[i] - t[i - 3]) < 0.45:
            p = top[i - 3:i + 1]
            if abs(p[0] - p[2]) <= 1 and abs(p[1] - p[3]) <= 1 and 1 <= abs(p[0] - p[1]) <= 3:
                trill[i - 3:i + 1] = 1

    # Run direction over the previous three single-note events.
    run_dir = np.zeros(len(t), int)
    for i in range(3, len(t)):
        if kind[i - 3:i + 1].max() <= 1:
            d = np.diff(top[i - 3:i + 1])
            if np.all(d > 0):
                run_dir[i] = 1
            elif np.all(d < 0):
                run_dir[i] = -1

    # Arrivals: a strong chord that lands after a busy run or after silence. Rare by design:
    # top-decile loudness, at least 2.5 s apart, so "everything on" stays a punctuation mark.
    arrival = np.zeros(len(t), int)
    if len(t):
        strong = amp >= np.quantile(amp, 0.9)
        last = -9.0
        for i in range(len(t)):
            if kind[i] >= 2 and strong[i] and t[i] - last >= 2.5:
                before = np.sum((t >= t[i] - 1.0) & (t < t[i]))
                gap = t[i] - t[i - 1] if i else 9
                if before >= 6 or gap > 0.6:
                    arrival[i] = 1
                    last = t[i]

    return Events(t, dur, n, low, high, top, amp, kind, trill, arrival, run_dir, density)


PHRASES = ["melody", "run_up", "run_down", "zigzag", "trill", "chords", "pedal", "arrival", "climax"]


def label_phrases(ev: Events, tier_at):
    """Texture taxonomy: label every event with the kind of passage it belongs to.

    run_up / run_down  fast single notes moving mostly one way      -> line sweeps across the stage
    zigzag             fast single notes leaping back and forth     -> left/right strobing
    trill              rapid alternation of two neighbouring notes  -> shimmer
    chords             mostly 3+ voice events                       -> blocks of light
    arrival            strong chord landing after a run or a gap    -> everything, then release
    climax             loud tier with dense notes                   -> keyboard plus bass and chases
    melody             everything else                              -> keyboard
    `tier_at(t)` gives the intensity tier so climax can be told from an ordinary run.
    """
    n = len(ev)
    phrase = np.array(["melody"] * n, dtype=object)
    if n == 0:
        ev.phrase, ev.phrase_idx = phrase, np.zeros(0, int)
        return ev
    for i in range(n):
        t = ev.t[i]
        w = (ev.t >= t - 0.6) & (ev.t <= t + 0.6)
        dens = w.sum() / 1.2
        single = ev.kind[w].mean() <= 1.0
        if ev.arrival[i]:
            phrase[i] = "arrival"
        elif ev.trill[i]:
            phrase[i] = "trill"
        elif dens >= 5.5 and single:
            # Direction over the window: fraction of upward steps among the single notes.
            idx = np.flatnonzero(w)
            steps = np.diff(ev.top[idx])
            flips = np.sum(np.sign(steps[1:]) != np.sign(steps[:-1])) / max(len(steps) - 1, 1)
            up = np.mean(steps > 0) if len(steps) else 0.5
            if flips >= 0.6:
                phrase[i] = "zigzag"
            elif up >= 0.65:
                phrase[i] = "run_up"
            elif up <= 0.35:
                phrase[i] = "run_down"
            else:
                phrase[i] = "zigzag"
            if tier_at(t) >= 3 and dens >= 7:
                phrase[i] = "climax"
        elif ev.kind[w].mean() >= 1.6:
            phrase[i] = "chords"
    # Smooth single-event blips into their neighbours, then number events within each phrase.
    for i in range(1, n - 1):
        if phrase[i - 1] == phrase[i + 1] != phrase[i] and phrase[i] not in ("arrival", "trill"):
            phrase[i] = phrase[i - 1]
    phrase_idx = np.zeros(n, int)
    for i in range(1, n):
        phrase_idx[i] = phrase_idx[i - 1] + 1 if phrase[i] == phrase[i - 1] else 0
    ev.phrase, ev.phrase_idx = phrase, phrase_idx
    return ev


def pitch_scale(ev: Events):
    """Low/high midi bounds that map the piece's melodic range onto the stage (0..1)."""
    if len(ev) == 0:
        return 48.0, 84.0
    lo, hi = np.quantile(ev.top, 0.05), np.quantile(ev.top, 0.95)
    return float(lo), float(max(hi, lo + 12))
