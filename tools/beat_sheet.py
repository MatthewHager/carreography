"""Tile frames grabbed exactly on beats and half a beat later, so the pulse can be judged by eye:
a show that thumps on the beat looks clearly brighter in the top row of each pair than below it.

    .venv312/bin/python tools/beat_sheet.py <frames_dir> <out.jpg> <t1> <t1+half> <t2> <t2+half> ...

(the frames are the viewer recorder's `shoot` output, in the same order as the times)
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main(frames_dir, out, times):
    fr = sorted(Path(frames_dir).glob("*.jpg"))
    W, H, cols = 480, 200, 5
    pairs = len(fr) // 2
    rows = (pairs + cols - 1) // cols
    s = Image.new("RGB", (W * cols, H * 2 * rows))
    d = ImageDraw.Draw(s)
    for k, f in enumerate(fr[: 2 * pairs]):
        im = Image.open(f).crop((180, 250, 1100, 633)).resize((W, H))
        beat, half = k // 2, k % 2
        x, y = (beat % cols) * W, ((beat // cols) * 2 + half) * H
        s.paste(im, (x, y))
        d.text((x + 6, y + 4), f"{float(times[k]):.2f}s " + ("ON THE BEAT" if half == 0 else "half a beat later"), fill=(255, 230, 0))
    s.save(out, quality=82)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
