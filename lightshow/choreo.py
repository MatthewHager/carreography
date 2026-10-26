"""Coordinated choreography for a line of Teslas (default: Model Y | Cybertruck | Model Y).

The stage is read left to right as five "melody slots": left Y (left side, right side),
the Cybertruck's 60-LED front bar (continuous), right Y (left side, right side). A note's
pitch picks its slot, so runs and scales scrub across the cars. Every light is an instrument:

  bass hits      headlights (and in loud parts brake + tails) on all cars, 120-200 ms
  melody notes   accents/signature at the note's slot, 100-160 ms; a comet on the truck bar
  bright hits    side markers + turn signals strobe, 60-80 ms, alternating outer cars
  sustained chords  inner beams ramp on and hold
  downbeats      a fast chase across the cars (L>C>R, R>C>L, centre-out, edges-in)
  strong accents everything on every car for 150 ms, truck bar white
  crescendos     lights accumulate from the sides toward the Cybertruck, which pops at the peak

Intensity tiers (from the music, biased to build across the piece) gate which instruments play:
  0 calm: sustain pads + soft ramped note pulses       1: + melody flashes, bass on the truck
  2: + bass on all cars, highs, chases, mirrors        3: + brake/tails, window dance, strobes

Closures are planned backward from their travel times (liftgate 14 s, frunk ~10 s, windows 4 s,
charge port 2 s, mirrors 2 s) so they arrive in position on the musical moment, and stay within
Tesla's per-show command limits.
"""

import copy
from collections import Counter
from dataclasses import dataclass, field

import numpy as np

from . import catalog as CAT
from . import channels as C
from . import mood as MD
from . import moves as M
from .audio import Analysis
from .phrases import segment
from . import motors
from . import cues as CUE
from . import lamps as LAMPS
from . import lyrics as LY

PURPLE = (110, 0, 200)
ORANGE = (255, 70, 0)
WHITE = (255, 255, 255)

WINDOW_DANCE_BUDGET_S = 28.0   # Tesla advises ~30 s of dance per show (thermal limits)
LIGHT_LEAD_S = 0.02            # lights fire one frame before the sound so they read as on the beat


@dataclass
class Car:
    kind: str
    name: str
    x: float
    n_frames: int
    step: float
    frames: np.ndarray = field(init=False)
    closure_counts: Counter = field(default_factory=Counter)
    juniper: bool = False       # 2025+ Model Y: a front light bar instead of the DRL strip (lamps.py)

    def __post_init__(self):
        self.frames = np.zeros((self.n_frames, C.N_CHANNELS), dtype=np.uint8)
        # Calm passages set this to (ramp-on value, ramp-off value, off seconds): every full-on
        # light of 0.35 s or more glows up and fades out instead of snapping.
        self.soft = None

    @property
    def is_ct(self):
        return self.kind == "cybertruck"

    @property
    def has_bar(self):
        """A front light bar across the nose: the Cybertruck, and the 2025+ Model Y."""
        return self.is_ct or self.juniper

    # All sides in the choreography are the CROWD's left/right (facing the cars' fronts). Tesla's
    # "Left" channels are the vehicle's left (driver's side), which is on the crowd's right, so
    # every group method flips, and the front bar's pixels are written crowd-left to crowd-right
    # (Tesla numbers the LEDs from the vehicle's left).
    @staticmethod
    def _veh(side):
        return {"L": "R", "R": "L"}.get(side, side)

    def fr(self, t):
        return int(np.clip(round((t - LIGHT_LEAD_S) / self.step), 0, self.n_frames))

    def light(self, chs, t0, t1, value=C.ON):
        a, b = self.fr(t0), self.fr(t1)
        if b <= a or not len(np.atleast_1d(chs)):
            return
        tail = 0
        if self.soft and value == C.ON and t1 - t0 >= 0.35:
            value, off, off_s = self.soft
            tail = min(self.n_frames, b + int(off_s / self.step))
        for ch in np.atleast_1d(chs):
            seg = self.frames[a:b, ch]
            np.maximum(seg, value, out=seg)
            if tail:
                rest = self.frames[b:tail, ch]
                rest[rest == 0] = off

    def flash(self, chs, t, dur, value=C.ON):
        self.light(chs, t, t + max(dur, 0.1), value)

    def set(self, chs, t0, t1, value):
        a, b = self.fr(t0), self.fr(t1)
        for ch in np.atleast_1d(chs):
            self.frames[a:b, ch] = value

    def pixels(self, chs, t0, values):
        a = self.fr(t0)
        v = np.clip(values * 255, 0, 255).astype(np.uint8)
        b = min(self.n_frames, a + len(v))
        if b <= a:
            return
        chs = list(chs)
        if chs == list(C.FRONT_BAR):          # crowd-left .. crowd-right -> vehicle-left-first LEDs
            v = v[:, ::-1]
        self.frames[a:b, chs] = np.maximum(self.frames[a:b, chs], v[: b - a])

    def rgb(self, t0, t1, color, scale=1.0):
        a, b = self.fr(t0), self.fr(t1)
        for base in C.ALL_RGB:
            for i in range(3):
                self.frames[a:b, base + i] = np.maximum(self.frames[a:b, base + i], int(color[i] * scale))

    def closure(self, ch, t0, t1, cmd):
        if cmd in (C.CLOSURE_OPEN, C.CLOSURE_CLOSE, C.CLOSURE_DANCE):
            if self.closure_counts[ch] >= C.CLOSURE_LIMITS[ch]:
                return False
            self.closure_counts[ch] += 1
        self.set(ch, t0, t1, cmd)
        return True

    # --- Light groups ---
    def heads(self, side=None):
        side = self._veh(side)
        L, R = [C.L_OUTER_MAIN, C.L_INNER_MAIN], [C.R_OUTER_MAIN, C.R_INNER_MAIN]
        return L if side == "L" else R if side == "R" else L + R

    def inner(self, side=None):
        side = self._veh(side)
        L, R = [C.L_INNER_MAIN], [C.R_INNER_MAIN]
        return L if side == "L" else R if side == "R" else L + R

    def outer(self, side=None):
        side = self._veh(side)
        L, R = [C.L_OUTER_MAIN], [C.R_OUTER_MAIN]
        return L if side == "L" else R if side == "R" else L + R

    def sig(self, side=None):
        """Model Y signature strip (ramping). Cybertruck: front side marker (ramping)."""
        side = self._veh(side)
        L, R = ([C.L_SIDE_MARKER], [C.R_SIDE_MARKER]) if self.is_ct else ([C.L_SIGNATURE], [C.R_SIGNATURE])
        return L if side == "L" else R if side == "R" else L + R

    def drl(self, side=None):
        """Model Y channels 4-6 (one combined output per side, ramping); on a 2025+ Model Y channel 6
        is the whole front bar, so only 4-5 (the outer strips). Cybertruck: front turn."""
        side = self._veh(side)
        if self.is_ct:
            L, R = [C.L_FRONT_TURN], [C.R_FRONT_TURN]
        else:
            L, R = self._drl_veh("L"), self._drl_veh("R")
        return L if side == "L" else R if side == "R" else L + R

    def lamps(self):
        """Distinct front lamps left to right as the crowd sees them (8 on a Model Y)."""
        return [self.sig("L"), self.drl("L"), self.outer("L"), self.inner("L"),
                self.inner("R"), self.outer("R"), self.drl("R"), self.sig("R")]

    def accents(self, side=None):
        """Model Y signature + channels 4-6 (one output per side; 4-5 on a 2025+ Model Y, whose bar
        then shows them - see lamps.py). Cybertruck: front side markers."""
        side = self._veh(side)
        if self.is_ct:
            L, R = [C.L_SIDE_MARKER], [C.R_SIDE_MARKER]
        else:
            L, R = [C.L_SIGNATURE] + self._drl_veh("L"), [C.R_SIGNATURE] + self._drl_veh("R")
        return L if side == "L" else R if side == "R" else L + R

    def _drl_veh(self, vside):
        if self.juniper:
            return [C.L_CH4, C.L_CH5] if vside == "L" else [C.R_CH4, C.R_CH5]
        return [C.L_CH4, C.L_CH5, C.L_CH6] if vside == "L" else [C.R_CH4, C.R_CH5, C.R_CH6]

    def turns(self, side=None):
        side = self._veh(side)
        L, R = [C.L_FRONT_TURN], [C.R_FRONT_TURN]
        if not self.is_ct:
            L, R = L + [C.L_REAR_TURN], R + [C.R_REAR_TURN]
        return L if side == "L" else R if side == "R" else L + R

    def markers(self):
        if self.is_ct:
            return [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_SIDE_REPEATER, C.R_SIDE_REPEATER]
        return [C.L_SIDE_MARKER, C.R_SIDE_MARKER, C.L_AUX_PARK, C.R_AUX_PARK]  # one output on Model Y

    def fogs(self):
        return [C.L_FRONT_FOG, C.R_FRONT_FOG]

    def rear(self):
        chs = [C.BRAKE, C.L_TAIL, C.R_TAIL, C.LICENSE_PLATE]
        return chs + ([C.L_SIDE_REPEATER, C.R_SIDE_REPEATER] if self.is_ct else [C.REAR_FOG])

    def everything(self):
        return self.heads() + self.accents() + self.turns() + self.markers() + self.fogs() + self.rear()


