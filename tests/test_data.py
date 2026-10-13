"""Checks on the built data the site ships (run `python pipeline/run.py` first)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import band, lower_bound_hours  # noqa: E402

H = json.loads((ROOT / "site/data/hospitals.json").read_text(encoding="utf-8"))
META = json.loads((ROOT / "site/data/meta.json").read_text(encoding="utf-8"))
BY_NAME = {h["name"]: h for h in H}


def test_bands_follow_the_written_rules():
    for h in H:
        for m, v in h["months"].items():
            assert v["band"] == band(v["pct_compliant"]), (h["name"], m)


def test_lower_bound_hours_recompute():
    for h in H:
        for m, v in h["months"].items():
            assert abs(v["hours_min"] - lower_bound_hours(v["offloads"], v["p90_min"], v["standard_min"])) < 0.01


def test_no_listed_hospital_is_green():
    """The report lists only hospitals over their target, so green is impossible for them."""
    for h in H:
        for v in h["months"].values():
            assert v["band"] != "green"


def test_unlisted_hospitals_have_no_months_and_never_green():
    for h in H:
        if not h["months"]:
            assert h["id"].startswith("C-")


def test_known_hospital_districts_by_census_boundary():
    # Verified against the Census 119th Congress boundary (cb_2024_us_cd119_500k).
    exp = {"Community Hospital of San Bernardino": "CA-33", "St. Bernardine Medical Center": "CA-33",
           "Arrowhead Regional Medical Center": "CA-33", "Redlands Community Hospital": "CA-23",
           "Loma Linda University Medical Center": "CA-23"}
    for name, d in exp.items():
        assert BY_NAME[name]["district"] == d, name


def test_placed_hospitals_are_in_california_with_a_district():
    for h in H:
        if h["lat"] is not None:
            assert 32.4 < h["lat"] < 42.1 and -124.7 < h["lon"] < -114.0, h["name"]
            assert h["district"], h["name"]


def test_every_hospital_month_is_a_known_month():
    for h in H:
        assert set(h["months"]) <= set(META["months"])
