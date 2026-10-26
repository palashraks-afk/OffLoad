"""Publish the processed coverage-by-hour tables as open files (CSV and JSON) and one comparison table.

    python shiftready/prep/open_data.py

Reads web/data/<id>/reach.json and region.json for every region listed in web/data/regions.json and writes, in web/data/open/:
  <id>_coverage_by_hour.csv / .json   one row per day type and hour
  all_regions_coverage_by_hour.csv     the same rows for every region in one file
  comparison.json                      one record per region (read by the app's comparison view)
  README.md                            definitions, vintage, licence, citation, changelog (kept by hand: this script only checks it exists)
Only standard-library code, so it can run anywhere the other prep scripts run. Nothing here is measured again; every number comes from
the reach.json files, which people.py produced from the timetables, Census LODES and ACS.
"""
import csv
import datetime
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import WEB_DATA, write_json  # noqa: E402

DAYS = ["weekday", "saturday", "sunday"]
OUT = WEB_DATA / "open"
COLS = ["region", "scope", "agencies", "day", "hour", "people_share_near_bus", "jobs_share_near_bus",
        "warehouse_transport_jobs_share_near_bus", "health_jobs_share_near_bus"]
# A day runs 4 AM to 4 AM when asking "when does the last bus stop"; hour 0 to 3 belong to the night before.
DAY_ORDER = list(range(4, 24)) + list(range(0, 4))


def load(rid):
    reg = json.loads((WEB_DATA / rid / "region.json").read_text(encoding="utf-8"))
    reach = json.loads((WEB_DATA / rid / "reach.json").read_text(encoding="utf-8"))
    return reg, reach


def rows_for(rid, reg, reach):
    scope = reg.get("scope") or reg["name"]
    agencies = reg.get("agencies") or reg["agency"]
    out = []
    for day in DAYS:
        d = reach[day]
        for h in range(24):
            out.append({
                "region": rid, "scope": scope, "agencies": agencies, "day": day, "hour": h,
                "people_share_near_bus": round(d["pop_share"][h], 4),
                "jobs_share_near_bus": round(d["jobs_share"][h], 4),
                "warehouse_transport_jobs_share_near_bus": round(d["trans_jobs_share_district"][h], 4),
                "health_jobs_share_near_bus": round(d["health_jobs_share_district"][h], 4),
            })
    return out


def last_hour(shares, floor=0.01):
    """Latest hour on the 4 AM to 4 AM clock at which at least `floor` of people live within the walk of a bus; None if never."""
    last = None
    for h in DAY_ORDER:
        if shares[h] >= floor:
            last = h
    return last


def summary(rid, reg, reach):
    wd, sat, sun = reach["weekday"], reach["saturday"], reach["sunday"]
    return {
        "id": rid, "label": reg["label"], "short": reg["short"], "name": reg["name"],
        "scope": reg.get("scope") or reg["name"], "agencies": reg.get("agencies") or reg["agency"],
        "feed_start": reg.get("feed_start", ""), "feed_end": reg.get("feed_end", ""),
        "district_pop": reach["district_pop"], "district_jobs": reach["district_jobs"],
        "district_trans_jobs": reach["district_trans_jobs"],
        "people_noon": wd["pop_share"][12], "people_11pm": wd["pop_share"][23], "people_1am": wd["pop_share"][1],
        "jobs_noon": wd["jobs_share"][12], "jobs_11pm": wd["jobs_share"][23],
        "wh_noon": wd["trans_jobs_share_district"][12], "wh_11pm": wd["trans_jobs_share_district"][23],
        "people_sat_11pm": sat["pop_share"][23], "people_sun_noon": sun["pop_share"][12],
        "last_hour_weekday": last_hour(wd["pop_share"]), "last_hour_saturday": last_hour(sat["pop_share"]),
        "last_hour_sunday": last_hour(sun["pop_share"]),
        "hh_nocar_share": reach.get("hh_nocar_share"), "bus_commute_share": reach.get("bus_commute_share"),
        "walk_m": reach.get("walk_m", 400),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    regions = json.loads((WEB_DATA / "regions.json").read_text(encoding="utf-8"))
    every, comp = [], []
    for r in regions:
        rid = r["id"]
        try:
            reg, reach = load(rid)
        except FileNotFoundError:
            print("skip", rid, "(no reach.json or region.json)")
            continue
        rows = rows_for(rid, reg, reach)
        every += rows
        with (OUT / f"{rid}_coverage_by_hour.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            w.writerows(rows)
        (OUT / f"{rid}_coverage_by_hour.json").write_text(json.dumps(rows, separators=(",", ":")), encoding="utf-8")
        comp.append(summary(rid, reg, reach))
        print("wrote", rid, len(rows), "rows")
    with (OUT / "all_regions_coverage_by_hour.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(every)
    write_json(OUT / "comparison.json", {"built": datetime.date.today().isoformat(), "regions": comp})
    if not (OUT / "README.md").exists():
        print("WARNING: web/data/open/README.md is missing (it is written by hand)")


if __name__ == "__main__":
    main()
