"""Music analysis on the show's frame grid.

Produces the musical events the choreography reacts to:
  notes     melodic onsets with strength and a pitch position (0 = low/left .. 1 = high/right)
  bass      low-frequency hits (kick, timpani, low brass, organ pedal)
  highs     bright transients (cymbals, xylophone, string attacks)
  hits      the strongest accents in the whole piece
  beats / downbeats, tempo-following
  sustain   per frame: a held note or chord with no new attacks
  intensity per frame 0..1: loudness weighted so the show builds across the piece
  build     per frame: inside a crescendo (energy rising steadily), with its 0..1 progress
"""

from dataclasses import dataclass

import librosa
import numpy as np

from .form import analyze_form
from .texture import Events, group_events, label_phrases, pitch_scale
from .transcribe import transcribe

HOP = 512
SR = 22050


@dataclass
class Analysis:
    duration: float
    n_frames: int
    step: float
    tempo: float
    beats: np.ndarray
    downbeats: np.ndarray
    notes: np.ndarray       # rows: time, strength 0..1, position 0..1
    bass: np.ndarray        # rows: time, strength
    highs: np.ndarray       # rows: time, strength
    hits: np.ndarray        # times
    sustain: np.ndarray     # per show frame, bool
    intensity: np.ndarray   # per show frame 0..1
    build: np.ndarray       # per show frame 0..1 progress through a crescendo, 0 outside one
    tier: np.ndarray        # per show frame 0..3
    loud_fast: np.ndarray = None  # per show frame 0..1, loudness smoothed over 0.1 s (for meters)
    events: Events = None   # transcribed note events (see texture.py)
    pitch_lo: float = 48.0  # melodic range mapped onto the stage
    pitch_hi: float = 84.0
    beat_score: float = 0.0 # how strongly the music sits on its beat grid (>2.3: use beat effects)
    sections: list = None   # form map (see form.py)
    climax: int = 0         # index of the climax section
    phrases: list = None
    cue_peaks: list = None  # (time, build_len) crescendo peaks forced by the cue sheet
    pulse_env: np.ndarray = None   # onset strength the beats were tracked on (drums when separated)
    pulse_hop: float = HOP / SR     # seconds per pulse_env frame


def _neural_beats(wav_path, min_steady=0.9):
    """Beats and downbeats from the neural tracker (tools/track_beats.py, run by build.py into
    <wav>.beats.json), but only when its grid is steady - at least `min_steady` of the beat gaps
    within 10 % of the median gap - which is where it is reliable (songs with a drum kit). A share
    rather than a standard deviation, so one long gap (a break, the fade-out) doesn't disqualify a
    steady song. Otherwise None."""
    import json
    import pathlib
    path = pathlib.Path(wav_path).with_suffix(".beats.json")
    if not path.exists():
        return None
    d = json.loads(path.read_text())
    b, db = np.asarray(d["beats"], float), np.asarray(d["downbeats"], float)
    if len(b) < 16:
        return None
    g = np.diff(b)
    if np.mean(np.abs(g / np.median(g) - 1) < 0.1) < min_steady:
        return None
    return b, db


def _to_grid(values, times, grid):
    return np.interp(grid, times, values)


def _band_onsets(mel_db, band, sr, delta, wait, lag=2):
    """Onset times/strengths from the spectral flux of a mel-band slice."""
    env = librosa.onset.onset_strength(S=mel_db[band], sr=sr, hop_length=HOP, lag=lag, aggregate=np.mean)
    frames = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=HOP,
                                        delta=delta, wait=wait, backtrack=False)
    if len(frames) == 0:
        return np.zeros((0, 2)), env
    s = env[frames]
    lo, hi = np.quantile(env[env > 0], 0.5), np.quantile(s, 0.97)
    strength = np.clip((s - lo) / max(hi - lo, 1e-9), 0, 1)
    return np.column_stack([librosa.frames_to_time(frames, sr=sr, hop_length=HOP), strength]), env


def _stabilize(level, min_len):
    out = level.copy()
    i = 0
    while i < len(out):
        j = i
        while j < len(out) and out[j] == out[i]:
            j += 1
        if j - i < min_len and i > 0:
            out[i:j] = out[i - 1]
        i = j
    return out


