/* The Reach tab: from one spot, how far and how many jobs can you reach by bus, by walking, at different hours? */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COMPARE_HOURS = [6, 9, 14, 18, 22, 23];
  let rb = null, map = null, layer = null, origin = null, access = null;

  function opts() {
    return { day: $("#r-day").value, depart: SR.parseTime($("#r-time").value), budget: +$("#r-budget").value };
  }

  SR.initReach = function () {
    $("#r-go").onclick = run;
    $("#r-loc").onclick = async () => {
      const g = await SR.useMyLocation({ say: (m, k) => { $("#r-out").innerHTML = '<div class="notice">' + m + "</div>"; } });
      if (g) { origin = g; $("#r-from").value = g.label; run(); }
    };
    $("#r-from").oninput = () => { origin = null; };
    $("#r-day").innerHTML = ["weekday", "saturday", "sunday"].map((d) => '<option value="' + d + '">' + t("day." + d) + "</option>").join("");
    $("#r-budget").innerHTML = [30, 45, 60, 90].map((m) => '<option value="' + m + '"' + (m === 60 ? " selected" : "") + ">" + t("reach.min", { n: m }) + "</option>").join("");
    $("#r-presets").innerHTML = "";
    [["05:00", "preset.early"], ["15:00", "preset.swing"], ["22:00", "preset.night"]].forEach(([tm, k]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = t(k);
      b.onclick = () => { $("#r-time").value = tm; if (origin) run(); };
      $("#r-presets").append(b);
    });
  };

  SR.setReachOrigin = function (p) { origin = p; run(); };
  SR.reachTheme = function () { if (!map) return; rb.setStyle({ color: SR.C("--map") }); if (origin) run(); };
  SR.refreshReach = function () { if (map) map.invalidateSize(); };

  SR.initReachMap = function () {
    if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
    map = L.map("reach-map", { preferCanvas: true }).setView(SR.cfg.center || [34.09, -117.3], SR.cfg.zoom || 11);
    SR.addTiles(map);
    rb = L.geoJSON(SR.d.boundary, { style: { color: SR.C("--map"), weight: 2.5, fill: false, dashArray: "6 4" } }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      origin = { lat: e.latlng.lat, lon: e.latlng.lng, label: t("plan.dropped") };
      $("#r-from").value = t("plan.dropped");
      run();
    });
    if (origin) run();
  };

  function ensureAccess() {
    if (access) return access;
    access = {
      blocks: SR.d.blocks.map((b) => SR.net.near(b[0], b[1], 800).map((x) => [x.s, Planner.walkMinutes(x.d)])),
      tracts: SR.d.tracts.map((x) => SR.net.near(x.lat, x.lon, 800).map((y) => [y.s, Planner.walkMinutes(y.d)])),
    };
    return access;
  }

  /** Jobs and people reachable within `budget` minutes of leaving `origin` at `depart`, by bus and on foot alone. */
  function reach(o, day, depart, budget) {
    const A = ensureAccess();
    const arr = Planner.earliestArrivals(SR.net, o, day, depart, 800, budget + 5);
    const limit = depart + budget;
    const r = { jobs: 0, trans: 0, health: 0, people: 0, footJobs: 0, footTrans: 0, stopsReached: 0, arr };
    SR.d.blocks.forEach((b, i) => {
      let ok = false;
      for (const [s, w] of A.blocks[i]) if (arr[s] + w <= limit) { ok = true; break; }
      const walkM = Planner.hav(o.lat, o.lon, b[0], b[1]) * 1.3;
      const foot = walkM / 80 <= budget;
      if (ok || foot) { r.jobs += b[2]; r.trans += b[3]; r.health += b[4]; }
      if (foot) { r.footJobs += b[2]; r.footTrans += b[3]; }
    });
    SR.d.tracts.forEach((x, i) => {
      let ok = Planner.hav(o.lat, o.lon, x.lat, x.lon) * 1.3 / 80 <= budget;
      if (!ok) for (const [s, w] of A.tracts[i]) if (arr[s] + w <= limit) { ok = true; break; }
      if (ok) r.people += x.pop;
    });
    for (let s = 0; s < arr.length; s++) if (arr[s] <= limit) r.stopsReached++;
    return r;
  }

  async function run() {
    const out = $("#r-out");
    if (!origin) {
      out.innerHTML = '<div class="empty">' + t("reach.working") + "</div>";
      origin = await SR.geocode($("#r-from").value);
      if (!origin) { out.innerHTML = '<div class="notice">' + t("plan.need_places") + "</div>"; return; }
    }
    SR.initReachMap();
    await new Promise((r) => setTimeout(r, 20));
    const { day, depart, budget } = opts();
    const R = reach(origin, day, depart, budget);
    draw(R, depart, budget);
    let h = '<div class="kv"><div><b>' + SR.num(R.jobs) + "</b><span>" + t("reach.jobs", { m: budget }) + "</span></div>" +
      "<div><b>" + SR.num(R.trans) + "</b><span>" + t("reach.trans") + "</span></div>" +
      "<div><b>" + SR.num(R.health) + "</b><span>" + t("reach.health") + "</span></div>" +
      "<div><b>" + SR.num(R.people) + "</b><span>" + t("reach.people") + "</span></div></div>" +
      '<p class="small">' + t("reach.foot", { n: SR.num(R.footJobs), t: SR.num(R.footTrans) }) + "</p>";
    // the same spot at other hours
    const rows = COMPARE_HOURS.map((hr) => {
      // timetables are lumpy, so average four departures inside each hour
      const xs = [0, 15, 30, 45].map((m) => reach(origin, day, hr * 60 + m, budget));
      const avg = (k) => xs.reduce((a, x) => a + x[k], 0) / xs.length;
      return [SR.hourLabel(hr), SR.num(avg("jobs")), SR.num(avg("trans")), SR.num(avg("stopsReached"))];
    });
    SR.reachRows = rows;
    h += "<h3>" + t("reach.compare", { m: budget }) + "</h3>" + compareTable(rows) + '<p class="small">' + t("reach.note") + "</p>";
    out.innerHTML = h;
  }

  function compareTable(rows) {
    const max = Math.max(...rows.map((r) => +r[1].replace(/[^0-9]/g, "")), 1);
    return "<table><thead><tr><th>" + t("reach.leave") + '</th><th class="num">' + t("reach.col_jobs") + '</th><th class="num">' + t("reach.col_trans") +
      '</th><th class="num">' + t("reach.col_stops") + "</th><th></th></tr></thead><tbody>" +
      rows.map((r) => "<tr><td>" + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td><td style="width:28%"><div class="bar" style="width:' +
        Math.max(2, (+r[1].replace(/[^0-9]/g, "") / max) * 100) + '%"></div></td></tr>').join("") + "</tbody></table>";
  }

  function draw(R, depart, budget) {
    layer.clearLayers();
    const bands = [budget / 3, (2 * budget) / 3, budget];
    const style = [{ r: 5, c: SR.C("--map"), o: 1 }, { r: 4, c: SR.C("--map"), o: 0.65 }, { r: 3, c: SR.C("--map"), o: 0.35 }];
    SR.net.stops.forEach((s, i) => {
      const dt = R.arr[i] - depart;
      if (!(dt <= budget)) return;
      const k = dt <= bands[0] ? 0 : dt <= bands[1] ? 1 : 2;
      L.circleMarker([s[1], s[2]], { radius: style[k].r, color: SR.C("--map"), weight: 1, fillColor: style[k].c, fillOpacity: style[k].o })
        .bindPopup("<b>" + esc(s[0]) + "</b><br>" + t("reach.arrive_in", { n: Math.round(dt) })).addTo(layer);
    });
    L.circleMarker([origin.lat, origin.lon], { radius: 9, color: SR.C("--ink"), weight: 3, fillColor: SR.C("--surface"), fillOpacity: 1 }).addTo(layer);
    $("#r-legend").innerHTML = t("reach.legend", { a: Math.round(bands[0]), b: Math.round(bands[1]), c: budget });
    if (!R.stopsReached) map.setView([origin.lat, origin.lon], 13);
    else {
      const pts = [[origin.lat, origin.lon]];
      SR.net.stops.forEach((s, i) => { if (R.arr[i] - depart <= budget) pts.push([s[1], s[2]]); });
      map.fitBounds(L.latLngBounds(pts).pad(0.1), { maxZoom: 14 });
    }
  }
})();
