"""Turn frames recorded from the 3D viewer into a preview video with the song's audio, and review it:

  1. mux    frames + the show's WAV -> output/<show>/<show>_preview.mp4
  2. sync   per-car brightness measured from the video itself; its rises are cross-correlated with
            the audio's onset strength to find the lag at which light and sound line up best
            (should be 0 +/- one frame)
  3. mood   how bright and how busy each car is through the song, next to the audio level
  4. sheets contact sheets of chosen moments, saved to checks/

    .venv312/bin/python tools/video_review.py <show> <frames_dir> <fps> [t0-t1 ...]
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_levels(frames):
    """Mean brightness of the three car regions (crowd-left, centre, crowd-right) per frame."""
    out = []
    for f in frames:
        im = np.asarray(Image.open(f).convert("L").resize((320, 180)), dtype=np.float32) / 255
        band = im[60:140]                                   # the cars sit in the middle band
        out.append([band[:, 30:120].mean(), band[:, 120:200].mean(), band[:, 200:290].mean()])
    return np.array(out)


def main(show, frames_dir, fps, windows):
    fps = float(fps)
    frames = sorted(Path(frames_dir).glob("*.jpg"))
    out = ROOT / "output" / show
    wav = out / f"{show}.wav"
    mp4 = out / f"{show}_preview.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(Path(frames_dir) / "%05d.jpg"),
                    "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(mp4)], check=True)
    print(f"video: {mp4.relative_to(ROOT)} ({mp4.stat().st_size / 1e6:.0f} MB, {len(frames)} frames at {fps:g} fps)")

    import librosa
    y, sr = librosa.load(str(wav), sr=22050, mono=True)
    hop = int(round(sr / fps))
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    lv = load_levels(frames)
    n = min(len(lv), len(onset))
    lv, onset, rms = lv[:n], onset[:n], rms[:n]
    rise = np.clip(np.diff(lv, axis=0, prepend=lv[:1]), 0, None).sum(1)       # light switching on
    a = (onset - onset.mean()) / (onset.std() + 1e-9)
    b = (rise - rise.mean()) / (rise.std() + 1e-9)
    lags = range(-6, 7)
    cc = [float(np.mean(a[max(0, -k):n - max(0, k)] * b[max(0, k):n - max(0, -k)])) for k in lags]
    best = list(lags)[int(np.argmax(cc))]
    print(f"sync: light rises line up best with the audio's attacks at a lag of {best * 1000 / fps:+.0f} ms "
          f"(one frame = {1000 / fps:.0f} ms); correlation {max(cc):.2f} vs {np.mean(cc):.2f} on average across lags")

    win = int(8 * fps)
    print("mood, 8 s windows: audio level, mean brightness and light changes per second for left | centre | right")
    db = 20 * np.log10(rms + 1e-6)
    for s in range(0, n - win, win):
        e = slice(s, s + win)
        busy = (np.abs(np.diff(lv[e], axis=0)) > 0.02).sum(0) / 8
        bright = lv[e].mean(0)
        print(f"  {s / fps:5.0f}s  {db[e].mean():6.1f} dB   bright {bright[0]:.2f} {bright[1]:.2f} {bright[2]:.2f}   "
              f"changes/s {busy[0]:4.1f} {busy[1]:4.1f} {busy[2]:4.1f}")

    for w in windows:
        t0, t1 = (float(x) for x in w.split("-"))
        idx = np.linspace(int(t0 * fps), min(int(t1 * fps), len(frames) - 1), 18).astype(int)
        tiles = [Image.open(frames[i]).resize((427, 240)) for i in idx]
        sheet = Image.new("RGB", (427 * 6, 240 * 3))
        for k, im in enumerate(tiles):
            sheet.paste(im, ((k % 6) * 427, (k // 6) * 240))
        from PIL import ImageDraw
        d = ImageDraw.Draw(sheet)
        for k, i in enumerate(idx):
            d.text(((k % 6) * 427 + 6, (k // 6) * 240 + 4), f"{i / fps:.1f}s", fill=(255, 230, 0))
        dest = ROOT / "checks" / f"video_{show}_{int(t0)}_{int(t1)}.jpg"
        dest.parent.mkdir(exist_ok=True)
        sheet.save(dest, quality=80)
        print(f"sheet: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
