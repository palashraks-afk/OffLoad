/* Shared state, data loading and small helpers. Everything lives under window.SR. */
(function () {
  "use strict";
  const SR = (window.SR = window.SR || {});
  SR.region = new URLSearchParams(location.search).get("r") || "ca33";
  SR.lang = "en";
  SR.d = {};
  SR.coords = { from: null, to: null };

  const FILES = ["transit", "tracts", "reach", "sheds", "blocks", "boundary", "places", "pois"];
  const OPTIONAL = ["safety", "risk_report", "deaths", "corridors", "region"];

  async function getJSON(path, optional) {
    try {
      const r = await fetch(path);
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      if (optional) return null;
      throw e;
    }
  }

  let regionsP = null, reachCache = {};
  SR.getRegions = function () {
    if (!regionsP) regionsP = getJSON("data/regions.json", true).then((r) => r || []);
    return regionsP;
  };
  SR.getReach = function (rid) {
    if (!reachCache[rid]) reachCache[rid] = rid === SR.region && SR.d.reach ? Promise.resolve(SR.d.reach) : getJSON("data/" + rid + "/reach.json", true);
    return reachCache[rid];
  };

  SR.load = async function () {
    const base = "data/" + SR.region + "/";
    const jobs = FILES.map((f) => getJSON(base + f + ".json").then((v) => (SR.d[f] = v)));
    OPTIONAL.forEach((f) => jobs.push(getJSON(base + f + ".json", true).then((v) => (SR.d[f] = v))));
    await Promise.all(jobs);
    // Trips are stored as [route, days, stops, first time, steps in 0.1 min, headsign]; expand to [route, days, stops, times, headsign].
    SR.d.transit.trips = SR.d.transit.trips.map((x) => {
      const times = [x[3]];
      for (const s of x[4]) times.push(times[times.length - 1] + s / 10);
      return [x[0], x[1], x[2], times, x[5]];
    });
    SR.net = new Planner.Network(SR.d.transit);
    SR.tractById = {};
    SR.d.tracts.forEach((t) => (SR.tractById[t.id] = t));
    SR.cfg = SR.d.region || { short: "CA-33", name: "California's 33rd District", agency: SR.d.transit.agency };
  };

  // ---- formatting -------------------------------------------------------------------------
  SR.hm = function (min) {            // 1350 -> "10:30 PM"
    let m = Math.round(((min % 1440) + 1440) % 1440);
    const h = Math.floor(m / 60), mm = m % 60;
    const ap = h >= 12 ? "PM" : "AM";
    return ((h + 11) % 12 + 1) + ":" + String(mm).padStart(2, "0") + " " + ap;
  };
  SR.hourLabel = function (h) { return ((h + 11) % 12 + 1) + " " + (h % 24 >= 12 ? "PM" : "AM"); };
  SR.pct = function (x, digits) { return (x * 100).toFixed(digits == null ? 0 : digits) + "%"; };
  SR.parseTime = function (s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  SR.num = function (n) { return Math.round(n).toLocaleString(SR.lang === "es" ? "es-US" : "en-US"); };
  SR.nextDay = function (d) { return d === "weekday" ? "weekday" : d === "saturday" ? "sunday" : "weekday"; };

  SR.kind = function (k) { const s = SR.STR[SR.lang]; return (s && s["kind." + k]) || k; };
  SR.stopName = function (i) { return SR.d.transit.stops[i][0]; };
  SR.routeName = function (r) { const x = SR.d.transit.routes[r]; return x[0]; };
  SR.routeLong = function (r) { return SR.d.transit.routes[r][1]; };

  /** Which stops have a departure in this hour? Cached per day. */
  SR._active = {};
  SR.activeStops = function (day) {
    if (SR._active[day]) return SR._active[day];
    const C = SR.net.connections(day, false), n = SR.net.stops.length;
    const a = [];
    for (let h = 0; h < 24; h++) a.push(new Uint8Array(n));
    for (let i = 0; i < C.n; i++) {
      const t = C.depT[i];
      if (t < 0) continue;
      a[Math.floor(t / 60) % 24][C.dep[i]] = 1;
    }
    return (SR._active[day] = a);
  };

  /** Nearest tract center to a point (for labels and commute-shed lookups). */
  SR.nearestTract = function (lat, lon, onlyWithShed) {
    let best = null, bd = Infinity;
    for (const t of SR.d.tracts) {
      if (onlyWithShed && !SR.d.sheds[t.id]) continue;
      const d = Planner.hav(lat, lon, t.lat, t.lon);
      if (d < bd) { bd = d; best = t; }
    }
    return best ? { tract: best, d: bd } : null;
  };

  SR.nearestPlace = function (lat, lon) {
    let best = "", bd = Infinity;
    const c = SR.d.places.cities;
    for (const k in c) { const d = Planner.hav(lat, lon, c[k][0], c[k][1]); if (d < bd) { bd = d; best = k; } }
    return best;
  };

  SR.tractLabel = function (t) {
    return (t.place ? t.place : SR.nearestPlace(t.lat, t.lon)) + " (" + t.id.slice(-6) + ")";
  };
})();
