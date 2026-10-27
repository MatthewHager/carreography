"""Tesla's light-show repository, which this project uses but doesn't redistribute.

Tesla publishes its light-show tools at github.com/teslamotors/light-show without a licence, so the
repository fetches them instead of carrying copies: a shallow clone in vendor/light-show/ gives
validator.py (Tesla's show checker, used by tools/setlist_review.py) and Tesla's documentation.

(The 3D viewer's car models come from the Tesla app instead: lightshow/tesla_app_models.py.)

Plain Python with no dependencies; setup.sh and the Dockerfile run it.
"""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_URL = "https://github.com/teslamotors/light-show"
REPO = ROOT / "vendor" / "light-show"


def ensure_repo(quiet=False):
    """Clone Tesla's light-show repo into vendor/ if it isn't there (needs git and the network)."""
    if not REPO.exists():
        if not quiet:
            print(f"fetching Tesla's light-show repo ({REPO_URL}) into vendor/light-show")
        REPO.parent.mkdir(exist_ok=True)
        subprocess.run(["git", "clone", "--depth", "1", "--quiet", REPO_URL, str(REPO)], check=True)
    return REPO


if __name__ == "__main__":
    ensure_repo()
