# The choreography

How a song becomes a light show, and why it looks the way it does. This is the strategy guide:
read it before designing a move or changing how moves are chosen. For the module-by-module tour,
see [HOW_IT_WORKS.md](HOW_IT_WORKS.md). For the moves themselves, see [MOVES.md](../MOVES.md).

## The idea

**The lineup is one instrument.** A row of cars blinking along with the music is easy to make and
dull to watch. The shows here treat the whole row as a single stage, like a keyboard or a band:
- a melody runs across the cars;
- a chord fills the stage;
- the beat thumps through every headlight at once;
- a build sweeps in from both ends and lands on the middle;
- the cars pass phrases between them, call and response.

Four principles follow from that.

1. **Every light follows the music, not a clock.** Each move is locked to something the music is
   doing: the notes actually played, the beat the performer is actually keeping, the bar, or a
   crescendo. Nothing runs on a free timer, so a chase speeds up when the music does.
2. **Contrast makes it readable.** A light that's always on carries no information. Hits are short
   and hard with real darkness between them. Big moves get a breath of black first. Calm music
   gets slow glows, not strobes. The song's arc is saved for its climax.
3. **The crowd's view is the only view.** All choreography is written in the crowd's left and right,
   facing the cars' fronts. Tesla's channels are named for the vehicle's own left (the driver's
   side), which is on the crowd's *right*. `Car._veh()` flips every side, and the front bar's pixels
   are written crowd-left to crowd-right.
4. **Variety, then callbacks.** No move is overused. A section that comes back gets the same
   formation it had the first time, a step bigger, so the show has a shape you recognise.

## From recording to show

```
recording ─► listen ─► map the form ─► cut phrases ─► choose a move per phrase ─► beat layer
                                                                          │
     motors (lids, windows, mirrors, port) ◄─────────────── signature cues ◄┘
                                     │
                     per-vehicle output (2025+ Model Y lamps) ─► FSEQ per car
```

1. **Listen** (`audio.py`, `transcribe.py`, `tempo.py`, `stems.py`, `lyrics.py`).
   - The notes: start, end, pitch and loudness, from basic-pitch.
   - The beat and downbeats, from Beat This! or librosa, turned into a beat map that follows the
     performer.
   - Loudness, accents and crescendos.
   - Intensity tiers 0–3.
   - For band recordings, Demucs separates vocals, drums, bass and other first, so the kick, snare
     and hats can each drive their own lights. For sung songs, faster-whisper times the lyrics.
2. **Map the form** (`form.py`).
   - Sections are found from harmony and timbre, and repeats are lettered A, B, A′.
   - Each section gets an intensity **ceiling** that shapes the arc. The loudest third may go
     all-out; nothing before the climax gets the top tier; each repeat may go one step higher.
3. **Cut phrases** (`phrases.py`, `texture.py`).
   - Phrases end at rests, after held notes, at arrivals and at texture changes, and last at most
     8 s.
   - Each phrase gets a **gesture**: *motif*, *run*, *figuration* (fast single notes), *trill*,
     *chords*, *cadence* or *recitative* (slow notes).
   - Each phrase gets a **mood** (`mood.py`) from its energy, and the mood sets the pace:
     - *calm*: once a bar, soft ramped glows;
     - *groove*: every other beat;
     - *drive*: every beat;
     - *frenzy*: half-beats, kept for climaxes.
4. **Choose a move per phrase** (`choreo.py` with `catalog.py` and `moves.py`). See below.
5. **The beat layer** (`pulse.py`) puts the pulse in the headlights under every move. See below.
6. **Signature cues** (`cues.py`, `lyrics.py`): known songs can name their own moments.
   - Examples: the Toccata's opening mordent on the centre truck alone; "This is Halloween!" shouts
     hitting the whole stage; the lid peak on the final chord; lyric reactions like "eyes glowing
     red" turning the interiors red.
   - Unknown songs get a default sheet: the last section may peak, and the lids rise into the
     loudest moment of the last quarter.
7. **Motors** (`motors.py`): the liftgates, frunks, windows, mirrors and charge port as a second
   stage. See below.
8. **Per-vehicle output** (`lamps.py`). The choreography writes a common lamp vocabulary. A 2025+
   Model Y has different hardware, so its frames are translated at the end (see HOW_IT_WORKS).
9. **Write FSEQ** (`fseq.py`): one 200-channel, 20 ms file per car, in Tesla's format.

## The stage

### Slots and pitch

Each car has two **slots**, its crowd-left half and its crowd-right half. A note's pitch picks a slot:
low notes on the crowd's left, high notes on the right, so a scale scrubs across the lineup like a
keyboard (`moves.slot_for`). Each phrase stretches its own pitch range across the whole stage, so
every phrase uses every car.

### Roles: the centrepiece and the side cars

Moves are written in terms of two roles, so one move works for any lineup:

