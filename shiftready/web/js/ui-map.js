/* The Map tab. A full-height map with a floating control panel.
 * Blue halos are the places within a 5-minute walk of a bus at the chosen hour; press play to watch them disappear overnight.
 * Tap any spot for a short report: bus, jobs and past deaths within walking distance. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  };
  let haloArr, dotArr, tractArr, jobArr, halo, dots, tractC, jobC;
  let map, layers = {}, ready = false, pickTarget = null, timer = null, spot = null, jobStops = null, poiStops = null;

  const mday = () => document.querySelector("input[name=mday]:checked").value;

  // OpenStreetMap's own tiles (no key needed), calmed to grey with CSS so the data layers carry the colour.
  SR.addTiles = function (m) {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
  };

  SR.initMap = function () {
    if (ready) { setTimeout(() => map.invalidateSize(), 50); return; }
    ready = true;
    map = L.map("map", { zoomControl: false, preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5 }).setView(SR.cfg.center || [34.09, -117.3], SR.cfg.zoom || 11);
    SR._map = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    SR.addTiles(map);
    const bnd = L.geoJSON(SR.d.boundary, { style: { color: "#0b3d91", weight: 2.5, fill: false, dashArray: "7 5" }, interactive: false }).addTo(map);
    SR.fitDistrict = function () {
      const wide = window.innerWidth >= 900;
      map.fitBounds(bnd.getBounds(), { paddingTopLeft: wide ? [430, 70] : [10, 70], paddingBottomRight: [10, 10] });
    };
    SR.fitDistrict();

    layers.halo = L.layerGroup().addTo(map);
    layers.stops = L.layerGroup().addTo(map);
    layers.people = L.layerGroup();
    layers.deaths = L.layerGroup();
    layers.corridors = L.layerGroup();
    layers.jobs = L.layerGroup();
    layers.health = L.layerGroup();
    layers.employers = L.layerGroup();

    SR.d.pois.forEach((p) => {
      L.marker([p.lat, p.lon], { title: p.name, keyboard: false }).bindPopup("<b>" + esc(p.name) + "</b><br>" + SR.kind(p.kind) + " · " + esc(p.city)).addTo(layers.health);
    });
    ((SR.d.employers && SR.d.employers.employers) || []).forEach((e) => {
      const ic = L.divIcon({ className: "emp-pin", html: "<i></i>", iconSize: [18, 18] });
      L.marker([e.lat, e.lon], { icon: ic, title: e.name, keyboard: false }).bindPopup(() => employerPopup(e)).addTo(layers.employers);
      e._marker = layers.employers.getLayers().slice(-1)[0];
    });
    (SR.d.deaths || []).forEach((d) => {
      if (!d[4]) return;
      L.circleMarker([d[0], d[1]], { radius: 4, color: "#a3211b", weight: 2, fillOpacity: 0.2 })
        .bindPopup(d[2] + " · " + (d[3] ? t("map.cyclist") : t("map.pedestrian")) + " · " + esc(d[5] || "")).addTo(layers.deaths);
    });
    (SR.d.risk_lines || []).forEach((r) => {
      const w = r[0] >= 99 ? 6 : r[0] >= 96 ? 4 : 2.5;
      L.polyline(r[3], { color: "#8a4b00", weight: w, opacity: 0.85, dashArray: r[0] >= 99 ? null : r[0] >= 96 ? "10 4" : "3 4" })
        .bindPopup("<b>" + esc(r[1] || t("map.unnamed")) + "</b><br>" + t("map.risk_pct", { n: r[0] }) + (r[2] ? "<br>" + t("map.past_deaths", { n: r[2] }) : "")).addTo(layers.corridors);
    });

    halo = haloArr = []; dots = dotArr = []; tractC = tractArr = []; jobC = jobArr = [];
    SR.net.stops.forEach((s, i) => {
      halo[i] = L.circle([s[1], s[2]], { radius: 400, stroke: false, fillColor: "#0b3d91", fillOpacity: 0, interactive: false }).addTo(layers.halo);
      dots[i] = L.circleMarker([s[1], s[2]], { radius: 1.5, weight: 1, color: "#8a929e", fillColor: "#8a929e", fillOpacity: 0.45 }).bindPopup(() => stopPopup(i, mday())).addTo(layers.stops);
    });
    SR.d.tracts.forEach((tr, i) => {
      tractC[i] = L.circleMarker([tr.lat, tr.lon], { radius: 3 + Math.sqrt(tr.pop) / 14 }).bindPopup(() => tractPopup(tr)).addTo(layers.people);
    });
    SR.d.blocks.forEach((b, i) => {
      if (b[3] < 150) return;
      const c = { i, on: false, m: L.circleMarker([b[0], b[1]], { radius: 2 + Math.sqrt(b[3]) / 6 }).bindPopup(() => "<b>" + SR.num(b[3]) + " " + t("plan.wh_jobs") + "</b><br>" + (c.on ? "✓ " + t("map.bus_yes") : "✕ " + t("map.bus_no")) + " (" + SR.hourLabel(+$("#hour").value) + ")").addTo(layers.jobs) };
      jobArr.push(c);
    });
    layerChips();
    $("#hour").oninput = update;
    document.querySelectorAll("input[name=mday]").forEach((r) => (r.onchange = update));
    $("#m-play").innerHTML = ICON.play;
    $("#m-back").onclick = () => { $("#m-back").hidden = true; SR.showTab("plan"); };
    $("#m-play").onclick = togglePlay;
    $("#m-locate").onclick = async () => {
      const g = await SR.useMyLocation({ say: (msg, kind) => { if (kind === "warn") toast(msg); } });
      if (g) { map.flyTo([g.lat, g.lon], 15); spotReport({ lat: g.lat, lng: g.lon }); }
    };
    $("#m-search-form").onsubmit = async (e) => {
      e.preventDefault();
      const g = await SR.geocode($("#m-search").value);
      if (!g) return toast(t("plan.need_places"));
      map.flyTo([g.lat, g.lon], 14);
      spotReport({ lat: g.lat, lng: g.lon });
    };
    map.on("click", (e) => {
      if (pickTarget) {
        const label = t("plan.dropped");
        SR.coords[pickTarget] = { lat: e.latlng.lat, lon: e.latlng.lng, label };
        $(pickTarget === "from" ? "#from" : "#to").value = label;
        pickTarget = null;
        $("#pick-banner") && $("#pick-banner").remove();
        SR.showTab("plan");
        return;
      }
      spotReport(e.latlng);
    });
    update();
    setTimeout(() => { map.invalidateSize(); SR.fitDistrict(); }, 60);
  };

  function toast(msg) {
    const n = $("#m-toast"); n.textContent = msg; n.hidden = false;
    clearTimeout(n._t); n._t = setTimeout(() => (n.hidden = true), 3500);
  }

  function layerChips() {
    const items = [["halo", t("map.l_halo"), true], ["stops", t("map.l_stops"), true], ["employers", SR.d.employers ? t("map.l_emp") : null, false], ["people", t("map.l_people"), false],
      ["jobs", t("map.l_jobs"), false], ["corridors", SR.d.risk_lines ? t("map.l_corridors") : null, false],
      ["deaths", SR.d.deaths && SR.d.deaths.length ? t("map.l_deaths") : null, false], ["health", SR.d.pois.length ? t("map.l_health") : null, false]].filter((x) => x[1]);
    const box = $("#layers");
    box.innerHTML = items.map((i) => '<button type="button" class="tog" aria-pressed="' + i[2] + '" data-layer="' + i[0] + '">' + i[1] + "</button>").join("");
    box.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        const on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on);
        on ? layers[b.dataset.layer].addTo(map) : map.removeLayer(layers[b.dataset.layer]);
      };
    });
  }

  function togglePlay() {
    const b = $("#m-play");
    if (timer) { clearInterval(timer); timer = null; b.innerHTML = ICON.play; b.setAttribute("aria-label", t("map.play")); return; }
    b.innerHTML = ICON.pause; b.setAttribute("aria-label", t("map.pause"));
    timer = setInterval(() => { const r = $("#hour"); r.value = (+r.value + 1) % 24; update(); }, 650);
  }

  function update() {
    if (!ready) return;
    const day = mday(), h = +$("#hour").value;
    $("#hour-label").textContent = SR.hourLabel(h);
    const act = SR.activeStops(day)[h];

    // The layers are built once; each hour only restyles them (cheap, so "play the day" stays smooth).
    SR.net.stops.forEach((s, i) => {
      const on = act[i] === 1;
      halo[i].setStyle({ fillOpacity: on ? 0.16 : 0 });
      dots[i].setStyle(on ? { color: "#0b3d91", fillColor: "#0b3d91", fillOpacity: 1 } : { color: "#8a929e", fillColor: "#8a929e", fillOpacity: 0.45 });
      dots[i].setRadius(on ? 2.4 : 1.5);
    });
    SR.d.tracts.forEach((tr, i) => {
      const on = tr.cov[day][h] === "1";
      tractC[i].setStyle(on
        ? { color: "#0b3d91", weight: 1, dashArray: null, fillColor: "#0b3d91", fillOpacity: tr.in_district ? 0.75 : 0.35 }
        : { color: "#a3211b", weight: 2, dashArray: "3 3", fillColor: "#ffffff", fillOpacity: tr.in_district ? 0.6 : 0.2 });
    });
    if (!jobStops) jobStops = SR.d.blocks.map((x) => SR.net.near(x[0], x[1], 400).map((y) => y.s));
    jobC.forEach((c) => {
      const on = jobStops[c.i].some((s) => act[s]);
      c.m.setStyle(on
        ? { color: "#0b3d91", weight: 1, dashArray: null, fillColor: "#0b3d91", fillOpacity: 0.6 }
        : { color: "#a3211b", weight: 2, dashArray: "2 2", fillColor: "#ffffff", fillOpacity: 0.5 });
      c.on = on;
    });
    stats(day, h);
    if (spot) spotReport(spot, true);
  }

  function tractPopup(tr) {
    const day = mday(), h = +$("#hour").value, on = tr.cov[day][h] === "1";
    return "<b>" + esc(SR.tractLabel(tr)) + "</b><br>" + SR.num(tr.pop) + " " + t("map.people") + "<br>" + (on ? "✓ " + t("map.bus_yes") : "✕ " + t("map.bus_no")) + " (" + SR.hourLabel(h) + ")";
  }

  function stopPopup(i, day) {
    const inf = SR.stopInfo(day), s = SR.d.safety && SR.d.safety.stops && SR.d.safety.stops[i];
    const rt = [...inf.routes[i]].map((r) => SR.routeName(r)).filter(Boolean).sort();
    let html = "<b>" + esc(SR.stopName(i)) + "</b>";
    if (rt.length) html += '<div class="pop-routes">' + rt.map((r) => '<span class="route sm">' + esc(r) + "</span>").join("") + "</div>";
    html += isFinite(inf.first[i]) ? t("map.first_last", { a: SR.hm(inf.first[i]), b: SR.hm(inf.last[i]) }) : t("map.no_service_day");
    if (s) html += "<br>" + t("map.stop_deaths", { n: s[0], m: s[1] }) + (s[2] != null && s[2] >= 90 ? "<br>" + t("map.stop_risk", { n: 100 - s[2] }) : "");
    return html;
  }

  /** The "what is here" report for any tapped spot. */
  function spotReport(ll, keep) {
    spot = ll;
    const day = mday(), h = +$("#hour").value, act = SR.activeStops(day)[h], inf = SR.stopInfo(day);
    const near = SR.net.near(ll.lat, ll.lng, 400), live = near.filter((x) => act[x.s]);
    const nearest = SR.net.near(ll.lat, ll.lng, 1500)[0];
    let jobs = 0, trans = 0;
    SR.d.blocks.forEach((b) => { if (Planner.hav(ll.lat, ll.lng, b[0], b[1]) <= 400) { jobs += b[2]; trans += b[3]; } });
    let night = 0, all = 0;
    (SR.d.deaths || []).forEach((d) => { if (Planner.hav(ll.lat, ll.lng, d[0], d[1]) <= 300) { all++; if (d[4]) night++; } });
    const el = document.createElement("div"); el.className = "spot";
    let html = '<div class="spot-h"><span class="dot ' + (live.length ? "on" : "off") + '"></span>' + (live.length ? t("spot.yes", { h: SR.hourLabel(h) }) : t("spot.no", { h: SR.hourLabel(h) })) + "</div>";
    if (live.length) html += "<p>" + esc(SR.stopName(live[0].s)) + " · " + Math.round(live[0].d * 1.3) + " m · " + (isFinite(inf.last[live[0].s]) ? t("spot.last", { t: SR.hm(inf.last[live[0].s]) }) : "") + "</p>";
    else if (nearest) html += "<p>" + t("spot.nearest", { s: esc(SR.stopName(nearest.s)), m: Math.round(nearest.d * 1.3) }) + "</p>";
    html += '<ul class="plain"><li>' + t("spot.jobs", { n: SR.num(jobs), w: SR.num(trans) }) + "</li><li>" + t("spot.deaths", { n: night, m: all }) + "</li></ul>" +
      '<div class="row gap wrap"><button type="button" class="btn ghost sm" data-go="plan">' + t("spot.plan") + '</button><button type="button" class="btn ghost sm" data-go="reach">' + t("spot.reach") + "</button></div>";
    el.innerHTML = html;
    el.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => {
        const p = { lat: ll.lat, lon: ll.lng, label: t("plan.dropped") };
        if (b.dataset.go === "plan") { SR.coords.from = p; $("#from").value = p.label; SR.showTab("plan"); }
        else { $("#r-from").value = p.label; SR.setReachOrigin(p); SR.showTab("reach"); }
      };
    });
    if (!keep || !layers.spot || !layers.spot.isOpen()) {
      layers.spot = L.popup({ maxWidth: 300 }).setLatLng(ll).setContent(el).openOn(map);
      layers.spot.on && layers.spot.on("remove", () => { spot = null; });
    } else layers.spot.setContent(el);
  }

  function employerPopup(e) {
    const day = mday(), a = SR.employerAccess(e, day), el = document.createElement("div");
    const at = (h) => (a.hours[h] ? "●" : "○");
    el.innerHTML = "<b>" + esc(e.name) + "</b><br><span class=\"small\">" + esc(e.address) + "</span><p>" + t("emp.size", { s: esc(e.size) }) + "</p>" + SR.hourBars(a.hours) +
      '<p class="small">' + t("emp.times", { a: at(5), b: at(14), c: at(22), d: at(23) }) + "</p>" +
      "<p>" + (a.first != null ? t("map.first_last", { a: SR.hm(a.first), b: SR.hm(a.last) }) : t("emp.no_walk", { m: a.nearestM || "?" })) + "</p>" +
      '<div class="row gap wrap"><button type="button" class="btn ghost sm" data-go="to">' + t("emp.plan_to") + '</button><button type="button" class="btn ghost sm" data-go="reach">' + t("spot.reach") + "</button></div>";
    el.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => {
        const p = { lat: e.lat, lon: e.lon, label: e.name };
        if (b.dataset.go === "to") { SR.coords.to = p; $("#to").value = e.name; SR.showTab("plan"); }
        else { $("#r-from").value = e.name; SR.setReachOrigin(p); SR.showTab("reach"); }
      };
    });
    return el;
  }

  /** Jump to an employer on the map (used from the Employers tab). */
  SR.focusEmployer = function (id) {
    SR.showTab("map");
    const e = ((SR.d.employers && SR.d.employers.employers) || []).find((x) => x.id === id); if (!e) return;
    const chip = document.querySelector('#layers [data-layer="employers"]');
    if (chip && chip.getAttribute("aria-pressed") !== "true") chip.click();
    map.flyTo([e.lat, e.lon], 15);
    setTimeout(() => e._marker && e._marker.openPopup(), 700);
  };

  function healthStats(day, h) {
    if (!SR.d.pois.length) return "";
    if (!poiStops) poiStops = SR.d.pois.map((p) => SR.net.near(p.lat, p.lon, 400).map((x) => x.s));
    const act = SR.activeStops(day)[h], by = {};
    SR.d.pois.forEach((p, i) => { const k = (by[p.kind] = by[p.kind] || { n: 0, ok: 0 }); k.n++; if (poiStops[i].some((s) => act[s])) k.ok++; });
    return '<div class="stat wide"><span class="h">' + t("map.health", { h: SR.hourLabel(h) }) + '</span><ul class="plain">' +
      Object.keys(by).map((k) => "<li>" + SR.kind(k) + ' <span class="v">' + by[k].ok + "/" + by[k].n + "</span></li>").join("") + "</ul></div>";
  }

  function stats(day, h) {
    const r = SR.d.reach[day], noon = 12;
    const tile = (v, label) => '<div class="stat"><b>' + SR.pct(v, v < 0.1 ? 1 : 0) + "</b><span>" + label + "</span></div>";
    $("#map-stats").innerHTML = tile(r.pop_share[h], t("map.s_people")) + tile(r.jobs_share[h], t("map.s_jobs")) + tile(r.trans_jobs_share_district[h], t("map.s_wh")) +
      '<p class="small wide">' + t("map.vs_noon", { n: SR.pct(r.pop_share[noon]) }) + "</p>"; 
    $("#health").innerHTML = healthStats(day, h);
    curve(day, h);
  }

  function curve(day, h) {
    const r = SR.d.reach[day], W = 640, H = 190, L0 = 34, B = 22, Tt = 8;
    const x = (i) => L0 + (i / 23) * (W - L0 - 8), y = (v) => H - B - v * (H - B - Tt);
    const line = (arr, col, dash) => '<polyline fill="none" stroke="' + col + '" stroke-width="2.5" ' + (dash ? 'stroke-dasharray="' + dash + '"' : "") +
      ' points="' + arr.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ") + '"/>';
    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + t("map.curve_alt") + '" style="width:100%;height:auto">';
    [0, 0.5, 1].forEach((g) => { svg += '<line x1="' + L0 + '" x2="' + (W - 8) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="var(--line)"/><text x="0" y="' + (y(g) + 4) + '">' + Math.round(g * 100) + "%</text>"; });
    [0, 6, 12, 18, 23].forEach((i) => (svg += '<text x="' + (x(i) - 8) + '" y="' + (H - 5) + '">' + SR.hourLabel(i) + "</text>"));
    svg += line(r.pop_share, "#0b3d91") + line(r.jobs_share, "#6b7686", "6 3") + line(r.trans_jobs_share_district, "#8a4b00", "2 3");
    svg += '<line x1="' + x(h) + '" x2="' + x(h) + '" y1="' + Tt + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1.5"/></svg>';
    svg += '<p class="small"><b style="color:#0b3d91">—</b> ' + t("map.s_people") + " &nbsp; <b>- -</b> " + t("map.s_jobs") + " &nbsp; <b style='color:#8a4b00'>···</b> " + t("map.s_wh") + "</p>";
    $("#curve").innerHTML = svg;
  }

  SR.pickOnMap = function (which) {
    pickTarget = which;
    SR.showTab("map");
    $("#pick-banner") && $("#pick-banner").remove();
    const b = document.createElement("div");
    b.id = "pick-banner"; b.className = "notice floating"; b.setAttribute("role", "alert");
    b.textContent = which === "from" ? t("map.pick_from") : t("map.pick_to");
    $(".map-shell").append(b);
  };

  /** Draw a plan: dashed walking lines, solid bus lines along the trip's own stops, pins at both ends. */
  SR.showPlanOnMap = function (R) {
    SR.showTab("map");
    if (layers.plan) map.removeLayer(layers.plan);
    layers.plan = L.layerGroup().addTo(map);
    const P = R.main;
    if (!P || !P.ok) return;
    const pts = [[R.from.lat, R.from.lon], [R.to.lat, R.to.lon]];
    L.marker(pts[0], { title: t("plan.from") }).addTo(layers.plan).bindPopup(t("plan.from") + ": " + esc(R.from.label || ""));
    L.marker(pts[1], { title: t("plan.to") }).addTo(layers.plan).bindPopup(t("plan.to") + ": " + esc(R.to.label || ""));
    const stop = (i) => [SR.net.stops[i][1], SR.net.stops[i][2]];
    let prev = pts[0];
    P.legs.forEach((l) => {
      if (l.k !== "bus") return;
      const seq = SR.d.transit.trips[l.trip][2];
      const a = seq.indexOf(l.fromStop), b = seq.indexOf(l.toStop, a);
      const line = (b >= a ? seq.slice(a, b + 1) : [l.fromStop, l.toStop]).map(stop);
      const col = (SR.d.transit.routes[l.route][2] || "#0b3d91");
      L.polyline([prev, line[0]], { color: "#6b7686", weight: 3, dashArray: "4 6" }).addTo(layers.plan);
      L.polyline(line, { color: col, weight: 7, opacity: 0.95 }).bindPopup(t("leg.bus", { r: esc(SR.routeName(l.route)) }) + " " + SR.hm(l.dep)).addTo(layers.plan);
      prev = line[line.length - 1];
    });
    L.polyline([prev, pts[1]], { color: "#6b7686", weight: 3, dashArray: "4 6" }).addTo(layers.plan);
    map.fitBounds(L.latLngBounds(pts.concat([prev])).pad(0.3));
    $("#m-back").hidden = false;
  };

  SR.flyTo = function (lat, lon, z) { SR.showTab("map"); setTimeout(() => map.flyTo([lat, lon], z || 14), 80); };
  SR.setHour = function (h, day) {
    if (!ready) return;
    $("#hour").value = h;
    if (day) document.querySelector("input[name=mday][value=" + day + "]").checked = true;
    update();
  };
  SR.mapUpdate = update;
  SR.refreshMap = function () { if (map) map.invalidateSize(); };
})();