def make_lineup(layout, n_frames, step):
    """One Car per letter, crowd-left to right: Y = 2025+ Model Y ("Juniper", front light bar),
    y = 2020-2024 Model Y, C = Cybertruck."""
    kinds = {"Y": "modely", "y": "modely", "C": "cybertruck"}
    names = {"Y": "ModelY", "y": "ModelY", "C": "Cybertruck"}
    sides = {0: "Left", len(layout) - 1: "Right"}
    return [Car(kinds[k], f"Car{i + 1}_{names[k]}_{sides.get(i, 'Center')}", float(i), n_frames, step,
                juniper=(k == "Y"))
            for i, k in enumerate(layout)]


# ---------------------------------------------------------------------------------------------

def _runs(mask):
    """[(start_frame, end_frame)] for each run of True."""
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def _tier_at(an, t):
    """Intensity tier at t, capped by the form map's ceiling for that section (the arc)."""
    f = min(int(t / an.step), len(an.tier) - 1)
    tier = int(an.tier[f])
    secs = getattr(an, "sections", None)
    if secs:
        from .form import section_at
        ceiling = section_at(secs, t).ceiling
        # The arc rules: never above the section's ceiling, and a section the form map ranks high
        # plays at least one step below it even if the recording is too flat to show it.
        tier = min(max(tier, ceiling - 1), ceiling)
    return tier


def _ceiling_at(an, t):
    secs = getattr(an, "sections", None)
    if not secs:
        return 3
    from .form import section_at
    return section_at(secs, t).ceiling


def _stage(cars, pitch, lo, hi):
    """Pitch -> stage slot. Outer cars take the low and high ends (two sides each); the
    Cybertruck's continuous bar takes the middle 40% of the range so runs sweep across it.
    Returns (car, side, within) where `within` is 0..1 along the truck bar (None otherwise)."""
    pos = float(np.clip((pitch - lo) / max(hi - lo, 1e-9), 0, 1))
    n = len(cars)
    if n == 3 and cars[1].is_ct:
        if pos < 0.30:
            return cars[0], ("L" if pos < 0.15 else "R"), None
        if pos < 0.70:
            return cars[1], ("L" if pos < 0.5 else "R"), (pos - 0.30) / 0.40
        return cars[2], ("L" if pos < 0.85 else "R"), None
    idx = min(n - 1, int(pos * n))
    within = pos * n - idx
    return cars[idx], ("L" if within < 0.5 else "R"), (within if cars[idx].is_ct else None)


def _slots_between(cars, low, high, lo, hi):
    """All (car, side) slots spanned by a chord from `low` to `high`; truck gets a bar span."""
    a = _stage(cars, low, lo, hi)
    b = _stage(cars, high, lo, hi)
    order = []
    for car in cars:
        for side in ("L", "R"):
            order.append((car, side))
    ia = order.index((a[0], a[1]))
    ib = order.index((b[0], b[1]))
    return order[min(ia, ib): max(ia, ib) + 1], a, b


def choreograph(an: Analysis, layout="YCY", use_liftgate=True, name=None, style=None):
    """Phrase-level choreography: one whole-stage move per musical phrase (see moves.py), shaped
    by the form map (form.py) and the song's cue sheet (cues.py). style="legato" (slow, flowing
    music with no beat to follow, e.g. Ave Maria) uses legato.py for the lights instead."""
    cars = make_lineup(layout, an.n_frames, an.step)
    words = getattr(an, "lyric_words", None)
    phrases = segment(an.events, cuts_at=[l[0] for l in LY.lines(words)] if words else None)
    an.phrases = phrases
    cues = CUE.resolve(name, an) if name else []
    if words and name:
        cues += LY.lyric_cues(name, words)
    an.cue_peaks = [(c["t0"], c["build"], c.get("hold"), c.get("final", False)) for a, c in cues if a == "peak"]
    for a, c in cues:                       # ceilings are needed before the plan is chosen
        if a == "ceiling" and an.sections:
            for sec in an.sections:
                if sec.t0 < c["t1"] and sec.t1 > c["t0"]:
                    sec.ceiling = int(c["value"])
    an.driver = CUE.driver(name) if name else "orchestra"
    # Durations in the moves (a bar, a sixteenth) come from the tempo: make it the tracked beats'
    # own spacing so a bar-long sweep ends on the next downbeat rather than drifting off it.
    from . import tempo as TEMPO
    an.beats_tracked = an.beats
    an.beat_follow = TEMPO.apply(an)          # beats moved onto what is played (rubato-aware)
    if len(an.beats) > 8:
        an.tempo = 60.0 / float(np.median(np.diff(an.beats)))
    MD.assign(an, phrases)
    if style == "legato":
        from . import legato as LEGATO
        LEGATO.choreograph(cars, an)
        for ph in phrases:
            ph.move = "legato"
        _apply_cues(cars, an, cues)
        _apply_color_cues(cars, an, cues)
        motors.choreograph(cars, an, use_liftgate)
    else:
        _pedal(cars, an)
        _play_phrases(cars, an, phrases)
        _darkness_guard(cars, an, phrases)
        if an.driver in ("band", "vocal_band"):
            _drums(cars, an)
        elif an.driver == "orchestra":
            _percussion(cars, an)
        from . import pulse as PULSE
        an.pulse_stats = PULSE.apply(cars, an, phrases)      # the beat layer owns the headlights
        _apply_cues(cars, an, cues)
        _interior(cars, an)
        _apply_color_cues(cars, an, cues)
        motors.choreograph(cars, an, use_liftgate)
        _finale(cars, an)
    for car in cars:
        _tidy(car)
        if car.juniper:
            LAMPS.juniper_output(car)
        car.frames[-3:, :C.L_FALCON] = 0
        car.frames[-3:, C.FRONT_BAR.start:] = 0
    an.phrases = phrases
    return cars


# ---- The choreographer -------------------------------------------------------------------------
# A formation says who does what for one phrase: "unison" (one move, all three cars) or "split"
# (the two Model Ys do one move while the Cybertruck does another). The chooser matches the
# formation to the phrase's gesture and intensity, keeps variety (never the same formation twice
# running, unison and split alternating), and gives repeated material the same formation.

# Single-note passages strobe: every move here flashes per note or per beat. (Flow moves such as
# meter, expand_contract and fill_stage are reserved for chords and crescendos.)
UNISON_FIGURATION = ["lr_notes", "rotation", "mirror", "keyboard", "wave", "converge", "call_response",
                     "relay", "pinball", "syncopate", "lr_beat", "march", "cascade", "tug_of_war", "antiphony",
                     "checker", "beam", "lr_channel"]
# Moves where the three cars pass something between them (the ones with the most impact).
COLLAB = {"wave", "converge", "relay", "pinball", "syncopate", "expand_contract", "fill_stage", "out_in", "rotation",
          "lr_notes", "lr_beat", "call_response", "march", "cascade", "tug_of_war", "bounce_build", "antiphony", "motif",
          "checker", "beam", "lr_channel", "implode", "fade_cross"} | {m for m, i in CAT.UNISON.items() if i.collab}
BEAT_MOVES = {"lr_beat", "wave", "converge", "heartbeat", "y_ripple_in", "y_ripple_out",
              "ct_scan", "ct_edge_pulse", "y_turn_ticks", "pinball", "syncopate", "expand_contract",
              "march", "cascade", "tug_of_war", "bounce_build", "checker", "beam", "lr_channel",
              "curtain", "breathe_wash", "marquee", "crossing", "shockwave", "sparkle", "sunrise", "scanner", "accelerando",
              "ping_pong", "metronome", "stripes", "flutter"}
SPLIT_FIGURATION = [("y_keyboard", "ct_comets"), ("y_ripple_in", "ct_comets"), ("y_keyboard", "ct_scan"),
                    ("y_turn_ticks", "ct_comets"), ("y_ripple_out", "ct_edge_pulse"), ("y_bass_fogs", "ct_comets"),
                    ("y_wink", "ct_comets")]
CALM = {"keyboard", "mirror", "meter", "pulse", "y_breathe", "ct_comets", "ct_swell", "ct_meter", "y_keyboard",
        "breathe_wash", "sunrise", "sparkle", "beam", "relay", "march", "fade_cross", "metronome"}
