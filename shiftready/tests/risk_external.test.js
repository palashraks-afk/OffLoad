// Checks the shape and sanity of the external validation files (prep/risk_external.py).  node shiftready/tests/risk_external.test.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "../web/data");
let n = 0, files = 0;
const ok = (c, m) => { assert(c, m); n++; };
for (const id of fs.readdirSync(root)) {
  const f = path.join(root, id, "risk_external.json");
  if (!fs.existsSync(f)) continue;
  files++;
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  ok(Array.isArray(d.tests) && d.tests.length > 0, id + ": tests");
  for (const t of d.tests) {
    const tag = id + " " + t.trained_on.id + "->" + t.tested_on.id;
    ok(t.tested_on.id === id, tag + ": file is for the district that was tested");
    ok(t.trained_on.id !== t.tested_on.id, tag + ": trained and tested on different districts");
    ok(t.n_test_deaths > 20 && t.n_segments > 1000, tag + ": sizes");
    const names = t.rows.map((r) => r.name);
    ok(names.some((x) => x.startsWith("Model trained on")), tag + ": model row");
    ok(names.includes("Random (expected)") && names.includes("Past deaths on the same road"), tag + ": baseline rows");
    for (const r of t.rows) ok(r.cap5 >= 0 && r.cap10 <= 1 && r.cap20 <= 1 && r.cap5 <= r.cap10 + 1e-9 && r.cap10 <= r.cap20 + 1e-9, tag + ": capture is ordered and in [0,1] for " + r.name);
    ok([0.1, 0.2].every((q) => t.comparisons.some((c) => c.q === q && c.ci.length === 2 && c.ci[0] <= c.diff + 1e-9 && c.diff <= c.ci[1] + 1e-9 && ["better", "tie", "worse"].includes(c.outcome))), tag + ": comparisons");
    ok(["better", "partial", "mixed", "worse", "tie"].includes(t.outcome), tag + ": outcome word");
    ok(typeof t.verdict === "string" && t.verdict.includes(t.tested_on.short) && t.verdict.includes(t.trained_on.short), tag + ": verdict names both districts");
    ok(t.train === "2019–2021" && t.test === "2022–2023", tag + ": years fixed in advance");
  }
}
ok(files >= 1, "at least one external validation file");
console.log(n + " external-validation checks passed in " + files + " file(s)");
