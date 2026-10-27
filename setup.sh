#!/bin/sh
# One-time setup for rebuilding the shows (not needed just to watch them or put them on USB drives -
# see README). Needs uv and ffmpeg; on a Mac: brew install uv ffmpeg
set -e
cd "$(dirname "$0")"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Install it with: $2"; exit 1; }
}
need uv "brew install uv"
need ffmpeg "brew install ffmpeg"
need git "xcode-select --install"

echo "== analysis environment (.venv312)"
uv venv --allow-existing --python 3.12 .venv312
uv pip install --python .venv312/bin/python -r requirements.txt

echo "== neural beat tracker environment (.venv_beats)"
uv venv --allow-existing --python 3.12 .venv_beats
uv pip install --python .venv_beats/bin/python -r requirements-beats.txt

echo "== Tesla's light-show repo (its validator, and the 3D viewer's car models)"
python3 -m lightshow.tesla_files

echo
echo "Setup done. Build everything with:   python3 build.py"
echo "(The first build downloads the stem-separation, lyrics and beat models - a few hundred MB.)"
