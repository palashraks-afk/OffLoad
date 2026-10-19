"""Paths and small helpers shared by every prep script."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repo root (has data/raw)
APP = Path(__file__).resolve().parents[1]           # shiftready/
WEB_DATA = APP / "web/data"


def region(rid="ca33"):
    return json.loads((APP / f"regions/{rid}.json").read_text())


def hms_to_min(s):
    """'25:10:30' -> 1510.5 (GTFS times run past 24:00 for after-midnight trips)."""
    h, m, sec = (int(x) for x in s.strip().split(":"))
    return h * 60 + m + sec / 60


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path.relative_to(APP)}  {path.stat().st_size / 1024:.0f} KB")
