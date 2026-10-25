"""Where are people on foot most at risk? A model tested on LATER years against simple baselines.

Unit: road segment (OpenStreetMap, surface streets; freeways excluded).
Label: a pedestrian/cyclist death snapped to the segment (FARS, 2019-2023).
Split: train on deaths from 2019-2021, test on deaths from 2022-2023. Never a random split.
Features are road and place features only (no death counts), so the model is not just the baseline.
Baselines rank segments by past deaths on the same road, in the same 400 m cell, or on the same segment.
Metric: share of later deaths that land on the top q% of road length (q = 5, 10, 20), averaged over random
tie-breaks, plus average precision. A bootstrap over test deaths gives an interval for the 10% capture.
Writes web/data/<id>/risk_report.json, corridors.json and fills the risk column of safety.json.
"""
import ast
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import osmnx as ox
import pandas as pd
from scipy.spatial import cKDTree
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, WEB_DATA, region, write_json  # noqa: E402
from safety import deaths as load_deaths  # noqa: E402

TRAIN, TEST = (2019, 2021), (2022, 2023)
CLASSES = ["trunk", "primary", "secondary", "tertiary", "unclassified", "residential"]
RNG = np.random.default_rng(7)


def first(v):
    if isinstance(v, str) and v.startswith("["):
        try:
            return ast.literal_eval(v)[0]
        except Exception:
            return v
    if isinstance(v, (list, tuple)):
        return v[0]
    return v


def hw_class(v):
    v = str(first(v))
    if v.startswith("motorway"):
        return "motorway"
    v = v.replace("_link", "")
    return v if v in CLASSES else "residential"


def to_int(v, default=np.nan):
    v = first(v)
    try:
        return float(str(v).split(";")[0].split()[0])
    except Exception:
        return default


def load_edges(rid, UTM):
    G = ox.load_graphml(ROOT / f"data/raw/osm/{rid}.graphml")
    nodes, edges = ox.graph_to_gdfs(G)
    nodes, edges = nodes.to_crs(UTM), edges.to_crs(UTM).reset_index()
    edges["cls"] = edges.highway.map(hw_class)
    edges["lanes_n"] = edges.get("lanes", pd.Series(index=edges.index, dtype=object)).map(to_int)
    edges["speed"] = edges.get("maxspeed", pd.Series(index=edges.index, dtype=object)).map(to_int)
    edges["name1"] = edges.get("name", pd.Series(index=edges.index, dtype=object)).map(lambda v: str(first(v)) if isinstance(first(v), str) else "")
    edges["len"] = edges.geometry.length
    edges["oneway_f"] = edges.get("oneway", False).astype(str).str.lower().isin(["true", "1", "yes"]).astype(int)
    edges["bridge_f"] = edges.get("bridge", pd.Series(index=edges.index, dtype=object)).notna().astype(int)
    sc = pd.Series(dict(G.degree())).astype(float)   # undirected-style degree: roads meeting at the node
    hw = nodes.get("highway", pd.Series(index=nodes.index, dtype=object)).astype(str)
    edges["deg_u"] = edges.u.map(sc).fillna(2).values
    edges["deg_v"] = edges.v.map(sc).fillna(2).values
    sig = hw.str.contains("traffic_signals")
    crs = hw.str.contains("crossing")
    edges["signal"] = (edges.u.map(sig).fillna(False) | edges.v.map(sig).fillna(False)).astype(int)
    edges["crossing"] = (edges.u.map(crs).fillna(False) | edges.v.map(crs).fillna(False)).astype(int)
    return edges, nodes


