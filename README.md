# Halloween Tesla Light Shows

Twelve synchronized light shows for three cars parked side by side, facing the crowd:

**Model Y (left) | Cybertruck (centre, pulled slightly forward) | Model Y (right)**

Both Model Ys are the 2025+ model ("Juniper") with the light bar across the nose.

Every show is generated from the music: the notes, beat, loudness and song structure drive the
lights, the liftgates/frunk, windows, mirrors and charge port, choreographed across all three cars.
There's a 3D preview that plays each show with its music in the browser.

| # | Song | # | Song |
|---|---|---|---|
| 1 | Toccata and Fugue in D minor (Bach) | 7 | Thriller |
| 2 | This Is Halloween | 8 | She Blinded Me with Science |
| 3 | Danse Macabre (Saint-Saëns) | 9 | The Sorcerer's Apprentice (Dukas) |
| 4 | Monster Mash | 10 | The Addams Family theme |
| 5 | In the Hall of the Mountain King (Grieg) | 11 | Night on Bald Mountain (Mussorgsky) |
| 6 | Ghostbusters | 12 | Ave Maria (calm closer) |

## Quick start: watch the shows

You need **git**, **Python 3** and **ffmpeg** (on a Mac: `brew install ffmpeg`).

```bash
git clone https://github.com/MatthewHager/tesla-lightshow.git
cd tesla-lightshow
python3 build.py --assemble
python3 -m http.server 8765
```

Open <http://localhost:8765>, pick a show, press Play. From an iPad or phone on the same Wi-Fi, use
`http://<this computer's IP>:8765` (tap Play once to allow audio). Drag to orbit; the camera buttons
switch views; **Labels** shows which car is which.

`--assemble` cuts each song's audio from `songs/` to match the show files already in `output/`,
and fills the `usb/` folders. It takes about a minute and needs nothing else installed.

## Put the shows on the cars

After `python3 build.py --assemble`, there's one folder per car:

| folder | car |
|---|---|
| `usb/Car1_ModelY_Left/LightShow` | the Model Y on the crowd's **left** |
| `usb/Car2_Cybertruck_Center/LightShow` | the **Cybertruck** in the middle |
| `usb/Car3_ModelY_Right/LightShow` | the Model Y on the crowd's **right** |

**Make the drives (Mac):** plug in a USB drive (1 GB or bigger) and run

```
python3 make_usb.py
```

It asks which car, erases the drive (exFAT), names it after the car (`CAR1 LEFT Y`, `CAR2 TRUCK`,
`CAR3 RIGHT Y`), copies that car's folder, checks every file and ejects it. Label each drive - the
two Model Y drives are different. `python3 make_usb.py 2` goes straight to the Cybertruck's;
`--list` shows which drives it sees. Without a Mac: format the drive exFAT and copy the car's
`LightShow` folder (the folder itself) to the top level of the drive.

Then, in the cars:

1. Plug each drive into its car's front USB port.
2. **Toybox → Light Show**, pick the same show, and **Schedule** the same start time on all three cars
   so they play in sync. (Each car plays its own part of the show.)
3. Keep people clear of the liftgates, frunk, mirrors and windows - they move during the shows.

