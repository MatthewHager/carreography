"""Files from Tesla's light-show repository that this project uses but doesn't redistribute.

Tesla publishes its light-show tools at github.com/teslamotors/light-show without a licence, so the
repository fetches them instead of carrying copies:

  vendor/light-show/               a shallow clone: validator.py (Tesla's show checker) and the
                                   xLights show folder
  preview3d/public/models/,        the 3D viewer's car meshes and lamp layout, unpacked from the
  preview3d/dist/models/           xLights show folder zip

Plain Python with no dependencies (build.py, setup.sh and webapp/ call it before anything else).
"""

import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_URL = "https://github.com/teslamotors/light-show"
REPO = ROOT / "vendor" / "light-show"
SHOW_FOLDER_ZIP = REPO / "xlights" / "tesla_xlights_show_folder.zip"
VIEWER_MODELS = [ROOT / "preview3d" / "public" / "models", ROOT / "preview3d" / "dist" / "models"]
# What the viewer loads (preview3d/src/car/teslaAssets.ts), inside the zip's tesla_xlights_show_folder/.
MODEL_FILES = [
    "xlights_rgbeffects.xml",
    *(f"Cybertruck/{f}" for f in ("Cybertruck.mtl", "Cybertruck.obj", "Cybertruck_Premium_Wheel_AO_Dark.png",
                                  "Exterior_AO_Dark.png", "Lights_AO.png", "Lights_AO_Red.png", "Paint_Red_AO.png")),
    *(f"Model_S/{f}" for f in ("ModelS.mtl", "ModelS.obj", "Arachnid_Wheel_AO.png", "Exterior_AO.png",
                               "Exterior_AO_Dark.png", "Lights_AO.png", "Lights_Red_AO.png")),
]


def ensure_repo(quiet=False):
    """Clone Tesla's light-show repo into vendor/ if it isn't there (needs git and the network)."""
    if not REPO.exists():
        if not quiet:
            print(f"fetching Tesla's light-show repo ({REPO_URL}) into vendor/light-show")
        REPO.parent.mkdir(exist_ok=True)
        subprocess.run(["git", "clone", "--depth", "1", "--quiet", REPO_URL, str(REPO)], check=True)
    return REPO


def ensure_viewer_models(quiet=False):
    """Unpack the car models the 3D viewer needs, if any are missing."""
    missing = [d for d in VIEWER_MODELS if d.parent.exists() and not all((d / f).exists() for f in MODEL_FILES)]
    if not missing:
        return
    ensure_repo(quiet)
    with zipfile.ZipFile(SHOW_FOLDER_ZIP) as z:
        for d in missing:
            for f in MODEL_FILES:
                target = d / f
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(f"tesla_xlights_show_folder/{f}"))
    if not quiet:
        print("3D viewer: Tesla's car models unpacked into " + ", ".join(str(d.relative_to(ROOT)) for d in missing))


if __name__ == "__main__":
    ensure_repo()
    ensure_viewer_models()
