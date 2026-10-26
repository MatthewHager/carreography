"""The move catalogue: what every move looks like, and when the choreographer may choose it.

Each entry:
  what      one line - what the audience sees across the three cars
  moods     the moods it suits (see mood.py): calm, groove, drive, frenzy
  gestures  the phrase shapes it fits (see phrases.py): motif, run, figuration, trill, chords,
            cadence, recitative
  grid      what it locks to:
              note   the transcribed notes (thinned to the mood's pace in calm/groove passages)
              beat   the tracked beats (thinned to every 2nd/4th beat when calm)
              bar    the tracked downbeats, spanning whole bars
              build  shapes a whole crescendo by itself (chosen by the build detector, not here)
              self   paces itself (cadence hits, the Toccata motif, trills)
  collab    the cars pass something between them (counts toward the three-car quota)

Split formations (the two Ys in one move, the truck in another) are listed as "y_move | ct_move".
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Move:
    what: str
    moods: tuple
    gestures: tuple
    grid: str
    collab: bool = True


ALL = ("calm", "groove", "drive", "frenzy")
LIVELY = ("groove", "drive", "frenzy")
FIG = ("figuration",)

UNISON = {
    # --- note-following: the transcription drives every light -------------------------------
    "keyboard": Move("notes play across the stage like a keyboard, low on the crowd's left, high on the right",
                     ALL, ("run", "figuration"), "note"),
    "relay": Move("one light runs the stage note by note - left Y, along the bar, right Y - with a short trail",
                  ("calm", "groove", "drive"), ("run", "figuration"), "note"),
    "lr_notes": Move("each note jumps between the left and right halves of the stage", LIVELY, ("figuration", "trill"), "note"),
    "rotation": Move("notes rotate round the six stage slots, a spinning wheel of light", ("drive", "frenzy"), FIG, "note"),
    "mirror": Move("each note lights a matching pair of slots mirrored about the truck", ("calm", "groove", "drive"), FIG, "note"),
    "call_response": Move("the Ys play a figure, the truck answers it", ("groove", "drive"), FIG, "note"),
    "antiphony": Move("two choirs: left Y and truck against right Y and truck, phrase halves alternating",
                      ("groove", "drive"), FIG, "note"),
    "pulse": Move("slow notes glow where they sit in pitch, with a soft comet on the bar", ("calm", "groove"),
                  ("recitative",), "note", collab=False),
    "block": Move("chords as solid blocks of light, held as long as the chord", ALL, ("chords", "recitative"), "note"),
    "rain": Move("notes fall as drops of light at random across the stage", LIVELY, ("trill", "figuration"), "note"),
    "motif": Move("the signature motif: ticks on the truck, a sweep across, a hold where it lands", ALL, ("motif",), "self"),
    "shimmer": Move("trills shimmer between neighbouring lamps", ("drive", "frenzy"), ("trill",), "self", collab=False),
    "cadence": Move("a big closing hit with a breath of black before it", ALL, ("cadence",), "self"),
    "meter": Move("a loudness meter: the Ys and the bar fill with the level", ("calm", "groove"), ("chords", "figuration"),
                  "self", collab=False),
    # --- beat-locked ------------------------------------------------------------------------
    "wave": Move("a wave rolls across the three cars on the beat and back", LIVELY, FIG, "beat"),
    "converge": Move("both outer cars fire toward the truck on the beat and it answers", ("drive", "frenzy"), FIG, "beat"),
    "lr_beat": Move("left half, right half, on the beat", ("groove", "drive"), ("figuration", "recitative"), "beat"),
    "pinball": Move("a hit ricochets car to car on off-beats", ("drive", "frenzy"), FIG, "beat"),
    "syncopate": Move("hits on the off-beats, cars taking turns", ("drive", "frenzy"), FIG, "beat"),
    "march": Move("one light marches car to car, left-centre-right-centre; half time when calm",
                  ("calm", "groove", "drive"), ("figuration", "recitative"), "beat"),
    "tug_of_war": Move("the light is pulled toward one end and yanked back, beat by beat", ("drive", "frenzy"), FIG, "beat"),
    "checker": Move("a checkerboard across the six slots and the bar flips every beat", LIVELY, FIG, "beat"),
    "lr_channel": Move("whole left half of the stage on one beat, whole right half on the next",
                       ("groove", "drive"), ("figuration", "recitative"), "beat"),
    "heartbeat": Move("lub-dub double pulses from the truck outward", ("calm", "groove"), ("recitative",), "beat"),
    "marquee": Move("theatre chase: every third lamp along all three cars lit, stepping along on each hit",
                    ("groove", "drive"), ("figuration", "recitative"), "beat"),
    "scanner": Move("an eye sweeps the truck's bar end to end and the Ys bounce it back with a headlight",
                    ("groove", "drive"), FIG, "beat"),
    "sparkle": Move("single lamps twinkle at random across the stage, soft and sparse when calm, sharp in a frenzy",
                    ("calm", "groove", "frenzy"), ("trill", "figuration", "recitative"), "beat"),
    "ping_pong": Move("the two Ys trade hits half a beat apart, the lead swapping each bar; the truck answers downbeats",
                      ("groove", "drive"), FIG, "beat"),
    "metronome": Move("the stage glows softly while one car at a time takes a slow solo pulse, left-centre-right",
                      ("calm", "groove"), ("recitative", "figuration", "chords"), "beat"),
    "stripes": Move("four stripes scroll along the truck's bar and reverse every two beats; the Ys answer inner then outer",
                    ("groove", "drive"), FIG, "beat"),
    "flutter": Move("the whole stage shivers on sixteenths, outer pair against the truck, a beat on and a beat off",
                    ("frenzy",), ("trill", "figuration"), "beat"),
    # --- bar-locked -------------------------------------------------------------------------
    "cascade": Move("a fast ripple across the lineup on each downbeat, back on the next", ("groove", "drive"), FIG, "bar"),
    "beam": Move("a searchlight two slots wide sweeps the stage once a bar", ("calm", "groove", "drive"), FIG, "bar"),
    "expand_contract": Move("the lit region breathes out from the truck to the corners and back, a bar each way",
                            ("groove", "drive"), ("chords", "recitative"), "bar"),
    "fade_cross": Move("a slow crossfade from one side of the stage to the other every two bars",
                       ("calm", "groove"), ("chords",), "bar"),
    "curtain": Move("the stage unveils left to right over a bar, holds with headlight punches, closes right to left",
                    ("groove", "drive"), ("chords", "recitative", "figuration"), "bar"),
    "breathe_wash": Move("a colour-wash breath: each car glows up and fades, a beat apart, rolling across the stage",
                         ("calm",), ("chords", "recitative", "figuration"), "bar"),
    "sunrise": Move("dawn from the truck outward on 2 s ramps, a hold, then sunset from the outside in",
                    ("calm",), ("chords", "recitative"), "bar"),
    "crossing": Move("two lights start at opposite ends, cross at the truck with a flare, and run out the far sides",
                     ("drive", "frenzy"), ("figuration", "run"), "bar"),
    "shockwave": Move("a ring leaves the truck's bar and travels out through the Ys to the fogs",
                      ("drive", "frenzy"), ("chords", "figuration"), "bar"),
    # --- builds: chosen by the crescendo detector -------------------------------------------
    "out_in": Move("corners to centre: lights grow inward, the bar fills, a beat of black, the truck pops",
                   LIVELY, FIG, "build"),
    "fill_stage": Move("the stage fills slot by slot with the climb and holds full", LIVELY, FIG, "build"),
    "bounce_build": Move("a hit bounces between the outer cars faster and faster into the peak", LIVELY, FIG, "build"),
    "implode": Move("build into the middle, the truck pops, then a slow two-second fade", LIVELY, FIG, "build"),
    "accelerando": Move("a strobe roll that subdivides (2 beats, 1, eighths, sixteenths) as lamp layers stack, "
                        "half a beat of black, then everything lands", LIVELY, FIG, "build"),
}

SPLIT = {
    ("y_keyboard", "ct_comets"): Move("the Ys play the notes as a keyboard while comets glide on the bar",
                                      ("calm", "groove"), FIG, "note", collab=False),
    ("y_ripple_in", "ct_comets"): Move("ripples run inward on the Ys toward comets on the truck", ("groove", "drive"), FIG, "beat", collab=False),
    ("y_keyboard", "ct_scan"): Move("the Ys play the notes, the bar scans", ("groove", "drive"), FIG, "note", collab=False),
    ("y_turn_ticks", "ct_comets"): Move("turn signals tick the rhythm, fogs thump the bass, comets on the bar",
                                        ("groove", "drive"), FIG, "beat", collab=False),
    ("y_ripple_out", "ct_edge_pulse"): Move("ripples run outward from the truck, whose bar pulses at its edges",
                                            ("drive", "frenzy"), FIG, "beat", collab=False),
    ("y_bass_fogs", "ct_comets"): Move("fogs on the bass notes, keyboard above, comets on the bar", ("groove", "drive"), FIG, "note", collab=False),
    ("y_wink", "ct_comets"): Move("the Ys wink one eye at a time while comets glide", ("calm", "groove"), FIG, "note", collab=False),
    ("y_chords", "bar_collide"): Move("the Ys hold the chords while two comets collide on the bar", ("groove", "drive"), ("chords",), "note", collab=False),
    ("y_chords", "ct_meter"): Move("the Ys hold the chords, the bar meters the level", ("calm", "groove", "drive"), ("chords",), "note", collab=False),
    ("y_breathe", "ct_swell"): Move("the Ys breathe slowly, the bar swells", ("calm",), ("chords", "recitative"), "note", collab=False),
    ("y_breathe", "ct_comets"): Move("the Ys breathe, comets glide on the bar", ("calm",), ("recitative",), "note", collab=False),
    ("y_keyboard", "ct_swell"): Move("the Ys play the notes over a swelling bar", ("calm",), ("recitative",), "note", collab=False),
}


def info(formation):
    """Catalogue entry for ("unison", move) or ("split", y, ct), or None."""
    if formation[0] == "unison":
        return UNISON.get(formation[1])
    return SPLIT.get((formation[1], formation[2]))


def fits(formation, mood):
    i = info(formation)
    return i is None or mood in i.moods


def candidates(gesture, mood):
    """Every catalogued formation (not builds or self-paced moves) that suits this gesture and mood."""
    out = [("unison", m) for m, i in UNISON.items()
           if mood in i.moods and gesture in i.gestures and i.grid not in ("build", "self")]
    out += [("split", y, c) for (y, c), i in SPLIT.items() if mood in i.moods and gesture in i.gestures]
    return out


def markdown():
    """The catalogue as a readable table (see write_markdown)."""
    rows = ["| move | what you see | moods | fits | locks to |", "|---|---|---|---|---|"]
    for name, i in UNISON.items():
        rows.append(f"| {name} | {i.what} | {', '.join(i.moods)} | {', '.join(i.gestures)} | {i.grid} |")
    for (y, c), i in SPLIT.items():
        rows.append(f"| {y} \\| {c} | {i.what} | {', '.join(i.moods)} | {', '.join(i.gestures)} | {i.grid} |")
    return "\n".join(rows) + "\n"


def write_markdown(path=None):
    """Write the catalogue to MOVES.md at the project root (build.py does this after a build)."""
    import pathlib
    path = pathlib.Path(path) if path else pathlib.Path(__file__).resolve().parents[1] / "MOVES.md"
    path.write_text("# Move catalogue\n\nGenerated from `lightshow/catalog.py` on every build: what each move "
                    "looks like, the moods and phrase shapes the choreographer may use it for, and what it "
                    "locks to.\n\n" + markdown())
