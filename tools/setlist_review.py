"""One line per show (or the shows named): the checks a show must pass before it goes on the USB.

    .venv312/bin/python tools/setlist_review.py [show ...]

  dur/bpm     length and the tempo of the performer-following beat map
  moods       phrases per mood (calm/groove/drive/frenzy)
  moves       distinct moves, the most-repeated one, and the share of three-car moves in lively phrases
  timing      light hits on the beat grid or on a played attack (ripples counted once)
  pacing      light hits per second per car in the calmest and liveliest thirds, and their correlation
              with the energy curve
  motors      closure commands against Tesla's per-show limits (OK, or the channel that is over)
  valid       Tesla's validator on all three files
"""

import pickle
import subprocess
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow import channels as C                     # noqa: E402
from lightshow import catalog as CAT                    # noqa: E402
from lightshow.choreo import LIGHT_LEAD_S               # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CARS = ("Car1_ModelY_Left", "Car2_Cybertruck_Center", "Car3_ModelY_Right")
LIMITS = {C.LIFTGATE: C.CLOSURE_LIMITS[C.LIFTGATE], C.CHARGE_PORT: C.CLOSURE_LIMITS[C.CHARGE_PORT]}
LIMITS.update({w: C.CLOSURE_LIMITS[w] for w in C.WINDOWS})
LIMITS.update({m: C.CLOSURE_LIMITS[m] for m in C.MIRRORS})


def near(x, grid, tol=0.03):
    if len(grid) < 2 or len(x) == 0:
        return np.zeros(len(x), bool)
    i = np.clip(np.searchsorted(grid, x), 1, len(grid) - 1)
    return np.minimum(np.abs(x - grid[i - 1]), np.abs(x - grid[i])) <= tol


def commands(col):
    """Closure commands in a column: each change to a non-zero, non-Stop value."""
    prev, n = 0, 0
    for v in col:
        if v != prev and v not in (0, C.CLOSURE_STOP):
            n += 1
        prev = v
    return n


def review(show):
    out = ROOT / "output" / show
    an = pickle.loads((out / "analysis.pkl").read_bytes())
    frs = [read_fseq(out / c / "LightShow" / f"{show}.fseq")[0] for c in CARS]
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    moods = Counter(r[3] for r in rows)
    names = [r[4].split(" → ")[-1].split("+")[0].strip() for r in rows]
    used = Counter(names)
    lively = [n for r, n in zip(rows, names) if r[3] != "calm"]
    collab = np.mean([("|" not in n) and (CAT.UNISON.get(n) is not None and CAT.UNISON[n].collab) for n in lively]) if lively else 0
    # timing
    beats = np.asarray(an.beats, float)
    gaps = np.diff(beats)
    six = np.sort(np.concatenate([(beats[:-1, None] + gaps[:, None] * np.arange(4)[None, :] / 4).ravel(), beats[-1:]]))
    played = np.sort(np.concatenate([an.events.t] + [np.asarray(a)[:, 0] for a in (an.bass, an.highs) if len(a)]))
    hits = []
    for fr in frs:
        L = fr[:, :30] >= 128
        hits.append(np.flatnonzero((L[1:] & ~L[:-1]).any(1)) + 1)
    x = np.unique(np.round(np.concatenate(hits) * 0.02 + LIGHT_LEAD_S, 2))
    x = x[np.concatenate([[True], np.diff(x) > 0.1])] if len(x) else x
    timing = np.mean(near(x, six) | near(x, played)) if len(x) else 0
    # pacing
    e = an.energy
    win = 400                                        # 8 s
    E, R = [], []
    for a in range(0, len(frs[0]) - win, win):
        n = sum(((fr[a:a + win, :30] >= 128)[1:] & ~(fr[a:a + win, :30] >= 128)[:-1]).any(1).sum() for fr in frs)
        E.append(e[a:a + win].mean())
        R.append(n / 8 / 3)
    E, R = np.array(E), np.array(R)
    q = np.quantile(E, [1 / 3, 2 / 3]) if len(E) else (0, 0)
    calm_r = R[E <= q[0]].mean() if np.any(E <= q[0]) else 0
    live_r = R[E > q[1]].mean() if np.any(E > q[1]) else 0
    corr = np.corrcoef(E, R)[0, 1] if len(E) > 2 and R.std() > 0 else 0
    # motors
    over = []
    for c, fr in zip(CARS, frs):
        for ch, lim in LIMITS.items():
            n = commands(fr[:, ch])
            if n > lim:
                over.append(f"{c[:4]} ch{ch} {n}>{lim}")
    # validator
    ok = 0
    for c in CARS:
        r = subprocess.run([sys.executable, str(ROOT / "vendor/light-show/validator.py"), str(out / c / "LightShow" / f"{show}.fseq")],
                           input="\n", capture_output=True, text=True)
        ok += "Found" in r.stdout and "rror" not in r.stdout
    top, topn = used.most_common(1)[0]
    print(f"{show:<32} {an.duration / 60:4.1f}m {an.tempo:4.0f}bpm  "
          f"moods {moods.get('calm', 0):2d}/{moods.get('groove', 0):2d}/{moods.get('drive', 0):2d}/{moods.get('frenzy', 0):2d}  "
          f"moves {len(used):2d} (top {top} x{topn}, 3-car {collab:.0%})  timing {timing:.0%}  "
          f"pacing {calm_r:.1f}->{live_r:.1f}/s r={corr:.2f}  motors {'OK' if not over else '; '.join(over)}  valid {ok}/3")


if __name__ == "__main__":
    shows = sys.argv[1:] or sorted(p.name for p in (ROOT / "output").iterdir()
                                   if (p / "analysis.pkl").exists() and p.name[:2].isdigit() and p.name[:2] != "00")
    for s in shows:
        review(s)
