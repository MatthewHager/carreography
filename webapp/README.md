# The web app

Upload a song, pick the cars, wait, and download the light show files for each car's USB drive, with a
link to watch the result in the 3D viewer. It wraps `build.py`: nothing here does any analysis itself.

## Run it locally

You need what `./setup.sh` installs (the analysis environment, `.venv312`), plus ffmpeg (ffprobe checks the
uploads) and the web app's three packages:

    uv pip install --python .venv312/bin/python -r requirements-web.txt
    .venv312/bin/python -m webapp          # from the repo root; python3 webapp/server.py works too

Then open <http://localhost:8000>. The first start fetches Tesla's car models for the 3D viewer
(`lightshow/tesla_files.py`; needs git and the network). The diagnostic show needs `say` (macOS) or
`espeak-ng`.

The server can run in any Python that has `requirements-web.txt`; the build itself runs in the Python named
by `$LIGHTSHOW_PYTHON` (default `.venv312/bin/python`), as it does when you run `build.py` by hand.

## Settings (environment variables)

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `8000` | Port to listen on. |
| `HOST` | `127.0.0.1` | Address to listen on. Use `0.0.0.0` to be reachable from other machines (the Docker image does). |
| `LIGHTSHOW_JOBS_DIR` | `webapp/jobs/` | Where uploads and results are kept (git-ignored). |
| `LIGHTSHOW_MAX_UPLOAD_MB` | `60` | Largest upload accepted. |
| `LIGHTSHOW_MAX_QUEUED` | `20` | Songs allowed to wait; more get HTTP 429. |
| `LIGHTSHOW_KEEP_HOURS` | `24` | Job folders older than this are deleted (checked every 10 minutes). |
| `LIGHTSHOW_BUILD_TIMEOUT_MIN` | `60` | A build running longer than this is stopped and the job fails. |
| `LIGHTSHOW_PYTHON`, `LIGHTSHOW_BEATS_PYTHON` | the `.venv*` environments | The analysis and beat-tracker Pythons (see `build.py`). |

## Docker

    docker build -t lightshow .
    docker run -p 8000:8000 -v lightshow-data:/data -v lightshow-cache:/home/app/.cache lightshow

The image has ffmpeg, espeak-ng and git, the two Python environments (`/opt/analysis`, and `/opt/beats` for
the beat tracker, which needs its own torch), Tesla's light-show repo and the viewer's car models. The cache
volume keeps the stem-separation, lyrics and beat models (a few hundred MB, downloaded on the first build)
between runs. The `Dockerfile` has not been built by its author yet (no Docker on the machine it was
written on), so expect to fix a thing or two.

## How a job flows

1. `POST /api/jobs` (multipart: `song` plus `name`, `lineup`, `start`, `end`, `stems`, `style`, `max_level`,
   `diagnostic`, `no_liftgate`) checks everything (lineup, file type, size, length with ffprobe, name) and
   answers `{"id": ...}`, or a 4xx with a `detail` message for people. The job gets a folder, `<jobs dir>/<id>/`,
   holding the upload, `job.json` (its state), and the builds' output.
2. A single worker thread builds one job at a time, oldest first: `build.py --song ... --out <job>/show`, then,
   if asked, `build.py --diagnostic --out <job>/diagnostic`. It reads build.py's `PROGRESS <percent> <step>`
   lines, so `GET /api/jobs/<id>` reports `status` (`queued`, `running`, `done`, `failed`), `queue_position`,
   `percent` and `step`; on failure `error` has the end of the build log. The page polls this every 2 seconds
   and keeps the id in the address (`?job=<id>`), so reloading resumes.
3. When the build is done, every car's `.fseq` is checked with `make_usb.check_fseq`, then the status
   becomes `done`.
4. Downloads: `/api/jobs/<id>/download` is a zip with a folder per car (each holding `LightShow/`) and a
   `README.txt`; `/api/jobs/<id>/download/<car folder>` is one car's `LightShow/` folder.
   `/jobs/<id>/files/{show,diagnostic}/...` serves the build's files read-only (that is what the 3D viewer
   loads: `/viewer/?manifest=/jobs/<id>/files/show/shows.json`).
5. Job folders are deleted `LIGHTSHOW_KEEP_HOURS` after the job finished. Job state survives a restart; a job
   that was running at the time is marked failed, and jobs that were still waiting go back in the queue.

## Limits, and what this is not

- One build at a time. A three-minute song takes several minutes (stem separation and note transcription
  are the slow parts); a queue of 20 can mean a long wait.
- Shows up to 10 minutes (after trimming) and at least 10 seconds; uploads up to 60 MB by default.
- No accounts and no rate limiting: a job's id (random, 96 bits) is the only thing protecting its files. If you
  put this on the public internet, put it behind something that limits requests (a reverse proxy), and serve
  it at the root of its domain: the page and viewer links are root-relative.
- Whoever uploads must have the right to use the music; the page says so.
