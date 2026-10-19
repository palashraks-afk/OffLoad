"""Major employers near the district: name, address, size class and industry from the California EDD's public
Major Employers list (ALMIS Employer Database, 2026 2nd Edition, by Data Axle), located with OpenStreetMap Nominatim.

The EDD gives a size CLASS (for example 1,000-4,999 employees), never an exact headcount, so the app shows the class.
Only employers on the valley bus network are kept (mountain resorts, Fort Irwin and the desert are not).
Writes web/data/<id>/employers.json.   python shiftready/prep/employers.py ca33
"""
import json
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, WEB_DATA, region, write_json  # noqa: E402
from people import district_polygon  # noqa: E402
from shapely.geometry import Point  # noqa: E402

RAW = ROOT / "data/raw/employers/edd_major_employers_san_bernardino_2026.json"
CACHE = ROOT / "data/raw/employers/geocode_cache.json"
SKIP = {"Bear Mountain", "Mountain High Ski Resort", "National Training Ctr Fort", "Snowline Joint Unified Sch Dst"}
KIND = [("Fulfillment", "warehouse"), ("Distribution", "warehouse"), ("Delivery", "warehouse"), ("Warehouse", "warehouse"), ("Airport", "transport"),
        ("Hospital", "health"), ("Health", "health"), ("Physicians", "health"), ("Universit", "education"), ("Univ/", "education"),
        ("School", "education"), ("Casino", "hospitality"), ("Government", "government")]
PRETTY = {"Amazon Fulfillment Ctr": "Amazon fulfillment center", "Arrowhead Regional Medical Ctr": "Arrowhead Regional Medical Center",
          "Burlington Distribution Ctr": "Burlington distribution center", "California State Univ Sn": "Cal State San Bernardino",
          "Dignity Health Cmnty Hosp-Sn": "Community Hospital of San Bernardino", "Dignity Health-St Bernardine": "St. Bernardine Medical Center",
          "Environmental Systems Research": "Esri", "Fedex Ground": "FedEx Ground", "Inland Empire Health Plan": "Inland Empire Health Plan",
          "Loma Linda Univ Health Board": "Loma Linda University Health", "Metropolitan Auto Warehouse": "Metropolitan Auto Warehouse",
          "Ontario International Airport": "Ontario International Airport", "Ontario-Montclair School Dist": "Ontario-Montclair School District",
          "Patton State Hospital": "Patton State Hospital", "Primary Care Assoc Med Group": "Primary Care Associates Medical Group", "Radial": "Radial (fulfillment)",
          "Redlands Community Hospital": "Redlands Community Hospital", "San Bernardino County Sch Supt": "San Bernardino County Superintendent of Schools",
          "Target Regional Offices": "Target, Fontana", "Transportation Department": "Caltrans District 8",
          "Yaamava' Resort-Casino At Sn": "Yaamava' Resort & Casino"}


def kind(desc, industry):
    s = desc + " " + industry
    for k, v in KIND:
        if k.lower() in s.lower():
            return v
    return "other"


def geocode(addr, cache):
    if cache.get(addr):
        return cache[addr]
    q = urllib.parse.quote(addr)
    r = subprocess.run(["curl", "-s", "-m", "30", "-A", "shiftready-student-project/1.0 (robhall1976m@gmail.com)",
                        f"https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q={q}"], capture_output=True)
    time.sleep(1.2)   # Nominatim's usage policy: at most one request a second
    try:
        j = json.loads(r.stdout.decode())
        cache[addr] = [float(j[0]["lat"]), float(j[0]["lon"])] if j else None
    except Exception:
        cache[addr] = None
    return cache[addr]


def main(rid="ca33"):
    cfg = region(rid)
    poly = district_polygon(cfg)
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    out = []
    for o in json.loads(RAW.read_text()):
        if o["name"] in SKIP:
            continue
        a = o["address"].replace(" # ", " #")
        street = a.split(",")[0]
        street = street.rsplit(" ", 2)[0] if "#" in street and False else street
        q = " ".join(a.replace("#", " ").split()[:-1]) if False else a
        # Nominatim does better without suite numbers and with the ZIP last
        import re
        q = re.sub(r"-\d{4}$", "", re.sub(r"\s*#\s*\w+", "", a).rstrip("- "))
        pt = geocode(q, cache) or geocode(q.split(",")[0].replace(o["city"], "").strip() + ", San Bernardino County, CA " + q.split()[-1], cache)
        if not pt:
            print("no match:", o["name"], q)
            continue
        out.append({"id": o["id"], "name": PRETTY.get(o["name"], o["name"]), "city": o["city"], "address": re.sub(r"-\d{4}$", "", re.sub(r"\s*#\s*\w+", "", a).rstrip("- ")),
                    "size": o["size"].replace(" Employees", ""), "industry": o["desc"], "kind": kind(o["desc"], o["name"]),
                    "lat": round(pt[0], 5), "lon": round(pt[1], 5), "in_district": bool(poly.contains(Point(pt[1], pt[0])))})
    CACHE.write_text(json.dumps(cache, indent=1))
    payload = {"source": "California EDD Major Employers, ALMIS Employer Database 2026 2nd Edition (Data Axle)",
               "source_url": "https://labormarketinfo.edd.ca.gov/majorer/countymajorer.asp?CountyCode=000071", "employers": out}
    write_json(WEB_DATA / rid / "employers.json", payload)
    for e in out:
        print(f"{e['name']:50s} {e['city']:16s} {e['size']:14s} {e['kind']:11s} {'IN ' if e['in_district'] else 'out'} {e['lat']},{e['lon']}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca33")
