"""Statewide and per-agency totals (run `python pipeline/run.py` first)."""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
ST = json.loads((ROOT / "site/data/state.json").read_text(encoding="utf-8"))
DF = pd.read_csv(ROOT / "data/processed/offloads.csv", dtype={"facility_id": str})


def test_statewide_hours_match_the_tidy_table_once_per_hospital():
    for month, v in ST["months"].items():
        rows = DF[DF.month == month].sort_values("lower_bound_hours", ascending=False).drop_duplicates("facility_id")
        assert abs(rows.lower_bound_hours.sum() - v["hours_min"]) < 0.2, month
        assert len(rows) == v["listed"], month


def test_agency_names_are_full_and_few():
    names = list(ST["lemsas"])
    assert len(names) <= 34
    assert all(n.endswith("EMS Agency") for n in names), names


def test_agency_hours_add_up_to_statewide():
    for month, v in ST["months"].items():
        total = sum(a["months"][month]["hours_min"] for a in ST["lemsas"].values() if month in a["months"])
        assert abs(total - v["hours_min"]) < 1.0, month


def test_scenario_formula_at_own_target_equals_lower_bound():
    from sys import path
    path.insert(0, str(ROOT / "pipeline"))
    from metrics import lower_bound_hours
    for r in DF[DF.month == "2026-02"].itertuples():
        assert abs(0.1 * r.offloads * max(0, r.p90_min - r.standard_min) / 60 - lower_bound_hours(r.offloads, r.p90_min, r.standard_min)) < 1e-9
