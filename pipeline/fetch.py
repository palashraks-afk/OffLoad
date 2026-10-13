"""Download the public source files into data/raw (run once, or when a new month is posted).

EMSA names each PDF by the month it was POSTED; the data month is read from inside
the PDF by extract.py. The URL pattern below has worked for 2025-09 .. 2026-03.
Newer reports may use a different path: check https://emsa.ca.gov/apot/ and drop any
new PDF into data/raw/CA/ by hand, then run `python pipeline/run.py`.
"""
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
EMSA = "https://emsa.ca.gov/wp-content/uploads/sites/71/{y}/{m:02d}/{name}-{y}-APOT-Exceedance-Report-to-the-Commission-on-EMS.pdf"
CD = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_cd119_500k.zip"
ZCTA = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip"
FAC = ("https://data.chhs.ca.gov/dataset/3b5b80e8-6b8d-4715-b3c0-2699af6e72e5/resource/"
       "f0ae5731-fef8-417f-839d-54a0ed3a126e/download/health_facility_locations.csv")


def get(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print("have", dest.name)
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "OffloadWatch-fetch/1.0"})
        dest.write_bytes(urllib.request.urlopen(req, timeout=120).read())
        print("got ", dest.name)
        return True
    except Exception as e:  # report and carry on; a missing month is not fatal
        print("skip", dest.name, e)
        return False


def main():
    for y, m in [(2025, mm) for mm in range(9, 13)] + [(2026, mm) for mm in range(1, 4)]:
        get(EMSA.format(y=y, m=m, name=MONTHS[m - 1]), ROOT / f"data/raw/CA/file-{y}-{m:02d}.pdf")
    geo = ROOT / "data/raw/geo"
    get(FAC, geo / "facilities.csv")
    if get(CD, geo / "cd119.zip"):
        zipfile.ZipFile(geo / "cd119.zip").extractall(geo / "cd119")
    if get(ZCTA, geo / "zcta.zip"):
        zipfile.ZipFile(geo / "zcta.zip").extractall(geo / "zcta")


if __name__ == "__main__":
    sys.exit(main())
