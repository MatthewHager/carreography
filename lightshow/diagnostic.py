"""The diagnostic show (00_diagnostic): run it first, before the event, to check every car.

A voice announces each test, then the cars do it:

  identity      each car flashes alone - "car one, the Model Y on the crowd's left" - so a USB drive
                in the wrong car shows at once
  sweep         the headlights sweep crowd-left to crowd-right across all three cars (orientation)
  sync          all three cars flash on a click track (the shows were started together); every
                announcement also opens with a short tone that all three cars flash with, so sync is
                checked all the way through
  tones         the lights stay on exactly as long as each of three tones (start and end both line up)
  lamp check    every front lamp channel alone, on all three cars, named as Tesla documents it (the
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

The voice comes from macOS's `say`. The audio and its timings are kept in songs/00_diagnostic.wav and
songs/00_diagnostic.json, so the show rebuilds anywhere; they are only regenerated (macOS) when the
script below changes.
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
from .motors import LIFTGATE_CLOSE_S, LIFTGATE_OPEN_S

SR = 44100
VOICE, RATE = "Samantha", 175
GAP = 0.5              # speech -> action
AFTER = 1.0            # action -> next speech
HOLD = 0.4             # how long a motor command byte is held
PIP_BEFORE, PIP_LEN = 0.45, 0.1            # the tone (and flash) that opens every announcement
SYNC_BEEPS, SYNC_EVERY, BEEP_LEN = 8, 0.5, 0.08
TONES = [(0.0, 0.25), (1.0, 0.5), (2.2, 1.0)]   # tone check: (start after the action begins, length)

# (key, announcement, action seconds). The action for each key is in _actions below.
SCRIPT = [
    ("intro", "Tesla light show diagnostic. All three cars should be playing this at the same moment. "
              "Each test is announced, then the cars do it.", 0.0),
    ("car1", "Car one. The Model Y on the crowd's left. Only this car flashes.", 3.0),
    ("car2", "Car two. The Cybertruck, in the middle. Only this car flashes.", 3.0),
    ("car3", "Car three. The Model Y on the crowd's right. Only this car flashes.", 3.0),
    ("sweep", "Sweep. The headlights run from the crowd's left to the crowd's right, twice.", 4.0),
    ("sync", "Sync check. All three cars flash together, on each beep.", 4.5),
    ("tones", "Tone check. The lights stay on exactly as long as each tone.", 4.0),
    ("lamps", "Lamp check. Each lamp channel lights for two seconds on all three cars. Note what lights up.", 0.0),
    ("ch_outer", "Outer main beams.", 2.0),
    ("ch_inner", "Inner main beams.", 2.0),
    ("ch_sig", "Signature lights. Not on the Cybertruck.", 2.0),
    ("ch_4", "Channel four. Not on the Cybertruck.", 2.0),
    ("ch_5", "Channel five. Not on the Cybertruck.", 2.0),
    ("ch_6", "Channel six. Not on the Cybertruck.", 2.0),
    ("ch_turn", "Front turn signals.", 2.0),
    ("ch_fog", "Fog lights. Not on the Cybertruck.", 2.0),
    ("ch_park", "Aux park lights. On the Cybertruck, the light inside the frunk.", 2.0),
    ("ch_marker", "Side markers.", 2.0),
    ("bar_a", "Light bar test A. The front light bars sweep left to right, using their sixty LED channels. "
              "If a Model Y's bar sweeps now, it reads the LED channels.", 6.0),
    ("bar_b", "Light bar test B. Channel six only. If a Model Y's whole bar lights now, it reads channel six. The Cybertruck stays dark.", 3.0),
    ("fade", "Fade test. The headlights fade up over two seconds, then fade out.", 5.0),
    ("interior", "Interior lights. Red, green, then blue.", 4.5),
    ("clear", "Motor tests next. Please stand clear of the mirrors, windows, liftgates and frunk.", 0.0),
    ("mirrors", "Mirrors fold, then unfold.", 6.0),
    ("port", "Charge port opens, then closes.", 7.0),
    ("windows", "Windows open, then dance. They stay open for the shows.", 10.0),
    ("lids_open", "The liftgates and the Cybertruck's frunk open now. Counting the seconds. "
                  "Note when each one stops.", 17.0),
    ("lids_dance", "Now the liftgates and the frunk dance for five seconds.", 6.0),
    ("lids_close", "Closing. Counting the seconds.", 7.0),
    ("done", "Diagnostic complete. If every test looked right, the cars are ready for the show.", 0.0),
]
COUNTS = {"lids_open": int(max(LIFTGATE_OPEN_S.values())) + 2, "lids_close": int(LIFTGATE_CLOSE_S) + 2}
NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
           "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"]


def _script_hash():
    blob = json.dumps([SCRIPT, COUNTS, VOICE, RATE, GAP, AFTER, PIP_BEFORE, PIP_LEN, SYNC_BEEPS,
                       SYNC_EVERY, BEEP_LEN, TONES]).encode()
    return hashlib.sha256(blob).hexdigest()[:16]


# --- audio ---------------------------------------------------------------------------------------

def _say(text, tmp):
    out = Path(tmp) / f"{hashlib.md5(text.encode()).hexdigest()}.wav"
    subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "--file-format=WAVE",
                    f"--data-format=LEI16@{SR}", "-o", str(out), text], check=True)
    with wave.open(str(out)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(1)
    nz = np.flatnonzero(np.abs(x) > 1e-3)                     # trim the silence say leaves around it
    return x[nz[0]: nz[-1] + 1] if len(nz) else x


def _tone(seconds, hz=1000.0, level=0.5):
    """A sine tone with 5 ms edges, so it starts and stops crisply without a click."""
    t = np.arange(int(seconds * SR)) / SR
    edge = np.clip(np.minimum(t, seconds - t) / 0.005, 0, 1)
    return (level * np.sin(2 * np.pi * hz * t) * edge).astype(np.float32)


def make_audio(wav_path, timing_path):
    """Speak the script into wav_path and write the timings (the light cues' clock) to timing_path."""
    if shutil.which("say") is None:
        raise SystemExit("the diagnostic's voice needs macOS (say); keep songs/00_diagnostic.wav/.json instead")
    with tempfile.TemporaryDirectory() as tmp:
        clips = {key: _say(text, tmp) for key, text, _ in SCRIPT}
        nums = [_say(w, tmp) for w in NUMBERS]
    t, steps, events = 1.0, [], []
    for key, _, action in SCRIPT:
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
        for k in range(COUNTS.get(key, 0)):
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
    timing_path.write_text(json.dumps({"script": _script_hash(), "duration": round(len(audio) / SR, 3),
                                       "steps": steps}, indent=1) + "\n")


def ensure_audio(wav_path, timing_path):
    """Regenerate the voice track only when the script changed (and say is available)."""
    fresh = (wav_path.exists() and timing_path.exists()
             and json.loads(timing_path.read_text()).get("script") == _script_hash())
    if not fresh:
        if shutil.which("say"):
            make_audio(wav_path, timing_path)
        elif not wav_path.exists():
            raise SystemExit("songs/00_diagnostic.wav is missing and macOS say isn't available to make it")
        else:
            print("  (diagnostic script changed but say isn't available: keeping the old voice track)")
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
    if key in ("car1", "car2", "car3"):
        car = cars[int(key[-1]) - 1]
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
    """The three cars' frames for the diagnostic, on the voice track's clock."""
    from .choreo import make_lineup
    step = C.STEP_MS / 1000
    cars = make_lineup(layout, int(np.ceil(timing["duration"] / step)), step)
    for s in timing["steps"]:
        _actions(cars, s)
    for car in cars:
        car.frames[-3:] = 0
    return cars
