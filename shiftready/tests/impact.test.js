// Checks the pure helpers in impact.js (heat/air/UV bands, day matching, cost).  node shiftready/tests/impact.test.js
const assert = require("assert"), path = require("path");
global.window = { SR: { t: (k) => k, cfg: { id: "ca33" } } };
const I = require(path.join(__dirname, "../web/js/impact.js"));
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); n++; };
eq(I.heatCategory(70), "none"); eq(I.heatCategory(85), "caution"); eq(I.heatCategory(95), "extreme_caution"); eq(I.heatCategory(105), "danger"); eq(I.heatCategory(126), "extreme_danger"); eq(I.heatCategory(20), "cold");
eq(I.aqiCategory(40), "good"); eq(I.aqiCategory(80), "moderate"); eq(I.aqiCategory(120), "sensitive"); eq(I.aqiCategory(180), "unhealthy"); eq(I.aqiCategory(250), "very_unhealthy"); eq(I.aqiCategory(400), "hazardous");
eq(I.uvCategory(1), "low"); eq(I.uvCategory(4), "moderate"); eq(I.uvCategory(7), "high"); eq(I.uvCategory(9), "very_high"); eq(I.uvCategory(12), "extreme");
eq(I.dayType("2026-10-24"), "saturday", "Oct 24 2026 is a Saturday"); eq(I.dayType("2026-10-25"), "sunday"); eq(I.dayType("2026-10-26"), "weekday");
eq(I.addDays("2026-10-31", 1), "2026-11-01"); eq(I.addDays("2026-12-31", 1), "2027-01-01");
const dates = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];
eq(I.pickDate(dates, "2026-10-24T22:15", "saturday", 23 * 60), "2026-10-24", "later today counts");
eq(I.pickDate(dates, "2026-10-24T22:15", "saturday", 8 * 60), null, "earlier today has passed and no other Saturday in range");
eq(I.pickDate(dates, "2026-10-24T22:15", "weekday", 8 * 60), "2026-10-26", "next weekday");
eq(I.pickDate(dates, "2026-10-24T22:15", "sunday", 1500), "2026-10-25", "after-midnight minutes wrap");
const c = I.costPerYear(4, 141); eq(Math.round(c.allDays), 205860, "4 bus-hours x 365 x $141"); eq(Math.round(c.weekdays), 141000, "4 x 250 x 141");
eq(I.feedStatus("20270103", "20261025"), "ok"); eq(I.feedStatus("20261110", "20261025"), "soon"); eq(I.feedStatus("20261024", "20261025"), "expired"); eq(I.feedStatus("", "20261025"), null, "no date, no claim");
console.log(n + " impact checks passed.");
