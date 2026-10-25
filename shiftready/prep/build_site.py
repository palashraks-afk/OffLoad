"""Write web/data/regions.json (the region switcher list) from the regions that have built data."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import APP, WEB_DATA, write_json  # noqa: E402

ORDER = ["ca23", "ca33", "cle", "mia", "sac", "den", "atl", "sea", "bos"]


def main():
    out = []
    for rid in ORDER:
        f = WEB_DATA / rid / "region.json"
        if f.exists() and (WEB_DATA / rid / "transit.json").exists():
            r = json.loads(f.read_text())
            out.append({"id": rid, "name": r["name"], "short": r["short"], "label": r["label"], "center": r["center"]})
    write_json(WEB_DATA / "regions.json", out)


if __name__ == "__main__":
    main()
