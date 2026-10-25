"""GTFS -> a compact timetable the browser can search (web/data/<id>/transit.json).

Trips are stored whole (stops + times) and expanded into connections in JavaScript.
Service day is a bitmask: 1 = weekday, 2 = Saturday, 4 = Sunday.
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, WEB_DATA, hms_to_min, region, write_json  # noqa: E402


def service_masks(gtfs):
    cal = pd.read_csv(gtfs / "calendar.txt", dtype=str)
    masks = {}
    for r in cal.itertuples():
        m = 0
        if any(getattr(r, d) == "1" for d in ("monday", "tuesday", "wednesday", "thursday", "friday")):
            m |= 1
        if r.saturday == "1":
            m |= 2
        if r.sunday == "1":
            m |= 4
        masks[r.service_id] = m
    return masks


def fares(gtfs):
    """Fixed-route fares from the agency's own fare files: adult and senior/disability/Medicare. None if the feed has none."""
    f = gtfs / "fare_products.txt"
    if not f.exists():
        return None
    d = pd.read_csv(f, dtype=str)
    names = {"single": "omni_fr_single", "day": "omni_fr_day", "d7": "omni_fr_7d", "d31": "omni_fr_31d"}
    out = {}
    for who, cat in (("adult", "omni_adult"), ("reduced", "omni_sdm")):
        row = {}
        for k, pid in names.items():
            x = d[(d.fare_product_id == pid) & (d.rider_category_id == cat)]
            if len(x):
                row[k] = float(x.amount.iloc[0])
        if row:
            out[who] = row
    return out or None


def load_feed(gtfs, prefix=""):
    """One GTFS folder -> the five tables, with every id prefixed so several feeds can be merged without clashes."""
    masks = {prefix + k: v for k, v in service_masks(gtfs).items()}
    routes = pd.read_csv(gtfs / "routes.txt", dtype=str).fillna("")
    routes["route_id"] = prefix + routes.route_id
    trips = pd.read_csv(gtfs / "trips.txt", dtype=str)
    trips["trip_id"] = prefix + trips.trip_id
    trips["route_id"] = prefix + trips.route_id
    trips["service_id"] = prefix + trips.service_id
    stops = pd.read_csv(gtfs / "stops.txt", dtype={"stop_id": str})
    stops["stop_id"] = prefix + stops.stop_id
    st = pd.read_csv(gtfs / "stop_times.txt", dtype=str,
                     usecols=["trip_id", "stop_id", "stop_sequence", "arrival_time", "departure_time"])
    st["trip_id"] = prefix + st.trip_id
    st["stop_id"] = prefix + st.stop_id
    return masks, routes, trips, stops, st


def build(rid="ca33"):
    """Merges the main agency feed with any `gtfs_extra` feeds listed in the region file (for example commuter rail)."""
    cfg = region(rid)
    gtfs = ROOT / cfg["gtfs_dir"]
    feeds = [load_feed(gtfs)] + [load_feed(ROOT / x["dir"], x["prefix"]) for x in cfg.get("gtfs_extra", [])]
    masks = {}
    for f in feeds:
        masks.update(f[0])
    routes = pd.concat([f[1] for f in feeds], ignore_index=True)
    trips = pd.concat([f[2] for f in feeds], ignore_index=True)
    stops = pd.concat([f[3] for f in feeds], ignore_index=True)
    st = pd.concat([f[4] for f in feeds], ignore_index=True)
    st["seq"] = st.stop_sequence.astype(int)
    st = st.sort_values(["trip_id", "seq"])
    ridx = {r: i for i, r in enumerate(routes.route_id)}
    stop_ids = list(dict.fromkeys(st.stop_id))
    sidx = {s: i for i, s in enumerate(stop_ids)}
    sinfo = stops.set_index("stop_id")
    out_trips = []
    tmeta = trips.set_index("trip_id")
    for tid, g in st.groupby("trip_id", sort=False):
        t = tmeta.loc[tid]
        mask = masks.get(t.service_id, 0)
        if not mask or len(g) < 2:
            continue
        times = [round(hms_to_min(x), 1) for x in g.departure_time.fillna(g.arrival_time)]
        steps = [int(round((b - a) * 10)) for a, b in zip(times, times[1:])]   # tenths of a minute between stops
        out_trips.append([ridx[t.route_id], mask, [sidx[s] for s in g.stop_id], times[0], steps,
                          t.trip_headsign if isinstance(t.trip_headsign, str) else ""])
    obj = {
        "agency": cfg["agency"],
        "fares": fares(gtfs),
        "stops": [[sinfo.loc[s, "stop_name"], round(float(sinfo.loc[s, "stop_lat"]), 5),
                   round(float(sinfo.loc[s, "stop_lon"]), 5)] for s in stop_ids],
        "routes": [[r.route_short_name, r.route_long_name, "#" + r.route_color if r.route_color else ""]
                   for r in routes.itertuples()],
        "trips": out_trips,
    }
    write_json(WEB_DATA / rid / "transit.json", obj)
    return obj


if __name__ == "__main__":
    o = build(sys.argv[1] if len(sys.argv) > 1 else "ca33")
    print(len(o["stops"]), "stops,", len(o["routes"]), "routes,", len(o["trips"]), "trips, fares", o["fares"])
