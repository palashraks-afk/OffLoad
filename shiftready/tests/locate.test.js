// "Use my location" in every outcome, with a stand-in for the browser's geolocation.  node shiftready/tests/locate.test.js
const fs = require("fs"), path = require("path"), assert = require("assert"), vm = require("vm");
const web = path.join(__dirname, "../web");
const store = {};
const ctx = { console, Math, Promise, setTimeout, JSON, Object, Array, Date, Infinity, isFinite, Number, String };
ctx.window = ctx; ctx.sessionStorage = { setItem: (k, v) => (store[k] = v) };
ctx.document = { querySelector: () => null };
ctx.navigator = {};
vm.createContext(ctx);
for (const f of ["i18n", "planner", "geocode"]) vm.runInContext(fs.readFileSync(path.join(web, `js/${f}.js`), "utf8"), ctx, { filename: f });
const SR = ctx.SR;
SR.lang = "en"; SR.t = (k, v) => { let s = SR.STR.en[k] || k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => (v[x] != null ? v[x] : "{" + x + "}")); return s; };
SR.d = { places: { cities: { Fontana: [34.0922, -117.435], Rialto: [34.1, -117.37] }, zips: {} }, boundary: { geometry: { coordinates: [] } } };
SR.cfg = { center: [34.0905, -117.3], short: "CA-33" };
SR.nearestPlace = (lat, lon) => "Fontana";
SR.getRegions = async () => [{ id: "ca33", label: "San Bernardino, CA", center: [34.0905, -117.3] }, { id: "cle", label: "Cleveland, OH", center: [41.49, -81.68] }];
SR.region = "ca33";
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const pos = (lat, lon) => ({ coords: { latitude: lat, longitude: lon, accuracy: 20 } });
const geo = (script) => { let i = 0; ctx.navigator.geolocation = { getCurrentPosition: (s, e) => { const r = script[Math.min(i++, script.length - 1)]; r.ok ? s(pos(...r.ok)) : e({ code: r.err }); } }; return () => i; };

(async () => {
  geo([{ ok: [34.09, -117.43] }]);
  let g = await SR.locate();
  ok(Math.abs(g.lat - 34.09) < 1e-9 && g.label === "near Fontana", "works and names the place");
  ok(store["sr.loc"], "remembered for the session");

  geo([{ err: 1 }]);
  await SR.locate().then(() => ok(false, "should reject"), (e) => ok(e.code === "denied", "denied is reported as denied"));

  const calls = geo([{ err: 3 }, { ok: [34.1, -117.4] }]);
  g = await SR.locate(); ok(calls() === 2 && g.lat === 34.1, "a timeout is retried once and then works");

  geo([{ err: 2 }, { err: 2 }]);
  await SR.locate().then(() => ok(false), (e) => ok(e.code === "unavailable", "unavailable after the retry"));

  geo([{ err: 3 }, { err: 3 }]);
  await SR.locate().then(() => ok(false), (e) => ok(e.code === "timeout", "timeout after the retry"));

  ctx.navigator.geolocation = undefined;
  await SR.locate().then(() => ok(false), (e) => ok(e.code === "unsupported", "no geolocation support"));

  ok((await SR.regionCheck(34.1, -117.4)).inside === true, "inside the region");
  const out = await SR.regionCheck(41.5, -81.7); ok(!out.inside && out.suggest && out.suggest.id === "cle", "near another region: suggests switching");
  const far = await SR.regionCheck(40.0, -100.0); ok(!far.inside && !far.suggest && far.km > 100, "far from everything");

  // the whole story, with messages
  const said = [];
  geo([{ ok: [34.09, -117.43] }]);
  g = await SR.useMyLocation({ say: (m, k) => said.push(k) }); ok(g && said.join() === "info,ok", "ok flow: " + said.join());
  said.length = 0; geo([{ err: 1 }]);
  g = await SR.useMyLocation({ say: (m, k) => said.push(m) }); ok(g === null && /blocked/.test(said[1]), "denied shows how to fix it");
  said.length = 0; geo([{ ok: [41.5, -81.7] }]);
  g = await SR.useMyLocation({ say: (m, k, act) => said.push(typeof act) }); ok(g === null && said[1] === "function", "other region offers a switch button");
  console.log(n + " location checks passed.");
})().catch((e) => { console.error(e); process.exit(1); });
