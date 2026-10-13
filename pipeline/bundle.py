"""Pack every JSON the site reads into site/data/bundle.js.

fetch() is blocked on file:// pages, so the site loads this one script instead.
That keeps the demo working offline and when opened by double-click.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def main():
    data = {}
    for name in ("hospitals", "districts", "meta", "clinics", "forecast", "places", "state"):
        data[name] = json.loads((SITE / "data" / f"{name}.json").read_text(encoding="utf-8"))
    data["geo"] = json.loads((SITE / "data" / "ca_districts.geojson").read_text(encoding="utf-8"))
    data["i18n"] = {lang: json.loads((SITE / "i18n" / f"{lang}.json").read_text(encoding="utf-8"))
                    for lang in ("en", "es")}
    out = "window.OW_DATA=" + json.dumps(data, separators=(",", ":")) + ";"
    (SITE / "data" / "bundle.js").write_text(out, encoding="utf-8")
    print("bundle.js", len(out) // 1024, "KB")


if __name__ == "__main__":
    main()
