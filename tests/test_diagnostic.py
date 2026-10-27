import itertools

import pytest

pytest.importorskip("numpy")
from lightshow import diagnostic as D   # noqa: E402

ALL_SHORT = ["".join(p) for n in (1, 2, 3) for p in itertools.product("YyC", repeat=n)]


def test_classic_voice_track_is_unchanged():
    # The YCY announcements are the ones its recorded voice track was made with; changing a word
    # re-records it and moves every cue. Change this hash only on purpose.
    assert D._script_hash("YCY", "say") == "989d487f17b903a2"


@pytest.mark.parametrize("lineup", ALL_SHORT + ["YCYC", "YYCYY", "CCCCC", "yYCYy"])
def test_script_reads_well_for_every_lineup(lineup):
    lines = D.script(lineup)
    keys = [k for k, _, _ in lines]
    assert len(keys) == len(set(keys))
    assert [k for k in keys if k.startswith("car")] == [f"car{i + 1}" for i in range(len(lineup))]
    for key, text, seconds in lines:
        assert text.strip() and "  " not in text and seconds >= 0
        if "C" not in lineup:
            assert "Cybertruck" not in text and "frunk" not in text
        if not set(lineup) & set("Yy"):
            assert "liftgate" not in text and "Model Y" not in text
    assert ("bar_b" in keys) == ("Y" in lineup)


@pytest.mark.parametrize("lineup", ["Y", "YC", "YYCYY"])
def test_diagnostic_choreography_runs(lineup):
    pytest.importorskip("librosa")          # the choreographer's imports need the analysis environment
    timing = {"duration": 300.0, "steps": [{"key": k, "speech": 1.0 + 10 * i, "action": 5.0 + 10 * i,
                                            "end": 5.0 + 10 * i + s} for i, (k, _, s) in enumerate(D.script(lineup))]}
    cars = D.choreograph(timing, lineup)
    assert len(cars) == len(lineup)
    assert all(c.frames.any() for c in cars)
