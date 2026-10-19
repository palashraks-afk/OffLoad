"""Exploratory numbers for the "can I get there without a car, at this hour" idea (CA-33).

Research check, not the final app. Uses tract centroids as a rough stand-in for where
people live, so every share is an approximation (stated in the output).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import shapefile
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw"
WALK_M = 400  # about a 5 minute walk


def ca33_polygon():
    r = shapefile.Reader(str(RAW / "cd/shp/cb_2024_us_cd119_500k"))
    return next(shape(s.shape.__geo_interface__) for s in r.iterShapeRecords()
                if s.record.as_dict()["STATEFP"] == "06" and s.record.as_dict()["CD119FP"] == "33")


def tracts(poly):
    acs = json.loads((RAW / "tract/acs.json").read_text())["data"]
    r = shapefile.Reader(str(RAW / "tract/shp/cb_2023_06_tract_500k"))
    rows = []
    for s in r.iterShapeRecords():
        d = s.record.as_dict()
        if d["COUNTYFP"] != "071":
            continue
        c = shape(s.shape.__geo_interface__).representative_point()
        if not poly.contains(c):
            continue
        e = acs.get("14000US" + d["GEOID"])
        if not e:
            continue
        b25, b08, b01 = (e[k]["estimate"] for k in ("B25044", "B08301", "B01003"))
        rows.append({"geoid": d["GEOID"], "lat": c.y, "lon": c.x, "pop": b01["B01003001"],
                     "hh": b25["B25044001"], "hh_nocar": b25["B25044003"] + b25["B25044010"],
                     "commuters": b08["B08301001"], "bus": b08["B08301010"]})
    return pd.DataFrame(rows)


def stop_hours():
    g = str(RAW / "gtfs/omnitrans") + "/"
    cal = pd.read_csv(g + "calendar.txt", dtype=str)
    trips = pd.read_csv(g + "trips.txt", dtype=str)
    wk = set(cal[cal.monday == "1"].service_id)
    sat = set(cal[cal.saturday == "1"].service_id)
    st = pd.read_csv(g + "stop_times.txt", dtype=str, usecols=["trip_id", "stop_id", "departure_time"])
    stops = pd.read_csv(g + "stops.txt", dtype={"stop_id": str})[["stop_id", "stop_lat", "stop_lon"]]
    st["hour"] = st.departure_time.str.split(":").str[0].astype(int) % 24
    out = {}
    for name, svc in (("weekday", wk), ("saturday", sat)):
        t = trips[trips.service_id.isin(svc)].trip_id
        out[name] = st[st.trip_id.isin(t)][["stop_id", "hour"]].drop_duplicates().merge(stops, on="stop_id")
    return out


def near(pts, stops_df):
    """True for each point that has a stop within WALK_M (flat-earth approximation)."""
    if stops_df.empty:
        return np.zeros(len(pts), bool)
    k = 111_320
    sx, sy = stops_df.stop_lon.values * k * np.cos(np.radians(34.1)), stops_df.stop_lat.values * k
    px, py = pts.lon.values * k * np.cos(np.radians(34.1)), pts.lat.values * k
    d = np.hypot(px[:, None] - sx[None, :], py[:, None] - sy[None, :]).min(axis=1)
    return d <= WALK_M


if __name__ == "__main__":
    poly = ca33_polygon()
    t = tracts(poly)
    print(f"CA-33 tracts used: {len(t)}  population: {int(t['pop'].sum()):,}")
    print(f"Households with no vehicle: {int(t.hh_nocar.sum()):,} of {int(t.hh.sum()):,} "
          f"({t.hh_nocar.sum() / t.hh.sum():.1%})")
    print(f"Commuters who take the bus: {int(t.bus.sum()):,} of {int(t.commuters.sum()):,} "
          f"({t.bus.sum() / t.commuters.sum():.1%})")
    sh = stop_hours()
    fac = pd.read_csv(RAW / "geo/facilities.csv", dtype=str)
    clin = fac[(fac.FAC_TYPE_CODE.isin(["FQHC", "GACH"])) & (fac.FAC_STATUS_TYPE_CODE == "OPEN") & fac.LATITUDE.notna()].copy()
    clin["lat"], clin["lon"] = clin.LATITUDE.astype(float), clin.LONGITUDE.astype(float)
    clin = clin[[poly.contains(Point(x, y)) for x, y in zip(clin.lon, clin.lat)]]
    print(f"Clinics + hospitals inside CA-33: {len(clin)}")
    print("\nhour  weekday: % residents near a stop WITH a departure | % of clinics/hospitals reachable")
    rows = []
    for day in ("weekday", "saturday"):
        for h in (6, 9, 12, 17, 20, 22, 23, 1, 4, 5):
            s = sh[day][sh[day].hour == h]
            pop_ok = (t["pop"] * near(t, s)).sum() / t["pop"].sum()
            cl_ok = near(clin, s).mean()
            rows.append((day, h, pop_ok, cl_ok))
    for day, h, p, c in rows:
        print(f"{day:8s} {h:02d}:00   residents {p:5.1%}   clinics {c:5.1%}")
