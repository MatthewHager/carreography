# Tesla Light Show Maker

Turn any song into a synchronized light show for a lineup of **one to five Teslas**: Model Y
(2025+ or 2020–24) and Cybertruck, parked side by side facing the crowd. Every car gets its own
show file, and together they play as one instrument. Notes run across the cars like a keyboard, the
beat thumps through every headlight, builds sweep in from the edges and pop on the peak, and the
liftgates, frunks, windows, mirrors and charge ports dance on the big moments.

![Three cars mid-show in the 3D preview](docs/images/preview.jpg)

Nothing is hand-programmed per song. The generator listens to the recording: the notes, beat,
loudness, song structure and, for sung songs, the lyrics. A choreographer then picks a move from a
catalogue of 57 for every musical phrase. You can watch the result in a 3D preview before it goes
anywhere near a car.

- **Upload a song** in the web app, pick your cars, and download a zip with each car's
  `LightShow` folder.
- **Or use the command line**: `python3 build.py --song my.mp3 --lineup YCY`.
- **Run the diagnostic first.** It's a voiced test show that checks every car's drive, sync, lamps
  and motors before the real thing.

It started as a three-car show for a Halloween event in 2026 (twelve songs, two Model Ys and a
Cybertruck). Those shows are kept in `output/` as examples.

## Quick start

You need **Python 3.12**, **ffmpeg**, **git** and **uv**. On a Mac: `brew install python@3.12 ffmpeg uv`.
On Debian/Ubuntu: `apt install python3 ffmpeg git espeak-ng`, then install uv.

```bash
git clone https://github.com/MatthewHager/tesla-lightshow.git
cd tesla-lightshow
./setup.sh          # one time: the analysis environment (~3 GB of Python packages) and Tesla's files
```

