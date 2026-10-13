"""PDF -> tidy table for EMSA APOT exceedance reports (California).

Rows are rebuilt from character positions because pdfplumber's table and
text extractors scramble this layout. Each parsed row is checked by regex;
anything that looks like a data row but does not match is reported, not dropped.
"""
import re
import sys
import json
from pathlib import Path

import pdfplumber

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]

ROW = re.compile(
    r"^(?P<lemsa>\D+?)\s(?P<fid>\d{5})(?P<hospital>\D.*?)\s(?P<n>\d+)\s"
    r"(?P<p90>\d+:\d\d:\d\d)\s(?P<std>\d+:\d\d:\d\d)"
    r"(?:\s(?P<over>\d+:\d\d:\d\d))?(?:\s(?P<pct>\d+(?:\.\d+)?)%)?$"
)

# Layout used from the February 2026 data month: no facility ID, columns reordered.
ROW_B = re.compile(
    r"^(?P<lemsa>.+? EMS Agency)\s(?P<hospital>.+?)\s(?P<n>[\d,]+)\s(?P<pct>\d+(?:\.\d+)?)%\s"
    r"(?P<p90>\d+:\d\d:\d\d)\s(?P<std>\d+:\d\d:\d\d)\s(?P<over>\d+:\d\d:\d\d)$"
)

# Some months abbreviate the agency; map to the full name used elsewhere.
LEMSA_ALIASES = {"ICEMA": "Inland Counties EMS Agency"}


def hms_to_min(s):
    h, m, sec = (int(x) for x in s.split(":"))
    return round(h * 60 + m + sec / 60, 4)


def _lines(page):
    rows = {}
    for c in page.chars:
        rows.setdefault(round(c["top"]), []).append(c)
    for k in sorted(rows):
        s, prev = "", None
        for c in sorted(rows[k], key=lambda c: c["x0"]):
            if prev is not None and c["x0"] - prev > 5:
                s += " | "
            s += c["text"]
            prev = c["x1"]
        yield s.strip()


def data_month(pdf):
    """Month the data describes. The SUBJECT line is sometimes stale, so prefer
    'data for <Month> <Year>' / 'For <Month> <Year> data' from the summary text."""
    text = " ".join((pg.extract_text() or "") for pg in pdf.pages[:3])
    mon = "|".join(MONTHS)
    for pat in (r"[Dd]ata for (" + mon + r")\s+(\d{4})",
                r"[Ff]or (" + mon + r")\s+(\d{4})\s+data",
                r"Standards\W+(" + mon + r")\s+(\d{4})"):
        m = re.search(pat, text)
        if m:
            return f"{m.group(2)}-{MONTHS.index(m.group(1)) + 1:02d}"
    raise ValueError("could not find data month")


def extract(path):
    """Return (month, rows, unmatched) for one EMSA exceedance PDF."""
    rows, unmatched = [], []
    with pdfplumber.open(path) as pdf:
        month = data_month(pdf)
        for pg in pdf.pages:
            first = (pg.extract_text() or "")[:300]
            if "Hospitals Exceeding" not in first:
                continue
            for line in _lines(pg):
                flat = re.sub(r"\s*\|\s*", " ", line)
                m = ROW.match(flat) or ROW_B.match(flat)
                if m:
                    d = m.groupdict()
                    d.setdefault("fid", None)
                    d["n"] = d["n"].replace(",", "")
                    std = hms_to_min(d["std"])
                    p90 = hms_to_min(d["p90"])
                    rows.append({
                        "month": month,
                        "lemsa": LEMSA_ALIASES.get(d["lemsa"].strip(), d["lemsa"].strip()),
                        "facility_id": d["fid"],
                        "hospital": d["hospital"].strip(),
                        "offloads": int(d["n"]),
                        "p90_min": p90,
                        "standard_min": std,
                        "over_min": hms_to_min(d["over"]) if d["over"] else round(p90 - std, 4),
                        "over_derived": d["over"] is None,
                        "pct_compliant": float(d["pct"]) if d["pct"] else None,
                        "source_file": Path(path).name,
                    })
                elif re.search(r"\d:\d\d:\d\d", line) and re.search(r"\d{5}", line):
                    unmatched.append(line)
    return month, rows, unmatched


if __name__ == "__main__":
    for f in sys.argv[1:]:
        month, rows, bad = extract(f)
        print(f, month, len(rows), "rows;", len(bad), "unmatched")
        for b in bad[:5]:
            print("  UNMATCHED:", b)
