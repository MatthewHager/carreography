"""Lyrics with word timing (Whisper on the isolated vocal stem), and lyric-driven cues.

For the sung songs the words are the choreographer's script: a line of lyric is a phrase, and
certain words call specific pictures - "eyes glowing red" turns every interior red, "scream" is
lightning, "pumpkin" goes orange, a chant of "Halloween, Halloween..." pings across the cars.
"""

import json
import pathlib
import re

import numpy as np

ORANGE = (255, 90, 0)
RED = (255, 0, 0)
GREEN = (40, 255, 30)
PURPLE = (120, 0, 220)
WHITE = (255, 255, 255)


def transcribe_words(vocals_wav: str) -> list:
    """[(start, end, word)] from the vocal stem, cached next to it."""
    wav = pathlib.Path(vocals_wav)
    cache = wav.with_suffix(".words.json")
    if cache.exists() and cache.stat().st_mtime >= wav.stat().st_mtime:
        return [tuple(w) for w in json.loads(cache.read_text())]
    import librosa
    from faster_whisper import WhisperModel
    audio, _ = librosa.load(str(wav), sr=16000, mono=True)
    # temperature 0 (no random-sampling fallback) and fixed threads: the same vocals must always
    # give the same word timings, or a rebuild moves the lyric cues
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)
    segs, _ = model.transcribe(audio.astype(np.float32), word_timestamps=True, vad_filter=True, beam_size=5,
                               temperature=0.0)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append((round(float(w.start), 2), round(float(w.end), 2), re.sub(r"[^A-Za-z' ]", "", w.word).strip().lower()))
    cache.write_text(json.dumps(words))
    return words


def lines(words, gap=0.8):
    """Group words into sung lines at pauses of `gap` seconds or more: [(start, end, text)]."""
    out, cur = [], []
    for st, en, w in words:
        if cur and st - cur[-1][1] >= gap:
            out.append((cur[0][0], cur[-1][1], " ".join(x[2] for x in cur)))
            cur = []
        cur.append((st, en, w))
    if cur:
        out.append((cur[0][0], cur[-1][1], " ".join(x[2] for x in cur)))
    return out


# Per-song lyric rules: a regex over the running text of each line, and the picture to make.
#   color   interior colour for the matched words' span (plus `hold` seconds)
#   hit     a stage hit on each matched word
#   lightning  three strobes on each matched word
#   chant   consecutive repeats of the word ping across the cars, one car per word
#   solo    only the named cars for the span of the line
LYRIC_RULES = {
    "02_this_is_halloween": [
        {"match": r"eyes glowing red|glowing red", "do": "color", "color": RED, "hold": 2.5, "span": "line"},
        {"match": r"\bred\b", "do": "color", "color": RED, "hold": 1.5},
        {"match": r"\bscream\b", "do": "lightning"},
        {"match": r"pumpkin", "do": "color", "color": ORANGE, "hold": 3.0},
        {"match": r"halloween", "do": "chant"},
        {"match": r"trick or treat", "do": "hit", "hold": 0.3},
        {"match": r"slightly green", "do": "color", "color": GREEN, "hold": 2.0},
        {"match": r"dead of night|shadow on the moon", "do": "color", "color": PURPLE, "hold": 2.0},
        {"match": r"boys and girls", "do": "solo", "cars": ["center"], "span": "line"},
    ],
    "07_thriller": [
        {"match": r"thriller", "do": "chant"},
        {"match": r"\bscream\b|terror", "do": "lightning"},
        {"match": r"darkness|midnight", "do": "color", "color": PURPLE, "hold": 2.0},
        {"match": r"killer", "do": "hit", "hold": 0.3},
    ],
    "06_ghostbusters": [
        {"match": r"who you gonna call|who ya gonna call", "do": "hit", "hold": 0.3},
        {"match": r"ghostbusters", "do": "chant"},
        {"match": r"afraid", "do": "lightning"},
    ],
    "04_monster_mash": [
        {"match": r"monster mash", "do": "chant"},
        {"match": r"mash", "do": "hit", "hold": 0.2},
        {"match": r"graveyard|zombies|ghouls", "do": "color", "color": GREEN, "hold": 2.0},
        {"match": r"dracula|vampire", "do": "color", "color": RED, "hold": 2.0},
    ],
    "08_she_blinded_me_with_science": [
        {"match": r"science", "do": "chant"},
        {"match": r"blinded", "do": "lightning"},
    ],
}


def lyric_cues(name, words):
    """Resolve the song's lyric rules against the timed words -> [(action, params)]."""
    rules = LYRIC_RULES.get(name, [])
    if not rules or not words:
        return []
    out = []
    for lstart, lend, text in lines(words):
        lw = [w for w in words if lstart <= w[0] <= lend]
        for rule in rules:
            for m in re.finditer(rule["match"], text):
                # map the match back to word times by counting words before it
                before = text[: m.start()].split()
                n_before = len(before)
                n_match = len(m.group(0).split())
                span = lw[n_before: n_before + n_match]
                if not span:
                    continue
                t0, t1 = span[0][0], span[-1][1]
                if rule.get("span") == "line":   # the sung line around the words, within 6 s
                    t0, t1 = max(lstart, t0 - 2.0), min(lend, t1 + 4.0)
                a = rule["do"]
                if a == "color":
                    out.append(("color", {"t0": t0, "t1": t1 + rule.get("hold", 1.0), "color": rule["color"]}))
                elif a == "hit":
                    out.append(("hit", {"t0": t0, "t1": t0, "hold": rule.get("hold", 0.3)}))
                elif a == "lightning":
                    out.append(("lightning", {"t0": t0, "t1": t0}))
                elif a == "solo":
                    out.append(("solo", {"t0": t0, "t1": t1, "cars": rule["cars"]}))
                elif a == "chant":
                    out.append(("chant_word", {"t0": t0, "t1": t1}))
    # Chants: runs of the chant word within 1.2 s of each other -> one ping per word across the cars.
    chant = sorted((c for a, c in out if a == "chant_word"), key=lambda c: c["t0"])
    out = [(a, c) for a, c in out if a != "chant_word"]
    i = 0
    while i < len(chant):
        j = i
        while j + 1 < len(chant) and chant[j + 1]["t0"] - chant[j]["t0"] <= 1.6:
            j += 1
        run = chant[i: j + 1]
        if len(run) >= 2:
            for k, c in enumerate(run):
                out.append(("ping", {"t0": c["t0"], "t1": c["t0"], "car": k}))
        else:
            out.append(("hit", {"t0": run[0]["t0"], "t1": run[0]["t0"], "hold": 0.25}))
        i = j + 1
    return sorted(out, key=lambda x: x[1]["t0"])
