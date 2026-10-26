"""The form map: the shape of the whole piece, read before any phrase is choreographed.

  sections   boundaries from beat-synchronous chroma + timbre (agglomerative clustering)
  letters    repeated material gets the same letter (A, B, A', ...) by chroma/timbre similarity
  energy     mean loudness per section; the climax section is the loudest in the second half
  ceiling    the intensity each section is allowed (0..3): an arc that saves the top for the climax,
             with every repeat of a letter allowed one step more than the last ("escalation")
  repeat_of  index of the first section with the same letter, for callbacks
"""

from dataclasses import dataclass, field

import librosa
import numpy as np


@dataclass
class Section:
    t0: float
    t1: float
    letter: str
    energy: float
    ceiling: int = 3
    repeat_of: int = -1
    index: int = 0
    nth: int = 0          # 0 for the first appearance of its letter, 1 for the second...
    tempo: float = 0.0
    beats: np.ndarray = field(default_factory=lambda: np.zeros(0))


def analyze_form(y, sr, intensity, step, duration):
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop)
    _, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
    if len(beat_frames) < 8:
        beat_frames = np.arange(0, chroma.shape[1], 20)
    Cs = librosa.util.sync(chroma, beat_frames, aggregate=np.median)
    Ms = librosa.util.sync(mfcc, beat_frames, aggregate=np.mean)
    X = np.vstack([librosa.util.normalize(Cs, axis=0), 0.5 * librosa.util.normalize(Ms, axis=0)])
    k = int(np.clip(round(duration / 22.0), 3, 14))
    k = min(k, X.shape[1] - 1)
    bounds = librosa.segment.agglomerative(X, k)
    bt = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    bounds = sorted(set([0] + [int(b) for b in bounds]))
    spans = []
    for i, b in enumerate(bounds):
        e = bounds[i + 1] if i + 1 < len(bounds) else len(bt)
        t0 = float(bt[min(b, len(bt) - 1)]) if i else 0.0
        t1 = float(bt[min(e, len(bt) - 1)]) if e < len(bt) else duration
        if t1 - t0 >= 4.0 or not spans:
            spans.append([t0, t1, X[:, b:max(e, b + 1)].mean(axis=1)])
        else:
            spans[-1][1] = t1  # too short: absorb into the previous
    spans[-1][1] = duration

    # Letters: sections whose feature profile and length match get the same letter.
    letters, feats = [], []
    for t0, t1, f in spans:
        letter = None
        for L, (g, length) in enumerate(feats):
            cos = float(np.dot(f, g) / max(np.linalg.norm(f) * np.linalg.norm(g), 1e-9))
            if cos >= 0.93 and 0.6 <= (t1 - t0) / max(length, 1e-9) <= 1.6:
                letter = chr(65 + L)
                break
        if letter is None:
            feats.append((f, t1 - t0))
            letter = chr(65 + len(feats) - 1)
        letters.append(letter)

    sections = []
    for i, ((t0, t1, _), L) in enumerate(zip(spans, letters)):
        e = float(intensity[int(t0 / step): max(int(t0 / step) + 1, int(t1 / step))].mean())
        sections.append(Section(t0, t1, L, e, index=i))
    first = {}
    for s in sections:
        if s.letter in first:
            s.repeat_of = first[s.letter].index
            s.nth = sum(1 for q in sections[: s.index] if q.letter == s.letter)
        else:
            first[s.letter] = s

    # The arc: the climax is the loudest section in the second half (or the loudest overall).
    late = [s for s in sections if s.t0 >= 0.45 * duration] or sections
    climax = max(late, key=lambda s: s.energy)
    top = max(s.energy for s in sections)
    order = sorted(sections, key=lambda s: s.energy)
    n = len(order)
    for rank, s in enumerate(order):          # ceilings by rank: loudest third 3, middle 2, rest 1
        frac = (rank + 1) / n
        ceiling = 3 if frac > 2 / 3 else 2 if frac > 1 / 3 else 1
        rel = s.energy / max(top, 1e-9)
        if rel < 0.15:
            ceiling = 0
        elif rel < 0.3:
            ceiling = min(ceiling, 1)
        if s.index < climax.index:
            ceiling = min(ceiling, 2)          # nothing before the climax gets the top tier...
        if s.nth > 0:
            ceiling = min(3, ceiling + 1)      # ...except that every repeat escalates one step
        if s is climax or (s.index > climax.index and rel >= 0.7):
            ceiling = 3
        s.ceiling = ceiling
    # The opening stays modest unless it is genuinely the loudest thing in the piece.
    if sections[0] is not climax:
        sections[0].ceiling = min(sections[0].ceiling, 1 if sections[0].energy / top < 0.6 else 2)

    # Per-section tempo and beats, so beat-locked moves survive tempo changes.
    for s in sections:
        a, b = int(s.t0 * sr), int(s.t1 * sr)
        seg = y[a:b]
        if len(seg) > sr * 3:
            try:
                tempo, beats = librosa.beat.beat_track(y=seg, sr=sr, hop_length=hop)
                s.tempo = float(np.atleast_1d(tempo)[0])
                s.beats = librosa.frames_to_time(beats, sr=sr, hop_length=hop) + s.t0
            except Exception:
                pass
    return sections, climax.index


def section_at(sections, t):
    for s in sections:
        if s.t0 <= t < s.t1:
            return s
    return sections[-1]
