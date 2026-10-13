"""Run the whole pipeline: PDFs -> tidy table -> JSON the static site reads."""
import glob
from datetime import date
import json
import re
import sys
from pathlib import Path

import pandas as pd
import shapefile
from shapely.geometry import Point, shape

sys.path.insert(0, str(Path(__file__).parent))
import geocode  # noqa: E402
from extract import extract  # noqa: E402
from metrics import band, lower_bound_hours  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed"
SITE = ROOT / "site/data"
HOME_DISTRICT = "CA-33"
NOT_ED = re.compile(r"REHABILITATION|KINDRED|SURGICAL|PSYCH|BEHAVIORAL|LONG TERM|SPECIALTY|TOTALLY KIDS", re.I)


def load_rows():
    rows = []
    for f in sorted(glob.glob(str(ROOT / "data/raw/CA/*.pdf"))):
        rows += extract(f)[1]
    df = pd.DataFrame(rows)
    # The Feb-2026 layout has no facility ID: recover it from exact name matches.
    ids = df.dropna(subset=["facility_id"]).drop_duplicates("hospital").set_index("hospital").facility_id
    df["facility_id"] = df.apply(
        lambda r: r.facility_id if isinstance(r.facility_id, str) else ids.get(r.hospital), axis=1)
    missing = df[df.facility_id.isna()]
    for name in missing.hospital.unique():  # genuinely new name: stable synthetic id
        df.loc[(df.hospital == name) & df.facility_id.isna(), "facility_id"] = "N-" + re.sub(r"\W+", "-", name.lower())[:40]
    df["lower_bound_hours"] = df.apply(
        lambda r: round(lower_bound_hours(r.offloads, r.p90_min, r.standard_min), 2), axis=1)
    df["band"] = df.pct_compliant.map(lambda v: band(None if pd.isna(v) else v))
    return df


def district_lookup():
    r = shapefile.Reader(str(ROOT / "data/raw/geo/cd119/cb_2024_us_cd119_500k"))
    polys = []
    for sr in r.iterShapeRecords():
        d = sr.record.as_dict()
        if d["STATEFP"] == "06":
            polys.append(("CA-" + d["CD119FP"], shape(sr.shape.__geo_interface__)))

    def find(lat, lon):
        p = Point(lon, lat)
        for name, g in polys:
            if g.contains(p):
                return name
        return None
    return find


def clinics(find):
    d = pd.read_csv(ROOT / "data/raw/geo/facilities.csv", dtype=str)
    c = d[(d.FAC_TYPE_CODE == "FQHC") & (d.FAC_STATUS_TYPE_CODE == "OPEN") & d.LATITUDE.notna()]
    out = []
    for _, r in c.iterrows():
        lat, lon = float(r.LATITUDE), float(r.LONGITUDE)
        out.append({"name": r.FACNAME.title(), "address": f"{r.ADDRESS.title()}, {r.CITY.title()} {r.ZIP}",
                    "phone": r.CONTACT_PHONE_NUMBER if isinstance(r.CONTACT_PHONE_NUMBER, str) else "",
                    "lat": lat, "lon": lon, "county": r.COUNTY_NAME.title(), "district": find(lat, lon)})
    return out


