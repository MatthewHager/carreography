# Sources

## Recordings

The twelve recordings the example shows in `output/` (the Halloween 2026 set in `setlist.json`) were
built from. They are not in the repository - several are commercial recordings - so to rebuild those
shows, get the same recordings and put them in `songs/` under these names.

| # | Piece | Recording | File | Source |
|---|---|---|---|---|

## Code and assets

- **3D viewer** (`preview3d/`): adapted from [Tesla Lightshow Studio](https://github.com/nathanjgrace/tesla-lightshow-studio)
  by Nathan Grace, AGPL-3.0-only (see `preview3d/LICENSE`). The car models it draws are Tesla's own,
  from the Tesla app (below).
- **Tesla's app models** (optional, for the 3D viewer): extracted from your own copy of the Tesla
  Android app with [tesla-model-extractor](https://github.com/koenhendriks/tesla-model-extractor)
  (MIT) by `lightshow/tesla_app_models.py`; Tesla's, not redistributed here.
- **Validator**: Tesla's `validator.py`, fetched into `vendor/light-show/` by `setup.sh`.
- **Beat tracking**: [Beat This!](https://github.com/CPJKU/beat_this) (Foscarin, Schlüter & Widmer, 2024).
- **Note transcription**: [basic-pitch](https://github.com/spotify/basic-pitch) (Spotify).
- **Stem separation**: [Demucs](https://github.com/facebookresearch/demucs) (htdemucs).
- **Lyric timing**: [faster-whisper](https://github.com/SYSTRAN/faster-whisper).
- **Diagnostic voice**: macOS `say`, or [espeak-ng](https://github.com/espeak-ng/espeak-ng).
- **Web app**: [FastAPI](https://fastapi.tiangolo.com/) and uvicorn.

## Study material (not in the repo)

The move vocabulary and timing rules were drawn from other people's shows, kept locally in `vendor/`
for study only (none declare a licence; don't redistribute):

- Tesla's multi-car examples in the [light-show repo](https://github.com/teslamotors/light-show)
  (`examples/`: "The Arrival" 5-car, "Cyber Symphony" 4-car).
- Community shows from [TeslaLightShare](https://teslalightshare.io) (show ids: 1081, 108, 1224, 1225, 1366, 1398, 1488, 1543, 1560, 1566, 1567, 159, 165, 186, 304, 305, 316, 325, 360, 504, 517, 636, 703, 776, 88, 956, 958)
  and GitHub (c0lt/also-sprach-zarathustra, codykingllamas/halloween-kills, codykingllamas/haunted-mansion-stretch-room, codykingllamas/sugar-plum-fairy, quaternionmedia/toccata-fugue-xlights, rutgersmike/tom-devil).
- Visualizers and editors looked at while building the preview:
  - https://github.com/GigaJunky/TeslaLightShowPlayer.git
  - https://github.com/HLVM04/Tesla-Beat-Mapper.git
  - https://github.com/Martelinok/TeslaShowSimulator.git
  - https://github.com/ak463010/fseq-visualizer.git
  - https://github.com/guillaumebdx/tesla-lightshow-mobile.git
  - https://github.com/jreznik/tesla-lightshow-visualizer.git
  - https://github.com/nathanjgrace/tesla-lightshow-studio.git
  - https://github.com/recallfx/tesla-light-show-editor.git
  - https://github.com/tbatch-ohanafy/tesla-lightshow-creator.git
  - https://github.com/wmorrill3/lightcue.git
