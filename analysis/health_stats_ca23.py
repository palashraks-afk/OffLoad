"""Health/injury statistics for pedestrian+cyclist deaths inside CA-23, the part in San Bernardino County (FARS 2019-2023).
Processes one year at a time and deletes the big zip afterwards."""
import os, sys, zipfile, urllib.request, io
import numpy as np, pandas as pd
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(HERE, "fars_tmp"); os.makedirs(TMP, exist_ok=True)

def read(z, base):
    n = [x for x in z.namelist() if x.lower().endswith("/" + base + ".csv") or x.lower() == base + ".csv"][0]
    d = pd.read_csv(z.open(n), encoding="latin1", low_memory=False)
    d.columns = [c.replace("\ufeff", "").replace("ï»¿", "").strip() for c in d.columns]
    return d

# CA-33 polygon
import shapefile
from shapely.geometry import shape, Point
r = shapefile.Reader("C:/Users/Rahul/Projects/OffLoad/data/raw/geo/cd119/cb_2024_us_cd119_500k")
poly = [shape(sr.shape.__geo_interface__) for sr in r.iterShapeRecords()
        if sr.record.as_dict()["STATEFP"] == "06" and sr.record.as_dict()["CD119FP"] == "23"][0]

rows = []
for y in range(2019, 2024):
    path = os.path.join(TMP, f"F{y}.zip")
    url = f"https://static.nhtsa.gov/nhtsa/downloads/FARS/{y}/National/FARS{y}NationalCSV.zip"
    urllib.request.urlretrieve(url, path)
    z = zipfile.ZipFile(path)
    a = read(z, "accident"); p = read(z, "person"); v = read(z, "vehicle")
    a = a[(a.STATE == 6) & (a.COUNTY == 71)]   # the part of the district inside San Bernardino County, which is the area the app covers
    acols = [c for c in ["ST_CASE", "LATITUDE", "LONGITUD", "MONTH", "DAY", "HOUR", "MINUTE", "NOT_HOUR", "NOT_MIN", "ARR_HOUR", "ARR_MIN",
                         "HOSP_HR", "HOSP_MN", "LGT_CONDNAME", "CITYNAME", "TWAY_ID"] if c in a.columns]
    a = a[acols]
    p = p[(p.STATE == 6) & (p.PER_TYP.isin([5, 6])) & (p.INJ_SEV == 4)]
    pcols = [c for c in ["ST_CASE", "PER_TYP", "AGE", "SEX", "DOA", "DEATH_DA", "DEATH_MO", "DEATH_HR", "DEATH_MN", "ALC_RES"] if c in p.columns]
    p = p[pcols]
    v = v[v.STATE == 6]
    vagg = v.groupby("ST_CASE").agg(vspd_lim=("VSPD_LIM", "max"), trav_sp=("TRAV_SP", "max"), dr_drink=("DR_DRINK", "max")).reset_index()
    m = p.merge(a, on="ST_CASE").merge(vagg, on="ST_CASE", how="left")
    m["YEAR"] = y
    rows.append(m)
    z.close(); os.remove(path)
M = pd.concat(rows, ignore_index=True)
M = M[(M.LATITUDE < 90) & (M.LONGITUD > -200)]
M = M[[poly.contains(Point(lo, la)) for la, lo in zip(M.LATITUDE, M.LONGITUD)]].copy()
n = len(M); print("deaths in CA-23 (SB County part):", n)

# --- years of life lost (CDC PYLL before 75) ---
age = M.AGE.where(M.AGE < 998)
M["pyll75"] = (75 - age).clip(lower=0)
print("age known:", int(age.notna().sum()), " median age:", float(age.median()), " <=14:", int((age <= 14).sum()), " >=65:", int((age >= 65).sum()), " 25-64:", int(age.between(25, 64).sum()))
print("PYLL75 total:", float(M.pyll75.sum()), " mean per death:", round(float(M.pyll75.mean()), 1))
print("male share:", round(float((M.SEX == 1).mean() * 100), 1))

# --- where/when they died: DOA 7=died at scene, 8=died en route, 9=DOA? (codes per FARS manual) ---
print("DOA codes:", M.DOA.value_counts(dropna=False).to_dict())

