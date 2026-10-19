// Plan verdict logic on real data, without a browser.  node shiftready/tests/ui_logic.test.js
const fs = require("fs"), path = require("path"), assert = require("assert"), vm = require("vm");
const web = path.join(__dirname, "../web");
const ctx = { URLSearchParams, console, Math, Set, Map, Float64Array, Int32Array, Uint8Array, Array, Object, JSON, Number, String, Infinity, isFinite };
ctx.window = ctx; ctx.document = { querySelector: () => null, querySelectorAll: () => [] }; ctx.location = { search: "" };
vm.createContext(ctx);
for (const f of ["i18n", "planner", "data", "ui-plan"]) vm.runInContext(fs.readFileSync(path.join(web, `js/${f}.js`), "utf8"), ctx, { filename: f });
const SR = ctx.SR, P = ctx.Planner;
SR.lang = "en"; SR.t = (k, v) => { let s = SR.STR.en[k] || k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => (v[x] != null ? v[x] : "{" + x + "}")); return s; };
const read = (n) => JSON.parse(fs.readFileSync(path.join(web, `data/ca33/${n}.json`)));
for (const f of ["transit", "tracts", "reach", "sheds", "blocks", "boundary", "places", "pois", "safety"]) SR.d[f] = read(f);
SR.d.transit.trips = SR.d.transit.trips.map((x) => { const t = [x[3]]; for (const s of x[4]) t.push(t[t.length - 1] + s / 10); return [x[0], x[1], x[2], t, x[5]]; });
SR.net = new P.Network(SR.d.transit); SR.tractById = {}; SR.d.tracts.forEach((t) => (SR.tractById[t.id] = t));
SR.cfg = { short: "CA-33", agency: "Omnitrans" };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const A = { lat: 34.0922, lon: -117.435, label: "A" }, B = { lat: 34.0724, lon: -117.3517, label: "B" };
// Daytime, same corridor: should work and leave real slack.
let R = SR._compute(A, B, "weekday", "arrive", 20 * 60, false, 0);
ok(R.main.ok, "daytime plan found");
ok(!R.tight && R.slack >= 10, "arrive-by leaves at least 10 minutes of slack, got " + R.slack);
ok(R.verdict.level === "yes" || R.verdict.level === "maybe", "verdict is yes or partly");
// 2 AM: no bus anywhere.
R = SR._compute(A, B, "weekday", "depart", 2 * 60, false, 0);
ok(!R.main.ok || R.main.leave >= 4 * 60, "no service at 2 AM");
ok(R.verdict.level === "no" || R.verdict.level === "maybe", "2 AM is not a clean yes");
// 11:30 PM to somewhere: expect no ride home / no bus.
R = SR._compute(A, B, "weekday", "depart", 23.5 * 60, false, 0);
ok(R.verdict.level !== "yes", "late night is not a yes");
// With a ride home after a night shift that ends at 6:30 AM, the return is computed for the next morning.
R = SR._compute(A, B, "weekday", "arrive", 22 * 60, true, 6.5 * 60);
ok(R.home !== undefined && R.lastBus !== undefined, "home leg computed");
// Alternatives only suggest plans that are not tight.
R = SR._compute(A, B, "weekday", "arrive", 23 * 60, false, 0);
if (R.alts) for (const k of ["earlier", "later"]) if (R.alts[k]) ok(R.alts[k].plan.ok, "alt plan ok");
console.log(n + " plan-logic checks passed.");
