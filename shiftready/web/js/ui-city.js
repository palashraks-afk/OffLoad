/* Employers & city tab: service gaps, route what-if, shift-time fit, vanpool areas, brief, request. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["weekday", "saturday", "sunday"];
  const dayOpts = () => DAYS.map((d) => '<option value="' + d + '">' + t("day." + d) + "</option>").join("");
  const hourOpts = (sel) => Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === sel ? " selected" : "") + ">" + SR.hourLabel(h) + "</option>").join("");

  SR.cityState = { gaps: null, whatif: null, fit: null };

  SR.initCity = function () {
    renderEmployers(); renderCities(); renderCompare(); renderGaps(); renderWhatIf(); renderFit();
    $("#print-brief").onclick = printBrief;
    const csv = $("#csv-cov");
    if (csv) csv.onclick = downloadCoverage;
  };

  function downloadCoverage() {
    const r = SR.d.reach, rows = [["region", "day", "hour", "share_of_people_near_a_bus", "share_of_jobs_near_a_bus", "share_of_warehouse_transport_jobs_near_a_bus"]];
    for (const day of DAYS) for (let h = 0; h < 24; h++) rows.push([SR.cfg.short, day, h, r[day].pop_share[h], r[day].jobs_share[h], r[day].trans_jobs_share_district[h]]);
    const blob = new Blob([rows.map((x) => x.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "shiftready_" + SR.region + "_coverage_by_hour.csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------------------------------------------------------------- employers
  const EMP_HOURS = [5, 14, 22, 23];
  function renderEmployers() {
    const box = $("#employers"), E = SR.d.employers && SR.d.employers.employers;
    if (!E || !E.length) { box.hidden = true; return; }
    box.innerHTML = "<h2>" + t("emp.title") + '</h2><p class="small">' + t("emp.lead", { n: E.length }) + '</p><div class="row gap wrap"><div class="seg small" role="radiogroup" aria-label="Day">' +
      DAYS.map((d, i) => '<label><input type="radio" name="eday" value="' + d + '"' + (i ? "" : " checked") + '><span>' + t("day." + d) + "</span></label>").join("") + '</div></div><div id="emp-sum"></div><ul class="emp-list" id="emp-list"></ul><p class="small" id="emp-src"></p>';
    const run = () => {
      const day = document.querySelector("input[name=eday]:checked").value;
      const rows = E.map((e) => ({ e, a: SR.employerAccess(e, day) }));
      const n = rows.length, cnt = (h) => rows.filter((r) => r.a.hours[h]).length;
      $("#emp-sum").innerHTML = '<div class="kv">' + EMP_HOURS.map((h) => "<div><b>" + cnt(h) + " / " + n + "</b><span>" + t("emp.bus_at", { h: SR.hourLabel(h) }) + "</span></div>").join("") + "</div>";
      rows.sort((x, y) => (x.a.hours[23] - y.a.hours[23]) || (x.a.hours[22] - y.a.hours[22]) || x.e.name.localeCompare(y.e.name));
      $("#emp-list").innerHTML = rows.map((r) => {
        const { e, a } = r;
        return '<li><div class="emp-main"><b>' + esc(e.name) + "</b><span class=\"small\">" + esc(e.city) + " · " + t("emp.kind_" + e.kind) + " · " + esc(e.size) + " " + t("emp.people") + "</span>" + SR.hourBars(a.hours) + "</div>" +
          '<div class="emp-side"><span class="small">' + (a.first != null ? t("map.first_last", { a: SR.hm(a.first), b: SR.hm(a.last) }) : t("emp.no_walk", { m: a.nearestM || "?" })) + '</span><div class="row gap"><button type="button" class="link" data-map="' + e.id + '">' + t("emp.on_map") + '</button><button type="button" class="link" data-plan="' + e.id + '">' + t("emp.plan_to") + "</button></div></div></li>";
      }).join("");
      $("#emp-list").querySelectorAll("[data-map]").forEach((b) => (b.onclick = () => SR.focusEmployer(b.dataset.map)));
      $("#emp-list").querySelectorAll("[data-plan]").forEach((b) => (b.onclick = () => {
        const e = E.find((x) => x.id === b.dataset.plan); SR.coords.to = { lat: e.lat, lon: e.lon, label: e.name }; $("#to").value = e.name; SR.showTab("plan");
      }));
      SR.cityState.employers = { day, rows };
    };
    $("#emp-src").innerHTML = t("emp.src") + ' <a href="' + esc(SR.d.employers.source_url) + '" target="_blank" rel="noopener">' + esc(SR.d.employers.source) + "</a>";
    box.querySelectorAll("input[name=eday]").forEach((r) => (r.onchange = run)); run();
  }

  // ---------------------------------------------------------------- by city
  function renderCities() {
    const box = $("#cities");
    box.innerHTML = "<h2>" + t("city.by") + '</h2><p class="small">' + t("city.by_lead") + '</p><div class="row gap wrap"><select id="c-hour" style="width:auto" aria-label="' + t("gaps.hour") + '">' + hourOpts(23) + '</select><select id="c-day" style="width:auto" aria-label="' + t("gaps.day") + '">' + dayOpts() + '</select></div><div id="c-out"></div>';
    const run = () => {
      const h = +$("#c-hour").value, day = $("#c-day").value, by = {};
      SR.d.tracts.filter((x) => x.in_district && x.place).forEach((x) => {
        const c = (by[x.place] = by[x.place] || { pop: 0, on: 0, trans: 0, nocar: 0, lat: 0, lon: 0 });
        c.pop += x.pop; c.nocar += x.hh_nocar; c.trans += x.jobs_trans; c.lat += x.lat * x.pop; c.lon += x.lon * x.pop;
        if (x.cov[day][h] === "1") c.on += x.pop;
      });
      const rows = Object.keys(by).filter((k) => by[k].pop >= 3000).map((k) => ({ k, ...by[k] })).sort((a, b) => b.pop - a.pop);
      $("#c-out").innerHTML = '<ul class="city-list">' + rows.map((r) => {
        const s = r.on / r.pop;
        return "<li><div><b>" + esc(r.k) + '</b><span class="small">' + SR.num(r.pop) + " " + t("map.people") + " · " + SR.num(r.trans) + " " + t("plan.wh_jobs") + " · " + SR.num(r.nocar) + " " + t("city.nocar") + '</span></div><div class="city-bar"><span class="bar ' + (s < 0.1 ? "low" : "") + '" style="width:' + Math.max(2, s * 100) + '%"></span><b>' + SR.pct(s, 0) + '</b></div><button type="button" class="link" data-ll="' + (r.lat / r.pop) + "," + (r.lon / r.pop) + '">' + t("emp.on_map") + "</button></li>";
      }).join("") + "</ul><p class=\"small\">" + t("city.by_note", { h: SR.hourLabel(h) }) + "</p>";
      $("#c-out").querySelectorAll("[data-ll]").forEach((b) => (b.onclick = () => { const [la, lo] = b.dataset.ll.split(",").map(Number); SR.flyTo(la, lo, 13); }));
    };
    $("#c-hour").onchange = run; $("#c-day").onchange = run; run();
  }

  // ---------------------------------------------------------------- 0. compare regions
  async function renderCompare() {
    const box = $("#compare");
    let regs = [];
    regs = await SR.getRegions();
    if (regs.length < 2) { box.hidden = true; return; }
    const rows = [];
    for (const r of regs) {
      try {
        const x = await SR.getReach(r.id);
        const w = x.weekday;
        rows.push([esc(r.label) + " (" + esc(r.short) + ")" + (r.id === SR.region ? " ◀" : ""), SR.pct(w.pop_share[12]), SR.pct(w.pop_share[23], 0),
          SR.pct(w.trans_jobs_share_district[12]), SR.pct(w.trans_jobs_share_district[23], 0)]);
      } catch (e) { /* region without data */ }
    }
    SR.cityState.compare = rows;
    box.innerHTML = "<h2>" + t("cmp.title") + '</h2><p class="small">' + t("cmp.lead") + "</p>" +
      table(rows, [t("cmp.region"), t("cmp.p12"), t("cmp.p23"), t("cmp.w12"), t("cmp.w23")]) + '<p class="small">' + t("cmp.note") + "</p>";
  }

  // ---------------------------------------------------------------- 1. gaps
  function gapData(day, h) {
    const noon = 12;
    const homes = SR.d.tracts.filter((x) => x.in_district && x.cov[day][noon] === "1" && x.cov[day][h] === "0")
      .sort((a, b) => b.pop - a.pop);
    const jobs = SR.d.tracts.filter((x) => x.jobs_trans > 300 && x.cov[day][h] === "0")
      .sort((a, b) => b.jobs_trans - a.jobs_trans);
    return { homes, jobs };
  }

  function renderGaps() {
    const box = $("#gaps");
    box.innerHTML = "<h2>" + t("gaps.title") + '</h2><p class="small">' + t("gaps.lead") + '</p><div class="row gap wrap">' +
      '<label class="small" for="g-day">' + t("gaps.day") + '</label><select id="g-day" style="width:auto">' + dayOpts() + "</select>" +
      '<label class="small" for="g-hour">' + t("gaps.hour") + '</label><select id="g-hour" style="width:auto">' + hourOpts(22) + "</select></div><div id=\"gaps-out\"></div>";
    const run = () => {
      const day = $("#g-day").value, h = +$("#g-hour").value;
      const g = gapData(day, h);
      SR.cityState.gaps = { day, h, g };
      const totPop = g.homes.reduce((a, x) => a + x.pop, 0), totJobs = g.jobs.reduce((a, x) => a + x.jobs_trans, 0);
      let o = '<div class="kv"><div><b>' + SR.num(totPop) + "</b><span>" + t("gaps.lost_people", { h: SR.hourLabel(h) }) + "</span></div>" +
        "<div><b>" + SR.num(totJobs) + "</b><span>" + t("gaps.lost_jobs", { h: SR.hourLabel(h) }) + "</span></div></div>";
      o += "<h3>" + t("gaps.t_homes") + "</h3>" + table(g.homes.slice(0, 8).map((x) => [esc(SR.tractLabel(x)), SR.num(x.pop), SR.num(x.hh_nocar)]),
        [t("gaps.area"), t("gaps.people"), t("gaps.nocar")]);
      o += "<h3>" + t("gaps.t_jobs") + "</h3>" + table(g.jobs.slice(0, 8).map((x) => [esc(SR.tractLabel(x)), SR.num(x.jobs_trans), SR.num(x.jobs)]),
        [t("gaps.area"), t("gaps.wh_jobs"), t("gaps.all_jobs")]);
      $("#gaps-out").innerHTML = o;
    };
    $("#g-day").onchange = run; $("#g-hour").onchange = run; run();
  }

  function table(rows, head) {
    if (!rows.length) return '<div class="empty">' + t("empty.none") + "</div>";
    return '<div class="tablewrap"><table><thead><tr>' + head.map((h, i) => '<th class="' + (i ? "num" : "") + '">' + h + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + r.map((c, i) => '<td class="' + (i ? "num" : "") + '">' + c + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }

  // ---------------------------------------------------------------- 2. what-if
  let blockStops = null, tractStops = null;
  function ensureNear() {
    if (blockStops) return;
    blockStops = SR.d.blocks.map((b) => SR.net.near(b[0], b[1], 400).map((x) => x.s));
    tractStops = SR.d.tracts.map((x) => SR.net.near(x.lat, x.lon, 400).map((y) => y.s));
  }

  function routeStats(route, day) {
    const bit = Planner.DAY_BIT[day];
    const trips = SR.d.transit.trips.filter((x) => x[0] === route && (x[1] & bit));
    if (!trips.length) return null;
    const stops = new Set();
    let last = 0, dur = 0;
    trips.forEach((x) => { x[2].forEach((s) => stops.add(s)); last = Math.max(last, x[3][x[3].length - 1]); dur += x[3][x[3].length - 1] - x[3][0]; });
    const lastHour = Math.floor((last - 1) / 60);
    const tph = trips.filter((x) => Math.floor(x[3][0] / 60) === lastHour - 1 || Math.floor(x[3][0] / 60) === lastHour).length / 2;
    return { trips: trips.length, stops, last, avgDur: dur / trips.length, tph };
  }

  function whatIf(route, day, newEnd) {
    ensureNear();
    const rs = routeStats(route, day);
    if (!rs) return null;
    const rows = [];
    const seenT = new Set(), seenB = new Set();
    let people = 0, jobs = 0, wh = 0, addedTrips = 0;
    for (let tm = Math.ceil(rs.last / 60) * 60; tm < newEnd; tm += 60) {
      const hh = Math.floor(tm / 60) % 24, act = SR.activeStops(day)[hh];
      let p = 0, j = 0, w = 0;
      SR.d.tracts.forEach((tr, i) => {
        if (!tr.in_district || tr.cov[day][hh] === "1") return;
        if (tractStops[i].some((s) => rs.stops.has(s))) { p += tr.pop; if (!seenT.has(i)) { seenT.add(i); people += tr.pop; } }
      });
      SR.d.blocks.forEach((b, i) => {
        if (!b[5]) return;
        const near = blockStops[i];
        if (near.some((s) => act[s])) return;           // already served this hour by some route
        if (near.some((s) => rs.stops.has(s))) { j += b[2]; w += b[3]; if (!seenB.has(i)) { seenB.add(i); jobs += b[2]; wh += b[3]; } }
      });
      rows.push({ hour: hh, p, j, w });
      addedTrips += rs.tph * 2;
    }
    return { rs, rows, people, jobs, wh, vehicleHours: (addedTrips * rs.avgDur) / 60, addedTrips };
  }

  function renderWhatIf() {
    const box = $("#whatif");
    const routes = SR.d.transit.routes.map((r, i) => [i, r]).filter(([i]) => SR.d.transit.trips.some((x) => x[0] === i));
    box.innerHTML = "<h2>" + t("wi.title") + '</h2><p class="small">' + t("wi.lead") + '</p><div class="row gap wrap">' +
      '<select id="wi-route" aria-label="' + t("wi.route") + '" style="width:auto;max-width:100%">' +
      routes.map(([i, r]) => '<option value="' + i + '">' + (r[0] ? t("wi.route") + " " + esc(r[0]) + " – " : "") + esc(r[1]) + "</option>").join("") + "</select>" +
      '<select id="wi-day" style="width:auto" aria-label="' + t("gaps.day") + '">' + dayOpts() + "</select>" +
      '<label class="small" for="wi-end">' + t("wi.until") + '</label><select id="wi-end" style="width:auto"><option value="1440">12 AM</option><option value="1500">1 AM</option><option value="1560" selected>2 AM</option></select></div><div id="wi-out"></div>';
    const run = () => {
      const r = whatIf(+$("#wi-route").value, $("#wi-day").value, +$("#wi-end").value);
      SR.cityState.whatif = r ? { route: +$("#wi-route").value, day: $("#wi-day").value, end: +$("#wi-end").value, r } : null;
      if (!r) { $("#wi-out").innerHTML = '<div class="empty">' + t("wi.none") + "</div>"; return; }
      if (!r.rows.length) { $("#wi-out").innerHTML = '<div class="empty">' + t("wi.already", { t: SR.hm(r.rs.last) }) + "</div>"; return; }
      $("#wi-out").innerHTML = '<div class="kv"><div><b>' + SR.num(r.people) + "</b><span>" + t("wi.people", { c: SR.cfg.short }) + "</span></div>" +
        "<div><b>" + SR.num(r.jobs) + "</b><span>" + t("wi.jobs", { c: SR.cfg.short }) + "</span></div>" +
        "<div><b>" + SR.num(r.wh) + "</b><span>" + t("wi.wh") + "</span></div>" +
        "<div><b>~" + SR.num(r.vehicleHours) + "</b><span>" + t("wi.cost") + "</span></div></div>" +
        table(r.rows.map((x) => [SR.hourLabel(x.hour), SR.num(x.p), SR.num(x.j), SR.num(x.w)]), [t("wi.hour"), t("wi.col_p"), t("wi.col_j"), t("wi.col_w")]) +
        SR.impact.costLine(r.vehicleHours, r.people) +
        '<p class="small">' + t("wi.assume", { t: SR.hm(r.rs.last), n: r.rs.tph.toFixed(1) }) + "</p>";
    };
    ["wi-route", "wi-day", "wi-end"].forEach((id) => ($("#" + id).onchange = run));
    run();
  }

  // ---------------------------------------------------------------- 3. shift-time fit + vanpool
  function fitCompute(tractId, day) {
    const shed = SR.d.sheds[tractId], wp = SR.tractById[tractId];
    const homes = shed.homes.map(([id, n]) => ({ tr: SR.tractById[id], n })).filter((h) => h.tr);
    const total = homes.reduce((a, h) => a + h.n, 0);
    const out = [];
    for (let T = 3 * 60; T <= 23.5 * 60; T += 30) {
      const ld = Planner.latestDepartures(SR.net, wp, T, day, 800);
      let ok = 0;
      homes.forEach((h) => { if (Planner.canReachFrom(SR.net, ld, h.tr.lat, h.tr.lon, T, 800, 120)) ok += h.n; });
      out.push({ T, share: total ? ok / total : 0 });
    }
    return { out, total, all: shed.workers, shown: homes.length, wp };
  }

  function kmeans(points, k) {
    let cs = points.slice().sort((a, b) => b.n - a.n).slice(0, k).map((p) => ({ lat: p.lat, lon: p.lon }));
    let assign = new Array(points.length).fill(0);
    for (let it = 0; it < 20; it++) {
      assign = points.map((p) => cs.reduce((bi, c, i) => (Planner.hav(p.lat, p.lon, c.lat, c.lon) < Planner.hav(p.lat, p.lon, cs[bi].lat, cs[bi].lon) ? i : bi), 0));
      cs = cs.map((c, i) => {
        const m = points.filter((_, j) => assign[j] === i);
        const w = m.reduce((a, p) => a + p.n, 0);
        return w ? { lat: m.reduce((a, p) => a + p.lat * p.n, 0) / w, lon: m.reduce((a, p) => a + p.lon * p.n, 0) / w } : c;
      });
    }
    return cs.map((c, i) => {
      const m = points.filter((_, j) => assign[j] === i);
      return { c, workers: m.reduce((a, p) => a + p.n, 0), members: m };
    }).filter((x) => x.workers);
  }

  function renderFit() {
    const ids = Object.keys(SR.d.sheds).map((id) => SR.tractById[id]).filter(Boolean).sort((a, b) => b.jobs_trans - a.jobs_trans);
    const box = $("#fit");
    box.innerHTML = "<h2>" + t("fit.title") + '</h2><p class="small">' + t("fit.lead") + '</p><div class="row gap wrap">' +
      '<select id="fit-area" style="width:auto;max-width:100%" aria-label="' + t("fit.area") + '">' +
      ids.slice(0, 30).map((x) => '<option value="' + x.id + '">' + esc(SR.tractLabel(x)) + " · " + SR.num(x.jobs_trans) + " " + t("plan.wh_jobs") + "</option>").join("") + "</select>" +
      '<select id="fit-day" style="width:auto" aria-label="' + t("gaps.day") + '">' + dayOpts() + '</select></div><div id="fit-out"></div>';
    const run = () => {
      const f = fitCompute($("#fit-area").value, $("#fit-day").value);
      const best = f.out.reduce((a, b) => (b.share > a.share ? b : a));
      const cur = f.out.filter((x) => [5 * 60, 14 * 60 + 0, 22 * 60].includes(x.T));
      SR.cityState.fit = { id: $("#fit-area").value, day: $("#fit-day").value, f, best };
      let o = '<p>' + t("fit.best", { t: SR.hm(best.T), p: SR.pct(best.share) }) + "</p>";
      o += f.out.filter((x) => x.T >= 4 * 60).map((x) => '<div class="barrow' + (x === best ? " best" : "") + '"><span>' + SR.hm(x.T) + '</span><span class="bar" style="width:' + (x.share * 100) + '%" title="' + SR.pct(x.share) + '"></span><span>' + SR.pct(x.share) + "</span></div>").join("");
      o += '<p class="small">' + t("fit.note", { n: SR.num(f.total), all: SR.num(f.all) }) + "</p>";
      $("#fit-out").innerHTML = o;
      renderVanpool(f, $("#fit-day").value);
    };
    $("#fit-area").onchange = run; $("#fit-day").onchange = run; run();
  }

  function renderVanpool(f, day) {
    const shed = SR.d.sheds[f.wp.id];
    const pts = shed.homes.map(([id, n]) => ({ tr: SR.tractById[id], n })).filter((h) => h.tr).map((h) => ({ lat: h.tr.lat, lon: h.tr.lon, n: h.n, tr: h.tr }));
    const cl = kmeans(pts, 4).sort((a, b) => b.workers - a.workers);
    const rows = cl.map((x) => {
      const tractsIn = x.members;
      const near5 = tractsIn.reduce((a, p) => a + (p.tr.cov[day][5] === "1" ? p.n : 0), 0);
      const near23 = tractsIn.reduce((a, p) => a + (p.tr.cov[day][23] === "1" ? p.n : 0), 0);
      const dist = Planner.hav(x.c.lat, x.c.lon, f.wp.lat, f.wp.lon) / 1609;
      return [esc(SR.nearestPlace(x.c.lat, x.c.lon)), SR.num(x.workers), dist.toFixed(1) + " mi", SR.pct(near5 / x.workers), SR.pct(near23 / x.workers)];
    });
    SR.cityState.vanpool = { rows, area: f.wp };
    $("#vanpool").innerHTML = "<h2>" + t("van.title") + '</h2><p class="small">' + t("van.lead", { a: esc(SR.tractLabel(f.wp)) }) + "</p>" +
      table(rows, [t("van.pickup"), t("van.workers"), t("van.dist"), t("van.bus5"), t("van.bus11")]) + '<p class="small">' + t("van.note") + "</p>";
  }

  // ---------------------------------------------------------------- brief + request
  function printBrief() {
    const r = SR.d.reach, wd = r.weekday, sat = r.saturday;
    const g = SR.cityState.gaps, w = SR.cityState.whatif, fit = SR.cityState.fit;
    let h = "<h1>" + t("brief.title", { c: SR.cfg.short }) + "</h1><p>" + t("brief.sub", { a: SR.cfg.agency }) + "</p>";
    h += "<h2>" + t("brief.h_numbers") + "</h2><ul>" +
      "<li>" + t("brief.n1", { a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[22]), c: SR.pct(wd.pop_share[23], 1), d: SR.pct(wd.pop_share[1], 1) }) + "</li>" +
      "<li>" + t("brief.n2", { a: SR.pct(wd.trans_jobs_share_district[12]), b: SR.pct(wd.trans_jobs_share_district[23], 1),
        c: SR.pct(r.sensitivity_800m ? r.sensitivity_800m["12"].trans_jobs_share_district : wd.trans_jobs_share_district[12]), d: SR.pct(r.sensitivity_800m ? r.sensitivity_800m["23"].trans_jobs_share_district : wd.trans_jobs_share_district[23], 1) }) + "</li>" +
      "<li>" + t("brief.n3", { a: SR.pct(sat.pop_share[12]), b: SR.pct(sat.pop_share[22], 1) }) + "</li></ul>";
    if (SR.cityState.compare && SR.cityState.compare.length > 1) {
      h += "<h2>" + t("cmp.title") + "</h2>" + table(SR.cityState.compare, [t("cmp.region"), t("cmp.p12"), t("cmp.p23"), t("cmp.w12"), t("cmp.w23")]);
    }
    if (g) {
      h += "<h2>" + t("brief.h_gaps", { h: SR.hourLabel(g.h), d: t("day." + g.day) }) + "</h2>" +
        table(g.g.homes.slice(0, 6).map((x) => [esc(SR.tractLabel(x)), SR.num(x.pop)]), [t("gaps.area"), t("gaps.people")]) +
        table(g.g.jobs.slice(0, 6).map((x) => [esc(SR.tractLabel(x)), SR.num(x.jobs_trans)]), [t("gaps.area"), t("gaps.wh_jobs")]);
    }
    if (w && w.r.rows.length) {
      h += "<h2>" + t("brief.h_whatif") + "</h2><p>" + t("brief.whatif", { r: esc(SR.routeName(w.route)), e: SR.hm(w.end), p: SR.num(w.r.people), j: SR.num(w.r.jobs), v: SR.num(w.r.vehicleHours) }) + "</p>";
    }
    if (fit) h += "<h2>" + t("brief.h_fit") + "</h2><p>" + t("fit.best", { t: SR.hm(fit.best.T), p: SR.pct(fit.best.share) }) + " (" + esc(SR.tractLabel(fit.f.wp)) + ")</p>";
    h += "<h2>" + t("brief.h_method") + "</h2><p class=\"small\">" + t("brief.method") + "</p>";
    SR.printHtml(h);
  }

  SR.openRequest = function (R) {
    const dlg = $("#request-dlg");
    const wd = SR.d.reach.weekday;
    let body;
    if (R && R.main) {
      const first = R.main.ok ? R.main.legs.find((l) => l.k === "bus") : null;
      body = t("req.body_plan", {
        agency: SR.cfg.agency, from: R.from.label || "", to: R.to.label || "", day: t("day." + R.d).toLowerCase(),
        time: SR.hm(R.T), res: t("v." + R.verdict.level).toLowerCase(), why: R.verdict.reasons.join(" "),
        a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 1), c: SR.cfg.short,
      });
    } else {
      body = t("req.body_general", { agency: SR.cfg.agency, a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 1), c: SR.cfg.short,
        j: SR.pct(wd.trans_jobs_share_district[23], 1) });
    }
    $("#req-to").value = SR.cfg.contact_email || "";
    $("#req-subj").value = t("req.subject", { agency: SR.cfg.agency });
    $("#req-body").value = body;
    const update = () => {
      $("#req-mail").href = "mailto:" + encodeURIComponent($("#req-to").value) + "?subject=" + encodeURIComponent($("#req-subj").value) + "&body=" + encodeURIComponent($("#req-body").value);
    };
    ["req-to", "req-subj", "req-body"].forEach((id) => ($("#" + id).oninput = update));
    update();
    $("#req-copy").onclick = () => {
      const ta = $("#req-body"), done = () => { $("#req-copy").textContent = t("req.copied"); };
      const fallback = () => { ta.select(); try { document.execCommand("copy"); done(); } catch (e) { /* user can copy by hand */ } };
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, fallback); else fallback();
    };
    $("#req-copy").textContent = t("req.copy");
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  };
})();
