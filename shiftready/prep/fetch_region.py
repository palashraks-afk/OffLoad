"""Download everything one region needs (skips files that already exist).

    python shiftready/prep/fetch_region.py cle

GTFS schedule, Census LODES jobs (workplace, origin-destination, block crosswalk), Census tract shapes,
Census ACS tract data (via Census Reporter). FARS and the district boundaries are national and already local.
"""
import gzip
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, region  # noqa: E402

UA = "shiftready-student-project/1.0 (robhall1976m@gmail.com)"
LODES = "https://lehd.ces.census.gov/data/lodes/LODES8/{st}"


def get(url, dest, minsize=1000):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > minsize:
        return
    print("get", url, flush=True)
    subprocess.run(["curl", "-sL", "-m", "900", "-A", UA, "-o", str(dest), url], check=True)
    if dest.stat().st_size < minsize:
        raise RuntimeError(f"download too small: {url}")


def gunzip(src, dest):
    if dest.exists():
        return
    with gzip.open(src, "rb") as f, dest.open("wb") as o:
        shutil.copyfileobj(f, o)


def main(rid):
    cfg = region(rid)
    raw = ROOT / "data/raw"
    g = ROOT / cfg["gtfs_dir"]
    if not (g / "stop_times.txt").exists():
        get(cfg["gtfs_url"], g.with_suffix(".zip"), 100_000)
        g.mkdir(parents=True, exist_ok=True)
        zipfile.ZipFile(g.with_suffix(".zip")).extractall(g)
    st = cfg["lodes_state"]
    d = raw / "lodes" / st
    for kind, name in (("wac", f"{st}_wac_S000_JT00_2022"), ("od", f"{st}_od_main_JT00_2022")):
        get(f"{LODES.format(st=st)}/{kind}/{name}.csv.gz", d / f"{kind}.csv.gz", 100_000)
        gunzip(d / f"{kind}.csv.gz", d / f"{kind}.csv")
    get(f"{LODES.format(st=st)}/{st}_xwalk.csv.gz", d / "xwalk.csv.gz", 100_000)
    gunzip(d / "xwalk.csv.gz", d / "xwalk.csv")
    fips = cfg["state_fips"]
    shp = raw / "tract/shp" / f"cb_2023_{fips}_tract_500k.shp"
    if not shp.exists():
        z = raw / "tract" / f"{fips}.zip"
        get(f"https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_{fips}_tract_500k.zip", z, 100_000)
        zipfile.ZipFile(z).extractall(raw / "tract/shp")
    acs = raw / "tract" / f"acs_{rid}.json"
    if not acs.exists() or acs.stat().st_size < 10_000:
        get(f"https://api.censusreporter.org/1.0/data/show/latest?table_ids=B25044,B08301,B01003&geo_ids=140|05000US{fips}{cfg['county_fips'][0]}", acs, 10_000)
    print("ready:", rid)


if __name__ == "__main__":
    main(sys.argv[1])
