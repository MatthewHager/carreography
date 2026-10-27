# Contributing

Thanks for helping. This project turns songs into Tesla light shows. Most contributions fall into
one of these:

- **A new move**: a new way for the lineup to play the music.
- **Better listening**: beat tracking, transcription, form detection.
- **A new vehicle**: Model 3, S, X, and so on.
- **Car test reports**: what the diagnostic show actually did on your car. Especially wanted for
  the 2025+ Model Y and any car not yet supported.
- **The web app and the 3D preview.**

Read [docs/CHOREOGRAPHY.md](docs/CHOREOGRAPHY.md) first. It explains how the pieces fit and the rules
every show keeps. If you work with a coding agent, [AGENTS.md](AGENTS.md) is written for it.

## Setup

```bash
./setup.sh                                   # Python 3.12 environments (.venv312, .venv_beats) + Tesla's files
.venv312/bin/python -m pytest                # the tests (about 20 s)
.venv312/bin/python -m pyflakes build.py make_usb.py lightshow tools tests webapp
```

You need uv, ffmpeg and git (`brew install uv ffmpeg` on a Mac). For the 3D preview you also need
Node.js 22 (`cd preview3d && npm install && npm run build`). For the diagnostic's voice you need
macOS's `say` or `espeak-ng`.

**Never commit recordings.** `songs/` is ignored. Use your own music locally. The tests make their
own synthetic song.

## The development loop

1. **Build a song** with your change:
   `python3 build.py --song ~/Music/song.mp3 --lineup YCY --out /tmp/try`. It takes a few minutes the
   first time. The analysis is cached next to the audio, so rebuilding after a choreography change is
   quick.
2. **Watch it.** Serve the repo with `python3 -m http.server 8765` and open
   `http://localhost:8765/preview3d/dist/?manifest=/<path to try>/shows.json` (the manifest must be
   inside the served folder: use `--out cache/try` and the URL `?manifest=/cache/try/shows.json`).
   Add `&labels=1` to label each car and `&t=60` to start at 60 s.
3. **Check it** with the tools ([tools/README.md](tools/README.md)):
   - `tools/closure_audit.py --summary <fseq files>` for the motor rules;
   - `tools/feel.py <show>` for how clearly the lights pulse on the beat;
   - `tools/quantize_check.py <show>` for how many hits land on notes and beats;
   - `tools/move_lab.py <show> <move>` to play one move alone on a song's analysis.

   These tools read a show in `output/<name>/`, so build it there (`build.py --song ... --name x`)
   rather than with `--out`.
4. **Run the tests.**

### Did I change the shows?

Choreography changes are meant to change shows. Changes to infrastructure (refactors, the web app,
the preview, new vehicles) should leave existing shows byte-identical. To check:

- Build a song before and after your change and compare the `.fseq` files with `cmp`. The FSEQ
  writer is deterministic, so identical input gives identical bytes.
- `tests/test_diagnostic.py` pins the classic lineup's diagnostic wording, because its recorded voice
  track sets every cue's timing.

## Adding a move

