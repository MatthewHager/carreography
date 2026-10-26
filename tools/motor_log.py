"""Print every closure command in a built show, in time order, across the three cars.

    .venv312/bin/python tools/motor_log.py 01_toccata_and_fugue [liftgate|windows|mirrors|port]

A quick way to read the motor choreography as a script: who lifts when, who follows, who stops.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow import channels as C                     # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
NAMES = {C.LIFTGATE: "lid", C.CHARGE_PORT: "port", C.L_MIRROR: "mirL", C.R_MIRROR: "mirR",
         C.L_FRONT_WINDOW: "winLF", C.R_FRONT_WINDOW: "winRF", C.L_REAR_WINDOW: "winLR", C.R_REAR_WINDOW: "winRR"}
GROUPS = {"liftgate": [C.LIFTGATE], "port": [C.CHARGE_PORT], "mirrors": list(C.MIRRORS), "windows": list(C.WINDOWS)}
CMD = {C.CLOSURE_OPEN: "open", C.CLOSURE_DANCE: "dance", C.CLOSURE_CLOSE: "close", C.CLOSURE_STOP: "STOP"}


def main():
    show = sys.argv[1]
    group = sys.argv[2] if len(sys.argv) > 2 else "liftgate"
    chans = GROUPS[group]
    rows = []
    for d in sorted((ROOT / "output" / show).iterdir()):
        f = d / "LightShow" / f"{show}.fseq"
        if not f.exists():
            continue
        frames, step_ms = read_fseq(f)[:2]
        for ch in chans:
            col = frames[:, ch]
            prev = 0
            for i, v in enumerate(col):
                if v != prev and v != 0:
                    rows.append((i * step_ms / 1000, d.name, NAMES.get(ch, str(ch)), CMD.get(int(v), str(v))))
                prev = v
    rows.sort()
    for t, car, ch, cmd in rows:
        print(f"{t:7.2f}  {car:<14} {ch:<6} {cmd}")


if __name__ == "__main__":
    main()
