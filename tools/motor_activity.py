"""How much the motors move in each show, as the audience sees it.

    .venv312/bin/python tools/motor_activity.py [show ...]

Per show: the share of the song in which some motor on some car is visibly moving (travelling or
dancing), the longest stretch with no motor moving, and per motor kind the seconds of movement
(averaged over the cars, and over the four windows / two mirrors of a car) plus the commands used
against Tesla's limits. Travel times as in lightshow/motors.py.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import show_cars                             # noqa: E402
from closure_audit import commands                     # noqa: E402
from lightshow import channels as C                     # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402
from lightshow.motors import LIFTGATE_CLOSE_S, LIFTGATE_OPEN_S, MIRROR_S, PORT_S, WINDOW_S  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
GROUPS = {"lid": [C.LIFTGATE], "windows": list(C.WINDOWS), "mirrors": list(C.MIRRORS), "port": [C.CHARGE_PORT]}


def moving(col, step, open_s, close_s):
    """Boolean per frame: the closure is travelling or dancing."""
    out = np.zeros(len(col), bool)
    cmds = commands(col, step)
    for k, (a, b, c) in enumerate(cmds):
        nxt = cmds[k + 1][0] if k + 1 < len(cmds) else len(col) * step
        if c == "dance":
            end = b
        elif c in ("open", "close"):
            end = min(a + (open_s if c == "open" else close_s), nxt)
        else:
            continue
        out[int(a / step): int(end / step)] = True
    n = sum(c in ("open", "close", "dance") for _, _, c in cmds)
    return out, n


def activity(show):
    any_move, rows = None, {g: [] for g in GROUPS}
    for car, vehicle in show_cars(show):
        f, step_ms = read_fseq(car / "LightShow" / f"{show}.fseq")
        step = step_ms / 1000
        kind = vehicle.kind
        travel = {C.LIFTGATE: (LIFTGATE_OPEN_S[kind], LIFTGATE_CLOSE_S), C.CHARGE_PORT: (PORT_S, PORT_S)}
        if any_move is None:
            any_move = np.zeros(len(f), bool)
        for g, chs in GROUPS.items():
            secs, cmds = [], []
            for ch in chs:
                o, c = travel.get(ch, (WINDOW_S, WINDOW_S) if ch in C.WINDOWS else (MIRROR_S, MIRROR_S))
                m, n = moving(f[:, ch], step, o, c)
                any_move |= m
                secs.append(m.sum() * step)
                cmds.append(n)
            rows[g].append((np.mean(secs), np.mean(cmds), C.CLOSURE_LIMITS[chs[0]]))
    runs, cur = [], 0
    for v in any_move:
        cur = 0 if v else cur + 1
        runs.append(cur)
    dur = len(any_move) * step
    still = max(runs) * step
    parts = "  ".join(f"{g} {np.mean([r[0] for r in v]):4.0f}s {np.mean([r[1] for r in v]):4.1f}/{v[0][2]}"
                      for g, v in rows.items())
    print(f"{show:<32} {dur / 60:4.1f}m  moving {100 * any_move.mean():3.0f}%  longest still {still:4.0f}s  {parts}")


if __name__ == "__main__":
    shows = sys.argv[1:] or sorted(p.name for p in (ROOT / "output").iterdir()
                                   if p.name[:2].isdigit() and p.name[:2] != "00" and show_cars(p.name))
    print("per car averages: seconds moving, commands used/limit (windows and mirrors: per window/mirror)")
    for s in shows:
        activity(s)
