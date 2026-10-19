"""Pedestrian/cyclist deaths near bus stops (web/data/<id>/deaths.json, safety.json).

Counts past deaths only (NHTSA FARS 2019-2023). "Dark" = FARS light codes 2, 3, 6 (dark not lit, dark lit, dark unknown).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, WEB_DATA, region, write_json  # noqa: E402

DARK = {2, 3, 6}
RADIUS_M = 300
KM = 111_320


def deaths(cfg):
    d = pd.read_csv(ROOT / "data/processed/ped_bike_deaths_us.csv")
    c0 = cfg["center"]
    d = d[(d.STATE == cfg["fars_state"]) & d.COUNTY.isin(cfg["fars_counties"]) & d.lat.between(c0[0] - 1.5, c0[0] + 1.5) & d.lon.between(c0[1] - 1.5, c0[1] + 1.5)]
    d = d.assign(dark=d.LGT_COND.isin(DARK).astype(int), bike=(d["mode"] == "cyclist").astype(int),
                 road=d.TWAY_ID.fillna("").astype(str).str.strip())
    return d.reset_index(drop=True)


def main(rid="ca33"):
    cfg = region(rid)
    d = deaths(cfg)
    write_json(WEB_DATA / rid / "deaths.json",
               [[round(r.lat, 5), round(r.lon, 5), int(r.year), int(r.bike), int(r.dark), r.road] for r in d.itertuples()])
    stops = pd.read_json(WEB_DATA / rid / "transit.json", typ="series")["stops"]
    sl = np.array([s[1] for s in stops]); sn = np.array([s[2] for s in stops])
    cos = np.cos(np.radians(cfg["center"][0]))
    dx = (d.lon.values[None, :] - sn[:, None]) * KM * cos
    dy = (d.lat.values[None, :] - sl[:, None]) * KM
    within = np.hypot(dx, dy) <= RADIUS_M
    night = (within & (d.dark.values[None, :] == 1)).sum(axis=1)
    allc = within.sum(axis=1)
    out = {"years": "2019-2023", "radius_m": RADIUS_M, "stops": [[int(a), int(b), None] for a, b in zip(night, allc)]}
    write_json(WEB_DATA / rid / "safety.json", out)
    print(len(d), "deaths in region;", int((night > 0).sum()), "of", len(stops), "stops have a night-time death within", RADIUS_M, "m")
    print("share of deaths that were in the dark:", round(float(d.dark.mean()), 3))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca33")