1. **Write it** in `lightshow/moves.py` as a function `my_move(cars, an, ph)`.
   - `cars` is the lineup, crowd-left to right (`choreo.Car` objects); `an` is the analysis; `ph` is
     the phrase (`ph.t0`, `ph.t1`, `ph.a`/`ph.b` index its notes in `an.events`).
   - Light lamps with the `Car` methods: `car.flash(car.heads("L"), t, 0.12)`,
     `car.light(car.accents(), t0, t1)`, `car.pixels(C.FRONT_BAR, t, values)` (truck bar, 0–1 per
     LED, crowd-left to right).
   - Use `sides(cars)` and `centre_truck(cars)` (which may be `None`) for the two roles. Never
     assume three cars.
   - Take times from the music: `an.events.t`, `an.beats`, `an.downbeats`, `_grid(an, ph, ...)`,
     `_beat_at(an, t)`. Never use a fixed tempo.
   - Follow the design notes in [docs/CHOREOGRAPHY.md](docs/CHOREOGRAPHY.md#designing-a-new-move).
2. **Catalogue it** in `lightshow/catalog.py`:
   ```python
   "my_move": Move("one line: what the crowd sees", ("groove", "drive"), ("figuration",), "beat"),
   ```
   The fields are moods, the phrase gestures it fits, what it locks to (`note`, `beat`, `bar`,
   `build`, `self`), and `collab=False` if the cars don't pass anything between them. That's enough
   for the choreographer to choose it: `choreo.py` calls `moves.my_move(cars, an, ph)` by name. If
   it needs extra arguments, add it to `special` in `choreo._play_phrases`.
3. **Classify it** (optional) in the sets at the top of `choreo.py`'s choreographer section:
   - `BEAT_MOVES` makes it need a clear beat;
   - `CALM` allows it in calm passages;
   - `QUIET`/`STRONG` say how much of the stage it lights;
   - `BIG` gives it a breath of black before it.
4. **Try it alone**: `.venv312/bin/python tools/move_lab.py <show> my_move` shows how its hits sit on
   the beat and notes. Then build a song and watch it in the preview, in at least a one-car, the
   classic three-car and a five-car lineup.
5. **Test.** `tests/test_catalog.py` checks the catalogue entry and the function agree;
   `tests/test_choreography.py` runs the choreographer across lineups. Run `build.py` once more so
   `MOVES.md` regenerates, and commit it.

A split move (side cars and centrepiece doing different things) is two functions, one for each
role, added to `sides`/`centre` in `choreo._play_phrases` and to `catalog.SPLIT`.

## Adding a vehicle

Tesla's channel map is the same for every car, but which lamps exist, which channels share an
output, and what the motors do differ. To add, say, a Model 3:

1. **`lightshow/vehicles.py`**: a new letter (e.g. `3`) with its kind, folder name, label, and the
   viewer body.
2. **`lightshow/choreo.py` `Car`**: the lamp groups (`sig`, `drl`, `accents`, `markers`, `rear`...)
   for the new kind. These are what every move uses. Keep the eight-lamp `lamps()` line if the car
   has the lamps for it.
3. **`lightshow/lamps.py`**: if the car's hardware differs from the channel names (like the 2025+
   Model Y, whose bar is driven by channels 4 and 6), translate the frames at the end, as
   `juniper_output` does.
4. **`lightshow/motors.py`**: travel times (`LIFTGATE_OPEN_S`) and anything the car lacks. A Model 3
   has a trunk, not a liftgate; check the channel's behaviour.
5. **`lightshow/diagnostic.py`**: the wording for the new car (what it lacks, its lid's name).
6. **The 3D preview**: a profile in `preview3d/src/core/vehicles.ts`, and the car's Tesla app model in
   `preview3d/src/car/appBody.ts` (its id in `lightshow/tesla_app_models.py`, and rules mapping its
   lamp meshes to channels and its animation clips to closures). Only Tesla's official models.
7. **Tests**: add the letter to the lineup lists in `tests/`.
8. **A test report**: run the diagnostic on the real car, then fill in what each lamp channel did.

Tesla's own documentation is in `vendor/light-show/README.md` after setup. The community's
findings for the 2025+ Model Y are summarised in
[docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md#the-2025-model-ys-lamps).

## Car test reports

The most useful thing you can do with a car is to run the diagnostic and write down what happened.
Make one with `python3 build.py --diagnostic --lineup <your cars> --out diag` (or tick the box in the
web app). Put it on the car, play it, and open an issue with the **Car test report** template:

- your car and year;
- what each announced lamp channel lit;
- whether bar test A or B lit the bar;
- how long the liftgate or frunk took to open and close;
- anything that didn't move.

## Pull requests

- Keep a PR to one thing (one move, one fix).
- Tests and pyflakes must pass. CI runs them on every push, without the machine-learning stack; run
  the full suite locally.
- Say what you watched in the preview, and on which lineups.
- Match the surrounding code:
  - plain-English docstrings that say what something does for the audience or the user;
  - lines up to about 110 columns;
  - the crowd's left and right, never the vehicle's.
- If your change alters shows on purpose, say so. If it shouldn't, check it doesn't (see above).

## Licence

The project is AGPL-3.0 (see [LICENSE](LICENSE)); contributions are accepted under the same licence.
Don't add files you don't have the right to share: no commercial recordings, and none of Tesla's
models or files (the validator is fetched at setup; the car models are extracted from the Tesla
app). The preview draws only Tesla's official models: don't add hand-built or approximated cars.
