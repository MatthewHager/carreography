"""Shared fixtures. The choreography tests need the analysis environment (setup.sh): run the suite
with .venv312/bin/python -m pytest. Tests that need it are skipped elsewhere."""

import sys
import wave
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SR = 44100


def synth_song(path, seconds=24.0, bpm=120.0):
    """A made-up song the analysis can hear clearly: kick on the beat, hats off the beat, an
    arpeggio climbing and falling, chords underneath, quiet for the first bars and loud at the end."""
    t = np.arange(int(seconds * SR)) / SR
    y = np.zeros_like(t)
    beat = 60.0 / bpm
    rng = np.random.default_rng(7)
    for k in range(int(seconds / beat)):
        a = int(k * beat * SR)
        n = int(0.15 * SR)
        env = np.exp(-np.arange(n) / (0.03 * SR))
        y[a:a + n] += 0.8 * env * np.sin(2 * np.pi * 55 * np.arange(n) / SR)[: len(y[a:a + n])][: n]
        h = int((k + 0.5) * beat * SR)
        m = int(0.04 * SR)
        y[h:h + m] += 0.15 * rng.standard_normal(len(y[h:h + m])) * np.exp(-np.arange(len(y[h:h + m])) / (0.01 * SR))
    scale = [0, 3, 5, 7, 10, 12, 15, 17]
    for k in range(int(seconds / (beat / 2))):
        a = int(k * beat / 2 * SR)
        n = int(beat / 2 * 0.9 * SR)
        step = k % 16
        note = 57 + scale[step if step < 8 else 15 - step]
        f = 440 * 2 ** ((note - 69) / 12)
        tt = np.arange(n) / SR
        tone = np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt)
        y[a:a + n] += 0.25 * tone[: len(y[a:a + n])] * np.minimum(1, (n - np.arange(n)) / 400)[: len(y[a:a + n])]
    for bar in range(int(seconds / (4 * beat))):
        a = int(bar * 4 * beat * SR)
        n = int(4 * beat * SR)
        root = [45, 41, 43, 40][bar % 4]
        tt = np.arange(n) / SR
        pad = sum(np.sin(2 * np.pi * 440 * 2 ** ((root + iv - 69) / 12) * tt) for iv in (0, 7, 12, 16))
        y[a:a + n] += 0.05 * pad[: len(y[a:a + n])]
    y *= np.clip(0.3 + t / seconds, 0, 1)
    y = np.clip(y / np.abs(y).max() * 0.9, -1, 1)
    pcm = (np.repeat(y[:, None], 2, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


@pytest.fixture(scope="session")
def analysis(tmp_path_factory):
    """The analysis of the made-up song (a few seconds; needs the analysis environment)."""
    pytest.importorskip("librosa")
    pytest.importorskip("basic_pitch")
    from lightshow import channels as C
    from lightshow.audio import analyze
    wav = synth_song(tmp_path_factory.mktemp("song") / "synth.wav")
    return analyze(str(wav), C.STEP_MS)
