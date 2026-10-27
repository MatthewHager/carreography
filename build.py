#!/usr/bin/env python3
"""Build the light shows.

    python3 build.py                  build every song in setlist.json, then gather the USB folders
    python3 build.py 04 thriller      build only the songs whose number or name matches
    python3 build.py --assemble       no analysis: cut each song's audio from songs/, gather the USB
                                      folders and the viewer's show list from the shows already in
                                      output/ (needs only ffmpeg - no machine-learning setup)
    python3 build.py --song my.mp3 --name my_song [--start 30] [--end 150] [--stems] [--max-level 1]
                                      [--style legato] [--out DIR]
                                      try a song that isn't in the set list
    python3 build.py --diagnostic --lineup YC --out DIR
                                      the voiced test show for a lineup

Options: --lineup (the cars, crowd's left to right, e.g. YCY: Y = Model Y 2025+, y = Model Y
2020-24, C = Cybertruck; 1 to 5 cars; default: setlist.json's "lineup"), --jobs N (songs built in
parallel, default 2), --no-liftgate.

Per song this writes output/<name>/<name>.wav (44.1 kHz, trimmed), output/<name>/<car>/LightShow/
<name>.fseq for each car, and moves.txt / pulse.txt (what the choreographer chose and why); then
usb/<car>/LightShow/ gets every show's .fseq + .wav (copy that LightShow folder to the root of each
car's USB drive), and preview/shows.json lists the shows for the 3D viewer.

With --out DIR (--song or --diagnostic), everything for that one show goes in DIR instead:
DIR/<name>.wav, DIR/<car>/LightShow/<name>.fseq, DIR/usb/<car>/LightShow/ (ready to copy) and
DIR/shows.json (for the viewer, paths relative to DIR). Lines starting "PROGRESS <percent> <step>"
report how far the build has got (webapp/ reads them).

The analysis runs in the project environment (.venv312, see setup.sh, or the Python named by
$LIGHTSHOW_PYTHON); this script can be started with any Python 3 and hands the heavy work to that
environment, one process per song.
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
VENV_PY = Path(os.environ.get("LIGHTSHOW_PYTHON") or ROOT / ".venv312" / "bin" / "python")
BEATS_PY = Path(os.environ.get("LIGHTSHOW_BEATS_PYTHON") or ROOT / ".venv_beats" / "bin" / "python")
DEFAULT_LINEUP = "YCY"

sys.path.insert(0, str(ROOT))
from lightshow import vehicles as VEH      # noqa: E402  (plain Python: safe outside the analysis environment)


# --- set list ----------------------------------------------------------------------------------

def setlist():
    return json.loads(SETLIST.read_text())["songs"]


def setlist_lineup():
    return json.loads(SETLIST.read_text()).get("lineup", DEFAULT_LINEUP) if SETLIST.exists() else DEFAULT_LINEUP


def progress(pct, step):
    """A progress line for whoever runs the build (webapp/ shows them)."""
    print(f"PROGRESS {pct} {step}", flush=True)


def show_dir(song):
    """Where a song's show is written: --out, or output/<name>/."""
    return Path(song["out"]) if song.get("out") else OUTPUT / song["name"]


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
    out_dir = show_dir(song)
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

