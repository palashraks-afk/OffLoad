"""One command: rebuild every data file the site reads.

    python pipeline/run.py

Order matters: build -> forecast -> bundle.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent

for step in ("build.py", "forecast.py", "bundle.py"):
    print(f"--- {step}")
    subprocess.run([sys.executable, "-I", str(HERE / step)], check=True)
