"""The beat layer: makes the audience feel the pulse under all the choreography.

Concert lighting keeps a show readable by splitting the rig: the fixtures with the most visual mass
bump on the beat, the rest carry the effects. Here the headlights of all three cars are the beat
layer wherever the music is lively and its pulse is clear; every move keeps the signatures, DRLs,
fogs, turns, markers and the truck's bar. Hits are short and hard (about 120 ms, never more than a
third of the beat) with real darkness between them, because a pulse needs an off state to read.

Accents follow the bar, with the downbeat the biggest:
    downbeat (1)    every headlight on all three cars, plus a flash of the truck's bar
    beat 3          every headlight
    beats 2 and 4   the two Ys' headlights only
    off-beats       the truck's inner beams (frenzy only)

and the pattern follows the mood (mood.py):
    calm      no hard pulse; where the beat is strong, a soft glow of the truck's inner beams on each downbeat
    groove    half-time feel: 1 and 3
    drive     every beat
    frenzy    every beat plus the off-beats

Builds and cadences own the whole stage while they play: the pulse drops out under a build (the
pull-back) and comes back full-size on the landing. Where the music has no clear pulse - rubato
organ, a free cadenza, Ave Maria - the layer backs off (downbeats only, or nothing at all).
"""

import numpy as np

from . import channels as C
from . import moves as M

HEADS = [C.L_OUTER_MAIN, C.R_OUTER_MAIN, C.L_INNER_MAIN, C.R_INNER_MAIN]
INNER = [C.L_INNER_MAIN, C.R_INNER_MAIN]
PATTERN = {"groove": {0: "big", 2: "mid"},
           "drive": {0: "big", 1: "small", 2: "mid", 3: "small"},
           "frenzy": {0: "big", 1: "small", 2: "mid", 3: "small"}}
OWNERS = {"cadence", "motif"}
BUILDS = {"out_in", "fill_stage", "bounce_build", "implode", "accelerando"}
LEAD_S = 0.02            # the beat's light lands a frame early: the eye forgives early, not late


def clarity(an, t0, t1, reach=4.0):
    """How clearly the music beats here: pulse-envelope strength on the beats over its mean
    (1 = no beat to speak of; a steady band groove is 3 and up). Measured over the phrase plus
    `reach` seconds either side, so a two-beat phrase isn't judged on two samples."""
    t0, t1 = max(0.0, t0 - reach), t1 + reach
    env = getattr(an, "pulse_env", None)
    b = an.beats[(an.beats >= t0) & (an.beats < t1)]
    if env is None or len(b) < 3:
        return 1.0
    hop = getattr(an, "pulse_hop", 512 / 22050)
    i0, i1 = int(t0 / hop), max(int(t0 / hop) + 1, int(t1 / hop))
    idx = np.clip(np.round(b / hop).astype(int), 0, len(env) - 1)
    w = max(1, int(round(0.03 / hop)))
    on = np.mean([env[max(0, i - w):i + w + 1].max() for i in idx])
    return float(on / (env[i0:i1].mean() + 1e-9))


def _position(an):
    """Beat index within its bar (0 = downbeat) for every tracked beat."""
    b = np.asarray(an.beats, float)
    d = np.asarray(an.downbeats, float)
    k = np.clip(np.searchsorted(b, d - 0.01), 0, max(0, len(b) - 1))
    downs = set(k[np.abs(b[k] - d) < 0.05].tolist()) if len(b) else set()
    pos = np.zeros(len(b), int)
    last = None
    for i in range(len(b)):
        if i in downs:
            last = i
        pos[i] = (i - last) % 4 if last is not None else i % 4
    return pos


