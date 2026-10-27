"""The web app: upload a song, pick the cars, wait, download each car's USB files.

    python3 -m webapp           (from the repo root; or python3 webapp/server.py)

then open http://localhost:8000. Needs requirements-web.txt (fastapi, uvicorn, python-multipart) in the
Python that runs it; the analysis itself runs in the Python build.py uses ($LIGHTSHOW_PYTHON).
See webapp/README.md for the settings and the limits.

This file is the HTTP side: it checks an upload, hands it to the job queue (jobs.py), reports a job's
progress, and serves the finished files - as zips for the USB drives, and as plain files for the 3D viewer.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile      # noqa: E402
from fastapi.responses import FileResponse, JSONResponse                         # noqa: E402
from fastapi.staticfiles import StaticFiles                                      # noqa: E402
from starlette.background import BackgroundTask                                  # noqa: E402

from lightshow import vehicles                                                  # noqa: E402
from webapp import jobs                                                          # noqa: E402

STATIC = Path(__file__).resolve().parent / "static"
VIEWER = ROOT / "preview3d" / "dist"
MAX_UPLOAD_MB = float(os.environ.get("LIGHTSHOW_MAX_UPLOAD_MB", "60"))
MIN_SECONDS = 10                    # shorter than this and the analysis has nothing to work with
MAX_MINUTES = 10                    # longest show we'll build; a 3-minute song already takes several minutes
AUDIO_TYPES = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}

QUEUE = jobs.JobQueue()


@asynccontextmanager
async def lifespan(_app):
    if not (VIEWER / "models" / "tesla-app").is_dir():
        print("note: the 3D viewer's car models aren't installed (python3 -m lightshow.tesla_app_models "
              "<Tesla app bundle>); builds and downloads work without them", file=sys.stderr)
    QUEUE.start()
    yield


app = FastAPI(title="Carreography", lifespan=lifespan)


@app.middleware("http")
async def reject_huge_uploads(request: Request, call_next):
    """Turn away an oversized upload from its Content-Length header, before reading all of it."""
    size = int(request.headers.get("content-length") or 0)
    if request.method == "POST" and size > (MAX_UPLOAD_MB + 1) * 1e6:
        return JSONResponse({"detail": too_big()}, status_code=413)
    return await call_next(request)


def too_big():
    return f"That file is too big: the limit is {MAX_UPLOAD_MB:g} MB."


# --- checking an upload ------------------------------------------------------------------------

def bad(message, status=400):
    return HTTPException(status_code=status, detail=message)


def number(text, what, low=0, high=None):
    """A form field as a number (blank = None), or a 400 that says what is wrong with it."""
    if not text.strip():
        return None
    try:
        value = float(text)
    except ValueError:
        raise bad(f"{what} must be a number of seconds (got {text!r}).")
    if value < low or (high is not None and value > high):
        raise bad(f"{what} must be between {low:g} and {high:g}." if high is not None else f"{what} can't be negative.")
    return value


def flag(text):
    return text.strip().lower() in ("1", "true", "on", "yes")


def audio_info(path):
    """The recording's length in seconds, from ffprobe; a 400 if it isn't audio ffmpeg can read."""
    try:
        run = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                             capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        raise bad("The server is missing ffprobe (part of ffmpeg).", 500)
    except subprocess.TimeoutExpired:
        raise bad("Reading that file took too long. Is it really an audio file?")
    try:
        info = json.loads(run.stdout)
        has_audio = any(s.get("codec_type") == "audio" for s in info["streams"])
        seconds = float(info["format"]["duration"])
    except (ValueError, KeyError):
        has_audio, seconds = False, 0
    if run.returncode != 0 or not has_audio or seconds <= 0:
        raise bad("That doesn't look like an audio file. Use an mp3, wav, flac, m4a, ogg or aac recording.")
    return seconds


@app.post("/api/jobs")
def create_job(song: UploadFile = File(...), name: str = Form(""), lineup: str = Form("Y"), start: str = Form(""),
               end: str = Form(""), stems: str = Form("false"), style: str = Form("none"),
               max_level: str = Form("3"), diagnostic: str = Form("false"), no_liftgate: str = Form("false")):
    """Check everything, keep the upload, queue the build. Returns {"id": ...}."""
    if QUEUE.is_full():
        raise bad("The queue is full. Please try again in a few minutes.", 429)
    try:
        lineup = vehicles.parse_lineup(lineup)
    except ValueError as e:
        raise bad(f"Lineup: {e}")
    ext = Path(song.filename or "").suffix.lower()
    if ext not in AUDIO_TYPES:
        raise bad("Use an mp3, wav, flac, m4a, ogg or aac recording (got " + (ext or "a file with no extension") + ").")
    show_name = jobs.slug(name or Path(song.filename).stem) or "my_show"
    if show_name == jobs.DIAGNOSTIC:
        raise bad(f"The name {jobs.DIAGNOSTIC} is reserved for the diagnostic show. Please pick another.")
    start, end = number(start, "Start"), number(end, "End")
    if style not in ("none", "legato"):
        raise bad("Style must be none or legato.")
    if max_level not in ("0", "1", "2", "3"):
        raise bad("Intensity must be 0, 1, 2 or 3.")

    job_id = jobs.new_id()
    folder = QUEUE.folder(job_id)
    folder.mkdir(parents=True)
    try:
        path = save_upload(song, folder / f"song{ext}")
        total = audio_info(path)
        length = (min(end, total) if end else total) - (start or 0)
        if length < MIN_SECONDS:
            raise bad(f"A show needs at least {MIN_SECONDS} seconds of music; this has {max(length, 0):.0f}. "
                      "Check the start and end you chose.")
        if length > MAX_MINUTES * 60:
            raise bad(f"That's {length / 60:.1f} minutes of music; the limit is {MAX_MINUTES}. Use Start and End to trim it.")
        job = jobs.Job(id=job_id, name=show_name, lineup=lineup, options={
            "start": start, "end": end, "stems": flag(stems), "style": style, "max_level": int(max_level),
            "diagnostic": flag(diagnostic), "no_liftgate": flag(no_liftgate)})
        QUEUE.submit(job)
    except jobs.QueueFull as e:
        shutil.rmtree(folder, ignore_errors=True)
        raise bad(str(e), 429)
    except BaseException:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    return {"id": job_id}


def save_upload(upload, dest):
    """Copy the upload to dest, giving up if it passes the size limit."""
    limit, size = int(MAX_UPLOAD_MB * 1e6), 0
    with open(dest, "wb") as out:
        while chunk := upload.file.read(1 << 20):
            size += len(chunk)
            if size > limit:
                raise bad(too_big(), 413)
            out.write(chunk)
    if size == 0:
        raise bad("That file is empty.")
    return dest


# --- a job's status ----------------------------------------------------------------------------

def place_words(place):
    """'CenterLeft' -> 'centre left'"""
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", place).replace("Center", "Centre").lower()


def lookup(job_id):
    """(job, queue place) for a job id, or a 404."""
    found = QUEUE.get(job_id) if jobs.ID.fullmatch(job_id) else None
    if not found:
        raise bad("No such job. Results are deleted after a while; please make the show again.", 404)
    return found


def finished_job(job_id):
    job, _ = lookup(job_id)
    if job.status != "done":
        raise bad("This show is not finished yet.", 409)
    return job


@app.get("/api/config")
def config():
    """What the page needs to know: the vehicles to choose from and the limits."""
    return {"vehicles": [{"letter": v.letter, "label": v.label} for v in vehicles.VEHICLES.values()],
            "max_cars": vehicles.MAX_CARS, "max_upload_mb": MAX_UPLOAD_MB, "max_minutes": MAX_MINUTES,
            "keep_hours": jobs.KEEP_HOURS}


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str):
    job, place = lookup(job_id)
    out = {"id": job.id, "name": job.name, "lineup": job.lineup, "status": job.status, "queue_position": place or None,
           "percent": job.percent, "step": job.step, "error": job.error, "created": job.created,
           "started": job.started or None, "finished": job.finished or None}
    if job.status == "done":
        out["download_url"] = f"/api/jobs/{job.id}/download"
        out["viewer_url"] = viewer_url(job.id, "show")
        if job.options.get("diagnostic"):
            out["diagnostic_viewer_url"] = viewer_url(job.id, "diagnostic")
        out["cars"] = [{"folder": folder, "number": i, "vehicle": v.label, "place": place_words(p),
                        "download_url": f"/api/jobs/{job.id}/download/{folder}"}
                       for i, (folder, v, p) in enumerate(vehicles.cars(job.lineup), 1)]
    return out


def viewer_url(job_id, sub):
    return f"/viewer/?manifest=/jobs/{job_id}/files/{sub}/shows.json"


# --- downloads ---------------------------------------------------------------------------------

def car_files(job, folder):
    """The files for one car's drive: the show's, then the diagnostic's if it was built."""
    out = []
    for sub in ("show", "diagnostic"):
        light = QUEUE.folder(job.id) / sub / "usb" / folder / "LightShow"
        out += sorted(light.glob("*")) if light.is_dir() else []
    return out