- **The centrepiece**: the Cybertruck nearest the middle of the line (`moves.centre_truck`). Its
  front bar is 60 individually driven LEDs, so it plays what lamps can't: comets gliding along it,
  sweeps, a level meter, the pop at the top of a build. It takes a wider share of the pitch range
  (40 % in a three-car line) so runs sweep visibly across it.
- **The side cars**: every other car (`moves.sides`). Each plays its eight front lamps, crowd-left
  to right: signature, DRL, outer beam and inner beam, then the mirror image. These lamps are the
  notes of a keyboard, the steps of a ripple, the eyes that wink.

The move descriptions in MOVES.md use the classic lineup's names: "the truck" means the centrepiece
and "the Ys" means the side cars. This is how they map:

| lineup | centrepiece | side cars | what changes |
|---|---|---|---|
| `YCY` (classic) | the Cybertruck | both Ys | nothing: the moves were designed for this |
| `YYCYY` | the middle Cybertruck | all four Ys | ripples, keyboards and relays run across four cars instead of two |
| `YC`, `CY` | the Cybertruck | the Y | the centrepiece is at one end; low notes still sit on the crowd's left |
| `CYC`, `CCC` | the middle truck | the others, trucks included | a side truck plays its lamps as a side car, and also its bar when a note lands on it |
| `Y`, `YY`, `yyy` | none | every car | a split formation plays its side-car half on every car; bar moves fall back to whole-stage versions |
| `C` alone | the truck | the truck too | one car plays both parts: lamps and bar |

