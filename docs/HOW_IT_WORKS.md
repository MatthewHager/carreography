# How the shows are made

The technical tour: how a recording becomes a three-car light show, and the tools for checking one.
For running the project, see the [README](../README.md).

## The pipeline (`lightshow/`)

1. `transcribe.py` — polyphonic note transcription with basic-pitch (MIDI-like: start, end, pitch, amplitude; ~19 notes/s in the Toccata).
2. `texture.py` — notes become events (a key press or a chord: octave doublings collapsed), then every
   event is labelled with the texture of its passage: melody, run up/down, zigzag figuration, trill, chords,
   arrival (big chord after a run), climax.
3. `audio.py` — beats (tempo-following), loudness, intensity tiers 0–3 that build across the piece,
   crescendo (build) detection, strong accents, how beat-locked the music is.
4. `form.py` — the form map, read before any phrase is choreographed: sections from beat-synchronous
   chroma + timbre, repeated material lettered (A, B, A'…), a per-section intensity *ceiling* that
   shapes the arc (the loudest third may go all-out, nothing before the climax section gets the top
   tier, every repeat of a letter is allowed one step more), and per-section tempo.
   `stems.py` — for band recordings (`--stems`), Demucs separates vocals / drums / bass / other first:
   the melody is transcribed from vocals + other, the bass line from the bass stem, beats and hits
   from the drums. `cues.py` — a cue sheet per song: the signature moments (the Toccata's opening
   mordent on the truck alone, the cadenza chord; the "This is Halloween!" shouts; the final
   chorus...) located in the recording by detectors and applied as overrides.
5. `phrases.py` + `moves.py` + `choreo.py` — the choreographer. The piece is split into phrases
   (between rests, after held notes, at arrivals, at texture changes, max 8 s). Each phrase gets one
   *formation*: **unison** (one move on all three cars) or **split** (the two Ys in one move, the
   Cybertruck in another). The chooser matches moves to the phrase's gesture and intensity, keeps
   variety (least-used first, each section leaning unison or split, never the same twice running).
   A repeated section replays the formations it had the first time, escalated one step when the arc
   allows more (callbacks). A quarter-second of black precedes every big move, and the truck's bar
   flashes a handoff when the formation kind changes. Every move is synchronized to the transcribed notes.

   **Mood and pacing** (`mood.py`). Every phrase gets an energy (loudness, the form map's ceiling,
   note density) and a mood that sets how hard the lights hit:
   *calm* once a bar with soft ramped glows, *groove* every other beat, *drive* every beat,
   *frenzy* half-beats, kept for climaxes and trills. In calm passages, note-following moves are
   thinned to their strongest note per bar and ring until the next (runs and motifs keep every note);
   beat moves slow to every 2nd/4th beat; drums and percussion layers step back. Builds can't start in
   calm passages. After a build the stage either *tears down* layer by layer when the music drops, or
   lands a *shockwave* when it stays up.

   **The move catalogue** (`catalog.py`, rendered to [MOVES.md](../MOVES.md) on every build) describes
   each of the 45 unison and 12 split moves: what the audience sees, the moods and phrase shapes it
   suits, and what it locks to (notes, beats, bars, or a whole build). The chooser takes the gesture's
   candidates plus every catalogued move that fits the phrase's gesture and mood, and drops anything
   outside its mood range. A repeated section replays its formations (callbacks), but only if they
   still suit the mood; from the third hearing on they're varied with a sibling move on the same grid.
   No move may take more than ~7 % of a song. The community-show moves (curtain, colour-wash breathing,
   marquee, crossing sweeps, shockwave, sparkle, sunrise, scanner, ping-pong, metronome, stripes,
   flutter, accelerando, teardown) come from the xLights sequences in `vendor/` (Tesla's 5-car
   "The Arrival", "Cyber Symphony", the community Toccata); see the timing rules in the catalogue.

   **The beat layer** (`pulse.py`). Concert lighting keeps a show readable by giving the beat to
   the fixtures with the most visual mass and the effects to the rest. Here the headlights of all
   three cars carry the beat wherever the music is lively and its pulse is clear; every move keeps
   the signatures, DRLs, fogs, turns, markers and the truck's bar. Hits are short and hard (about
   120 ms) with darkness between, and land about 40 ms ahead of the music (the eye forgives early, not
   late). The downbeat is biggest (every headlight plus a flash of every front light bar), beat 3 next, and beats 2 and 4
   are the Ys only. The pattern follows the mood: a strong beat under a quiet verse gets a small
   half-time step on the inner beams; a groove thumps on the inner beams; drive on every headlight;
   frenzy adds off-beats. Through a build the pulse intensifies (Ys, then every car, then eighths,
   then half a beat of black) and the build lands on the next downbeat. In driving passages the
   sustained feature lamps *duck* for a few frames before each hit (sidechain ducking, as producers do
   so a kick cuts through pads), so every beat lands as dark-to-bright. Organ pieces get a half-time
   pulse except where the music pounds; songs held quiet (Ave Maria) get none. Cue-sheet and lyric
   hits are snapped onto the beat. Each show's `pulse.txt` lists the decision for every phrase.

   **Continuous quantization** (`tempo.py`, `moves._snap`). These recordings aren't metronomic,
   above all the organ. The tracked beats are turned into a beat map that follows the performer: a
   beat that already sits on a played attack stays; a beat that drifted moves onto the strongest
   attack near it, or onto the smooth local tempo through its neighbours (never across a fermata).
   Before that, a phase check compares the music's onset strength on the beats with half and quarter
   beats off, window by window, and shifts any run of beats that locked onto the off-beat (the beat
   tracker's half-time folding used to take every other beat from the first one, which put a whole
   section anti-phase); downbeats are phased section by section. Every beat is then snapped onto the
   peak of the music's attack curve (the drums when separated), refined between the tracker's 23 ms
   frames - Thriller's tracked beats sat a whole frame after the kick.
   Sixteenths are subdivided from each beat's own length, and a sweep step snaps to that grid and
   from there onto a note actually played within 40 ms. Ripples and flams span musical lengths
   (half a beat, thirty-seconds), so they start on the beat whatever the tempo.

   | gesture | unison moves | split moves (Ys | truck) |
   |---|---|---|
   | motif (ornament → run → held note) | motif: ticks on the truck, sweep across the stage, hold where it lands | |
   | run | keyboard (low left → high right), relay, cascade | y_keyboard over the 16 Y lamps | ct_scan |
   | figuration (fast single notes) | lr_notes, rotation, mirror, keyboard, wave, converge, call_response, meter, pinball, syncopate, rain, tug_of_war, antiphony, checker, beam, lr_channel | y_keyboard, y_ripple in/out, y_turn_ticks, y_bass_fogs | ct_meter, ct_comets, ct_scan, ct_edge_pulse |
   | beat-driven (band songs) | lr_beat, march (left-right-left-right), syncopate, pinball, checker, beam, lr_channel | | |
   | crescendo | out_in (corners → truck, bar fills, black, pop), fill_stage, bounce_build, implode (build into the middle, then a slow fade) | |
   | chords | block, meter, fade_cross (slow crossfade left ↔ right), bar_collide | y_chords | ct_meter |
   | recitative (slow notes) | pulse, heartbeat, expand_contract | y_breathe | ct_comets / ct_swell |
   | trill | shimmer | | |
   | cadence / arrival | all_on / lightning with a blackout before | | |

   In lively sections at least 60 % of the chooser's picks are three-car *collaboration* moves (the
   stage-wide sweeps, builds, ping-pongs and checker patterns), so the show reads as one instrument
   rather than three cars blinking.

   Closures (`motors.py`) are their own side stage, every figure crossing the cars:
   - **Lids** (frunk / liftgates): the opening *is* the crescendo. The three biggest builds each get a
     different figure — *relay* (one lid lifts part way and Stops; as it drops the next lifts; the last
     rises all the way onto the peak — left→right, then right→left next time), *alternate* (the Ys
     lift together and the truck's frunk rises onto the peak as they drop) and *wave* (2 s apart).
     Leftover pairs become slow half-open breaths rolling across the lineup on long calm phrases.
   - **Windows** never close during a show: Tesla's README points out that the music only plays from
     the cabin speakers, so the crowd hears it through the open windows. All four go down at the
     start; the waves are short Dance bursts (a lowered window dancing bobs up a little), fronts
     first and rears half a burst later, rolling across the cars (left to right, right to left, Ys
     then truck); the biggest peak gets an 8 s dance; a final Open leaves every window fully down.
     About 12 s of dancing per window per show, under Tesla's ~30 s thermal recommendation.
   - **Mirrors**: a tempo pulse in the steadiest loud section cycling through Ys-vs-truck, left-half-
     vs-right-half and a ripple, on a cycle long enough (one, two or three bars) that every 2 s fold
     completes before the unfold; plus fold-and-unfold gestures on the biggest landings (wave, car
     alternate, outside-in, every-other, inside-out, together).
   - **Charge port** opens 2.5 s before the climax (Dance only works once it's open) and dances its
     rainbow LED for at most 30 s, well inside its 2-minute auto-close.
   All within Tesla's per-show limits. `tools/closure_audit.py` checks every show against those rules;
   `tools/motor_log.py <show> [liftgate|windows|mirrors|port]` prints the motor script in time order.

   **The legato style** (`legato.py`, `"style": "legato"` in `setlist.json`) is for slow, flowing music
   with no beat to follow (Ave Maria). The beat-driven moves would leave it dark much of the time, so
   the lights follow the music's breath and melody instead: a bed of lamps that join and leave in
   layers as the music swells (the truck's bar glowing at the music's level, then the Ys' signature
   strips, DRLs, fogs, and every headlight only at the climax), always on 2 s ramps; the melody as one
   light gliding across the stage by pitch (a spot sliding along the truck's bar, the Ys' inner beams
   fading in as it passes); the interiors warming from blue to gold; a slow fade at the end.
6. `fseq.py` — writes FSEQ v2 uncompressed, 200 channels, 20 ms (Tesla's format). `vendor/light-show/validator.py` is Tesla's checker (setup.sh fetches it).

### Motor timing: what's known and what isn't

Tesla's light-show README is the only published source (checked October 2026; owner forums and videos
give no stopwatch times, and nothing at all for the Cybertruck frunk):

| closure | travel (approx.) | commands per show | notes |
|---|---|---|---|
| liftgate (Cybertruck: frunk) | open 14 s, close 4 s | 6 | dances only once fully open |
| each window | 4 s | 6 | can dance from any position |
| each mirror | 2 s | 20 | no dance |
| charge port | 2 s | 3 | Dance = rainbow LED; closes itself 2 min after opening |

Only Open, Close and Dance count toward the limits (Stop doesn't); Idle lets a move in progress
finish; Stop halts at once; dancing more than ~30 s per show risks a thermal cut-out. Tesla's
validator checks only the file format and the 4-hour maximum - not these limits - which is why
`tools/closure_audit.py` exists. Measured on the community shows in `vendor/` (see SOURCES.md):
creators routinely reverse mirrors at 45-90 % of their travel, and Tesla's own 5-car example starts a
liftgate dancing 12.8 s after Open and uses four charge-port commands; these shows are stricter.

**Time the Cybertruck frunk at the parking-lot test.** The shows assume 14 s. If it differs, set
`LIFTGATE_OPEN_S["cybertruck"]` in `lightshow/motors.py` (and, for the preview, the liftgate entry
`closure(6, true, 14, 4)` in `preview3d/src/core/channels.ts`, then rebuild the viewer). Owners
report liftgates that open only part way on some older cars until the liftgate's opening height is
reset to its default; check each Model Y opens fully.

## Checking a show

- **3D viewer** (the preview): start the server from this folder —
  `python3 -m http.server 8765 --bind 0.0.0.0` — and open `http://<this Mac's IP>:8765/`
  (it redirects to `preview3d/dist/`; works from an iPad on the same Wi-Fi, tap Play once for audio).
  Three cars from Tesla's own models on a night lot: every lamp and light-bar LED driven from the
  real show files, closures moving at their travel times, the truck's bar tilting with the frunk lid,
  the Ys' frunks open with the candy lights and dry-ice fog. Rebuild after code changes with
  `cd preview3d && npm install && npm run build` (see `preview3d/README.md`; built on
  Tesla Lightshow Studio, AGPL-3.0).
- **Quantization** — `tools/quantize_check.py <show>`: for each phrase, the share of light hits on
  the performer-following sixteenth grid and on played attacks, flagging beat moves that drift
  (currently 96 % of the Toccata's hits and 93 % of This Is Halloween's land on one or the other).
  `tools/move_lab.py <show> [move ...]` renders each move alone on the song's saved analysis and
  measures the same, so a new move can be checked before it's ever chosen.
- **Recording a preview video** — start `python3 tools/frame_sink.py <frames_dir>` (port 8767), open
  the viewer, and in the page console run `await __viewer.recorder.setup(); __viewer.recorder.record('<show>', 24)`:
  it pins the stage to 1280×720 with a locked front camera and renders every frame at an exact time,
  so the video is frame-accurate however slowly it renders. Then `.venv312/bin/python tools/video_review.py <show> <frames_dir> 24 [t0-t1 ...]` muxes
  the song's audio into `output/<show>/<show>_preview.mp4`, measures light-vs-audio sync from the
  video itself, prints how busy each car is through the song, and writes contact sheets to `checks/`.
- **Feeling the beat** — `tools/feel.py <show> [t0 t1]` models what the crowd sees (every front
  lamp weighted by how bright it reads, ramps simulated) and measures, section by section, how
  clearly the music beats, how strongly the light pulses on the beat (phase-locking), the share of
  beats with a visible hit, the downbeat accent and the lead; with a window it draws a strip of the
  drums against each car's brightness. `tools/feel_all.py` runs it over the set list and flags
  sections where the beat map looks off-phase (two witnesses: onsets and notes) or where the lights
  hit fewer beats than the beat layer meant to. `tools/pick_moments.py` + the viewer recorder's
  `shoot` + `tools/beat_sheet.py` give on-the-beat vs half-a-beat-later frames to judge by eye.
- **Timeline strips** (notes vs lights, for checking sync by eye):
  `.venv312/bin/python tools/timeline.py 01_toccata_and_fugue 36 48` → `checks/timeline_*.png`.
- **Orientation check**: `.venv312/bin/python tools/orientation_test.py` builds a 12 s calibration show
  (slots march crowd-left to crowd-right, then the bar sweeps); open the viewer with `?labels=1` to see
  car names and which side is the vehicle's left. All choreography is in the crowd's left/right; Tesla's
  channel names are the vehicle's, which `Car._veh()` flips.

## Study material

After `setup.sh`, `vendor/light-show/` is Tesla's light-show repo (its validator and multi-car
examples). The community shows and xLights sequences that informed the move vocabulary (Tesla's 5-car
"The Arrival", "Cyber Symphony", a community Toccata) came from public repos listed in
[docs/SOURCES.md](SOURCES.md).

## The 2025+ Model Y's light bar

The event's Model Ys are the 2025+ model ("Juniper"), which has a light bar across the nose where
the older Model Y had a signature/DRL strip in each headlight. Tesla's documentation predates it.
Owners report the bar as 60 LEDs on the Cybertruck's front-bar channels (light-show issues #144 and
#166), but an on-car test of a 2027 Model Y (#183) found those channels did nothing there, while
channel 6 faded the whole bar and channel 4 the outer white strips. `lamps.py` covers both: the
choreography still writes the Ys' accent lamps (signature and channels 4-5), and a finishing step
draws them on the bar - crowd-left accents on the crowd-left half, right on the right - as pixels,
and writes the same lamps, or any flash drawn on the bar directly, to channel 6 as the whole bar.
The beat layer flashes every car's bar on the downbeat. `make_lineup` in `choreo.py` takes `Y` for
a 2025+ Model Y and `y` for a 2020-24 one, which keeps channels 4-6 as its DRL strip.

## The diagnostic show

`00_diagnostic` is generated by `lightshow/diagnostic.py` rather than from music. Its script is a list
of announcements, each with an action; macOS's `say` speaks them into `songs/00_diagnostic.wav`, and the
spoken clips' lengths fix the timeline (`songs/00_diagnostic.json`) that the lights and motors follow.
Every announcement opens with a short tone that all three cars flash with, so sync is checked from
start to finish. Both files are committed, so the show rebuilds without a Mac; they are only
regenerated when the script changes. `make_usb.py` puts it on each car's drive with the songs.
