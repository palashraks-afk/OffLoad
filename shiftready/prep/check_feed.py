"""Weekly check: has the agency published a newer timetable than the one the app uses?
Reads each region's gtfs_url and feed dates from shiftready/regions/*.json and web/data/*/region.json.
Prints a report and exits 1 when a region's published feed differs or the app's timetable is ending soon,
so the scheduled workflow can open an issue. It never changes the published data: a person rebuilds
with prep/run_all.py and reviews the result."""
import csv, datetime, glob, io, json, os, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web", "data")
UA = {"User-Agent": "ShiftReady-feed-check/1.0 (Congressional App Challenge student project)"}


def feed_info(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    if "feed_info.txt" not in z.namelist():
        return None
    row = next(csv.DictReader(io.TextIOWrapper(z.open("feed_info.txt"), encoding="utf-8-sig")))
    return {"version": row.get("feed_version", ""), "start": row.get("feed_start_date", ""), "end": row.get("feed_end_date", "")}


def main():
    problems = []
    today = datetime.date.today()
    for cfgp in sorted(glob.glob(os.path.join(HERE, "..", "regions", "*.json"))):
        cfg = json.load(open(cfgp, encoding="utf-8"))
        rid = cfg.get("id")
        rp = os.path.join(WEB, rid, "region.json")
        if not os.path.exists(rp):
            continue
        ours = json.load(open(rp, encoding="utf-8"))
        end = ours.get("feed_end", "")
        if end:
            left = (datetime.datetime.strptime(end, "%Y%m%d").date() - today).days
            print(f"{rid}: app timetable ends {end} ({left} days)")
            if left <= 21:
                problems.append(f"{rid}: the app's timetable ends {end} ({left} days left)")
        url = cfg.get("gtfs_url")
        if not url:
            continue
        try:
            live = feed_info(url)
        except Exception as e:  # network trouble is reported, not hidden
            problems.append(f"{rid}: could not read {url}: {e}")
            continue
        print(f"{rid}: published feed {live}")
        if live and live["version"] and live["version"] != ours.get("feed_version"):
            problems.append(f"{rid}: new timetable published (version {live['version']}, {live['start']} to {live['end']}); the app has {ours.get('feed_version')}")
    for p in problems:
        print("PROBLEM:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
