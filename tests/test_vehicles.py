import pytest

from lightshow import vehicles as VEH


@pytest.mark.parametrize("lineup", ["Y", "y", "C", "YC", "yCy", "YCY", "CCCC", "YyCyY"])
def test_valid_lineups(lineup):
    assert VEH.parse_lineup(lineup) == lineup
    assert len(VEH.cars(lineup)) == len(lineup)


@pytest.mark.parametrize("bad", ["", "YYYYYY", "YXC", "yCy ", "3"])
def test_invalid_lineups(bad):
    if bad == "yCy ":                       # surrounding spaces are forgiven
        assert VEH.parse_lineup(bad) == "yCy"
        return
    with pytest.raises(ValueError):
        VEH.parse_lineup(bad)


def test_folder_names_follow_the_crowds_view():
    assert [f for f, _, _ in VEH.cars("YCY")] == ["Car1_ModelY_Left", "Car2_Cybertruck_Center", "Car3_ModelY_Right"]
    assert [f for f, _, _ in VEH.cars("C")] == ["Car1_Cybertruck_Solo"]
    assert [p for _, _, p in VEH.cars("YYCYY")] == ["Left", "CenterLeft", "Center", "CenterRight", "Right"]


def test_folder_names_fit_and_are_unique():
    for n in range(1, VEH.MAX_CARS + 1):
        names = [f for f, _, _ in VEH.cars("C" * n)]
        assert len(set(names)) == n
        assert all(len(f) < 64 and f.isascii() for f in names)


def test_every_vehicle_has_a_viewer_body_and_label():
    for v in VEH.VEHICLES.values():
        assert v.body and v.label and v.kind in ("modely", "cybertruck")
