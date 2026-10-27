"""The diagnostic show (00_diagnostic): run it first, before a show, to check every car.

A voice announces each test, then the cars do it:

  identity      each car flashes alone - "car one, the Model Y on the crowd's left" - so a USB drive
                in the wrong car shows at once
  sweep         the headlights sweep crowd-left to crowd-right across all the cars (orientation)
  sync          every car flashes on a click track (the shows were started together); every
                announcement also opens with a short tone that every car flashes with, so sync is
                checked all the way through
  tones         the lights stay on exactly as long as each of three tones (start and end both line up)
  lamp check    every front lamp channel alone, on every car, named as Tesla documents it (the
                voice says which ones a Cybertruck doesn't have, so its dark moments aren't a fault) -
                this also shows what each channel does on a 2025+ Model Y, which Tesla never documented
  light bar     test A lights the bar through its 60 LED channels only (a sweep), test B through
                channel 6 only (the whole bar): whichever lights a Model Y's bar is the one it reads
  fade          a 2 s ramp up and down on the headlights
  interior      red, green, blue
  motors        mirrors fold and unfold; the charge port opens and closes; the windows open and
                dance (they stay down, as for the shows); the liftgates and the Cybertruck's frunk
                open, dance for 5 s and close while the voice counts the seconds - time the frunk here
                (motors.py: Model Y liftgate 14 s, Cybertruck frunk 10 s to open)

The announcements are written for the lineup (lightshow/vehicles.py): one to five cars, and the
lines about liftgates, frunks and light bars name only what that lineup has. The voice is macOS's
`say` (Samantha) or, elsewhere, espeak-ng. The audio and its timings (a .json next to the .wav) are
kept and only regenerated when the script, the lineup or the voice changes, so a show rebuilds
without a voice installed as long as its voice track is there.
"""

import hashlib
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

from . import channels as C
from . import vehicles as VEH
from .motors import LIFTGATE_CLOSE_S, LIFTGATE_OPEN_S

SR = 44100
VOICE, RATE = "Samantha", 175              # macOS say
ESPEAK_VOICE, ESPEAK_RATE = "en-us", 165   # espeak-ng, where say isn't available
GAP = 0.5              # speech -> action
AFTER = 1.0            # action -> next speech
HOLD = 0.4             # how long a motor command byte is held
PIP_BEFORE, PIP_LEN = 0.45, 0.1            # the tone (and flash) that opens every announcement
SYNC_BEEPS, SYNC_EVERY, BEEP_LEN = 8, 0.5, 0.08
TONES = [(0.0, 0.25), (1.0, 0.5), (2.2, 1.0)]   # tone check: (start after the action begins, length)

COUNT_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five"}


def _lids(lineup, short=False):
    """'the liftgates and the Cybertruck's frunk' (short: 'the liftgates and the frunk'), for any lineup."""
    ys, cts = sum(ch in "Yy" for ch in lineup), lineup.count("C")
    gates = "the liftgate" + ("s" if ys > 1 else "") if ys else ""
    if not cts:
        return gates
    frunk = "the frunk" + ("s" if cts > 1 else "") if short or not ys else (
        "the Cybertruck's frunk" if cts == 1 else "the Cybertrucks' frunks")
    return f"{gates} and {frunk}" if gates else frunk


