"""Second road-risk model (pre-registered) and the calibration check.

    python shiftready/prep/risk_second.py ca23
    python shiftready/prep/risk_second.py ca33

The design and the adoption rule are in docs/research/21_second_model_plan.md, written and committed BEFORE this script
was run. In short:
  * M2 = shallow, class-weighted boosted trees (HistGradientBoostingClassifier, max_depth=3, learning_rate=0.05,
    max_iter=150, min_samples_leaf=50, l2_regularization=2.0, class_weight="balanced", random_state=0), same features
    and same 2019-2021 label as prep/risk_model.py. No setting was tuned on the 2022-2023 test years.
  * Comparator = the model risk_model.py displays for the region (the one chosen by cross-validation on the training
    years; read from web/data/<id>/risk_report.json "chosen"). The logistic model is reported as well.
  * Adopted only if, at the top 20% of road length, M2 beats the comparator by >= 3 points AND the 95% paired-bootstrap
    interval of the difference is above zero, AND at the top 10% M2's capture is not lower than the comparator's.
    Otherwise "tried, not adopted".
  * Calibration (ranking, not absolute probability): surface segments ordered by the displayed model's score are cut
    into ten groups of equal road length; for each, the 2022-2023 deaths per 100 km.
Writes web/data/<id>/risk_second.json and web/data/<id>/risk_calibration.json. Does not change any other file.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).parent))
import risk_model as rm  # noqa: E402
from common import WEB_DATA, region, write_json  # noqa: E402

M2_PARAMS = dict(max_depth=3, learning_rate=0.05, max_iter=150, min_samples_leaf=50, l2_regularization=2.0,
                 class_weight="balanced", random_state=0)
B = 2000


def make(kind):
    if kind == "logistic":
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight="balanced", max_iter=2000))
    if kind == "boosted trees":
        return HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=250, l2_regularization=1.0, random_state=0)
    return HistGradientBoostingClassifier(**M2_PARAMS)


def top_mask(score, length, q):
    order = np.lexsort((np.random.default_rng(3).random(len(score)), -score))
    cum = np.cumsum(length[order])
    mk = np.zeros(len(score), bool)
    mk[order[: np.searchsorted(cum, q * length.sum()) + 1]] = True
    return mk


def main(rid):
    cfg = region(rid)
    UTM = cfg["utm"]
    edges, nodes = rm.load_edges(rid, UTM)
    edges = rm.add_context(edges, nodes, rid, UTM)
    X = rm.design(edges)
    d = rm.load_deaths(cfg)
    dsn = rm.snap(edges, d, UTM)
    dsn = dsn.assign(eid=dsn.eid.astype(int))
    dsn = dsn[edges.cls.values[dsn.eid.values] != "motorway"]
    surf = (edges.cls != "motorway").values
    length = edges.len.values
    tr = dsn[(dsn.year >= rm.TRAIN[0]) & (dsn.year <= rm.TRAIN[1])]
    te = dsn[(dsn.year >= rm.TEST[0]) & (dsn.year <= rm.TEST[1])]
    y = (np.bincount(tr.eid.values, minlength=len(edges)) > 0).astype(int)
    te_cnt = np.bincount(te.eid.values, minlength=len(edges)).astype(float)
    rep = json.loads((WEB_DATA / rid / "risk_report.json").read_text(encoding="utf-8"))
    shown = rep["chosen"]
    ids = np.cumsum(surf) - 1                       # position of each edge among the surface edges
    pos = ids[te.eid.values[surf[te.eid.values]]]   # test deaths as positions among surface edges
    Xs, ys, ls = X[surf], y[surf], length[surf]
    n_test = len(pos)

    scores, caps = {}, {}
    for name, kind in (("shown", shown), ("logistic", "logistic"), ("second", "second")):
        mod = make(kind).fit(Xs, ys)
        scores[name] = mod.predict_proba(Xs)[:, 1]
        caps[name] = rm.capture(scores[name], ls, te_cnt[surf])

    def diff_ci(a, b, q):
        ma, mb = top_mask(scores[a], ls, q)[pos], top_mask(scores[b], ls, q)[pos]
        rng = np.random.default_rng(11)
        ds = [ma[ix].mean() - mb[ix].mean() for ix in (rng.integers(0, n_test, n_test) for _ in range(B))]
        return [float(np.percentile(ds, 2.5)), float(np.percentile(ds, 97.5))]

    comps = []
    for vs in ("shown", "logistic"):
        for q in (0.10, 0.20):
            comps.append({"vs": vs, "q": q, "diff": float(caps["second"][q] - caps[vs][q]), "ci": diff_ci("second", vs, q)})
    c20 = next(c for c in comps if c["vs"] == "shown" and c["q"] == 0.20)
    c10 = next(c for c in comps if c["vs"] == "shown" and c["q"] == 0.10)
    rule_a = c20["diff"] >= 0.03 and c20["ci"][0] > 0
    rule_b = c10["diff"] >= 0
    adopted = bool(rule_a and rule_b)
    label = {"shown": "Displayed model (" + shown + ")", "logistic": "Logistic model", "second": "Second model (shallow boosted trees, class-weighted)"}
    rows = [{"name": label[k], "cap5": caps[k][0.05], "cap10": caps[k][0.10], "cap20": caps[k][0.20]} for k in ("shown", "logistic", "second")]
    out = {"region": rid, "plan": "docs/research/21_second_model_plan.md", "m2_params": M2_PARAMS, "displayed_model": shown,
           "n_test_deaths": int(n_test), "train": "2019-2021", "test": "2022-2023", "rows": rows, "comparisons": comps,
           "rule": {"a": "top 20%: second model beats the displayed model by >= 3 points and the 95% interval is above zero",
                    "b": "top 10%: second model's capture is not lower than the displayed model's",
                    "a_met": bool(rule_a), "b_met": bool(rule_b)},
           "adopted": adopted,
           "verdict": ("Adopted: it met both pre-set conditions." if adopted else
                       "Tried, not adopted: it did not meet both pre-set conditions.")}
    write_json(WEB_DATA / rid / "risk_second.json", out)

    # calibration of the displayed model's ranking: ten groups of equal road length
    s = scores["shown"]
    order = np.lexsort((np.random.default_rng(5).random(len(s)), -s))
    cum = np.cumsum(ls[order])
    cut = np.searchsorted(cum, np.linspace(0, 1, 11)[1:-1] * ls.sum())
    groups = np.split(order, cut)[::-1]            # group 1 = lowest predicted risk ... group 10 = highest
    deciles = []
    tc = te_cnt[surf]
    for k, g in enumerate(groups):
        km = float(ls[g].sum() / 1000)
        dn = float(tc[g].sum())
        deciles.append({"decile": k + 1, "km": round(km, 1), "deaths": int(dn), "per100km": round(dn / km * 100, 3) if km else 0.0,
                        "share_of_deaths": round(dn / tc.sum(), 4) if tc.sum() else 0.0})
    rates = [x["per100km"] for x in deciles]
    rho = spearmanr(range(1, 11), rates)[0]
    wrong = sum(1 for a, b in zip(rates, rates[1:]) if b < a)      # a step where the rate falls as predicted risk rises
    cal = {"region": rid, "model": shown, "test": "2022-2023", "n_test_deaths": int(tc.sum()), "deciles": deciles,
           "spearman": round(float(rho), 3), "wrong_way_pairs": int(wrong),
           "note": "Ranking check only: scores come from a class-balanced model and are not probabilities."}
    write_json(WEB_DATA / rid / "risk_calibration.json", cal)
    print(rid, "shown:", shown, {k: {q: round(v, 3) for q, v in caps[k].items()} for k in caps})
    print("second vs shown:", [(c["q"], round(c["diff"], 3), [round(x, 3) for x in c["ci"]]) for c in comps if c["vs"] == "shown"],
          "adopted:", adopted, "rule a/b:", rule_a, rule_b)
    print("calibration rates per 100 km by decile:", rates, "spearman", cal["spearman"], "wrong-way pairs", wrong)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ca23")
