"""The lineup: which cars, in which order, as the crowd sees them (crowd's left to right).

A lineup is a string of 1 to 5 letters, one per car:

    Y   Model Y, 2025 and later ("Juniper": a light bar across the nose)
    y   Model Y, 2020-2024
    C   Cybertruck

e.g. "YCY" is Model Y | Cybertruck | Model Y. Every car gets its own show file, named after its
place in the line (Car2_Cybertruck_Center); each one goes on that car's USB drive.

Plain Python with no dependencies: build.py and make_usb.py read it before any analysis setup.
To add a vehicle, see CONTRIBUTING.md ("Adding a vehicle").
"""

from dataclasses import dataclass

MAX_CARS = 5


@dataclass(frozen=True)
class Vehicle:
    letter: str
    kind: str          # the choreographer's body type: "modely" or "cybertruck"
    model: str         # used in folder names
    label: str         # for people
    juniper: bool      # 2025+ Model Y lamp map (lightshow/lamps.py)
    body: str          # the 3D viewer's body (preview/shows.json)


VEHICLES = {
    "Y": Vehicle("Y", "modely", "ModelY", "Model Y (2025+)", True, "modely2025"),
    "y": Vehicle("y", "modely", "ModelY", "Model Y (2020-2024)", False, "modely2020"),
    "C": Vehicle("C", "cybertruck", "Cybertruck", "Cybertruck", False, "cybertruck"),
}

# Place names by lineup length, crowd's left to right.
PLACES = {
    1: ["Solo"],
    2: ["Left", "Right"],
    3: ["Left", "Center", "Right"],
    4: ["Left", "CenterLeft", "CenterRight", "Right"],
    5: ["Left", "CenterLeft", "Center", "CenterRight", "Right"],
}
SPOKEN_PLACES = {
    "Solo": "", "Left": "on the crowd's left", "Right": "on the crowd's right", "Center": "in the middle",
    "CenterLeft": "left of centre", "CenterRight": "right of centre",
}


def parse_lineup(text):
    """The lineup string, checked; raises ValueError with a message for people."""
    s = (text or "").strip()
    if not 1 <= len(s) <= MAX_CARS:
        raise ValueError(f"a lineup is 1 to {MAX_CARS} cars, e.g. YCY (got {text!r})")
    bad = sorted({ch for ch in s if ch not in VEHICLES})
    if bad:
        raise ValueError(f"unknown car letter(s) {', '.join(bad)}: use " +
                         ", ".join(f"{v.letter} = {v.label}" for v in VEHICLES.values()))
    return s


def cars(lineup):
    """[(folder name, Vehicle, place)] crowd's left to right, e.g. ("Car1_ModelY_Left", Y, "Left")."""
    s = parse_lineup(lineup)
    places = PLACES[len(s)]
    return [(f"Car{i + 1}_{VEHICLES[ch].model}_{places[i]}", VEHICLES[ch], places[i]) for i, ch in enumerate(s)]


def describe(lineup):
    """'Model Y (2025+) | Cybertruck | Model Y (2025+)'"""
    return " | ".join(v.label for _, v, _ in cars(lineup))
