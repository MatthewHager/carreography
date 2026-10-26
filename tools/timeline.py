"""Render a strip of a show: the transcribed notes (piano roll) above each car's light activity,
so sync between music and lights can be checked by eye.

  .venv312/bin/python tools/timeline.py <show_name> <start_s> <end_s> [out.png]
"""

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightshow import channels as C                     # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402
from lightshow.texture import group_events              # noqa: E402
from lightshow.transcribe import transcribe             # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

ROWS = [  # (label, channels, colour)  rows drawn per car, top to bottom
    ("heads L", [C.L_OUTER_MAIN, C.L_INNER_MAIN], "#f4f7ff"),
    ("heads R", [C.R_OUTER_MAIN, C.R_INNER_MAIN], "#f4f7ff"),
    ("accent L", [C.L_SIGNATURE, C.L_CH4, C.L_CH5, C.L_CH6, C.L_SIDE_MARKER], "#9ad0ff"),
    ("accent R", [C.R_SIGNATURE, C.R_CH4, C.R_CH5, C.R_CH6, C.R_SIDE_MARKER], "#9ad0ff"),
    ("turn/mark", [C.L_FRONT_TURN, C.R_FRONT_TURN, C.L_AUX_PARK, C.R_AUX_PARK], "#ffb347"),
    ("rear", [C.BRAKE, C.L_TAIL, C.R_TAIL], "#ff4d4d"),
]


def main(name, t0, t1, out=None):
    wav = ROOT / "output" / name / f"{name}.wav"
    ev = group_events(transcribe(str(wav)))
    cars = sorted((ROOT / "output" / name).glob("Car*/LightShow/*.fseq"))
    shows = [(p.parts[-3], *read_fseq(p)) for p in cars]
    step = shows[0][2] / 1000
    f0, f1 = int(t0 / step), int(t1 / step)
    tt = np.arange(f0, f1) * step

    fig, axes = plt.subplots(1 + len(shows), 1, figsize=(18, 3 + 2.2 * len(shows)), sharex=True,
                             gridspec_kw={"height_ratios": [3] + [2] * len(shows)}, facecolor="#101014")
    ax = axes[0]
    ax.set_facecolor("#101014")
    m = (ev.t >= t0) & (ev.t <= t1)
    colours = np.array(["#9ad0ff", "#ffd27f", "#ff8c42", "#ff3b3b"])
    ax.scatter(ev.t[m], ev.top[m], s=14 + 30 * ev.amp[m], c=colours[ev.kind[m]], marker="s", lw=0)
    for i in np.flatnonzero(m):
        ax.plot([ev.t[i], ev.t[i] + ev.dur[i]], [ev.top[i], ev.top[i]], color=colours[ev.kind[i]], lw=1, alpha=0.6)
        if ev.n[i] > 1:
            ax.plot([ev.t[i], ev.t[i]], [ev.low[i], ev.high[i]], color=colours[ev.kind[i]], lw=1, alpha=0.5)
        if ev.arrival[i]:
            ax.axvline(ev.t[i], color="#ff3b3b", lw=0.8, alpha=0.6)
    ax.set_ylabel("midi pitch", color="#ccc")
    ax.set_title(f"{name}  {t0:.1f}-{t1:.1f}s   blue=note  yellow=dyad  orange=chord  red=big chord / arrival",
                 color="#ddd", fontsize=11)
    ax.tick_params(colors="#aaa")

    for ax, (car, frames, _) in zip(axes[1:], shows):
        ax.set_facecolor("#101014")
        seg = frames[f0:f1]
        y = 0
        labels = []
        if "Cybertruck" in car:
            bar = seg[:, list(C.FRONT_BAR)].T / 255.0
            ax.imshow(bar, aspect="auto", extent=[t0, t1, 0, 2.0], cmap="gray", vmin=0, vmax=1, origin="lower")
            labels.append((1.0, "front bar"))
            y = 2.2
        for label, chs, col in ROWS:
            lit = (seg[:, chs] >= 128).any(1)
            ramp = ((seg[:, chs] > 0) & (seg[:, chs] < 128)).any(1)
            ax.fill_between(tt, y, y + 0.9, where=lit, color=col, step="post", lw=0)
            ax.fill_between(tt, y, y + 0.9, where=ramp & ~lit, color=col, alpha=0.35, step="post", lw=0)
            labels.append((y + 0.45, label))
            y += 1
        ax.set_yticks([p for p, _ in labels])
        ax.set_yticklabels([l for _, l in labels], color="#ccc", fontsize=8)
        ax.set_ylim(0, y)
        ax.set_ylabel(car.split("_")[1] + " " + car.split("_")[2], color="#ddd")
        ax.tick_params(colors="#aaa")
        for e in ev.t[m]:
            ax.axvline(e, color="#ffffff", lw=0.3, alpha=0.15)
    axes[-1].set_xlabel("seconds", color="#ccc")
    plt.tight_layout()
    out = out or ROOT / "checks" / f"timeline_{name}_{int(t0)}_{int(t1)}.png"
    Path(out).parent.mkdir(exist_ok=True)
    plt.savefig(out, dpi=80)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), *(sys.argv[4:5]))
