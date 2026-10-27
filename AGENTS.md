# Notes for coding agents

This repo turns songs into synchronized Tesla light shows (FSEQ files) for a lineup of 1–5 cars.
Humans: see [CONTRIBUTING.md](CONTRIBUTING.md). This file is the short version for an agent.

## Commands

```bash
./setup.sh                                                  # once: .venv312 (analysis), .venv_beats, vendor/
.venv312/bin/python -m pytest                               # all tests, ~20 s
.venv312/bin/python -m pyflakes build.py make_usb.py lightshow tools tests webapp
python3 build.py --song FILE --lineup YCY --out DIR         # build one song (any Python; hands off to .venv312)
python3 build.py --diagnostic --lineup YC --out DIR         # the voiced test show
.venv312/bin/python -m webapp                               # the web app on :8000 (needs requirements-web.txt)
cd preview3d && npm run build                               # rebuild the 3D preview into dist/ (commit dist/)
```

To look at a show, serve the repo (`python3 -m http.server 8765`) and open
`/preview3d/dist/?manifest=/<dir inside the repo>/shows.json&labels=1`.

## Where things are

- `lightshow/vehicles.py`: lineup letters (`Y` 2025+ Model Y, `y` 2020–24 Model Y, `C`
  Cybertruck), folder names, places. Has no dependencies.
- `lightshow/choreo.py`:
  - `Car` (lamp groups, crowd-side flipping, closure command counting);
  - `choreograph()` (the pipeline);
  - the move chooser (`_choose_plan`, `_formations_*`);
  - the dispatch (`_play_phrases`).
- `lightshow/moves.py`: every move, as `name(cars, an, ph)`, plus the role helpers `centre_truck` and
  `sides`, and `slot_for` (pitch to a place on the stage).
- `lightshow/catalog.py`: the move catalogue (`UNISON`, `SPLIT`); it generates MOVES.md.
- `lightshow/pulse.py` (beat layer), `motors.py` (closures), `legato.py` (no-beat style),
  `cues.py`/`lyrics.py` (per-song moments), `lamps.py` (2025+ Model Y output),
  `diagnostic.py` (test show).
- `lightshow/audio.py`, `tempo.py`, `form.py`, `phrases.py`, `texture.py`, `mood.py`: the listening
  side.
- `build.py` is the CLI. `webapp/` wraps it (FastAPI, one job at a time). `make_usb.py` is
  macOS-only drive making.
- `preview3d/`: TypeScript + three.js. AGPL code adapted from Tesla Lightshow Studio. The cars are
  Tesla's own models from the Tesla app only (`car/appBody.ts`; extracted with
  `lightshow/tesla_app_models.py`, never committed). Don't add hand-built or approximated car models.

## Invariants (don't break these)

- **Crowd's left and right everywhere.** Car 1 is the crowd's left. Tesla's "L" channels are the
  vehicle's left, which is the crowd's right. `Car._veh()` flips them, and `Car.pixels` reverses the
  front bar. Use the group methods; never write raw L/R channel numbers in a move.
- **Any lineup of 1–5 cars.** Never index `cars[1]` as the truck or assume two Model Ys. Use
  `M.centre_truck(cars)` (may be `None`) and `M.sides(cars)`.
- **Tesla's motor limits** (`channels.CLOSURE_LIMITS`): liftgate 6, each window 6, each mirror 20,
  port 3. Dance only once a lid is fully open; about 30 s of dancing per show. `Car.closure()`
  enforces the counts, and `tools/closure_audit.py` checks the rest.
- **Deterministic output.** The same input gives byte-identical FSEQ, so don't use unseeded
  randomness or wall-clock time in choreography. Refactors must keep shows identical: build a song
  before and after and compare with `cmp`.
- **The classic diagnostic's wording is pinned**
  (`tests/test_diagnostic.py::test_classic_voice_track_is_unchanged`). Changing a YCY announcement
  re-records the voice and shifts every cue.
- **Times come from the music** (`an.events`, `an.beats`, `an.downbeats`). Lights lead the sound by
  one 20 ms frame (`LIGHT_LEAD_S`).
- **Don't commit:** recordings (`songs/`), Tesla's files (`vendor/`, `preview3d/*/models/`), build
  caches (`output/**/*.wav|json|pkl|npy`, `usb/`, `cache/`, `webapp/jobs/`). `.gitignore` covers
  them; don't force-add.

## Adding things

- **A move:** write a function in `moves.py`, add a `Move(...)` entry to `catalog.UNISON`, and
  that's it. Dispatch is by name. `tests/test_catalog.py` checks they agree. Details are in
  CONTRIBUTING.md.
- **A vehicle:** `vehicles.py`, the `Car` lamp groups, `lamps.py` if the hardware differs,
  `motors.py` travel times, the diagnostic wording, the viewer profile. Details are in
  CONTRIBUTING.md.
- **A per-song moment:** `cues.CUES[name]` (detectors like `loudest_last_quarter`, `t=SECONDS`) and
  `lyrics.py`.

## Style

Match the code around you:
- docstrings say what the audience or user experiences;
- comments are sparse and explain why;
- lines are up to about 110 columns;
- numpy for frame work;
- no new dependencies without a good reason (the analysis environment is already ~3 GB).

The docs use plain sentences, and tables for reference.