# How much of the stage a move lights. Full-power sections only use strong moves; calm ones only quiet.
QUIET = {"breathe_wash", "sunrise", "sparkle", "y_turn_ticks", "y_bass_fogs", "y_breathe", "ct_swell", "ct_edge_pulse", "pulse", "meter", "ct_comets", "ct_meter", "y_keyboard", "shimmer", "mirror"}
STRONG = {"wave", "converge", "lr_notes", "rotation", "keyboard", "call_response", "out_in", "heartbeat", "motif", "cadence", "block",
          "y_ripple_in", "y_ripple_out", "ct_scan", "y_chords", "relay", "pinball", "syncopate", "expand_contract", "fill_stage",
          "rain", "bar_collide", "march", "cascade", "tug_of_war", "bounce_build", "antiphony",
          "checker", "beam", "lr_channel", "implode", "curtain", "marquee", "crossing", "shockwave", "scanner", "accelerando",
          "ping_pong", "stripes", "flutter"}


def _signature(ev, ph):
    p = ev.top[ph.a:ph.b].astype(float)
    if len(p) < 4:
        return None
    x = np.interp(np.linspace(0, len(p) - 1, 16), np.arange(len(p)), p)
    return x - x.mean()


def _formations_for(ph, an, ev):
    """Candidate formations for a phrase, best first: the gesture's candidates, plus every
    catalogued move that suits the gesture and the phrase's mood, keeping only those whose mood
    range includes this phrase's (so a calm verse never gets a strobe, a climax never a breath)."""
    base = _formations_base(ph, an, ev)
    mood = getattr(ph, "mood", None)
    if mood is None or ph.gesture in ("motif", "cadence"):
        return base
    if base and base[0][1] in BUILDS:          # a crescendo candidate stays first
        return base
    beat_ok = an.beat_score >= 2.0
    extra = [c for c in CAT.candidates(ph.gesture, mood) if c not in base
             and (beat_ok or not (set(c[1:]) & BEAT_MOVES))]
    out = [c for c in base + extra if CAT.fits(c, mood)]
    if _ceiling_at(an, ph.t0) >= 3:
        out = [c for c in out if not (set(c[1:]) <= QUIET)] or out
    return out or base


BUILDS = ("out_in", "fill_stage", "bounce_build", "implode", "accelerando")


