import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
import pytest  # noqa: E402
from metrics import band, lower_bound_hours  # noqa: E402

# Worked examples from the master plan (Jan 2026, standard 25 min).
@pytest.mark.parametrize("n,p90,expected", [
    (653, 43 + 35 / 60, 20.2),
    (1034, 34 + 35 / 60, 16.5),
    (1662, 30 + 1 / 60, 13.9),
    (1384, 26 + 50 / 60, 4.2),
])
def test_worked_examples(n, p90, expected):
    assert round(lower_bound_hours(n, p90, 25), 1) == expected


def test_zero_when_not_over_standard():
    assert lower_bound_hours(500, 24, 25) == 0.0
    assert lower_bound_hours(500, 25, 25) == 0.0


@pytest.mark.parametrize("pct,color", [
    (None, "gray"), (95, "green"), (90.0, "green"), (89.9, "yellow"),
    (75.0, "yellow"), (74.9, "red"), (43.1, "red"),
])
def test_bands(pct, color):
    assert band(pct) == color
