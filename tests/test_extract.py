"""Parser must match the hand-typed seed table (values read from the EMSA
February 2026 PDF, which holds January 2026 data)."""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
import extract  # noqa: E402

PDF = ROOT / "data/raw/CA/file-2026-02.pdf"
SEED = ROOT / "tests/seed_2026-01.csv"


def test_summary_counts_match_report_text():
    month, rows, unmatched = extract.extract(PDF)
    assert month == "2026-01"
    assert unmatched == []
    assert len(rows) == 166  # "166 (55%) hospitals exceeded" in the report


def test_matches_seed_table_exactly():
    _, rows, _ = extract.extract(PDF)
    by_id = {r["facility_id"]: r for r in rows}
    with open(SEED, newline="") as f:
        for s in csv.DictReader(f):
            r = by_id[s["facility_id"]]
            assert r["hospital"] == s["hospital"]
            assert r["offloads"] == int(s["offloads"])
            assert extract.hms_to_min(s["p90"]) == r["p90_min"]
            assert extract.hms_to_min(s["standard"]) == r["standard_min"]
            assert r["pct_compliant"] == float(s["pct_compliant"])


def _all_months():
    import glob
    out = []
    for f in sorted(glob.glob(str(ROOT / "data/raw/CA/*.pdf"))):
        month, rows, unmatched = extract.extract(f)
        if rows or unmatched:
            out.append((f, month, rows, unmatched))
    return out


def test_every_month_parses_cleanly_and_is_internally_consistent():
    months = _all_months()
    assert len(months) >= 6
    for f, month, rows, unmatched in months:
        assert unmatched == [], f
        for r in rows:
            assert r["p90_min"] > r["standard_min"], (f, r["hospital"])
            # printed "amount exceeding" must equal p90 - standard (within a second)
            assert abs(r["over_min"] - (r["p90_min"] - r["standard_min"])) < 0.02, (f, r["hospital"])
            assert r["offloads"] >= 60, (f, r["hospital"], r["offloads"])
            assert r["pct_compliant"] is None or 0 < r["pct_compliant"] < 90.01
