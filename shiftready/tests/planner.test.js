// Run: node shiftready/tests/planner.test.js   (no framework needed)
const fs = require("fs"), path = require("path"), assert = require("assert");
const P = require("../web/js/planner.js");
const t = JSON.parse(fs.readFileSync(path.join(__dirname, "../web/data/ca33/transit.json")));
t.trips = t.trips.map((x) => { const times = [x[3]]; for (const s of x[4]) times.push(times[times.length - 1] + s / 10); return [x[0], x[1], x[2], times, x[5]]; });
const net = new P.Network(t);
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };

// 1. Riding a real weekday trip from its first stop to its 10th stop must be possible and no slower than the trip itself.
const ti = t.trips.findIndex((x) => (x[1] & 1) && x[2].length > 12 && x[3][0] < 1000);
const tr = t.trips[ti];
const A = { lat: t.stops[tr[2][0]][1], lon: t.stops[tr[2][0]][2] };
const B = { lat: t.stops[tr[2][10]][1], lon: t.stops[tr[2][10]][2] };
const r = P.plan(net, A, B, { day: "weekday", depart: tr[3][0] - 1 });
ok(r.ok, "plan found");
ok(r.arrive <= tr[3][10] + 1, `arrive ${r.arrive} by trip time ${tr[3][10]}`);
ok(r.legs.some((l) => l.k === "bus"), "has a bus leg");

// 2. Arrive-by: leaving time must be at or before the trip's departure and arrival not after the target.
const r2 = P.plan(net, A, B, { day: "weekday", arriveBy: tr[3][10] + 2 });
ok(r2.ok, "arrive-by plan found");
ok(r2.arrive <= tr[3][10] + 2 + 0.01, "arrive-by respected");
ok(r2.leave >= tr[3][0] - 60, "leave sane");

// 3. 2 a.m. in the middle of the night has no service anywhere in the county.
const r3 = P.plan(net, A, B, { day: "weekday", depart: 120 });
ok(!r3.ok || r3.leave > 240, "no 2am bus (or first bus is after 4am)");

// 4. Far from any stop: reports it.
const r4 = P.plan(net, { lat: 34.9, lon: -116.0 }, B, { day: "weekday", depart: 600 });
ok(!r4.ok && r4.reason === "no_stop_near_start", "far origin");

// 5. latestDepartures: the destination's own stop can be left at the target time minus walking.
const ld = P.latestDepartures(net, B, 900, "weekday");
const sB = net.near(B.lat, B.lon, 50)[0].s;
ok(ld[sB] > 880, "latest departure at the destination stop is near the deadline");

console.log(n + " planner checks passed. Trip used:", t.routes[tr[0]][0], "| plan:", r.minutes.toFixed(1), "min,", r.boardings, "bus(es)");

// 6. 300 random real trips: the planner must do at least as well as just riding that trip, forward and backward.
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let checked = 0;
for (let i = 0; i < 300; i++) {
  const tr2 = t.trips[Math.floor(rnd() * t.trips.length)];
  if (!(tr2[1] & 1) || tr2[2].length < 6 || tr2[3][0] >= 1440) continue;
  const a = Math.floor(rnd() * (tr2[2].length - 3)), b = a + 2 + Math.floor(rnd() * (tr2[2].length - a - 2));
  const o = { lat: t.stops[tr2[2][a]][1], lon: t.stops[tr2[2][a]][2] }, d2 = { lat: t.stops[tr2[2][b]][1], lon: t.stops[tr2[2][b]][2] };
  const f = P.plan(net, o, d2, { day: "weekday", depart: tr2[3][a] - 0.5 });
  ok(f.ok && f.arrive <= tr2[3][b] + 1.5, `forward trip ${i}: planner ${f.arrive} vs ride ${tr2[3][b]}`);
  const r = P.plan(net, o, d2, { day: "weekday", arriveBy: tr2[3][b] + 1 });
  ok(r.ok && r.arrive <= tr2[3][b] + 1 + 1e-6, `backward trip ${i}`);
  ok(r.leave >= tr2[3][a] - 90, `leave not absurdly early ${i}`);
  checked++;
}
console.log(checked + " random real trips verified in both directions.");
