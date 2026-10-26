"""Source separation with Demucs (htdemucs): drums / bass / other / vocals, cached beside the wav.

Used for band recordings so the keyboard follows the melody (vocals + other), the beat moves
follow the drums, and the pedal/bass layer follows the bass.
"""

import pathlib

import soundfile as sf

STEMS = ("drums", "bass", "other", "vocals")


def separate(wav_path: str) -> dict:
    wav = pathlib.Path(wav_path)
    out_dir = wav.parent / "stems"
    paths = {s: out_dir / f"{s}.wav" for s in STEMS}
    if all(p.exists() and p.stat().st_mtime >= wav.stat().st_mtime for p in paths.values()):
        return {s: str(p) for s, p in paths.items()}

    import fcntl

    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model

    # One separation at a time across parallel builds: they share the GPU and its memory.
    lock = open(pathlib.Path(__file__).resolve().parents[1] / "output" / ".demucs.lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    try:
        return _separate(wav, paths, out_dir, torch, apply_model, get_model)
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()


def _separate(wav, paths, out_dir, torch, apply_model, get_model):
    model = get_model("htdemucs")
    model.eval()
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    audio, sr = sf.read(str(wav), dtype="float32", always_2d=True)
    if sr != model.samplerate:
        import librosa
        audio = librosa.resample(audio.T, orig_sr=sr, target_sr=model.samplerate).T
        sr = model.samplerate
    x = torch.from_numpy(audio.T.copy())[None]          # (1, channels, samples)
    if x.shape[1] == 1:
        x = x.repeat(1, 2, 1)
    ref = x.mean(0)
    x = (x - ref.mean()) / (ref.std() + 1e-8)
    # shifts=0 and a fixed seed: Demucs' random time shifts made every separation (and so every
    # show built on it) a little different; a rebuild must reproduce the same show
    torch.manual_seed(0)
    with torch.no_grad():
        y = apply_model(model, x, device=device, shifts=0, split=True, overlap=0.25, progress=False)[0]
    y = y * (ref.std() + 1e-8) + ref.mean()
    out_dir.mkdir(exist_ok=True)
    for name, src in zip(model.sources, y):
        sf.write(str(paths[name]), src.cpu().numpy().T, sr, subtype="PCM_16")
    return {s: str(p) for s, p in paths.items()}
