#!/usr/bin/env python3
"""Make a car's USB drive (macOS): plug in a drive, run this, answer two questions.

    python3 make_usb.py              asks which car, waits for a USB drive, then does everything
    python3 make_usb.py 2            car 2 (numbered from the crowd's left); also left, right, truck
    python3 make_usb.py --list       show the USB drives this would use, change nothing

The cars are the lineup in setlist.json (build.py --lineup to change it).

It erases the drive (exFAT, Master Boot Record), names it after the car, copies that car's
LightShow folder from usb/ (build.py makes it), checks every file against the original and
against Tesla's rules, and ejects it. Label the drive and plug it into that car.

Options: --disk diskN (pick the drive when several are plugged in), --yes (don't ask before
erasing - only when you're sure which drive it is).
"""

import argparse
import hashlib
import json
import plistlib
import shutil
import struct
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
USB = ROOT / "usb"
sys.path.insert(0, str(ROOT))
from lightshow import vehicles as VEH      # noqa: E402  (plain Python)

# The drive names the classic three-car lineup's drives were made with; other lineups get
# "CAR<n> MODELY" / "CAR<n> TRUCK". At most 11 characters (diskutil's limit for exFAT names).
CLASSIC_LABELS = {"Car1_ModelY_Left": "CAR1 LEFT Y", "Car2_Cybertruck_Center": "CAR2 TRUCK",
                  "Car3_ModelY_Right": "CAR3 RIGHT"}


def lineup_cars():
    """{number: (folder, drive name, who)} for setlist.json's lineup."""
    setlist = ROOT / "setlist.json"
    lineup = json.loads(setlist.read_text()).get("lineup", "YCY") if setlist.exists() else "YCY"
    out = {}
    for i, (folder, v, place) in enumerate(VEH.cars(lineup), 1):
        model = "Cybertruck" if v.kind == "cybertruck" else "Model Y"
        where = VEH.SPOKEN_PLACES[place]
        label = CLASSIC_LABELS.get(folder) or f"CAR{i} {'TRUCK' if v.kind == 'cybertruck' else 'MODELY'}"
        out[i] = (folder, label, f"the {model}{' ' + where if where else ''}")
    return out


def aliases(cars):
    """What people may type for each car: its number, left/right for the ends, truck if there's one."""
    out = {str(n): n for n in cars}
    if len(cars) > 1:
        out.update({"left": 1, "l": 1, "right": len(cars), "r": len(cars)})
    trucks = [n for n, (folder, _, _) in cars.items() if "Cybertruck" in folder]
    if len(trucks) == 1:
        out.update({"truck": trucks[0], "cybertruck": trucks[0]})
    return out


CARS = lineup_cars()
ALIASES = aliases(CARS)
MAX_BYTES = 512e9           # never offer anything bigger than this: that's a backup disk, not a stick


def diskutil(verb, *args, plist=True):
    cmd = ["diskutil", verb, *(["-plist"] if plist else []), *args]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        sys.exit(f"diskutil {verb} failed: {(r.stderr or r.stdout).decode().strip()}")
    out = r.stdout
    return plistlib.loads(out) if plist else out.decode()


def usb_drives(allow_virtual=False):
    """Whole external drives: [{id, size, name, volumes}]."""
    kind = ["external"] if allow_virtual else ["external", "physical"]
    listing = plistlib.loads(subprocess.run(["diskutil", "list", "-plist", *kind],
                                            check=True, capture_output=True).stdout)
    drives = []
    for d in listing.get("AllDisksAndPartitions", []):
        info = diskutil("info", d["DeviceIdentifier"])
        if info.get("Internal") or (not allow_virtual and info.get("VirtualOrPhysical") == "Virtual"):
            continue
        if not allow_virtual and "Disk Image" in (info.get("BusProtocol") or "") + (info.get("MediaName") or ""):
            continue
        vols = [p.get("VolumeName") or p.get("Content", "") for p in d.get("Partitions", [])]
        drives.append({"id": d["DeviceIdentifier"], "size": info.get("TotalSize") or info.get("Size", 0),
                       "name": info.get("MediaName", "USB drive"), "volumes": [v for v in vols if v]})
    return drives


def gb(n):
    return f"{n / 1e9:.1f} GB"


def describe(d):
    vols = ", ".join(f'"{v}"' for v in d["volumes"]) or "no volumes"
    return f'{d["id"]}: {d["name"]}, {gb(d["size"])} ({vols})'


def pick_car(arg):
    while arg is None or str(arg).lower() not in ALIASES:
        if arg is not None:
            print(f"  '{arg}' isn't a car - use " + ", ".join(str(n) for n in CARS))
        for n, (_, _, who) in CARS.items():
            print(f"  {n}  {who}")
        arg = input("Which car is this drive for? ").strip()
    return ALIASES[str(arg).lower()]


