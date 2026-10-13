"""Match EMSA hospital names to the CDPH facility listing (coordinates, county).

Matching is by normalised name similarity, then reviewed by hand: every
non-exact match is written to data/config/hospital_crosswalk.csv with its score
so a person can check it. Manual overrides in OVERRIDES always win.
"""
import difflib
import glob
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from extract import extract  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

# EMSA facility_id -> CDPH FACNAME (exact), settled by hand after review.
OVERRIDES = {
    "20525": "WASHINGTON HOSPITAL",
    "20461": "PROVIDENCE ST. MARY MEDICAL CENTER",
    "20386": "PRISCILLA CHAN AND MARK ZUCKERBERG SAN FRANCISCO GENERAL HOSPITAL AND TRAUMA CENTER",
    "20361": "PROVIDENCE CEDARS-SINAI TARZANA MEDICAL CENTER",
    "20150": "GOOD SAMARITAN HOSPITAL",
    "20112": "SUTTER EDEN MEDICAL CENTER",
    "20045": "CALIFORNIA HOSPITAL MEDICAL CENTER - LOS ANGELES",
    "20283": "MERCY MEDICAL CENTER",
    "20162": "HEMET GLOBAL MEDICAL CENTER",
    "20153": "GROSSMONT HOSPITAL",
    "20278": "MENIFEE GLOBAL MEDICAL CENTER",
    "20515": "STANFORD HEALTH CARE TRI-VALLEY",
    "20497": "SHARP TRI-CITY MEDICAL CENTER",
    "20460": "ST. MARY MEDICAL CENTER",
}

# Single-county agencies only; multi-county agencies search the whole state.
LEMSA_COUNTY = {
    "Alameda": "ALAMEDA", "Contra Costa": "CONTRA COSTA", "El Dorado": "EL DORADO",
    "Imperial": "IMPERIAL", "Kern": "KERN", "Los Angeles": "LOS ANGELES",
    "Marin": "MARIN", "Merced": "MERCED", "Monterey": "MONTEREY", "Napa": "NAPA",
    "Orange": "ORANGE", "Riverside": "RIVERSIDE", "Sacramento": "SACRAMENTO",
    "San Benito": "SAN BENITO", "San Diego": "SAN DIEGO", "San Francisco": "SAN FRANCISCO",
    "San Joaquin": "SAN JOAQUIN", "San Luis Obispo": "SAN LUIS OBISPO",
    "San Mateo": "SAN MATEO", "Santa Barbara": "SANTA BARBARA", "Santa Clara": "SANTA CLARA",
    "Santa Cruz": "SANTA CRUZ", "Solano": "SOLANO", "Stanislaus": "STANISLAUS",
    "Tuolumne": "TUOLUMNE", "Ventura": "VENTURA", "Yolo": "YOLO",
}
MULTI_COUNTY = {
    "Inland Counties": ["SAN BERNARDINO", "INYO", "MONO"],
    "Central California": ["FRESNO", "KINGS", "MADERA", "TULARE"],
}
ACCEPT = 0.9

STOP = {"hospital", "medical", "center", "centre", "the", "of", "and", "health",
        "campus", "regional", "community", "memorial", "inc", "llc", "-", "&"}


def norm(s):
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = s.replace("saint", "st").replace("univ ", "university ")
    return " ".join(s.split())


def load_emsa():
    rows = []
    for f in sorted(glob.glob(str(ROOT / "data/raw/CA/*.pdf"))):
        rows += extract(f)[1]
    df = pd.DataFrame(rows)
    return df.drop_duplicates("facility_id")[["facility_id", "hospital", "lemsa"]]


def load_cdph():
    d = pd.read_csv(ROOT / "data/raw/geo/facilities.csv", dtype=str)
    g = d[(d.FAC_TYPE_CODE == "GACH") & (d.FAC_STATUS_TYPE_CODE == "OPEN")].copy()
    g["key"] = g.FACNAME.map(norm)
    return g


def tokens(s):
    t = set(norm(s).split()) - STOP - {"kaiser", "permanente", "foundation", "campus"}
    return t


def similarity(a, b):
    seq = difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()
    ta, tb = tokens(a), tokens(b)
    tok = len(ta & tb) / max(1, len(ta | tb))
    return max(seq, tok)


def match():
    emsa, g = load_emsa(), load_cdph()
    out = []
    for _, r in emsa.iterrows():
        county = next((v for k, v in LEMSA_COUNTY.items() if r.lemsa.startswith(k)), None)
        multi = next((v for k, v in MULTI_COUNTY.items() if r.lemsa.startswith(k)), None)
        pool = g[g.COUNTY_NAME == county] if county else g[g.COUNTY_NAME.isin(multi)] if multi else g
        if r.facility_id in OVERRIDES:
            cand = pool[pool.FACNAME == OVERRIDES[r.facility_id]]
            row = (cand if len(cand) else g[g.FACNAME == OVERRIDES[r.facility_id]]).iloc[0]
            score, how = 1.0, "manual"
        else:
            sc = pool.FACNAME.map(lambda n: similarity(r.hospital, n))
            row, score = pool.loc[sc.idxmax()], float(sc.max())
            how = "auto" if score >= ACCEPT else "unplaced"
        placed = how != "unplaced"
        out.append({
            "facility_id": r.facility_id, "emsa_name": r.hospital, "lemsa": r.lemsa,
            "cdph_name": row.FACNAME if placed else "", "city": row.CITY if placed else "",
            "county": row.COUNTY_NAME if placed else "",
            "lat": float(row.LATITUDE) if placed else None,
            "lon": float(row.LONGITUDE) if placed else None,
            "trauma": (row.TRAUMA_CTR if isinstance(row.TRAUMA_CTR, str) else "") if placed else "",
            "best_guess": row.FACNAME, "score": round(score, 3), "method": how,
        })
    return pd.DataFrame(out)


if __name__ == "__main__":
    m = match()
    m.to_csv(ROOT / "data/config/hospital_crosswalk.csv", index=False)
    low = m[m.method == "unplaced"].sort_values("score")
    print(len(m), "hospitals;", len(low), "unplaced")
    pd.set_option("display.width", 250, "display.max_colwidth", 60)
    print(low[["facility_id", "emsa_name", "best_guess", "score"]].to_string(index=False))
