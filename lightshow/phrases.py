"""Phrase segmentation and classification: the unit a choreographer works in.

A phrase is a run of events between breaths. Boundaries fall at rests (>= 0.3 s with nothing
sounding), after a held note (>= 0.8 s), at arrivals (a big chord starts a new phrase), where the
texture changes for good, and at most every MAX_PHRASE seconds (split at the weakest moment).

Each phrase gets one `gesture`:
  motif        a few quick notes landing on a held note (the Toccata's mordent-and-run)
  run          a monotonic scale, 5+ notes
  figuration   a long stretch of fast single notes (broken chords, zigzags)
  trill        rapid two-note alternation
  chords       mostly 3+ voice events
  cadence      a short phrase of big chords (an ending or a punctuation)
  recitative   slow single notes with space between them
"""

from dataclasses import dataclass, field

import numpy as np

from .texture import Events

MAX_PHRASE = 8.0


@dataclass
class Phrase:
    a: int                 # first event index (inclusive)
    b: int                 # last event index (exclusive)
    t0: float
    t1: float              # end of the last note (capped)
    gesture: str
    n: int
    density: float
    up: float              # fraction of upward steps
    lo: float              # pitch range
    hi: float
    hold: float            # duration of the final note
    after_rest: bool
    index: int = 0         # ordinal among phrases of the same gesture (for variation / repetition)
    sub: list = field(default_factory=list)


def segment(ev: Events, tier_at=None, cuts_at=None) -> list:
    """`cuts_at`: extra phrase boundaries in seconds (sung lines), snapped to the nearest event."""
    n = len(ev)
    if n == 0:
        return []
    t, dur, top, kind = ev.t, np.minimum(ev.dur, 4.0), ev.top, ev.kind
    end_t = t + dur
    forced = set()
    for ct in (cuts_at or []):
        i = int(np.searchsorted(t, ct))
        if 0 < i < n and abs(t[i] - ct) < 0.6:
            forced.add(i)
    cuts = [0]
    for i in range(1, n):
        sounding_until = max(end_t[max(0, i - 4):i].max(), t[i - 1] + 0.05)
        gap = t[i] - sounding_until
        held_before = dur[i - 1] >= 0.8 and t[i] - t[i - 1] >= 0.6
        texture_change = (ev.phrase[i] != ev.phrase[i - 1] and i + 3 < n
                          and all(ev.phrase[j] == ev.phrase[i] for j in range(i, i + 4))
                          and ev.phrase[i] in ("chords", "arrival", "trill") or
                          (ev.phrase[i - 1] in ("chords", "trill") and ev.phrase[i] not in ("chords", "trill")))
        if gap >= 0.3 or held_before or ev.arrival[i] or texture_change or i in forced:
            if i - cuts[-1] >= 2:
                cuts.append(i)
    cuts.append(n)

    # Split anything longer than MAX_PHRASE at its weakest internal moment (largest gap).
    bounds = []
    for a, b in zip(cuts[:-1], cuts[1:]):
        stack = [(a, b)]
        while stack:
            a2, b2 = stack.pop()
            if t[b2 - 1] - t[a2] <= MAX_PHRASE or b2 - a2 < 8:
                bounds.append((a2, b2))
                continue
            inner = np.arange(a2 + 4, b2 - 4)
            gaps = t[inner] - t[inner - 1]
            # prefer a split near the middle
            mid = (t[a2] + t[b2 - 1]) / 2
            score = gaps - 0.02 * np.abs(t[inner] - mid)
            k = int(inner[np.argmax(score)])
            stack.append((k, b2))
            stack.append((a2, k))
    bounds.sort()
    # A phrase shorter than a second cannot carry a move of its own: fold it into the phrase
    # before it (or after it, at the very start), so its notes still land inside a longer figure.
    merged = []
    for a, b in bounds:
        if merged and t[b - 1] - t[a] < 1.0 and (b - a) < 6:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    if len(merged) > 1 and t[merged[0][1] - 1] - t[merged[0][0]] < 1.0:
        merged[1] = (merged[0][0], merged[1][1])
        merged.pop(0)
    bounds = merged

    phrases = []
    for a, b in bounds:
        m = b - a
        span = max(t[b - 1] - t[a], 0.1)
        steps = np.diff(top[a:b]) if m > 1 else np.zeros(1)
        up = float(np.mean(steps > 0)) if len(steps) else 0.5
        chordy = float(np.mean(kind[a:b] >= 2))
        dens = m / span
        hold = float(dur[b - 1])
        trill = float(np.mean(ev.trill[a:b]))
        after_rest = a == 0 or (t[a] - end_t[max(0, a - 4):a].max()) >= 0.3
        if chordy >= 0.5 and m <= 6:
            g = "cadence"
        elif chordy >= 0.5:
            g = "chords"
        elif trill >= 0.5:
            g = "trill"
        elif m <= 9 and hold >= 0.8 and dens >= 4:
            g = "motif"
        elif m >= 5 and (up >= 0.8 or up <= 0.2) and dens >= 4:
            g = "run"
        elif dens >= 5.5:
            g = "figuration"
        else:
            g = "recitative"
        phrases.append(Phrase(a, b, float(t[a]), float(min(end_t[a:b].max(), t[b - 1] + 4)), g, m, dens,
                              up, float(top[a:b].min()), float(top[a:b].max()), hold, after_rest))
    counts = {}
    for p in phrases:
        p.index = counts.get(p.gesture, 0)
        counts[p.gesture] = p.index + 1
    return phrases
