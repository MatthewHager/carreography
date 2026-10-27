"""Feel a show the way the audience will: what the cars look like from the front, against the beat.

  perceived brightness  every front lamp weighted by how big and bright it reads from the crowd
                        (headlights 1.0 each, fogs 0.5, signature/DRL 0.4, turns 0.3, markers 0.1, a front
                        light bar 2.0 when fully lit), with Tesla's ramp codes simulated frame by frame
  visual flux           how much light switches ON from one frame to the next - the "hits" the eye
                        catches
  pulse metrics         against the beat map the show was built with:
     audio pulse   how much stronger the music's onsets (drums stem when there is one) are on the
                   beats than between them - how obvious the beat is to the ear
     on-beat       how much stronger the visual flux is on the beats (+/-40 ms) than on average
     lock          phase-locking of the visual flux to the beat (0 = random, 1 = every hit on the beat)
     coverage      share of beats with a clearly visible hit (a headlight pair's worth of light
                   switching on within 50 ms)
     downbeat      flux on downbeats relative to the other beats (accented bars read > 1)

    .venv312/bin/python tools/feel.py <show>                 section-by-section table
    .venv312/bin/python tools/feel.py <show> <t0> <t1>       also a strip: checks/feel_<show>_<t0>_<t1>.png
"""

import pickle
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build import show_cars                             # noqa: E402
from lightshow import channels as C                     # noqa: E402
from lightshow.fseq import read_fseq                    # noqa: E402
from lightshow.lamps import lamp_level                  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
STEP = 0.02
LAMPS = {C.L_OUTER_MAIN: 1.0, C.R_OUTER_MAIN: 1.0, C.L_INNER_MAIN: 1.0, C.R_INNER_MAIN: 1.0,
         C.L_SIGNATURE: 0.4, C.R_SIGNATURE: 0.4, C.L_CH4: 0.4, C.R_CH4: 0.4,
         C.L_FRONT_TURN: 0.3, C.R_FRONT_TURN: 0.3, C.L_FRONT_FOG: 0.5, C.R_FRONT_FOG: 0.5,
         C.L_SIDE_MARKER: 0.1, C.R_SIDE_MARKER: 0.1}
HIT = 1.5          # light switching on within 50 ms that counts as a visible hit (a headlight pair is 2.0)


# The 2025+ Model Y's front, from on-car tests (lightshow/lamps.py): headlights, lower lamps, the
# bar's outer ends (channel 4) and centre (channel 6), amber turns, fender repeaters.
JUNIPER = {C.L_OUTER_MAIN: 1.0, C.R_OUTER_MAIN: 1.0, C.L_INNER_MAIN: 1.0, C.R_INNER_MAIN: 1.0,
           C.L_CH4: 0.5, C.R_CH4: 0.5, C.L_FRONT_TURN: 0.3, C.R_FRONT_TURN: 0.3,
           C.L_SIDE_REPEATER: 0.1, C.R_SIDE_REPEATER: 0.1}


def perceived(frames, is_ct, juniper=False):
    """Perceived brightness from the crowd. The truck shows its bar; a 2025+ Model Y (juniper) only
    the lamps it really has, with its bar's centre (channel 6, either side) weighted 1.2."""
    if juniper:
        lv = sum(w * lamp_level(frames[:, ch]) for ch, w in JUNIPER.items())
        return lv + 1.2 * np.maximum(lamp_level(frames[:, C.L_CH6]), lamp_level(frames[:, C.R_CH6]))
    bar = frames[:, C.FRONT_BAR.start:C.FRONT_BAR.stop].astype(float).mean(1) / 255
    lv = np.zeros(len(frames))
    for ch, w in LAMPS.items():
        if is_ct and ch in (C.L_SIGNATURE, C.R_SIGNATURE, C.L_CH4, C.R_CH4):
            continue
        lv += w * lamp_level(frames[:, ch])
    return lv + 2.0 * bar


def load(show):
    out = ROOT / "output" / show
    an = pickle.loads((out / "analysis.pkl").read_bytes())
    cars = [perceived(read_fseq(d / "LightShow" / f"{show}.fseq")[0], v.kind == "cybertruck", v.juniper)
            for d, v in show_cars(show)]
    n = min(len(c) for c in cars)
    cars = np.array([c[:n] for c in cars])
    import librosa
    stem = out / "stems" / "drums.wav"
    y, sr = librosa.load(str(stem if stem.exists() else out / f"{show}.wav"), sr=22050, mono=True)
    hop = int(sr * STEP)
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)[:n]
    onset = np.pad(onset, (0, max(0, n - len(onset))))
    return an, cars, onset, out


def flux(cars):
    total = cars.sum(0)
    f = np.clip(np.diff(total, prepend=total[:1]), 0, None)
    # a hit is light switching on over one or two frames: sum adjacent frames
    return f + np.concatenate([[0], f[:-1]])