**Run `00_diagnostic` first** (it's first in the list). A voice announces each test and the cars do
it: each car flashes alone (is every drive in the right car?), a left-to-right sweep, beeps and tones
the lights must match (are the cars in sync?), every lamp channel by name, the two light-bar tests
(which tells you how your Model Ys' bars are driven - see *Things to check*), a fade, the interiors,
then the mirrors, charge port, windows and the liftgates and frunk while the voice counts the
seconds (time the frunk). It lasts 4 minutes; the windows stay down afterwards, like the shows.

## Change a show and rebuild

One-time setup for rebuilding (about 3 GB of Python packages; needs `brew install uv ffmpeg`):

```bash
./setup.sh
```

Then:

```bash
python3 build.py              # rebuild all 12 (20-30 minutes, two songs at a time)
python3 build.py 04           # rebuild one song (by number or name: python3 build.py thriller)
```

Each build rewrites the song's show files in `output/`, refreshes the `usb/` folders and the
preview's show list. Reload the browser to see the change. Per-song logs are in
`output/<song>/build.log`; `output/<song>/moves.txt` lists the move chosen for every phrase and
`pulse.txt` how the beat was handled.

Builds are reproducible on one machine: the same code and recording give the same show. A
different machine can come out slightly different (stem separation and transcription use
floating-point models), so commit the `output/*.fseq` files you're happy with.

### Common changes

| to change... | edit |
|---|---|
| signature moments in a song (a hit, a solo, a blackout, the big peak) | `lightshow/cues.py` |
| reactions to lyrics ("eyes glowing red" turns the interiors red) | `lightshow/lyrics.py` |
| the moves themselves | `lightshow/moves.py`, described in `lightshow/catalog.py` (listed in [MOVES.md](MOVES.md)) |
| how the beat shows in the headlights | `lightshow/pulse.py` |
| frunk/liftgate, windows, mirrors, charge port choreography and travel times | `lightshow/motors.py` |
| how moods and pacing are judged | `lightshow/mood.py` |
| the slow, flowing style (Ave Maria: glow, swells, the melody gliding across the cars) | `lightshow/legato.py`; turn it on for a song with `"style": "legato"` in `setlist.json` |

To try a new song: `python3 build.py --song path/to/song.mp3 --name my_song` (add `--stems` for a band
recording, `--start/--end` to trim). To keep it, copy the file into `songs/` and add it to
`setlist.json`.

### Checking a show

```bash
.venv312/bin/python tools/setlist_review.py     # every show: variety, timing, motor limits, Tesla's validator
.venv312/bin/python tools/feel_all.py           # how clearly each show pulses on the beat
.venv312/bin/python tools/closure_audit.py --summary output/*/*/LightShow/*.fseq   # motors vs Tesla's rules
```

More tools (beat strips, motor scripts, preview videos) are in [tools/README.md](tools/README.md).

## How it works

[docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) is the technical tour: transcription, the form map,
the choreographer and its move catalogue, the beat layer, the beat map that follows the
performer, and the motor choreography. Sources and credits are in [docs/SOURCES.md](docs/SOURCES.md).

## Project layout

```
build.py            the one command: build / assemble / try a song
make_usb.py         makes a car's USB drive (macOS)
setlist.json        the diagnostic + 12 songs: recording, trim, options
songs/              the recordings
lightshow/          the generator (analysis, choreographer, moves, beat layer, motors, FSEQ writer)
output/<song>/      generated shows: <car>/LightShow/<song>.fseq per car, moves.txt, pulse.txt
usb/                ready-to-copy LightShow folders, one per car (generated)
preview3d/          the 3D viewer (TypeScript/three.js; dist/ is the built copy the browser loads)
preview/shows.json  the viewer's list of shows (generated)
tools/              checking and review tools
setup.sh            one-time setup for rebuilding
docs/               how it works, sources
```

The 3D viewer is prebuilt in `preview3d/dist/`. To change it you need Node.js:
`cd preview3d && npm install && npm run build`.

## Things to check

- **Cybertruck frunk timing.** Tesla doesn't publish how long the frunk takes to open; the shows
  assume 14 s (the Model Y liftgate's time). Time it, and if it differs set
  `LIFTGATE_OPEN_S["cybertruck"]` in `lightshow/motors.py` and rebuild. Also check each Model Y's
  liftgate opens fully (owners report part-way opening when its height setting has been lowered).
- **Windows stay open during the shows** (the music plays through the cabin speakers, so the crowd
  hears it through the windows). They're left fully down at the end - close them afterwards.
- **The Model Ys' front light bar.** Tesla hasn't documented how a light show drives the 2025+
  Model Y's bar, and owners report two different ways: as 60 separate LEDs on the Cybertruck's bar
  channels, or as one lamp on channel 6 (an on-car test in Tesla's light-show issue #183 found the
  60 LED channels did nothing on its car). The shows send both, carrying the same picture, so the bar
  lights either way - as left/right halves (what the preview shows) or all at once. The diagnostic's
  light-bar tests A and B show which way your cars read it. If you need the older Model Y's lights instead, change `layout="YCY"` to `"yCy"`
  in `build.py` (lower-case `y` = 2020-24 Model Y) and rebuild.
- **Headlight ramps.** Some lamps fade instead of switching (Tesla's 0.5/1/2 s ramps). Newer Model Y
  projector headlights may switch instantly instead; the shows still work either way.
- **Tested on macOS** (Apple Silicon). Linux should work; Windows is untested.

## Licences

The 3D viewer is adapted from Tesla Lightshow Studio and is AGPL-3.0 (`preview3d/LICENSE`).
Several recordings in `songs/` are commercial - this repository is private; don't publish them.
See [docs/SOURCES.md](docs/SOURCES.md).
