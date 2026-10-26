/* Employers and cities tab. One question first (which start times can your workers reach?), then actions,
 * then a brief to take to the transit agency, then the evidence (employers, gaps, route what-if, cities, regions, vanpool). */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["weekday", "saturday", "sunday"];
  const dayOpts = () => DAYS.map((d) => '<option value="' + d + '">' + t("day." + d) + "</option>").join("");
  const hourOpts = (sel) => Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === sel ? " selected" : "") + ">" + SR.hourLabel(h) + "</option>").join("");
  const dayRadios = (name, cur) => '<div class="seg small" role="radiogroup" aria-label="' + t("gaps.day") + '">' +
    DAYS.map((d) => '<label><input type="radio" name="' + name + '" value="' + d + '"' + (d === cur ? " checked" : "") + "><span>" + t("day." + d) + "</span></label>").join("") + "</div>";

  const svg = (d) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + d + "</svg>";
  const ICON = {
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    van: svg('<path d="M3 16V8a2 2 0 0 1 2-2h9l5 5v5"/><path d="M3 16h2m10 0h6"/><circle cx="7.5" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M14 6v5h5"/>'),
    pass: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>'),
    stop: svg('<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>'),
    send: svg('<path d="M4 12l16-8-6 16-3-7-7-1z"/>'),
    stopOff: svg('<circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/>'),
  };

  SR.cityState = SR.cityState || { gaps: null, whatif: null, fit: null };

  SR.initCity = function () {
    renderScope(); renderDecision(); renderAgency(); renderEmployers(); renderGaps(); renderWhatIf(); renderCities(); renderCompare();
  };

  /** Area names come from stop names ("Hesperia Rd SB & Winona St"); drop the direction suffixes a manager cannot read (SB also means San Bernardino). */
  const lab = (x) => SR.tractLabel(x).replace(/\s+(?:NB|SB|EB|WB)(?=\s|$)/g, "");
  const agencies = () => (SR.cfg.agencies || SR.cfg.agency).replace(/ and /g, SR.lang === "es" ? " y " : " and ");
  const fmtDate = (s) => (s && s.length === 8 ? s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6) : s || "");
  /** Fill a collapsed section's summary line: its title and one headline figure. */
  function evSum(id, title, head) {
    const s = document.querySelector("#ev-" + id + " > summary");
    if (s) s.innerHTML = '<span class="ev-t">' + title + "</span>" + (head ? '<span class="ev-h">' + head + "</span>" : "");
  }
  const meaning = (k, v) => '<p class="meaning">' + t(k, v) + "</p>";

  function renderScope() {
    $("#city-scope").textContent = t("city.scope", { c: SR.area(), a: agencies() }) + (SR.cfg.feed_end ? " " + t("live.valid", { b: fmtDate(SR.cfg.feed_end) }) : "");
  }

  function downloadCoverage() {
    const r = SR.d.reach, rows = [["region", "scope", "day", "hour", "share_of_people_near_a_bus", "share_of_jobs_near_a_bus", "share_of_warehouse_transport_jobs_near_a_bus"]];
    for (const day of DAYS) for (let h = 0; h < 24; h++) rows.push([SR.cfg.short, '"' + SR.area() + '"', day, h, r[day].pop_share[h], r[day].jobs_share[h], r[day].trans_jobs_share_district[h]]);
    const blob = new Blob([rows.map((x) => x.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "shiftready_" + SR.region + "_coverage_by_hour.csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function table(rows, head) {
    if (!rows.length) return '<div class="empty">' + t("empty.none") + "</div>";
    const plain = head.map((h) => String(h).replace(/<[^>]+>/g, ""));
    return '<div class="tablewrap"><table class="stack"><thead><tr>' + head.map((h, i) => '<th class="' + (i ? "r" : "") + '">' + h + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + r.map((c, i) => '<td class="' + (i ? "r" : "") + '" data-label="' + esc(plain[i]) + '">' + c + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }

  // ---------------------------------------------------------------- the one question: which start times can your workers reach?
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

  let empByTract = null;
  /** Each listed employer belongs to the nearest Census tract (within 3 km), so a job area can say which employers it holds. */
  function employersByTract() {
    if (empByTract) return empByTract;
    empByTract = {};
    const E = (SR.d.employers && SR.d.employers.employers) || [];
    E.forEach((e) => {
      let best = null, bd = Infinity;
      SR.d.tracts.forEach((x) => { const d = Planner.hav(e.lat, e.lon, x.lat, x.lon); if (d < bd) { bd = d; best = x; } });
      if (best && bd < 3000) (empByTract[best.id] = empByTract[best.id] || []).push(e);
    });
    return empByTract;
  }

  const wordFor = (s) => (s >= 0.6 ? t("dec.most") : s >= 0.25 ? t("dec.some") : t("dec.few"));

  function renderDecision() {
    const box = $("#decision");
    empByTract = null;
    const all = Object.keys(SR.d.sheds || {}).map((id) => SR.tractById[id]).filter(Boolean);
    if (!all.length) { box.innerHTML = "<h2>" + t("dec.title") + '</h2><div class="empty">' + t("dec.nodata") + "</div>"; $("#actions").innerHTML = ""; return; }
    const mk = (x) => '<option value="' + x.id + '">' + esc(lab(x)) + " · " + SR.num(x.jobs) + " " + t("dec.jobs") + "</option>";
    const inD = all.filter((x) => x.in_district).sort((a, b) => b.jobs - a.jobs).slice(0, 20);
    const out = all.filter((x) => !x.in_district).sort((a, b) => b.jobs - a.jobs).slice(0, 15);
    const opts = inD.length
      ? '<optgroup label="' + esc(t("dec.grp_in", { c: SR.cfg.short })) + '">' + inD.map(mk).join("") + "</optgroup>" + (out.length ? '<optgroup label="' + esc(t("dec.grp_out")) + '">' + out.map(mk).join("") + "</optgroup>" : "")
      : out.map(mk).join("");
    const st = SR.cityState;
    box.innerHTML = "<h2>" + t("dec.title") + '</h2><p class="small">' + t("dec.lead") + '</p><div class="dec-pick"><label class="small" for="fit-area">' + t("dec.area") + '</label><select id="fit-area">' + opts + "</select>" +
      dayRadios("fday", st.areaDay || "weekday") + '</div><div id="fit-out" aria-live="polite"></div>';
    const sel = $("#fit-area");
    if (st.areaId && [...sel.options].some((o) => o.value === st.areaId)) sel.value = st.areaId;
    const run = () => {
      const id = sel.value, day = document.querySelector("input[name=fday]:checked").value;
      st.areaId = id; st.areaDay = day;
      const f = fitCompute(id, day);
      const at = (T) => (f.out.find((x) => x.T === T) || { share: 0 }).share;
      const best = f.out.reduce((a, b) => (b.share > a.share ? b : a));
      const s5 = at(300), s14 = at(840), s22 = at(1320);
      st.fit = { id, day, f, best, s5, s14, s22 };
      const inc = (employersByTract()[id] || []).map((e) => esc(e.name));
      const shift = (key, T, s) => '<li><span class="sh-l"><b>' + t(key) + "</b> " + SR.hm(T) + '</span><span class="meter" aria-hidden="true"><i style="width:' + Math.max(2, s * 100) + '%"></i></span><span class="sh-p"><b>' + SR.pct(s) + "</b> " + wordFor(s) + "</span></li>";
      let o = best.share < 0.05 ? '<p class="answer">' + t("dec.none") + "</p>" : '<p class="answer">' + t("dec.answer", { t: SR.hm(best.T), p: SR.pct(best.share), n: SR.num(f.total) }) + "</p>";
      o += '<ul class="shifts">' + shift("dec.s5", 300, s5) + shift("dec.s14", 840, s14) + shift("dec.s22", 1320, s22) + "</ul>";
      if (inc.length) o += '<p class="small">' + t("dec.includes", { a: inc.join(", ") }) + "</p>";
      o += meaning("dec.mean");
      o += '<details class="sub"><summary>' + t("dec.all") + "</summary>" + f.out.filter((x) => x.T >= 4 * 60).map((x) => '<div class="barrow' + (x === best ? " best" : "") + '"><span>' + SR.hm(x.T) + '</span><span class="bar" style="width:' + (x.share * 100) + '%" title="' + SR.pct(x.share) + '"></span><span>' + SR.pct(x.share) + "</span></div>").join("") + "</details>";
      o += '<p class="small">' + t("fit.note", { n: SR.num(f.total), all: SR.num(f.all) }) + "</p>";
      $("#fit-out").innerHTML = o;
      renderVan(f, day);
      renderActions();
    };
    sel.onchange = run;
    box.querySelectorAll("input[name=fday]").forEach((r) => (r.onchange = run));
    run();
  }

  // ---------------------------------------------------------------- what you can do
  function renderActions() {
    const box = $("#actions"), st = SR.cityState, fit = st.fit;
    if (!fit) { box.innerHTML = ""; return; }
    const { best, s22, f, day } = fit;
    const li = (icon, title, body) => '<li><span class="ic">' + ICON[icon] + "</span><div><b>" + title + "</b><p>" + body + "</p></div></li>";
    let items = "";
    if (best.share < 0.05) items += li("clock", t("act.none_t"), t("act.none"));
    else if (s22 >= 0.5) items += li("clock", t("act.keep_t"), t("act.keep", { n: SR.pct(s22) }));
    else items += li("clock", t("act.move_t"), t("act.move", { n: SR.pct(s22), b: SR.hm(best.T), p: SR.pct(best.share) }));
    const van = st.vanpool && st.vanpool.top;
    if (van) items += li("van", t("act.van_t"), t("act.van", { n: SR.num(van.workers), a: esc(van.name) }) + " " + (SR.cfg.id === "ca33" || SR.cfg.id === "ca23" ? t("act.van_ca") : t("act.van_gen")));
    const F = SR.d.transit.fares;
    items += li("pass", t("act.pass_t"), F && F.adult && F.adult.d31 ? t("act.pass", { a: esc(SR.cfg.agency), p: F.adult.d31.toFixed(0) }) : t("act.pass_gen"));
    const noWalk = (employersByTract()[fit.id] || []).map((e) => ({ e, a: SR.employerAccess(e, day) })).find((x) => x.a.first == null);
    items += li("stop", t("act.shuttle_t"), noWalk ? t("act.shuttle_no", { e: esc(noWalk.e.name), m: noWalk.a.nearestM || "?" }) : t("act.shuttle"));
    items += li("send", t("act.ask_t"), t("act.ask"));
    box.innerHTML = "<h2>" + t("act.title") + '</h2><p class="small">' + t("act.lead") + '</p><ol class="acts">' + items + '</ol><p class="small">' + t("act.src") + "</p>";
  }

  // ---------------------------------------------------------------- take it to the agency
  function renderAgency() {
    const box = $("#agency");
    box.innerHTML = "<h2>" + t("agency.title") + "</h2><p>" + t("agency.lead") + '</p><div class="row gap wrap"><button id="print-brief" class="btn primary" type="button">' + t("city.print") + '</button><button id="req-city" class="btn ghost" type="button">' + t("city.request") + '</button><button id="csv-cov" class="btn ghost" type="button">' + t("city.csv") + "</button></div>" +
      (SR.cfg.contact_email ? '<p class="small">' + t("agency.contact", { e: esc(SR.cfg.contact_email) }) + "</p>" : "");
    $("#print-brief").onclick = printBrief;
    $("#req-city").onclick = () => SR.openRequest(null);
    $("#csv-cov").onclick = downloadCoverage;
  }

  // ---------------------------------------------------------------- evidence: employers
  const EMP_HOURS = [5, 14, 22, 23];
  function renderEmployers() {
    const box = $("#employers"), wrap = $("#ev-employers"), E = SR.d.employers && SR.d.employers.employers;
    if (!E || !E.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const nIn = E.filter((e) => e.in_district).length;
    evSum("employers", t("emp.title"), t("ev.emp_h", { a: nIn, c: SR.cfg.short, n: E.length }));
    const st = SR.cityState;
    box.innerHTML = meaning("emp.mean") + '<div class="emp-tools"><input type="search" id="emp-q" placeholder="' + esc(t("emp.search")) + '" aria-label="' + esc(t("emp.search")) + '" value="' + esc(st.empQ || "") + '">' + dayRadios("eday", st.empDay || "weekday") +
      '</div><p class="small" id="emp-sum"></p><div class="hax" aria-hidden="true"><span>12 AM</span><span>12 PM</span><span>11 PM</span></div><div id="emp-list"></div><p class="small" id="emp-src"></p>';
    const row = (r) => {
      const { e, a } = r;
      return '<li><div class="emp-main"><b>' + esc(e.name) + '</b><span class="small">' + esc(e.city) + " · " + t("emp.kind_" + e.kind) + " · " + esc(e.size) + " " + t("emp.people") + "</span>" + SR.hourBars(a.hours) + "</div>" +
        '<div class="emp-side"><span class="small">' + (a.first != null ? t("emp.first_last", { a: SR.hm(a.first), b: SR.hm(a.last) }) : t("emp.no_walk", { m: a.nearestM || "?" })) + '</span><div class="row gap"><button type="button" class="link" data-map="' + e.id + '">' + t("emp.on_map") + '</button><button type="button" class="link" data-plan="' + e.id + '">' + t("emp.plan_to") + "</button></div></div></li>";
    };
    const run = () => {
      const day = document.querySelector("input[name=eday]:checked").value, q = ($("#emp-q").value || "").trim().toLowerCase();
      st.empDay = day; st.empQ = q;
      const rows = E.map((e) => ({ e, a: SR.employerAccess(e, day) }));
      const n = rows.length, cnt = (h) => rows.filter((r) => r.a.hours[h]).length;
      $("#emp-sum").textContent = t("emp.sum", { n, a: cnt(5), b: cnt(14), c: cnt(22), d: cnt(23) });
      const sorted = rows.slice().sort((x, y) => (x.a.hours[23] - y.a.hours[23]) || (x.a.hours[22] - y.a.hours[22]) || x.e.name.localeCompare(y.e.name));
      const shown = sorted.filter((r) => !q || (r.e.name + " " + r.e.city).toLowerCase().includes(q));
      const grp = (title, list) => (list.length ? "<h3>" + title + '</h3><ul class="emp-rows">' + list.map(row).join("") + "</ul>" : "");
      const ins = shown.filter((r) => r.e.in_district), outs = shown.filter((r) => !r.e.in_district);
      $("#emp-list").innerHTML = (shown.length ? grp(t("emp.in", { c: SR.cfg.short }), ins) + grp(t("emp.out", { c: SR.cfg.short }), outs) : '<div class="empty">' + t("empty.none") + "</div>");
      $("#emp-list").querySelectorAll("[data-map]").forEach((b) => (b.onclick = () => SR.focusEmployer(b.dataset.map)));
      $("#emp-list").querySelectorAll("[data-plan]").forEach((b) => (b.onclick = () => {
        const e = E.find((x) => x.id === b.dataset.plan); SR.coords.to = { lat: e.lat, lon: e.lon, label: e.name }; $("#to").value = e.name; SR.showTab("plan");
      }));
      SR.cityState.employers = { day, rows };
    };
    $("#emp-src").innerHTML = t("emp.src") + ' <a href="' + esc(SR.d.employers.source_url) + '" target="_blank" rel="noopener">' + esc(SR.d.employers.source) + "</a>";
    box.querySelectorAll("input[name=eday]").forEach((r) => (r.onchange = run));
    $("#emp-q").oninput = run;
    run();
  }

  // ---------------------------------------------------------------- evidence: where service disappears
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
    box.innerHTML = meaning("gaps.mean") + '<div class="ctl-row"><label class="small" for="g-day">' + t("gaps.day") + '</label><select id="g-day">' + dayOpts() + "</select>" +
      '<label class="small" for="g-hour">' + t("gaps.hour") + '</label><select id="g-hour">' + hourOpts(22) + '</select></div><div id="gaps-out"></div>';
    const run = () => {
      const day = $("#g-day").value, h = +$("#g-hour").value;
      const g = gapData(day, h);
      SR.cityState.gaps = { day, h, g };
      const totPop = g.homes.reduce((a, x) => a + x.pop, 0), totJobs = g.jobs.reduce((a, x) => a + x.jobs_trans, 0);
      evSum("gaps", t("gaps.title"), t("ev.gaps_h", { p: SR.num(totPop), h: SR.hourLabel(h) }));
      let o = '<ul class="figs"><li><b>' + SR.num(totPop) + "</b> " + t("gaps.lost_people", { h: SR.hourLabel(h) }) + "</li>" +
        "<li><b>" + SR.num(totJobs) + "</b> " + t("gaps.lost_jobs", { h: SR.hourLabel(h) }) + "</li></ul>";
      o += "<h3>" + t("gaps.t_homes") + "</h3>" + table(g.homes.slice(0, 8).map((x) => [esc(lab(x)), SR.num(x.pop), SR.num(x.hh_nocar)]),
        [t("gaps.area"), t("gaps.people"), t("gaps.nocar")]);
      o += "<h3>" + t("gaps.t_jobs") + "</h3>" + table(g.jobs.slice(0, 8).map((x) => [esc(lab(x)), SR.num(x.jobs_trans), SR.num(x.jobs)]),
        [t("gaps.area"), t("gaps.wh_jobs"), t("gaps.all_jobs")]);
      o += '<button type="button" class="btn primary" id="gaps-req">' + t("city.request") + "</button>";
      $("#gaps-out").innerHTML = o;
      $("#gaps-req").onclick = () => SR.openRequest(null);
    };
    $("#g-day").onchange = run; $("#g-hour").onchange = run; run();
  }

  // ---------------------------------------------------------------- evidence: what if one route ran later
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

  const routeLabel = (i) => { const r = SR.d.transit.routes[i]; return r[0] ? t("wi.route").toLowerCase() + " " + r[0] : r[1]; };

  function renderWhatIf() {
    const box = $("#whatif");
    evSum("whatif", t("wi.title"), t("ev.wi_h"));
    let routes = SR.d.transit.routes.map((r, i) => [i, r]).filter(([i, r]) => !r[3] && SR.d.transit.trips.some((x) => x[0] === i));   // the cost model is the main agency's; other operators' routes are not its to extend
    // routes that serve more of the district's people come first, so the default is one that matters here
    ensureNear();
    const stopsOf = {};
    SR.d.transit.trips.forEach((x) => { (stopsOf[x[0]] = stopsOf[x[0]] || new Set()); x[2].forEach((s) => stopsOf[x[0]].add(s)); });
    const reachPop = (i) => SR.d.tracts.reduce((a, tr, k) => (tr.in_district && tractStops[k].some((s) => stopsOf[i] && stopsOf[i].has(s)) ? a + tr.pop : a), 0);
    routes = routes.map(([i, r]) => [i, r, reachPop(i)]).sort((a, b) => b[2] - a[2]).map(([i, r]) => [i, r]);
    box.innerHTML = meaning("wi.mean") + '<p class="small">' + t("wi.ops", { agency: esc(SR.cfg.agency) }) + '</p><div class="ctl-row">' +
      '<select id="wi-route" aria-label="' + t("wi.route") + '">' +
      routes.map(([i, r]) => '<option value="' + i + '">' + (r[0] ? t("wi.route") + " " + esc(r[0]) + " – " : "") + esc(r[1]) + "</option>").join("") + "</select>" +
      '<select id="wi-day" aria-label="' + t("gaps.day") + '">' + dayOpts() + "</select>" +
      '<label class="small" for="wi-end">' + t("wi.until") + '</label><select id="wi-end"><option value="1440">12 AM</option><option value="1500">1 AM</option><option value="1560" selected>2 AM</option></select></div><div id="wi-out"></div>';
    const run = () => {
      const r = whatIf(+$("#wi-route").value, $("#wi-day").value, +$("#wi-end").value);
      SR.cityState.whatif = r ? { route: +$("#wi-route").value, day: $("#wi-day").value, end: +$("#wi-end").value, r } : null;
      if (!r) { $("#wi-out").innerHTML = '<div class="empty">' + t("wi.none") + "</div>"; return; }
      if (!r.rows.length) { $("#wi-out").innerHTML = '<div class="empty">' + t("wi.already", { t: SR.hm(r.rs.last) }) + "</div>"; return; }
      const endTxt = SR.hourLabel(Math.floor(+$("#wi-end").value / 60) % 24);
      $("#wi-out").innerHTML = '<p class="answer sm">' + t("wi.sentence", { r: esc(routeLabel(+$("#wi-route").value)), e: endTxt, p: SR.num(r.people), j: SR.num(r.jobs), w: SR.num(r.wh), v: SR.num(r.vehicleHours) }) + "</p>" +
        table(r.rows.map((x) => [SR.hourLabel(x.hour), SR.num(x.p), SR.num(x.j), SR.num(x.w)]), [t("wi.hour"), t("wi.col_p"), t("wi.col_j"), t("wi.col_w")]) +
        SR.impact.costLine(r.vehicleHours, r.people) +
        '<p class="small">' + t("wi.assume", { t: SR.hm(r.rs.last), n: r.rs.tph.toFixed(1) }) + "</p>";
    };
    ["wi-route", "wi-day", "wi-end"].forEach((id) => ($("#" + id).onchange = run));
    run();
  }

  // ---------------------------------------------------------------- evidence: by city
  function renderCities() {
    const box = $("#cities");
    const st = SR.cityState;
    box.innerHTML = meaning("city.mean") + '<div class="ctl-row"><label class="small" for="c-hour">' + t("gaps.hour") + '</label><select id="c-hour">' + hourOpts(22) + '</select><label class="small" for="c-day">' + t("gaps.day") + '</label><select id="c-day">' + dayOpts() + '</select></div><div id="c-out"></div>';
    const run = () => {
      const h = +$("#c-hour").value, day = $("#c-day").value, by = {};
      SR.d.tracts.filter((x) => x.in_district && x.place).forEach((x) => {
        const c = (by[x.place] = by[x.place] || { pop: 0, on: 0, trans: 0, nocar: 0, lat: 0, lon: 0 });
        c.pop += x.pop; c.nocar += x.hh_nocar; c.trans += x.jobs_trans; c.lat += x.lat * x.pop; c.lon += x.lon * x.pop;
        if (x.cov[day][h] === "1") c.on += x.pop;
      });
      const rows = Object.keys(by).filter((k) => by[k].pop >= 3000).map((k) => ({ k, ...by[k] })).sort((a, b) => b.pop - a.pop);
      evSum("cities", t("city.by"), t("ev.cities_h", { n: rows.length }));
      const shown = st.citiesAll ? rows : rows.slice(0, 8);
      $("#c-out").innerHTML = '<ul class="city-list">' + shown.map((r) => {
        const s = r.on / r.pop;
        return "<li><div><b>" + esc(r.k) + '</b><span class="small">' + SR.num(r.pop) + " " + t("map.people") + " · " + SR.num(r.trans) + " " + t("plan.wh_jobs") + " · " + SR.num(r.nocar) + " " + t("city.nocar") + '</span></div><div class="city-bar"><span class="bar ' + (s < 0.1 ? "low" : "") + '" style="width:' + Math.max(2, s * 100) + '%"></span><b>' + SR.pct(s, 0) + '</b></div><button type="button" class="link" data-ll="' + (r.lat / r.pop) + "," + (r.lon / r.pop) + '">' + t("emp.on_map") + "</button></li>";
      }).join("") + "</ul>" + (rows.length > 8 ? '<button type="button" class="link" id="c-more">' + (st.citiesAll ? t("city.top") : t("city.all", { n: rows.length })) + "</button>" : "") + "<p class=\"small\">" + t("city.by_note", { h: SR.hourLabel(h) }) + "</p>";
      $("#c-out").querySelectorAll("[data-ll]").forEach((b) => (b.onclick = () => { const [la, lo] = b.dataset.ll.split(",").map(Number); SR.flyTo(la, lo, 13); }));
      const more = $("#c-more"); if (more) more.onclick = () => { st.citiesAll = !st.citiesAll; run(); };
    };
    $("#c-hour").onchange = run; $("#c-day").onchange = run; run();
  }

  // ---------------------------------------------------------------- evidence: compare regions
  async function renderCompare() {
    const box = $("#compare"), wrap = $("#ev-compare");
    let regs = [];
    regs = await SR.getRegions();
    if (regs.length < 2) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const rows = [];
    for (const r of regs) {
      try {
        const x = await SR.getReach(r.id);
        const w = x.weekday;
        rows.push([esc(r.label) + " (" + esc(r.short) + ")" + (r.id === SR.region ? ' <span class="tag">' + t("cmp.here") + "</span>" : ""), SR.pct(w.pop_share[12]), SR.pct(w.pop_share[23], 0),
          SR.pct(w.trans_jobs_share_district[12]), SR.pct(w.trans_jobs_share_district[23], 0)]);
      } catch (e) { /* region without data */ }
    }
    SR.cityState.compare = rows.map((r) => r.map((c, i) => (i ? c : String(c).replace(/<[^>]+>/g, ""))));
    evSum("compare", t("cmp.title"), t("ev.cmp_h", { n: rows.length }));
    box.innerHTML = meaning("cmp.mean") + '<p class="small">' + t("cmp.lead", { n: rows.length }) + "</p>" +
      table(rows, [t("cmp.region"), t("cmp.p12"), t("cmp.p23"), t("cmp.w12"), t("cmp.w23")]) + '<p class="small">' + t("cmp.note") + "</p>";
  }

  // ---------------------------------------------------------------- evidence: vanpool pickup areas
  function renderVan(f, day) {
    const shed = SR.d.sheds[f.wp.id];
    const pts = shed.homes.map(([id, n]) => ({ tr: SR.tractById[id], n })).filter((h) => h.tr).map((h) => ({ lat: h.tr.lat, lon: h.tr.lon, n: h.n, tr: h.tr }));
    const cl = kmeans(pts, 4).sort((a, b) => b.workers - a.workers);
    const names = cl.map((x) => SR.nearestPlace(x.c.lat, x.c.lon));
    const rows = cl.map((x, i) => {
      const near5 = x.members.reduce((a, p) => a + (p.tr.cov[day][5] === "1" ? p.n : 0), 0);
      const near23 = x.members.reduce((a, p) => a + (p.tr.cov[day][23] === "1" ? p.n : 0), 0);
      const dist = Planner.hav(x.c.lat, x.c.lon, f.wp.lat, f.wp.lon) / 1609;
      return [esc(names[i]), SR.num(x.workers), dist.toFixed(1) + " mi", SR.pct(near5 / x.workers), SR.pct(near23 / x.workers)];
    });
    SR.cityState.vanpool = { rows, area: f.wp, top: cl.length ? { name: names[0], workers: cl[0].workers } : null };
    evSum("van", t("van.title"), esc(lab(f.wp)));
    $("#vanpool").innerHTML = meaning("van.mean") + '<p class="small">' + t("van.lead", { a: esc(lab(f.wp)) }) + "</p>" +
      table(rows, [t("van.pickup"), t("van.workers"), t("van.dist"), t("van.bus5"), t("van.bus11")]) + '<p class="small">' + t("van.note") + "</p>";
  }

  // ---------------------------------------------------------------- brief + request
  function printBrief() {
    const r = SR.d.reach, wd = r.weekday, sat = r.saturday;
    const g = SR.cityState.gaps, w = SR.cityState.whatif, fit = SR.cityState.fit;
    let h = "<h1>" + t("brief.title", { c: SR.cfg.short }) + "</h1><p>" + t("brief.scope", { c: SR.area() }) + " " + t("brief.sub", { a: agencies() }) + "</p>";
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
        table(g.g.homes.slice(0, 6).map((x) => [esc(lab(x)), SR.num(x.pop)]), [t("gaps.area"), t("gaps.people")]) +
        table(g.g.jobs.slice(0, 6).map((x) => [esc(lab(x)), SR.num(x.jobs_trans)]), [t("gaps.area"), t("gaps.wh_jobs")]);
    }
    if (w && w.r.rows.length) {
      h += "<h2>" + t("brief.h_whatif") + "</h2><p>" + t("brief.whatif", { r: esc(SR.routeName(w.route)), e: SR.hm(w.end), p: SR.num(w.r.people), j: SR.num(w.r.jobs), v: SR.num(w.r.vehicleHours) }) + "</p>";
    }
    if (fit) h += "<h2>" + t("brief.h_fit") + "</h2><p>" + t("fit.best", { t: SR.hm(fit.best.T), p: SR.pct(fit.best.share) }) + " (" + esc(lab(fit.f.wp)) + ")</p>";
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
        a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 1), c: SR.area(),
      });
    } else {
      body = t("req.body_general", { agency: SR.cfg.agency, a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 1), c: SR.area(),
        j: SR.pct(wd.trans_jobs_share_district[23], 1) });
    }
    $("#req-to").value = SR.cfg.contact_email || "";
    $("#req-subj").value = t("req.subject", { agency: SR.cfg.agency });
    $("#req-body").value = body;
    const update = () => {
      $("#req-mail").href = "mailto:" + encodeURIComponent($("#req-to").value).replace(/%40/g, "@") + "?subject=" + encodeURIComponent($("#req-subj").value) + "&body=" + encodeURIComponent($("#req-body").value);
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