def build_one(song, use_liftgate=True):
    import pickle

    import numpy as np

    from lightshow import channels as C
    from lightshow.audio import analyze
    from lightshow.choreo import choreograph
    from lightshow.fseq import write_fseq

    name = song["name"]
    layout = song.get("lineup") or DEFAULT_LINEUP
    out_dir = show_dir(song)
    if song.get("style") == "diagnostic":
        return build_diagnostic(song)
    progress(2, "preparing the audio")
    wav = prepare_audio(song)

    stems = None
    if song.get("stems"):
        progress(5, "separating vocals, drums and bass")
        from lightshow.stems import separate
        stems = separate(str(wav))
    beats_json = wav.with_suffix(".beats.json")
    progress(25, "finding the beat")
    if not beats_json.exists() or beats_json.stat().st_mtime < wav.stat().st_mtime:
        if BEATS_PY.exists():   # the neural beat tracker has its own environment (tools/track_beats.py)
            subprocess.run([str(BEATS_PY), str(ROOT / "tools" / "track_beats.py"), str(wav), str(beats_json)],
                           check=False, capture_output=True)
        else:
            print("  (no .venv_beats: using the built-in beat tracker only)")
    progress(35, "listening to the notes")
    an = analyze(str(wav), C.STEP_MS, max_tier=song.get("max_level") or 3, stems=stems)
    an.lyric_words = None
    from lightshow.cues import driver
    rhythm = song.get("driver") or driver(name, stems=bool(stems))
    if stems:
        progress(75, "timing the lyrics")
        from lightshow.lyrics import transcribe_words
        if rhythm == "vocal_band":
            an.lyric_words = transcribe_words(stems["vocals"])
            print(f"  lyrics: {len(an.lyric_words)} words")
    tiers = [round(float((an.tier == k).mean() * 100)) for k in range(4)]
    print(f"{name}: {an.duration:.1f}s, {an.tempo:.0f} BPM, {len(an.notes)} notes, {len(an.bass)} bass, "
          f"{len(an.hits)} accents, tier% {tiers}")
    progress(90, "choreographing")
    cars = choreograph(an, layout=layout, use_liftgate=use_liftgate, name=name, style=song.get("style"),
                       driver=rhythm)
    (out_dir / "lineup.txt").write_text(layout + "\n")
    for old in car_dirs(name, out_dir):                 # cars from an earlier build with another lineup
        if old.name not in {c.name for c in cars}:
            shutil.rmtree(old)
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
        car_dir = out_dir / car.name / "LightShow"
        car_dir.mkdir(parents=True, exist_ok=True)
        write_fseq(car_dir / f"{name}.fseq", car.frames, C.STEP_MS, media_filename=f"{name}.wav")
        counts = {k: v for k, v in sorted(car.closure_counts.items())}
        print(f"  {car.name}: closure commands {counts}")
    progress(100, "done")


def build_diagnostic(song):
    """The voiced test show (lightshow/diagnostic.py): no analysis, the voice track is the clock."""
    from lightshow import channels as C
    from lightshow import diagnostic
    from lightshow.fseq import write_fseq

    name = song["name"]
    layout = song.get("lineup") or DEFAULT_LINEUP
    src = Path(song["file"]) if Path(song["file"]).is_absolute() else SONGS / song["file"]
    src.parent.mkdir(parents=True, exist_ok=True)
    progress(10, "recording the announcements")
    timing = diagnostic.ensure_audio(src, src.with_suffix(".json"), layout)
    prepare_audio(song)
    cars = diagnostic.choreograph(timing, layout)
    (show_dir(song) / "lineup.txt").write_text(layout + "\n")
    for old in car_dirs(name, show_dir(song)):
        if old.name not in {c.name for c in cars}:
            shutil.rmtree(old)
    for car in cars:
        car_dir = show_dir(song) / car.name / "LightShow"
        car_dir.mkdir(parents=True, exist_ok=True)
        write_fseq(car_dir / f"{name}.fseq", car.frames, C.STEP_MS, media_filename=f"{name}.wav")
        print(f"  {car.name}: closure commands {dict(sorted(car.closure_counts.items()))}")
    print(f"{name}: {timing['duration']:.0f} s, {len(timing['steps'])} tests")
    progress(100, "done")


# --- the set list ------------------------------------------------------------------------------

