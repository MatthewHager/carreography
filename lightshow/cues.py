"""Cue sheets: the signature moments of each piece, located in the recording by detectors and
applied as overrides on top of the choreography.

Actions:
  solo      only the named cars play for a window (everything else dark)
  hit       a stage-wide hit: blackout, everything on, release
  blackout  dark for a window
  peak      a crescendo peak the frunk/liftgates must rise into (build length in seconds; `hold`
            seconds open afterwards, or `final: true` to stay open to the end)
  ceiling   force the intensity ceiling for a window (0..3)
  dark_end  everything fades and stays dark from a time to the end

Detectors (`at`):
  first_phrase              the opening phrase
  last_arrival              the last arrival chord / cadence before the end
  loudest_last_quarter      the loudest instant in the closing quarter
  shouts:N                  the N strongest chordal hits, >= 1.5 s apart
  big_chord_last_fifth      the biggest chord in the closing fifth (voices, then length, then loudness)
  final_section             the last section of the form map
  t=SECONDS                 an explicit time in this recording
"""

import numpy as np

# What drives the rhythm in each piece, and so what the beat layer listens to and which moves it
# prefers. "organ": the notes are the rhythm (nothing else). "orchestra": timpani, low brass and
# the string pulse (percussive onsets), beat moves only where the beat is steady. "band": the drum
# kit from the drums stem (kick -> headlights, snare -> the Ys, hats -> markers), bass guitar under,
# beat-locked moves preferred. "vocal_band": a band with the singers carrying the melody, lyric cues.
DRIVERS = {
    "01_toccata_and_fugue": "organ",
    "02_this_is_halloween": "vocal_band",
    "03_danse_macabre": "orchestra",
    "04_monster_mash": "vocal_band",
    "05_hall_of_the_mountain_king": "orchestra",
    "06_ghostbusters": "vocal_band",
    "07_thriller": "vocal_band",
    "08_she_blinded_me_with_science": "vocal_band",
    "09_sorcerers_apprentice": "orchestra",
    "10_addams_family": "band",
    "11_night_on_bald_mountain": "orchestra",
    "12_ave_maria": "organ",
}


def driver(name):
    return DRIVERS.get(name, "orchestra")


CUES = {
    # Bach. The opening mordent is the most recognisable second in organ music: the truck alone.
    # The cadenza chord before the ending is the pinnacle; the frunk rises into it.
    "01_toccata_and_fugue": [
        {"at": "first_phrase", "do": "solo", "cars": ["center"]},
        {"at": "t=123.7", "do": "hit", "hold": 2.0},     # the Toccata's cadenza chord (this recording)
        {"at": "t=123.7", "do": "peak", "build": 8.0, "hold": 8.0},
        {"at": "loudest_last_quarter", "do": "peak", "build": 12.0, "final": True},   # the Fugue's ending
    ],
    # Elfman. The "This is Halloween!" shouts hit the whole stage every time; the last chorus is
    # the climax and the frunk rises into its loudest moment; the verses stay modest.
    "02_this_is_halloween": [
        {"at": "shouts:10", "do": "hit", "hold": 0.25},
        {"at": "final_section", "do": "ceiling", "value": 3},
        {"at": "loudest_last_quarter", "do": "peak", "build": 8.0},
    ],
    "03_danse_macabre": [     # midnight harp chimes open it: stay dark but for the truck
        {"at": "first_phrase", "do": "solo", "cars": ["center"]},
        {"at": "loudest_last_quarter", "do": "peak", "build": 10.0},
        {"at": "last_arrival", "do": "hit", "hold": 1.5},
    ],
    "05_hall_of_the_mountain_king": [   # one long accelerando: the end is everything
        {"at": "final_section", "do": "ceiling", "value": 3},
        {"at": "loudest_last_quarter", "do": "peak", "build": 14.0},
        {"at": "last_arrival", "do": "hit", "hold": 2.0},
    ],
    "07_thriller": [
        {"at": "shouts:6", "do": "hit", "hold": 0.3},
        {"at": "loudest_last_quarter", "do": "peak", "build": 12.0},
    ],
    "11_night_on_bald_mountain": [      # the church bell and the dawn: fade to dark at the end
        {"at": "loudest_last_quarter", "do": "peak", "build": 12.0},
    ],
}

DEFAULT = [
    {"at": "final_section", "do": "ceiling", "value": 3},
    {"at": "loudest_last_quarter", "do": "peak", "build": 8.0},
]


def resolve(name, an):
    """Turn a song's cue list into concrete (action, params) with times, using the analysis."""
    sheet = CUES.get(name, DEFAULT)
    ev, phrases, secs = an.events, an.phrases or [], an.sections or []
    out = []
    for cue in sheet:
        at = cue["at"]
        times = []
        if at == "first_phrase" and phrases:
            times = [(phrases[0].t0, phrases[0].t1)]
        elif at == "last_arrival":
            cands = [float(t) for t in ev.t[ev.arrival == 1] if t < an.duration - 4]
            cands += [ph.t0 for ph in phrases if ph.gesture == "cadence" and ph.t0 < an.duration - 4]
            if cands:
                t = max(cands)
                times = [(t, t)]
        elif at == "loudest_last_quarter":
            f0 = int(0.75 * len(an.loud_fast))
            f = f0 + int(np.argmax(an.loud_fast[f0:-int(3 / an.step)]))
            times = [(f * an.step, f * an.step)]
        elif at == "big_chord_last_fifth":
            # The biggest chord in the closing fifth: the most voices, then the loudest, then the longest.
            f0 = 0.8 * an.duration
            idx = [i for i in range(len(ev)) if ev.t[i] >= f0 and ev.t[i] < an.duration - 4 and ev.kind[i] >= 1]
            if idx:
                best = max(idx, key=lambda i: (ev.n[i] + min(ev.dur[i], 1.5) * 2, ev.amp[i]))
                t = float(ev.t[best])
                times = [(t, t)]
        elif at.startswith("shouts:"):
            n = int(at.split(":")[1])
            idx = np.flatnonzero(ev.kind >= 1)
            idx = idx[np.argsort(-ev.amp[idx])]
            picked = []
            for i in idx:
                t = float(ev.t[i])
                if all(abs(t - q) >= 1.5 for q in picked):
                    picked.append(t)
                if len(picked) >= n:
                    break
            times = [(t, t) for t in sorted(picked)]
        elif at == "final_section" and secs:
            times = [(secs[-1].t0, secs[-1].t1)]
        elif at.startswith("t="):
            t = float(at[2:])
            times = [(t, t)]
        for t0, t1 in times:
            out.append((cue["do"], dict(cue, t0=t0, t1=t1)))
    return out
