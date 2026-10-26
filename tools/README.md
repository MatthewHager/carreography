# Tools

Checking and reviewing shows. Run them from the project root with the analysis environment, e.g.
`.venv312/bin/python tools/setlist_review.py`. Most read files a full build leaves in `output/<show>/`
(`analysis.pkl`, `beats.npy`), so build a song before checking it.

## Is it ready for the cars?

| tool | what it does |
|---|---|
| `setlist_review.py [show ...]` | One line per show: moods, move variety, timing, pacing, motor commands against Tesla's limits, and Tesla's validator. Run this before copying to USB. |
| `feel_all.py [show ...]` | How strongly the lights pulse on the beat, per song, flagging sections where the beat map looks off or the lights miss beats they should hit. |
| `closure_audit.py <.fseq ...>` | Every motor command checked against Tesla's rules: per-show limits, Dance only once open, ~30 s dance budget, the charge port's 2-minute auto-close, reversals before a move can finish. `--summary` for one line per file. |
| `motor_activity.py [show ...]` | Per show: share of the song with a motor moving, the longest still stretch, and seconds moving / commands used for the lids, windows, mirrors and charge port. |
| `motor_log.py <show> [liftgate\|windows\|mirrors\|port]` | Every closure command in time order across the three cars. |

## Looking closer

| tool | what it does |
|---|---|
| `feel.py <show> [t0 t1]` | Section-by-section beat measurements; with a time window, a strip image (drums vs each car's brightness) in `checks/`. |
| `timeline.py <show> <t0> <t1>` | Piano roll of the transcribed notes above each car's lamps, for checking sync by eye. |
| `quantize_check.py <show>` | Per phrase: share of light hits on the beat grid and on played notes. |
| `move_lab.py <show> [move ...]` | Plays each move alone on a song's analysis and measures how it sits on the beat - for testing a new move. |
| `orientation_test.py` | A 12 s calibration show (lights march crowd-left to right); open the viewer with `?labels=1`. |

## Preview videos

The 3D viewer can record itself frame by frame (frame-accurate however slow the machine):

1. `python3 tools/frame_sink.py checks/frames` (receives the frames on port 8767)
2. open the viewer at `http://localhost:8765/preview3d/dist/index.html?show=<show>` and in the browser
   console run `await __viewer.recorder.setup(); __viewer.recorder.record('<show>', 24)`
3. `.venv312/bin/python tools/video_review.py <show> checks/frames/<show> 24` - writes
   `output/<show>/<show>_preview.mp4` with the audio, measures light-vs-music sync from the video and
   makes contact sheets.

`pick_moments.py` + the recorder's `shoot(dir, times)` + `beat_sheet.py` give frames on the beat and
half a beat later, to judge the pulse by eye.

## Used by the build

`track_beats.py` - the neural beat tracker; `build.py` runs it in `.venv_beats` for each song.
