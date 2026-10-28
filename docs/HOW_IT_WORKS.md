# How it works

How a song becomes a light show for a lineup of one to five Teslas, all in the browser. The code is in
`src/`. The choreographer (`engine/`) is a line-by-line TypeScript port of the Python generator this
project started as (kept at the tag `python-final`), and it still makes byte-identical shows from the same
analysis (see [CONTRIBUTING.md](../CONTRIBUTING.md#the-bridge-test)).

## What it does

| # | Requirement |
|---|---|
| R1 | **Files and a 3D preview for every car.** A song plus 1–5 cars gives a Tesla-valid file per car, for every light-show car that has a Tesla app model. |
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

The idea behind all of it: **the lineup is one instrument.** A row of cars blinking along with the music is
easy to make and dull to watch. Here a melody runs across the cars, a chord fills the stage, the beat
thumps through every headlight at once, a build sweeps in from both ends and lands on the middle, and the
cars pass phrases between them. Four principles follow:

1. **Every light follows the music, not a clock.** Each move locks to the notes played, the beat the
   performer actually keeps, the bar, or a crescendo, so a chase speeds up when the music does.
2. **Contrast makes it readable.** Hits are short and hard with darkness between them, big moves get a
   breath of black first, calm music gets slow glows, and the song's arc is saved for its climax.
3. **The crowd's view is the only view.** Everything is written in the crowd's left and right, facing the
   cars' fronts.
4. **Variety, then callbacks.** No move is overused, and a section that comes back gets the formation it
   had the first time, a step bigger.

## From song to show

```
song ─► decode ─► listen (beats, notes, loudness, form) ─► phrases ─► a move per phrase ─► beat layer
                         │                                                                    │
                  lyrics (LRCLIB) ─────────────────────► cues ◄─────────────────────────────────┘
                                                           │
              motors (lids, windows, mirrors, port, doors) ◄┘ ─► lamps per car ─► FSEQ per car ─► ZIP
```

The page (`app/pipeline.ts`) decodes the song and hands it to a worker (`app/show.worker.ts`), which
listens, looks up the lyrics at the same time, and choreographs. The page then shows the result in 3D
and packs the download.

### Listening (`engine/listen/`)

- **Decoding.** A 44.1 kHz WAV is read by the app itself (`app/wav.ts`), since browsers scale 16-bit
  samples differently; anything else goes through the browser's decoder at 44.1 kHz. The song is mixed
  to mono and resampled to 22050 Hz with our own Kaiser-windowed sinc (`resample.ts`), as librosa does:
  every difference between browsers and Python in testing came from decoding and resampling.
- **Beats and downbeats**: [Beat This!](https://github.com/CPJKU/beat_this) (the `final0` checkpoint) on
  ONNX Runtime Web (`beats.ts`). The app computes the log-mel spectrogram itself, and the model is
  exported without it, with fp16 weights.
- **Notes**: Spotify's [basic-pitch](https://github.com/spotify/basic-pitch) (`nmp.onnx`, `notes.ts`),
  with its note decoding ported to typed arrays: identical notes in well under a second, where the npm
  package takes minutes.
- **Backends** (`infer.ts`). The models run on the best backend the browser has: WebGPU; else a pool of
  workers, each with a single-thread WASM session; else one WASM session in the show's worker. A GPU
  that fails at run time, or pool workers that can't start or die, drop to the next one and start over.
  The pool is sized by memory as well as cores, since each worker takes about 1 GB at its peak: one
  worker per 4 GB of `deviceMemory` (Chromium), two on other computers, none on phones and tablets.
  ONNX Runtime's own threads would need cross-origin isolation, which GitHub Pages can't give.
- **The analysis** (`audio.ts`, with `dsp.ts` and `cqt.ts`, the subset of librosa it needs): onsets,
  bass and bright hits, loudness, intensity tiers 0–3 that build across the piece, crescendos, held
  notes, and chroma. `texture.ts` turns notes into events (a key press or a chord) and labels each
  passage: melody, run, figuration, trill, chords, arrival. `form.ts` maps the sections from harmony and
  timbre, letters the repeats (A, B, A′), and gives each section an intensity **ceiling** that shapes the
  arc: the loudest third may go all out, nothing before the climax gets the top tier, and each repeat may
  go one step higher.
- **The beat map follows the performer** (`tempo.ts`). Recordings aren't metronomic, above all organ and
  orchestra. A tracked beat that drifted moves onto the strongest attack near it, or onto the smooth
  local tempo through its neighbours; runs of beats locked onto the off-beat are shifted back. Sweeps
  snap to a sixteenth grid built from each beat's own length, then onto a note played within 40 ms.

### Lyrics (`engine/listen/`, `engine/lyrics.ts`)

The song's artist and title come from its tags (ID3 in MP3, Vorbis comments in FLAC, iTunes atoms in M4A,
RIFF INFO in WAV), else its file name (`tags.ts`). [LRCLIB](https://lrclib.net) is asked for synced
lyrics with those and the song's length while the song is being listened to (`lrclib.ts`); it's busy at
times, so requests are retried, and a song without lyrics plays without lyric effects.

LRCLIB's times belong to some release of the song, so the lines are slid, up to 15 s either way, to where
the singing is in this file (`align.ts`). The singer is nearly always in the middle of the stereo picture,
so the voice band leaning to the middle marks it. The slide counts only when the song's first, middle
and last thirds mostly agree on it; otherwise LRCLIB's own times are kept for a release of the same
length, or the lyrics are left out. On five sung songs, line starts landed a median 0.13–0.75 s from
word-level timing, about what LRCLIB's own times allow.

Lyrics are line-level, so the show reacts to what a line says, not to one word in it. The moments come
from one table of words (`LYRIC_WORDS` in `lyrics.ts`): a colour word colours the interiors for the line,
a scream-type word strikes lightning on its loudest attack, a word sung twice in a line pings across the
cars on its beats, and every line start is a phrase cut.

### Choreography (`engine/choreo.ts`)

`choreograph()` runs the steps in order:

1. **Phrases** (`phrases.ts`). Phrases end at rests, after held notes, at arrivals, at texture changes and
   line starts, and last at most 8 s. Each gets a **gesture**: motif, run, figuration (fast single
   notes), trill, chords, cadence or recitative (slow notes).
2. **Mood** (`mood.ts`). Each phrase gets an energy from its loudness, its section's ceiling and its note
   density, and a mood that sets the pace: *calm* once a bar with soft ramped glows, *groove* every other
   beat, *drive* every beat, *frenzy* half-beats, kept for climaxes.
3. **A formation per phrase** (`choosePlan`): **unison**, one move on every car, or **split**, the side
   cars in one move and the centrepiece in another (see [the stage](#the-stage)). The candidates are the
   gesture's own list plus every catalogued move whose gestures and moods fit (`catalog.ts`; every move
   is in [MOVES.md](../MOVES.md)). Then the rules:
   - least used first: no move takes more than about 7 % of a song, and no formation plays twice running;
   - in lively sections at least 60 % of the picks are *collaboration* moves, where the cars pass
     something between them;
   - each section leans unison or split, so the texture changes with the form;
   - a repeated section replays its formations, a step bigger when its ceiling allows, and from the third
     hearing a sibling move on the same grid;
   - a full-power section uses only strong moves; beat-locked moves need a clear beat.
4. **The moves** (`moves.ts`) draw their lights, a quarter second of black before a big one, and a flash
   on the truck's bar when the formation changes kind. `darknessGuard` keeps any lively phrase from
   playing out mostly dark.
5. **The beat layer** (`pulse.ts`). Concert lighting gives the beat to the fixtures with the most visual
   mass, so the **headlights carry the beat** wherever the music is lively and its pulse is clear, and the
   moves keep the signatures, DRLs, fogs, turns, markers and the bar. The downbeat is biggest (every
   headlight and a flash of every front bar), beat 3 next, beats 2 and 4 the side cars only, off-beats only
   in frenzy. Hits are about 120 ms with darkness between. In driving passages the sustained lamps dip
   for a few frames before each hit (the producer's sidechain trick), so every beat lands dark to bright.
   The pulse drops out under a build and comes back on the landing; music with no clear pulse gets none.
6. **Cues** (`cues.ts`, `lyrics.ts`): moments laid over the moves. Every song gets a default sheet: the
   last section may peak, and the lids rise into the loudest moment of the last quarter. The lyric
   moments come in here. (The songs of the first event, matched by file name, have their own sheets.)
7. **Interiors and the finale**: the cabin lights glow purple to orange with the intensity, take the
   lyric colours, and the whole stage hits on the music's last strong beat and fades out.
8. **Motors** (`motors.ts`). See [the motors](#the-motors).
9. **Per car** (`tidy`): flashes shorter than 100 ms are stretched and gaps under 60 ms opened up, so
   rapid notes read as separate flashes; a 2025+ Model Y's frames are translated to its lamps (`lamps.ts`,
   [below](#the-2025-model-ys-lamps)); and the last frames are dark.

Slow, flowing music with no beat to follow gets the **legato** style (`legato.ts`): a bed of lamps that
join and leave in layers as the music swells, always on 2 s ramps; the melody as one light gliding across
the stage by pitch; the interiors warming from blue to gold; a slow fade at the end.

### Output

Each car's frames become an FSEQ file (`viewer/core/fseq.ts`): version 2, uncompressed, 200 channels,
20 ms frames, Tesla's format, naming its audio file. The song is written as a 44.1 kHz 16-bit stereo WAV
(`app/wav.ts`), and every car's `LightShow` folder (the `.fseq` and the `.wav`) goes into one ZIP, stored
without compression, which show files and audio barely need (`app/zip.ts`, `app/DownloadSheet.tsx`).

### The 3D preview (`viewer/`)

The preview draws the lineup on Tesla's own models from the Tesla app, on a night parking lot after rain
(`car/lot.ts`). Each car (`rig.ts`) is built from its app model (`car/appBody.ts`): the app keeps each
kind of lamp in one mesh, so lamps are split by where each triangle sits (per side, inner and outer, the
Cybertruck's bars LED by LED), and closures play the app's own animation clips. `core/simulate.ts` turns
the show's bytes into what each car does, frame by frame: lamp brightness following Tesla's ramp rules,
and closure positions following their travel times. Glow sprites (`glow.ts`) light every lamp in one draw
call. Renderer and lighting follow Tesla Lightshow Studio (AGPL-3.0), tuned for an iPad: the pixel ratio
is capped and the bloom switches off when the device is slow.

The models and the paint table are served from `models/tesla-app/`, from the repository's `car-models`
release. Every car offers every paint in the app's table (it doesn't say which paints each model was sold
in), except the Cybertruck, which only comes in stainless. Lamps the app has no model of stay dark in the
preview: the front fogs and aux park lamps of the 2024+ Model 3 and the Model Y Standard (they may not have
them), the Model Y L's front turn signals and reverse lamps, and the Model X's rear fog.

## The stage

Each car has two **slots**, its crowd-left half and its crowd-right half. A note's pitch picks a slot
(`moves.slotFor`): low notes on the crowd's left, high on the right, so a scale scrubs across the lineup
like a keyboard. Each phrase stretches its own pitch range across the whole stage, so every phrase uses
every car.

Moves are written for two **roles**, so one move works for any lineup:

- **The centrepiece**: the Cybertruck nearest the middle (`moves.centreTruck`, `null` without one). Its
  front bar is 60 separately driven LEDs, so it plays what lamps can't: comets, sweeps, a level meter, the
  pop at the top of a build. It takes a wider share of the pitch range, so runs sweep visibly across it.
- **The side cars**: every other car (`moves.sides`). Each plays its eight front lamps, crowd-left to
  right: signature, DRL, outer beam, inner beam, then the mirror image.

MOVES.md uses the classic lineup's names: "the truck" is the centrepiece and "the Ys" are the side cars.

| Lineup | Centrepiece | Side cars | What changes |
|---|---|---|---|
| `YCY` (classic) | the Cybertruck | both Ys | nothing: the moves were designed for this |
| `YYCYY` | the middle Cybertruck | all four Ys | ripples, keyboards and relays run across four cars |
| `YC`, `CY` | the Cybertruck | the Y | the centrepiece is at one end; low notes still sit on the crowd's left |
| `CYC`, `CCC` | the middle truck | the others, trucks included | a side truck plays its lamps, and its bar when a note lands on it |
| `Y`, `YY`, `SXm` | none | every car | a split plays its side-car half on every car; bar moves fall back to whole-stage versions |
| `C` alone | the truck | the truck too | one car plays both parts |

Every car but the Cybertruck speaks the Model Y's lamp vocabulary: Tesla's Model S, 3 and X take the same
channels, and the cars with a front light bar (the 2025+ Model Y and the Model Y L) translate them at the
end. The lineup letters are in `engine/vehicles.ts`.

Tesla's channels are named for the vehicle's own left (the driver's side), which is on the crowd's
*right*. `Car`'s lamp groups (`engine/car.ts`) flip every side, and the front bar's pixels are written
crowd-left to crowd-right.

## The moves

The catalogue's `grid` says what a move locks to:

| Family | Locks to | Examples |
|---|---|---|
| note-following | the notes, thinned to the mood's pace | `keyboard`, `relay`, `mirror`, `rotation`, `rain`, `block` |
| beat | the beat map, every 2nd or 4th beat when calm | `wave`, `converge`, `pinball`, `march`, `checker`, `ping_pong` |
| bar | the downbeats | `heartbeat`, `curtain`, `stripes` |
| build | a whole crescendo, landing on its peak | `out_in`, `fill_stage`, `implode`, `accelerando` |
| self-paced | its own timing | `motif`, `shimmer`, `cadence`, `meter` |
| split | a side-car move plus a centrepiece move | `y_ripple_in` with `ct_comets`, `y_chords` with `bar_collide` |

Many come from studying community xLights shows, including Tesla's own five-car "The Arrival" and
"Cyber Symphony": `curtain`, `marquee`, `shockwave`, `sparkle`, `sunrise`, `scanner`, `ping_pong`,
`metronome`, `stripes`, `flutter`, `accelerando` and `teardown`.

## The motors

The motors are a second stage: slow, limited and loud, so they're saved for the moments that earn them.
Moves are planned backwards from the travel times, so a lid is fully open exactly on its peak.

| Closure | Travel (approx.) | Commands per show | Notes |
|---|---|---|---|
| liftgate (Cybertruck: frunk) | open 14 s (frunk 10 s), close 4 s | 6 | dances only once fully open |
| each window | 4 s | 6 | can dance from any position |
| each mirror | 2 s | 20 | no dance |
| charge port | 2 s | 3 | its Dance is the rainbow light; closes itself 2 min after opening |
| Model X falcon doors | open 20 s, close 8 s | 6 each | |

Only Open, Close and Dance count. Dancing more than about 30 s per show risks a thermal cut-out. Tesla's
README is the only published source for these; the Cybertruck's frunk isn't in it and was timed on a 2024
truck. Some older Model Ys open their liftgates only part way until the opening height is reset to its
default.

- **Lids: the opening is the crescendo.** On the biggest builds every lid opens, lands on the peak a beat
  after its neighbour, dances through the loud stretch and closes in the same order. Other builds get
  part-way figures: a relay (one lid lifts and stops, and as it drops the next lifts), an alternation
  (the side cars, then the centrepiece) and a wave.
- **Windows stay down.** The music plays from the cabin speakers, so the crowd hears it through the open
  windows. They dance in about 4.5 s bursts rolling across the cars, and 10 s on the biggest peak: about
  24 s per window in all.
- **Mirrors** pulse to the tempo in the steadiest loud section, fold on the big landings in patterns (a
  wave, outside-in, every other car), and fill the longest stretches where nothing else moves.
- **The charge port** opens for the most exciting stretch of the song and dances its rainbow light,
  closing before its own 2-minute timer.
- **A Model X's falcon doors** rise into the song's biggest peak, dance and close. Its windows keep still
  meanwhile: Tesla warns that moving windows can trip the doors' pinch detection and stop the show.

`Car.closure()` refuses any command past Tesla's limit, and `vehicles.test.ts` checks every car letter
against the limits.

## Rules every show keeps

- Tesla's per-show command limits for every closure, Dance only once a lid is fully open, and about 30 s
  of motor dancing at most.
- 200 channels, 20 ms frames, FSEQ v2 uncompressed.
- Choreography in the crowd's left and right; car 1 is the crowd's left.
- **Deterministic**: the same song and code give byte-identical files. The few "random" sparkles come
  from numpy's generator, ported bit for bit (`engine/rng.ts`), seeded from the phrase.
- Lights lead the sound by one 20 ms frame (`LIGHT_LEAD_S`): the eye forgives early, not late.
- Every car is lit for most of the song; no lively phrase plays out mostly dark.

## The 2025+ Model Y's lamps

Tesla's documentation predates the 2025+ Model Y ("Juniper"). Two on-car tests in October 2026, Tesla's
light-show issue #183 and [Nghtmare7509/tesla-lightshow-juniper](https://github.com/Nghtmare7509/tesla-lightshow-juniper),
which tested every channel alone, agree on its front: headlights (channels 1/2), lower white lamps (3/4),
the light bar's outer ends (7/8, "channel 4", one per side), its whole centre (11/12, "channel 6", either
side), amber turns (13/14) and fender repeaters (21/22). Signature, channel 5, fogs, aux park and side
markers do nothing, and the bar is not separately controllable LED by LED.

The choreography still writes the Model Y's lamp vocabulary, and `lamps.ts` translates it at the end: a
side's accents light that outer end of the bar plus the centre, the fogs' glow and bass pulses light the
centre, the side markers become the fender repeaters, and flashes drawn on the bar light the matching
sections. The 60-pixel picture is still written in case a software version reads it.

## Browsers

Checked on the built site, served statically under `/carreography/` like GitHub Pages, with Playwright on
an M1 Max: Hall of the Mountain King (2:34, WAV) for three cars, from "Make the show" to the finished show,
and the peak memory of the busiest browser process. Every run played and downloaded a valid ZIP.

| Browser | WebGPU | Pool | One thread |
|---|---|---|---|
| Chromium 156 | 10.7 s, 1.3 GB | 20.0 s (4 workers), 6.1 GB | 38.0 s, 1.8 GB |
| Firefox 157 | no adapter | 26.7 s (2 workers), 2.6 GB | 42.8 s, 1.8 GB |
| WebKit 27.2 (Safari) | not used (below) | 24.3 s (2 workers), 3.8 GB | 40.4 s, 2.6 GB |
| WebKit as iPad Pro 11 | not used | none on tablets | 36.5 s, 2.6 GB |
| WebKit as iPhone 17 | not used | none on phones | 37.1 s, 2.5 GB |

| Forced failure | Chromium | Firefox | WebKit |
|---|---|---|---|
| WebGPU device refused: pool | 24.9 s | | |
| WebGPU device lost mid-run: pool | 22.0 s | | |
| A pool worker dies mid-run: one thread | 43.3 s | 48.1 s | 45.7 s |

Danse Macabre (6:46) takes 19 s in Chromium on WebGPU and 55 s in Firefox's pool. MP3 and FLAC were
checked in all three too.

- **Safari** (WebKit, which every browser on an iPhone or iPad is) crashed the page whenever a worker that
  had used WebGPU ended: a few seconds after the show, or on reload, even with its device destroyed. WebGPU
  was 1.5–3 times faster there, but a crash is worse than a wait, so WebKit listens on the CPU.
- **Firefox** has `navigator.gpu` but gives no adapter on macOS, so it uses the pool.
- **iPhone and iPad** were emulated with WebKit's device profiles, which can't show a real device's memory
  limit or frame rate. They listen on one thread (about 1 GB at its peak).
- **The same show everywhere.** With a 44.1 kHz WAV, Hall of the Mountain King's files are byte-identical
  in every browser and on every backend; Danse Macabre's are too, except 6 bytes of the Cybertruck's in
  Firefox (one brightness level on a light-bar pixel). An MP3's or FLAC's show can differ a little.

Tried and dropped along the way: Essentia.js (slower, and its beats disagreed), the npm basic-pitch
decoding (minutes per song), the smaller beat model (too inaccurate on organ music), ONNX Runtime's JSEP
build (wrong beat output on WebGPU), and Whisper in the browser (a download of hundreds of MB, and
unreliable).
