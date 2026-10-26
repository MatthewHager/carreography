"""How tightly does a built show sit on the music? Per phrase, the share of light onsets that land
on the song's beat grid (within 30 ms of a sixteenth of the performer-following beats) and on a
transcribed note (within 30 ms); a ripple or flam counts once, at its first onset, next to the move's catalogue grid, flagging beat/bar moves that drift off the beat.

    .venv312/bin/python tools/quantize_check.py 02_this_is_halloween

By chance alone about a quarter of onsets would land within 30 ms of an eighth at 117 BPM, so a
beat-locked move should sit well above that, near 90 %.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow import catalog as CAT                    # noqa: E402
from lightshow.choreo import LIGHT_LEAD_S               # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
TOL = 0.03


def onsets(frames, step):
    lamps = frames[:, :30] >= 128
    t = list(np.flatnonzero((lamps[1:] & ~lamps[:-1]).any(1)) + 1)
    bar = frames[:, 46:106].astype(float).mean(1)
    t += list(np.flatnonzero(np.diff(bar) > 40) + 1)
    return np.unique(np.array(t)) * step / 1000 + LIGHT_LEAD_S


def bursts(x, gap=0.1):
    """First onset of each burst: a ripple or flam (steps closer than 100 ms) counts once, at its
    start - that is the moment that has to land on the music."""
    x = np.sort(x)
    return x[np.concatenate([[True], np.diff(x) > gap])] if len(x) else x


def near(x, grid):
    if len(grid) == 0 or len(x) == 0:
        return np.zeros(len(x), bool)
    i = np.clip(np.searchsorted(grid, x), 1, len(grid) - 1)
    return np.minimum(np.abs(x - grid[i - 1]), np.abs(x - grid[i])) <= TOL


def main(show):
    out = ROOT / "output" / show
    beats = np.load(out / "beats.npy")
    gaps = np.diff(beats)
    eighths = np.sort(np.concatenate([(beats[:-1, None] + gaps[:, None] * np.arange(4)[None, :] / 4).ravel(), beats[-1:]]))
    notes = np.load(out / f"{show}.notes.npy")[:, 0]
    ons = []
    for d in sorted(out.iterdir()):
        f = d / "LightShow" / f"{show}.fseq"
        if f.exists():
            frames, step = read_fseq(f)
            ons.append(onsets(frames, step))
    ons = np.unique(np.round(np.concatenate(ons), 2))
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    import pickle
    an = pickle.loads((out / "analysis.pkl").read_bytes())
    played = np.sort(np.concatenate([an.events.t] + [np.asarray(a)[:, 0] for a in (an.bass, an.highs) if len(a)]))
    b_all = bursts(ons)
    either = near(b_all, eighths) | near(b_all, played)
    print(f"{show}: {len(b_all)} light hits (ripples counted once); {np.mean(near(b_all, eighths)):.0%} on the sixteenth grid, "
          f"{np.mean(near(b_all, played)):.0%} on a played attack, {np.mean(either):.0%} on one or the other")
    late = b_all[~either]
    if len(late):
        print(f"   {len(late)} hits on neither, e.g. at " + ", ".join(f"{x:.2f}" for x in late[:12]))
    print(f"{'t0':>7} {'t1':>7}  {'mood':<7} {'move':<34} {'grid':<6} {'onsets':>6} {'on beat':>8} {'on note':>8}")
    drift = []
    for t0, t1, gesture, mood, move in rows:
        t0, t1 = float(t0), float(t1)
        x = bursts(ons[(ons >= t0) & (ons < t1)])
        if len(x) < 3:
            continue
        name = move.split(" → ")[-1].split("+")[0].strip()
        parts = [p.strip() for p in name.split("|")]
        info = CAT.info(("unison", parts[0]) if len(parts) == 1 else ("split", parts[0], parts[1]))
        grid = info.grid if info else "?"
        b, n = np.mean(near(x, eighths)), np.mean(near(x, notes))
        flag = ""
        if grid in ("beat", "bar") and b < 0.7:
            flag = "  <- off the beat"
            drift.append((t0, move))
        print(f"{t0:7.2f} {t1:7.2f}  {mood:<7} {move[:34]:<34} {grid:<6} {len(x):6d} {b:8.0%} {n:8.0%}{flag}")
    print(f"{len(drift)} beat/bar phrases under 70 % on the beat")


if __name__ == "__main__":
    main(sys.argv[1])