def add_context(edges, nodes, rid, UTM):
    cfg = region(rid)
    mid = np.c_[edges.geometry.interpolate(0.5, normalized=True).x, edges.geometry.interpolate(0.5, normalized=True).y]
    edges["mx"], edges["my"] = mid[:, 0], mid[:, 1]
    # bus stops
    st = json.loads((WEB_DATA / rid / "transit.json").read_text())["stops"]
    sp = gpd.GeoSeries(gpd.points_from_xy([s[2] for s in st], [s[1] for s in st]), crs=4326).to_crs(UTM)
    sxy = np.c_[sp.x, sp.y]
    tree = cKDTree(sxy)
    edges["stops150"] = tree.query_ball_point(mid, 150, return_length=True)
    edges["stops400"] = tree.query_ball_point(mid, 400, return_length=True)
    edges["dist_stop"] = tree.query(mid)[0]
    # jobs and people nearby (exposure proxies)
    bl = json.loads((WEB_DATA / rid / "blocks.json").read_text())
    bp = gpd.GeoSeries(gpd.points_from_xy([b[1] for b in bl], [b[0] for b in bl]), crs=4326).to_crs(UTM)
    bt = cKDTree(np.c_[bp.x, bp.y])
    jobs, trans = np.array([b[2] for b in bl], float), np.array([b[3] for b in bl], float)
    near = bt.query_ball_point(mid, 400)
    edges["jobs400"] = [jobs[i].sum() if len(i) else 0 for i in near]
    edges["trans400"] = [trans[i].sum() if len(i) else 0 for i in near]
    tr = json.loads((WEB_DATA / rid / "tracts.json").read_text())
    tp = gpd.GeoSeries(gpd.points_from_xy([x["lon"] for x in tr], [x["lat"] for x in tr]), crs=4326).to_crs(UTM)
    tt = cKDTree(np.c_[tp.x, tp.y])
    pop = np.array([x["pop"] for x in tr], float)
    near = tt.query_ball_point(mid, 1500)
    edges["pop1500"] = [pop[i].sum() if len(i) else 0 for i in near]
    nt = cKDTree(np.c_[nodes.geometry.x, nodes.geometry.y])
    edges["nodes300"] = nt.query_ball_point(mid, 300, return_length=True)
    # fill gaps in lanes and speed with the class median
    for c in ["lanes_n", "speed"]:
        med = edges.groupby("cls")[c].transform("median")
        edges[c] = edges[c].fillna(med).fillna(edges[c].median()).fillna(2 if c == "lanes_n" else 25)
    return edges


FEATURES = ["lanes_n", "speed", "len_log", "oneway_f", "bridge_f", "deg_u", "deg_v", "signal", "crossing",
            "stops150", "stops400", "dist_stop_log", "jobs_log", "trans_log", "pop_log", "nodes300"] + ["c_" + c for c in CLASSES]
PLAIN = {"lanes_n": "number of lanes", "speed": "speed limit", "len_log": "segment length", "oneway_f": "one-way",
         "bridge_f": "bridge", "deg_u": "intersection size (start)", "deg_v": "intersection size (end)", "signal": "traffic signal",
         "crossing": "marked crossing", "stops150": "bus stops within 150 m", "stops400": "bus stops within 400 m",
         "dist_stop_log": "distance to a bus stop", "jobs_log": "jobs nearby", "trans_log": "warehouse and transport jobs nearby",
         "pop_log": "people living nearby", "nodes300": "intersections within 300 m"}
PLAIN.update({"c_" + c: "road type: " + c for c in CLASSES})


def design(edges):
    X = pd.DataFrame(index=edges.index)
    X["lanes_n"], X["speed"] = edges.lanes_n, edges.speed
    X["len_log"] = np.log1p(edges.len)
    for c in ["oneway_f", "bridge_f", "deg_u", "deg_v", "signal", "crossing", "stops150", "stops400", "nodes300"]:
        X[c] = edges[c]
    X["dist_stop_log"] = np.log1p(edges.dist_stop)
    X["jobs_log"], X["trans_log"], X["pop_log"] = np.log1p(edges.jobs400), np.log1p(edges.trans400), np.log1p(edges.pop1500)
    for c in CLASSES:
        X["c_" + c] = (edges.cls == c).astype(int)
    return X[FEATURES].astype(float)


