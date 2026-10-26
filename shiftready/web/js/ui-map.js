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
  let bnd, deathL = [], riskL = [];
  let map, layers = {}, ready = false, pickTarget = null, timer = null, spot = null, jobStops = null, poiStops = null;

  const mday = () => document.querySelector("input[name=mday]:checked").value;

  // OpenStreetMap's own tiles (no key needed), calmed to grey with CSS so the data layers carry the colour.
  SR.addTiles = function (m, onFail) {
    let failed = 0;
    const tl = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" });
    tl.on("tileerror", () => { if (++failed === 4 && onFail) onFail(); });   // offline or blocked: routes and stops still draw
    return tl.addTo(m);
  };

  SR.initMap = function () {
    if (ready) { setTimeout(() => map.invalidateSize(), 50); return; }
    ready = true;
    map = L.map("map", { zoomControl: false, preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5 }).setView(SR.cfg.center || [34.09, -117.3], SR.cfg.zoom || 11);
    SR._map = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const ld = $("#map-loading");
    const doneLoading = () => { if (ld) ld.hidden = true; };
    const tl0 = SR.addTiles(map, () => toast(t("map.noroom")));
    tl0.once("load", doneLoading); setTimeout(doneLoading, 6000);
    $("#map").setAttribute("aria-label", t("map.map_label"));
    bnd = L.geoJSON(SR.d.boundary, { style: { color: SR.C("--map"), weight: 2.5, fill: false, dashArray: "7 5" }, interactive: false }).addTo(map);
    SR.fitDistrict = function () {
      const wide = window.innerWidth >= 900;
      map.fitBounds(bnd.getBounds(), { paddingTopLeft: wide ? [430, 70] : [10, 70], paddingBottomRight: [10, 10] });
    };
    SR.fitDistrict();

    layers.halo = L.layerGroup().addTo(map);
    layers.stops = L.layerGroup().addTo(map);
    layers.people = L.layerGroup().addTo(map);   // neighbourhoods are the layer that is readable at district scale
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
      deathL.push(L.circleMarker([d[0], d[1]], { radius: 4, color: SR.C("--bad"), weight: 2, fillOpacity: 0.2 })
        .bindPopup(d[2] + " · " + (d[3] ? t("map.cyclist") : t("map.pedestrian")) + " · " + esc(d[5] || "")).addTo(layers.deaths));
    });
    (SR.d.risk_lines || []).forEach((r) => {
      const w = r[0] >= 99 ? 6 : r[0] >= 96 ? 4 : 2.5;
      riskL.push(L.polyline(r[3], { color: SR.C("--maybe"), weight: w, opacity: 0.85, dashArray: r[0] >= 99 ? null : r[0] >= 96 ? "10 4" : "3 4" })
        .bindPopup("<b>" + esc(r[1] || t("map.unnamed")) + "</b><br>" + t("map.risk_pct", { n: r[0] }) + (r[2] ? "<br>" + t("map.past_deaths", { n: r[2] }) : "")).addTo(layers.corridors));
    });

    halo = haloArr = []; dots = dotArr = []; tractC = tractArr = []; jobC = jobArr = [];
    // Merged feeds (for example a commuter-rail line) can include stops far outside the district. They still work in trip
    // plans, but drawing them would zoom the map out to Los Angeles, so only stops in or near the district are drawn.
    const ring = [];
    const addRings = (c) => { if (typeof c[0] === "number") return; if (typeof c[0][0] === "number") { ring.push(c); return; } c.forEach(addRings); };
    (SR.d.boundary.features ? SR.d.boundary.features.map((f) => f.geometry.coordinates) : [(SR.d.boundary.geometry || SR.d.boundary).coordinates]).forEach(addRings);
    const inRing = (x, y, r) => { let c = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) { if ((r[a][1] > y) !== (r[b][1] > y) && x < ((r[b][0] - r[a][0]) * (y - r[a][1])) / (r[b][1] - r[a][1]) + r[a][0]) c = !c; } return c; };
    const verts = []; ring.forEach((r) => { for (let k = 0; k < r.length; k += 4) verts.push(r[k]); });
    const near = (s) => ring.some((r) => inRing(s[2], s[1], r)) || verts.some((v) => Math.abs(v[0] - s[2]) < 0.12 && Math.abs(v[1] - s[1]) < 0.12);
    const shown = [];
    SR.net.stops.forEach((s, i) => {
      const show = !ring.length || near(s);
      halo[i] = L.circle([s[1], s[2]], { radius: 400, stroke: false, fillColor: SR.C("--map"), fillOpacity: 0, interactive: false });
      dots[i] = L.circleMarker([s[1], s[2]], { radius: 1.5, weight: 1, color: SR.C("--map-off"), fillColor: SR.C("--map-off"), fillOpacity: 0.45 }).bindPopup(() => stopPopup(i, mday()));
      if (show) { halo[i].addTo(layers.halo); dots[i].addTo(layers.stops); shown.push([s[1], s[2]]); }
    });
    // Parts of the district with no neighbourhood or stop data loaded nearby are shown as grey dots: "not measured", which is different from "no service".
    layers.nodata = L.layerGroup().addTo(map);
    (function () {
      if (!ring.length) return;
      const pts = SR.d.tracts.map((x) => [x.lat, x.lon]).concat(shown);
      let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
      ring.forEach((r) => r.forEach((v) => { la0 = Math.min(la0, v[1]); la1 = Math.max(la1, v[1]); lo0 = Math.min(lo0, v[0]); lo1 = Math.max(lo1, v[0]); }));
      let n = 0;
      for (let la = la0; la <= la1; la += 0.06) for (let lo = lo0; lo <= lo1; lo += 0.06) {
        if (!ring.some((r) => inRing(lo, la, r))) continue;
        if (pts.some((q) => Math.abs(q[0] - la) < 0.17 && Math.abs(q[1] - lo) < 0.17)) continue;
        L.circleMarker([la, lo], { radius: 2, weight: 0, fillColor: SR.C("--muted"), fillOpacity: 0.55, interactive: false }).addTo(layers.nodata); n++;
      }
      const lg = $("#lg-nodata"); if (lg && n) lg.hidden = false;
      if (!n) { map.removeLayer(layers.nodata); layers.nodata = null; }
    })();
    if (shown.length > 20) {
      // Open on the part of the district where the buses are: the middle 94% of stops by latitude and longitude, so a few far-off
      // stops (desert towns, a distant rail station) do not push the busy area into a corner.
      const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.max(0, Math.min(a.length - 1, Math.round(f * (a.length - 1))))];
      const la = shown.map((x) => x[0]), lo = shown.map((x) => x[1]);
      const sb = L.latLngBounds([q(la, 0.03), q(lo, 0.03)], [q(la, 0.97), q(lo, 0.97)]);
      SR.fitDistrict = function () {
        const wide = window.innerWidth >= 900;
        map.fitBounds(sb, { paddingTopLeft: wide ? [430, 70] : [10, 70], paddingBottomRight: [10, 10] });
      };
      SR.fitDistrict();
    }
    SR.fitWhole = function () {
      const wide = window.innerWidth >= 900;
      map.fitBounds(bnd.getBounds(), { paddingTopLeft: wide ? [430, 70] : [10, 70], paddingBottomRight: [10, 10] });
    };
    SR.d.tracts.forEach((tr, i) => {
      tractC[i] = L.circleMarker([tr.lat, tr.lon], { radius: 3 + Math.sqrt(tr.pop) / 14 }).bindPopup(() => tractPopup(tr)).addTo(layers.people);
    });
    SR.d.blocks.forEach((b, i) => {
      if (b[3] < 150) return;
      const c = { i, on: false, m: L.circleMarker([b[0], b[1]], { radius: 2 + Math.sqrt(b[3]) / 6 }).bindPopup(() => "<b>" + SR.num(b[3]) + " " + t("plan.wh_jobs") + "</b><br>" + (c.on ? "✓ " + t("map.bus_yes") : "✕ " + t("map.bus_no")) + " (" + SR.hourLabel(+$("#hour").value) + ")").addTo(layers.jobs) };
      jobArr.push(c);
    });
    layerChips();
    // search employers by name or city; choosing one flies there and opens its popup
    const emps = (SR.d.employers && SR.d.employers.employers) || [];
    const ef = $("#m-emp-form");
    if (ef) {
      ef.hidden = !emps.length;
      $("#m-emp-list").innerHTML = emps.map((e) => '<option value="' + esc(e.name) + '">' + esc(e.address || "") + "</option>").join("");
      const go = () => {
        const q = $("#m-emp").value.trim().toLowerCase(); if (!q) return;
        const e = emps.find((x) => x.name.toLowerCase() === q) || emps.find((x) => (x.name + " " + (x.address || "")).toLowerCase().includes(q));
        if (!e) return toast(t("map.emp_none"));
        const chip = document.querySelector('#layers [data-layer="employers"]');
        if (chip && chip.getAttribute("aria-pressed") !== "true") chip.click();
        map.flyTo([e.lat, e.lon], 15);
        setTimeout(() => e._marker && e._marker.openPopup(), 700);
      };
      ef.onsubmit = (ev) => { ev.preventDefault(); go(); };
      $("#m-emp").onchange = go;
    }
    $("#m-share").onclick = async () => {
      const u = new URL(location.href); u.search = "";
      const on = [...document.querySelectorAll("#layers [aria-pressed=true]")].map((b) => b.dataset.layer).join(",");
      u.searchParams.set("r", SR.cfg.id); u.searchParams.set("tab", "map"); u.searchParams.set("day", mday()); u.searchParams.set("h", $("#hour").value); u.searchParams.set("layers", on);
      try { await navigator.clipboard.writeText(u.toString()); toast(t("map.link_copied")); } catch (e) { window.prompt(t("map.share"), u.toString()); }
    };
    $("#m-print").onclick = () => { printSheet(); };
    $("#m-table").addEventListener("toggle", () => { if ($("#m-table").open) tableOut(); });
    // restore a shared view (?day=&h=&layers=)
    (function () {
      const q = new URLSearchParams(location.search), d = q.get("day"), h = q.get("h"), ls = q.get("layers");
      if (d && ["weekday", "saturday", "sunday"].includes(d)) document.querySelector("input[name=mday][value=" + d + "]").checked = true;
      if (h != null && +h >= 0 && +h <= 23) $("#hour").value = +h;
      if (ls != null) {
        const want = ls.split(",");
        document.querySelectorAll("#layers button").forEach((b) => { const on = want.includes(b.dataset.layer); if ((b.getAttribute("aria-pressed") === "true") !== on) b.click(); });
      }
    })();
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
    const bb = $("#m-busy"); if (bb) bb.onclick = () => SR.fitDistrict();
    const bw = $("#m-whole"); if (bw) bw.onclick = () => SR.fitWhole();
    const ld2 = $("#layers-d"); if (ld2 && window.innerWidth >= 900) ld2.open = true;
    setTimeout(() => { map.invalidateSize(); SR.fitDistrict(); }, 60);
  };

  // ---------- where can I get by...? shared by the large map and the inline trip map ----------
  let tractNear = null;
  /** Neighbourhoods reachable by bus and walking: leave the origin at `depart`, arrive at a tract's stop by `limit` (minutes of the day). */
  SR.reachTracts = function (origin, day, depart, limit) {
    const arr = Planner.earliestArrivals(SR.net, origin, day, depart, 800, 120);
    if (!tractNear) tractNear = SR.d.tracts.map((tr) => SR.net.near(tr.lat, tr.lon, 800));
    const out = [];
    SR.d.tracts.forEach((tr, i) => {
      if (tractNear[i].some((x) => arr[x.s] + Planner.walkMinutes(x.d) <= limit)) out.push(tr);
    });
    return out;
  };
  function reachLayer(list) {
    const g = L.layerGroup();
    list.forEach((tr) => L.circleMarker([tr.lat, tr.lon], { radius: 4 + Math.sqrt(tr.pop) / 22, color: SR.C("--primary"), weight: 1.5, fillColor: SR.C("--primary"), fillOpacity: 0.35, interactive: false }).addTo(g));
    return g;
  }
  /** Large map: from a tapped spot at the slider's hour, which neighbourhoods can you reach within 60 minutes? */
  function showReachFrom(ll) {
    const day = mday(), h = +$("#hour").value, depart = h * 60;
    if (layers.reach) map.removeLayer(layers.reach);
    const list = SR.reachTracts({ lat: ll.lat, lon: ll.lng }, day, depart, depart + 60);
    layers.reach = reachLayer(list).addTo(map);
    const lg = $("#lg-reach"); if (lg) { lg.hidden = false; lg.querySelector("span").textContent = t("map.lg_reach", { n: list.length, h: SR.hourLabel(h) }); }
    map.closePopup();
    toast(t("map.reach_done", { n: list.length, h: SR.hourLabel(h) }));
  }

  /** Text version of the map: how many stops have a bus running within a 5-minute walk of a place, hour by hour. */
  function tableOut() {
    const day = mday(), c = spot ? { lat: spot.lat, lng: spot.lng } : map.getCenter();
    const near = SR.net.near(c.lat, c.lng, 400).map((x) => x.s), inf = SR.stopInfo(day), A = SR.activeStops(day);
    let rows = "";
    for (let h = 0; h < 24; h++) {
      const n = near.filter((s) => A[h][s]).length;
      rows += "<tr><th scope=\"row\">" + SR.hourLabel(h) + "</th><td>" + n + "</td></tr>";
    }
    const last = near.reduce((m, s) => (isFinite(inf.last[s]) ? Math.max(m, inf.last[s]) : m), -1);
    $("#m-table-out").innerHTML = "<p class=\"small\">" + t("map.table_for", { p: c.lat.toFixed(3) + ", " + c.lng.toFixed(3), n: near.length }) + (last >= 0 ? " " + t("spot.last", { t: SR.hm(last) }) : "") + "</p>" +
      "<table class=\"hour-table\"><caption class=\"sr-only\">" + t("map.table_cap") + "</caption><thead><tr><th scope=\"col\">" + t("map.table_hour") + "</th><th scope=\"col\">" + t("map.table_stops") + "</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  /** Print or save as PDF: a clean sheet with the headline numbers and the legend, then the map as it is on screen. */
  function printSheet() {
    const day = mday(), h = +$("#hour").value, r = SR.d.reach[day];
    const lg = [...document.querySelectorAll(".map-panel .lg li:not([hidden]) span")].map((x) => "<li>" + esc(x.textContent) + "</li>").join("");
    document.body.classList.add("print-map");
    const done = () => { document.body.classList.remove("print-map"); window.removeEventListener("afterprint", done); const o = $("#print-map-head"); if (o) o.remove(); };
    window.addEventListener("afterprint", done);
    const old = $("#print-map-head"); if (old) old.remove();
    const hd = document.createElement("div"); hd.id = "print-map-head";
    hd.innerHTML = "<h1>" + esc(SR.cfg.name || SR.cfg.short) + ": " + t("map.print_title", { d: t("day." + day), h: SR.hourLabel(h) }) + "</h1><p>" + t("map.hour_sub", { p: SR.pct(r.pop_share[h], r.pop_share[h] < 0.1 ? 1 : 0), h: SR.hourLabel(h), n: SR.pct(r.pop_share[12]) }) + "</p><ul>" + lg + "</ul><p class=\"small\">" + t("map.print_src", { u: location.origin + location.pathname }) + "</p>";
    document.body.prepend(hd);
    map.invalidateSize();
    setTimeout(() => window.print(), 200);
  }

  function toast(msg) {
    const n = $("#m-toast"); n.textContent = msg; n.hidden = false;
    clearTimeout(n._t); n._t = setTimeout(() => (n.hidden = true), 3500);
  }

  function layerChips() {
    const items = [["halo", t("map.l_halo"), true], ["stops", t("map.l_stops"), true], ["employers", SR.d.employers ? t("map.l_emp") : null, false], ["people", t("map.l_people"), true],
      ["jobs", t("map.l_jobs"), false], ["corridors", SR.d.risk_lines ? t("map.l_corridors") : null, false],
      ["deaths", SR.d.deaths && SR.d.deaths.length ? t("map.l_deaths") : null, false], ["health", SR.d.pois.length ? t("map.l_health") : null, false],
      ["nodata", layers.nodata ? t("map.l_nodata") : null, true]].filter((x) => x[1]);
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

  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function togglePlay() {
    const b = $("#m-play"), r = $("#hour");
    if (timer) { clearInterval(timer); timer = null; b.innerHTML = ICON.play; b.setAttribute("aria-label", t("map.play")); return; }
    if (reduceMotion()) { r.value = (+r.value + 1) % 24; update(); toast(t("map.reduced")); return; }   // no automatic motion: one step per press
    b.innerHTML = ICON.pause; b.setAttribute("aria-label", t("map.pause"));
    r.value = 4; update();
    timer = setInterval(() => {
      if (+r.value >= 23) { clearInterval(timer); timer = null; b.innerHTML = ICON.play; b.setAttribute("aria-label", t("map.play")); return; }
      r.value = +r.value + 1; update();
    }, 600);
  }

  function update() {
    if (!ready) return;
    const day = mday(), h = +$("#hour").value;
    $("#hour-label").textContent = SR.hourLabel(h);
    $("#hour").style.setProperty("--p", (h / 23 * 100).toFixed(1) + "%");
    const act = SR.activeStops(day)[h];

    // The layers are built once; each hour only restyles them (cheap, so "play the day" stays smooth).
    SR.net.stops.forEach((s, i) => {
      const on = act[i] === 1;
      halo[i].setStyle({ fillOpacity: on ? 0.16 : 0 });
      dots[i].setStyle(on ? { color: SR.C("--map"), fillColor: SR.C("--map"), fillOpacity: 1 } : { color: SR.C("--map-off"), fillColor: SR.C("--map-off"), fillOpacity: 0.45 });
      dots[i].setRadius(on ? 2.4 : 1.5);
    });
    SR.d.tracts.forEach((tr, i) => {
      const on = tr.cov[day][h] === "1", noon = tr.cov[day][12] === "1";
      tractC[i].setStyle(on
        ? { color: SR.C("--map"), weight: 1, dashArray: null, fillColor: SR.C("--map"), fillOpacity: tr.in_district ? 0.75 : 0.35 }
        : noon
          ? { color: SR.C("--maybe"), weight: 2, dashArray: null, fillColor: SR.C("--maybe"), fillOpacity: tr.in_district ? 0.85 : 0.45 }   // had a bus at noon, none now
          : { color: SR.C("--bad"), weight: 2, dashArray: "3 3", fillColor: SR.C("--surface"), fillOpacity: tr.in_district ? 0.6 : 0.2 });
    });
    if (!jobStops) jobStops = SR.d.blocks.map((x) => SR.net.near(x[0], x[1], 400).map((y) => y.s));
    jobC.forEach((c) => {
      const on = jobStops[c.i].some((s) => act[s]);
      c.m.setStyle(on
        ? { color: SR.C("--map"), weight: 1, dashArray: null, fillColor: SR.C("--map"), fillOpacity: 0.6 }
        : { color: SR.C("--bad"), weight: 2, dashArray: "2 2", fillColor: SR.C("--surface"), fillOpacity: 0.5 });
      c.on = on;
    });
    stats(day, h);
    if (spot) spotReport(spot, true);
    const tb = $("#m-table"); if (tb && tb.open) tableOut();
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
      '<div class="row gap wrap"><button type="button" class="btn ghost sm" data-go="plan">' + t("spot.plan") + '</button><button type="button" class="btn ghost sm" data-go="reach">' + t("spot.reach") + '</button><button type="button" class="btn ghost sm" data-go="area">' + t("map.area_btn") + "</button></div>";
    el.innerHTML = html;
    el.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => {
        const p = { lat: ll.lat, lon: ll.lng, label: t("plan.dropped") };
        if (b.dataset.go === "plan") { SR.coords.from = p; $("#from").value = p.label; SR.showTab("plan"); }
        else if (b.dataset.go === "area") showReachFrom(ll);
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
    const hh = +($("#hour") || { value: 22 }).value, here = a.hours[hh];
    el.innerHTML = "<b>" + esc(e.name) + "</b><br><span class=\"small\">" + esc(e.address) + '</span><p class="emp-now ' + (here ? "yes" : "no") + '">' + t(here ? "emp.at_yes" : "emp.at_no", { h: SR.hourLabel(hh) }) + "</p><p>" + t("emp.size", { s: esc(e.size) }) + "</p>" + SR.hourBars(a.hours) +
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
"";
    const sub = $("#hour-sub");
    if (sub) sub.textContent = t(h === noon ? "map.hour_sub0" : "map.hour_sub", { p: SR.pct(r.pop_share[h], r.pop_share[h] < 0.1 ? 1 : 0), h: SR.hourLabel(h), n: SR.pct(r.pop_share[noon]) });
    $("#hour").setAttribute("aria-valuetext", t("map.slider_text", { h: SR.hourLabel(h), p: SR.pct(r.pop_share[h], r.pop_share[h] < 0.1 ? 1 : 0) }));
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
    svg += line(r.pop_share, SR.C("--map")) + line(r.jobs_share, SR.C("--map-off"), "6 3") + line(r.trans_jobs_share_district, SR.C("--maybe"), "2 3");
    svg += '<line x1="' + x(h) + '" x2="' + x(h) + '" y1="' + Tt + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1.5"/></svg>';
    svg += '<p class="small"><b style="color:var(--map)">—</b> ' + t("map.s_people") + " &nbsp; <b>- -</b> " + t("map.s_jobs") + " &nbsp; <b style='color:var(--maybe)'>···</b> " + t("map.s_wh") + "</p>";
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

  // ---------- a trip on a map: shared by the inline map in the Plan result and the large Map tab ----------
  const WALK = { color: "#59616c", weight: 3, dashArray: "1 7", lineCap: "round", opacity: 0.95 };

  /** The next few departures of one route from one stop, so a tapped stop answers "and if I miss it?". */
  function nextDeparts(stop, route, day, after, n) {
    const bit = { weekday: 1, saturday: 2, sunday: 4 }[day] || 1, out = [];
    SR.d.transit.trips.forEach((tr) => {
      if (tr[0] !== route || !(tr[1] & bit)) return;
      const k = tr[2].indexOf(stop);
      if (k >= 0 && k < tr[2].length - 1 && tr[3][k] > after) out.push(tr[3][k]);
    });
    return out.sort((a, b) => a - b).slice(0, n);
  }

  function boardPopup(l, day) {
    const nx = nextDeparts(l.fromStop, l.route, day, l.dep + 0.01, 3);
    return "<b>" + esc(SR.stopName(l.fromStop)) + "</b><div class=\"pop-routes\"><span class=\"route sm\" style=\"" + SR.routeStyle(l.route) + "\">" + esc(SR.routeName(l.route)) + "</span></div>" +
      t("tm.board", { r: esc(SR.routeName(l.route)), t: SR.hm(l.dep) }) + "<br><span class=\"small\">" + t("tm.next") + ": " + (nx.length ? nx.map((x) => SR.hm(x)).join(", ") : t("tm.none")) + "</span>";
  }

  function pinIcon(html, cls, up) { return L.divIcon({ className: "tm-pin-wrap", html: '<span class="' + cls + '">' + html + "</span>", iconSize: [26, 26], iconAnchor: [13, up ? 34 : 13], popupAnchor: [0, up ? -30 : -12] }); }   // start and end pins sit above their point so they do not hide the boarding pin

  /** Draws R's trip (and the ride home when there is one) on map `mp`. Returns the layers and the bounds to fit. */
  function drawTrip(mp, R) {
    const A = [R.from.lat, R.from.lon], B = [R.to.lat, R.to.lon], all = [A, B];
    const stopLL = (i) => [SR.net.stops[i][1], SR.net.stops[i][2]];
    const leg = (plan, day, home) => {
      const g = L.layerGroup(); let prev = home ? B : A, n = 0;
      const end = home ? A : B;
      (plan.legs || []).forEach((l) => {
        if (l.k !== "bus") return;
        n++;
        const seq = SR.d.transit.trips[l.trip % SR.d.transit.trips.length][2];
        const a = seq.indexOf(l.fromStop), b = a >= 0 ? seq.indexOf(l.toStop, a) : -1;
        const line = (b >= a && a >= 0 ? seq.slice(a, b + 1) : [l.fromStop, l.toStop]).map(stopLL);
        const col = SR.d.transit.routes[l.route][2] || SR.C("--map");
        L.polyline([prev, line[0]], WALK).addTo(g);
        L.polyline(line, { color: "#ffffff", weight: home ? 7 : 10, opacity: 0.92, interactive: false }).addTo(g);
        L.polyline(line, { color: col, weight: home ? 4 : 6, opacity: 1, dashArray: home ? "9 6" : null }).bindPopup(() => boardPopup(l, day)).addTo(g);
        L.circleMarker(line[line.length - 1], { radius: 4, weight: 2, color: col, fillColor: "#ffffff", fillOpacity: 1 }).bindPopup(esc(SR.stopName(l.toStop))).addTo(g);
        L.marker(line[0], { icon: pinIcon((home ? "H" : "") + n, "tm-pin" + (home ? " home" : "") + " route\" style=\"" + SR.routeStyle(l.route)), title: SR.stopName(l.fromStop), keyboard: false })
          .bindPopup(() => boardPopup(l, day)).addTo(g);
        prev = line[line.length - 1];
        all.push(...line);
      });
      L.polyline([prev, end], WALK).addTo(g);
      return g;
    };
    const main = leg(R.main, R.d, false).addTo(mp);
    const home = R.wantHome && R.home && R.home.ok ? leg(R.home, R.homeDay || R.d, true) : null;
    const ends = L.layerGroup().addTo(mp);
    L.marker(A, { icon: pinIcon("A", "tm-end start", true), title: t("tm.start"), keyboard: false }).bindPopup("<b>" + t("tm.start") + "</b><br>" + esc(R.from.label || "")).addTo(ends);
    L.marker(B, { icon: pinIcon("B", "tm-end", true), title: t("tm.end"), keyboard: false }).bindPopup("<b>" + t("tm.end") + "</b><br>" + esc(R.to.label || "")).addTo(ends);
    return { main, home, ends, bounds: L.latLngBounds(all) };
  }

  /** The small map inside the Plan result. Draws even with no map pictures (offline): the lines do not need tiles. */
  let tripMap = null;
  SR.renderTripMap = function (R) {
    if (tripMap) { try { tripMap.remove(); } catch (e) { /* already gone */ } tripMap = null; }
    const el = document.getElementById("trip-map");
    if (!el || !R || !R.main || !R.main.ok || !window.L) return;
    tripMap = L.map(el, { zoomControl: false, preferCanvas: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, tapHold: false });
    const note = () => { const n = document.getElementById("tm-note"); if (n) n.hidden = false; el.classList.add("no-tiles"); };
    SR.addTiles(tripMap, note);
    L.control.zoom({ position: "bottomright" }).addTo(tripMap);
    const d = drawTrip(tripMap, R), m = tripMap;
    const fit = () => { m.invalidateSize(); m.fitBounds(d.bounds, { padding: [26, 26], maxZoom: 16 }); };
    fit(); setTimeout(fit, 120);
    const fb = document.getElementById("tm-fit"); if (fb) fb.onclick = fit;
    const ab = document.getElementById("tm-area");
    if (ab) {
      let areaL = null;
      ab.onclick = () => {
        const on = ab.getAttribute("aria-pressed") !== "true";
        ab.setAttribute("aria-pressed", on); ab.textContent = t(on ? "tm.area_off" : "tm.area");
        const note = document.getElementById("tm-area-note"); if (note) note.hidden = !on;
        if (areaL) { m.removeLayer(areaL); areaL = null; }
        if (!on) return;
        const depart = R.m === "arrive" ? R.T - 75 : R.T, limit = R.m === "arrive" ? R.T : R.T + 60;
        areaL = reachLayer(SR.reachTracts(R.from, R.d, depart, limit)).addTo(m);
        areaL.eachLayer((x) => x.bringToBack && x.bringToBack());
      };
    }
    const hb = document.getElementById("tm-home");
    if (hb && d.home) {
      d.home.addTo(m);
      hb.onclick = () => {
        const on = hb.getAttribute("aria-pressed") !== "true";
        hb.setAttribute("aria-pressed", on);
        on ? d.home.addTo(m) : m.removeLayer(d.home);
      };
    }
  };

  /** Draw a plan on the large map: the same drawing, plus a "back to my trip" button. */
  SR.showPlanOnMap = function (R) {
    SR.showTab("map");
    if (layers.plan) map.removeLayer(layers.plan);
    const P = R.main;
    if (!P || !P.ok) return;
    const d = drawTrip(map, R);
    layers.plan = L.layerGroup([d.main, d.ends].concat(d.home ? [d.home] : [])).addTo(map);
    setTimeout(() => {
      const wide = window.innerWidth >= 900;
      map.invalidateSize();
      map.fitBounds(d.bounds, { paddingTopLeft: wide ? [430, 80] : [24, 80], paddingBottomRight: [24, 24], maxZoom: 15 });
    }, 80);
    $("#m-back").hidden = false;
    const lg = $("#lg-trip"); if (lg) lg.hidden = false;
  };

  SR.flyTo = function (lat, lon, z) { SR.showTab("map"); setTimeout(() => map.flyTo([lat, lon], z || 14), 80); };
  SR.setHour = function (h, day) {
    if (!ready) return;
    $("#hour").value = h;
    if (day) document.querySelector("input[name=mday][value=" + day + "]").checked = true;
    update();
  };
  /** Called when the theme changes: recolour everything the map draws. */
  SR.mapTheme = function () {
    if (!ready) return;
    bnd.setStyle({ color: SR.C("--map") });
    deathL.forEach((x) => x.setStyle({ color: SR.C("--bad") }));
    riskL.forEach((x) => x.setStyle({ color: SR.C("--maybe") }));
    haloArr.forEach((x) => x.setStyle({ fillColor: SR.C("--map") }));
    update();
  };
  SR.mapUpdate = update;
  SR.refreshMap = function () { if (map) map.invalidateSize(); };
})();
