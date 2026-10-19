"""Load FARS 2019-2023, keep pedestrian/cyclist deaths in California, tag CA-33.

    .venv/bin/python analysis/load_fars.py

Writes data/processed/ped_bike_deaths_ca.csv (one row per person killed).
FARS quirks handled here: folder layout differs by year, files are latin-1,
some first columns carry a byte-order mark, COUNTY is in both tables.
"""
from pathlib import Path

import pandas as pd
import shapefile
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw"
YEARS = range(2019, 2024)
PED, BIKE = 5, 6      # PER_TYP codes
FATAL = 4             # INJ_SEV code


def read(year, name):
    hits = [p for p in (RAW / "fars" / str(year)).rglob("*") if p.name.lower() == name.lower()]
    df = pd.read_csv(hits[0], encoding="latin-1", low_memory=False)
    df.columns = [c.lstrip("﻿ï»¿").strip().upper() for c in df.columns]
    return df


def load():
    out = []
    for y in YEARS:
        acc = read(y, "accident.csv")
        per = read(y, "person.csv")
        acc = acc[["ST_CASE", "STATE", "COUNTY", "CITYNAME", "LATITUDE", "LONGITUD",
                   "HOUR", "LGT_COND", "FUNC_SYS", "TWAY_ID"]]
        per = per[per.PER_TYP.isin([PED, BIKE]) & (per.INJ_SEV == FATAL)]
        per = per[["ST_CASE", "STATE", "PER_TYP"]]
        m = per.merge(acc, on=["ST_CASE", "STATE"], how="left")  # COUNTY only comes from accident
        m["year"] = y
        out.append(m)
    df = pd.concat(out, ignore_index=True)
    df["mode"] = df.PER_TYP.map({PED: "pedestrian", BIKE: "cyclist"})
    return df.rename(columns={"LATITUDE": "lat", "LONGITUD": "lon"})


def tag_district(df, district="33"):
    r = shapefile.Reader(str(RAW / "cd/shp/cb_2024_us_cd119_500k"))
    poly = next(shape(sr.shape.__geo_interface__) for sr in r.iterShapeRecords()
                if sr.record.as_dict()["STATEFP"] == "06" and sr.record.as_dict()["CD119FP"] == district)
    ok = (df.STATE == 6) & df.lat.between(32, 43) & df.lon.between(-125, -114)  # FARS uses 77.7777 etc. for unknown
    df["in_ca33"] = False
    df.loc[ok, "in_ca33"] = [poly.contains(Point(x, y)) for x, y in zip(df.lon[ok], df.lat[ok])]
    return df


if __name__ == "__main__":
    df = tag_district(load())
    (ROOT / "data/processed").mkdir(parents=True, exist_ok=True)
    df.to_csv(ROOT / "data/processed/ped_bike_deaths_us.csv", index=False)
    df[df.STATE == 6].to_csv(ROOT / "data/processed/ped_bike_deaths_ca.csv", index=False)
    print("US ped+bike deaths:", len(df), "| California:", (df.STATE == 6).sum())
    df = df[df.STATE == 6]
    print("California ped+bike deaths per year:", df.groupby("year").size().to_dict(), "total", len(df))
    sb = df[df.COUNTY == 71]
    print("San Bernardino County:", len(sb), sb.groupby("year").size().to_dict())
    c = df[df.in_ca33]
    print("Inside CA-33:", len(c), c["mode"].value_counts().to_dict(), c.groupby("year").size().to_dict())
    print("Missing coordinates:", int((~df.lat.between(32, 43)).sum()))
    print(c.CITYNAME.value_counts().head(8).to_string())
