// Every region in the switcher has its data, and the default region is the first one.  node shiftready/tests/regions.test.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const web = path.join(__dirname, "../web");
const regions = JSON.parse(fs.readFileSync(path.join(web, "data/regions.json")));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const dflt = /get\("r"\) \|\| "(\w+)"/.exec(fs.readFileSync(path.join(web, "js/data.js"), "utf8"));
ok(dflt && dflt[1] === regions[0].id, "the default region in data.js is the first region in regions.json");
for (const r of regions) {
  for (const f of ["transit", "region", "places", "reach", "tracts", "sheds", "safety", "boundary", "blocks"]) {
    ok(fs.existsSync(path.join(web, "data", r.id, f + ".json")), `${r.id}: ${f}.json exists`);
  }
  const reg = JSON.parse(fs.readFileSync(path.join(web, "data", r.id, "region.json")));
  ok(reg.id === r.id && reg.short && reg.agency, `${r.id}: region.json has its identity`);
  const cfgPath = path.join(__dirname, "../regions", r.id + ".json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath));
  const t = JSON.parse(fs.readFileSync(path.join(web, "data", r.id, "transit.json")));
  for (const x of cfg.gtfs_extra || []) {
    ok(t.routes.some((rt) => rt[3] === (x.name || x.prefix)), `${r.id}: extra feed "${x.name}" has routes in the timetable`);
    ok(t.trips.some((tr) => t.routes[tr[0]][3] === (x.name || x.prefix)), `${r.id}: extra feed "${x.name}" has trips`);
  }
  ok(t.trips.length > 100 && t.stops.length > 100, `${r.id}: a real timetable`);
}
console.log(n + " region checks passed (" + regions.map((r) => r.id).join(", ") + ")");
