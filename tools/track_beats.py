"""Beat and downbeat tracking with Beat This! (CPJKU; Foscarin, Schlueter & Widmer 2024), a neural
tracker that handles swing, shuffles, triplet feels and 3/4 far better than onset-autocorrelation
trackers. Runs in its own environment (.venv_beats) so its torchaudio can't disturb Demucs.

    .venv_beats/bin/python tools/track_beats.py <audio.wav> <out.json>

Writes {"beats": [...], "downbeats": [...]} in seconds.
"""

import json
import sys

from beat_this.inference import File2Beats


def main(wav, out):
    track = File2Beats(checkpoint_path="final0", device="cpu", dbn=False)
    beats, downbeats = track(wav)
    with open(out, "w") as f:
        json.dump({"beats": [float(x) for x in beats], "downbeats": [float(x) for x in downbeats]}, f)
    print(f"{len(beats)} beats, {len(downbeats)} downbeats")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
