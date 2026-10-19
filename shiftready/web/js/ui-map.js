/* The Map tab: who has a bus within a 5-minute walk, hour by hour, plus walking-risk layers. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  let map, layers = {}, ready = false, pickTarget = null, pickMarker = null;

  function mday() { return document.querySelector("input[name=mday]:checked").value; }

  SR.initMap = function () {
    if (ready) { setTimeout(() => map.invalidateSize(), 50); return; }
    ready = true;
    map = L.map("map", { zoomControl: true, preferCanvas: true }).setView(SR.cfg.center || [34.09, -117.3], SR.cfg.zoom || 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.geoJSON(SR.d.boundary, { style: { color: "#1f4fd8", weight: 3, fill: false, dashArray: "6 4" } }).addTo(map);

    layers.people = L.layerGroup().addTo(map);
    layers.stops = L.layerGroup().addTo(map);
    layers.deaths = L.layerGroup();
    layers.corridors = L.layerGroup();
    layers.health = L.layerGroup();

    SR.d.pois.forEach((p) => {
      L.marker([p.lat, p.lon], { title: p.name, keyboard: false }).bindPopup("<b>" + p.name + "</b><br>" + SR.kind(p.kind) + " · " + p.city).addTo(layers.health);
    });
    if (SR.d.deaths) {
      SR.d.deaths.forEach((d) => {
        if (!d[4]) return;   // dark only
        L.circleMarker([d[0], d[1]], { radius: 4, color: "#b3261e", weight: 2, fillOpacity: 0.2 })
          .bindPopup(d[2] + " · " + (d[3] ? t("map.cyclist") : t("map.pedestrian")) + " · " + (d[5] || "")).addTo(layers.deaths);
      });
    }
    if (SR.d.corridors) {
      SR.d.corridors.forEach((c, i) => {
        L.polyline(c.line, { color: "#9a5b00", weight: 5, opacity: 0.85 })
          .bindPopup("<b>" + (c.name || t("map.unnamed")) + "</b><br>" + t("map.rank", { n: i + 1 }) + "<br>" + (c.deaths ? t("map.past_deaths", { n: c.deaths }) : ""))
          .addTo(layers.corridors);
      });
    }

    buildLayerToggles();
    $("#hour").oninput = update;
    document.querySelectorAll("input[name=mday]").forEach((r) => (r.onchange = update));
    map.on("click", (e) => {
      if (!pickTarget) return;
      const label = t("plan.dropped");
      SR.coords[pickTarget] = { lat: e.latlng.lat, lon: e.latlng.lng, label };
      $(pickTarget === "from" ? "#from" : "#to").value = label;
      if (pickMarker) map.removeLayer(pickMarker);
      pickTarget = null;
      $("#pick-banner") && $("#pick-banner").remove();
      SR.showTab("plan");
    });
    update();
  };

  function buildLayerToggles() {
    const box = $("#layers");
    const items = [["people", t("map.l_people"), true], ["stops", t("map.l_stops"), true],
      ["deaths", SR.d.deaths ? t("map.l_deaths") : null, false], ["corridors", SR.d.corridors ? t("map.l_corridors") : null, false],
      ["health", t("map.l_health"), false]].filter((x) => x[1]);
    box.innerHTML = "<h2>" + t("map.layers") + "</h2>" + items.map((i) =>
      '<label><input type="checkbox" data-layer="' + i[0] + '"' + (i[2] ? " checked" : "") + "> " + i[1] + "</label>").join("") +
      '<p class="small">' + t("map.legend") + "</p>";
    box.querySelectorAll("input").forEach((c) => {
      c.onchange = () => (c.checked ? layers[c.dataset.layer].addTo(map) : map.removeLayer(layers[c.dataset.layer]));
    });
  }

  function update() {
    if (!ready) return;
    const day = mday(), h = +$("#hour").value;
    $("#hour-label").textContent = SR.hourLabel(h);
    layers.people.clearLayers();
    SR.d.tracts.forEach((tr) => {
      const on = tr.cov[day][h] === "1", r = 3 + Math.sqrt(tr.pop) / 14;
      const c = L.circleMarker([tr.lat, tr.lon], on
        ? { radius: r, color: "#1f4fd8", weight: 1, fillColor: "#1f4fd8", fillOpacity: tr.in_district ? 0.75 : 0.35 }
        : { radius: r, color: "#b3261e", weight: 2, dashArray: "3 3", fillColor: "#ffffff", fillOpacity: tr.in_district ? 0.6 : 0.2 });
      c.bindPopup("<b>" + SR.tractLabel(tr) + "</b><br>" + SR.num(tr.pop) + " " + t("map.people") + "<br>" +
        (on ? "✓ " + t("map.bus_yes") : "✕ " + t("map.bus_no")) + " (" + SR.hourLabel(h) + ")" +
        (tr.jobs_trans ? "<br>" + SR.num(tr.jobs_trans) + " " + t("plan.wh_jobs") : ""));
      c.addTo(layers.people);
    });
    layers.stops.clearLayers();
    const act = SR.activeStops(day)[h];
    SR.net.stops.forEach((s, i) => {
      L.circleMarker([s[1], s[2]], act[i]
        ? { radius: 2.5, color: "#1f4fd8", weight: 1, fillOpacity: 1, fillColor: "#1f4fd8" }
        : { radius: 1.5, color: "#8a929e", weight: 1, fillOpacity: 0.5 }).addTo(layers.stops);
    });
    stats(day, h);
  }

  let poiStops = null;
  function healthStats(day, h) {
    if (!SR.d.pois.length) return "";
    if (!poiStops) poiStops = SR.d.pois.map((p) => SR.net.near(p.lat, p.lon, 400).map((x) => x.s));
    const act = SR.activeStops(day)[h], by = {};
    SR.d.pois.forEach((p, i) => {
      const k = (by[p.kind] = by[p.kind] || { n: 0, ok: 0 });
      k.n++; if (poiStops[i].some((s) => act[s])) k.ok++;
    });
    return '<div class="stat" style="grid-column:1/-1"><span><b style="font-size:1rem">' + t("map.health", { h: SR.hourLabel(h) }) + "</b><br>" +
      Object.keys(by).map((k) => SR.kind(k) + ": <b>" + by[k].ok + "</b> / " + by[k].n).join(" · ") + "</span></div>";
  }

  function stats(day, h) {
    const r = SR.d.reach[day], noon = 12;
    const tile = (v, vNoon, label) => '<div class="stat"><b>' + SR.pct(v, v < 0.1 ? 1 : 0) + "</b><span>" + label + "<br>" +
      t("map.vs_noon", { n: SR.pct(vNoon) }) + "</span></div>";
    $("#map-stats").innerHTML =
      tile(r.pop_share[h], r.pop_share[noon], t("map.s_people", { c: SR.cfg.short })) +
      tile(r.jobs_share[h], r.jobs_share[noon], t("map.s_jobs", { c: SR.cfg.short })) +
      tile(r.trans_jobs_share_district[h], r.trans_jobs_share_district[noon], t("map.s_wh", { c: SR.cfg.short })) + healthStats(day, h);
    curve(day, h);
  }

  function curve(day, h) {
    const r = SR.d.reach[day], W = 640, H = 200, L0 = 36, B = 24, Tt = 10;
    const x = (i) => L0 + (i / 23) * (W - L0 - 8), y = (v) => H - B - v * (H - B - Tt);
    const line = (arr, col, dash) => '<polyline fill="none" stroke="' + col + '" stroke-width="2.5" ' + (dash ? 'stroke-dasharray="' + dash + '"' : "") +
      ' points="' + arr.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ") + '"/>';
    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + t("map.curve_alt") + '" style="width:100%;height:auto">';
    [0, 0.25, 0.5, 0.75, 1].forEach((g) => {
      svg += '<line x1="' + L0 + '" x2="' + (W - 8) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="var(--line)"/><text x="2" y="' + (y(g) + 4) + '">' + Math.round(g * 100) + "%</text>";
    });
    [0, 6, 12, 18, 23].forEach((i) => (svg += '<text x="' + (x(i) - 8) + '" y="' + (H - 6) + '">' + SR.hourLabel(i) + "</text>"));
    svg += line(r.pop_share, "#1f4fd8") + line(r.jobs_share, "#6b7686", "6 3") + line(r.trans_jobs_share_district, "#9a5b00", "2 3");
    svg += '<line x1="' + x(h) + '" x2="' + x(h) + '" y1="' + Tt + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1.5"/></svg>';
    svg += '<div class="small"><b style="color:#1f4fd8">—</b> ' + t("map.s_people", { c: SR.cfg.short }) + " &nbsp; <b>- -</b> " + t("map.s_jobs", { c: SR.cfg.short }) +
      " &nbsp; <b style='color:#9a5b00'>···</b> " + t("map.s_wh", { c: SR.cfg.short }) + "</div>";
    $("#curve").innerHTML = svg;
  }

  SR.pickOnMap = function (which) {
    pickTarget = which;
    SR.showTab("map");
    const b = document.createElement("div");
    b.id = "pick-banner"; b.className = "notice"; b.setAttribute("role", "alert");
    b.textContent = which === "from" ? t("map.pick_from") : t("map.pick_to");
    $("#tab-map").insertBefore(b, $("#map"));
  };

  /** Draw a plan: dashed walking lines, solid bus lines along the trip's own stops, pins at both ends. */
  SR.showPlanOnMap = function (R) {
    SR.showTab("map");
    if (layers.plan) map.removeLayer(layers.plan);
    layers.plan = L.layerGroup().addTo(map);
    const P = R.main;
    if (!P || !P.ok) return;
    const pts = [[R.from.lat, R.from.lon], [R.to.lat, R.to.lon]];
    L.marker(pts[0], { title: t("plan.from") }).addTo(layers.plan).bindPopup(t("plan.from") + ": " + (R.from.label || ""));
    L.marker(pts[1], { title: t("plan.to") }).addTo(layers.plan).bindPopup(t("plan.to") + ": " + (R.to.label || ""));
    const stop = (i) => [SR.net.stops[i][1], SR.net.stops[i][2]];
    let prev = pts[0];
    P.legs.forEach((l, k) => {
      if (l.k === "bus") {
        const seq = SR.d.transit.trips[l.trip][2];
        const a = seq.indexOf(l.fromStop), b = seq.indexOf(l.toStop, a);
        const line = (b >= a ? seq.slice(a, b + 1) : [l.fromStop, l.toStop]).map(stop);
        L.polyline(prev.concat ? [prev, line[0]] : line, { color: "#6b7686", weight: 3, dashArray: "4 6" }).addTo(layers.plan);
        L.polyline(line, { color: "#1f4fd8", weight: 6, opacity: 0.9 }).bindPopup(t("leg.bus", { r: SR.routeName(l.route) }) + " " + SR.hm(l.dep)).addTo(layers.plan);
        prev = line[line.length - 1];
      }
    });
    L.polyline([prev, pts[1]], { color: "#6b7686", weight: 3, dashArray: "4 6" }).addTo(layers.plan);
    map.fitBounds(L.latLngBounds(pts.concat([prev])).pad(0.3));
    setTimeout(() => $("#map").scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  SR.mapUpdate = update;
})();