def script(lineup="YCY"):
    """[(key, announcement, action seconds)] for this lineup. The action for each key is in
    _actions below. (The wording for the classic YCY lineup is the one its voice track was made with.)"""
    cars = VEH.cars(lineup)
    n, truck = len(cars), "C" in lineup
    everyone = {1: "The car", 2: "Both cars"}.get(n, f"All {COUNT_WORDS[n]} cars")
    on_all = {1: "on the car", 2: "on both cars"}.get(n, f"on all {COUNT_WORDS[n]} cars")
    not_ct = " Not on the Cybertruck." if truck else ""
    lids = _lids(lineup)
    plural = len(lineup) > 1
    together = f"{everyone} should be playing this at the same moment. " if plural else ""
    out = [("intro", f"Tesla light show diagnostic. {together}"
                     f"Each test is announced, then the {'cars do' if plural else 'car does'} it.", 0.0)]
    for i, (_, v, place) in enumerate(cars):
        where = VEH.SPOKEN_PLACES[place]
        where = f", {where}" if place == "Center" else f" {where}" if where else ""
        model = "Cybertruck" if v.kind == "cybertruck" else "Model Y"
        out.append((f"car{i + 1}", f"Car {COUNT_WORDS[i + 1]}. The {model}{where}. Only this car flashes.", 3.0))
    out += [
        ("sweep", "Sweep. The headlights run from the crowd's left to the crowd's right, twice.", 4.0),
        ("sync", f"Sync check. {everyone} flash{'' if plural else 'es'} together, on each beep."
         if plural else "Sync check. The car flashes on each beep.", 4.5),
        ("tones", "Tone check. The lights stay on exactly as long as each tone.", 4.0),
        ("lamps", f"Lamp check. Each lamp channel lights for two seconds {on_all}. Note what lights up.", 0.0),
        ("ch_outer", "Outer main beams.", 2.0),
        ("ch_inner", "Inner main beams.", 2.0),
        ("ch_sig", "Signature lights." + not_ct, 2.0),
        ("ch_4", "Channel four." + not_ct, 2.0),
        ("ch_5", "Channel five." + not_ct, 2.0),
        ("ch_6", "Channel six." + not_ct, 2.0),
        ("ch_turn", "Front turn signals.", 2.0),
        ("ch_fog", "Fog lights." + not_ct, 2.0),
        ("ch_park", "Aux park lights." + (" On the Cybertruck, the light inside the frunk." if truck else ""), 2.0),
        ("ch_marker", "Side markers.", 2.0),
    ]
    if "Y" in lineup or truck:
        out.append(("bar_a", "Light bar test A. The front light bars sweep left to right, using their sixty LED channels."
                    + (" If a Model Y's bar sweeps now, it reads the LED channels." if "Y" in lineup else ""), 6.0))
    if "Y" in lineup:
        out.append(("bar_b", "Light bar test B. Channel six only. If a Model Y's whole bar lights now, it reads channel six."
                    + (" The Cybertruck stays dark." if truck else ""), 3.0))
    stand_clear = "the mirrors, windows, " + lids.replace("the ", "").replace("Cybertruck's ", "").replace("Cybertrucks' ", "")
    if " and " not in stand_clear:
        stand_clear = stand_clear.replace("windows, ", "windows and ")
    lid_verb = "open" if (lids.endswith("s") or " and " in lids) else "opens"
    out += [
        ("fade", "Fade test. The headlights fade up over two seconds, then fade out.", 5.0),
        ("interior", "Interior lights. Red, green, then blue.", 4.5),
        ("clear", f"Motor tests next. Please stand clear of {stand_clear}.", 0.0),
        ("mirrors", "Mirrors fold, then unfold.", 6.0),
        ("port", "Charge port opens, then closes.", 7.0),
        ("windows", "Windows open, then dance. They stay open for the shows.", 10.0),
        ("lids_open", f"{lids[0].upper()}{lids[1:]} {lid_verb} now. Counting the seconds. "
                      f"Note when {'each one stops' if lid_verb == 'open' else 'it stops'}.", 17.0),
        ("lids_dance", f"Now {_lids(lineup, short=True)} dance{'' if lid_verb == 'open' else 's'} for five seconds.", 6.0),
        ("lids_close", "Closing. Counting the seconds.", 7.0),
        ("done", f"Diagnostic complete. If every test looked right, the {'cars are' if plural else 'car is'} ready for the show.", 0.0),
    ]
    return out


def counts(lineup="YCY"):
    """How many seconds the voice counts while the lids open and close."""
    kinds = {VEH.VEHICLES[ch].kind for ch in lineup}
    return {"lids_open": int(max(LIFTGATE_OPEN_S[k] for k in kinds)) + 2, "lids_close": int(LIFTGATE_CLOSE_S) + 2}


NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
           "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"]


def voice():
    """The text-to-speech engine on this machine: 'say' (macOS), 'espeak-ng', or None."""
    return next((v for v in ("say", "espeak-ng") if shutil.which(v)), None)


def _script_hash(lineup="YCY", engine="say"):
    voice_id = VOICE if engine == "say" else f"espeak-ng:{ESPEAK_VOICE}"   # the YCY hash predates other voices
    rate = RATE if engine == "say" else ESPEAK_RATE
    blob = json.dumps([script(lineup), counts(lineup), voice_id, rate, GAP, AFTER, PIP_BEFORE, PIP_LEN,
                       SYNC_BEEPS, SYNC_EVERY, BEEP_LEN, TONES]).encode()
    return hashlib.sha256(blob).hexdigest()[:16]


# --- audio ---------------------------------------------------------------------------------------

