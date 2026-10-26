#!/usr/bin/env python3
"""Build the light shows.

    python3 build.py                  build every song in setlist.json, then gather the USB folders
    python3 build.py 04 thriller      build only the songs whose number or name matches
    python3 build.py --assemble       no analysis: cut each song's audio from songs/, gather the USB
                                      folders and the viewer's show list from the shows already in
                                      output/ (needs only ffmpeg - no machine-learning setup)
    python3 build.py --song my.mp3 --name my_song [--start 30] [--end 150] [--stems] [--max-level 1]
                                      try a song that isn't in the set list

Options: --jobs N (songs built in parallel, default 2), --no-liftgate.

Per song this writes output/<name>/<name>.wav (44.1 kHz, trimmed), output/<name>/<car>/LightShow/
<name>.fseq for each car, and moves.txt / pulse.txt (what the choreographer chose and why); then
usb/<car>/LightShow/ gets every show's .fseq + .wav (copy that LightShow folder to the root of each
car's USB drive), and preview/shows.json lists the shows for the 3D viewer.

The analysis runs in the project environment (.venv312, see setup.sh); this script can be started
with any Python 3 and hands the heavy work to that environment, one process per song.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SETLIST = ROOT / "setlist.json"
SONGS = ROOT / "songs"
OUTPUT = ROOT / "output"
USB = ROOT / "usb"
MANIFEST = ROOT / "preview" / "shows.json"
VENV_PY = ROOT / ".venv312" / "bin" / "python"
BEATS_PY = ROOT / ".venv_beats" / "bin" / "python"


# --- set list ----------------------------------------------------------------------------------

def setlist():
    return json.loads(SETLIST.read_text())["songs"]


def select(songs, patterns):
    """Songs whose number ('04') or name contains any of the patterns; all songs if none given."""
    if not patterns:
        return songs
    picked = [s for s in songs if any(p == s["name"][:2] or p.lower() in s["name"] for p in patterns)]
    missing = [p for p in patterns if not any(p == s["name"][:2] or p.lower() in s["name"] for s in songs)]
    if missing:
        sys.exit(f"not in setlist.json: {', '.join(missing)}")
    return picked


def slug(s):
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()


# --- audio -------------------------------------------------------------------------------------

def prepare_audio(song):
    """Cut the recording to the show's audio: 44.1 kHz stereo WAV (Tesla needs 44.1 kHz; 48 kHz
    drifts out of sync), trimmed, with a fade in after a start trim and a fade out before an end
    trim. The file is only replaced when its content changes, so the analysis caches next to it
    (stems, notes, lyrics, beats) stay valid across rebuilds."""
    name = song["name"]
    src = Path(song["file"]) if Path(song["file"]).is_absolute() else SONGS / song["file"]
    if not src.exists():
        sys.exit(f"{name}: recording not found: {src}")
    out_dir = OUTPUT / name
    out_dir.mkdir(parents=True, exist_ok=True)
    wav = out_dir / f"{name}.wav"
    start, end = song.get("start") or 0, song.get("end")
    trim, fades = [], []
    if start:
        trim += ["-ss", str(start)]
        fades.append("afade=t=in:d=1.5")
    if end:
        trim += ["-to", str(end)]
        fades.append(f"afade=t=out:st={end - start - 3:.2f}:d=3")
    with tempfile.NamedTemporaryFile(suffix=".wav", dir=out_dir, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *trim, "-i", str(src),
                        *(["-af", ",".join(fades)] if fades else []),
                        "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", str(tmp_path)], check=True)
        if wav.exists() and wav.read_bytes() == tmp_path.read_bytes():
            tmp_path.unlink()
        else:
            os.replace(tmp_path, wav)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
    return wav


# --- one song (runs inside .venv312) -----------------------------------------------------------

def build_one(song, use_liftgate=True, layout="YCY"):
    import pickle

    import numpy as np

    from lightshow import channels as C
    from lightshow.audio import analyze
    from lightshow.choreo import choreograph
    from lightshow.fseq import write_fseq

    name = song["name"]
    out_dir = OUTPUT / name
    wav = prepare_audio(song)

    stems = None
    if song.get("stems"):
        from lightshow.stems import separate
        stems = separate(str(wav))
    beats_json = wav.with_suffix(".beats.json")
    if not beats_json.exists() or beats_json.stat().st_mtime < wav.stat().st_mtime:
        if BEATS_PY.exists():   # the neural beat tracker has its own environment (tools/track_beats.py)
            subprocess.run([str(BEATS_PY), str(ROOT / "tools" / "track_beats.py"), str(wav), str(beats_json)],
                           check=False, capture_output=True)
        else:
            print("  (no .venv_beats: using the built-in beat tracker only)")
    an = analyze(str(wav), C.STEP_MS, max_tier=song.get("max_level", 3), stems=stems)
    an.lyric_words = None
    if stems:
        from lightshow.cues import driver
        from lightshow.lyrics import transcribe_words
        if driver(name) == "vocal_band":
            an.lyric_words = transcribe_words(stems["vocals"])
            print(f"  lyrics: {len(an.lyric_words)} words")
    tiers = [round(float((an.tier == k).mean() * 100)) for k in range(4)]
    print(f"{name}: {an.duration:.1f}s, {an.tempo:.0f} BPM, {len(an.notes)} notes, {len(an.bass)} bass, "
          f"{len(an.hits)} accents, tier% {tiers}")
    cars = choreograph(an, layout=layout, use_liftgate=use_liftgate, name=name, style=song.get("style"))
    if an.sections:
        print("  form:", " ".join(f"{s.letter}{s.nth}[{s.t0:.0f}-{s.t1:.0f}s c{s.ceiling}]" for s in an.sections))
    print("  moves:", " → ".join(ph.move for ph in an.phrases))

    # what the choreographer chose, and the analysis the review tools (tools/) read back
    (out_dir / "moves.txt").write_text("".join(
        f"{ph.t0:7.2f} {ph.t1:7.2f}  {ph.gesture:<11} {getattr(ph, 'mood', ''):<7} {ph.move}\n" for ph in an.phrases))
    segs = sorted(list(an.phrases) + list(getattr(an, "pulse_gaps", [])), key=lambda p: p.t0)
    (out_dir / "pulse.txt").write_text("".join(
        f"{ph.t0:7.2f} {ph.t1:7.2f}  {getattr(ph, 'mood', ''):<7} {ph.move:<34} {getattr(ph, 'pulse', '')}\n" for ph in segs))
    np.save(out_dir / "beats.npy", an.beats)
    np.save(out_dir / "downbeats.npy", an.downbeats)
    (out_dir / "analysis.pkl").write_bytes(pickle.dumps(an))

    for car in cars:
        show_dir = out_dir / car.name / "LightShow"
        show_dir.mkdir(parents=True, exist_ok=True)
        write_fseq(show_dir / f"{name}.fseq", car.frames, C.STEP_MS, media_filename=f"{name}.wav")
        counts = {k: v for k, v in sorted(car.closure_counts.items())}
        print(f"  {car.name}: closure commands {counts}")


# --- the set list ------------------------------------------------------------------------------

def run_in_venv(song, args):
    """Build one song in its own .venv312 process; its output goes to output/<name>/build.log."""
    log = OUTPUT / song["name"] / "build.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    cmd = [str(VENV_PY), str(ROOT / "build.py"), "--one", json.dumps(song)]
    if args.no_liftgate:
        cmd.append("--no-liftgate")
    t0 = time.time()
    with open(log, "w") as f:
        rc = subprocess.run(cmd, cwd=ROOT, stdout=f, stderr=subprocess.STDOUT).returncode
    status = "ok" if rc == 0 else f"FAILED (see {log.relative_to(ROOT)})"
    print(f"  {song['name']:<34} {status}  {time.time() - t0:5.0f} s", flush=True)
    if rc:
        print("    " + "\n    ".join(log.read_text().strip().splitlines()[-6:]))
    return rc


def car_dirs(name):
    return sorted(p for p in (OUTPUT / name).glob("*") if (p / "LightShow" / f"{name}.fseq").exists())


def write_manifest(songs):
    """preview/shows.json: the shows the 3D viewer can play, in set-list order."""
    manifest = {}
    for song in songs:
        name = song["name"]
        cars = car_dirs(name)
        if not cars:
            continue
        manifest[name] = {"audio": f"output/{name}/{name}.wav",
                          "cars": [{"name": c.name, "kind": "cybertruck" if "Cybertruck" in c.name else "modely",
                                    "fseq": f"output/{name}/{c.name}/LightShow/{name}.fseq"} for c in cars]}
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def gather_usb(songs):
    """usb/<car>/LightShow/: every show's .fseq and .wav for that car - copy the LightShow folder
    to the root of the car's USB drive (exFAT or FAT32)."""
    shutil.rmtree(USB, ignore_errors=True)
    n = 0
    for song in songs:
        name = song["name"]
        wav = OUTPUT / name / f"{name}.wav"
        for car in car_dirs(name):
            dest = USB / car.name / "LightShow"
            dest.mkdir(parents=True, exist_ok=True)
            for src in (car / "LightShow" / f"{name}.fseq", wav):
                target = dest / src.name
                try:
                    os.link(src, target)            # same disk: no extra space
                except OSError:
                    shutil.copy2(src, target)
            n += 1
    for car in sorted(USB.glob("*")):
        print(f"  {car.relative_to(ROOT)}/LightShow: {len(list(car.glob('LightShow/*.fseq')))} shows")
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("songs", nargs="*", help="numbers or names of songs to build (default: all)")
    ap.add_argument("--assemble", action="store_true", help="no analysis: audio, USB folders and viewer list only")
    ap.add_argument("--jobs", type=int, default=2, help="songs built in parallel (default 2)")
    ap.add_argument("--no-liftgate", action="store_true", help="never open the liftgates/frunk")
    ap.add_argument("--song", help="a recording that isn't in the set list")
    ap.add_argument("--name", help="show name for --song")
    ap.add_argument("--start", type=float, help="trim start for --song (s)")
    ap.add_argument("--end", type=float, help="trim end for --song (s)")
    ap.add_argument("--stems", action="store_true", help="--song is a band recording: separate stems first")
    ap.add_argument("--max-level", type=int, choices=(0, 1, 2, 3), help="cap the intensity for --song")
    ap.add_argument("--one", help=argparse.SUPPRESS)      # internal: build one song (JSON) in this process
    args = ap.parse_args()

    if args.one:
        build_one(json.loads(args.one), use_liftgate=not args.no_liftgate)
        return

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is needed (macOS: brew install ffmpeg)")

    if args.song:
        song = {"name": slug(args.name or Path(args.song).stem), "file": str(Path(args.song).resolve()),
                "start": args.start, "end": args.end, "stems": args.stems, "max_level": args.max_level or 3}
        songs = [song]
    else:
        songs = select(setlist(), args.songs)

    if args.assemble:
        for song in songs:
            prepare_audio(song)
            print(f"  {song['name']:<34} audio ready, {len(car_dirs(song['name']))} cars")
    else:
        if not VENV_PY.exists():
            sys.exit("the analysis environment is missing - run ./setup.sh first (or use --assemble)")
        print(f"building {len(songs)} song(s), {args.jobs} at a time (logs: output/<song>/build.log)")
        with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
            failed = sum(rc != 0 for rc in pool.map(lambda s: run_in_venv(s, args), songs))
        subprocess.run([str(VENV_PY), "-c", "from lightshow.catalog import write_markdown; write_markdown()"],
                       cwd=ROOT, check=False)
        if failed:
            print(f"{failed} song(s) failed")

    if not args.song:
        full = setlist()
        write_manifest(full)
        print("USB folders:")
        gather_usb(full)
    else:
        write_manifest(setlist() + songs)
        print(f"built {songs[0]['name']} - add it to setlist.json to include it on the USB drives")


if __name__ == "__main__":
    main()
