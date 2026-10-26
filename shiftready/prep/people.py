"""People, jobs and bus coverage by hour (web/data/<id>/tracts.json, reach.json, sheds.json).

Tract centers stand in for where people live and work: an approximation, stated in the app.
Coverage = a stop with at least one departure in that hour is within WALK_M of the tract center.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import shapefile
from shapely.geometry import shape

sys.path.insert(0, str(Path(__file__).parent))
from transit import load_feed  # noqa: E402
from common import ROOT, WEB_DATA, hms_to_min, region, write_json  # noqa: E402

WALK_M = 400
DAYS = {"weekday": 1, "saturday": 2, "sunday": 4}
KM = 111_320


def district_polygon(cfg):
    b = cfg["boundary"]
    r = shapefile.Reader(str(ROOT / "data/raw/cd/shp/cb_2024_us_cd119_500k"))
    return next(shape(s.shape.__geo_interface__) for s in r.iterShapeRecords()
                if s.record.as_dict()["STATEFP"] == b["state_fips"] and s.record.as_dict()["CD119FP"] == b["cd"])


def load_tracts(cfg, poly):
    acs = json.loads((ROOT / f"data/raw/tract/acs_{cfg['id']}.json").read_text())["data"]
    r = shapefile.Reader(str(ROOT / f"data/raw/tract/shp/cb_2023_{cfg['state_fips']}_tract_500k"))
    rows = []
    for s in r.iterShapeRecords():
        d = s.record.as_dict()
        if d["COUNTYFP"] not in cfg["county_fips"]:
            continue
        e = acs.get("14000US" + d["GEOID"])
        if not e:
            continue
        c = shape(s.shape.__geo_interface__).representative_point()
        b25, b08, b01 = (e[k]["estimate"] for k in ("B25044", "B08301", "B01003"))
        rows.append({"id": d["GEOID"], "lat": round(c.y, 5), "lon": round(c.x, 5),
                     "in_district": bool(poly.contains(c)), "pop": int(b01["B01003001"] or 0),
                     "hh": int(b25["B25044001"] or 0),
                     "hh_nocar": int((b25["B25044003"] or 0) + (b25["B25044010"] or 0)),
                     "commuters": int(b08["B08301001"] or 0), "bus": int(b08["B08301010"] or 0)})
    return pd.DataFrame(rows)


def add_jobs(t, cfg):
    w = pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/wac.csv", dtype={"w_geocode": str},
                    usecols=["w_geocode", "C000", "CNS07", "CNS08", "CNS16"])
    w["id"] = w.w_geocode.str[:11]
    j = w.groupby("id").sum(numeric_only=True).rename(columns={
        "C000": "jobs", "CNS07": "jobs_retail", "CNS08": "jobs_trans", "CNS16": "jobs_health"})
    return t.merge(j, left_on="id", right_index=True, how="left").fillna(0)


def load_blocks(cfg):
    """Job blocks in the county with exact coordinates and the 119th-Congress district from LODES's own crosswalk."""
    x = pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/xwalk.csv", dtype=str,
                    usecols=["tabblk2020", "cty", "trct", "stplcname", "stcd119", "blklatdd", "blklondd"])
    x = x[x.cty == cfg["state_fips"] + cfg["county_fips"][0]]
    w = pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/wac.csv", dtype={"w_geocode": str},
                    usecols=["w_geocode", "C000", "CNS07", "CNS08", "CNS16"])
    b = x.merge(w, left_on="tabblk2020", right_on="w_geocode")
    b = b.rename(columns={"C000": "jobs", "CNS07": "jobs_retail", "CNS08": "jobs_trans", "CNS16": "jobs_health"})
    b["lat"], b["lon"] = b.blklatdd.astype(float), b.blklondd.astype(float)
    b["in_district"] = b.stcd119 == cfg["state_fips"] + cfg["boundary"]["cd"]
    return b[b.jobs > 0].reset_index(drop=True)


def tract_labels(cfg):
    x = pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/xwalk.csv", dtype=str, usecols=["cty", "trct", "stplcname"])
    x = x[x.cty == cfg["state_fips"] + cfg["county_fips"][0]]
    return x.groupby("trct").stplcname.agg(lambda s: s.mode().iat[0] if len(s.mode()) else "").str.replace(
        r",\s*[A-Z]{2}$", "", regex=True).str.replace(r" (city|CDP)$", "", regex=True).to_dict()


