"""Jobs: one uploaded song in, one set of show files out.

Each job lives in its own folder, <jobs dir>/<id>/:

    song.<ext>      the upload
    job.json        the job's state (so a restart doesn't lose finished jobs)
    show/           what `build.py --song ... --out show` wrote (shows.json, usb/<car>/LightShow/, ...)
    diagnostic/     the same for `build.py --diagnostic`, if it was asked for

A single worker thread builds one job at a time, oldest first: a build uses all the machine's cores
and a lot of memory, so running two at once would only make both slower. The worker reads the
"PROGRESS <percent> <step>" lines build.py prints and keeps them on the job for the page to show.
"""

import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import build                                    # noqa: E402  (the one build command; safe to import)
import make_usb                                 # noqa: E402  (for its check_fseq)
from lightshow import vehicles                  # noqa: E402

JOBS_DIR = Path(os.environ.get("LIGHTSHOW_JOBS_DIR") or ROOT / "webapp" / "jobs").resolve()
MAX_QUEUED = int(os.environ.get("LIGHTSHOW_MAX_QUEUED", "20"))
KEEP_HOURS = float(os.environ.get("LIGHTSHOW_KEEP_HOURS", "24"))
BUILD_TIMEOUT_MIN = float(os.environ.get("LIGHTSHOW_BUILD_TIMEOUT_MIN", "60"))

PROGRESS = re.compile(r"PROGRESS (\d+) (.*)")
DIAGNOSTIC = "00_diagnostic"                    # the name build.py gives the test show
DIAGNOSTIC_SHARE = 8                            # percent of the progress bar the quick diagnostic gets
ID = re.compile(r"[0-9a-f]{24}")


class QueueFull(Exception):
    pass


class BuildFailed(Exception):
    """A build went wrong; the message is for the person who uploaded the song."""


@dataclass
class Job:
    id: str
    name: str               # the show's name; also its file names on the USB drive
    lineup: str             # e.g. "YC"
    options: dict           # start, end, stems, style, max_level, diagnostic, no_liftgate
    status: str = "queued"  # queued, running, done or failed
    percent: int = 0
    step: str = "waiting in the queue"
    error: str = ""
    created: float = 0.0
    started: float = 0.0
    finished: float = 0.0


def slug(name):
    """A show name that is safe in file names: lower case letters, digits and underscores."""
    return build.slug(name)[:40].strip("_")


def new_id():
    return secrets.token_hex(12)


def check_output(job, folder):
    """A last look at what was built: every car has its .fseq and .wav, and the .fseq passes the
    header checks Tesla's validator makes (make_usb.check_fseq). Returns a list of problems."""
    problems = []
    builds = [("show", job.name)] + ([("diagnostic", DIAGNOSTIC)] if job.options.get("diagnostic") else [])
    for sub, name in builds:
        for car, _, _ in vehicles.cars(job.lineup):
            light = folder / sub / "usb" / car / "LightShow"
            for ext in (".fseq", ".wav"):
                if not (light / (name + ext)).is_file():
                    problems.append(f"{sub}: {car}/{name}{ext} was not built")
            if (light / (name + ".fseq")).is_file():
                problems += [f"{sub}: {car}: {p}" for p in make_usb.check_fseq(light / (name + ".fseq"))]
    return problems


