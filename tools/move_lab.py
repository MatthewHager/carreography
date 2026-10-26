"""Render one move at a time on a real song's analysis and measure how it sits on the music:
the share of its light onsets within 25 ms of a sixteenth-note subdivision of the tracked beats, and
within 25 ms of a transcribed note. Each move is played alone on blank cars over every lively
phrase of the song, so nothing else (drums, arrivals, cues) muddies the number.

    .venv312/bin/python tools/move_lab.py 02_this_is_halloween [move ...]

Needs output/<show>/analysis.pkl, written by build.py.
"""

import copy
import pickle
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow import catalog as CAT                    # noqa: E402
from lightshow import moves as M                        # noqa: E402
from lightshow.choreo import LIGHT_LEAD_S, make_lineup  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
TOL = 0.025
SKIP = {"cadence", "motif", "shimmer"}


def onsets(car):
    lamps = car.frames[:, :30] >= 128
    t = list(np.flatnonzero((lamps[1:] & ~lamps[:-1]).any(1)) + 1)
    bar = car.frames[:, 46:106].astype(float).mean(1)
    t += list(np.flatnonzero(np.diff(bar) > 40) + 1)
    return np.array(sorted(set(t))) * car.step + LIGHT_LEAD_S


def bursts(x, gap=0.1):
    """First onset of each burst: a ripple or flam (steps closer than 100 ms) counts once, at its
    start - that is the moment that has to land on the music."""
    x = np.sort(x)
    return x[np.concatenate([[True], np.diff(x) > gap])] if len(x) else x


def near(x, grid):
    if len(grid) < 2 or len(x) == 0:
        return np.zeros(len(x), bool)
    i = np.clip(np.searchsorted(grid, x), 1, len(grid) - 1)
    return np.minimum(np.abs(x - grid[i - 1]), np.abs(x - grid[i])) <= TOL


def play(name, cars, an, ph):
    ys = [c for c in cars if not c.is_ct]
    ct = next(c for c in cars if c.is_ct)
    if name == "keyboard":
        return M.keyboard(cars, an, ph, heads=True)
    if name == "out_in":
        return M.out_in(cars, an, ph)
    if name == "block":
        return M.block(cars, an, ph, 60.0 / an.tempo)
    fn = lookup(name)
    if fn is not None:
        return fn(cars, an, ph)
    # split halves
    if name.startswith("y_"):
        if name in ("y_ripple_in", "y_ripple_out"):
            return M.y_ripple(ys, an, ph, inward=name.endswith("in"))
        if name == "y_chords":
            return M.y_chords(ys, an, ph, 60.0 / an.tempo)
        return getattr(M, name)(ys, an, ph)
    return getattr(M, name)(ct, an, ph)


def lookup(name):
    if name.startswith(("y_", "ct_")) or name == "bar_collide":
        return None
    return getattr(M, name, None)


def main(show, names):
    an = pickle.loads((ROOT / "output" / show / "analysis.pkl").read_bytes())
    from lightshow import tempo as TEMPO
    if not hasattr(an, "beats_tracked"):
        TEMPO.apply(an)                                            # as choreograph() does
    if len(an.beats) > 8:
        an.tempo = 60.0 / float(np.median(np.diff(an.beats)))
    sixteenths = M._sub_grid(an, 4)                                # of the tracked beats
    notes = np.sort(an.events.t)
    phrases = [p for p in an.phrases if getattr(p, "mood", "drive") != "calm" and p.t1 - p.t0 >= 2.0]
    if not names:
        names = [m for m, i in CAT.UNISON.items() if m not in SKIP]
        names += sorted({h for pair in CAT.SPLIT for h in pair})
    print(f"{show}: {len(phrases)} lively phrases, tempo {an.tempo:.0f} BPM")
    print(f"{'move':<16} {'grid':<6} {'onsets':>6} {'on beat':>8} {'on note':>8}")
    for name in names:
        info = CAT.UNISON.get(name)
        grid = info.grid if info else "half"
        cars = make_lineup("YCY", an.n_frames, an.step)
        ok = True
        for ph in phrases:
            p = copy.copy(ph)
            p.mood = "drive"
            an.pace = None
            try:
                play(name, cars, an, p)
            except Exception as e:                        # noqa: BLE001
                print(f"{name:<16} failed: {e}")
                ok = False
                break
        if not ok:
            continue
        x = np.unique(np.round(np.concatenate([onsets(c) for c in cars]), 2))
        inside = np.zeros(len(x), bool)
        for ph in phrases:
            inside |= (x >= ph.t0 - 0.05) & (x < ph.t1 + 0.6)
        ons = [bursts(x[inside])]
        x = np.concatenate(ons) if ons else np.zeros(0)
        if len(x) == 0:
            continue
        b, n = np.mean(near(x, sixteenths)), np.mean(near(x, notes))
        flag = "  <- drifts off the beat" if grid in ("beat", "bar") and b < 0.8 else ""
        print(f"{name:<16} {grid:<6} {len(x):6d} {b:8.0%} {n:8.0%}{flag}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
