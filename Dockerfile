# The web app (webapp/) in a container:   docker build -t lightshow . && docker run -p 8000:8000 lightshow
# Untested: this was written on a machine without Docker. See webapp/README.md.
FROM python:3.12-slim

# ffmpeg: audio; espeak-ng: the diagnostic show's voice; git: fetches Tesla's light-show repo
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg espeak-ng git \
    && rm -rf /var/lib/apt/lists/*

# Two environments, as setup.sh makes: the beat tracker's torch/torchaudio clash with Demucs.
# The CPU builds of torch are used (no GPU in the container, and they are far smaller).
WORKDIR /app
COPY requirements.txt requirements-web.txt requirements-beats.txt ./
RUN python -m venv /opt/analysis \
    && /opt/analysis/bin/pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        -r requirements.txt -r requirements-web.txt
RUN python -m venv /opt/beats \
    && /opt/beats/bin/pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        -r requirements-beats.txt

COPY . .
# Tesla's light-show repo (vendor/light-show) and the 3D viewer's car models, which the repo doesn't carry
RUN python3 -m lightshow.tesla_files   # Tesla's light-show repo: its validator

RUN useradd --create-home app && mkdir -p /data/jobs && chown -R app /app /data
USER app

ENV LIGHTSHOW_PYTHON=/opt/analysis/bin/python \
    LIGHTSHOW_BEATS_PYTHON=/opt/beats/bin/python \
    LIGHTSHOW_JOBS_DIR=/data/jobs \
    HOST=0.0.0.0 \
    PORT=8000
# The first build downloads the stem-separation, lyrics and beat models (a few hundred MB) into
# /home/app/.cache; mount a volume there to keep them between runs.
VOLUME ["/data", "/home/app/.cache"]
EXPOSE 8000
CMD ["/opt/analysis/bin/python", "-m", "webapp"]
