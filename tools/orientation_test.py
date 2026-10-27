"""Calibration show for the viewer and the cars: lights march crowd-left to crowd-right.

0-6 s   every car's two halves in order (car 1's crowd-left half, car 1's crowd-right half, car 2 ...)
6-9 s   the centre Cybertruck's bar sweeps crowd-left to crowd-right (if the lineup has one)
9-12 s  each car in turn: crowd-left headlight, then crowd-right headlight
The lineup is setlist.json's.
Writes output/00_orientation_test/ like a normal show (silent audio) and registers it.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build import setlist_lineup                        # noqa: E402
from lightshow import channels as C                     # noqa: E402
from lightshow import moves as M                        # noqa: E402
from lightshow.choreo import make_lineup                # noqa: E402
from lightshow.fseq import write_fseq                   # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
NAME = "00_orientation_test"
DUR = 12.0
STEP = 0.02


def main():
    cars = make_lineup(setlist_lineup(), int(DUR / STEP), STEP)
    slots = [(c, s) for c in cars for s in ("L", "R")]
    per = 6.0 / len(slots)
    for k, (car, side) in enumerate(slots):
        car.light(car.heads(side) + car.accents(side), k * per, (k + 0.9) * per)
    ct = M.centre_truck(cars)
    if ct is not None:
        n = ct.fr(9.0) - ct.fr(6.0)
        leds = np.arange(len(C.FRONT_BAR))
        centre = np.linspace(0, len(leds) - 1, n)
        ct.pixels(C.FRONT_BAR, 6.0, np.exp(-((leds[None, :] - centre[:, None]) / 2.5) ** 2))
    per = 3.0 / len(cars)
    for k, car in enumerate(cars):
        t = 9.0 + k * per
        car.light(car.heads("L"), t, t + 0.45 * per)
        car.light(car.heads("R"), t + 0.5 * per, t + 0.95 * per)
    out = ROOT / "output" / NAME
    out.mkdir(parents=True, exist_ok=True)
    wav = out / f"{NAME}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                    "-t", str(DUR), "-c:a", "pcm_s16le", str(wav)], check=True)
    entries = []
    for car in cars:
        d = out / car.name / "LightShow"
        d.mkdir(parents=True, exist_ok=True)
        write_fseq(d / f"{NAME}.fseq", car.frames, int(STEP * 1000), media_filename=f"{NAME}.wav")
        (d / f"{NAME}.wav").write_bytes(wav.read_bytes())
        entries.append({"name": car.name, "kind": car.kind, "fseq": str((d / f"{NAME}.fseq").relative_to(ROOT))})
    mp = ROOT / "preview" / "shows.json"
    manifest = json.loads(mp.read_text()) if mp.exists() else {}
    manifest[NAME] = {"audio": str(wav.relative_to(ROOT)), "cars": entries}
    mp.write_text(json.dumps(dict(sorted(manifest.items())), indent=2))
    print(out)


if __name__ == "__main__":
    main()