def apply(cars, an, phrases):
    """Lay the beat layer over the choreography (after the moves and drums, before the cues)."""
    ys = [c for c in cars if not c.is_ct]
    ct = next((c for c in cars if c.is_ct), None)
    beats = np.asarray(an.beats, float)
    if len(beats) < 4:
        return {}
    pos = _position(an)
    capped = int(np.max(an.tier)) <= 1          # a song held quiet on purpose (Ave Maria)
    organ = getattr(an, "driver", "") == "organ"
    stats = {"hits": 0, "phrases": 0}
    for ph in _segments(an, phrases):
        move = getattr(ph, "move", "")
        name = move.split(" → ")[-1].split("+")[0].strip()
        mood = getattr(ph, "mood", "drive")
        clear = clarity(an, ph.t0, ph.t1)
        ph.pulse = f"clarity {clear:.1f}: "
        if capped:
            ph.pulse += "off (song held quiet)"
            continue
        if name in OWNERS:
            ph.pulse += f"off ({name} owns the stage)"
            continue
        if name in BUILDS:
            _build_pulse(cars, an, ph, beats)
            ph.pulse += "build: Ys on the beat, then every car, then eighths, half a beat of black, land"
            continue
        if mood == "calm":
            # a quiet passage over a strong beat (a march under a soft verse): a small half-time
            # step on the inner beams - both Ys on 1, the truck on 3 - so the pulse never vanishes
            ph.pulse += "calm: half-time march on the inner beams" if clear >= 3.0 and not organ else "calm: off"
            if clear >= 3.0 and not organ:
                for i in np.flatnonzero((beats >= ph.t0) & (beats < ph.t1) & np.isin(pos, (0, 2))):
                    t = beats[i] - LEAD_S
                    for c in (ys if pos[i] == 0 else ([ct] if ct is not None else [])):
                        c.set(c.inner(), t, t + 0.12, C.ON)
            continue
        if clear < 1.6:                  # no clear beat here: downbeats only, and only when lively
            pattern = {0: "big"} if mood in ("drive", "frenzy") and clear >= 1.25 else {}
        elif organ:                      # the organ: half-time, unless the music itself pounds every beat
            pattern = PATTERN["drive"] if mood == "frenzy" or (mood == "drive" and clear >= 3.0) else PATTERN["groove"]
        elif mood == "groove" and clear >= 3.0:
            pattern = PATTERN["drive"]   # a strong beat under a groove: every beat, light backbeats
        else:
            pattern = PATTERN[mood]
        ph.pulse += {0: "", 1: "downbeats", 2: "1 and 3", 4: "every beat"}.get(len(pattern), str(pattern)) or "off (no clear beat)"
        if not pattern:
            continue
        # the headlights belong to the beat for this phrase: clear what the moves wrote there
        start = ph.t0
        if move.startswith("teardown"):
            ph.pulse += " - skipped (teardown)"
            continue
        for c in cars:
            c.set(HEADS, start, ph.t1, 0)
        stats["phrases"] += 1
        # the beat grows with the music: a groove thumps on the inner beams, drive and frenzy on
        # every headlight - so the intro's pulse is smaller than the chorus's
        lamps = INNER if mood == "groove" else HEADS
        bar_level = 0.6 if mood == "groove" else 1.0
        idx = np.flatnonzero((beats >= ph.t0 - 0.01) & (beats < ph.t1))
        for i in idx:
            b = beats[i]
            nxt = beats[i + 1] if i + 1 < len(beats) else b + 60.0 / max(an.tempo, 40)
            gap = nxt - b
            hold = float(np.clip(gap * 0.3, 0.1, 0.14))
            kind = pattern.get(int(pos[i]))
            t = b - LEAD_S
            if kind == "big":
                for c in cars:
                    c.set(lamps, t, t + hold + 0.04, C.ON)
                if ct is not None:
                    M.bar_flash(ct, t, min(0.3, gap * 0.6), bar_level)
            elif kind == "mid":
                for c in cars:
                    c.set(lamps, t, t + hold, C.ON)
            elif kind == "small":
                for c in ys:
                    c.set(lamps, t, t + hold, C.ON)
            if kind:
                stats["hits"] += 1
                if mood in ("drive", "frenzy"):
                    _duck(cars, t, gap)
            if mood == "frenzy" and ct is not None:
                off = b + gap / 2 - LEAD_S
                if off + 0.1 < nxt - LEAD_S:
                    ct.set(ct.inner(), off, off + min(0.1, gap * 0.25), C.ON)
    return stats


def _build_pulse(cars, an, ph, beats):
    """The pulse through a crescendo: it intensifies instead of stepping aside. First half: the two
    Ys' headlights on every beat; then every car; the last bar in eighths; then half a beat of
    black, and the build's own landing hits the next downbeat. The build move keeps its shape on
    the feature lamps (signatures, DRLs, fogs, the bar)."""
    ys = [c for c in cars if not c.is_ct]
    for c in cars:
        c.set(HEADS, ph.t0, ph.t1, 0)
    b = beats[(beats >= ph.t0 - 0.01) & (beats < ph.t1)]
    if len(b) < 2:
        return
    gap = float(np.median(np.diff(b)))
    land = ph.t1
    span = max(land - ph.t0, 1e-3)
    ticks = []
    for x in b:
        u = (x - ph.t0) / span
        ticks.append((x, u))
        if land - x <= 4 * gap + 0.01:                      # the last bar: eighths
            ticks.append((x + gap / 2, (x + gap / 2 - ph.t0) / span))
    for t, u in ticks:
        if t >= land - gap / 2 - 0.01:                       # the pull-back before the landing
            continue
        who = ys if u < 0.5 else cars
        hold = float(np.clip(gap * (0.3 if u < 0.75 else 0.2), 0.08, 0.14))
        for c in who:
            c.set(HEADS, t - LEAD_S, t - LEAD_S + hold, C.ON)


def _duck(cars, t, gap):
    """Sidechain ducking, as music producers do to make a kick cut through sustained pads: the
    sustained feature lamps - the Ys' signature and DRL strips, which sit in the headlight housing,
    and the truck's bar - go dark for a few frames just before a beat hit, so the hit lands as a
    dark-to-bright step instead of brightening something already lit. The moves keep their shape
    between beats."""
    d = float(np.clip(gap * 0.15, 0.06, 0.1))
    for c in cars:
        if c.is_ct:
            c.set(list(C.FRONT_BAR), t - d, t, 0)
        else:
            c.set(c.sig() + c.drl(), t - d, t, 0)


def _segments(an, phrases, min_gap=0.6):
    """The phrases plus the stretches between them. Phrases come from the transcribed notes, so
    where the melody rests and only the band plays (a drum break, a vamp) there is no phrase - but
    the beat doesn't stop, so each such gap becomes a segment of its own, with its mood read from
    the energy curve (a clearly struck beat keeps it out of calm)."""
    from types import SimpleNamespace
    from .mood import mood_at
    out, last = [], 0.0
    gaps = []
    for ph in sorted(phrases, key=lambda p: p.t0):
        if ph.t0 - last >= min_gap:
            gaps.append((last, ph.t0))
        out.append(ph)
        last = max(last, ph.t1)
    if an.duration - last >= min_gap:
        gaps.append((last, an.duration))
    organ = getattr(an, "driver", "") == "organ"
    an.pulse_gaps = []
    for a, b in gaps:
        mood = mood_at(an, (a + b) / 2)
        if mood == "calm" and not organ and clarity(an, a, b) >= 4.0:
            mood = "groove"
        g = SimpleNamespace(t0=a, t1=b, move="(between phrases)", mood=mood, gesture="gap", pulse="")
        an.pulse_gaps.append(g)
        out.append(g)
    return sorted(out, key=lambda p: p.t0)