class JobQueue:
    def __init__(self, root=JOBS_DIR, max_queued=MAX_QUEUED):
        self.root = root
        self.max_queued = max_queued
        self.jobs = {}
        self.waiting = deque()              # ids of the queued jobs, next one first
        self.cond = threading.Condition()   # guards jobs and waiting; the worker sleeps on it
        root.mkdir(parents=True, exist_ok=True)

    # --- bookkeeping ---------------------------------------------------------------------------

    def folder(self, job_id):
        return self.root / job_id

    def save(self, job):
        """Write the job's state next to its files (called with the lock held or before sharing)."""
        path = self.folder(job.id) / "job.json"
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(asdict(job), indent=2))
        os.replace(tmp, path)

    def load(self):
        """Pick up the jobs on disk. A job that was running when the server stopped can't be resumed;
        one that was still waiting just goes back in the queue."""
        found = []
        for path in self.root.glob("*/job.json"):
            try:
                found.append(Job(**json.loads(path.read_text())))
            except (OSError, ValueError, TypeError):
                continue
        with self.cond:
            for job in sorted(found, key=lambda j: j.created):
                if job.status == "running":
                    job.status, job.error = "failed", "The server restarted while this was building. Please try again."
                    job.finished = time.time()
                    self.save(job)
                self.jobs[job.id] = job
                if job.status == "queued":
                    self.waiting.append(job.id)
            self.cond.notify()

    def submit(self, job):
        """Queue a job whose folder and upload are already in place. Raises QueueFull."""
        with self.cond:
            if len(self.waiting) >= self.max_queued:
                raise QueueFull("The queue is full. Please try again in a few minutes.")
            job.created = time.time()
            self.save(job)
            self.jobs[job.id] = job
            self.waiting.append(job.id)
            self.cond.notify()

    def is_full(self):
        with self.cond:
            return len(self.waiting) >= self.max_queued

    def get(self, job_id):
        """(a copy of the job, its place in the queue: 1 = next up, or 0 if not waiting), or None."""
        with self.cond:
            job = self.jobs.get(job_id)
            if not job:
                return None
            place = list(self.waiting).index(job_id) + 1 if job_id in self.waiting else 0
            return Job(**asdict(job)), place

    def update(self, job, **fields):
        with self.cond:
            for key, value in fields.items():
                setattr(job, key, value)
            self.save(job)

    # --- the worker ----------------------------------------------------------------------------

    def start(self):
        self.load()
        threading.Thread(target=self.work, name="job-worker", daemon=True).start()
        threading.Thread(target=self.sweep, name="job-cleanup", daemon=True).start()

    def work(self):
        while True:
            with self.cond:
                while not self.waiting:
                    self.cond.wait()
                job = self.jobs[self.waiting.popleft()]
            self.update(job, status="running", started=time.time(), step="starting")
            try:
                self.build(job)
                self.update(job, status="done", percent=100, step="done", finished=time.time())
            except BuildFailed as e:
                self.update(job, status="failed", error=str(e), finished=time.time())
            except Exception as e:                          # a bug of ours: still tell the person something
                self.update(job, status="failed", error=f"Something went wrong inside the server: {e}",
                            finished=time.time())

    def build(self, job):
        """Run build.py for the song, then for the diagnostic if asked, then check the results."""
        folder = self.folder(job.id)
        opts = job.options
        song = next(folder.glob("song.*"))
        args = ["--song", str(song), "--name", job.name]
        for flag, key in (("--start", "start"), ("--end", "end"), ("--max-level", "max_level"), ("--style", "style")):
            if opts.get(key) not in (None, "", "none"):
                args += [flag, str(opts[key])]
        if opts.get("stems"):
            args.append("--stems")
        if opts.get("no_liftgate"):
            args.append("--no-liftgate")
        song_share = 100 - DIAGNOSTIC_SHARE if opts.get("diagnostic") else 100
        self.run_build(job, args, folder / "show", "", 0, song_share)
        if opts.get("diagnostic"):
            extra = ["--no-liftgate"] if opts.get("no_liftgate") else []
            self.run_build(job, ["--diagnostic", *extra], folder / "diagnostic", "Diagnostic show: ", song_share, 100)
        problems = check_output(job, folder)
        if problems:
            raise BuildFailed("The shows did not pass the final check:\n" + "\n".join(problems))

    def run_build(self, job, args, out, label, lo, hi):
        """One build.py run. Its progress (0-100) is spread over the bar from lo to hi percent."""
        cmd = [sys.executable, str(ROOT / "build.py"), *args, "--lineup", job.lineup, "--out", str(out)]
        tail = deque(maxlen=12)
        proc = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                start_new_session=True)
        timed_out = []

        def stop():
            timed_out.append(True)
            os.killpg(proc.pid, signal.SIGKILL)             # build.py and the analysis process under it

        timer = threading.Timer(BUILD_TIMEOUT_MIN * 60, stop)
        timer.start()
        for line in proc.stdout:
            m = PROGRESS.match(line)
            if m:
                self.update(job, percent=min(99, lo + int(m[1]) * (hi - lo) // 100), step=label + m[2])
            elif line.strip():
                tail.append(line.rstrip())
        code = proc.wait()
        timer.cancel()
        if timed_out:
            raise BuildFailed(f"The build took longer than {BUILD_TIMEOUT_MIN:g} minutes and was stopped.")
        if code != 0:
            raise BuildFailed(failure_text(out / "build.log", tail))

    # --- cleanup -------------------------------------------------------------------------------

    def sweep(self, every=600):
        while True:
            self.delete_old()
            time.sleep(every)

    def delete_old(self, keep_hours=None):
        """Delete the folders of jobs finished more than KEEP_HOURS ago (and strays older than that)."""
        cutoff = time.time() - (KEEP_HOURS if keep_hours is None else keep_hours) * 3600
        for path in self.root.iterdir():
            if not path.is_dir():
                continue
            with self.cond:
                job = self.jobs.get(path.name)
                if job and job.status in ("queued", "running"):
                    continue
                age_from = (job.finished or job.created) if job else path.stat().st_mtime
                if age_from < cutoff:
                    self.jobs.pop(path.name, None)
                    shutil.rmtree(path, ignore_errors=True)


def failure_text(log, tail):
    """What went wrong, for the page: the end of the build's own log, else of what it printed."""
    try:
        lines = [ln for ln in log.read_text(errors="replace").splitlines() if ln.strip()]
    except OSError:
        lines = []
    summary = [ln[len("FAILED: "):] for ln in lines if ln.startswith("FAILED: ")]   # build.py's one-liner
    if summary:
        return f"The build failed: {summary[-1]}"
    return "\n".join(lines[-12:] or tail) or "The build failed without saying why."
