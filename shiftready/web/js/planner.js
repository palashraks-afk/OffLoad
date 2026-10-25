/* Trip planner: connection scan over a GTFS timetable. Works in the browser and in Node.
 *
 * Time is minutes after midnight. Walking uses straight-line distance x 1.3 at 80 m/min
 * (no street network), so walking times are estimates.
 * "Arrive by" searches run the same scan on a time-reversed copy of the timetable.
 */
(function (root) {
  "use strict";

  const WALK_SPEED = 80;       // metres per minute (4.8 km/h)
  const DETOUR = 1.3;          // straight line -> street distance
  const TRANSFER_BUFFER = 1;   // minutes needed to change buses
  const TRANSFER_WALK_M = 250; // stops this close count as the same place
  const DAY_BIT = { weekday: 1, saturday: 2, sunday: 4 };

  function hav(lat1, lon1, lat2, lon2) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const walkMeters = (m) => m * DETOUR;
  const walkMinutes = (straight) => walkMeters(straight) / WALK_SPEED;

  class Network {
    constructor(transit) {
      this.t = transit;
      this.stops = transit.stops;
      this.cell = 0.01;
      this.grid = new Map();
      this.stops.forEach((s, i) => {
        const k = this._key(s[1], s[2]);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(i);
      });
      this._conn = {};
      this._nbr = new Map();
    }
    _key(lat, lon) { return Math.floor(lat / this.cell) + "," + Math.floor(lon / this.cell); }

    /** Stops within `maxStraight` metres (straight line), nearest first. */
    near(lat, lon, maxStraight) {
      const span = Math.ceil(maxStraight / 1000 / 1.0) + 1; // cells of ~1.1 km
      const ci = Math.floor(lat / this.cell), cj = Math.floor(lon / this.cell);
      const out = [];
      for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) {
        const list = this.grid.get((ci + i) + "," + (cj + j));
        if (!list) continue;
        for (const s of list) {
          const d = hav(lat, lon, this.stops[s][1], this.stops[s][2]);
          if (d <= maxStraight) out.push({ s, d });
        }
      }
      return out.sort((a, b) => a.d - b.d);
    }

    neighbours(s) {
      if (!this._nbr.has(s)) {
        const st = this.stops[s];
        this._nbr.set(s, this.near(st[1], st[2], TRANSFER_WALK_M).filter((x) => x.s !== s)
          .map((x) => ({ s: x.s, t: walkMinutes(x.d) + 1 })));
      }
      return this._nbr.get(s);
    }

    /** Connections for a service day, sorted by departure. `reverse` flips time for arrive-by searches. */
    connections(day, reverse) {
      const key = day + (reverse ? "r" : "f");
      if (this._conn[key]) return this._conn[key];
      const bit = DAY_BIT[day];
      const dep = [], arr = [], dT = [], aT = [], trip = [], seq = [];
      this.t.trips.forEach((tr, ti) => {
        if (!(tr[1] & bit)) return;
        const st = tr[2], tm = tr[3];
        for (let k = 0; k < st.length - 1; k++) {
          for (const shift of [0, -1440]) {          // shift -1440: yesterday's trip running past midnight
            const a = tm[k] + shift, b = tm[k + 1] + shift;
            if (shift && tm[k] < 1440) continue;
            if (reverse) { dep.push(st[k + 1]); arr.push(st[k]); dT.push(-b); aT.push(-a); }
            else { dep.push(st[k]); arr.push(st[k + 1]); dT.push(a); aT.push(b); }
            trip.push(ti + (shift ? this.t.trips.length : 0));
            seq.push(reverse ? -k : k);
          }
        }
      });
      // ties in time are broken by position along the trip, so a stop with zero dwell is passed in the right order (forward and reversed)
      const idx = dT.map((_, i) => i).sort((x, y) => dT[x] - dT[y] || seq[x] - seq[y]);
      const C = { n: idx.length, dep: new Int32Array(idx.map((i) => dep[i])), arr: new Int32Array(idx.map((i) => arr[i])),
        depT: new Float64Array(idx.map((i) => dT[i])), arrT: new Float64Array(idx.map((i) => aT[i])),
        trip: new Int32Array(idx.map((i) => trip[i])), seq: new Int32Array(idx.map((i) => seq[i])) };
      this._conn[key] = C;
      return C;
    }
  }

  /** Core scan. `start` = [{s, t}] initial arrivals. Returns best arrival per stop and how it was reached. */
  function scan(net, C, start, cutoff) {
    const ns = net.stops.length;
    const arr = new Float64Array(ns).fill(Infinity);
    const mode = new Uint8Array(ns);          // 0 = on foot, 1 = off a bus
    const pred = new Array(ns).fill(null);
    const nTrips = net.t.trips.length * 2;
    const board = new Int32Array(nTrips).fill(-1);

    const relax = (s, t) => {
      for (const nb of net.neighbours(s)) {
        if (t + nb.t < arr[nb.s]) { arr[nb.s] = t + nb.t; mode[nb.s] = 0; pred[nb.s] = { k: "walk", from: s }; }
      }
    };
    let t0 = Infinity;
    for (const it of start) {
      if (it.t < arr[it.s]) { arr[it.s] = it.t; mode[it.s] = 0; pred[it.s] = { k: "access", t: it.t }; }
      t0 = Math.min(t0, it.t);
    }
    for (const it of start) relax(it.s, arr[it.s]);

    let lo = 0, hi = C.n;                       // first connection leaving at or after t0
    while (lo < hi) { const m = (lo + hi) >> 1; if (C.depT[m] < t0) lo = m + 1; else hi = m; }
    for (let i = lo; i < C.n; i++) {
      if (C.depT[i] > cutoff) break;
      const tr = C.trip[i], d = C.dep[i], a = C.arr[i];
      if (board[tr] < 0) {
        const need = mode[d] === 1 ? TRANSFER_BUFFER : 0;
        if (arr[d] + need <= C.depT[i]) board[tr] = i;
      }
      if (board[tr] >= 0 && C.arrT[i] < arr[a]) {
        arr[a] = C.arrT[i]; mode[a] = 1; pred[a] = { k: "trip", c0: board[tr], c1: i };
        relax(a, C.arrT[i]);
      }
    }
    return { arr, pred, C };
  }

  function legsFrom(net, res, endStop, reverse) {
    const { pred, C } = res;
    const legs = [];
    let s = endStop, guard = 0;
    while (pred[s] && guard++ < 50) {
      const p = pred[s];
      if (p.k === "access") break;
      if (p.k === "walk") {
        const a = net.stops[p.from], b = net.stops[s];
        const m = walkMeters(hav(a[1], a[2], b[1], b[2]));
        legs.push({ k: "walk", fromStop: p.from, toStop: s, m, min: m / WALK_SPEED, transfer: true });
        s = p.from;
      } else {
        const tripIdx = C.trip[p.c1] % net.t.trips.length;
        const tr = net.t.trips[tripIdx];
        const fromStop = C.dep[p.c0], toStop = C.arr[p.c1];
        const dep = reverse ? -C.arrT[p.c1] : C.depT[p.c0], arrv = reverse ? -C.depT[p.c0] : C.arrT[p.c1];
        legs.push({ k: "bus", trip: tripIdx, route: tr[0], headsign: tr[4], fromStop, toStop, dep, arr: arrv,
          stops: Math.abs(C.seq[p.c1] - C.seq[p.c0]) + 1 });
        s = fromStop;
      }
    }
    return legs; // built from the end back to the start of the scan
  }

  /**
   * Plan one trip.
   *  opts: { day, depart }  -> earliest arrival leaving at `depart`
   *        { day, arriveBy } -> latest departure arriving by `arriveBy`
   *        maxWalk (straight-line metres to a stop, default 800)
   * Returns null if no bus trip works.
   */
  function plan(net, from, to, opts) {
    const maxWalk = opts.maxWalk || 800;
    const reverse = opts.arriveBy != null;
    const C = net.connections(opts.day, reverse);
    const startPt = reverse ? to : from, endPt = reverse ? from : to;
    const t0 = reverse ? -opts.arriveBy : opts.depart;
    const start = net.near(startPt.lat, startPt.lon, maxWalk).map((x) => ({ s: x.s, t: t0 + walkMinutes(x.d) }));
    if (!start.length) return { ok: false, reason: reverse ? "no_stop_near_end" : "no_stop_near_start" };
    const res = scan(net, C, start, t0 + 360);
    let best = null;
    const endStops = net.near(endPt.lat, endPt.lon, maxWalk);
    if (!endStops.length) return { ok: false, reason: reverse ? "no_stop_near_start" : "no_stop_near_end" };
    for (const x of endStops) {
      const t = res.arr[x.s] + walkMinutes(x.d);
      if (t < (best ? best.t : Infinity)) best = { s: x.s, t, d: x.d };
    }
    if (!best || !isFinite(best.t)) return { ok: false, reason: "no_service" };
    const raw = legsFrom(net, res, best.s, reverse).reverse();   // in scan order (start of scan first)
    let legs = raw;
    if (reverse) {   // scan ran from the destination backwards: flip to origin -> destination
      legs = raw.slice().reverse().map((l) => Object.assign({}, l, { fromStop: l.toStop, toStop: l.fromStop }));
    }
    const firstBus = legs.findIndex((l) => l.k === "bus");
    if (firstBus < 0) return { ok: false, reason: "no_service" };
    const lastBus = legs.length - 1 - legs.slice().reverse().findIndex((l) => l.k === "bus");
    const sp = (i) => ({ lat: net.stops[i][1], lon: net.stops[i][2] });
    const aStop = legs[0].fromStop, zStop = legs[legs.length - 1].toStop;
    const accessD = hav(from.lat, from.lon, sp(aStop).lat, sp(aStop).lon);
    const egressD = hav(to.lat, to.lon, sp(zStop).lat, sp(zStop).lon);
    const before = legs.slice(0, firstBus).reduce((a, l) => a + l.min, 0) + walkMinutes(accessD);
    const after = legs.slice(lastBus + 1).reduce((a, l) => a + l.min, 0) + walkMinutes(egressD);
    const full = [{ k: "walk", to: aStop, m: walkMeters(accessD), min: walkMinutes(accessD), end: "start" }]
      .concat(legs, [{ k: "walk", from: zStop, m: walkMeters(egressD), min: walkMinutes(egressD), end: "finish" }]);
    const leave = legs[firstBus].dep - before, arrive = legs[lastBus].arr + after;
    const result = {
      ok: true, legs: full, leave, arrive, minutes: arrive - leave,
      boardings: legs.filter((l) => l.k === "bus").length,
      walkM: full.filter((l) => l.k === "walk").reduce((x, l) => x + l.m, 0),
    };
    if (reverse) {
      // The backward scan finds the latest time you can leave; a forward scan from that time gives the most direct trip.
      const f = plan(net, from, to, { day: opts.day, depart: leave - 0.01, maxWalk: opts.maxWalk });
      if (f.ok && f.arrive <= opts.arriveBy + 1e-6) return f;
    }
    return result;
  }

  /** Earliest arrival (minutes) at every stop for someone leaving (lat,lon) at `depart`; Infinity = not reachable within `horizon` minutes. */
  function earliestArrivals(net, origin, day, depart, maxWalk, horizon) {
    const C = net.connections(day, false);
    const start = net.near(origin.lat, origin.lon, maxWalk || 800).map((x) => ({ s: x.s, t: depart + walkMinutes(x.d) }));
    return scan(net, C, start, depart + (horizon || 120)).arr;
  }

  /** Latest time you can leave each stop and still arrive at (lat,lon) by T. -Infinity = cannot. */
  function latestDepartures(net, dest, T, day, maxWalk) {
    const C = net.connections(day, true);
    const start = net.near(dest.lat, dest.lon, maxWalk || 800).map((x) => ({ s: x.s, t: -T + walkMinutes(x.d) }));
    const res = scan(net, C, start, -T + 240);
    return Float64Array.from(res.arr, (v) => (isFinite(v) ? -v : -Infinity));
  }

  /** Can someone at (lat,lon) get to a destination by T? Uses output of latestDepartures. */
  function canReachFrom(net, ld, lat, lon, T, maxWalk, maxTripMinutes) {
    for (const x of net.near(lat, lon, maxWalk || 800)) {
      if (ld[x.s] - walkMinutes(x.d) >= T - (maxTripMinutes || 120)) return true;
    }
    return false;
  }

  /** Departures from stops within walking distance during an hour: is there bus service there then? */
  function hasService(net, lat, lon, day, hour, maxStraight) {
    const C = net.connections(day, false);
    const near = new Set(net.near(lat, lon, maxStraight || 400).map((x) => x.s));
    if (!near.size) return false;
    for (let i = 0; i < C.n; i++) {
      const t = C.depT[i];
      if (t >= (hour + 1) * 60) break;
      if (t >= hour * 60 && near.has(C.dep[i])) return true;
    }
    return false;
  }

  const api = { Network, plan, earliestArrivals, latestDepartures, canReachFrom, hasService, hav, walkMinutes, walkMeters, DAY_BIT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Planner = api;
})(typeof window !== "undefined" ? window : globalThis);
