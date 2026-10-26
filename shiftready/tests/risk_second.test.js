// Checks the second road-risk model and the calibration files (prep/risk_second.py) against the plan that was written first.
//   node shiftready/tests/risk_second.test.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "../web/data");
const plan = fs.readFileSync(path.join(__dirname, "../../docs/research/21_second_model_plan.md"), "utf8");
let n = 0, files = 0;
const ok = (c, m) => { assert(c, m); n++; };
for (const id of fs.readdirSync(root)) {
  const f = path.join(root, id, "risk_second.json");
  if (!fs.existsSync(f)) continue;
  files++;
  const s = JSON.parse(fs.readFileSync(f, "utf8"));
  ok(s.region === id, id + ": region");
  // the model settings in the output are the ones written in the plan before the run
  const p = s.m2_params;
  ok(plan.includes("max_depth=" + p.max_depth) && plan.includes("learning_rate=" + p.learning_rate) && plan.includes("max_iter=" + p.max_iter) &&
     plan.includes("min_samples_leaf=" + p.min_samples_leaf) && plan.includes("l2_regularization=" + p.l2_regularization) && plan.includes('class_weight="' + p.class_weight + '"'), id + ": settings match the plan");
  ok(s.train === "2019-2021" && s.test === "2022-2023", id + ": years");
  ok(s.rows.length === 3 && s.rows.every((r) => r.cap5 <= r.cap10 + 1e-9 && r.cap10 <= r.cap20 + 1e-9 && r.cap20 <= 1), id + ": rows");
  ok(s.comparisons.length === 4 && s.comparisons.every((c) => c.ci[0] <= c.diff + 0.03 && c.diff <= c.ci[1] + 0.03), id + ": comparisons");
  const c20 = s.comparisons.find((c) => c.vs === "shown" && c.q === 0.2), c10 = s.comparisons.find((c) => c.vs === "shown" && c.q === 0.1);
  const a = c20.diff >= 0.03 && c20.ci[0] > 0, b = c10.diff >= 0;
  ok(s.rule.a_met === a && s.rule.b_met === b, id + ": rule flags follow the rule as written in advance");
  ok(s.adopted === (a && b), id + ": adopted only if both conditions are met");
  ok(/Adopted|not adopted/.test(s.verdict), id + ": verdict wording");
  const c = JSON.parse(fs.readFileSync(path.join(root, id, "risk_calibration.json"), "utf8"));
  ok(c.deciles.length === 10 && c.deciles.every((d, i) => d.decile === i + 1), id + ": ten groups");
  ok(c.deciles.reduce((x, d) => x + d.deaths, 0) === c.n_test_deaths, id + ": every test death is in a group");
  const km = c.deciles.map((d) => d.km), mean = km.reduce((x, y) => x + y, 0) / 10;
  ok(km.every((k) => Math.abs(k - mean) / mean < 0.05), id + ": groups have about equal road length");
  const wrong = c.deciles.slice(1).filter((d, i) => d.per100km < c.deciles[i].per100km).length;
  ok(c.wrong_way_pairs === wrong, id + ": wrong-way count matches the rates");
  ok(c.spearman >= -1 && c.spearman <= 1, id + ": rank correlation range");
  ok(/not probabilities/.test(c.note), id + ": says it is a ranking check, not absolute probability");
}
ok(files >= 1, "at least one second-model file");
console.log(n + " second-model and calibration checks passed in " + files + " file(s)");
