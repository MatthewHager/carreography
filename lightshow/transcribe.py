"""Polyphonic note transcription (MIDI-like) with Spotify's basic-pitch, cached next to the audio."""

import pathlib

import numpy as np
import scipy.signal
import scipy.signal.windows

scipy.signal.gaussian = scipy.signal.windows.gaussian  # basic-pitch still uses the pre-SciPy-1.13 name


def transcribe(wav_path: str) -> np.ndarray:
    """Returns rows of (start_s, end_s, midi_pitch, amplitude 0..1), sorted by start."""
    wav = pathlib.Path(wav_path)
    cache = wav.with_suffix(".notes.npy")
    if cache.exists() and cache.stat().st_mtime >= wav.stat().st_mtime:
        return np.load(cache)

    from basic_pitch import ICASSP_2022_MODEL_PATH
    from basic_pitch.inference import predict

    onnx = pathlib.Path(ICASSP_2022_MODEL_PATH).parent / "nmp.onnx"
    _, _, events = predict(str(wav), onnx, onset_threshold=0.5, frame_threshold=0.3,
                           minimum_note_length=58, minimum_frequency=40, maximum_frequency=4200,
                           melodia_trick=True)
    notes = np.array(sorted((e[0], e[1], e[2], e[3]) for e in events), dtype=float)
    if notes.size == 0:
        notes = np.zeros((0, 4))
    np.save(cache, notes)
    return notes
