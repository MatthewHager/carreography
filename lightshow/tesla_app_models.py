"""Tesla's own car models from the Tesla app, for the 3D preview (preview3d/src/car/appBody.ts).

    python3 -m lightshow.tesla_app_models ~/Downloads/Tesla_4.61.6-4647.apkm

The Tesla Android app carries Tesla's 3D models of every car, with Tesla's own animations for the
frunk, liftgate, doors, windows, mirrors and charge port. tesla-model-extractor (MIT,
github.com/koenhendriks/tesla-model-extractor) turns an app bundle you have (.apkm, .apks, .xapk or
.apk; from your phone, or an APK mirror) into GLB files:

    pipx install git+https://github.com/koenhendriks/tesla-model-extractor

This runs it for the cars the shows support - the 2025+ Model Y (bayberry), the 2020-24 Model Y
(y_high) and the Cybertruck - and puts them where the viewer looks:
preview3d/public/models/tesla-app/ and preview3d/dist/models/tesla-app/. They're the only car models the
viewer draws (until they're there it says how to get them). The models are Tesla's: they stay out of
the repository (.gitignore).

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
MODELS = {"bayberry": "Bayberry.glb", "y_high": "Y_High.glb", "cybertruck": "Cybertruck.glb"}


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
            print(f"  {model}: {src.stat().st_size / 1e6:.0f} MB")
    print("done: reload the 3D preview")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