def places():
    """Bundled ZIP + city centroids so address lookup has an offline fallback."""
    z = pd.read_csv(ROOT / "data/raw/geo/zcta/2024_Gaz_zcta_national.txt", sep="	", dtype={"GEOID": str})
    z.columns = [c.strip() for c in z.columns]
    z = z[z.GEOID.str[:2].isin(["90", "91", "92", "93", "94", "95"]) & z.INTPTLAT.between(32.4, 42.1)
          & z.INTPTLONG.between(-124.7, -114.0)]
    zips = {r.GEOID: [round(r.INTPTLAT, 4), round(r.INTPTLONG, 4)] for r in z.itertuples()}
    d = pd.read_csv(ROOT / "data/raw/geo/facilities.csv", dtype=str)
    d = d[d.LATITUDE.notna() & d.CITY.notna()].copy()
    d["lat"], d["lon"] = d.LATITUDE.astype(float), d.LONGITUDE.astype(float)
    d = d[d.lat.between(32.4, 42.1) & d.lon.between(-124.7, -114.0)]
    d["city_clean"] = d.CITY.str.replace(r",\s*CA\.?$", "", regex=True, flags=re.I).str.strip().str.title()
    cities = {c: [round(g.lat.median(), 4), round(g.lon.median(), 4)] for c, g in d.groupby("city_clean") if c}
    return {"zips": zips, "cities": cities}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SITE.mkdir(parents=True, exist_ok=True)
    df = load_rows()
    months = sorted(df.month.unique())
    latest = months[-1]
    find = district_lookup()

    xw = geocode.match().set_index("facility_id")
    # EMSA names the Feb-2026 hospitals without IDs; crosswalk keyed by ID only.
    hospitals = {}
    for fid, g in df.groupby("facility_id"):
        g = g.sort_values("month")
        last = g.iloc[-1]
        x = xw.loc[fid] if fid in xw.index else None
        placed = x is not None and x.method != "unplaced"
        lat = float(x.lat) if placed else None
        lon = float(x.lon) if placed else None
        hospitals[fid] = {
            "id": fid, "name": last.hospital, "lemsa": last.lemsa,
            "city": (x.city.title() if placed else ""), "lat": lat, "lon": lon,
            "district": find(lat, lon) if placed else None,
            "trauma": (x.trauma if placed else ""),
            "location_source": ("CDPH facility list; match: " + x.method) if placed else "not placed",
            "months": {r.month: {
                "offloads": int(r.offloads), "p90_min": r.p90_min, "standard_min": r.standard_min,
                "over_min": r.over_min, "pct_compliant": None if pd.isna(r.pct_compliant) else r.pct_compliant,
                "hours_min": r.lower_bound_hours, "band": r.band, "source_file": r.source_file,
            } for r in g.itertuples()},
        }

    # Open general acute care hospitals inside the home district that never
    # appear in any report: shown gray, "Not listed", never green.
    cd = pd.read_csv(ROOT / "data/raw/geo/facilities.csv", dtype=str)
    cd = cd[(cd.FAC_TYPE_CODE == "GACH") & (cd.FAC_STATUS_TYPE_CODE == "OPEN")]
    used = {h["name"].upper() for h in hospitals.values()}
    placed_names = {x.cdph_name for x in xw.itertuples() if x.method != "unplaced"}
    for r in cd.itertuples():
        lat, lon = float(r.LATITUDE), float(r.LONGITUDE)
        if r.FACNAME in placed_names or NOT_ED.search(r.FACNAME):
            continue
        if find(lat, lon) == HOME_DISTRICT:
            fid = "C-" + r.FACID
            hospitals[fid] = {"id": fid, "name": r.FACNAME.title(), "lemsa": "Inland Counties EMS Agency",
                              "city": r.CITY.title(), "lat": lat, "lon": lon, "district": HOME_DISTRICT,
                              "trauma": r.TRAUMA_CTR if isinstance(r.TRAUMA_CTR, str) else "",
                              "location_source": "CDPH facility list; not in any EMSA report", "months": {}}

    hlist = sorted(hospitals.values(), key=lambda h: h["name"])
    # District totals (lower bound) per month, listed hospitals only.
    dist = {}
    for h in hlist:
        d = h["district"]
        if not d:
            continue
        e = dist.setdefault(d, {"district": d, "hospitals": [], "months": {}})
        e["hospitals"].append(h["id"])
        for m, v in h["months"].items():
            t = e["months"].setdefault(m, {"hours_min": 0.0, "listed": 0})
            t["hours_min"] = round(t["hours_min"] + v["hours_min"], 2)
            t["listed"] += 1

    meta = {
        "months": months, "latest_month": latest, "state": "CA",
        "generated_from": sorted({r for r in df.source_file}),
        "home_district": HOME_DISTRICT,
        "unplaced_hospitals": [h["name"] for h in hlist if h["lat"] is None],
        "report_page": "https://emsa.ca.gov/apot/",
        "built": date.today().isoformat(),
    }
    payload = {"hospitals": hlist, "districts": dist, "meta": meta, "clinics": clinics(find)}
    for name in ("hospitals", "districts", "meta", "clinics"):
        text = json.dumps(payload[name], separators=(",", ":"))
        (OUT / f"{name}.json").write_text(text, encoding="utf-8")
        (SITE / f"{name}.json").write_text(text, encoding="utf-8")
    pl = json.dumps(places(), separators=(",", ":"))
    (SITE / "places.json").write_text(pl, encoding="utf-8")
    tidy = df.drop(columns=["band"]).sort_values(["month", "hospital"])
    tidy.to_csv(OUT / "offloads.csv", index=False)
    tidy.to_csv(SITE / "offloads.csv", index=False)
    (SITE / "ca_districts.geojson").write_bytes((OUT / "ca_districts.geojson").read_bytes())
    print(f"{len(df)} rows, {len(months)} months ({months[0]}..{latest}), {len(hlist)} hospitals, "
          f"{sum(1 for h in hlist if h['lat'])} placed, {len(dist)} districts, {len(payload['clinics'])} clinics")


if __name__ == "__main__":
    main()