Any truck shows its bar when a note lands on it, whatever its role. Junipers' bars light through
their own mapping (see [the 2025+ Model Y's lamps](HOW_IT_WORKS.md#the-2025-model-ys-lamps)).

### Formations

Each phrase gets one **formation**:

- **unison**: one move across the whole stage (`wave`, `keyboard`, `out_in`...);
- **split**: the side cars do one move while the centrepiece does another (`y_keyboard | ct_comets`).
  In a lineup without a Cybertruck, every car plays the side cars' half.

## Choosing moves

`choreo._choose_plan` picks a formation for every phrase. The candidates come from two places:

1. **The gesture's own list** (`_formations_base`). For example, a run gets `relay`, `keyboard` or a
   split keyboard; chords get `block`, `meter`, `fade_cross` or swells; a crescendo gets a **build**
   (`out_in`, `fill_stage`, `bounce_build`, `implode`, `accelerando`), which shapes the whole rise
   and lands on the peak.
2. **Every catalogued move** whose gestures and moods fit (`catalog.candidates`). A move only ever
   plays in the moods it lists: a calm verse never gets a strobe, and a climax never gets a gentle
   breath.

Then the rules:

- **Least used first.** No move takes more than about 7 % of a song, and the same formation is
  never used twice in a row.
- **Collaboration.** In lively sections at least 60 % of the picks are *collab* moves: the
  stage-wide sweeps, ping-pongs and checkerboards where the cars pass something between them.
  That's what makes it one instrument.
- **Sections lean.** Each section leans unison or split, so the texture changes with the form.
- **Callbacks.** A repeated section replays the formations it had the first time, a step bigger
  when its ceiling allows. From the third hearing it's varied with a sibling move on the same grid.
- **Ceilings.** A full-power section uses only strong moves (no QUIET ones). Beat-locked moves are
  only chosen when the beat is clear (`beat_score`).
- **Transitions.** Before a big move, the stage goes dark for a quarter second, so the move lands.
  When the formation changes from unison to split or back, the centrepiece's bar flashes a handoff.

Each show's `moves.txt` lists every phrase and the move chosen for it, and `pulse.txt` lists how the
beat was handled.

## The move families

The catalogue's `grid` field says what a move locks to:

| family | locks to | examples |
|---|---|---|
| note-following | the transcribed notes, thinned to the mood's pace | `keyboard`, `relay`, `mirror`, `rotation`, `rain`, `block` |
| beat | the beat map, every 2nd or 4th beat when calm | `wave`, `converge`, `pinball`, `march`, `checker`, `ping_pong` |
| bar | the downbeats | `heartbeat`, `curtain`, `stripes` |
| build | a whole crescendo, landing on its peak | `out_in`, `fill_stage`, `implode`, `accelerando` |
| self-paced | its own timing | `motif`, `shimmer`, `cadence`, `meter` |
| split | one move on the side cars plus one on the bar | `y_ripple_in \| ct_comets`, `y_chords \| bar_collide` |

Many of the community-show moves come from studying xLights sequences, including Tesla's own
five-car "The Arrival" and "Cyber Symphony": `curtain`, `marquee`, `shockwave`, `sparkle`,
`sunrise`, `scanner`, `ping_pong`, `metronome`, `stripes`, `flutter`, `accelerando` and `teardown`.

## The beat layer

Concert lighting keeps a show readable by giving the beat to the fixtures with the most visual mass,
and the effects to everything else. Here the **headlights carry the beat** wherever the music is
lively and its pulse is clear. The moves keep the signatures, DRLs, fogs, turns, markers and the
bar.

- **Accents follow the bar:**
  - the downbeat is biggest: every headlight, plus a flash of every front bar;
  - beat 3 is next;
  - beats 2 and 4 are the side cars only;
  - off-beats are added only in frenzy.
- **The pattern follows the mood.** Calm gets at most a soft glow on downbeats; groove plays 1 and 3;
  drive plays every beat.
- **Ducking.** In driving passages the sustained lamps dip for a few frames before each hit (the
  producer's sidechain trick), so every beat lands dark-to-bright.
- **Builds own the stage.** The pulse drops out under a build and comes back full-size on the
  landing. Organ music gets a half-time pulse; music with no clear pulse gets none.

## Timing

- **One frame early.** Lights fire 20 ms (one frame) before the sound (`LIGHT_LEAD_S`,
  `pulse.LEAD_S`). The eye forgives early, not late.
- **The beat map follows the performer.** These recordings aren't metronomic. A tracked beat that
  drifted moves onto the strongest attack near it, or onto the smooth local tempo through its
  neighbours. Runs of beats that locked onto the off-beat are phase-shifted back. Sweeps snap to a
  sixteenth grid built from each beat's own length, then onto a note actually played within 40 ms.
- **Musical lengths.** Ripples and flams span half a beat or a thirty-second note, so they start on
  the beat and finish on the "and" at any tempo.

## The motors

The motors are a second stage. They're slow, limited and loud, so they're saved for the moments
that earn them:

| closure | travel | commands per show | notes |
|---|---|---|---|
| liftgate (Cybertruck: frunk) | open 14 s (frunk ~10 s), close 4 s | 6 | dances only once fully open |
| each window | 4 s | 6 | can dance from any position |
| each mirror | 2 s | 20 | no dance |
| charge port | 2 s | 3 | its Dance is the rainbow light; closes itself 2 min after opening |

Only Open, Close and Dance count. Dancing more than about 30 s per show risks a thermal cut-out.

- **Lids: the opening *is* the crescendo.** Moves are planned backwards from their travel times, so
  a lid is fully open exactly on the peak. On the biggest builds, every lid opens, lands on the peak
  a beat after its neighbour, dances through the loud stretch and closes in the same order. Other
  builds get part-way figures:
  - *relay*: one lid lifts and stops, and as it drops the next lifts;
  - *alternate*: the side cars lift together and the centrepiece rises as they drop;
  - *wave*.
- **Windows stay down.** The music plays from the cabin speakers, so the crowd hears it through the
  windows. They dance in ~4.5 s bursts rolling across the cars, with a longer dance on the biggest
  peak.
- **Mirrors** pulse to the tempo in the steadiest loud section and fold on the big landings, in
  patterns: a wave, outside-in, every other car. Their remaining commands fill the longest
  stretches where nothing else is moving.
- **The charge port** opens for the most exciting stretch of the song and dances its rainbow light,
  closing before its own 2-minute timer.

`tools/closure_audit.py` checks every show against these rules, and `tools/motor_activity.py` shows
how much of a song has something moving.

## Rules every show keeps

These are invariants; the tests and tools check them:

- Tesla's per-show command limits for every closure, Dance only once a lid is fully open, and
  about 30 s of motor dancing at most.
- 200 channels, 20 ms frames, FSEQ v2 uncompressed, under 4 hours.
- Choreography in the crowd's left and right; car 1 is the crowd's left.
- **Deterministic:** the same recording and code give byte-identical files.
- Every car is lit for most of the song. No car sits dark while the others play.
- Lights lead the sound by one frame, never lag it.

## Designing a new move

What makes a move good, learned from the ones that work:

- **Readable from 30 m.** A crowd sees lamps, not LEDs. Use whole lamps and big contrasts; an
  effect that needs the bar's 60 LEDs belongs on the centrepiece.
- **Locked to the music.** Take times from `an.events` (notes), `an.beats` and `an.downbeats`, or
  the phrase's span. Use `_beat_at` for beat-relative lengths. Never use a fixed tempo.
- **Darkness between hits.** Flash for about 100–160 ms, not the whole beat.
- **Any lineup.** Use `sides(cars)` and `centre_truck(cars)`, which may be `None`. Loop over cars by
  their order; never index `cars[1]` as "the truck".
- **The crowd's left and right.** Use the `Car` group methods (`heads("L")`, `accents("R")`,
  `lamps()`). They already flip to the vehicle's sides.
- **One idea per move.** If it needs a paragraph to describe, it's two moves.

The steps (writing it, cataloguing it, testing it alone and in a show) are in
[CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-move).
