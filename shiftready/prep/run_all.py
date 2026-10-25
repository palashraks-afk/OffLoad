"""Rebuild every data file for one or all regions:  python shiftready/prep/run_all.py [ca33 cle mia]

Order: transit -> people -> places -> safety -> risk model (needs data/raw/osm/<id>.graphml) -> site list.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
regions = sys.argv[1:] or ["ca23", "ca33", "cle", "mia", "sac", "den", "atl", "sea", "bos"]
for rid in regions:
    steps = ["transit", "people", "places", "safety"]
    if (HERE.parents[1] / f"data/raw/osm/{rid}.graphml").exists():
        steps.append("risk_model")
    for step in steps:
        print(f"--- {rid}: {step}", flush=True)
        subprocess.run([sys.executable, "-I", str(HERE / f"{step}.py"), rid], check=True)
subprocess.run([sys.executable, "-I", str(HERE / "second_region.py")], check=True)
subprocess.run([sys.executable, "-I", str(HERE / "build_site.py")], check=True)
