// Two independent implementations must agree: the Python coverage tables vs the JavaScript timetable search.
const fs = require("fs"), path = require("path"), assert = require("assert");
const P = require("../web/js/planner.js");
const D = path.join(__dirname, "../web/data/ca33/");
const t = JSON.parse(fs.readFileSync(D + "transit.json"));
t.trips = t.trips.map((x) => { const times = [x[3]]; for (const s of x[4]) times.push(times[times.length - 1] + s / 10); return [x[0], x[1], x[2], times, x[5]]; });
const net = new P.Network(t), tracts = JSON.parse(fs.readFileSync(D + "tracts.json"));
let seed = 99; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let agree = 0, total = 0, bad = [];
for (let i = 0; i < 40; i++) {
  const tr = tracts[Math.floor(rnd() * tracts.length)];
  for (const day of ["weekday", "saturday", "sunday"]) for (const h of [0, 1, 5, 12, 22, 23]) {
    const js = P.hasService(net, tr.lat, tr.lon, day, h, 400), py = tr.cov[day][h] === "1";
    total++; if (js === py) agree++; else bad.push(`${tr.id} ${day} ${h}: js ${js} py ${py}`);
  }
}
const rate = agree / total;
assert(rate >= 0.99, `agreement ${rate}: ${bad.slice(0, 5).join("; ")}`);
console.log(`Python and JavaScript coverage agree on ${agree}/${total} checks (${(rate * 100).toFixed(1)}%).`);