def metrics(an, cars, onset, t0, t1):
    beats = np.asarray(an.beats, float)
    b = beats[(beats >= t0) & (beats < t1)]
    if len(b) < 4:
        return None
    fl = flux(cars)
    tt = np.arange(len(fl)) * STEP                          # frame i plays at i x 20 ms with the audio
    m = (tt >= t0) & (tt < t1)
    win = int(0.04 / STEP)

    def around(sig, times, w):
        idx = np.clip(np.round(times / STEP).astype(int), 0, len(sig) - 1)
        return np.array([sig[max(0, i - w):i + w + 1].max() for i in idx])

    a_on = around(onset, b, 1).mean()
    a_all = onset[(np.arange(len(onset)) * STEP >= t0) & (np.arange(len(onset)) * STEP < t1)].mean() + 1e-9
    v_on = around(fl, b, win)
    v_mean = fl[m].mean() + 1e-9
    # phase locking: every frame's flux, weighted, at its position inside its beat
    idx = np.flatnonzero(m & (fl > 0.05))
    if len(idx):
        t = tt[idx]
        k = np.clip(np.searchsorted(beats, t) - 1, 0, len(beats) - 2)
        ph = (t - beats[k]) / np.maximum(beats[k + 1] - beats[k], 1e-3)
        w = fl[idx]
        z = (w * np.exp(2j * np.pi * ph)).sum() / w.sum()
        lock, lead_ms = abs(z), -np.angle(z) / (2 * np.pi) * np.median(np.diff(b)) * 1000
    else:
        lock, lead_ms = 0.0, 0.0
    hit = around(fl, b, int(0.05 / STEP)) >= HIT
    downs = np.asarray(an.downbeats, float)
    d = downs[(downs >= t0) & (downs < t1)]
    others = b[~np.isin(np.round(b, 3), np.round(d, 3))]
    down_ratio = (around(fl, d, win).mean() / (around(fl, others, win).mean() + 1e-9)) if len(d) and len(others) else 1.0
    return dict(audio=a_on / a_all, onbeat=v_on.mean() / v_mean, lock=lock, lead=lead_ms,
                coverage=hit.mean(), down=down_ratio, bright=cars[:, m].sum(0).mean())


def table(show):
    an, cars, onset, out = load(show)
    print(f"{show}  ({an.tempo:.0f} BPM)")
    print(f"  {'section':<14} {'mood':<7} {'audio pulse':>11} {'on-beat':>8} {'lock':>5} {'coverage':>8} {'downbeat':>8} {'bright':>6}")
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    allm = metrics(an, cars, onset, 0, an.duration)
    for sc in an.sections:
        r = metrics(an, cars, onset, sc.t0, sc.t1)
        if r is None:
            continue
        moods = [x[3] for x in rows if sc.t0 <= float(x[0]) < sc.t1]
        mood = max(set(moods), key=moods.count) if moods else ""
        print(f"  {sc.letter}{sc.nth} {sc.t0:4.0f}-{sc.t1:4.0f}s {mood:<7} {r['audio']:11.2f} {r['onbeat']:8.2f} {r['lock']:5.2f} "
              f"{r['coverage']:8.0%} {r['downbeat'] if 'downbeat' in r else r['down']:8.2f} {r['bright']:6.2f}")
    print(f"  {'whole song':<14} {'':<7} {allm['audio']:11.2f} {allm['onbeat']:8.2f} {allm['lock']:5.2f} "
          f"{allm['coverage']:8.0%} {allm['down']:8.2f} {allm['bright']:6.2f}   (light leads the beat by {allm['lead']:+.0f} ms)")
    return an, cars, onset, out


def strip(show, t0, t1, an=None, cars=None, onset=None, out=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    if an is None:
        an, cars, onset, out = load(show)
    a, b = int(t0 / STEP), min(int(t1 / STEP), cars.shape[1], len(onset))
    t = np.arange(a, b) * STEP
    tv = t
    fig, ax = plt.subplots(5, 1, figsize=(16, 9), sharex=True, gridspec_kw=dict(height_ratios=[1.2, 1, 1, 1, 1]))
    beats = np.asarray(an.beats, float)
    downs = np.asarray(an.downbeats, float)
    ax[0].fill_between(t, onset[a:b], color="#7aa6ff", lw=0)
    ax[0].set_ylabel("music\n(drums)" if (out / "stems" / "drums.wav").exists() else "music")
    names = ["left Y", "Cybertruck", "right Y"]
    for k in range(3):
        ax[k + 1].fill_between(tv, cars[k, a:b], color=["#ffd34d", "#e8e8ff", "#ffd34d"][k], lw=0)
        ax[k + 1].set_ylabel(names[k])
        ax[k + 1].set_ylim(0, 6)
    fl = flux(cars)[a:b]
    ax[4].fill_between(tv, fl, color="#ff7a59", lw=0)
    ax[4].set_ylabel("light hits")
    for x in ax:
        for bt in beats[(beats >= t0) & (beats < t1)]:
            x.axvline(bt, color="#888", lw=0.5, alpha=0.6)
        for d in downs[(downs >= t0) & (downs < t1)]:
            x.axvline(d, color="#d33", lw=1.0, alpha=0.7)
        x.set_facecolor("#111")
    rows = [l.split(None, 4) for l in (out / "moves.txt").read_text().splitlines()]
    for r in rows:
        p0, p1 = float(r[0]), float(r[1])
        if p1 > t0 and p0 < t1:
            ax[0].text(max(p0, t0), ax[0].get_ylim()[1] * 0.92, f"{r[4]} ({r[3]})", color="w", fontsize=7, va="top")
            ax[0].axvline(max(p0, t0), color="#5f5", lw=1)
    ax[-1].set_xlabel("seconds  (grey: beats, red: downbeats, green: phrase starts)")
    fig.suptitle(f"{show} {t0:g}-{t1:g}s: the music's beat against what each car shows")
    fig.tight_layout()
    dest = ROOT / "checks" / f"feel_{show}_{int(t0)}_{int(t1)}.png"
    dest.parent.mkdir(exist_ok=True)
    fig.savefig(dest, dpi=80, facecolor="#222")
    print(f"strip: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    show = sys.argv[1]
    an, cars, onset, out = table(show)
    if len(sys.argv) >= 4:
        strip(show, float(sys.argv[2]), float(sys.argv[3]), an, cars, onset, out)
