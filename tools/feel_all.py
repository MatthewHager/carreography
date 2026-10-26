"""The perception check (feel.py) across the set list, with the trouble spots called out.

For every song: phase-locking of the lights to the beat, the share of beats with a visible hit,
the downbeat accent and the lead. Then the sections that need a look:

  BEAT MAP?    two witnesses agree the grid is off-phase: the music's attacks are stronger half
               (or a quarter) of a beat off the tracked beats than on them, AND so are the
               transcribed notes - so everything built on the grid is off too
  NO PULSE     a lively section whose music clearly beats, but whose lights hit clearly fewer beats
               than the beat layer meant to (pulse.txt: every beat, 1 and 3, downbeats) or barely lock

    .venv312/bin/python tools/feel_all.py [show ...]
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import feel as F                                         # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def phase_ratio(an, onset, t0, t1):
    """Music attacks on the beats over attacks at the best off-grid shift (<1: grid off-phase)."""
    b = np.asarray(an.beats, float)
    b = b[(b >= t0) & (b < t1)]
    if len(b) < 6:
        return 1.0, 0.0
    gap = np.median(np.diff(b))

    def at(times):
        idx = np.clip(np.round(times / F.STEP).astype(int), 0, len(onset) - 1)
        return np.mean([onset[max(0, i - 1):i + 2].max() for i in idx])

    on = at(b)
    best, shift = max((at(b + s * gap), s) for s in (0.5, 0.25, -0.25))
    return on / (best + 1e-9), shift


def notes_ratio(an, t0, t1, shift):
    """Strong transcribed notes on the beats over those at the suspect shift."""
    ev = an.events
    b = np.asarray(an.beats, float)
    x = b[(b >= t0) & (b < t1)]
    if len(x) < 4:
        return 1.0
    g = np.median(np.diff(x))
    strong = np.sort(ev.t[(ev.amp >= np.median(ev.amp)) | (ev.kind >= 2)])

    def hits(times):
        i = np.clip(np.searchsorted(strong, times), 1, max(1, len(strong) - 1))
        return np.mean(np.minimum(np.abs(times - strong[i - 1]), np.abs(strong[i] - times)) <= 0.04) if len(strong) > 1 else 0
    on, off = hits(x), hits(x + shift * g)
    if off < 0.25:                      # too few notes off the grid to say it is off-phase
        return 1.0
    return (on + 0.05) / (off + 0.05)


def intended(out, t0, t1):
    """Share of beats the beat layer meant to hit in [t0, t1), from pulse.txt."""
    path = out / "pulse.txt"
    if not path.exists():
        return 1.0
    share = {"every beat": 1.0, "1 and 3": 0.5, "downbeats": 0.25, "half-time": 0.5, "build:": 1.0}
    w, tot = 0.0, 0.0
    for line in path.read_text().splitlines():
        a, b = float(line[:7]), float(line[8:15])
        ov = max(0.0, min(b, t1) - max(a, t0))
        if ov <= 0:
            continue
        v = next((x for k, x in share.items() if k in line), 0.0)
        w += ov * v
        tot += ov
    return w / tot if tot else 1.0


def review(show):
    an, cars, onset, out = F.load(show)
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    whole = F.metrics(an, cars, onset, 0, an.duration)
    flags = []
    for sc in an.sections:
        r = F.metrics(an, cars, onset, sc.t0, sc.t1)
        if r is None:
            continue
        moods = [x[3] for x in rows if sc.t0 <= float(x[0]) < sc.t1]
        mood = max(set(moods), key=moods.count) if moods else ""
        pr, shift = phase_ratio(an, onset, sc.t0, sc.t1)
        tag = f"{sc.letter}{sc.nth} {sc.t0:4.0f}-{sc.t1:4.0f}s {mood:<6}"
        if pr < 0.9 and r["audio"] < 2.5 and notes_ratio(an, sc.t0, sc.t1, shift) < 0.9:
            flags.append(f"BEAT MAP?  {tag} music and notes hit harder {shift:+.2f} beat off the grid")
        meant = intended(out, sc.t0, sc.t1)
        if mood in ("groove", "drive", "frenzy") and r["audio"] >= 2.0 and (r["coverage"] < 0.8 * meant or r["lock"] < 0.3):
            flags.append(f"NO PULSE   {tag} music pulse {r['audio']:.1f}, lights hit {r['coverage']:.0%} of beats "
                         f"(meant {meant:.0%}), lock {r['lock']:.2f}")
    print(f"{show:<32} lock {whole['lock']:.2f}  beats hit {whole['coverage']:4.0%}  downbeat x{whole['down']:.1f}  "
          f"lead {whole['lead']:+4.0f} ms  music pulse {whole['audio']:.1f}")
    for f in flags:
        print("    " + f)
    return whole, flags


if __name__ == "__main__":
    shows = sys.argv[1:] or sorted(p.name for p in (ROOT / "output").iterdir()
                                   if (p / "analysis.pkl").exists() and p.name[:2].isdigit() and p.name[:2] != "00")
    for s in shows:
        review(s)