def run_in_venv(song, args, echo=False):
    """Build one song in its own analysis-environment process; its output goes to <show>/build.log
    (and with echo, its PROGRESS lines to this process's output too)."""
    log = show_dir(song) / "build.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    cmd = [str(VENV_PY), str(ROOT / "build.py"), "--one", json.dumps(song)]
    if args.no_liftgate:
        cmd.append("--no-liftgate")
    t0 = time.time()
    with open(log, "w") as f:
        proc = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in proc.stdout:
            f.write(line)
            f.flush()
            if echo and line.startswith("PROGRESS "):
                print(line, end="", flush=True)
        rc = proc.wait()
    status = "ok" if rc == 0 else f"FAILED (see {log})"
    print(f"  {song['name']:<34} {status}  {time.time() - t0:5.0f} s", flush=True)
    if rc:
        print("    " + "\n    ".join(log.read_text().strip().splitlines()[-6:]))
    return rc


def car_dirs(name, base=None):
    """The car folders a show was built for, crowd-left to right (Car1_..., Car2_...)."""
    base = base or OUTPUT / name
    return sorted((p for p in base.glob("Car*") if (p / "LightShow" / f"{name}.fseq").exists()),
                  key=lambda p: int(re.match(r"Car(\d+)", p.name).group(1)))


def show_cars(name, base=None):
    """[(car folder, Vehicle)] for a built show, crowd-left to right. The lineup is read from the
    show's lineup.txt (written by the build); without one, a Model Y is taken to be a 2025+ one."""
    base = base or OUTPUT / name
    dirs = car_dirs(name, base)
    saved = base / "lineup.txt"
    if saved.exists():
        letters = saved.read_text().strip()
        if len(letters) == len(dirs):
            return [(d, VEH.VEHICLES[ch]) for d, ch in zip(dirs, letters)]
    return [(d, VEH.VEHICLES["C" if "Cybertruck" in d.name else "Y"]) for d in dirs]


def manifest_entry(song, base, prefix):
    """One show for the 3D viewer: its audio and each car's file and body."""
    name = song["name"]
    letters = song.get("lineup") or DEFAULT_LINEUP
    bodies = {car: v.body for car, v, _ in VEH.cars(letters)} if letters else {}
    cars = car_dirs(name, base)
    if not cars:
        return None
    return {"audio": f"{prefix}{name}.wav",
            "cars": [{"name": c.name, "kind": "cybertruck" if "Cybertruck" in c.name else "modely",
                      **({"body": bodies[c.name]} if c.name in bodies else {}),
                      "fseq": f"{prefix}{c.name}/LightShow/{name}.fseq"} for c in cars]}


