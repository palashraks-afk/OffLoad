"""Add a one-line "second region" validation result to each risk report (so the app shows the model held up, or did not)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import WEB_DATA, region, write_json  # noqa: E402

PAIRS = [("ca33", "cle"), ("cle", "ca33")]


def line(rid):
    r = json.loads((WEB_DATA / rid / "risk_report.json").read_text())
    c = {(x["who"], x["q"]): x for x in r["comparisons"]}
    base = c[("model", 0.20)]["baseline"]
    pc = lambda v: f"{100 * v:.0f}%"
    pp = lambda v: f"{100 * v:+.0f}".replace("-", "−")
    m = {x["name"]: x for x in r["rows"]}
    mod = next(v for k, v in m.items() if k.startswith("Road-features model"))
    b = m[base]
    c20, c10 = c[("model", 0.20)], c[("model", 0.10)]
    return (f"{region(rid)['label']}: trained on {r['train']}, tested on {r['test']} ({r['n_test_deaths']} deaths). Road features only captured "
            f"{pc(mod['cap20'])} of later deaths in the top 20% of road length vs {pc(b['cap20'])} for the best past-deaths baseline "
            f"({pp(c20['diff'])} points, 95% interval {pp(c20['ci'][0])} to {pp(c20['ci'][1])}); at the top 10%: {pc(mod['cap10'])} vs {pc(b['cap10'])} "
            f"({pp(c10['diff'])}, interval {pp(c10['ci'][0])} to {pp(c10['ci'][1])}).")


def main():
    ready = [r for r in ("ca33", "cle") if (WEB_DATA / r / "risk_report.json").exists()]
    if len(ready) < 2:
        print("need both risk reports first:", ready)
        return
    for a, b in PAIRS:
        rep = json.loads((WEB_DATA / a / "risk_report.json").read_text())
        rep["second_region"] = line(b)
        write_json(WEB_DATA / a / "risk_report.json", rep)
        print(a, "<-", rep["second_region"][:140])


if __name__ == "__main__":
    main()
