"""Export each built song's analysis as JSON, with the frames the Python choreographer makes from it,
so the TypeScript port (app/) can be checked against Python song by song.

    .venv312/bin/python tools/export_bridge.py [--lineup yCy] [song numbers or names]

Reads the shows already in output/ (their audio, stems, notes, beats and lyrics caches) and writes
cache/bridge/<song>/analysis.json plus one <car>.bin per car (raw frames, frame-major); another
lineup than the set list's goes in cache/bridge/<song>@<lineup>/. Nothing in
output/ is written. The files describe copyrighted recordings, so they stay out of the repository.
"""

import copy
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import build  # noqa: E402
from lightshow.audio import analyze  # noqa: E402
from lightshow import channels as C  # noqa: E402
from lightshow.choreo import choreograph  # noqa: E402
from lightshow.cues import driver  # noqa: E402
from lightshow.fseq import read_fseq  # noqa: E402

OUT = ROOT / "cache" / "bridge"


def plain(x):
    """numpy and dataclasses -> JSON values (floats keep their exact repr)."""
    if isinstance(x, np.ndarray):
        return plain(x.tolist())
    if isinstance(x, (np.floating,)):
        return float(x)
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.bool_,)):
        return bool(x)
    if isinstance(x, (list, tuple)):
        return [plain(v) for v in x]
    if isinstance(x, dict):
        return {k: plain(v) for k, v in x.items()}
    if hasattr(x, "__dataclass_fields__"):
        return {k: plain(getattr(x, k)) for k in x.__dataclass_fields__}
    return x


def export(song, lineup):
    name = song["name"]
    out_dir = build.show_dir(song)
    wav = out_dir / f"{name}.wav"
    if not wav.exists():
        print(f"  {name}: no audio in output/, skipped")
        return
    stems = None
    if song.get("stems"):
        paths = {s: out_dir / "stems" / f"{s}.wav" for s in ("drums", "bass", "other", "vocals")}
        if not all(p.exists() for p in paths.values()):
            print(f"  {name}: stems missing, skipped")
            return
        stems = {s: str(p) for s, p in paths.items()}
    an = analyze(str(wav), C.STEP_MS, max_tier=song.get("max_level") or 3, stems=stems)
    an.lyric_words = None
    rhythm = song.get("driver") or driver(name, stems=bool(stems))
    if stems and rhythm == "vocal_band":
        from lightshow.lyrics import transcribe_words
        an.lyric_words = transcribe_words(stems["vocals"])
    before = copy.deepcopy(an)
    cars = choreograph(an, layout=lineup, use_liftgate=True, name=name, style=song.get("style"), driver=rhythm)

    dest = OUT / (name if lineup == build.setlist_lineup() else f"{name}@{lineup}")
    dest.mkdir(parents=True, exist_ok=True)
    data = plain(before)
    data["lyric_words"] = plain(getattr(before, "lyric_words", None))
    meta = {"name": name, "lineup": lineup, "style": song.get("style"), "driver": rhythm,
            "cars": [c.name for c in cars], "n_channels": C.N_CHANNELS}
    (dest / "analysis.json").write_text(json.dumps({"meta": meta, "analysis": data}))
    same = []
    for car in cars:
        (dest / f"{car.name}.bin").write_bytes(np.ascontiguousarray(car.frames, np.uint8).tobytes())
        built = out_dir / car.name / "LightShow" / f"{name}.fseq"
        if built.exists():
            frames, _ = read_fseq(built)
            same.append(frames.shape == car.frames.shape and bool((frames == car.frames).all()))
    note = "matches output/" if same and all(same) else "differs from output/ (rebuilt since?)" if same else ""
    print(f"  {name}: {len(cars)} cars {note}")


def main():
    args = sys.argv[1:]
    lineup = build.setlist_lineup()
    if args[:1] == ["--lineup"]:
        lineup, args = args[1], args[2:]
    songs = [s for s in build.select(build.setlist(), args) if s.get("style") != "diagnostic"]
    for song in songs:
        export({**song, "lineup": lineup}, lineup)


if __name__ == "__main__":
    main()