def pick_drive(disk, allow_virtual):
    drives = usb_drives(allow_virtual)
    if disk:
        match = [d for d in drives if d["id"] == disk.replace("/dev/", "")]
        if not match:
            sys.exit(f"{disk} isn't a USB drive plugged into this Mac (see python3 make_usb.py --list)")
        return match[0]
    if not drives:
        print("Plug in the USB drive... (Ctrl-C to stop)")
        while not drives:
            time.sleep(1)
            drives = usb_drives(allow_virtual)
        time.sleep(2)                                     # let macOS finish mounting it
        drives = usb_drives(allow_virtual)
    if len(drives) == 1:
        return drives[0]
    print("Several USB drives are plugged in:")
    for i, d in enumerate(drives, 1):
        print(f"  {i}  {describe(d)}")
    while True:
        a = input("Which one? ").strip()
        if a.isdigit() and 1 <= int(a) <= len(drives):
            return drives[int(a) - 1]


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def check_fseq(path):
    """Tesla's validator's checks: FSEQ v2, uncompressed, 48 or 200 channels, under 4 hours."""
    with open(path, "rb") as f:
        head = f.read(21)
    magic, start, major = head[:4], *struct.unpack("<HxB", head[4:8])
    channels, frames, step = struct.unpack("<IIB", head[10:19])
    problems = []
    if magic != b"PSEQ" or start < 24 or frames < 1 or step < 15 or major != 2:
        problems.append("not an FSEQ v2 file")
    if channels not in (48, 200):
        problems.append(f"{channels} channels")
    if head[20] != 0:
        problems.append("compressed")
    if frames * step / 1000 > 4 * 3600:
        problems.append("longer than 4 hours")
    return problems


def verify(mount, src):
    """Every file identical to the original, and the drive as Tesla wants it."""
    problems = []
    dest = mount / "LightShow"
    if not dest.is_dir():
        return ["no LightShow folder at the top of the drive"]
    if (mount / "TeslaCam").exists():
        problems.append("a TeslaCam folder at the top of the drive (Tesla won't load shows from it)")
    for f in sorted(src.iterdir()):
        d = dest / f.name
        if not d.exists():
            problems.append(f"missing {f.name}")
        elif d.stat().st_size != f.stat().st_size or sha(d) != sha(f):
            problems.append(f"{f.name} differs from the original")
        elif f.suffix == ".fseq":
            problems += [f"{f.name}: {p}" for p in check_fseq(d)]
    names = {p.stem for p in dest.glob("*.fseq")}
    audio = {p.stem for p in dest.glob("*.wav")} | {p.stem for p in dest.glob("*.mp3")}
    problems += [f"{n}.fseq has no matching .wav" for n in sorted(names - audio)]
    extra = [p.name for p in dest.iterdir() if p.name.startswith("._")]
    if extra:
        problems.append(f"macOS metadata files left behind: {', '.join(extra[:3])}")
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("car", nargs="?", help="the car's number (1 = the crowd's left), or left/right/truck")
    ap.add_argument("--disk", help="the drive to use, e.g. disk8 (see --list)")
    ap.add_argument("--yes", action="store_true", help="erase without asking")
    ap.add_argument("--list", action="store_true", help="list USB drives and stop")
    ap.add_argument("--allow-virtual", action="store_true", help=argparse.SUPPRESS)   # testing with disk images
    args = ap.parse_args()

    if sys.platform != "darwin":
        sys.exit("make_usb.py uses macOS's diskutil. Elsewhere: format the drive exFAT and copy "
                 "usb/<car>/LightShow to its top level.")
    if args.list:
        drives = usb_drives(args.allow_virtual)
        print("\n".join(describe(d) for d in drives) or "no USB drives plugged in")
        return

    car = pick_car(args.car)
    folder, label, who = CARS[car]
    src = USB / folder / "LightShow"
    if not any(src.glob("*.fseq")):
        sys.exit(f"{src.relative_to(ROOT)} is empty - run python3 build.py --assemble first")
    files = sorted(src.iterdir())
    need = sum(f.stat().st_size for f in files)
    print(f"Car {car}, {who}: {len(list(src.glob('*.fseq')))} shows, {gb(need)}")

    drive = pick_drive(args.disk, args.allow_virtual)
    print(f"Drive: {describe(drive)}")
    if drive["size"] > MAX_BYTES:
        sys.exit("That drive is too big to be a USB stick - refusing to erase it.")
    if drive["size"] < need * 1.08:
        sys.exit(f"That drive is too small: the shows need {gb(need)}; use one of at least {gb(need * 1.1)}.")
    if not args.yes:
        a = input(f"Everything on {drive['id']} will be erased. Type erase to continue: ").strip().lower()
        if a != "erase":
            sys.exit("Nothing changed.")

    print(f"Erasing {drive['id']} as exFAT \"{label}\"...")
    diskutil("eraseDisk", "ExFAT", label, "MBR", f"/dev/{drive['id']}", plist=False)
    mount = Path(f"/Volumes/{label}")
    for _ in range(20):
        if mount.is_dir():
            break
        time.sleep(0.5)
    else:
        sys.exit(f"the erased drive didn't mount at {mount}")
    subprocess.run(["mdutil", "-i", "off", str(mount)], capture_output=True)   # no Spotlight index

    dest = mount / "LightShow"
    dest.mkdir()
    for i, f in enumerate(files, 1):
        print(f"\r  copying {i}/{len(files)}: {f.name:<40}", end="", flush=True)
        shutil.copyfile(f, dest / f.name)          # contents only: no macOS extended attributes
    print()
    subprocess.run(["dot_clean", "-m", str(mount)], capture_output=True)
    subprocess.run(["sync"])

    print("Checking...")
    problems = verify(mount, src)
    if problems:
        print("  PROBLEMS:\n  " + "\n  ".join(problems))
        sys.exit("The drive is NOT ready - fix the above and run this again.")
    print(f"  all {len(files)} files match the originals; LightShow folder, names and formats as Tesla requires")
    subprocess.run(["diskutil", "eject", f"/dev/{drive['id']}"], capture_output=True)
    print(f"Done - unplug it, label it \"{label}\", and plug it into {who}.")
    print("In the car: Toybox > Light Show > Schedule Show should list 00_diagnostic first.")


if __name__ == "__main__":
    main()
