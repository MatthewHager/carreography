# Notes for coding agents

Carreography turns a song into synchronized Tesla light shows (FSEQ files) for a lineup of 1–5 cars, in
the browser. The repository is the app (Vite, React, TypeScript, shadcn/ui, three.js, ONNX Runtime Web),
hosted on GitHub Pages. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md). This file is the short version.

## Commands

```bash
npm install                           # once
npm run dev                           # http://localhost:5173/carreography/ (npm run dev -- --port N if 5173 is taken)
npx vitest run                        # the tests
npx tsc -b && npx oxlint src          # type check and lint
npm run build                         # the site, in dist/
npm run review -- SONG --lineup YCY   # the show for a song, drawn and summed up (tools/review/README.md)
gh release download models --dir public/models --pattern "*.onnx"      # the listening models
gh release download car-models --dir public/models/tesla-app           # Tesla's car models
```

## Where things are

- `src/engine/`: the choreographer.
  - `vehicles.ts`: the lineup letters (`S`, `M`, `m`, `X`, `Y`, `y`, `B`, `L`, `C`), folder names and
    places.
  - `car.ts`: `Car` (one car's frames, the lamp groups, crowd-side flipping, closure command counting).
  - `choreo.ts`: `choreograph()` (the pipeline: the layers in order), the passages and the move each plays.
  - `level.ts`: one level per frame from the loudness, its top kept for the peak; every layer sizes by it.
  - `bed.ts` (steady lamps, the trucks' bars, the cabins' colour), `moves.ts` (every move as
    `(cars, an, ph) => void`, sized by the level, the `MOVES` table, `centreTruck`, `sides`, `slotFor`),
    `catalog.ts` (the catalogue; `MOVES.md` is generated from it), `drums.ts` (kick, snare, hats),
    `pulse.ts` (the beat, builds and drops), `motors.ts` (closures), `legato.ts` (music with no beat),
    `lyrics.ts` (lyric moments), `lamps.ts` (2025+ Model Y output), `channels.ts` (Tesla's channel map and
    limits).
  - `feel.ts` (flow or beat, kit), `texture.ts`, `form.ts`, `phrases.ts`, `tempo.ts`: reading
    the music.
- `src/engine/listen/`: decoding helpers, resampling, the librosa subset (`dsp.ts`, `cqt.ts`),
  `audio.ts` (the analysis), `visual.ts` (loudness, bands, the drum voices, harmony, novelty, kit, beat
  confidence), beat-this and basic-pitch (`beats.ts`, `notes.ts`) on the backend `infer.ts` picks,
  `tags.ts`, `lrclib.ts`, `align.ts`.
- `src/app/`: the page (`App.tsx` is in `src/`), the show worker (`show.worker.ts`), `pipeline.ts`,
  the WAV and the ZIP.
- `src/viewer/`: the 3D preview, AGPL code adapted from Tesla Lightshow Studio. The cars are Tesla's
  own models from the Tesla app only (`car/appBody.ts`, served from the `car-models` release). Don't add
  hand-built or approximated car models.
- `src/components/ui/`: shadcn/ui as the CLI writes it. Don't edit; theme in `src/index.css`.
- `tools/export_models.py`, `tools/export_car_models.py`: make the two releases (`uv run`).
- `tools/review/`: the show review tool (pictures, a summary with the ARC table, a film of the preview).

## Invariants (don't break these)

- **Crowd's left and right everywhere.** Car 1 is the crowd's left. Tesla's "L" channels are the
  vehicle's left, which is the crowd's right. `Car.veh()` flips them in every group method, and
  `Car.pixels` reverses the front bar. Use the group methods (`heads`, `accents`, `lamps`...); never
  write raw L/R channel numbers in a move.
- **Any lineup of 1–5 cars.** Never index `cars[1]` as the truck or assume two Model Ys. Use
  `centreTruck(cars)` (may be `null`) and `sides(cars)` from `moves.ts`.
- **Tesla's motor limits** (`CLOSURE_LIMITS` in `channels.ts`): liftgate 6, each window 6, each mirror
  20, charge port 3, a Model X's doors 6 each. Dance only once a lid is fully open; about 30 s of dancing
  per show. `Car.closure()` refuses commands past the limits, and `vehicles.test.ts` checks every letter.
- **Deterministic, byte-identical output.** The same input gives the same FSEQ: nothing random, no
  `Math.random()` or clock time in the engine (`choreo.test.ts` checks). Refactors must keep shows
  identical: make a song's show before and after with the review tool and compare the files.
- **Tests check rules, never a look.** Judge a look with the review tool's pictures and films.
- **Times come from the music** (`an.events`, `an.beats`, `an.downbeats`), never a fixed tempo. Lights
  lead the sound by one 20 ms frame (`LIGHT_LEAD_S` in `car.ts`).
- **Never commit:** recordings (`songs/`, or any audio), Tesla's files (`public/models/`), anything in
  `cache/`, `dist/`. `.gitignore` covers them; don't force-add.

## Adding things

- **A move:** a function in `moves.ts` sized by the level, its name in the `MOVES` table at the end of
  `moves.ts`, and an entry in `catalog.MOVES` (and `NOTE_MOVES` or `BEAT_MOVES`). Dispatch is by name.
  Details in CONTRIBUTING.md.
- **A car:** `vehicles.ts`, the `Car` lamp groups, `lamps.ts` if the hardware differs, `motors.ts`
  travel times, the viewer profile (`viewer/core/vehicles.ts`) and app model (`viewer/car/appBody.ts`,
  `tools/export_car_models.py`). Details in CONTRIBUTING.md.

## Style

Match the code around you:
- docstrings say what the audience or user experiences;
- comments are sparse and explain why;
- lines are up to about 110 columns;
- no new npm dependencies without a good reason.

The docs use plain sentences, and tables for reference.