def _say(text, tmp, engine):
    out = Path(tmp) / f"{hashlib.md5(text.encode()).hexdigest()}.wav"
    if engine == "say":
        subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "--file-format=WAVE",
                        f"--data-format=LEI16@{SR}", "-o", str(out), text], check=True)
    else:
        subprocess.run(["espeak-ng", "-v", ESPEAK_VOICE, "-s", str(ESPEAK_RATE), "-w", str(out), text], check=True)
    with wave.open(str(out)) as w:
        rate = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(1)
    if rate != SR:                                            # espeak-ng speaks at 22.05 kHz
        x = np.interp(np.arange(int(len(x) * SR / rate)) * rate / SR, np.arange(len(x)), x).astype(np.float32)
    nz = np.flatnonzero(np.abs(x) > 1e-3)                     # trim the silence say leaves around it
    return x[nz[0]: nz[-1] + 1] if len(nz) else x


def _tone(seconds, hz=1000.0, level=0.5):
    """A sine tone with 5 ms edges, so it starts and stops crisply without a click."""
    t = np.arange(int(seconds * SR)) / SR
    edge = np.clip(np.minimum(t, seconds - t) / 0.005, 0, 1)
    return (level * np.sin(2 * np.pi * hz * t) * edge).astype(np.float32)