def send_zip(job, cars, filename, readme=None):
    """A zip of the given cars' LightShow folders. With one car, LightShow/ is at the zip's top (so it
    unpacks straight onto the drive); with several, each car has its own folder."""
    tmp = tempfile.NamedTemporaryFile(dir=QUEUE.folder(job.id), suffix=".zip", delete=False)
    with zipfile.ZipFile(tmp, "w") as z:
        if readme:
            z.writestr("README.txt", readme)
        for folder in cars:
            for f in car_files(job, folder):
                prefix = f"{folder}/" if len(cars) > 1 else ""
                kind = zipfile.ZIP_STORED if f.suffix == ".wav" else zipfile.ZIP_DEFLATED
                z.write(f, f"{prefix}LightShow/{f.name}", compress_type=kind)
    return FileResponse(tmp.name, media_type="application/zip", filename=filename,
                        background=BackgroundTask(os.unlink, tmp.name))


@app.get("/api/jobs/{job_id}/download")
def download_all(job_id: str):
    job = finished_job(job_id)
    cars = [folder for folder, _, _ in vehicles.cars(job.lineup)]
    return send_zip(job, cars, f"{job.name}_light_show.zip", readme_text(job))


@app.get("/api/jobs/{job_id}/download/{car}")
def download_car(job_id: str, car: str):
    job = finished_job(job_id)
    if car not in [folder for folder, _, _ in vehicles.cars(job.lineup)]:
        raise bad("This show has no such car.", 404)
    return send_zip(job, [car], f"{job.name}_{car}.zip")


