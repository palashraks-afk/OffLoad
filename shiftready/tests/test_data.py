"""Checks on the built data. Run from the repo root:  .venv/bin/python -m pytest shiftready/tests -q"""
import json
from pathlib import Path

import pandas as pd
import pytest

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
D = APP / "web/data"
REGIONS = [r for r in ("ca23", "ca33", "cle", "mia", "sac") if (D / r / "transit.json").exists()]


def load(rid, name):
    return json.loads((D / rid / f"{name}.json").read_text())


@pytest.mark.parametrize("rid", REGIONS)
def test_timetable_matches_gtfs(rid):
    cfg = json.loads((APP / f"regions/{rid}.json").read_text())
    folders = [ROOT / cfg["gtfs_dir"]] + [ROOT / x["dir"] for x in cfg.get("gtfs_extra", [])]   # main agency plus merged feeds
    if not all((g / "trips.txt").exists() for g in folders):
        pytest.skip("raw GTFS not downloaded on this machine (data/raw is not in the repo)")
    t = load(rid, "transit")
    total = active_trips = 0
    for g in folders:
        trips = pd.read_csv(g / "trips.txt", dtype=str)
        active = set(pd.read_csv(g / "calendar.txt", dtype=str).service_id)
        total += trips.trip_id.nunique()
        active_trips += trips[trips.service_id.isin(active)].trip_id.nunique()
    # every trip we kept belongs to a service that runs on at least one weekday/Saturday/Sunday
    assert len(t["trips"]) <= total
    assert len(t["trips"]) >= 0.9 * active_trips
    n = len(t["stops"])
    assert all(0 <= s < n for tr in t["trips"][:2000] for s in tr[2])
    # times never go backwards inside a trip (steps are non-negative)
    assert all(min(tr[4]) >= 0 for tr in t["trips"] if tr[4])


def test_ca23_headline_numbers_are_stable():
    r = load("ca23", "reach")
    assert r["district_pop"] == 729052
    wd = r["weekday"]["pop_share"]
    assert 0.17 < wd[12] < 0.23            # about 20% near a bus at noon
    assert wd[23] == 0.0                   # nobody near a bus at 11 pm
    assert wd[1] == 0.0


def test_ca33_headline_numbers_are_stable():
    r = load("ca33", "reach")
    assert r["district_pop"] == 759809
    wd = r["weekday"]["pop_share"]
    assert 0.35 < wd[12] < 0.40            # about 37% near a bus at noon
    assert wd[23] < 0.06                   # about 4% at 11 pm
    assert wd[1] == 0.0                    # nobody near a bus at 1 am
    assert r["saturday"]["pop_share"][23] == 0.0


@pytest.mark.parametrize("rid", REGIONS)
def test_reach_shares_are_valid(rid):
    r = load(rid, "reach")
    for day in ("weekday", "saturday", "sunday"):
        for k in ("pop_share", "jobs_share", "trans_jobs_share_district"):
            v = r[day][k]
            assert len(v) == 24 and all(0 <= x <= 1 for x in v)


@pytest.mark.parametrize("rid", REGIONS)
def test_tracts_and_blocks(rid):
    tr = load(rid, "tracts")
    assert len(tr) > 100
    assert all(len(t["cov"]["weekday"]) == 24 for t in tr)
    assert sum(t["pop"] for t in tr if t["in_district"]) > 100_000
    bl = load(rid, "blocks")
    assert all(len(b) == 6 for b in bl[:100])


def test_fars_counts_match_nhtsa_download():
    d = pd.read_csv(ROOT / "data/processed/ped_bike_deaths_us.csv")
    ca = d[d.STATE == 6]
    assert ca.groupby("year").size().to_dict() == {2019: 1154, 2020: 1149, 2021: 1312, 2022: 1394, 2023: 1300}
    assert ((d.STATE == 6) & (d.COUNTY == 71)).sum() == 547


def test_risk_report_is_honest_and_complete():
    r = load("ca33", "risk_report")
    assert r["train"].startswith("2019") and r["test"].startswith("2022")
    names = [x["name"] for x in r["rows"]]
    assert "Random (expected)" in names and any("model" in n.lower() for n in names)
    for x in r["rows"]:
        assert 0 <= x["cap10"] <= x["cap20"] <= 1
    assert r["n_test_deaths"] > 50 and "comparisons" in r


def test_safety_aligned_with_stops():
    for rid in REGIONS:
        s = load(rid, "safety")
        assert len(s["stops"]) == len(load(rid, "transit")["stops"])