def _formations_base(ph, an, ev):
    """Candidate formations for a phrase by gesture, best first. Each is ("unison", move) or ("split", y, ct)."""
    g, tier = ph.gesture, _tier_at(an, ph.t0)
    ceiling = _ceiling_at(an, ph.t0)
    beat_ok = an.beat_score >= 2.0
    if g == "motif":
        return [("unison", "motif")]
    if g == "trill":
        return [("unison", "shimmer"), ("unison", "rain")]
    if g == "cadence":
        return [("unison", "cadence")]
    if g == "run":
        return [("unison", "relay"), ("unison", "keyboard"), ("split", "y_keyboard", "ct_scan" if beat_ok else "ct_comets")]
    if g == "chords":
        # Chords are flows and fills, never strobes: holds, swells and growing fills.
        c = [("unison", "block"), ("split", "y_chords", "bar_collide"), ("split", "y_chords", "ct_meter"),
             ("unison", "meter"), ("unison", "fade_cross"), ("split", "y_breathe", "ct_swell")]
        if beat_ok and ceiling >= 2:
            c.insert(1, ("unison", "expand_contract"))
        if ph.t1 - ph.t0 >= 4 and ceiling >= 2:
            c.insert(2, ("unison", "fill_stage"))
        return c
    if g == "recitative":
        c = [("unison", "pulse"), ("split", "y_wink", "ct_comets"), ("split", "y_breathe", "ct_comets"), ("split", "y_keyboard", "ct_swell")]
        if getattr(an, "driver", "") in ("band", "vocal_band") and beat_ok and ceiling >= 2:
            # sparse singing over a band: the beat carries the stage, not the few transcribed notes
            return [("unison", "march"), ("unison", "lr_channel"), ("unison", "lr_beat"), ("unison", "checker"),
                    ("unison", "beam"), ("unison", "heartbeat")]
        if ceiling >= 3:   # big declamatory notes with rests between (a loud ending): hold them, don't whisper
            return [("unison", "block"), ("unison", "heartbeat")] + ([("unison", "expand_contract")] if beat_ok else [])
        if beat_ok and tier <= 1 and ph.t1 - ph.t0 >= 6:
            c.insert(1, ("unison", "heartbeat"))
        return c
    # figuration
    f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
    e = an.intensity[f0:f1]
    rising = len(e) > 25 and e[-len(e) // 4:].mean() > e[: len(e) // 4].mean() * 1.35
    cands = [("unison", m) for m in UNISON_FIGURATION] + [("split", y, c) for y, c in SPLIT_FIGURATION]
    if rising and ph.t1 - ph.t0 >= 4:
        cands = [("unison", "out_in"), ("unison", "fill_stage")] + cands
    if not beat_ok:
        cands = [c for c in cands if not (set(c[1:]) & BEAT_MOVES)]
    if ceiling <= 1:   # the arc says: not yet. Only the quiet moves.
        cands = [c for c in cands if set(c[1:]) <= CALM] or cands[:2]
    elif ceiling >= 3:  # full power: nothing that leaves the Ys dark or lights single lamps
        cands = [c for c in cands if not (set(c[1:]) <= QUIET)] or cands
    if getattr(an, "driver", "") in ("band", "vocal_band") and beat_ok:
        beat_first = ("syncopate", "pinball", "lr_beat", "march", "cascade", "tug_of_war", "checker", "beam", "lr_channel")
        if ph.density < 3.0:   # few notes to follow: only the beat-locked moves
            cands = [c for c in cands if c[1] in beat_first] or cands
        cands.sort(key=lambda c: 0 if c[1] in beat_first else (1 if c[1] in ("wave", "converge") else 2))
    if tier <= 1:   # calm passages: quieter moves first
        cands.sort(key=lambda c: 0 if set(c[1:]) <= CALM else 1)
    else:           # loud passages: the big stage moves first
        cands.sort(key=lambda c: 0 if c[1] in ("wave", "converge", "lr_notes", "rotation", "y_ripple_in") else 1)
    return cands


# When a section comes back louder, its formations come back bigger.
ESCALATE = {
    ("split", "y_keyboard", "ct_meter"): ("unison", "cascade"),
    ("split", "y_keyboard", "ct_comets"): ("unison", "converge"),
    ("split", "y_breathe", "ct_comets"): ("split", "y_ripple_in", "ct_comets"),
    ("split", "y_keyboard", "ct_scan"): ("unison", "wave"),
    ("split", "y_keyboard", "ct_swell"): ("split", "y_ripple_out", "ct_edge_pulse"),
    ("unison", "meter"): ("unison", "wave"),
    ("unison", "mirror"): ("unison", "lr_notes"),
    ("unison", "keyboard"): ("unison", "rotation"),
    ("unison", "pulse"): ("unison", "heartbeat"),
    ("unison", "lr_notes"): ("unison", "checker"),
    ("unison", "rotation"): ("unison", "wave"),
    ("split", "y_ripple_out", "ct_edge_pulse"): ("unison", "tug_of_war"),
    ("split", "y_bass_fogs", "ct_comets"): ("unison", "lr_notes"),
    ("split", "y_turn_ticks", "ct_comets"): ("unison", "rotation"),
    ("split", "y_chords", "ct_meter"): ("unison", "block"),
    ("split", "y_wink", "ct_comets"): ("unison", "pinball"),
    ("split", "y_keyboard", "bar_collide"): ("unison", "relay"),
    ("unison", "pinball"): ("unison", "syncopate"),
    ("unison", "relay"): ("unison", "wave"),
}


def _escalate(f, steps, beat_ok):
    for _ in range(steps):
        g = ESCALATE.get(f, f)
        if not beat_ok and (set(g[1:]) & BEAT_MOVES):
            break
        f = g
    return f


def _choose_plan(an, phrases):
    """One formation per phrase, chosen with the whole piece in view:
    - a section that repeats earlier material replays that section's formations (callbacks),
      one intensity step higher each time (the form map's ceiling escalation);
    - each section leans unison or split (alternating per new letter) so contrast happens at
      section scale rather than every few seconds;
    - within that, least-used first, never the same twice running."""
    from .form import section_at
    ev = an.events
    secs = getattr(an, "sections", None) or []
    history, seen, plan = [], [], []
    section_plans = {}        # letter -> list of formations, in phrase order
    section_lean = {}         # letter -> "unison" | "split"
    lean_cycle = ["unison", "split"]
    for ph in phrases:
        sec = section_at(secs, ph.t0) if secs else None
        letter = sec.letter if sec else "A"
        if letter not in section_lean:
            section_lean[letter] = lean_cycle[len(section_lean) % 2]
        choice = None
        # A real crescendo is a build, whatever the section did before: it is where the frunk rises.
        # Two kinds: the loudness rises (band recordings), or the music rises - the line climbs
        # by an octave or more and lands on a held chord (organ, where the loudness barely moves).
        if ph.gesture == "figuration" and ph.b - ph.a >= 10:
            f0, f1 = int(ph.t0 / an.step), max(int(ph.t0 / an.step) + 1, int(ph.t1 / an.step))
            e = an.intensity[f0:f1]
            louder = len(e) > 25 and e[-len(e) // 4:].mean() > e[: len(e) // 4].mean() * 1.35 and ph.t1 - ph.t0 >= 4
            tops = ev.top[ph.a:ph.b]
            climb = float(np.polyfit(np.arange(len(tops)), tops, 1)[0] * len(tops))
            lands = ev.dur[ph.b - 1] >= 0.8 or (ph.b < len(ev) and ev.kind[ph.b] >= 2 and ev.t[ph.b] - ph.t1 < 0.6)
            musical = climb >= 12 and lands and ph.t1 - ph.t0 >= 3
            last_build = max([q.t0 for q, h in zip(phrases, history) if h[1] in BUILDS] or [-99])
            cue_peak = any(ph.t0 < t <= ph.t1 + 0.5 for t, *_ in (getattr(an, "cue_peaks", None) or []))
            spacing = 12 if musical else 20
            calm = getattr(ph, "mood", "") == "calm"
            n_so_far = sum(1 for h in history if h[1] in BUILDS)
            room = n_so_far < 1 + an.duration / 50.0       # about one build per 50 s of song at most
            if (not calm and room and (louder or musical) and ph.t0 - last_build >= spacing) or (cue_peak and ph.t1 - ph.t0 >= 3):
                n_builds = sum(1 for h in history if h[1] in BUILDS)
                kinds = ["out_in", "accelerando", "fill_stage", "implode"] + (["bounce_build"] if an.beat_score >= 2.0 else [])
                if an.beat_score < 2.0 or getattr(an, "driver", "") == "organ":
                    kinds.remove("accelerando")     # a club strobe-roll; organ climbs get fills
                choice = ("unison", "out_in" if cue_peak else kinds[n_builds % len(kinds)])
        # Callback: replay the formation this phrase had the first time the section was heard.
        if choice is None and sec and sec.repeat_of >= 0 and letter in section_plans and ph.gesture not in ("motif", "cadence", "trill"):
            earlier = section_plans[letter]
            k = sum(1 for q in phrases[: phrases.index(ph)] if secs and section_at(secs, q.t0) is sec)
            if earlier:
                first_sec = secs[sec.repeat_of]
                choice = _escalate(earlier[k % len(earlier)], max(0, sec.ceiling - first_sec.ceiling),
                                   an.beat_score >= 2.0)
                if choice[1] in BUILDS:          # builds are placed by the crescendo detector, never replayed
                    choice = None
                if choice is not None and sec.ceiling >= 3 and set(choice[1:]) <= QUIET:   # a climax never replays a quiet move
                    choice = _escalate(choice, 1, an.beat_score >= 2.0)
                    if set(choice[1:]) <= QUIET:
                        choice = ("unison", "lr_notes" if history[-1:] != [("unison", "lr_notes")] else "rotation")
                # A callback must still suit this moment's mood; and from the third hearing of a
                # section on, it is varied - a sibling move on the same grid that fits the mood -
                # so the audience recognises the section without seeing the identical picture.
                hearing = sum(1 for q in secs[: secs.index(sec)] if q.letter == sec.letter)
                if choice is not None and (not CAT.fits(choice, getattr(ph, "mood", "drive")) or hearing >= 2):
                    base_info = CAT.info(choice)
                    sibs = [c for c in _formations_for(ph, an, ev)
                            if c != choice and CAT.info(c) is not None and base_info is not None
                            and CAT.info(c).grid == base_info.grid]
                    sibs = sorted(sibs, key=lambda c: sum(1 for h in history if h == c))
                    if sibs:
                        choice = sibs[0]
                    elif not CAT.fits(choice, getattr(ph, "mood", "drive")):
                        choice = None
        if choice is not None and history[-1:] == [choice] and ph.gesture == "figuration":
            alt = [c for c in _formations_for(ph, an, ev) if c != choice and c[0] == "unison" and c[1] in COLLAB]
            if alt:
                choice = alt[0]
        if choice is None:
            sig = _signature(ev, ph)
            if sig is not None and ph.gesture == "figuration":
                for s2, f2 in seen:
                    if s2 is not None and len(s2) == len(sig):
                        c = np.corrcoef(sig, s2)[0, 1]
                        if np.isfinite(c) and c >= 0.9 and CAT.fits(f2, getattr(ph, "mood", "drive")):
                            choice = f2
                            break
            if choice is None:
                cands = _formations_for(ph, an, ev)
                recent = history[-2:]
                used = {}
                for h in history:
                    used[h] = used.get(h, 0) + 1
                lean = section_lean[letter]
                cap = max(2, int(0.07 * len(phrases)))      # no move dominates the song
                ordered = sorted(enumerate(cands), key=lambda ic: (ic[1] in recent, used.get(ic[1], 0) >= cap,
                                                                    ic[1][0] != lean, used.get(ic[1], 0), ic[0]))
                # a crescendo build is a big gesture: at most one every 20 s
                last_build = max([h_t for h_f, h_t in zip(history, [q.t0 for q in phrases[:len(history)]])
                                  if h_f[1] in BUILDS] or [-99])
                ordered = [ic for ic in ordered if not (ic[1][1] in BUILDS and ph.t0 - last_build < 20)] or ordered
                choice = ordered[0][1]
                # Collaboration quota: in lively sections, at least 60% of phrases must be moves
                # where the cars pass something between them - they carry the show.
                if _ceiling_at(an, ph.t0) >= 2:
                    recent_hist = [h for q, h in zip(phrases, history) if _ceiling_at(an, q.t0) >= 2][-9:]
                    share = sum(1 for h in recent_hist if h[0] == "unison" and h[1] in COLLAB) / max(1, len(recent_hist))
                    if share < 0.6 and not (choice[0] == "unison" and choice[1] in COLLAB):
                        alt = [ic[1] for ic in ordered if ic[1][0] == "unison" and ic[1][1] in COLLAB and ic[1] not in recent]
                        if alt:
                            choice = alt[0]
                # A real crescendo always gets the build (it is also where the frunk rises).
                if cands[0] == ("unison", "out_in") and ph.t0 - last_build >= 20:
                    choice = cands[0]
            seen.append((_signature(ev, ph), choice))
        plan.append(choice)
        history.append(choice)
        if sec and sec.repeat_of < 0 and ph.gesture not in ("motif", "cadence", "trill"):
            section_plans.setdefault(letter, []).append(choice)
    return plan


def _darkness_guard(cars, an, phrases):
    """No lively phrase may play out mostly dark. A note-driven move over a thin transcription
    (a soft sung tail, a hummed chorus) can leave the stage black for seconds; when fewer than a
    eighth of a lively phrase's frames light anything (a beat-strobe move like pinball sits near
    a fifth), a beat march (or a pulse without a beat) is laid over it so the stage keeps moving."""
    # Only the note-following moves can fail this way; the beat strobes (pinball, syncopate,
    # bounce_build, lr_beat...) are sparse on purpose and are left alone.
    note_driven = {"wave", "converge", "lr_notes", "keyboard", "rotation", "mirror", "relay", "meter", "pulse",
                   "block", "shimmer", "rain", "heartbeat", "expand_contract", "fade_cross", "y_keyboard | ct_comets",
                   "y_keyboard | ct_scan", "y_keyboard | ct_meter", "y_ripple_in | ct_comets", "y_breathe | ct_comets"}
    for ph in phrases[1:]:            # the first phrase is the opening statement: its silences are the point
        if _ceiling_at(an, ph.t0) < 2 or ph.t1 - ph.t0 < 3.0 or ph.move not in note_driven:
            continue
        f0, f1 = int(ph.t0 / an.step), int(ph.t1 / an.step)
        lit = np.mean([(c.frames[f0:f1, :30] > 0).any(1).mean() for c in cars])
        if lit >= 0.12:
            continue
        if getattr(ph, "mood", "") == "calm":
            M.breathe_wash(cars, an, ph)
            ph.move += "+breathe_wash"
        elif an.beat_score >= 2.0:
            M.march(cars, an, ph)
            ph.move += "+march"
        else:
            M.pulse(cars, an, ph)
            ph.move += "+pulse"


def _play_phrases(cars, an, phrases):
    beat_len = 60.0 / max(an.tempo, 40)
    plan = _choose_plan(an, phrases)
    ys = [c for c in cars if not c.is_ct]
    ct = next((c for c in cars if c.is_ct), None)
    unison = {
        "motif": lambda ph: M.motif(cars, an, ph),
        "keyboard": lambda ph: M.keyboard(cars, an, ph, heads=_tier_at(an, ph.t0) >= 2),
        "lr_notes": lambda ph: M.lr_notes(cars, an, ph),
        "lr_beat": lambda ph: M.lr_beat(cars, an, ph),
        "rotation": lambda ph: M.rotation(cars, an, ph),
        "mirror": lambda ph: M.mirror(cars, an, ph),
        "out_in": lambda ph: M.out_in(cars, an, ph, reverse=(ph.index % 2 == 1)),
        "meter": lambda ph: M.meter(cars, an, ph),
        "pulse": lambda ph: M.pulse(cars, an, ph),
        "block": lambda ph: M.block(cars, an, ph, beat_len),
        "cadence": lambda ph: M.cadence(cars, an, ph),
        "shimmer": lambda ph: M.shimmer(cars, an, ph),
        "wave": lambda ph: M.wave(cars, an, ph),
        "converge": lambda ph: M.converge(cars, an, ph),
        "heartbeat": lambda ph: M.heartbeat(cars, an, ph),
        "call_response": lambda ph: M.call_response(cars, an, ph),
        "relay": lambda ph: M.relay(cars, an, ph),
        "pinball": lambda ph: M.pinball(cars, an, ph),
        "syncopate": lambda ph: M.syncopate(cars, an, ph),
        "expand_contract": lambda ph: M.expand_contract(cars, an, ph),
        "rain": lambda ph: M.rain(cars, an, ph),
        "fill_stage": lambda ph: M.fill_stage(cars, an, ph),
        "march": lambda ph: M.march(cars, an, ph),
        "cascade": lambda ph: M.cascade(cars, an, ph),
        "tug_of_war": lambda ph: M.tug_of_war(cars, an, ph),
        "bounce_build": lambda ph: M.bounce_build(cars, an, ph),
        "antiphony": lambda ph: M.antiphony(cars, an, ph),
        "checker": lambda ph: M.checker(cars, an, ph),
        "beam": lambda ph: M.beam(cars, an, ph),
        "lr_channel": lambda ph: M.lr_channel(cars, an, ph),
        "implode": lambda ph: M.implode(cars, an, ph),
        "fade_cross": lambda ph: M.fade_cross(cars, an, ph),
        "curtain": lambda ph: M.curtain(cars, an, ph),
        "breathe_wash": lambda ph: M.breathe_wash(cars, an, ph),
        "marquee": lambda ph: M.marquee(cars, an, ph),
        "crossing": lambda ph: M.crossing(cars, an, ph),
        "shockwave": lambda ph: M.shockwave(cars, an, ph),
        "sparkle": lambda ph: M.sparkle(cars, an, ph),
        "sunrise": lambda ph: M.sunrise(cars, an, ph),
        "scanner": lambda ph: M.scanner(cars, an, ph),
        "accelerando": lambda ph: M.accelerando(cars, an, ph),
        "ping_pong": lambda ph: M.ping_pong(cars, an, ph),
        "metronome": lambda ph: M.metronome(cars, an, ph),
        "stripes": lambda ph: M.stripes(cars, an, ph),
        "flutter": lambda ph: M.flutter(cars, an, ph),
    }
    sides = {
        "y_keyboard": lambda ph: M.y_keyboard(ys, an, ph, weight=min(2, max(0, _tier_at(an, ph.t0)))),
        "y_ripple_in": lambda ph: M.y_ripple(ys, an, ph, inward=True),
        "y_ripple_out": lambda ph: M.y_ripple(ys, an, ph, inward=False),
        "y_breathe": lambda ph: M.y_breathe(ys, an, ph),
        "y_turn_ticks": lambda ph: (M.y_turn_ticks(ys, an, ph), M.y_bass_fogs(ys, an, ph)),
        "y_bass_fogs": lambda ph: (M.y_bass_fogs(ys, an, ph), M.y_keyboard(ys, an, ph)),
        "y_chords": lambda ph: M.y_chords(ys, an, ph, beat_len),
        "y_wink": lambda ph: M.y_wink(ys, an, ph),
    }
    centre = {
        "ct_meter": lambda ph: M.ct_meter(ct, an, ph),
        "ct_comets": lambda ph: M.ct_comets(ct, an, ph),
        "ct_scan": lambda ph: M.ct_scan(ct, an, ph),
        "ct_edge_pulse": lambda ph: M.ct_edge_pulse(ct, an, ph),
        "ct_swell": lambda ph: M.ct_swell(ct, an, ph),
        "bar_collide": lambda ph: M.bar_collide(ct, an, ph),
    }
    BIG = {"wave", "converge", "out_in", "cadence", "heartbeat", "call_response", "lr_beat", "relay", "pinball",
           "syncopate", "expand_contract", "fill_stage", "march", "cascade", "tug_of_war", "bounce_build",
           "checker", "beam", "lr_channel", "implode", "curtain", "marquee", "crossing", "shockwave", "scanner",
           "accelerando"}
    SOFT = {"calm": (C.ON_500, C.OFF_1000, 1.0), "groove": (C.ON, C.OFF_500, 0.5)}
    n_hits = [0]
    prev_ph = None
    prev_f, prev_end = None, -9.0
    for ph, f in zip(phrases, plan):
        ph.move = f[1] if f[0] == "unison" else f"{f[1]} | {f[2]}"
        # A breath before a big move: everything dark for a quarter second, so it lands.
        if f[0] == "unison" and f[1] in BIG and ph.t0 - prev_end < 0.6 and ph.t0 > 0.5:
            for c in cars:
                c.set(c.everything(), ph.t0 - 0.25, ph.t0 - 0.02, 0)
                c.set(list(C.FRONT_BAR), ph.t0 - 0.25, ph.t0 - 0.02, 0)
        # A handoff when the formation kind changes: the truck's bar passes the baton.
        if prev_f is not None and prev_f[0] != f[0] and ct is not None and _ceiling_at(an, ph.t0) >= 1:
            M.bar_flash(ct, ph.t0 - 0.02, 0.18, 0.6)
        prev_f, prev_end = f, ph.t1
        play = ph
        # Release or drop after a build: when the music falls back, the stage tears down over two
        # bars from the first downbeat and the phrase's own move starts after; when it stays up,
        # a shockwave marks the landing.
        if prev_ph is not None and getattr(prev_ph, "move", "") in BUILDS:
            downs = an.downbeats[(an.downbeats >= ph.t0 - 0.05) & (an.downbeats < ph.t1)]
            d0 = float(downs[0]) if len(downs) else ph.t0
            bar = 4 * 60.0 / max(an.tempo, 40)
            if ph.energy < prev_ph.energy - 0.12 or (ph.mood == "calm" and prev_ph.mood != "calm"):
                span = min(2 * bar, 0.6 * (ph.t1 - d0))
                if span >= 1.0:
                    M.teardown(cars, an, d0, span)
                    ph.move = "teardown → " + ph.move
                    play = copy.copy(ph)
                    play.t0 = d0 + span
                    play.a = int(np.searchsorted(an.events.t, play.t0))
            else:
                M.shockwave(cars, an, type("P", (), {"t0": d0, "t1": d0 + 0.5, "mood": "drive"})())
        prev_ph = ph
        info = CAT.info(f)
        saved = an.events
        an.pace = ph.pace if ph.mood in ("calm", "groove") else None
        if info is not None and info.grid == "note" and ph.mood == "calm" and ph.gesture not in ("run", "motif") \
                and play.b - play.a >= 3:
            an.events, play = MD.thinned(an, play)
        for c in cars:
            c.soft = SOFT.get(ph.mood) if (info is None or info.grid not in ("build", "self")) else None
        try:
            if play.t1 - play.t0 >= 0.5 and play.b > play.a or play is ph:
                if f[0] == "unison" or not ys or ct is None:
                    unison[f[1] if f[0] == "unison" else "keyboard"](play)
                else:
                    sides[f[1]](play)
                    centre[f[2]](play)
        finally:
            an.events = saved
            an.pace = None
            for c in cars:
                c.soft = None
        ev = an.events
        for i in range(ph.a, ph.b):  # arrivals are punctuation whatever the formation
            if ev.arrival[i] and ph.move != "cadence":
                if _ceiling_at(an, float(ev.t[i])) >= 2 and ph.mood != "calm":
                    n_hits[0] += 1
                    if n_hits[0] % 2 == 0 and ev.dur[i] < 0.8:
                        M.lightning(cars, float(ev.t[i]))
                    else:
                        M.all_on(cars, float(ev.t[i]), float(np.clip(ev.dur[i], 0.3, 1.2)))
                elif ph.mood == "calm":   # a calm arrival glows rather than hits
                    for c in cars:
                        c.light(c.inner(), float(ev.t[i]), float(ev.t[i]) + 0.8, C.ON_500)
                        c.light(c.inner(), float(ev.t[i]) + 0.8, float(ev.t[i]) + 1.8, C.OFF_1000)
                else:   # the arc says stay modest: a headlight hit, not the whole stage
                    for c in cars:
                        c.flash(c.heads(), float(ev.t[i]), 0.15)


def _on_grid(an, t):
    """A cue's moment moved onto the music's grid: onto the beat when it is within a quarter beat
    of one (a shout detected from a chord can read a little late), else onto the nearest eighth."""
    b = np.asarray(an.beats, float)
    if len(b) < 2:
        return t
    i = int(np.clip(np.searchsorted(b, t), 1, len(b) - 1))
    near = b[i - 1] if t - b[i - 1] <= b[i] - t else b[i]
    if abs(near - t) <= 0.25 * M._beat_at(an, t):
        return float(near)
    return M._snap(an, t, 2)


def _apply_cues(cars, an, cues):
    ct = next((c for c in cars if c.is_ct), None)
    ys = [c for c in cars if not c.is_ct]
    for action, c in cues:
        t0, t1 = c["t0"], c["t1"]
        if action in ("hit", "lightning", "ping"):
            t0 = t1 = _on_grid(an, t0)
        if action == "solo":
            keep = []
            for tag in c.get("cars", []):
                keep += [ct] if tag == "center" and ct else ys if tag == "sides" else []
            for car in cars:
                if car not in keep:
                    car.set(car.everything(), t0, t1, 0)
                    car.set(list(C.FRONT_BAR) + list(C.REAR_BAR), t0, t1, 0)
        elif action == "hit":
            M.all_on(cars, t0, float(c.get("hold", 0.4)))
        elif action == "blackout":
            for car in cars:
                car.set(car.everything(), t0, t1, 0)
                car.set(list(C.FRONT_BAR) + list(C.REAR_BAR), t0, t1, 0)
        elif action == "lightning":
            M.lightning(cars, t0)
        elif action == "ping":
            # one word of a chant: one car's whole front, pinging across the lineup word by word
            order = sorted(cars, key=lambda q: q.x)
            car = order[c["car"] % len(order)]
            car.flash(car.sig() + car.drl() + car.heads(), t0, 0.22)
            if car.is_ct:
                M.bar_flash(car, t0, 0.3, 1.0)


def _apply_color_cues(cars, an, cues):
    """Interior colour from the lyrics (overrides the section colour for the span)."""
    for action, c in cues:
        if action != "color":
            continue
        a, b = cars[0].fr(c["t0"]), cars[0].fr(c["t1"])
        for car in cars:
            for base in C.ALL_RGB:
                for i in range(3):
                    car.frames[a:b, base + i] = int(c["color"][i])


def _drums(cars, an):
    """Band songs: the kit is the rhythm. Kicks (low onsets of the drums stem) hit every car's
    headlights, snares (strong high onsets) hit both Ys' accents mirrored, hats (weak high onsets)
    tick the markers - all gated by the section's ceiling so quiet sections stay quiet."""
    ys = [c for c in cars if not c.is_ct]
    for t, strength in an.bass:
        t = float(t)
        mood = MD.mood_at(an, t)
        if _ceiling_at(an, t) < 1 or strength < 0.25 or mood == "calm" or (mood == "groove" and strength < 0.5):
            continue
        for c in cars:
            if not c.is_ct:
                c.flash(c.fogs(), t, 0.08 + 0.06 * strength)
    for t, strength in an.highs:
        t = float(t)
        ceiling = _ceiling_at(an, t)
        mood = MD.mood_at(an, t)
        if ceiling < 1 or mood == "calm":
            continue
        if mood == "groove" and strength < 0.6:     # groove: the snare only, no hats
            continue
        if strength >= 0.5:
            for c in ys:
                c.flash(c.accents(), t, 0.08)
        elif ceiling >= 2:
            for c in cars:
                c.flash(c.markers(), t, 0.06)


def _percussion(cars, an):
    """Orchestral pieces: timpani and low-brass hits (low onsets) thump the headlights in lively
    sections; cymbal and string attacks (high onsets) tick the markers at full power."""
    for t, strength in an.bass:
        t = float(t)
        if _ceiling_at(an, t) >= 2 and strength >= 0.5 and MD.mood_at(an, t) in ("drive", "frenzy"):
            for c in cars:
                c.flash(c.heads(), t, 0.1 + 0.08 * strength)
    for t, strength in an.highs:
        t = float(t)
        if _ceiling_at(an, t) >= 3 and strength >= 0.6:
            for c in cars:
                c.flash(c.markers(), t, 0.06)


def _pedal(cars, an):
    """Long low notes: the centre car's inner beams swell slowly (2 s ramp) and release, so the
    pedal reads as weight underneath without parking the headlights on."""
    ev = an.events
    anchor = [c for c in cars if c.is_ct] or [cars[len(cars) // 2]]
    for i in range(len(ev)):
        if ev.low[i] <= 45 and ev.dur[i] >= 0.8 and _ceiling_at(an, float(ev.t[i])) <= 1:
            t, d = float(ev.t[i]), min(float(ev.dur[i]), 2.5)
            for c in anchor:
                c.light(c.inner(), t, t + d, C.ON_2000)
                c.light(c.inner(), t + d, t + d + 2.1, C.OFF_2000)


def _tidy(car, min_on=5, min_off=3):
    """Boolean lights: flashes shorter than 100 ms get stretched, gaps under 60 ms get opened up,
    so rapid notes read as separate flashes instead of a smear."""
    for ch in range(C.L_OUTER_MAIN, C.LICENSE_PLATE + 1):
        col = car.frames[:, ch]
        on = col >= 128
        if not on.any():
            continue
        edges = np.flatnonzero(np.diff(np.concatenate([[0], on.astype(int), [0]])))
        starts, ends = edges[::2], edges[1::2]
        for s0, e0 in zip(starts, ends):  # stretch short flashes
            if e0 - s0 < min_on:
                col[s0:min(len(col), s0 + min_on)] = np.maximum(col[s0:min(len(col), s0 + min_on)], col[s0])
        on = col >= 128
        edges = np.flatnonzero(np.diff(np.concatenate([[0], on.astype(int), [0]])))
        starts, ends = edges[::2], edges[1::2]
        for e0, s1 in zip(ends[:-1], starts[1:]):  # open up short gaps
            if s1 - e0 < min_off:
                col[s1:min(len(col), e0 + min_off)] = 0


def _idle_glow(cars, an):
    """(Unused.) Something always lit once the music is going: fogs on older Ys, a faint truck bar."""
    for a, b in _runs(an.tier >= 1):
        t0, t1 = a * an.step, b * an.step
        for car in cars:
            if car.is_ct:
                n = b - a
                car.pixels(C.FRONT_BAR, t0, np.full((n, len(C.FRONT_BAR)), 0.08))
                car.pixels(C.REAR_BAR, t0, np.full((n, len(C.REAR_BAR)), 0.08))
            elif not car.juniper:        # (a Juniper's fogs are its bar's centre: no constant glow)
                car.light(car.fogs(), t0, t1)


def _play_notes(cars, an, lead_in):
    """The keyboard. Every transcribed event gets a light; which *expression* draws it depends on
    the texture of the passage (see texture.label_phrases):

        melody    keyboard      the note's pitch slot flashes
        zigzag    strobe_lr     high notes hit the right half of the stage, low notes the left,
                                switching to a ping-pong (L>C>R>C) every 8 events so it scrubs
        run_up    line_sweep    successive notes march left to right across all six slots
        run_down  line_sweep    ... right to left
        trill     shimmer       the two sides of the note's car alternate, truck bar sparkles
        chords    block         every slot the chord spans, held for its length
        arrival   all_on        everything on every car, truck bars white, then released
        climax    keyboard+     pitch slot plus that car's headlights and markers
    On top of that, pedal notes anchor the truck's inner beams and bass stabs hit all headlights.
    """
    ev = an.events
    if ev is None or len(ev) == 0:
        return
    lo, hi = an.pitch_lo, an.pitch_hi
    strong = ev.amp >= np.quantile(ev.amp, 0.75)
    ct = next((c for c in cars if c.is_ct), None)
    for i in range(len(ev)):
        t = float(ev.t[i])
        if t < lead_in:
            continue
        tier = _tier_at(an, t)
        dur, kind, amp = float(ev.dur[i]), int(ev.kind[i]), float(ev.amp[i])
        phrase, k = ev.phrase[i], int(ev.phrase_idx[i])
        flash = float(np.clip(dur, 0.08, 0.2))

        if ev.low[i] <= 45:
            if dur >= 0.6:
                anchor = [ct] if ct is not None else [cars[len(cars) // 2]]
                for c in anchor:
                    c.light(c.inner(), t, t + min(dur, 4.0), C.ON_500)
                    c.light(c.inner(), t + min(dur, 4.0), t + min(dur, 4.0) + 0.6, C.OFF_500)
            elif strong[i] and tier >= 1:
                for c in cars:
                    c.flash(c.heads(), t, 0.12 + 0.08 * amp)

        if phrase == "arrival":
            _x_all_on(cars, t, float(np.clip(dur, 0.3, 1.5)))
        elif kind >= 2 or phrase == "chords":
            _x_block(cars, ct, ev, i, lo, hi, strong[i], tier, beat_len=60.0 / max(an.tempo, 40))
        elif phrase == "zigzag":
            local = ev.top[max(0, i - 6): i + 7]
            _x_strobe(cars, ct, t, flash, ev.top[i] >= np.median(local), k, amp)
        elif phrase in ("run_up", "run_down"):
            _x_sweep(cars, ct, t, flash, k, up=phrase == "run_up", amp=amp)
        elif phrase == "trill":
            _x_shimmer(cars, ct, t, flash, ev.top[i], lo, hi, k)
        else:
            _x_keyboard(cars, ct, t, flash, dur, ev, i, lo, hi, strong[i], tier,
                        loud=phrase == "climax")


# ---- Expression library -------------------------------------------------------------------

def _x_keyboard(cars, ct, t, flash, dur, ev, i, lo, hi, strong, tier, loud=False):
    voices = [ev.top[i]] if ev.kind[i] == 0 else [ev.top[i], ev.low[i]]
    amp = float(ev.amp[i])
    fast = ev.density[i] >= 7
    for p in voices:
        car, side, within = _stage(cars, p, lo, hi)
        if car.is_ct:
            _comet(car, t, within if within is not None else 0.5,
                   0.14 + 0.12 * amp if fast else 0.25 + 0.2 * amp)
            car.flash(car.heads(side), t, flash)
        elif tier == 0 and dur > 0.5 and not fast:
            car.light(car.accents(side), t, t + dur / 2, C.ON_500)
            car.light(car.accents(side), t + dur / 2, t + dur, C.OFF_500)
        else:
            car.flash(car.accents(side), t, flash)
            if loud or (strong and tier >= 2):
                car.flash(car.heads(side), t, 0.1)
        if loud:
            car.flash(car.markers() + car.turns(side), t, flash)


def _x_strobe(cars, ct, t, flash, high, k, amp):
    """Left/right strobing for zigzag figuration; every 8 events swap to a ping-pong across cars."""
    n = len(cars)
    if (k // 8) % 2 == 0:
        idx = n - 1 if high else 0
        car = cars[idx]
        car.flash(car.accents() + car.heads(), t, flash)
        if ct is not None and ct is not car:
            side = "R" if high else "L"
            ct.flash(ct.heads(side), t, flash)
            _bar_half(ct, t, flash + 0.1, side, 0.5 + 0.5 * amp)
    else:
        order = _pingpong(n)
        car = cars[order[k % len(order)]]
        car.flash(car.accents() + car.heads(), t, flash)
        if car.is_ct:
            _comet(car, t, 0.5, flash + 0.15, soft=False)


def _x_sweep(cars, ct, t, flash, k, up, amp):
    """A run marches across the six stage slots, one slot per note."""
    slots = [(c, sd) for c in cars for sd in ("L", "R")]
    if not up:
        slots = slots[::-1]
    car, side = slots[k % len(slots)]
    car.flash(car.accents(side) + car.heads(side), t, flash)
    if car.is_ct:
        pos = 0.25 if side == "L" else 0.75
        _comet(car, t, pos if up else 1 - pos, flash + 0.15)
    elif ct is not None:
        _bar_half(ct, t, flash, "L" if (car.x < ct.x) else "R", 0.25)


def _x_shimmer(cars, ct, t, flash, pitch, lo, hi, k):
    car, _, within = _stage(cars, pitch, lo, hi)
    side = "L" if k % 2 == 0 else "R"
    car.flash(car.accents(side) + car.turns(side)[:1], t, max(0.06, flash * 0.7))
    if ct is not None:
        n = ct.fr(t + 0.1) - ct.fr(t)
        rng = np.random.default_rng(k)
        sparkle = (rng.random(len(C.FRONT_BAR)) < 0.25).astype(float)
        ct.pixels(C.FRONT_BAR, t, np.repeat(sparkle[None, :], max(n, 1), 0))


def _x_block(cars, ct, ev, i, lo, hi, strong, tier, beat_len=0.5):
    """Chords light every slot they span. Holds are capped at two beats so dense harmony reads as
    pulses, not a wall; a five-voice chord takes the whole stage, headlights only when it is strong."""
    t, dur, amp = float(ev.t[i]), float(ev.dur[i]), float(ev.amp[i])
    hold = float(np.clip(dur, 0.15, max(0.3, 2 * beat_len)))
    slots, a, b = _slots_between(cars, ev.low[i], ev.high[i], lo, hi)
    big = ev.kind[i] == 3 or len(slots) >= 5
    if big:
        slots = [(c, sd) for c in cars for sd in ("L", "R")]
    for car, side in slots:
        car.light(car.accents(side), t, t + hold)
        if big and strong:
            car.flash(car.heads(side), t, 0.12)
        if hold > 0.8:
            car.light(car.accents(side), t + hold, t + hold + 0.6, C.OFF_500)
    if ct is not None and any(c.is_ct for c, _ in slots):
        w0 = a[2] if a[0].is_ct else (0.0 if a[0].x < ct.x else 1.0)
        w1 = b[2] if b[0].is_ct else (0.0 if b[0].x < ct.x else 1.0)
        _bar_span(ct, t, hold, min(w0, w1), max(w0, w1), 0.5 + 0.5 * amp)


def _x_all_on(cars, t, hold):
    for c in cars:
        c.light(c.everything(), t, t + hold)
        c.light(c.everything(), t + hold, t + hold + 0.6, C.OFF_500)
        if c.is_ct:
            n = c.fr(t + hold + 0.4) - c.fr(t)
            env = np.concatenate([np.ones(max(1, n - 20)), np.linspace(1, 0, min(n, 20))])[:n, None]
            c.pixels(C.FRONT_BAR, t, np.repeat(env, len(C.FRONT_BAR), 1))
            c.pixels(C.REAR_BAR, t, np.repeat(env, len(C.REAR_BAR), 1))


def _bar_half(car, t, dur, side, level):
    n = max(2, car.fr(t + dur) - car.fr(t))
    half = len(C.FRONT_BAR) // 2
    mask = np.zeros(len(C.FRONT_BAR))
    mask[:half] = level if side == "L" else 0
    mask[half:] = level if side == "R" else 0
    env = np.linspace(1, 0.2, n)
    car.pixels(C.FRONT_BAR, t, env[:, None] * mask[None, :])


def _bar_span(car, t, hold, w0, w1, level):
    n = max(2, car.fr(t + hold) - car.fr(t))
    leds = np.linspace(0, 1, len(C.FRONT_BAR))
    mask = ((leds >= w0 - 0.04) & (leds <= w1 + 0.04)).astype(float) * level
    env = np.ones(n)
    if hold > 0.8:
        env[-15:] = np.linspace(1, 0, min(15, n))
    car.pixels(C.FRONT_BAR, t, env[:, None] * mask[None, :])


def _comet(car, t, pos, dur, soft=False, amp=1.0):
    """A bright blob at `pos` (0..1) on the front bar that decays over `dur` seconds."""
    n = max(2, car.fr(t + dur) - car.fr(t))
    leds = np.arange(len(C.FRONT_BAR))
    centre = pos * (len(leds) - 1)
    width = 8 if soft else 6
    shape = np.exp(-((leds - centre) / width) ** 2)
    env = np.sin(np.linspace(0, np.pi, n)) if soft else np.linspace(1, 0, n) ** 1.5
    car.pixels(C.FRONT_BAR, t, amp * env[:, None] * shape[None, :])


def _bass(cars, an, lead_in):
    for t, strength in an.bass:
        if t < lead_in:
            continue
        tier = _tier_at(an, t)
        if tier < 2 or strength < 0.5:
            continue
        dur = 0.12 + 0.1 * strength
        for car in cars:
            car.flash(car.heads(), t, dur)
            if tier >= 3:
                car.flash(car.rear()[:3], t, dur)
            if car.is_ct:
                n = car.fr(t + dur + 0.15) - car.fr(t)
                pos = np.abs(np.linspace(-1, 1, len(C.REAR_BAR)))
                tt = np.linspace(0, 1, n)[:, None]
                car.pixels(C.REAR_BAR, t, np.clip(1 - tt, 0, 1) * (pos <= 0.3 + 0.7 * tt) * (0.5 + 0.5 * strength))


def _highs(cars, an, lead_in):
    """Bright transients strobe the markers and turn signals on alternating outer cars."""
    outer = [c for c in cars if not c.is_ct] or cars
    k = 0
    for t, strength in an.highs:
        if t < lead_in or _tier_at(an, t) < 2 or strength < 0.25:
            continue
        car = outer[k % len(outer)]
        k += 1
        car.flash(car.markers() + car.turns(), t, 0.06 + 0.04 * strength)
        ct = next((c for c in cars if c.is_ct), None)
        if ct is not None and strength > 0.5:
            n = ct.fr(t + 0.12) - ct.fr(t)
            sparkle = (np.random.default_rng(int(t * 1000)).random(len(C.REAR_BAR)) < 0.3) * strength
            ct.pixels(C.REAR_BAR, t, np.repeat(sparkle[None, :], n, 0))


def _chase(cars, t, order_groups, per=0.07, dur=0.11, chs=None):
    """order_groups: list of lists of car indexes lit together, stepped `per` seconds apart."""
    for k, group in enumerate(order_groups):
        for idx in group:
            car = cars[idx]
            car.flash(chs(car) if chs else car.heads() + car.accents(), t + k * per, dur)
            if car.is_ct:
                n = car.fr(t + k * per + dur + 0.1) - car.fr(t + k * per)
                car.pixels(C.FRONT_BAR, t + k * per, np.repeat(np.linspace(1, 0, n)[:, None], len(C.FRONT_BAR), 1))


def _pingpong(n):
    return list(range(n)) + list(range(n - 2, 0, -1)) if n > 1 else [0]


def _chase_patterns(n):
    mid = n // 2
    return [
        [[i] for i in range(n)],                      # left to right
        [[i] for i in reversed(range(n))],            # right to left
        [[mid], [i for i in range(n) if i != mid]],   # centre out
        [[i for i in range(n) if i != mid], [mid]],   # edges in
    ]


def _chases(cars, an, lead_in):
    patterns = _chase_patterns(len(cars))
    k = 0
    for d in an.downbeats:
        if d < lead_in or _tier_at(an, d) < 2:
            continue
        _chase(cars, d, patterns[k % len(patterns)])
        k += 1
    # In the loudest tier, off-beats get a quick ping-pong on the turn signals.
    beats = an.beats
    for i, b in enumerate(beats[:-1]):
        if _tier_at(an, b) < 3:
            continue
        half = (b + beats[i + 1]) / 2
        _chase(cars, half, patterns[i % 2], per=0.05, dur=0.08, chs=lambda c: c.turns())


def _builds(cars, an):
    """Crescendos: lights accumulate from the outside in; the Cybertruck pops at the top."""
    ct = next((c for c in cars if c.is_ct), None)
    outer = [c for c in cars if not c.is_ct]
    for a, b in _runs(an.build > 0):
        t0, t1 = a * an.step, b * an.step
        p = an.build[a:b]
        for i, car in enumerate(outer):
            start = 0.1 + 0.25 * i
            idx = np.flatnonzero(p >= start)
            if len(idx):
                ts = t0 + idx[0] * an.step
                car.light(car.accents() + car.markers(), ts, t1)
                car.light(car.heads(), ts + (t1 - ts) * 0.5, t1, C.ON_1000)
        if ct is not None:
            leds = len(C.FRONT_BAR)
            dist = np.minimum(np.arange(leds), leds - 1 - np.arange(leds)) / (leds / 2)  # 0 edge .. 1 centre
            fill = (dist[None, :] <= p[:, None]) * (0.4 + 0.6 * p[:, None])
            ct.pixels(C.FRONT_BAR, t0, fill)
            ct.pixels(C.REAR_BAR, t0, np.repeat((p ** 2)[:, None], len(C.REAR_BAR), 1) * 0.8)
            idx = np.flatnonzero(p >= 0.6)
            if len(idx):
                ct.light(ct.heads(), t0 + idx[0] * an.step, t1, C.ON_2000)
        # A beat of darkness, then the pop: everything on, truck bar white, then release.
        for car in cars:
            car.set(car.everything(), t1 - 0.16, t1, 0)
            car.set(list(C.FRONT_BAR) + list(C.REAR_BAR), t1 - 0.16, t1, 0)
            car.flash(car.everything(), t1, 0.3)
        if ct is not None:
            m = ct.fr(t1 + 0.5) - ct.fr(t1)
            ct.pixels(C.FRONT_BAR, t1, np.repeat(np.linspace(1, 0, m)[:, None], leds, 1))


def _accents(cars, an, lead_in):
    for h in an.hits:
        if h < lead_in or _tier_at(an, h) == 0:
            continue
        for c in cars:
            c.flash(c.everything(), h, 0.15)
            if c.is_ct:
                n = c.fr(h + 0.3) - c.fr(h)
                env = np.linspace(1, 0, n)[:, None]
                c.pixels(C.FRONT_BAR, h, np.repeat(env, len(C.FRONT_BAR), 1))
                c.pixels(C.REAR_BAR, h, np.repeat(env, len(C.REAR_BAR), 1))


def _interior(cars, an):
    base = {0: (PURPLE, 0.3), 1: (PURPLE, 0.6), 2: (ORANGE, 0.6), 3: (ORANGE, 1.0)}
    for a, b in _runs(np.ones(an.n_frames, bool)):
        pass
    tiers = an.tier
    i = 0
    while i < an.n_frames:
        j = i
        while j < an.n_frames and tiers[j] == tiers[i]:
            j += 1
        color, scale = base[int(tiers[i])]
        for c in cars:
            c.rgb(i * an.step, j * an.step, color, scale)
        i = j
    for bt in an.beats:
        if _tier_at(an, bt) >= 2:
            for c in cars:
                c.rgb(bt, bt + 0.1, ORANGE if _tier_at(an, bt) == 3 else PURPLE, 1.0)
    for h in an.hits:
        if _tier_at(an, h) >= 1:
            for c in cars:
                c.rgb(h, h + 0.12, WHITE)
    for a, b in _runs(an.build > 0):
        p = an.build[a:b]
        for k in range(0, b - a, 5):
            col = tuple(int(PURPLE[i] + (ORANGE[i] - PURPLE[i]) * p[k]) for i in range(3))
            for c in cars:
                c.rgb((a + k) * an.step, (a + k + 5) * an.step, col, 0.5 + 0.5 * p[k])


def _final_beat(an, end):
    """The music's last strong beat: the last beat in the final 12 s whose attack is at least 60 %
    of the strongest there (a song that grooves to the end lands its finale on its final hit, not
    on the last accent the accent detector happened to catch)."""
    env = getattr(an, "pulse_env", None)
    b = np.asarray(an.beats, float)
    b = b[(b > end - 12) & (b < end - 0.6)]
    if env is None or not len(b):
        return None
    hop = getattr(an, "pulse_hop", 512 / 22050)
    idx = np.clip(np.round(b / hop).astype(int), 1, len(env) - 2)
    strength = np.array([env[i - 1:i + 2].max() for i in idx])
    strong = b[strength >= 0.6 * strength.max()]
    return float(strong[-1]) if len(strong) else None


def _finale(cars, an):
    end = an.duration
    late = an.hits[an.hits < end - 1.5]
    t = late[-1] if len(late) and late[-1] > end - 12 else max(end - 3.0, 0)
    last = _final_beat(an, end)
    if last is not None and last > t:
        t = last
    fade_end = min(end - 0.1, t + 2.5)
    for c in cars:
        for ch in c.everything():
            c.set(ch, t, t + 0.3, C.ON)
            c.set(ch, t + 0.3, fade_end, C.OFF_2000)
        c.set(list(range(C.FRONT_BAR.start, C.REAR_BAR.stop)), t, fade_end, 0)
        if c.is_ct:
            n = c.fr(fade_end) - c.fr(t)
            env = np.clip(np.linspace(1.15, 0, n), 0, 1)[:, None]
            c.pixels(C.FRONT_BAR, t, np.repeat(env, len(C.FRONT_BAR), 1))
            c.pixels(C.REAR_BAR, t, np.repeat(env, len(C.REAR_BAR), 1))