The 3D preview draws Tesla's own car models from the Tesla app, which can't be shipped here. Install
them once from a Tesla Android app bundle (see [preview3d/README.md](preview3d/README.md#the-car-models-install-once)):

```bash
python3 -m lightshow.tesla_app_models ~/Downloads/Tesla_4.61.6-4647.apkm
```

### The web app

```bash
uv pip install --python .venv312/bin/python -r requirements-web.txt
.venv312/bin/python -m webapp
```

Open <http://localhost:8000>, drop in a song, add your cars from the crowd's left to right, and press
**Make the light show**. A three-minute song takes a few minutes. Then download the zip, or
**Watch it in 3D**. There's a Dockerfile for hosting it; see [webapp/README.md](webapp/README.md).

### The command line

```bash
python3 build.py --song path/to/song.mp3 --lineup YCY --out my_show
```

`my_show/usb/` then has one folder per car, ready to copy. Options:

| option | what it does |
|---|---|
| `--lineup YCY` | the cars, crowd's left to right (see below) |
| `--start 30 --end 150` | trim the recording (seconds) |
| `--stems` | a band or vocal recording: separate vocals, drums and bass first, so each can drive its own lights (slower) |
| `--style legato` | slow, flowing music with no beat: the lights follow the swell and the melody |
| `--max-level 1` | cap the intensity (0–3); 1 keeps a song calm |
| `--no-liftgate` | never open the liftgates or frunks |
| `--diagnostic` | build the voiced test show for the lineup instead of a song |

### Lineups

A lineup is one letter per car, written left to right **as the crowd sees the cars** (facing their
fronts):

| letter | car |
|---|---|
| `Y` | Model Y, 2025 and later ("Juniper", with the light bar across the nose) |
| `y` | Model Y, 2020–2024 |
| `C` | Cybertruck |

For example `C` is a lone Cybertruck, `YY` two Model Ys, `YCY` the classic three, and `YYCYY` five
cars. Each car's folder is named after its place, for example `Car1_ModelY_Left` or
`Car3_Cybertruck_Center`. That folder goes on that car's drive; the files differ from car to car.

Other Tesla models aren't supported yet. Adding one is a good first contribution; see
[CONTRIBUTING.md](CONTRIBUTING.md#adding-a-vehicle).

## Put a show on the cars

1. **Format a USB drive** as exFAT (FAT32 also works). It needs no more than a few hundred MB per show.
2. **Copy that car's `LightShow` folder** (the folder itself, not just its contents) to the top level
   of the drive. Use one drive per car.
   - On a Mac, `python3 make_usb.py` does all of this for a set list: it erases the drive, copies the
     files, checks every file and ejects the drive.
3. **Plug the drive into the car.** In the car, open **Toybox → Light Show** and pick the show.
   **Schedule** the same start time on every car so they play together.
4. **Keep people clear** of the liftgates, frunks, mirrors and windows. They move during the show.

**Run the diagnostic first.** It's `00_diagnostic` in a set list, or the web app's "include the
diagnostic show" option. A voice announces each test and the cars do it:

- each car flashes alone, so you can catch a drive in the wrong car;
- a left-to-right sweep;
- beeps and tones the lights must match, to check the cars are in sync;
- every lamp channel by name;
- the light-bar tests;
- the motors, while the voice counts the seconds.

## A set list for an event

For several songs on the same drives, list them in [`setlist.json`](setlist.json) and set its
`"lineup"`:

```bash
python3 build.py              # build every song in setlist.json (two at a time)
python3 build.py 04 thriller  # rebuild some of them, by number or name
python3 build.py --assemble   # no analysis: just the audio, the usb/ folders and the preview list
python3 make_usb.py           # Mac: make each car's drive
```

Recordings go in `songs/`. They're never committed (see [songs/README.md](songs/README.md)). Each
build writes `output/<song>/<car>/LightShow/<song>.fseq`, gathers every car's shows into `usb/`, and
lists them in the 3D preview. Serve the folder with `python3 -m http.server 8765` and open
<http://localhost:8765>. From a phone or iPad on the same Wi-Fi, use `http://<computer's IP>:8765`
and tap Play once.

## How it works

The short version: `audio.py` and its neighbours listen; `form.py` maps the song's sections and
shape; `phrases.py` cuts it into phrases; `choreo.py` picks one move per phrase from
`catalog.py`/`moves.py`; `pulse.py` lays the beat into the headlights; `motors.py` plans the
liftgates, frunks, windows, mirrors and charge port within Tesla's limits; `fseq.py` writes Tesla's
file format.

- [docs/CHOREOGRAPHY.md](docs/CHOREOGRAPHY.md): the choreography strategy. How a song becomes
  moves, how the cars share the stage in a lineup of any size, the beat layer, the motors, and the
  rules every show keeps.
- [MOVES.md](MOVES.md): the move catalogue, with what each move looks like and when it's used
  (generated from `lightshow/catalog.py`).
- [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md): the technical tour of the pipeline, the checking
  tools, and what's known about each car.
- [tools/README.md](tools/README.md): tools for checking a show (sync, beat feel, motor rules,
  preview videos).

## Contributing

New moves, new vehicles, better music analysis, car test reports: all welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). If you're working with a coding agent, point it at
[AGENTS.md](AGENTS.md). Run the tests with:

```bash
.venv312/bin/python -m pytest
```

## Project layout

```
build.py            the one command: build a song, a set list, or a diagnostic
make_usb.py         makes a car's USB drive from a set list (macOS)
setlist.json        an event's songs and lineup
lightshow/          the generator: analysis, choreographer, moves, beat layer, motors, FSEQ writer
webapp/             the upload-a-song web app (FastAPI, no build step)
preview3d/          the 3D preview (TypeScript + three.js; dist/ is the built copy)
tools/              checking and review tools
tests/              pytest
output/<song>/      generated shows: <car>/LightShow/<song>.fseq, moves.txt, pulse.txt
songs/              your recordings (never committed)
docs/               how it works, the choreography, sources
```

## Things to know

- **Model Y 2025+.** Tesla hasn't documented the 2025+ Model Y's lamps. The mapping comes from
  owners' on-car tests (see [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md#the-2025-model-ys-lamps)),
  and the diagnostic shows what your car does. Test reports are very welcome.
- **The Cybertruck's frunk** opens in about 10 s and closes in about 4 s (timed on a truck; Tesla
  doesn't publish it).
- **Windows stay down** during and after a show. The music plays from the cabin speakers, so the
  crowd hears it through the open windows. Close them afterwards.
- **Motor limits.** Every show stays within Tesla's per-show command limits and the ~30 s dance
  advice; `tools/closure_audit.py` checks it.
- **Tested on macOS** (Apple Silicon) and Linux (via the web app). Windows is untested.
- **Music rights.** Use recordings you have the right to use. The light-show files the generator
  makes are yours.

## Licence and credits

[AGPL-3.0](LICENSE). The 3D preview is adapted from
[Tesla Lightshow Studio](https://github.com/nathanjgrace/tesla-lightshow-studio) by Nathan Grace
(AGPL-3.0). Tesla's validator is fetched from
[teslamotors/light-show](https://github.com/teslamotors/light-show) at setup, and the preview's car
models are extracted from your own copy of the Tesla app; neither is redistributed here. Music analysis uses [basic-pitch](https://github.com/spotify/basic-pitch),
[Beat This!](https://github.com/CPJKU/beat_this), [Demucs](https://github.com/facebookresearch/demucs)
and [faster-whisper](https://github.com/SYSTRAN/faster-whisper). Full credits are in
[docs/SOURCES.md](docs/SOURCES.md).

Not affiliated with Tesla. Light shows move real parts of real cars: watch the space around them.