def readme_text(job):
    cars = "\n".join(f"    {folder:<24} {v.label}, {place_words(p)}"
                     for folder, v, p in vehicles.cars(job.lineup))
    tip = ("\nTIP: run the diagnostic (00_diagnostic) first. It announces each test aloud, so you can check every car.\n"
           if job.options.get("diagnostic") else "")
    return f"""Tesla light show: {job.name}
Made {time.strftime("%Y-%m-%d", time.localtime(job.finished or time.time()))} with the Tesla light show generator.

WHAT IS IN THIS ZIP
One folder per car, in the order the crowd sees them, left to right:

{cars}

Each car's folder holds a LightShow folder: the show's .fseq (the lights) and .wav (the music){
    ", plus 00_diagnostic, a spoken test of every light and door." if job.options.get("diagnostic") else "."}
Each car needs its own drive with its own folder: the files are different for each model and place.

PUTTING A SHOW ON A DRIVE
1. Format a USB drive as exFAT (Disk Utility on a Mac, right-click > Format on Windows). This erases it.
2. Copy that car's LightShow folder to the very top of the drive, not inside another folder.
   The drive must not hold a TeslaCam folder.
3. Plug the drive into the car's USB port, with the car in Park.
4. On the car's screen, open Toybox > Light Show and pick the show.
{tip}
Use music you have the right to use.
"""


# --- the viewer's files ------------------------------------------------------------------------

@app.get("/jobs/{job_id}/files/{path:path}")
def job_file(job_id: str, path: str):
    """Read-only access to a finished job's show/ and diagnostic/ folders (the 3D viewer loads them)."""
    job = finished_job(job_id)
    root = QUEUE.folder(job.id).resolve()
    target = (root / path).resolve()
    if not target.is_file() or not any(target.is_relative_to(root / sub) for sub in ("show", "diagnostic")):
        raise bad("No such file.", 404)
    return FileResponse(target)


# --- pages -------------------------------------------------------------------------------------

if VIEWER.is_dir():
    app.mount("/viewer", StaticFiles(directory=VIEWER, html=True), name="viewer")
app.mount("/", StaticFiles(directory=STATIC, html=True), name="site")


def main():
    import uvicorn
    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")))


if __name__ == "__main__":
    main()