def snap(edges, d, UTM, max_m=60):
    g = gpd.GeoDataFrame(d, geometry=gpd.points_from_xy(d.lon, d.lat), crs=4326).to_crs(UTM)
    j = gpd.sjoin_nearest(g, edges[["geometry"]].reset_index().rename(columns={"index": "eid"}), max_distance=max_m, distance_col="snap_m")
    j = j[~j.index.duplicated(keep="first")]
    return j


def capture(score, length, test, qs=(0.05, 0.10, 0.20), shuffles=20):
    tot, out = length.sum(), {q: 0.0 for q in qs}
    n = test.sum()
    for _ in range(shuffles):
        order = np.lexsort((RNG.random(len(score)), -score))
        cum = np.cumsum(length[order])
        for q in qs:
            k = np.searchsorted(cum, q * tot) + 1
            out[q] += test[order[:k]].sum() / n
    return {q: v / shuffles for q, v in out.items()}


def boot_ci(score, length, test_edges, n_edges, q=0.10, B=300):
    """95% interval for capture at q, resampling the test deaths."""
    order = np.lexsort((RNG.random(n_edges), -score))
    cum = np.cumsum(length[order])
    top = np.zeros(n_edges, bool)
    top[order[: np.searchsorted(cum, q * length.sum()) + 1]] = True
    hit = top[test_edges]
    res = [hit[RNG.integers(0, len(hit), len(hit))].mean() for _ in range(B)]
    return [float(np.percentile(res, 2.5)), float(np.percentile(res, 97.5))], hit


def pctrank(x):
    return pd.Series(x).rank(pct=True).values


def evaluate(edges, X, dsnap, label_test_filter, tag):
    surface = (edges.cls != "motorway").values
    length = edges.len.values
    ids = np.arange(len(edges))
    tr = dsnap[(dsnap.year >= TRAIN[0]) & (dsnap.year <= TRAIN[1])]
    te = dsnap[(dsnap.year >= TEST[0]) & (dsnap.year <= TEST[1])]
    te = te[label_test_filter(te)]
    te_e = te.eid.values
    tr_cnt = np.bincount(tr.eid.values, minlength=len(edges)).astype(float)
    te_cnt = np.bincount(te_e, minlength=len(edges)).astype(float)

    # baselines
    name = edges.name1.values
    corr = pd.Series(tr_cnt).groupby(name).transform("sum").values
    corr = np.where(name == "", tr_cnt, corr) + 1e-6 * tr_cnt
    cell = pd.Series(tr_cnt).groupby([np.floor(edges.mx.values / 400), np.floor(edges.my.values / 400)]).transform("sum").values + 1e-6 * tr_cnt
    seg = tr_cnt

    # model, chosen by cross-validation on the TRAIN labels only
    y = (tr_cnt > 0).astype(int)
    m = surface
    cands = {
        "logistic": make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight="balanced", max_iter=2000)),
        "boosted trees": HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=250, l2_regularization=1.0, random_state=0),
    }
    cv = {}
    for k, mod in cands.items():
        p = cross_val_predict(mod, X[m], y[m], cv=StratifiedKFold(5, shuffle=True, random_state=1), method="predict_proba")[:, 1]
        cv[k] = average_precision_score(y[m], p)
    best = max(cv, key=cv.get)
    mod = cands[best].fit(X[m], y[m])
    score = np.full(len(edges), -1.0)
    score[m] = mod.predict_proba(X[m])[:, 1]
    hybrid = pctrank(score) + pctrank(corr)

    methods = [("Past deaths on the same road", corr), ("Past deaths in the same 400 m cell", cell), ("Past deaths on the same segment", seg),
               ("Road-features model (" + best + ")", score), ("Model + past deaths on the same road", hybrid)]
    rows, cis = [], {}
    for name_, sc in methods:
        sc = np.where(m, sc, -9e9)
        cap = capture(sc[m], length[m], te_cnt[m])
        ci, _ = boot_ci(sc[m], length[m], np.searchsorted(ids[m], te_e[m[te_e]]), int(m.sum()))
        rows.append({"name": name_, "cap5": cap[0.05], "cap10": cap[0.10], "cap20": cap[0.20],
                     "ap": float(average_precision_score((te_cnt[m] > 0).astype(int), sc[m])), "ci10": ci})
    # paired bootstrap over test deaths: is the model's capture different from the best past-deaths baseline?
    def top_mask(sc, q):
        scm = np.where(m, sc, -9e9)[m]
        order = np.lexsort((np.random.default_rng(3).random(int(m.sum())), -scm))
        cum = np.cumsum(length[m][order])
        mk = np.zeros(int(m.sum()), bool)
        mk[order[: np.searchsorted(cum, q * length[m].sum()) + 1]] = True
        return mk
    pos = np.searchsorted(ids[m], te_e[m[te_e]])
    base_i = max(range(3), key=lambda i: rows[i]["cap10"])
    comps = []
    for name_i, label in ((3, "model"), (4, "hybrid")):
        for q in (0.10, 0.20):
            a = top_mask(methods[name_i][1], q)[pos]
            b = top_mask(methods[base_i][1], q)[pos]
            diffs = [a[ix].mean() - b[ix].mean() for ix in (RNG.integers(0, len(a), len(a)) for _ in range(2000))]
            comps.append({"who": label, "q": q, "diff": float(a.mean() - b.mean()), "ci": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))],
                          "baseline": rows[base_i]["name"]})
    rows.append({"name": "Random (expected)", "cap5": 0.05, "cap10": 0.10, "cap20": 0.20, "ap": float((te_cnt[m] > 0).mean()), "ci10": [0.1, 0.1]})
    return rows, mod, best, cv, int(m[te_e].sum()), comps