def analyze(wav_path: str, step_ms: int, max_tier: int = 3, stems: dict = None) -> Analysis:
    """`stems`: optional {drums, bass, other, vocals} wav paths from stems.separate(); with them the
    melody is transcribed from vocals + other, the bass line from the bass stem, and beats, kicks
    and hats come from the drums."""
    y, sr = librosa.load(wav_path, sr=SR, mono=True)
    y_drums = y_melody = y_bass = None
    if stems:
        y_drums, _ = librosa.load(stems["drums"], sr=SR, mono=True)
        y_voc, _ = librosa.load(stems["vocals"], sr=SR, mono=True)
        y_oth, _ = librosa.load(stems["other"], sr=SR, mono=True)
        y_bass, _ = librosa.load(stems["bass"], sr=SR, mono=True)
        n = min(len(y_voc), len(y_oth))
        y_melody = y_voc[:n] + y_oth[:n]
    duration = len(y) / sr
    step = step_ms / 1000.0
    n_frames = int(np.ceil(duration / step))
    grid = np.arange(n_frames) * step

    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=HOP, n_mels=96, fmax=8000)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_f = librosa.mel_frequencies(n_mels=96, fmax=8000)
    frame_t = librosa.frames_to_time(np.arange(mel.shape[1]), sr=sr, hop_length=HOP)

    # --- Beats, tempo-following (from the drums when we have them) ---
    if y_drums is not None and np.abs(y_drums).mean() > 1e-4:
        mel_d = librosa.feature.melspectrogram(y=y_drums, sr=sr, n_fft=2048, hop_length=HOP, n_mels=96, fmax=8000)
        full_env = librosa.onset.onset_strength(S=librosa.power_to_db(mel_d, ref=np.max), sr=sr, hop_length=HOP)
        mel_db_perc = librosa.power_to_db(mel_d, ref=np.max)
    else:
        full_env = librosa.onset.onset_strength(S=mel_db, sr=sr, hop_length=HOP)
        mel_db_perc = mel_db
    local_bpm = librosa.feature.tempo(onset_envelope=full_env, sr=sr, hop_length=HOP, aggregate=None)
    _, beat_frames = librosa.beat.beat_track(onset_envelope=full_env, sr=sr, hop_length=HOP, bpm=local_bpm)
    tempo = float(np.median(local_bpm))
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)
    if len(beat_frames) >= 8:
        strength = full_env[np.minimum(beat_frames, len(full_env) - 1)]
        phase = int(np.argmax([strength[p::4].sum() for p in range(4)]))
        downbeats = beats[phase::4]
    else:
        downbeats = beats[::4]

    # --- Per-band onsets ---
    bass_band = mel_f < 180
    mid_band = (mel_f >= 180) & (mel_f < 2000)
    high_band = mel_f >= 2000
    bass, _ = _band_onsets(mel_db_perc, bass_band, sr, delta=0.12, wait=4)
    notes, mid_env = _band_onsets(mel_db, mid_band, sr, delta=0.06, wait=2)
    highs, _ = _band_onsets(mel_db_perc, high_band, sr, delta=0.10, wait=2)

    # Pitch position of each note: spectral centroid right after the attack, song-normalised.
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=HOP)[0]
    log_c = np.log2(np.maximum(centroid, 50))
    if len(notes):
        idx = np.minimum((notes[:, 0] * sr / HOP).astype(int) + 1, len(log_c) - 1)
        c = np.array([log_c[i:i + 3].mean() for i in idx])
        lo, hi = np.quantile(c, 0.1), np.quantile(c, 0.9)
        pos = np.clip((c - lo) / max(hi - lo, 1e-9), 0, 1)
        notes = np.column_stack([notes, pos])
    else:
        notes = np.zeros((0, 3))

    # --- Global accents: strongest onsets anywhere, >= 0.5 s apart ---
    frames = librosa.onset.onset_detect(onset_envelope=full_env, sr=sr, hop_length=HOP)
    hits = np.zeros(0)
    if len(frames):
        s = full_env[frames]
        strong = frames[s >= np.quantile(s, 0.93)]
        out, last = [], -1.0
        for t in librosa.frames_to_time(strong, sr=sr, hop_length=HOP):
            if t - last >= 0.5:
                out.append(t)
                last = t
        hits = np.array(out)

    # --- Loudness and intensity ---
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    loud = _to_grid(rms, frame_t, grid)
    smooth = lambda x, secs: np.convolve(x, np.ones(max(1, int(secs / step))) / max(1, int(secs / step)), mode="same")
    fast = smooth(loud, 0.1)
    loud_fast = np.clip((fast - np.quantile(fast, 0.05)) / max(np.quantile(fast, 0.99) - np.quantile(fast, 0.05), 1e-9), 0, 1)
    energy = smooth(loud, 1.5)
    lo, hi = np.quantile(energy, 0.05), np.quantile(energy, 0.985)
    db = 20 * np.log10(np.maximum(energy, 1e-6))
    dyn_range = float(np.percentile(db, 95) - np.percentile(db, 10))   # ~25-35 dB classical, 8-13 dB pop
    energy = np.clip((energy - lo) / max(hi - lo, 1e-9), 0, 1)
    # Later sections count for more, so the show keeps building across the piece.
    position = grid / max(duration, 1e-9)
    intensity = np.clip(energy * (0.75 + 0.35 * position), 0, 1)

    # Tiers are quantiles of intensity, so every piece gets calm, lively and all-out stretches; a
    # compressed, uniformly loud recording (small dynamic range) spends most of its time up top.
    compression = float(np.clip((16 - dyn_range) / 10, 0, 1))
    wide, flat = np.array([0.30, 0.55, 0.80]), np.array([0.10, 0.30, 0.60])
    cuts = np.quantile(intensity, wide + (flat - wide) * compression)
    tier = np.digitize(intensity, cuts)
    tier = np.minimum(_stabilize(tier, int(3.0 / step)), max_tier)

    # --- Sustain: loud enough, but no new attacks in the last 0.6 s ---
    flux = _to_grid(mid_env / max(mid_env.max(), 1e-9), frame_t, grid)
    recent_attack = np.array([flux[max(0, i - int(0.6 / step)):i + 1].max() for i in range(n_frames)])
    sustain = (energy > 0.15) & (recent_attack < 0.25)
    sustain = _stabilize(sustain.astype(int), int(0.4 / step)).astype(bool)

    # --- Builds: energy rising for 4 s or more ---
    slow = smooth(loud, 3.0)
    slope = np.gradient(slow) / max(slow.max(), 1e-9) / step  # fraction of max per second
    rising = slope > 0.04
    rising = _stabilize(rising.astype(int), int(1.0 / step)).astype(bool)
    build = np.zeros(n_frames)
    i = 0
    while i < n_frames:
        if rising[i]:
            j = i
            while j < n_frames and rising[j]:
                j += 1
            if (j - i) * step >= 4.0:
                build[i:j] = np.linspace(0, 1, j - i)
            i = j
        else:
            i += 1

    beat_score = float(full_env[np.minimum(beat_frames, len(full_env) - 1)].mean() / max(full_env.mean(), 1e-9))

    # --- Form map: sections, repeats, arc ceilings, per-section tempo ---
    sections, climax = analyze_form(y, sr, intensity, step, duration)
    for sec in sections:               # a calm-only show (e.g. Ave Maria) caps the arc too
        sec.ceiling = min(sec.ceiling, max_tier)
    sec_beats = []
    for sec in sections:
        if sec.tempo > 0 and len(sec.beats) >= 4:
            # fold half/double-time readings back toward the piece's tempo
            if sec.tempo > tempo * 1.6:
                # keep whichever half of the beats lands on the stronger hits - taking every other
                # beat from the first can lock the whole section onto the off-beats
                fb = np.minimum((sec.beats * sr / HOP).astype(int), len(full_env) - 1)
                odd = full_env[fb[1::2]].mean() > full_env[fb[0::2]].mean() if len(fb) >= 4 else False
                sec.beats, sec.tempo = sec.beats[1::2] if odd else sec.beats[::2], sec.tempo / 2
            elif sec.tempo < tempo / 1.6:
                mids = (sec.beats[:-1] + sec.beats[1:]) / 2
                sec.beats, sec.tempo = np.sort(np.concatenate([sec.beats, mids])), sec.tempo * 2
            sec_beats.append(sec.beats[(sec.beats >= sec.t0) & (sec.beats < sec.t1)])
    neural = _neural_beats(wav_path)
    if neural is not None:
        # a steady grid from the neural tracker (band songs): it reads swing, shuffles and fills
        # far better than onset autocorrelation, so it replaces the per-section tracking below
        beats, downbeats = neural
        tempo = 60.0 / float(np.median(np.diff(beats)))
        sec_beats = []
    if sec_beats and sum(len(b) for b in sec_beats) >= 0.7 * len(beats):
        beats = np.concatenate(sec_beats)
        # downbeats phased section by section (a section can start on any beat of the bar)
        downs = []
        for sb in sec_beats:
            if len(sb) >= 8:
                bf = np.minimum((sb * sr / HOP).astype(int), len(full_env) - 1)
                phase = int(np.argmax([full_env[bf[p::4]].sum() for p in range(4)]))
                downs.append(sb[phase::4])
            elif len(sb):
                downs.append(sb[::4])
        if downs:
            downbeats = np.concatenate(downs)

    if stems:
        import soundfile as sf
        import pathlib
        mel_path = pathlib.Path(stems["other"]).with_name("melody.wav")
        if not mel_path.exists():
            sf.write(str(mel_path), y_melody, SR, subtype="PCM_16")
        raw = transcribe(str(mel_path))
        bass_notes = transcribe(stems["bass"])
        if len(bass_notes):
            bass_notes = bass_notes[bass_notes[:, 2] <= 52]
            raw = np.array(sorted(np.vstack([raw, bass_notes]).tolist()))
        events = group_events(raw)
    else:
        events = group_events(transcribe(wav_path))
    events = label_phrases(events, lambda t: int(tier[min(int(t / step), n_frames - 1)]))
    lo, hi = pitch_scale(events)

    return Analysis(duration, n_frames, step, tempo, beats, downbeats, notes, bass, highs, hits,
                    sustain, intensity, build, tier, loud_fast, events, lo, hi, beat_score, sections, climax,
                    pulse_env=full_env)
