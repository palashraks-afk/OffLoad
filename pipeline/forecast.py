"""Next-month forecast with honest baselines.

Data caveat that shapes everything: EMSA publishes only hospitals that EXCEEDED
their standard (with >= 60 offloads). A hospital missing from a month either met
the standard or had too few records; the report does not say which. So the
question we can answer is: "given a hospital is on this month's exceedance list,
will it be on next month's list, and by how many minutes will it exceed?"

Validation is by time (train on earlier transitions, test on the latest two).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, brier_score_loss, mean_absolute_error, roc_auc_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
MIN_LISTINGS = 3  # a hospital needs >= 3 listed months before we forecast it
FEATURES = ["over_min", "offloads_k", "prev_over", "listed_prev", "n_listed"]


def month_add(m, k):
    y, mo = map(int, m.split("-"))
    i = y * 12 + mo - 1 + k
    return f"{i // 12}-{i % 12 + 1:02d}"


def panel(df, months):
    key = {(r.facility_id, r.month): r for r in df.itertuples()}
    rows = []
    for (fid, m), r in key.items():
        prev = key.get((fid, month_add(m, -1)))
        nxt_m = month_add(m, 1)
        nxt = key.get((fid, nxt_m))
        n_listed = sum(1 for k in range(0, 12) if (fid, month_add(m, -k)) in key)
        rows.append({
            "facility_id": fid, "hospital": r.hospital, "month": m, "next_month": nxt_m,
            "over_min": r.over_min, "offloads_k": r.offloads / 1000,
            "prev_over": prev.over_min if prev else 0.0, "listed_prev": int(prev is not None),
            "n_listed": n_listed,
            "has_next_obs": nxt_m in months,
            "stays": int(nxt is not None) if nxt_m in months else None,
            "next_over": nxt.over_min if nxt else None,
        })
    return pd.DataFrame(rows)


def evaluate(p, months):
    obs = p[p.has_next_obs].copy()
    ms = sorted(obs.month.unique())
    test_months = ms[-2:]
    train, test = obs[~obs.month.isin(test_months)], obs[obs.month.isin(test_months)]
    res = {"train_months": [m for m in ms if m not in test_months], "test_months": test_months,
           "n_train": len(train), "n_test": len(test)}

    # --- classification: will the hospital still be on next month's list? ---
    ytr, yte = train.stays.astype(int), test.stays.astype(int)
    base_rate = float(ytr.mean())
    persist = np.ones(len(test), dtype=int)  # baseline A: "stays listed"
    cut = float(train.over_min.median())
    thr_pred = (test.over_min >= cut).astype(int)  # baseline B: bigger excess -> stays
    sc = StandardScaler().fit(train[FEATURES])
    lr = LogisticRegression(max_iter=1000).fit(sc.transform(train[FEATURES]), ytr)
    prob = lr.predict_proba(sc.transform(test[FEATURES]))[:, 1]
    both = yte.nunique() == 2
    res["classification"] = {
        "target": "hospital is on next month's exceedance list",
        "test_base_rate": round(float(yte.mean()), 3),
        "persistence": {"accuracy": round(accuracy_score(yte, persist), 3), "auc": 0.5},
        "threshold": {"accuracy": round(accuracy_score(yte, thr_pred), 3), "cutoff_minutes_over": round(cut, 2),
                      "auc": round(roc_auc_score(yte, test.over_min), 3) if both else None},
        "logistic": {"accuracy": round(accuracy_score(yte, prob >= 0.5), 3),
                     "auc": round(roc_auc_score(yte, prob), 3) if both else None,
                     "brier": round(brier_score_loss(yte, prob), 3)},
        "brier_persistence": round(brier_score_loss(yte, np.full(len(test), base_rate)), 3),
    }
    # calibration: predicted vs actual in three bins
    bins = pd.cut(prob, [0, 0.5, 0.8, 1.0], include_lowest=True)
    cal = pd.DataFrame({"p": prob, "y": yte.values, "b": bins}).groupby("b", observed=True).agg(
        n=("y", "size"), predicted=("p", "mean"), actual=("y", "mean")).round(3).reset_index()
    res["calibration"] = [{"bin": str(r.b), "n": int(r.n), "predicted": r.predicted, "actual": r.actual}
                          for r in cal.itertuples()]

    # --- regression: minutes over the standard next month (listed both months) ---
    rtr, rte = train[train.stays == 1], test[test.stays == 1]
    if len(rtr) > 10 and len(rte) > 5:
        sc2 = StandardScaler().fit(rtr[FEATURES])
        rg = Ridge(alpha=5.0).fit(sc2.transform(rtr[FEATURES]), rtr.next_over)
        pred = rg.predict(sc2.transform(rte[FEATURES]))
        trend = np.where(rte.listed_prev == 1, rte.over_min + (rte.over_min - rte.prev_over), rte.over_min)
        res["regression"] = {
            "target": "minutes over the standard next month (hospitals listed both months)",
            "n_test": int(len(rte)),
            "persistence_mae": round(mean_absolute_error(rte.next_over, rte.over_min), 2),
            "trend_mae": round(mean_absolute_error(rte.next_over, trend), 2),
            "ridge_mae": round(mean_absolute_error(rte.next_over, pred), 2),
        }
    c, r = res["classification"], res.get("regression")
    res["beats_baseline"] = {
        "classification": bool(c["logistic"]["auc"] is not None and c["logistic"]["auc"] > 0.55
                               and c["logistic"]["brier"] < c["brier_persistence"]),
        "regression": bool(r and r["ridge_mae"] < min(r["persistence_mae"], r["trend_mae"])),
    }
    return res


def final_forecast(p, months):
    obs = p[p.has_next_obs]
    sc = StandardScaler().fit(obs[FEATURES])
    lr = LogisticRegression(max_iter=1000).fit(sc.transform(obs[FEATURES]), obs.stays.astype(int))
    both = obs[obs.stays == 1]
    sc2 = StandardScaler().fit(both[FEATURES])
    rg = Ridge(alpha=5.0).fit(sc2.transform(both[FEATURES]), both.next_over)
    latest = months[-1]
    cur = p[(p.month == latest)].copy()
    out = []
    for r in cur.itertuples():
        if r.n_listed < MIN_LISTINGS:
            out.append({"facility_id": r.facility_id, "status": "not_enough_history", "n_listed": int(r.n_listed)})
            continue
        x = pd.DataFrame([r._asdict()])[FEATURES]
        z = sc.transform(x)
        prob = float(lr.predict_proba(z)[0, 1])
        reasons = sorted(zip(FEATURES, (z[0] * lr.coef_[0]).tolist()), key=lambda t: -abs(t[1]))[:3]
        out.append({
            "facility_id": r.facility_id, "status": "forecast", "n_listed": int(r.n_listed),
            "p_stays_listed": round(prob, 3),
            "pred_over_min": round(float(rg.predict(sc2.transform(x))[0]), 1),
            "reasons": [{"feature": f, "push": "up" if v > 0 else "down"} for f, v in reasons],
        })
    return {"for_month": month_add(latest, 1), "based_on": latest, "items": out}


def main():
    df = pd.read_csv(ROOT / "data/processed/offloads.csv", dtype={"facility_id": str})
    months = sorted(df.month.unique())
    p = panel(df, months)
    res = evaluate(p, months)
    res["features"] = FEATURES
    res["forecast"] = final_forecast(p, months)
    res["notes"] = [
        "Only hospitals that exceeded their standard are published; 'not on the list' means met the standard OR had under 60 offloads.",
        "Only six report months exist, so seasonality and outside drivers (virus, heat) are NOT modelled.",
        "Hospitals with fewer than three listed months are not forecast.",
        "Forecasts are probabilities, not certainties.",
    ]
    text = json.dumps(res, separators=(",", ":"))
    (ROOT / "data/processed/forecast.json").write_text(text, encoding="utf-8")
    (ROOT / "site/data/forecast.json").write_text(text, encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "forecast"}, indent=1))
    items = res["forecast"]["items"]
    print("forecast rows:", sum(i["status"] == "forecast" for i in items), "of", len(items))


if __name__ == "__main__":
    main()
