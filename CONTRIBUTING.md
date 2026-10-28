# Contributing

Thanks for helping. Most contributions are one of these: a new move, a new car, better listening, a fix
to the page or the 3D preview, or a report of how a show played on your car. Read
[How it works](docs/HOW_IT_WORKS.md) first; if you work with a coding agent, [AGENTS.md](AGENTS.md) is
written for it.

## Develop

The repository is the app: Vite, React and TypeScript, with shadcn/ui and three.js. You need Node.js 24.

```bash
cd app
npm install
npm run dev          # http://localhost:5173/carreography/
npx vitest run       # the tests
npx tsc -b           # the type check
npx oxlint src       # lint
npm run build        # the site, in dist/
```

The listening models and Tesla's car models aren't in the repository. Download them from the releases
once (with the [GitHub CLI](https://cli.github.com/)), as the site build does:

```bash
gh release download models --dir public/models --pattern "*.onnx"
gh release download car-models --dir public/models/tesla-app
```

**Never commit recordings, Tesla's files or anything in `cache/`.** Keep songs for trying shows in
`songs/`, which git ignores. The tests make up their own signals and lyrics.

## Where things are

| Folder | What |
|---|---|
| `src/engine/` | The choreographer: no DOM, runs in a worker, and in Node for the tests. A port of the Python generator, module for module: `choreo.ts` (the pipeline and the move chooser), `moves.ts` (every move), `catalog.ts` (the move catalogue), `car.ts` (one car's frames and lamp groups), `vehicles.ts` (the lineup letters), `pulse.ts` (the beat layer), `motors.ts` (the closures), `lamps.ts` (the 2025+ Model Y), `legato.ts`, `cues.ts`, `lyrics.ts`, and the reading of the music (`texture.ts`, `form.ts`, `phrases.ts`, `mood.ts`, `tempo.ts`, `arc.ts`). |
| `src/engine/listen/` | The listening: decoding helpers and resampling, the librosa subset, beat-this and basic-pitch on ONNX Runtime Web (`infer.ts` picks the backend), song tags, LRCLIB and lyric alignment. |
| `src/viewer/` | The 3D preview (three.js), adapted from Tesla Lightshow Studio (AGPL-3.0): `core/` reads, writes and simulates show files, `car/appBody.ts` draws Tesla's app models. |
| `src/app/` | The page: the 3D stage, the panels, the worker that makes a show (`show.worker.ts`), the WAV and the ZIP. |
| `src/components/ui/` | shadcn/ui components, as the shadcn CLI writes them. Don't edit them; restyle through the theme in `src/index.css`. |
| `tools/` | The two scripts that make the releases (below). |
| `MOVES.md` | The move catalogue, generated from `catalog.ts`. |

## The bridge test

The engine is a faithful port of the Python choreographer (tag `python-final`), and
`src/engine/bridge.test.ts` proves it: it choreographs 24 shows (12 songs, some in several lineups)
from the Python version's own analyses and compares every car's frames with the Python version's, byte
for byte. `vehicles.test.ts` uses the same analyses to check every car letter against Tesla's motor
limits.

The analyses and frames live in `cache/bridge/`, made by `tools/export_bridge.py` at `python-final`. They
describe copyrighted recordings, so they stay on the machines that have them and out of the repository.
Without `cache/bridge/` both tests are skipped, as they are in CI; everything else runs. With it, the dev
server can also choreograph a song from its Python analysis:
`http://localhost:5173/carreography/?bridge=02_this_is_halloween`.

Refactors must keep the bridge test passing: the same input gives byte-identical shows. If you have the
cache, run it before and after; if you don't, say so in the pull request.

## Adding a move

1. **Write it** in `src/engine/moves.ts` as a function `(cars, an, ph) => void`.
   - `cars` is the lineup, crowd-left to right (`Car` objects); `an` is the analysis; `ph` is the phrase
     (`ph.t0`, `ph.t1`, and `ph.a` to `ph.b`, its notes in `an.events`).
   - Light lamps with the `Car` methods: `car.flash(car.heads('L'), t, 0.12)`,
     `car.light(car.accents(), t0, t1)`, `car.pixels(C.FRONT_BAR, t, values)` (a truck's bar, 0–1 per LED,
     crowd-left to right). They take the crowd's left and right.
   - Use `sides(cars)` and `centreTruck(cars)` (which may be `null`) for the two roles. Never assume
     three cars, and never take `cars[1]` as the truck.
   - Take times from the music: `an.events.t`, `an.beats`, `an.downbeats`, and the helpers in `moves.ts`.
     Never use a fixed tempo.
2. **Name it** in `BY_NAME` at the end of `moves.ts`, under the name the catalogue uses.
3. **Catalogue it** in `catalog.UNISON`: what the crowd sees, the moods, the phrase gestures it fits,
   what it locks to (`note`, `beat`, `bar`, `build`, `self`), and `false` last if the cars pass nothing
   between them. That's enough for the choreographer to choose it. If it needs extra arguments, add it to
   `special` in `choreo.playPhrases`.
4. **Classify it** (optional) in the sets in `choreo.ts`: `BEAT_MOVES` makes it need a clear beat, `CALM`
   allows it in calm passages, `QUIET` and `STRONG` say how much of the stage it lights, `BIG` gives it a
   breath of black before it.
5. **Watch it** in the 3D preview in at least a one-car, the classic three-car and a five-car lineup, and
   regenerate `MOVES.md` from the catalogue.

A split move (the side cars and the centrepiece doing different things) is two functions, one for each
role, added to `sideMoves` and `centre` in `choreo.playPhrases` and to `catalog.SPLIT`.

What makes a move good:

- **Readable from 30 m.** A crowd sees lamps, not LEDs. Use whole lamps and big contrasts; an effect that
  needs the bar's 60 LEDs belongs on the centrepiece.
- **Locked to the music**, never to a clock.
- **Darkness between hits.** Flash for about 100–160 ms, not the whole beat.
- **One idea per move.** If it needs a paragraph to describe, it's two moves.

## Adding a car

Tesla's channel map is the same for every car, but which lamps exist, which channels share an output, and
what the motors do differ.

1. **`src/engine/vehicles.ts`**: a letter, with the choreographer's body type, the folder name, a
   label, and the app model the preview draws. Add the letter to the test in `vehicles.test.ts`.
2. **`src/engine/car.ts`**: the lamp groups, if the car's lamps differ. Every move uses them.
3. **`src/engine/lamps.ts`**: if the hardware differs from the channel names (like the 2025+ Model Y,
   whose bar is driven by channels 4 and 6), translate the frames at the end.
4. **`src/engine/motors.ts`**: travel times, and anything the car lacks or adds.
5. **The preview**: a profile in `src/viewer/core/vehicles.ts`, and the car's Tesla app model in
   `src/viewer/car/appBody.ts` (its rules map lamp meshes to channels and animation clips to closures)
   and in `tools/export_car_models.py`. Only Tesla's official models: no hand-built or approximated cars.

## The releases and the site

The site's large files come from two GitHub releases, so they never enter the git history. Each script
installs what it needs when run with [uv](https://docs.astral.sh/uv/), and its docstring says how to
publish:

| Release | Script | What |
|---|---|---|
| `models` | `uv run tools/export_models.py OUT_DIR` | the two ONNX listening models (beat-this exported from PyTorch and checked against it; basic-pitch's own file) |
| `car-models` | `uv run tools/export_car_models.py BUNDLE.apkm OUT_DIR` | Tesla's nine car models and the paint table, from a Tesla Android app bundle you have |

Then `gh release upload <release> OUT_DIR/* --clobber`.

`.github/workflows/pages.yml` builds the site on every push to `main`: it runs the tests, downloads both
releases into `public/models/`, builds, and deploys `dist` to GitHub Pages at
matthewhager.github.io/carreography/ (Vite's `base` is `/carreography/`). GitHub serves Pages from a
free account's repository only once it's public.

## Car reports

The most useful thing you can do with a car is to play a show on it and write down what didn't match the
3D preview: a lamp that stayed dark or lit the wrong way, a lid that didn't open fully, how long the
liftgate or frunk took. Open an issue with the **Car report** template. Reports on the 2025+ Model Y and
the Model Y L are especially welcome, since Tesla hasn't documented them.

## Pull requests

- Keep a pull request to one thing (one move, one fix).
- The type check, lint and tests must pass; CI runs them on every push.
- Say what you watched in the preview, and on which lineups.
- If your change alters shows on purpose, say so. If it shouldn't, check it doesn't (see the bridge test).
- Match the code around you: docstrings say what the audience or the user experiences, comments are
  sparse and say why, lines are up to about 110 columns, and sides are the crowd's, never the vehicle's.

## Licence

The project is AGPL-3.0 (see [LICENSE](LICENSE)), and contributions are accepted under the same licence.
Don't add files you don't have the right to share: no commercial recordings, and none of Tesla's models
or files.
