# Contributing

Thanks for helping. Most contributions are one of these: a new move, a new car, better listening, a fix
to the page or the 3D preview, or a report of how a show played on your car. Read
[How it works](docs/HOW_IT_WORKS.md) first; if you work with a coding agent, [AGENTS.md](AGENTS.md) is
written for it.

## Develop

The repository is the app: Vite, React and TypeScript, with shadcn/ui and three.js. You need Node.js 24.

```bash
npm install
npm run dev          # http://localhost:5173/carreography/
npx vitest run       # the tests
npx tsc -b           # the type check
npx oxlint src       # lint
npm run build        # the site, in dist/
```

The listening models, Tesla's car models and the example song aren't in the repository. Download them
from the releases once (with the [GitHub CLI](https://cli.github.com/)), as the site build does:

```bash
gh release download models --dir public/models --pattern "*.onnx"
gh release download car-models --dir public/models/tesla-app
gh release download examples --dir public/examples
```

**Never commit recordings, Tesla's files or anything in `cache/`.** Keep songs for trying shows in
`songs/`, which git ignores. The tests make up their own signals and lyrics.

## Where things are

| Folder | What |
|---|---|
| `src/engine/` | The choreographer: no DOM, runs in a worker, and in Node for the tests. `choreo.ts` (the pipeline and the passages), `level.ts` (how big the show is), `bed.ts`, `moves.ts` (every move), `catalog.ts` (the move catalogue), `drums.ts`, `pulse.ts` (the beat, builds and drops), `motors.ts` (the closures), `legato.ts` (music with no beat), `lyrics.ts`, `car.ts` (one car's frames and lamp groups), `vehicles.ts` (the lineup letters), `lamps.ts` (the 2025+ Model Y), and the reading of the music (`feel.ts`, `texture.ts`, `form.ts`, `phrases.ts`, `tempo.ts`). |
| `src/engine/listen/` | The listening: decoding helpers and resampling, the librosa subset, beat-this and basic-pitch on ONNX Runtime Web (`infer.ts` picks the backend), song tags, LRCLIB and lyric alignment. |
| `src/viewer/` | The 3D preview (three.js), adapted from Tesla Lightshow Studio (AGPL-3.0): `core/` reads, writes and simulates show files, `car/appBody.ts` draws Tesla's app models. |
| `src/app/` | The page: the 3D stage, the panels, the worker that makes a show (`show.worker.ts`), the WAV and the ZIP. |
| `src/components/ui/` | shadcn/ui components, as the shadcn CLI writes them. Don't edit them; restyle through the theme in `src/index.css`. |
| `tools/` | The two scripts that make the releases (below), and the show review tool (`tools/review/`). |
| `MOVES.md` | The move catalogue, generated from `catalog.ts`. |

## Looking at a show

Tests check rules (Tesla's limits, the same show from the same input, the music's feel), never a look. To
see what a change does, make the show and look at it with the review tool ([tools/review/README.md](tools/review/README.md)):

```bash
npm run review -- song.wav --lineup YCY                       # timeline pictures and a summary
npm run review -- song.wav --lineup YCY --from 60 --to 90 --video
```

It draws every lamp of every car against the loudness, the level, the beats, the drums and the notes, sums
up how the light follows the song's arc, and films the 3D preview. Look before and after, on a few songs
and lineups (one car, the classic three, five mixed).

## Adding a move

1. **Write it** in `src/engine/moves.ts` as a function `(cars, an, ph) => void`.
   - `cars` is the lineup, crowd-left to right (`Car` objects); `an` is the analysis; `ph` is the phrase
     (`ph.t0`, `ph.t1`, and `ph.a` to `ph.b`, its notes in `an.events`).
   - Size every hit by the level at its moment: `half(car, side, levelAt(an, t), owned(an, t))` gives what a
     hit lights of a half car, from one lamp at a hush to both headlights from drive up, leaving the
     headlights the beat layer owns there to the beat; `note(...)` shapes a note's light like its sound. A truck's bar takes `car.pixels(C.FRONT_BAR, t, values)` (0–1 per LED, crowd-left to
     right). Everything takes the crowd's left and right.
   - Light the whole lineup. Use `sides(cars)` and `centreTruck(cars)` (which may be `null`); never
     assume three cars, and never take `cars[1]` as the truck.
   - Take times from the music: `an.events.t`, `an.beats`, `an.downbeats`, and the helpers in `moves.ts`
     (`grid` thins beats to the level's pace). Never use a fixed tempo.
2. **Name it** in the `MOVES` table at the end of `moves.ts`.
3. **Catalogue it** in `catalog.MOVES`: what the crowd sees and what it locks to (`note`, `beat`, `bar`,
   `self`). Put it in `NOTE_MOVES`, `BEAT_MOVES` or `HELD_MOVES` for figures to take it, or in
   `FOR_GESTURE` if a phrase shape should always get it; MOVES.md's "plays" column is written from those
   lists.
4. **Watch it** in the review tool or the 3D preview in at least a one-car, the classic three-car and a
   five-car lineup, and regenerate `MOVES.md` with `UPDATE_MOVES=1 npx vitest run catalog` (the tests fail
   while it's stale).

What makes a move good:

- **Readable from 30 m.** A crowd sees lamps, not LEDs. Use whole lamps and big contrasts; an effect that
  needs the bar's 60 LEDs belongs on the centrepiece.
- **Locked to the music**, never to a clock.
- **Contrast without blinking.** Space between hits in calm music, every beat for the climbs, every lamp at
  the peak; a lamp a figure reaches holds until the next beat or decays into it, so the stage never reads
  as a bunch of blinking lights (and a car lights at most five times a second, but in fast figures).
- **Fewer, better moves.** A new move earns its place by reading differently from the seventeen there are.
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

The site's large files come from GitHub releases, so they never enter the git history. Each script
installs what it needs when run with [uv](https://docs.astral.sh/uv/), and its docstring says how to
publish:

| Release | Script | What |
|---|---|---|
| `models` | `uv run tools/export_models.py OUT_DIR` | the two ONNX listening models (beat-this exported from PyTorch and checked against it; basic-pitch's own file) |
| `car-models` | `uv run tools/export_car_models.py BUNDLE.apkm OUT_DIR` | Tesla's nine car models and the paint table, from a Tesla Android app bundle you have |

Then `gh release upload <release> OUT_DIR/* --clobber`. The `examples` release holds the song the page
starts with, `hall-of-the-mountain-king.mp3`: a public-domain recording (docs/SOURCES.md), as a 192 kbps
MP3.

`.github/workflows/pages.yml` builds the site on every push to `main`: it runs the tests, downloads the
releases into `public/`, builds, and deploys `dist` to GitHub Pages at
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
- If your change alters shows on purpose, say so and say what you looked at. If it shouldn't, check it
  doesn't: build a song before and after with the review tool and compare the `show/*.fseq` files.
- Match the code around you: docstrings say what the audience or the user experiences, comments are
  sparse and say why, lines are up to about 110 columns, and sides are the crowd's, never the vehicle's.

## Licence

The project is AGPL-3.0 (see [LICENSE](LICENSE)), and contributions are accepted under the same licence.
Don't add files you don't have the right to share: no commercial recordings, and none of Tesla's models
or files.
