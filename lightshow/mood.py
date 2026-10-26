"""Mood and pacing: how hard the lights should hit, phrase by phrase.

Every phrase gets an energy in 0..1 from three things:
  loudness   the smoothed level, as a rank within the song blended with distance below its peak
  form       the section's ceiling from the form map (0..3)
  density    how many notes per second the phrase plays, as a rank within the song

and a mood with a hit rate to match:
  calm    one hit a bar (every 4 beats; 2 when the tempo is slow), soft ramped glows, slow swoops
  groove  every other beat
  drive   every beat
  frenzy  every half beat - kept for climaxes, trills and the top of a build

Note-following moves are thinned to the mood's rate (each window keeps its strongest note and
holds it until the next), so a calm passage swoops through the stage instead of ticking every note,
and every-beat hitting is saved for the parts where the music picks up.
"""

import copy
from dataclasses import replace

import numpy as np

MOODS = ("calm", "groove", "drive", "frenzy")
BEATS_PER_HIT = {"calm": 4, "groove": 2, "drive": 1, "frenzy": 0.5}
MIN_GAP_S = {"calm": 1.5, "groove": 0.7, "drive": 0.0, "frenzy": 0.0}   # never faster than this


def _rank(x):
    order = np.argsort(np.argsort(x))
    return order / max(len(x) - 1, 1)


def energy_curve(an):
    """Per-frame energy 0..1."""
    from .choreo import _ceiling_at
    step = an.step
    n = len(an.intensity)
    win = max(1, int(3.0 / step))
    loud = np.convolve(an.intensity, np.ones(win) / win, mode="same")
    db = 20 * np.log10(np.maximum(loud, 1e-4))
    absolute = np.clip((db - (db.max() - 18)) / 18, 0, 1)
    loud_e = 0.5 * _rank(loud) + 0.5 * absolute
    t = np.arange(n) * step
    secs = getattr(an, "sections", None) or []
    ceil = np.array([_ceiling_at(an, x) for x in t[::25]], dtype=float)
    ceil = np.repeat(ceil, 25)[:n] / 3.0 if secs else np.full(n, 2 / 3)
    ev = an.events
    dens = np.zeros(n)
    if len(ev):
        idx = np.clip((ev.t / step).astype(int), 0, n - 1)
        np.add.at(dens, idx, 1.0)
        dens = np.convolve(dens, np.ones(int(2.0 / step)) / 2.0, mode="same")   # notes per second
    dens_e = _rank(dens)
    return np.clip(0.5 * loud_e + 0.3 * ceil + 0.2 * dens_e, 0, 1)


def assign(an, phrases):
    """Set ph.energy, ph.mood and ph.pace (seconds between hits) on every phrase."""
    e = energy_curve(an)
    an.energy = e
    beat = 60.0 / max(an.tempo, 40)
    from .pulse import clarity
    for ph in phrases:
        a, b = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
        ph.clarity = clarity(an, ph.t0, ph.t1)
        ph.energy = float(e[a:b].mean())
        ph.mood = mood_for(ph.energy)
        # a steady, clearly struck beat keeps a phrase out of "calm" (Thriller's quiet groove intro),
        # but rhythm alone never pushes it higher - the dynamics still come from the music's energy
        if ph.mood == "calm" and ph.clarity >= 4.0 and getattr(an, "driver", "") != "organ":
            ph.mood = "groove"
        ph.pace = pace_s(ph.mood, beat)
    # A trill or a dense run in a lively section is frenzy material whatever the loudness says.
    for ph in phrases:
        if ph.gesture == "trill" and ph.energy >= 0.45:
            ph.mood, ph.pace = "frenzy", pace_s("frenzy", beat)
    # A song held quiet on purpose (--max-level 1, Ave Maria) never goes past groove, and is mostly calm.
    if int(np.max(an.tier)) <= 1:
        for ph in phrases:
            ph.mood = "calm" if ph.energy < 0.6 else "groove"
            ph.pace = pace_s(ph.mood, beat)
    return phrases


def mood_for(energy):
    if energy < 0.36:
        return "calm"
    if energy < 0.55:
        return "groove"
    if energy < 0.78:
        return "drive"
    return "frenzy"


def pace_s(mood, beat):
    k = BEATS_PER_HIT[mood]
    p = k * beat
    while p < MIN_GAP_S[mood]:
        p *= 2
    return p


def mood_at(an, t):
    e = getattr(an, "energy", None)
    if e is None:
        return "drive"
    return mood_for(float(e[min(len(e) - 1, max(0, int(t / an.step)))]))


def paced_grid(times, pace):
    """Thin a beat grid so hits are at least `pace` apart (calm/groove), or double it (frenzy)."""
    times = np.asarray(times, dtype=float)
    if len(times) < 2:
        return times
    gap = float(np.median(np.diff(times)))
    if pace < gap * 0.75:                      # frenzy: add the off-beats
        mids = times[:-1] + np.diff(times) / 2
        return np.sort(np.concatenate([times, mids]))
    keep, last = [], -1e9
    for t in times:
        if t - last >= pace * 0.9:
            keep.append(t)
            last = t
    return np.array(keep)


def thinned(an, ph):
    """(events, phrase) with the phrase's notes thinned to its pace: in each window of `pace`
    seconds keep the strongest note (loud and long wins) and let it ring until the next one.
    Returns the originals when the mood hits on every note anyway."""
    ev = an.events
    pace = getattr(ph, "pace", 0.0)
    if getattr(ph, "mood", "drive") in ("drive", "frenzy") or ph.b - ph.a < 3:
        return ev, ph
    idx = np.arange(ph.a, ph.b)
    t = ev.t[idx]
    score = ev.amp[idx] * (1 + np.minimum(ev.dur[idx], 2.0)) + 0.3 * (ev.kind[idx] >= 2)
    bins = ((t - ph.t0) / pace).astype(int)
    keep = [idx[bins == k][np.argmax(score[bins == k])] for k in np.unique(bins)]
    keep = np.array(sorted(keep))
    if len(keep) == len(idx):
        return ev, ph
    order = np.concatenate([np.arange(0, ph.a), keep, np.arange(ph.b, len(ev))])
    fields = {}
    for name in ev.__dataclass_fields__:
        v = getattr(ev, name)
        fields[name] = v[order].copy() if isinstance(v, np.ndarray) and len(v) == len(ev) else v
    ev2 = replace(ev, **fields)
    # ring each kept note until the next kept one (a swoop, not a tick)
    k0, k1 = ph.a, ph.a + len(keep)
    nxt = np.append(ev2.t[k0 + 1:k1], ph.t1)
    ev2.dur[k0:k1] = np.maximum(ev2.dur[k0:k1], np.minimum(nxt - ev2.t[k0:k1] - 0.05, 3.0))
    ph2 = copy.copy(ph)
    ph2.b = k1
    return ev2, ph2
