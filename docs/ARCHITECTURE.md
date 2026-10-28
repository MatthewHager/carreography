# Carreography: the browser architecture

This is the plan for the next version: the whole app runs in the browser and is hosted free on GitHub
Pages. You drop in a song, pick 1 to 5 cars, watch the show on Tesla's own 3D models, and download one
light show file per car. The plan was agreed on 2026-10-27. Its numbers come from tests run that day in
Chrome on an M1 Max.

It is a plan, not the code yet. The Python version in `lightshow/` keeps making shows until the new
one matches it. [HOW_IT_WORKS.md](HOW_IT_WORKS.md) describes the Python version.

## What it must do

| # | Requirement |
|---|---|
| R1 | **Files and a 3D preview for every car.** A song plus 1–5 cars gives a Tesla-valid file per car, for every light-show car that has a Tesla app model (see [Cars](#cars)). |
| R2 | **In time with the music**, including tempo drift and rubato. |
| R3 | **Sees the whole song**: sections, builds, the climax, repeats. |
| R4 | **No unintended seams.** A new section may look new; nothing else should jump. |
| R5 | **Varied.** It may repeat on purpose when the music repeats; otherwise it avoids looking repetitive. |
| R6 | **Matches intensity.** A move is used only where the music has what the move needs. Quiet music gets quiet lights. |
| R7 | **Motors where they matter most**, timed to arrive on the music, within Tesla's limits. |
| R8 | **The cars work as a group**: roles, for any lineup. |
| R9 | **Lyrics can shape choices.** |
| R10 | **The same input gives the same show.** |
| R11 | **Easy to add moves and vehicles.** |

## The shape

The app works in five stages. Each stage hands the next one plain data, so each can be tested alone.

| Stage | What it does | In short |
|---|---|---|
| 1. Analyse | Listens to the recording and writes down measurements: the **score** | the ears |
| 2. Read | Turns the measurements into musical facts: sections, the arc, phrases, moments | understanding |
| 3. Plan | **The carreographer.** Sees the whole song and decides what happens where | deciding |
| 4. Render | Each chosen card draws its lights for its stretch of music | drawing |
| 5. Compile | Combines the layers, applies Tesla's rules, writes one `.fseq` per car | the car rules |

In one sentence: the carreographer decides what goes where, cards decide how they look, and Compile
enforces the car rules.

Everything is TypeScript. It runs in the browser, and in Node for the tests and a command-line build.

## 1. Analyse: the score

The score holds measurements only. Anything that interprets them belongs to Read. A visualizer would
use the same measurements, so the headlights can "look like the music".

| Layer | Contents | How it's measured |
|---|---|---|
| Beat grid | beats, downbeats, tempo curve | beat-this (`final0`) on ONNX Runtime Web |
| Curves, every frame | loudness; band energies with attack and decay; onsets per band (kick, snare, hats); brightness; chroma; novelty | our own TypeScript port of the librosa calls |
| Notes | start, end, pitch, loudness | basic-pitch (`nmp.onnx`) on ONNX Runtime Web, with our own post-processing |
| Lyrics | each sung line: start time and words | LRCLIB, looked up by artist and title, lined up with the audio |

Rules for the score:
- **Frames are 20 ms**, the light show's own frame.
- **Values are quantized** so small floating-point differences between devices don't change the show.
- **It's cached per song** in the browser, so the next visit doesn't analyse again.
- **Analysis runs in a worker** so the page stays responsive.
- **We resample the audio ourselves** (Kaiser-sinc), rather than leaving it to the browser. In the
  tests, every gap between the browser and Python came from decoding and resampling.

**Lyrics are line-level.** LRCLIB gives every word, but timed only by line. The show can react to what a
line says, such as a colour word, a scream or a chant of one word, but it can't hit one exact word in
the middle of a line. Songs with no synced lyrics on LRCLIB play without lyric effects. The old Whisper
word timing is dropped: it needed a download of a few hundred MB plus vocal separation, and it was
unreliable (it never caught "Ghostbusters").

## 2. Read

Read turns the score into the facts the carreographer works with. It runs in milliseconds, so it isn't
cached.

| Fact | What it is |
|---|---|
| Sections | Labelled by what they repeat: A, B, A′. |
| Arc | How intense each section may be, building to the climax. |
| Phrases | The units cards are chosen for: between rests, at line starts, at arrivals, at most 8 s. |
| Phrase shape | Melody, runs, chords, trills, build, held. |
| Mood | Calm, groove, drive or frenzy, from loudness, density and the arc. |
| Feature presence | Which features each phrase really has: a steady beat, a clear melody, a bass line, drums. |
| Moments | The climax, arrivals, shouts, the ending, and lyric moments (colour words, screams, chants). |
| Style | Whether the song has a beat to follow, or is slow and free (legato). |

The per-song cue sheets go away. Their detectors become Read's general moments, which every song gets.

## 3. Plan: the carreographer

The carreographer sees the whole song first, then decides in this order, scarcest first:

1. **Arc.** How big each section may get.
2. **Motor moments.** Liftgate, windows, mirrors and charge port go to the biggest moments. They're
   pre-timed so they arrive on the music, and they're counted against Tesla's limits.
3. **Themes.** When the music repeats, the show repeats with variation: the same music gets a related
   move.
4. **Cards per phrase.** First the hard filters: does the phrase have what the card needs, does the
   card fit the lineup, is the arc high enough? Then a small fit score that can be explained. Ties are
   broken with a seed from the song, so the result is the same every time.
5. **Accents.** Hits, lyric moments and the beat layer, on top of the base cards.
6. **Transitions.** A cut, a wipe or a hand-off, using the end state the previous card hands over.

Every choice records why it was made, so a show can be explained and debugged.

The 12 split formations stop being cards. For a split, the carreographer pairs a side-car card with a
centre card.

## 4. Cards

A card is one move. It declares what it needs and where it fits, and it draws itself.

```ts
interface Card {
  name: string;
  needs: Need[];              // e.g. 'beat', 'melody', 'bass'; the hard filter
  fit(phrase, song): number;  // 0 = never, higher = better
  render(ctx): Layer[];       // pure: the same ctx always gives the same lights
}
```

What `render` gets:
- its stretch of music, in musical time (beats and bars), with the notes and curves inside it;
- **song-level statistics**, such as the piece's pitch range and loudness quantiles;
- **a look-ahead** at the next phrase, for landings;
- the right to write **a tail** past its end, for landings and teardowns;
- the stage: the cars' positions, roles, and what each car's lamps can do.

Cards speak stage positions, not channels. A position has two axes:
- **across**, 0 to 1 from the crowd's left to the crowd's right;
- **depth**, which lamp layers are lit, from accents inward to everything.

Compile maps both onto the actual cars.

### Building blocks

Most cards are a preset of seven blocks. Each block has parameters from a shared vocabulary. Going
through today's code move by move, 48 of the 57 moves fit this way. One move stays
hand-written (`motif`), and eight merge into other presets or into the carreographer.

| Block | What it does |
|---|---|
| Keys | Pitch picks a place on the line; a note lights it. |
| Chase | A pattern steps along the line, one step per trigger. |
| Sweep | A light travels the line within one trigger. |
| Fill | A lit region whose size follows a level. |
| Glow | Slow swells on the lamps that can ramp. |
| Hit | A stab on some lamps or the whole stage. |
| Twinkle | Seeded random lamps or pixels. |

| Vocabulary | Says | Examples |
|---|---|---|
| Trigger | when | notes (top voice, chords, low register), beats, downbeats, off-beats, every N, accelerating, once |
| Line | where, and how finely | cars, halves, slots, lamps, the truck's light bar, radial; plus a role (all, sides, centre) |
| Weight | which lamps a lit spot uses | accents, sig + DRL, heads, inner, outer, everything |
| Envelope | how it lights | flash, hold, Tesla's ramp codes, release, comet |

Three modifiers:
- **alternate**: switch targets every N bars;
- **mask-by**: only light where another block has lit;
- **accelerate**: speed up through the phrase.

Two settings belong to each move, not to the system:
- how finely the line is cut;
- how much of the stage the truck takes.

Ramps are Tesla's ramp codes, not a brightness level, because most lamps can only switch on and off.

A new move is a preset, which is a data entry, or a new function when no block fits.

## 5. Compile

Compile combines the layers in a fixed order. Each layer has a mode:

| Mode | Used for |
|---|---|
| max | ordinary moves and accents adding light |
| mute | pre-blacks before a big hit, ducking under an accent |
| replace | the beat layer owning the headlights |
| override | lyric colours, solos, the finale |

Then Compile applies the car rules:
- **Crowd's left and right**: Tesla's "L" channels are the car's left, which is the crowd's right.
- **Each car's lamps**: a stage position becomes that car's actual lamps.
- **Motor limits**: liftgate 6, each window 6, each mirror 20, charge port 3. Lids dance only once
  fully open, and the liftgate closes before the end.
- **Boolean lamps** stay on or off for at least 100 ms.
- **The ending**: every light is off in the last frames.
- **The file**: FSEQ V2 uncompressed, 20 ms frames, 48 or 200 channels, the same checks as Tesla's
  validator.

## Cars

Every light-show car that has a Tesla app model. Each uses Tesla's own model and animations.

| Car | App model |
|---|---|
| Model S 2021+ | `s_palladium` |
| Model 3 2017–23 | `model3_high` |
| Model 3 2024+ | `poppyseed` |
| Model X 2021+ | `x_palladium` |
| Model Y 2020–24 | `y_high` |
| Model Y 2025+ Premium / Performance | `bayberry` |
| Model Y 2025+ Standard | `bayberry_e41` |
| Model Y L | `bayberry_e80` |
| Cybertruck | `cybertruck` |

Not included: Semi, and the Model S and X before 2021, which Tesla doesn't support for light shows.

You pick each car's paint from the colours in the app's `paints.json`. The Cybertruck only comes in
stainless.

The models are Tesla's files: they're extracted from the Tesla app on the user's own machine and never
committed or hosted.

## The app

| | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| UI | shadcn/ui with a custom theme only; the shadcn files are treated as vendored |
| Extras | react-dropzone, because shadcn has no drop zone; nothing that shadcn already ships |
| Look | The 3D cars fill the screen, with floating panels and a bottom sheet. Dark and Tesla-like, with no Tesla logo, wordmark or fonts. |
| Hosting | GitHub Pages at matthewhager.github.io/carreography/, deployed by GitHub Actions; Vite `base` is `/carreography/`; no router, or a hash router |
| Workers | A pool of single-thread workers. Pages can't set the headers that multi-threading needs, and the service-worker workaround hung in testing. |

## What goes away

| Today | Becomes |
|---|---|
| Per-song cue sheets (`cues.py`) and lyric rules (`lyrics.py`) | Read's general moments |
| The separate legato pipeline (`legato.py`) | a style the carreographer chooses, using the same blocks |
| The special passes in `choreo.py` | accent layers and Compile rules |
| The "driver" setting | a fact that Read finds |
| Demucs (stems) and Whisper (word timing) | dropped from the core |
| About 320 lines of unused code in `choreo.py` | deleted |
| The Python choreography, the FastAPI web app, the Dockerfile, the USB maker | replaced by the browser app |

The current tools for checking shows (the closure audit, timeline strips) are ported, not deleted.

## What the tests showed

| Part | Result | Time per song | Download (gzip) |
|---|---|---|---|
| Beats | Identical to PyTorch on the same samples. F-score 0.96–1.0 with the browser's decoding, within 0 ms. | WebGPU 2–8 s; 4 workers 12–23 s | 38 MB model (fp16), plus a 4–7 MB runtime |
| Notes | Identical to Python on the same samples. F-score 0.96–0.999 with our own resampling. | 5–17 s | 112 KB model |
| Curves | Matches librosa exactly, including chroma with tuning. | 2–5 s | 8 KB |
| Lyrics | LRCLIB allows browser requests. 5 of 6 test songs had synced lines. Needs retries, and lining up with the audio. | under 1 s | none |
| Moves | 7 blocks cover 48 of 57 moves. Light rendering shrinks from about 2,800 lines to about 1,900. | | |

A whole song takes about 15–30 s with WebGPU, or 35–60 s without it. The models download once and are
cached.

Rejected along the way:
- **Essentia.js**: slower, its beats disagreed, and its chroma was impractical.
- **The npm basic-pitch post-processing**: 1–4 minutes per song. Ours gives identical notes in 0.2 s.
- **The smaller beat model**: too inaccurate on the Toccata.
- **ONNX Runtime's JSEP bundle**: wrong output.
- **Whisper in the browser**: see Lyrics above.

### Not tested yet

- **Other browsers.** Only Chrome was tested: not Safari, Firefox or the iPad.
- **The same show on different machines.** Our own resampling and the quantized score should make
  them agree; this hasn't been checked across browsers.
- **Notes from band recordings without separation.** Today the band songs are transcribed from Demucs
  stems; in the browser, notes come from the full mix.
- **Section boundaries.** Small decoding differences moved 5 of 13 boundaries on the Toccata, so
  Read's sections need to be robust to that.

## Build order

1. **Port first, byte for byte.** The Python choreographer is ported to TypeScript line by line
   (`app/src/engine/`) and checked against it: given the same analysis, every car's frames must be
   identical (`tools/export_bridge.py` exports the analyses, `bridge.test.ts` compares). Done: all
   12 songs in four lineups match.
2. **The app on Pages**: the Vite + shadcn app, the 3D view, the download, and a song you drop in.
3. **Browser analysis** replaces the Python analysis.
4. **Retire the Python choreography** once the browser shows are as good. Not before the
   2026-10-31 event.
5. **Then simplify**, one step at a time, each checked against the port: the blocks, Read and the
   carreographer, the deletions above.