def write_manifest(songs):
    """preview/shows.json: the shows the 3D viewer can play, in set-list order."""
    manifest = {}
    for song in songs:
        entry = manifest_entry(song, OUTPUT / song["name"], f"output/{song['name']}/")
        if entry:
            manifest[song["name"]] = entry
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def finish_out_dir(song):
    """--out: the viewer's shows.json and a usb/ folder per car, inside the show's own folder."""
    base, name = show_dir(song), song["name"]
    entry = manifest_entry(song, base, "")
    if not entry:
        return False
    (base / "shows.json").write_text(json.dumps({name: entry}, indent=2) + "\n")
    for car in car_dirs(name, base):
        dest = base / "usb" / car.name / "LightShow"
        dest.mkdir(parents=True, exist_ok=True)
        for src in (car / "LightShow" / f"{name}.fseq", base / f"{name}.wav"):
            shutil.copyfile(src, dest / src.name)
    return True


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
    ap.add_argument("--lineup", help="the cars, crowd's left to right, e.g. YCY (Y = Model Y 2025+, "
                                     "y = Model Y 2020-24, C = Cybertruck; 1-5 cars)")
    ap.add_argument("--jobs", type=int, default=2, help="songs built in parallel (default 2)")
    ap.add_argument("--no-liftgate", action="store_true", help="never open the liftgates/frunk")
    ap.add_argument("--song", help="a recording that isn't in the set list")
    ap.add_argument("--name", help="show name for --song")
    ap.add_argument("--start", type=float, help="trim start for --song (s)")
    ap.add_argument("--end", type=float, help="trim end for --song (s)")
    ap.add_argument("--stems", action="store_true", help="--song is a band recording: separate stems first")
    ap.add_argument("--max-level", type=int, choices=(0, 1, 2, 3), help="cap the intensity for --song")
    ap.add_argument("--style", choices=("legato",), help="--song is slow, flowing music with no beat")
    ap.add_argument("--driver", choices=("organ", "orchestra", "band", "vocal_band"),
                    help="what carries --song's rhythm (default: band with --stems, else orchestra; "
                         "vocal_band also times the lyrics)")
    ap.add_argument("--diagnostic", action="store_true", help="build the voiced test show for --lineup")
    ap.add_argument("--out", help="with --song or --diagnostic: write this one show to this folder")
    ap.add_argument("--one", help=argparse.SUPPRESS)      # internal: build one song (JSON) in this process
    args = ap.parse_args()

    if args.one:
        try:
            build_one(json.loads(args.one), use_liftgate=not args.no_liftgate)
        except Exception as e:                    # the traceback for developers, one line for people
            import traceback
            traceback.print_exc()
            print(f"FAILED: {type(e).__name__}: {e}", flush=True)
            sys.exit(1)
        return

    try:
        lineup = VEH.parse_lineup(args.lineup or setlist_lineup())
    except ValueError as e:
        sys.exit(f"--lineup: {e}")
    if args.out and not (args.song or args.diagnostic):
        sys.exit("--out works with --song or --diagnostic")
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is needed (macOS: brew install ffmpeg; Debian/Ubuntu: apt install ffmpeg)")

    out = Path(args.out).resolve() if args.out else None
    if args.diagnostic:
        name = "00_diagnostic"
        voice_dir = out / "voice" if out else ROOT / "cache" / "diagnostic"
        voice_file = "-".join(VEH.VEHICLES[ch].body for ch in lineup) + ".wav"
        songs = [{"name": name, "file": str(voice_dir / voice_file), "style": "diagnostic", "lineup": lineup,
                  **({"out": str(out)} if out else {})}]
    elif args.song:
        songs = [{"name": slug(args.name or Path(args.song).stem), "file": str(Path(args.song).resolve()),
                  "start": args.start, "end": args.end, "stems": args.stems, "max_level": args.max_level or 3,
                  "style": args.style, "driver": args.driver, "lineup": lineup, **({"out": str(out)} if out else {})}]
    else:
        songs = [{**s, "lineup": lineup} for s in select(setlist(), args.songs)]

    if args.assemble:
        for song in songs:
            prepare_audio(song)
            print(f"  {song['name']:<34} audio ready, {len(car_dirs(song['name']))} cars")
    else:
        if not VENV_PY.exists():
            sys.exit("the analysis environment is missing - run ./setup.sh first (or use --assemble)")
        print(f"building {len(songs)} show(s) for {VEH.describe(lineup)}, {args.jobs} at a time "
              f"(logs: {'<out>' if out else 'output/<song>'}/build.log)")
        with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
            failed = sum(rc != 0 for rc in pool.map(lambda s: run_in_venv(s, args, echo=bool(out)), songs))
        if not out:
            subprocess.run([str(VENV_PY), "-c", "from lightshow.catalog import write_markdown; write_markdown()"],
                           cwd=ROOT, check=False)
        if failed:
            sys.exit(f"{failed} show(s) failed")

    if out:
        finish_out_dir(songs[0])
        print(f"built {songs[0]['name']} in {out}: copy each usb/<car>/LightShow folder to that car's drive")
    elif args.song or args.diagnostic:
        write_manifest(setlist() + songs)
        print(f"built {songs[0]['name']} - add it to setlist.json to include it on the USB drives")
    else:
        full = [{**s, "lineup": lineup} for s in setlist()]
        write_manifest(full)
        print("USB folders:")
        gather_usb(full)


if __name__ == "__main__":
    main()
