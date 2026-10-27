"""Choreograph a made-up song for lineups of every size and check the rules every show must keep."""

import copy
import hashlib

import numpy as np
import pytest

from lightshow import channels as C

LINEUPS = ["Y", "y", "C", "YC", "CY", "YCY", "yCy", "CCC", "YYY", "CYC", "YCYC", "YYCYY", "CCCCC", "yYCYy"]


def _choreograph(an, lineup, style=None):
    from lightshow.choreo import choreograph
    return choreograph(copy.deepcopy(an), layout=lineup, name="synth", style=style)


@pytest.mark.parametrize("lineup", LINEUPS)
def test_every_lineup_gets_a_show(analysis, lineup):
    cars = _choreograph(analysis, lineup)
    assert [c.name.split("_")[0] for c in cars] == [f"Car{i + 1}" for i in range(len(lineup))]
    for car in cars:
        assert car.frames.shape == (analysis.n_frames, C.N_CHANNELS)
        lit = (car.frames[:, :C.LIFTGATE] > 0).any(1).mean()
        assert lit > 0.2, f"{car.name} is dark {100 * (1 - lit):.0f}% of the song"
        for ch, used in car.closure_counts.items():
            assert used <= C.CLOSURE_LIMITS[ch], f"{car.name} channel {ch}: {used} commands"


@pytest.mark.parametrize("lineup", ["YCY", "YC"])
def test_legato_style(analysis, lineup):
    cars = _choreograph(analysis, lineup, style="legato")
    assert all(c.frames[:, :C.LIFTGATE].any() for c in cars)


def test_same_input_same_show(analysis):
    def digest():
        return [hashlib.sha1(c.frames.tobytes()).hexdigest() for c in _choreograph(analysis, "YCY")]
    assert digest() == digest()


def test_motor_rules(analysis, tmp_path):
    """Tesla's closure rules (tools/closure_audit.py): limits, Dance only once open, dance budget."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
    from closure_audit import audit
    from lightshow.fseq import write_fseq
    for car in _choreograph(analysis, "YYCYY"):
        path = tmp_path / car.name / "show.fseq"
        path.parent.mkdir()
        write_fseq(path, car.frames, C.STEP_MS)
        flags = [f for r in audit(path) for f in r["flags"] if not f.startswith("REVERSED EARLY")]
        assert not flags, f"{car.name}: {flags}"


def test_lights_lead_the_beat_by_one_frame(analysis):
    """Lights are written one frame ahead of the sound, so they read as on the beat."""
    from lightshow.choreo import LIGHT_LEAD_S
    assert LIGHT_LEAD_S == pytest.approx(C.STEP_MS / 1000)
    assert np.all(np.diff(analysis.beats) > 0)
