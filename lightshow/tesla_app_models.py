"""Tesla's own car models from the Tesla app, for the 3D preview (preview3d/src/car/appBody.ts).

    python3 -m lightshow.tesla_app_models ~/Downloads/Tesla_4.61.6-4647.apkm

The Tesla Android app carries Tesla's 3D models of every car, with Tesla's own animations for the
frunk, liftgate, doors, windows, mirrors and charge port. tesla-model-extractor (MIT,
github.com/koenhendriks/tesla-model-extractor) turns an app bundle you have (.apkm, .apks, .xapk or
.apk; from your phone, or an APK mirror) into GLB files:

    pipx install git+https://github.com/koenhendriks/tesla-model-extractor

This runs it for every light-show car with an app model (MODELS: Model S 2021+, both Model 3s, Model X
2021+, the four Model Ys and the Cybertruck) and puts each one, with the app's paint table
(paints.json), where the viewer looks: preview3d/public/models/tesla-app/<id>/ and
preview3d/dist/models/tesla-app/<id>/. They're the only car models the viewer draws (until they're
there it says how to get them). The models are Tesla's: they stay out of the repository (.gitignore).

Plain Python with no dependencies; the first run takes a few minutes (the extractor unpacks the app).
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / "preview3d" / "public" / "models" / "tesla-app", ROOT / "preview3d" / "dist" / "models" / "tesla-app"]
MODELS = {
    "s_palladium": "S_Palladium.glb",       # Model S 2021+
    "model3_high": "3_High.glb",            # Model 3 2017-23
    "poppyseed": "Poppyseed.glb",           # Model 3 2024+
    "x_palladium": "X_Palladium.glb",       # Model X 2021+
    "y_high": "Y_High.glb",                 # Model Y 2020-24
    "bayberry": "Bayberry.glb",             # Model Y 2025+ Premium / Performance
    "bayberry_e41": "BayberryE41.glb",      # Model Y 2025+ Standard
    "bayberry_e80": "BayberryE80.glb",      # Model Y L
    "cybertruck": "Cybertruck.glb",
}
EXTRAS = ["paints.json"]                    # the app's paint table (the same for every car)


def extractor():
    cli = os.environ.get("TESLA_MODEL_EXTRACT") or shutil.which("tesla-model-extract")
    if not cli:
        sys.exit("tesla-model-extract isn't installed: "
                 "pipx install git+https://github.com/koenhendriks/tesla-model-extractor")
    return cli


def gdre_args():
    """The extractor's macOS download of GDRE Tools unpacks as "Godot RE Tools.app" without its
    executable bit (extractor 2026-10); point it at the binary and make it runnable."""
    if sys.platform != "darwin":
        return []
    cache = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "tesla-model-extractor" / "gdre"
    found = sorted(cache.glob("v*/Godot RE Tools.app/Contents/MacOS/Godot RE Tools"))
    if not found:
        return []
    found[-1].chmod(0o755)
    return ["--gdre", str(found[-1])]


def main(bundle):
    bundle = Path(bundle).expanduser().resolve()
    if not bundle.exists():
        sys.exit(f"{bundle} not found")
    cli = extractor()
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [cli, "unreal", *gdre_args(), "--models", ",".join(MODELS), "--variant", "plate_us", "--yes",
               "-o", tmp, str(bundle)]
        print("extracting the car models (a few minutes the first time)...")
        r = subprocess.run(cmd)
        if r.returncode and not gdre_args():           # the first run downloads GDRE Tools; retry with it
            r = subprocess.run([cmd[0], "unreal", *gdre_args(), *cmd[2:]])
        if r.returncode:
            sys.exit("tesla-model-extract failed (see above)")
        for model, glb in MODELS.items():
            src = Path(tmp) / model / glb
            if not src.exists():
                print(f"  {model}: not in this app bundle")
                continue
            for target in TARGETS:
                if target.parent.exists():
                    (target / model).mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(src, target / model / glb)
                    for extra in EXTRAS:
                        if (src.parent / extra).exists():
                            shutil.copyfile(src.parent / extra, target / model / extra)
            print(f"  {model}: {src.stat().st_size / 1e6:.0f} MB")
    print("done: reload the 3D preview")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