def stop_hours(cfg):
    """Stops and hours served, from the main agency and every extra BUS feed in the region file (commuter rail, mode "rail", is left out:
    the headline numbers are about buses)."""
    feeds = [("", cfg["gtfs_dir"])] + [(x["prefix"], x["dir"]) for x in cfg.get("gtfs_extra", []) if x.get("mode") != "rail"]
    parts = {"weekday": [], "saturday": [], "sunday": []}
    for prefix, d in feeds:
        g = ROOT / d
        _, _, trips, stops, st = load_feed(g, prefix)       # ids prefixed; untimed stops filled in between timed ones
        cal = pd.read_csv(g / "calendar.txt", dtype=str)
        cal["service_id"] = prefix + cal.service_id
        # A bus cannot be boarded at the last stop of its trip, so only stops with a later stop count as service.
        st = st[st.groupby("trip_id", sort=False).cumcount(ascending=False) > 0]
        st = st.assign(hour=(st.t // 60).astype(int) % 24)
        stops = stops[["stop_id", "stop_lat", "stop_lon"]]
        for name, col in (("weekday", "monday"), ("saturday", "saturday"), ("sunday", "sunday")):
            svc = set(cal[cal[col] == "1"].service_id)
            ids = trips[trips.service_id.isin(svc)].trip_id
            parts[name].append(st[st.trip_id.isin(ids)][["stop_id", "hour"]].drop_duplicates().merge(stops, on="stop_id"))
    return {k: pd.concat(v, ignore_index=True) for k, v in parts.items()}


def near(pts_lat, pts_lon, stops_df, lat0=34.1, radius=None):
    if stops_df.empty:
        return np.zeros(len(pts_lat), bool)
    cos = np.cos(np.radians(lat0))
    sx, sy = stops_df.stop_lon.values * KM * cos, stops_df.stop_lat.values * KM
    px, py = np.asarray(pts_lon) * KM * cos, np.asarray(pts_lat) * KM
    return np.hypot(px[:, None] - sx[None, :], py[:, None] - sy[None, :]).min(axis=1) <= (radius or WALK_M)


def coverage(t, sh, lat0=34.1):
    """cov[day][hour] = boolean array over tracts."""
    cov = {}
    for day, df in sh.items():
        cov[day] = [near(t.lat, t.lon, df[df.hour == h], lat0) for h in range(24)]
    return cov


def sheds(cfg, t, cov):
    """Where do people who work in each big job area live? (top 12 home tracts per workplace tract)."""
    keep = set(t.id)
    pre = cfg["state_fips"] + cfg["county_fips"][0]
    agg = {}
    for ch in pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/od.csv", dtype={"w_geocode": str, "h_geocode": str},
                          usecols=["w_geocode", "h_geocode", "S000"], chunksize=2_000_000):
        ch = ch[ch.w_geocode.str.startswith(pre)]
        ch = ch.assign(w=ch.w_geocode.str[:11], h=ch.h_geocode.str[:11])
        for (w, h), n in ch.groupby(["w", "h"]).S000.sum().items():
            agg[(w, h)] = agg.get((w, h), 0) + int(n)
    pairs = pd.DataFrame([(w, h, n) for (w, h), n in agg.items()], columns=["w", "h", "n"])
    pairs.to_csv(ROOT / "data/processed/od_tract_pairs.csv", index=False)
    top = t.sort_values("jobs_trans", ascending=False).head(25).id.tolist() + \
        t.sort_values("jobs", ascending=False).head(25).id.tolist() + \
        t[t.in_district].sort_values("jobs", ascending=False).head(20).id.tolist()   # the district's own biggest job areas (hospitals, campuses), so its employers can pick their area
    night ={i: bool(cov["weekday"][23][k]) for k, i in enumerate(t.id)}
    meta = t.set_index("id")
    out = {}
    for w in dict.fromkeys(top):
        p = pairs[pairs.w == w].sort_values("n", ascending=False)
        tot = int(p.n.sum())
        top12 = p.head(12)
        out[w] = {"workers": tot, "jobs_trans": int(meta.loc[w, "jobs_trans"]),
                  "top12_share": round(float(top12.n.sum() / max(tot, 1)), 3),
                  "homes": [[r.h, int(r.n)] for r in p.head(400).itertuples()]}
    return out


def main(rid="ca33"):
    cfg = region(rid)
    poly = district_polygon(cfg)
    t = add_jobs(load_tracts(cfg, poly), cfg)
    sh = stop_hours(cfg)
    lat0 = cfg["center"][0]
    cov = coverage(t, sh, lat0)
    (ROOT / "data/processed").mkdir(parents=True, exist_ok=True)
    D = t.in_district.values
    reach = {"walk_m": WALK_M, "district_pop": int(t["pop"][D].sum()), "district_jobs": int(t.jobs[D].sum()),
             "county_pop": int(t["pop"].sum()), "county_jobs": int(t.jobs.sum())}
    b = load_blocks(cfg)
    bcov = coverage(b, sh, lat0)
    BD = b.in_district.values
    reach["district_jobs_blocks"] = int(b.jobs[BD].sum())
    reach["county_trans_jobs"] = int(b.jobs_trans.sum())
    reach["district_trans_jobs"] = int(b.jobs_trans[BD].sum())
    for day in DAYS:
        reach[day] = {
            "pop_share": [round(float((t["pop"].values * c)[D].sum() / t["pop"].values[D].sum()), 4) for c in cov[day]],
            "jobs_share": [round(float((b.jobs.values * c)[BD].sum() / b.jobs.values[BD].sum()), 4) for c in bcov[day]],
            "trans_jobs_share_county": [round(float((b.jobs_trans.values * c).sum() / b.jobs_trans.values.sum()), 4)
                                        for c in bcov[day]],
            "trans_jobs_share_district": [round(float((b.jobs_trans.values * c)[BD].sum() / b.jobs_trans.values[BD].sum()), 4)
                                          for c in bcov[day]],
            "health_jobs_share_district": [round(float((b.jobs_health.values * c)[BD].sum() / b.jobs_health.values[BD].sum()), 4)
                                           for c in bcov[day]],
        }
    # sensitivity: the same numbers with a 10-minute (800 m) walk instead of 5 minutes
    sens = {}
    for h in (5, 12, 23):
        sh_w = sh["weekday"][sh["weekday"].hour == h]
        pc = near(t.lat, t.lon, sh_w, lat0, 800)
        bc = near(b.lat, b.lon, sh_w, lat0, 800)
        sens[str(h)] = {"pop_share": round(float((t["pop"].values * pc)[D].sum() / t["pop"].values[D].sum()), 4),
                        "trans_jobs_share_district": round(float((b.jobs_trans.values * bc)[BD].sum() / b.jobs_trans.values[BD].sum()), 4)}
    reach["sensitivity_800m"] = sens
    reach["hh_nocar_share"] = round(float(t.hh_nocar[D].sum() / t.hh[D].sum()), 4)
    reach["bus_commute_share"] = round(float(t.bus[D].sum() / t.commuters[D].sum()), 4)
    cols = ["id", "lat", "lon", "in_district", "pop", "hh_nocar", "jobs", "jobs_trans", "jobs_health", "jobs_retail"]
    lab = tract_labels(cfg)
    recs = t[cols].to_dict("records")
    for k, r in enumerate(recs):
        r["place"] = lab.get(r["id"], "")
        r["cov"] = {day: "".join("1" if cov[day][h][k] else "0" for h in range(24)) for day in DAYS}
    write_json(WEB_DATA / rid / "tracts.json", recs)
    write_json(WEB_DATA / rid / "reach.json", reach)
    write_json(WEB_DATA / rid / "sheds.json", sheds(cfg, t, cov))
    print("district pop", reach["district_pop"], "jobs", reach["district_jobs"])
    for day in DAYS:
        print(day, "pop@noon", reach[day]["pop_share"][12], "pop@23", reach[day]["pop_share"][23],
              "jobs@23", reach[day]["jobs_share"][23], "jobs@5", reach[day]["jobs_share"][5],
              "district warehouse jobs@23", reach[day]["trans_jobs_share_district"][23])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca33")
