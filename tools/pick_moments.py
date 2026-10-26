"""Pick moments worth looking at in each show and list frame times for the viewer recorder:
for a calm passage, a groove and the most driving passage, five beats each, on the beat and half a
beat later (see beat_sheet.py).

    .venv312/bin/python tools/pick_moments.py [show ...]     -> JSON {show: {label: [t, t+half, ...]}}
"""

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def pick(show, beats_n=5):
    out = ROOT / "output" / show
    beats = np.load(out / "beats.npy")
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    best = {}
    for r in rows:
        t0, t1, mood = float(r[0]), float(r[1]), r[3]
        label = {"calm": "calm", "groove": "groove", "drive": "drive", "frenzy": "drive"}[mood]
        span = t1 - t0
        score = span + (2 if mood == "frenzy" else 0)
        if span >= 3 and (label not in best or score > best[label][0]):
            best[label] = (score, t0, t1)
    moments = {}
    for label, (_, t0, t1) in best.items():
        b = beats[(beats >= t0 + 0.3) & (beats < t1)][:beats_n + 1]
        if len(b) < 3:
            continue
        ts = []
        for i in range(min(beats_n, len(b) - 1)):
            ts += [round(float(b[i]), 3), round(float((b[i] + b[i + 1]) / 2), 3)]
        moments[label] = ts
    return moments


if __name__ == "__main__":
    shows = sys.argv[1:] or sorted(p.name for p in (ROOT / "output").iterdir()
                                   if (p / "beats.npy").exists() and p.name[:2].isdigit() and p.name[:2] != "00")
    print(json.dumps({s: pick(s) for s in shows}))
