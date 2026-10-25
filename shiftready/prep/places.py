"""Boundary, job blocks, ZIP/city centers and health destinations (web/data/<id>/*.json)."""
import sys
from pathlib import Path

import pandas as pd
from shapely.geometry import mapping

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, WEB_DATA, region, write_json  # noqa: E402
from people import district_polygon, load_blocks  # noqa: E402

KINDS = {"GACH": "Hospital", "FQHC": "Community health center", "RHC": "Rural health clinic",
         "COMTYC": "Community clinic", "ESRD": "Dialysis", "ESRD/CDC": "Dialysis"}


def main(rid="ca33"):
    cfg = region(rid)
    poly = district_polygon(cfg)
    write_json(WEB_DATA / rid / "boundary.json",
               {"type": "Feature", "properties": {"name": cfg["short"]}, "geometry": mapping(poly.simplify(0.0004))})

    b = load_blocks(cfg)
    write_json(WEB_DATA / rid / "blocks.json",
               [[round(r.lat, 5), round(r.lon, 5), int(r.jobs), int(r.jobs_trans), int(r.jobs_health), int(r.in_district)]
                for r in b.itertuples()])

    x = pd.read_csv(ROOT / f"data/raw/lodes/{cfg['lodes_state']}/xwalk.csv", dtype=str,
                    usecols=["cty", "zcta", "stplcname", "blklatdd", "blklondd"])
    x = x[x.cty == cfg["state_fips"] + cfg["county_fips"][0]].copy()
    x["lat"], x["lon"] = x.blklatdd.astype(float), x.blklondd.astype(float)
    zips = {z: [round(g.lat.median(), 4), round(g.lon.median(), 4)] for z, g in x.groupby("zcta") if z != "99999"}
    x["city"] = x.stplcname.str.replace(r",\s*[A-Z]{2}$", "", regex=True).str.replace(r" (city|CDP)$", "", regex=True)
    cities = {c: [round(g.lat.median(), 4), round(g.lon.median(), 4)] for c, g in x.groupby("city") if c}
    write_json(WEB_DATA / rid / "places.json", {"zips": zips, "cities": cities})

    fi = ROOT / cfg["gtfs_dir"] / "feed_info.txt"
    feed = pd.read_csv(fi, dtype=str).iloc[0] if fi.exists() else pd.Series(dtype=str)
    # The timetable is only as current as its shortest feed: report the earliest end date over the main and extra feeds.
    ends = [str(feed.get("feed_end_date", ""))]
    for x in cfg.get("gtfs_extra", []):
        fx = ROOT / x["dir"] / "feed_info.txt"
        if fx.exists():
            ends.append(str(pd.read_csv(fx, dtype=str).iloc[0].get("feed_end_date", "")))
    ends = [e for e in ends if e.isdigit() and len(e) == 8]
    write_json(WEB_DATA / rid / "region.json", {
        "id": cfg["id"], "name": cfg["name"], "short": cfg["short"], "label": cfg["label"], "agency": cfg["agency"], "center": cfg["center"],
        "zoom": cfg["zoom"], "contact_email": feed.get("feed_contact_email", ""),
        "feed_version": feed.get("feed_version", ""), "feed_start": feed.get("feed_start_date", ""), "feed_end": min(ends) if ends else feed.get("feed_end_date", ""),
        **{k: cfg[k] for k in ("alerts_url", "track_url", "agencies", "live_links") if k in cfg}})
    if cfg.get("facilities") != "cdph_ca":
        write_json(WEB_DATA / rid / "pois.json", [])
        print(len(b), "job blocks;", len(zips), "ZIPs;", len(cities), "places; no health destination file for this state")
        return
    f = pd.read_csv(ROOT / "data/raw/geo/facilities.csv", dtype=str)
    f = f[(f.COUNTY_NAME == "SAN BERNARDINO") & (f.FAC_STATUS_TYPE_CODE == "OPEN")
          & f.FAC_TYPE_CODE.isin(KINDS) & f.LATITUDE.notna()]
    pois = [{"name": r.FACNAME.title(), "kind": KINDS[r.FAC_TYPE_CODE], "lat": round(float(r.LATITUDE), 5),
             "lon": round(float(r.LONGITUDE), 5), "city": str(r.CITY).title(),
             "in_district": bool(poly.contains(__import__("shapely.geometry", fromlist=["Point"]).Point(
                 float(r.LONGITUDE), float(r.LATITUDE))))}
            for r in f.itertuples()]
    write_json(WEB_DATA / rid / "pois.json", pois)
    print(len(b), "job blocks;", len(zips), "ZIPs;", len(cities), "places;", len(pois), "health destinations")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca33")
