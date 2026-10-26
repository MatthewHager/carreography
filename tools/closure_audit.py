"""Audit the closure (motor) commands in show files against Tesla's rules and travel times.

    .venv312/bin/python tools/closure_audit.py output/04_monster_mash/*/LightShow/*.fseq
    .venv312/bin/python tools/closure_audit.py --summary <many .fseq files>     # one line per file

From Tesla's light-show README (vendor/light-show/README.md, "Closures channels"):
  - per show, per closure: liftgate/frunk 6, each window 6, each mirror 20, charge port 3 commands;
    only Open, Close and Dance count (Stop and Idle don't)
  - except windows, a closure ignores Dance unless it is already fully open
  - dancing more than ~30 s per show risks thermal limits (the closure stops until it cools)
  - the charge port closes itself 2 minutes after opening
  - approximate travel: liftgate open 14 s (Cybertruck frunk 10 s) / close 4 s, windows 4 s, mirrors 2 s, charge port 2 s
  - Idle lets an Open or Close in progress finish; Stop halts immediately

Flags printed per closure:
  OVER LIMIT          more counted commands than Tesla allows
  DANCE NOT OPEN      Dance starts before the closure can have finished opening
  DANCE > 30 s        total dancing over the recommended budget
  PORT AUTO-CLOSE     charge port open for more than 2 minutes before its Close
  REVERSED EARLY      a Close (or Open) arrives before the previous move could finish - the closure
                      only travels part way (fine when meant, e.g. after a Stop; listed with %)
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow.fseq import read_fseq                    # noqa: E402

CLOSURES = {40: "liftgate", 34: "L mirror", 35: "R mirror", 36: "L front window", 37: "L rear window",
            38: "R front window", 39: "R rear window", 45: "charge port"}
LIMIT = {"liftgate": 6, "charge port": 3}
TRAVEL_OPEN = {"liftgate": 14.0, "charge port": 2.0}
TRAVEL_CLOSE = {"liftgate": 4.0, "charge port": 2.0}
TRUCK_FRUNK_OPEN = 10.0          # the Cybertruck's frunk, timed on the truck


def kind(ch):
    name = CLOSURES[ch]
    return "mirror" if "mirror" in name else "window" if "window" in name else name


def limit(ch):
    return {"mirror": 20, "window": 6}.get(kind(ch), LIMIT.get(kind(ch), 6))


def travel(ch, direction, truck=False):
    k = kind(ch)
    base = {"mirror": 2.0, "window": 4.0}.get(k)
    if base:
        return base
    if truck and k == "liftgate" and direction == "open":
        return TRUCK_FRUNK_OPEN
    return (TRAVEL_OPEN if direction == "open" else TRAVEL_CLOSE)[k]


def decode(v):
    return "idle" if v < 32 else "open" if v < 96 else "dance" if v < 160 else "close" if v < 224 else "stop"


def commands(col, step):
    """[(start_s, end_s, command)] for each contiguous non-idle run of the same command."""
    out, prev, start = [], "idle", 0
    cmds = [decode(int(v)) for v in col]
    for i, c in enumerate(cmds + ["idle"]):
        if c != prev:
            if prev != "idle":
                out.append((start * step, i * step, prev))
            start, prev = i, c
    return out


def audit(path):
    frames, step_ms = read_fseq(path)
    step = step_ms / 1000
    truck = "Cybertruck" in str(path)
    report = []
    if frames.shape[1] <= 45:
        return report
    for ch in CLOSURES:
        cmds = commands(frames[:, ch], step)
        if not cmds:
            continue
        counted = [c for c in cmds if c[2] in ("open", "close", "dance")]
        flags = []
        if len(counted) > limit(ch):
            flags.append(f"OVER LIMIT {len(counted)}>{limit(ch)}")
        dance_total = sum(b - a for a, b, c in cmds if c == "dance")
        if dance_total > 30:
            flags.append(f"DANCE > 30 s ({dance_total:.0f} s)")
        last_open, last_move = None, None
        reversals = []
        for a, b, c in cmds:
            if c == "dance" and kind(ch) != "window":
                if last_open is None or a - last_open < travel(ch, "open", truck) - 0.05:
                    flags.append(f"DANCE NOT OPEN at {a:.1f}s ({(a - last_open) if last_open is not None else 0:.1f}s after Open)")
            if c in ("open", "close") and last_move is not None:
                prev_c, prev_t = last_move
                if prev_c != c and prev_c in ("open", "close"):
                    need = travel(ch, prev_c, truck)
                    if a - prev_t < need - 0.05:
                        reversals.append(f"{a:.1f}s {c} {100 * (a - prev_t) / need:.0f}%")
            if c == "open":
                last_open = a
            if c in ("open", "close"):
                last_move = (c, a)
            if c == "stop":
                last_move = None                        # a deliberate part-way stop
            if c == "close" and kind(ch) == "charge port" and last_open is not None and a - last_open > 120:
                flags.append(f"PORT AUTO-CLOSE (open {a - last_open:.0f}s)")
        if reversals:
            flags.append(f"REVERSED EARLY x{len(reversals)} (" + ", ".join(reversals[:4]) + (" ..." if len(reversals) > 4 else "") + ")")
        intervals = np.diff([a for a, b, c in counted]) if len(counted) > 1 else []
        report.append(dict(closure=CLOSURES[ch], n=len(counted), limit=limit(ch), dance=dance_total,
                           min_gap=float(np.min(intervals)) if len(intervals) else None, flags=flags,
                           script=" ".join(f"{c}@{a:.1f}" for a, b, c in cmds[:12]) + (" ..." if len(cmds) > 12 else "")))
    return report


def main(paths, summary=False):
    for p in paths:
        rep = audit(p)
        if summary:
            used = ", ".join(f"{r['closure']} {r['n']}" for r in rep)
            flags = sum(len(r["flags"]) for r in rep)
            print(f"{Path(p).parent.parent.name if Path(p).parent.name == 'LightShow' else Path(p).parent.name:<40} {used or 'no closures'}  flags {flags}")
            for r in rep:
                for f in r["flags"]:
                    print(f"    {r['closure']}: {f}")
            continue
        print(f"== {p}")
        for r in rep:
            gap = f"{r['min_gap']:.1f}s" if r["min_gap"] is not None else "-"
            print(f"  {r['closure']:<15} {r['n']:2d}/{r['limit']:<2} commands, dance {r['dance']:4.0f}s, closest commands {gap}")
            print(f"      {r['script']}")
            for f in r["flags"]:
                print(f"      ! {f}")


if __name__ == "__main__":
    args = sys.argv[1:]
    summary = "--summary" in args
    main([a for a in args if a != "--summary"], summary)
