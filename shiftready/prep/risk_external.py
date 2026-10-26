"""External validation of the road-risk model: train on one district, test on a different district the model never saw.

    python shiftready/prep/risk_external.py            # every pair whose road graphs exist
    python shiftready/prep/risk_external.py ca33 ca23  # one pair: train on ca33, test on ca23

Design, fixed before any result was looked at:
  * The model is the road-features logistic model of prep/risk_model.py (same features, same settings:
    standardised inputs, C=0.3, balanced classes). It is trained on region A only, with pedestrian and cyclist
    deaths from 2019-2021 as the label. The 2022-2023 deaths of region A are never used.
  * It then scores every surface road segment of region B (the scaler and weights are NOT refit on B).
  * Test: region B's pedestrian and cyclist deaths from 2022-2023. The metric is the same as in risk_model.py:
    the share of those deaths that fall on the top 5%, 10% and 20% of road length, averaged over random
    tie-breaks, with a bootstrap 95% interval over the test deaths.
  * Baselines are computed inside region B from B's own 2019-2021 deaths: past deaths on the same road, in the
    same 400 m cell, and on the same segment, plus random. The model is compared with the best of the three
    baselines at the top 10% (picked on the test result, which favours the baseline), with a paired bootstrap.
  * Both regions use the same feature code, so every feature exists in both. Features that have no variation in
    a region are listed in the output.
A negative result (the transferred model does not beat the baseline) is written out as plainly as a positive one.
Does not touch risk_report.json, corridors.json, risk_lines.json or safety.json. Writes web/data/<B>/risk_external.json.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import average_precision_score

sys.path.insert(0, str(Path(__file__).parent))
import risk_model as rm  # noqa: E402
from common import ROOT, WEB_DATA, region, write_json  # noqa: E402

PAIRS = [("ca33", "ca23"), ("ca23", "ca33"), ("cle", "ca23")]
_cache = {}


def prep(rid):
    if rid in _cache:
        return _cache[rid]
    cfg = region(rid)
    UTM = cfg["utm"]
    edges, nodes = rm.load_edges(rid, UTM)
    edges = rm.add_context(edges, nodes, rid, UTM)
    X = rm.design(edges)
    d = rm.load_deaths(cfg)
    dsn = rm.snap(edges, d, UTM)
    dsn = dsn.assign(eid=dsn.eid.astype(int))
    dsn = dsn[edges.cls.values[dsn.eid.values] != "motorway"]    # freeway deaths are a separate problem, as in risk_model.py
    _cache[rid] = (cfg, edges, X, dsn)
    return _cache[rid]


def pc(v):
    return f"{100 * v:.0f}%"


def pp(v):
    return f"{100 * v:+.0f}".replace("-", "−")


def external(a, b):
    cfg_a, e_a, X_a, d_a = prep(a)
    cfg_b, e_b, X_b, d_b = prep(b)
    # ---- train on A only, with A's 2019-2021 deaths
    surf_a = (e_a.cls != "motorway").values
    tr_a = d_a[(d_a.year >= rm.TRAIN[0]) & (d_a.year <= rm.TRAIN[1])]
    y_a = (np.bincount(tr_a.eid.values, minlength=len(e_a)) > 0).astype(int)
    model = make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight="balanced", max_iter=2000))
    model.fit(X_a[surf_a], y_a[surf_a])

    # ---- score B (nothing is refit on B)
    m = (e_b.cls != "motorway").values
    score = np.full(len(e_b), -1.0)
    score[m] = model.predict_proba(X_b[m])[:, 1]

    length = e_b.len.values
    ids = np.arange(len(e_b))
    tr = d_b[(d_b.year >= rm.TRAIN[0]) & (d_b.year <= rm.TRAIN[1])]
    te = d_b[(d_b.year >= rm.TEST[0]) & (d_b.year <= rm.TEST[1])]
    te_e = te.eid.values
    tr_cnt = np.bincount(tr.eid.values, minlength=len(e_b)).astype(float)
    te_cnt = np.bincount(te_e, minlength=len(e_b)).astype(float)
    name = e_b.name1.values
    corr = pd.Series(tr_cnt).groupby(name).transform("sum").values
    corr = np.where(name == "", tr_cnt, corr) + 1e-6 * tr_cnt
    cell = pd.Series(tr_cnt).groupby([np.floor(e_b.mx.values / 400), np.floor(e_b.my.values / 400)]).transform("sum").values + 1e-6 * tr_cnt
    methods = [("Past deaths on the same road", corr), ("Past deaths in the same 400 m cell", cell), ("Past deaths on the same segment", tr_cnt),
               (f"Model trained on {cfg_a['short']} only", score)]
    rows = []
    for nm, sc in methods:
        sc = np.where(m, sc, -9e9)
        cap = rm.capture(sc[m], length[m], te_cnt[m])
        ci, _ = rm.boot_ci(sc[m], length[m], np.searchsorted(ids[m], te_e[m[te_e]]), int(m.sum()))
        rows.append({"name": nm, "cap5": cap[0.05], "cap10": cap[0.10], "cap20": cap[0.20],
                     "ap": float(average_precision_score((te_cnt[m] > 0).astype(int), sc[m])), "ci10": ci})
    pos = np.searchsorted(ids[m], te_e[m[te_e]])

    def top_mask(sc, q):
        scm = np.where(m, sc, -9e9)[m]
        order = np.lexsort((np.random.default_rng(3).random(int(m.sum())), -scm))
        cum = np.cumsum(length[m][order])
        mk = np.zeros(int(m.sum()), bool)
        mk[order[: np.searchsorted(cum, q * length[m].sum()) + 1]] = True
        return mk

    base_i = max(range(3), key=lambda i: rows[i]["cap10"])
    comps = []
    for q in (0.10, 0.20):
        x = top_mask(methods[3][1], q)[pos]
        y = top_mask(methods[base_i][1], q)[pos]
        diffs = [x[ix].mean() - y[ix].mean() for ix in (rm.RNG.integers(0, len(x), len(x)) for _ in range(2000))]
        comps.append({"q": q, "diff": float(x.mean() - y.mean()), "ci": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))],
                      "baseline": rows[base_i]["name"]})
    rows.append({"name": "Random (expected)", "cap5": 0.05, "cap10": 0.10, "cap20": 0.20, "ap": float((te_cnt[m] > 0).mean()), "ci10": [0.1, 0.1]})

    # reference: the model trained inside B (what the app shows), read from B's own report, not recomputed
    ref = None
    rp = WEB_DATA / b / "risk_report.json"
    if rp.exists():
        rr = json.loads(rp.read_text(encoding="utf-8"))
        r0 = next((r for r in rr["rows"] if r["name"].startswith("Road-features")), None)
        if r0:
            ref = {"name": r0["name"], "cap5": r0["cap5"], "cap10": r0["cap10"], "cap20": r0["cap20"], "ci10": r0["ci10"]}

    n_te = int(m[te_e].sum())
    base = rows[base_i]
    c10, c20 = comps
    for c in comps:     # per cutoff: better if the whole interval is above 0, worse if it is below 0, otherwise a tie
        c["outcome"] = "better" if c["ci"][0] > 0 else "worse" if c["ci"][1] < 0 else "tie"
    o = {c["q"]: c["outcome"] for c in comps}
    if o[0.10] == "better" and o[0.20] == "better":
        outcome = "better"
    elif "better" in o.values() and "worse" in o.values():
        outcome = "mixed"
    elif "better" in o.values():
        outcome = "partial"          # better at one cutoff and a tie at the other
    elif "worse" in o.values():
        outcome = "worse"
    else:
        outcome = "tie"
    lead = {"better": "The model beat the best past-deaths baseline at both cutoffs",
            "partial": "The model beat the best past-deaths baseline at one cutoff and tied it at the other",
            "mixed": "The result was mixed: the model beat the best past-deaths baseline at one cutoff and did worse at the other",
            "worse": "The model did worse than the best past-deaths baseline",
            "tie": "The model did not clearly beat the best past-deaths baseline"}[outcome]
    beats = outcome in ("better", "partial")
    verdict = (f"{lead}, on a district it never saw. Trained on {cfg_a['short']} (2019–2021 deaths) and tested on {cfg_b['short']} (2022–2023 deaths, "
               f"{n_te} on the roads tested), it captured {pc(rows[3]['cap20'])} of deaths in the top 20% of road length versus {pc(base['cap20'])} for the best baseline "
               f"({base['name'].lower()}, computed inside {cfg_b['short']}): {pp(c20['diff'])} points, 95% interval {pp(c20['ci'][0])} to {pp(c20['ci'][1])}. "
               f"At the top 10% it was {pc(rows[3]['cap10'])} versus {pc(base['cap10'])}: {pp(c10['diff'])} points, interval {pp(c10['ci'][0])} to {pp(c10['ci'][1])}.")
    flat_a = [f for f in rm.FEATURES if X_a[f].std() == 0]
    flat_b = [f for f in rm.FEATURES if X_b[f].std() == 0]
    return {
        "trained_on": {"id": a, "name": cfg_a["name"], "short": cfg_a["short"]},
        "tested_on": {"id": b, "name": cfg_b["name"], "short": cfg_b["short"]},
        "train": "2019–2021", "test": "2022–2023", "n_test_deaths": n_te, "n_segments": int(m.sum()),
        "rows": rows, "comparisons": comps, "outcome": outcome, "beats_baseline": bool(beats), "verdict": verdict, "in_district_reference": ref,
        "features_used": rm.FEATURES, "features_without_variation": {a: flat_a, b: flat_b},
        "note": "Same road-feature code in both districts; scaler and weights fitted on the training district only.",
    }


def main(argv):
    pairs = [(argv[0], argv[1])] if len(argv) >= 2 else PAIRS
    out = {}
    for a, b in pairs:
        if not (ROOT / f"data/raw/osm/{a}.graphml").exists() or not (ROOT / f"data/raw/osm/{b}.graphml").exists():
            print("skip", a, "->", b, "(road graph missing)")
            continue
        print("train", a, "test", b, flush=True)
        res = external(a, b)
        print(json.dumps({"rows": [(r["name"], round(r["cap10"], 3), round(r["cap20"], 3)) for r in res["rows"]],
                          "comps": [(c["q"], round(c["diff"], 3), [round(v, 3) for v in c["ci"]]) for c in res["comparisons"]]}, indent=1))
        out.setdefault(b, []).append(res)
    for b, tests in out.items():
        write_json(WEB_DATA / b / "risk_external.json", {"tests": tests})
        print("wrote", WEB_DATA / b / "risk_external.json")


if __name__ == "__main__":
    main(sys.argv[1:])