# --- time from crash to death ---
def mins(h, mi): return h * 60 + mi
ok = (M.HOUR < 24) & (M.MINUTE < 60)
M["crash_min"] = np.where(ok, mins(M.HOUR, M.MINUTE), np.nan)
okd = (M.DEATH_HR < 24) & (M.DEATH_MN < 60) & (M.DEATH_DA < 32) & (M.DEATH_MO < 13)
dd = np.where(okd, (M.DEATH_MO != M.MONTH) * 0 + (M.DEATH_DA - M.DAY), np.nan)
M["death_min"] = np.where(okd, dd * 1440 + mins(M.DEATH_HR, M.DEATH_MN), np.nan)
M["to_death"] = M.death_min - M.crash_min
good = M.to_death.between(0, 60 * 24 * 30)
print("time-to-death known for", int(good.sum()), "of", n)
t = M.to_death[good]
print("died within 30 min: %.0f%%  within 60 min: %.0f%%  within 24h: %.0f%%  later: %.0f%%  median min: %.0f" % (
    (t <= 30).mean() * 100, (t <= 60).mean() * 100, (t <= 1440).mean() * 100, (t > 1440).mean() * 100, t.median()))

# --- EMS response (notification -> arrival at scene) and scene -> hospital ---
def valid(h, mi, hmax=24): return (h < hmax) & (mi < 60)
e_ok = valid(M.NOT_HOUR, M.NOT_MIN) & valid(M.ARR_HOUR, M.ARR_MIN)
resp = (mins(M.ARR_HOUR, M.ARR_MIN) - mins(M.NOT_HOUR, M.NOT_MIN)) % 1440
print("EMS response known for", int(e_ok.sum()), "of", n, " median %.0f min, mean %.1f, share over 8 min: %.0f%%" % (
    resp[e_ok].median(), resp[e_ok].mean(), (resp[e_ok] > 8).mean() * 100))
h_ok = valid(M.ARR_HOUR, M.ARR_MIN) & (M.HOSP_HR < 24) & (M.HOSP_MN < 60)
hos = (mins(M.HOSP_HR, M.HOSP_MN) - mins(M.ARR_HOUR, M.ARR_MIN)) % 1440
print("scene->hospital known for", int(h_ok.sum()), " median %.0f min" % hos[h_ok].median())

# --- speed (injury biomechanics) ---
sl = M.vspd_lim.where(M.vspd_lim < 98)
print("posted speed limit known for", int(sl.notna().sum()), " median:", float(sl.median()), " share >=40 mph: %.0f%%  >=45: %.0f%%  <=30: %.0f%%" % (
    (sl >= 40).sum() / sl.notna().sum() * 100, (sl >= 45).sum() / sl.notna().sum() * 100, (sl <= 30).sum() / sl.notna().sum() * 100))
tr = M.trav_sp.where(M.trav_sp < 997)
print("travel speed known for", int(tr.notna().sum()), " median:", float(tr.median()))
print("posted limit distribution:", sl.value_counts().sort_index().to_dict())

# --- alcohol ---
bac = M.ALC_RES.where(M.ALC_RES < 95)
print("pedestrian BAC tested:", int(bac.notna().sum()), " BAC>=.08: %d (%.0f%% of tested)" % ((bac >= 8).sum(), (bac >= 8).sum() / max(1, bac.notna().sum()) * 100))
print("driver drinking indicated (DR_DRINK=1):", int((M.dr_drink == 1).sum()), "of", n)

# --- trauma centres (CDPH facility list, straight-line miles) ---
fac = pd.read_csv("C:/Users/Rahul/Projects/OffLoad/data/raw/geo/facilities.csv", dtype=str)
tc = fac[(fac.FAC_TYPE_CODE == "GACH") & fac.TRAUMA_CTR.notna() & (fac.FAC_STATUS_TYPE_CODE == "OPEN")][["FACNAME", "CITY", "TRAUMA_CTR", "LATITUDE", "LONGITUDE"]].copy()
tc["lat"] = tc.LATITUDE.astype(float); tc["lon"] = tc.LONGITUDE.astype(float)
print("trauma centres nearby:", tc[(tc.lat.between(33.6, 34.5)) & (tc.lon.between(-118, -116.8))][["FACNAME", "TRAUMA_CTR"]].to_string(index=False))
def miles(a, b, c, d):
    R = 3958.8; r = np.pi / 180
    x = np.sin((c - a) * r / 2) ** 2 + np.cos(a * r) * np.cos(c * r) * np.sin((d - b) * r / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(x))
d = np.array([min(miles(la, lo, t.lat, t.lon) for t in tc.itertuples()) for la, lo in zip(M.LATITUDE, M.LONGITUD)])
print("straight-line miles to nearest trauma centre: median %.1f, share >5 mi: %.0f%%, >8 mi: %.0f%%" % (np.median(d), (d > 5).mean() * 100, (d > 8).mean() * 100))
M.drop(columns=["crash_min", "death_min"]).to_csv(os.path.join(HERE, "ca23_health_deaths.csv"), index=False)
os.rmdir(TMP) if not os.listdir(TMP) else None
