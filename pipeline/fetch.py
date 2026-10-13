"""Download the public source files into data/raw. Safe to run repeatedly.

EMSA names each PDF by the month it was POSTED, and the data month is read from inside
the PDF by extract.py. Reports live at
  https://emsa.ca.gov/wp-content/uploads/sites/71/<year>/<MM>/<Month>-<year>-APOT-Exceedance-Report-to-the-Commission-on-EMS.pdf
The landing page (emsa.ca.gov/apot) is a JavaScript app, so new months are found by
probing that pattern from September 2025 up to next month. A missing month is not an
error. If EMSA changes the pattern, drop new PDFs into data/raw/CA/ by hand.

Prints a summary line the workflow reads: NEW=<count of newly downloaded PDFs>.
"""
import datetime
import sys
import urllib.error
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
UA = {"User-Agent": "OffloadWatch-fetch/1.0 (+https://github.com/palashraks-afk/OffLoad)"}


def get(url, dest, quiet_missing=False):
    """Return 'have', 'new' or 'missing'."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return "have"
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
        if not quiet_missing:
            print("skip", dest.name, e)
        return "missing"
    if dest.suffix == ".pdf" and not data.startswith(b"%PDF"):
        return "missing"  # an HTML error page, not a report
    dest.write_bytes(data)
    return "new"


def months_to_probe():
    """Every posting month from 2025-09 through next month."""
    today = datetime.date.today()
    end = today.year * 12 + today.month  # next month, as a 0-based month index
    i = 2025 * 12 + 8
    while i <= end:
        yield i // 12, i % 12 + 1
        i += 1


def unzip_once(zip_path, folder):
    if zip_path.exists() and not folder.exists():
        zipfile.ZipFile(zip_path).extractall(folder)


def main():
    new = 0
    for y, m in months_to_probe():
        dest = ROOT / f"data/raw/CA/file-{y}-{m:02d}.pdf"
        if get(EMSA.format(y=y, m=m, name=MONTHS[m - 1]), dest, quiet_missing=True) == "new":
            new += 1
            print("got ", dest.name)
    geo = ROOT / "data/raw/geo"
    get(FAC, geo / "facilities.csv")
    get(CD, geo / "cd119.zip")
    unzip_once(geo / "cd119.zip", geo / "cd119")
    get(ZCTA, geo / "zcta.zip")
    unzip_once(geo / "zcta.zip", geo / "zcta")
    print(f"NEW={new}")


if __name__ == "__main__":
    sys.exit(main())