def main(rid="ca33"):
    cfg = region(rid)
    UTM = cfg["utm"]
    edges, nodes = load_edges(rid, UTM)
    edges = add_context(edges, nodes, rid, UTM)
    X = design(edges)
    d = load_deaths(cfg)
    dsn = snap(edges, d, UTM)
    dsn = dsn.assign(eid=dsn.eid.astype(int))
    # deaths on freeways are a separate problem for people walking: leave them out of the label
    dsn = dsn[edges.cls.values[dsn.eid.values] != "motorway"]
    print(len(edges), "road segments;", len(d), "deaths;", len(dsn), "snapped to surface streets within 60 m")

    rows, mod, best, cv, n_te, comps = evaluate(edges, X, dsn, lambda t: np.ones(len(t), bool), "all")
    rows_n, _, _, _, n_te_n, comps_n = evaluate(edges, X, dsn, lambda t: t.dark.values == 1, "night")
    base = max(rows[:3], key=lambda r: r["cap10"])
    c = {(x["who"], x["q"]): x for x in comps}
    m10, m20, h10 = c[("model", 0.10)], c[("model", 0.20)], c[("hybrid", 0.10)]
    beats = m10["ci"][0] > 0 or m20["ci"][0] > 0
    pc = lambda v: f"{100 * v:.0f}%"
    pp = lambda v: f"{100 * v:+.0f}".replace("-", "\u2212")
    verdict = (f"At the top 20% of road length, the model (road features only, no death history) captured {pc(rows[3]['cap20'])} of later deaths versus "
               f"{pc(base['cap20'])} for the best past-deaths baseline ({base['name'].lower()}): {pp(m20['diff'])} points, 95% interval {pp(m20['ci'][0])} to {pp(m20['ci'][1])}. "
               f"At the top 10% it was {pc(rows[3]['cap10'])} versus {pc(base['cap10'])}: {pp(m10['diff'])} points, interval {pp(m10['ci'][0])} to {pp(m10['ci'][1])}"
               f"{' (a tie)' if m10['ci'][0] <= 0 else ''}. "
               f"The model combined with past deaths on the same road did best at the top 10%: {pc(rows[4]['cap10'])}, {pp(h10['diff'])} points, interval {pp(h10['ci'][0])} to {pp(h10['ci'][1])}. "
               f"The test set is small ({n_te} deaths), so treat these as estimates.")

    # coefficients for plain-language reasons (logistic refit for explanation)
    lr = make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight="balanced", max_iter=2000))
    tr = dsn[(dsn.year >= TRAIN[0]) & (dsn.year <= TRAIN[1])]
    ytr = (np.bincount(tr.eid.values, minlength=len(edges)) > 0).astype(int)
    surf = (edges.cls != "motorway").values
    lr.fit(X[surf], ytr[surf])
    coef = pd.Series(lr[-1].coef_[0], index=FEATURES).sort_values(key=abs, ascending=False)
    feats = [PLAIN[k] + (" (more risk)" if v > 0 else " (less risk)") for k, v in coef.head(6).items()]

    report = {"unit": "road segments (surface streets)", "area": cfg.get("model_area_label") or (cfg["name"] + " and nearby county roads"), "train": "2019–2021", "test": "2022–2023",
              "n_test_deaths": n_te, "n_test_deaths_night": n_te_n, "n_segments": int(surf.sum()),
              "rows": rows, "rows_night": rows_n, "comparisons": comps, "comparisons_night": comps_n, "cv_ap": cv, "chosen": best, "beats_baseline": beats, "verdict": verdict, "features": feats}
    write_json(WEB_DATA / rid / "risk_report.json", report)
    print(json.dumps({"rows": [(r["name"], round(r["cap10"], 3), [round(x, 3) for x in r["ci10"]]) for r in rows],
                      "comps": [(c_["who"], c_["q"], round(c_["diff"], 3), [round(v, 3) for v in c_["ci"]]) for c_ in comps], "beats": beats, "chosen": best, "cv": cv}, indent=1))

    # ---- final model on ALL years, for the map and stop notes ----
    allc = np.bincount(dsn.eid.values, minlength=len(edges))
    yall = (allc > 0).astype(int)
    final = (HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=250, l2_regularization=1.0, random_state=0)
             if best == "boosted trees" else make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight="balanced", max_iter=2000)))
    final.fit(X[surf], yall[surf])
    risk = np.full(len(edges), 0.0)
    risk[surf] = final.predict_proba(X[surf])[:, 1]
    edges["risk"] = risk
    edges["deaths_all"] = allc
    pr = pd.Series(risk[surf]).rank(pct=True).values
    full_pct = np.zeros(len(edges)); full_pct[surf] = pr
    # corridors: top surface segments, as lat/lon lines
    top = edges[surf & (edges.len > 80)].sort_values("risk", ascending=False).head(150).to_crs(4326)
    cor = [{"name": r.name1, "deaths": int(r.deaths_all), "line": [[round(y, 5), round(x, 5)] for x, y in r.geometry.simplify(0.00005).coords]}
           for r in top.itertuples()]
    write_json(WEB_DATA / rid / "corridors.json", cor)
    # risk lines for the map: the top 8% of surface segments by model risk, with their percentile (92 to 100)
    keep = edges[surf & (full_pct >= 0.92) & (edges.len > 40)].copy()
    keep["pct"] = (full_pct[keep.index] * 100).round().astype(int)
    keep = keep.to_crs(4326)
    lines = [[int(r.pct), r.name1, int(r.deaths_all), [[round(y, 4), round(x, 4)] for x, y in r.geometry.simplify(0.00008).coords]]
             for r in keep.itertuples()]
    write_json(WEB_DATA / rid / "risk_lines.json", lines)
    # stop-level risk percentile: highest segment risk within 150 m of the stop
    st = json.loads((WEB_DATA / rid / "transit.json").read_text())["stops"]
    sp = gpd.GeoSeries(gpd.points_from_xy([s[2] for s in st], [s[1] for s in st]), crs=4326).to_crs(UTM)
    et = cKDTree(np.c_[edges.mx, edges.my])
    stop_pct = []
    for x, y in zip(sp.x, sp.y):
        ix = et.query_ball_point([x, y], 150)
        stop_pct.append(int(round(100 * float(full_pct[ix].max()))) if ix else None)
    saf = json.loads((WEB_DATA / rid / "safety.json").read_text())
    for row, p in zip(saf["stops"], stop_pct):
        row[2] = p
    write_json(WEB_DATA / rid / "safety.json", saf)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca33")
