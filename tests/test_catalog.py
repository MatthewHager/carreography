"""The move catalogue (lightshow/catalog.py) and the moves themselves (lightshow/moves.py) agree."""

import pytest

pytest.importorskip("librosa")              # choreo imports the analysis modules
from lightshow import catalog as CAT        # noqa: E402
from lightshow import choreo as CH          # noqa: E402
from lightshow import moves as M            # noqa: E402

MOODS = {"calm", "groove", "drive", "frenzy"}
GESTURES = {"motif", "run", "figuration", "trill", "chords", "cadence", "recitative"}
GRIDS = {"note", "beat", "bar", "build", "self"}


@pytest.mark.parametrize("name", sorted(CAT.UNISON))
def test_every_unison_move_exists(name):
    assert callable(getattr(M, name, None)), f"catalog.py lists {name} but moves.py has no {name}()"


@pytest.mark.parametrize("name,info", sorted(CAT.UNISON.items()) + sorted(CAT.SPLIT.items()))
def test_entries_are_well_formed(name, info):
    assert info.what and not info.what.endswith(".")
    assert set(info.moods) <= MOODS and info.moods
    assert set(info.gestures) <= GESTURES and info.gestures
    assert info.grid in GRIDS


def test_choreographer_only_names_catalogued_moves():
    named = set(CH.UNISON_FIGURATION) | CH.COLLAB | CH.BEAT_MOVES | CH.CALM | CH.QUIET | CH.STRONG
    halves = {h for pair in CAT.SPLIT for h in pair}
    unknown = named - set(CAT.UNISON) - halves
    assert not unknown, f"choreo.py refers to moves the catalogue doesn't list: {sorted(unknown)}"