def make_audio(wav_path, timing_path, lineup="YCY", engine=None):
    """Speak the script into wav_path and write the timings (the light cues' clock) to timing_path."""
    engine = engine or voice()
    if engine is None:
        raise SystemExit("the diagnostic's voice needs macOS (say) or espeak-ng (apt install espeak-ng)")
    lines, count = script(lineup), counts(lineup)
    with tempfile.TemporaryDirectory() as tmp:
        clips = {key: _say(text, tmp, engine) for key, text, _ in lines}
        nums = [_say(w, tmp, engine) for w in NUMBERS]
    t, steps, events = 1.0, [], []
    for key, _, action in lines:
        speech = len(clips[key]) / SR
        events.append((t - PIP_BEFORE, _tone(PIP_LEN, 1500.0, 0.35)))
        events.append((t, clips[key]))
        act = t + speech + GAP
        steps.append({"key": key, "speech": round(t, 3), "action": round(act, 3), "end": round(act + action, 3)})
        if key == "sync":
            for k in range(SYNC_BEEPS):
                events.append((act + SYNC_EVERY * k, _tone(BEEP_LEN, 1000.0)))
        if key == "tones":
            for at, length in TONES:
                events.append((act + at, _tone(length, 660.0)))
        for k in range(count.get(key, 0)):
            events.append((act + 1.0 + k, nums[k]))       # "one" when the first second has passed
        t = act + action + (AFTER if action else 0.3)
    audio = np.zeros(int((t + 1.5) * SR), np.float32)
    for at, clip in events:
        i = int(round(at * SR))
        audio[i: i + len(clip)] += clip
    audio = np.clip(audio / max(1.0, np.abs(audio).max()) * 0.9, -1, 1)
    pcm = (np.repeat(audio[:, None], 2, 1) * 32767).astype("<i2")
    with wave.open(str(wav_path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    timing_path.write_text(json.dumps({"script": _script_hash(lineup, engine), "lineup": lineup,
                                       "duration": round(len(audio) / SR, 3), "steps": steps}, indent=1) + "\n")


def ensure_audio(wav_path, timing_path, lineup="YCY"):
    """Regenerate the voice track only when it's missing or out of date for this lineup and voice.
    A track made with say is kept on a machine that only has espeak-ng (it's the better voice)."""
    old = json.loads(timing_path.read_text()) if wav_path.exists() and timing_path.exists() else {}
    engine = voice()
    current = {_script_hash(lineup, e) for e in ("say", "espeak-ng")}
    if old.get("script") == _script_hash(lineup, engine or "say") or (old.get("script") in current and engine != "say"):
        return old
    if engine is None and old.get("lineup", "YCY") == lineup:
        print("  (diagnostic script changed but no voice is installed: keeping the old voice track)")
        return old
    make_audio(wav_path, timing_path, lineup, engine)
    return json.loads(timing_path.read_text())


# --- lights and motors ---------------------------------------------------------------------------

LAMP_CHANNELS = {
    "ch_outer": (C.L_OUTER_MAIN, C.R_OUTER_MAIN), "ch_inner": (C.L_INNER_MAIN, C.R_INNER_MAIN),
    "ch_sig": (C.L_SIGNATURE, C.R_SIGNATURE), "ch_4": (C.L_CH4, C.R_CH4), "ch_5": (C.L_CH5, C.R_CH5),
    "ch_6": (C.L_CH6, C.R_CH6), "ch_turn": (C.L_FRONT_TURN, C.R_FRONT_TURN),
    "ch_fog": (C.L_FRONT_FOG, C.R_FRONT_FOG), "ch_park": (C.L_AUX_PARK, C.R_AUX_PARK),
    "ch_marker": (C.L_SIDE_MARKER, C.R_SIDE_MARKER),
}
FRONT_ALL = [ch for pair in LAMP_CHANNELS.values() for ch in pair]


def _bar(car, t, values):
    car.pixels(C.FRONT_BAR, t, values)


def _flash_all(car, t, dur):
    car.set(FRONT_ALL, t, t + dur, C.ON)
    _bar(car, t, np.ones((car.fr(t + dur) - car.fr(t), len(C.FRONT_BAR))))


def _actions(cars, step):
    key, t, end = step["key"], step["action"], step["end"]
    pip = step["speech"] - PIP_BEFORE
    for c in cars:                             # every announcement's opening tone: all cars flash
        c.set(c.inner(), pip, pip + PIP_LEN, C.ON)
    if key.startswith("car") and key[3:].isdigit():
        car = cars[int(key[3:]) - 1]
        for k in range(3):
            _flash_all(car, t + k, 0.5)
    elif key == "sweep":
        slots = [(c, s) for c in cars for s in ("L", "R")]
        per = 2.0 / len(slots)
        for rep in range(2):
            for k, (c, s) in enumerate(slots):
                a = t + rep * 2.0 + k * per
                c.set(c.heads(s), a, a + per, C.ON)
    elif key == "sync":
        for k in range(SYNC_BEEPS):
            a = t + SYNC_EVERY * k
            for c in cars:
                c.set(c.heads(), a, a + BEEP_LEN, C.ON)
    elif key == "tones":
        for at, length in TONES:
            for c in cars:
                c.set(c.heads(), t + at, t + at + length, C.ON)
    elif key in LAMP_CHANNELS:
        for c in cars:
            c.set(list(LAMP_CHANNELS[key]), t, end, C.ON)
    elif key == "bar_a":                       # pixels only, a comet crossing the bar twice
        leds = np.arange(len(C.FRONT_BAR))
        for c in cars:
            n = c.fr(end) - c.fr(t)
            pos = (np.arange(n) / n * 2 % 1) * (len(leds) - 1)
            _bar(c, t, np.exp(-((leds[None, :] - pos[:, None]) / 5.0) ** 2))
    elif key == "bar_b":                       # channel 6 only
        for c in cars:
            c.set([C.L_CH6, C.R_CH6], t, end, C.ON)
    elif key == "fade":
        for c in cars:
            c.set(c.heads(), t, t + 2.5, C.ON_2000)
            c.set(c.heads(), t + 2.5, end, C.OFF_2000)
    elif key == "interior":
        for k, color in enumerate(((255, 0, 0), (0, 255, 0), (0, 0, 255))):
            for c in cars:
                c.rgb(t + 1.5 * k, t + 1.5 * (k + 1), color)
    elif key == "mirrors":
        for c in cars:
            for m in C.MIRRORS:
                c.closure(m, t, t + HOLD, C.CLOSURE_CLOSE)
                c.closure(m, t + 3.0, t + 3.0 + HOLD, C.CLOSURE_OPEN)
    elif key == "port":
        for c in cars:
            c.closure(C.CHARGE_PORT, t, t + HOLD, C.CLOSURE_OPEN)
            c.closure(C.CHARGE_PORT, t + 4.0, t + 4.0 + HOLD, C.CLOSURE_CLOSE)
    elif key == "windows":
        for c in cars:
            for w in C.WINDOWS:
                c.closure(w, t, t + HOLD, C.CLOSURE_OPEN)
                c.closure(w, t + 5.0, end - 1.0, C.CLOSURE_DANCE)
    elif key == "lids_open":
        for c in cars:
            c.closure(C.LIFTGATE, t, t + HOLD, C.CLOSURE_OPEN)
    elif key == "lids_dance":
        for c in cars:
            c.closure(C.LIFTGATE, t, t + 5.0, C.CLOSURE_DANCE)
    elif key == "lids_close":
        for c in cars:
            c.closure(C.LIFTGATE, t, t + HOLD, C.CLOSURE_CLOSE)


def choreograph(timing, layout="YCY"):
    """Every car's frames for the diagnostic, on the voice track's clock."""
    from .choreo import make_lineup
    step = C.STEP_MS / 1000
    cars = make_lineup(layout, int(np.ceil(timing["duration"] / step)), step)
    for s in timing["steps"]:
        _actions(cars, s)
    for car in cars:
        car.frames[-3:] = 0
    return cars
