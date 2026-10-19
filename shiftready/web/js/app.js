/* Wiring: language, tabs, the About page, printing, start-up. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  SR.t = function (key, vars) {
    let s = (SR.STR[SR.lang] && SR.STR[SR.lang][key]) || SR.STR.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : "{" + k + "}"));
    return s;
  };
  const t = SR.t;

  SR.printHtml = function (html) {
    $("#brief").innerHTML = html;
    window.print();
  };

  function applyStatic() {
    document.documentElement.lang = SR.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $("#lang").textContent = SR.lang === "en" ? "Español" : "English";
  }

  SR.showTab = function (name) {
    document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== "tab-" + name));
    document.querySelectorAll(".tabbar button").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === name ? "page" : "false"));
    if (name === "map") SR.initMap();
    if (name === "reach") SR.initReachMap();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
    SR.currentTab = name;
  };

  function fmtDate(s) { return s && s.length === 8 ? s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6) : s || ""; }

  /** The broad problem, in one place: who, what the data show, what it costs, what is missing, and what this does about it. */
  function problemHtml() {
    const r = SR.d.reach, wd = r.weekday, dth = SR.d.deaths || [], dark = dth.length ? dth.filter((d) => d[4]).length / dth.length : null;
    const noCar = SR.d.tracts.filter((x) => x.in_district).reduce((s, x) => s + x.hh_nocar, 0);
    const P = (k, v) => "<div><b>" + t("problem." + k + "_h") + "</b><span>" + t("problem." + k, v) + "</span></div>";
    return '<div class="problem"><h2>' + t("problem.title") + "</h2><p>" + t("problem.lead", { c: SR.cfg.short, a: SR.pct(wd.pop_share[12], 0), b: SR.pct(wd.pop_share[23], 0), d: SR.pct(wd.pop_share[1], 0) }) + "</p>" +
      '<div class="pgrid">' +
      P("who", { j: SR.num(r.district_trans_jobs), c: SR.cfg.short, h: SR.num(noCar), w: SR.pct(r.bus_commute_share, 1) }) +
      P("data", { a: SR.pct(wd.pop_share[20], 0), b: SR.pct(wd.pop_share[22], 0), c: SR.pct(wd.pop_share[23], 0), s: SR.pct(r.saturday.pop_share[23], 0) }) +
      P("cost", { k: dark != null ? SR.pct(dark, 0) : "most" }) +
      P("gap", {}) + '</div><div class="art" data-art="network"></div></div>' +
      '<div class="flow"><div><b>' + t("flow.1") + "</b><span>" + t("flow.1s") + "</span></div><div><b>" + t("flow.2") + "</b><span>" + t("flow.2s") + "</span></div>" +
      "<div><b>" + t("flow.3") + "</b><span>" + t("flow.3s") + "</span></div><div><b>" + t("flow.4") + "</b><span>" + t("flow.4s") + "</span></div></div>";
  }

  function renderAbout() {
    const rr = SR.d.risk_report, r = SR.d.reach;
    const src = [
      [esc(SR.d.transit.agency) + " GTFS", t("src.gtfs")], ["Census LODES 2022", t("src.lodes")], ["Census ACS 5-year", t("src.acs")],
      ["NHTSA FARS 2019–2023", t("src.fars")], ["OpenStreetMap", t("src.osm")], ["CDPH", t("src.cdph")],
    ];
    let h = problemHtml() + '<div id="numbers"></div><div class="card" id="findings"></div><div class="card"><h2>' + t("about.what") + "</h2><p>" + t("about.what_txt") + "</p></div>";
    h += '<div class="card empabout" id="about-emp"></div>';
    h += '<div class="card"><h2>' + t("about.how") + "</h2><ul><li>" + t("about.how1") + "</li><li>" + t("about.how2") + "</li><li>" + t("about.how3") + "</li></ul></div>";
    h += '<div class="card"><h2>' + t("build.title") + "</h2><p>" + t("build.txt") + "</p></div>";
    h += '<div class="card"><h2>' + t("src.title") + "</h2>" + sourcesHtml() + "</div>";
    h += '<div class="card"><h2>' + t("about.data") + "</h2><table><tbody>" + src.map((s) => "<tr><th>" + s[0] + "</th><td>" + s[1] + "</td></tr>").join("") + "</tbody></table>" +
      '<p class="small">' + t("about.feed", { v: esc(SR.d.transit.agency) }) +
      (SR.cfg.feed_start ? " " + t("about.valid", { a: fmtDate(SR.cfg.feed_start), b: fmtDate(SR.cfg.feed_end) }) : "") + "</p></div>";
    h += '<div class="card"><h2>' + t("about.model") + "</h2>" + (rr ? modelHtml(rr) : "<p>" + t("about.model_none") + "</p>") + "</div>";
    h += '<div class="card"><h2>' + t("about.limits") + "</h2><ul>" + [1, 2, 3, 4, 5, 6].map((i) => "<li>" + t("about.lim" + i, { agency: SR.cfg.agency }) + "</li>").join("") + "</ul></div>";
    h += '<div class="card"><h2>' + t("about.privacy") + "</h2><p>" + t("about.privacy_txt") + "</p></div>";
    h += '<div class="card"><h2>' + t("faq.title") + "</h2>" + [1, 2, 3, 4, 5].map((n) => '<details class="faq"><summary>' + t("faq.q" + n) + "</summary><p>" + t("faq.a" + n) + "</p></details>").join("") + "</div>";
    h += '<div class="card"><h2>' + t("about.origin") + "</h2><p>" + t("about.origin_txt") + "</p></div>";
    h += '<div class="logo-card"><img src="logo.svg" width="96" height="96" alt="Shift Ready logo"><div><h2>' + t("logo.title") + '</h2><p class="small">' + t("logo.txt") + '</p><div class="row gap wrap"><button type="button" id="logo-copy" class="btn ghost sm">' + t("logo.copy") + '</button><a class="btn ghost sm" href="logo.svg" download>' + t("logo.dl") + "</a></div></div></div>";
    h += '<div class="card"><h2>' + t("about.ai") + "</h2><p>" + t("about.ai_txt") + "</p><p class=\"small\">" + t("about.es_note") + "</p></div>";
    $("#about").innerHTML = h;
    fillFindings();
    fillNumbers();
    fillEmployersAbout();
    const lb = $("#logo-copy"); if (lb) lb.onclick = async () => { try { const s = await (await fetch("logo.svg")).text(); await navigator.clipboard.writeText(s); lb.textContent = t("req.copied"); } catch (e) { lb.textContent = "logo.svg"; } };
  }

  function sourcesHtml() {
    const L = (u, s) => '<li><a href="' + u + '" target="_blank" rel="noopener">' + s + "</a></li>";
    return '<ul class="srcs">' +
      L("https://mobilitydatabase.org/feeds/gtfs/mdb-97", "Omnitrans GTFS schedule (the bus times and stops)") +
      L("https://lehd.ces.census.gov/data/lodes/LODES8/", "Census LODES 2022 (where people work and live)") +
      L("https://censusreporter.org/", "Census ACS 5-year, via Census Reporter (people, homes without a vehicle, commute mode)") +
      L("https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html", "Census cartographic boundaries (district and tract shapes)") +
      L("https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars", "NHTSA FARS 2019–2023 (every fatal crash, with location and light)") +
      L("https://labormarketinfo.edd.ca.gov/majorer/countymajorer.asp?CountyCode=000071", "California EDD Major Employers, 2026 2nd edition (employer names, addresses, size classes)") +
      L("https://www.openstreetmap.org/copyright", "OpenStreetMap (roads, map tiles) and Nominatim (address search)") +
      L("https://data.chhs.ca.gov/", "California CDPH facility list (hospitals, clinics, dialysis)") +
      L("https://www.riderta.com/", "GCRTA schedule (Cleveland)") + L("https://www.miamidade.gov/transit/", "Miami-Dade Transit schedule (Miami)") +
      L("https://leafletjs.com/", "Leaflet (map library)") + L("https://github.com/uswds/public-sans", "Public Sans typeface") + "</ul>";
  }

  /** The problem at named workplaces: which of the biggest employers have a bus when shifts change. */
  function fillEmployersAbout() {
    const box = $("#about-emp"), E = SR.d.employers && SR.d.employers.employers;
    if (!E || !E.length) { box.hidden = true; return; }
    const rows = E.map((e) => ({ e, a: SR.employerAccess(e, "weekday") }));
    const n = rows.length, at = (h) => rows.filter((r) => r.a.hours[h]).length;
    const feat = rows.filter((r) => r.e.kind === "warehouse" || r.e.kind === "health").sort((x, y) => (x.a.hours[23] - y.a.hours[23]) || x.e.name.localeCompare(y.e.name));
    box.innerHTML = "<h2>" + t("empabout.title") + "</h2><p>" + t("empabout.lead", { n, a: at(23) + " of " + n, b: at(5) + " of " + n }) + '</p><div class="emp-mini">' +
      feat.map((r) => "<div><b>" + esc(r.e.name) + "</b>" + SR.hourBars(r.a.hours) + '<span class="small">' + esc(r.e.city) + " · " + esc(r.e.size) + " " + t("emp.people") + " · " + (r.a.first != null ? t("map.first_last", { a: SR.hm(r.a.first), b: SR.hm(r.a.last) }) : t("emp.no_walk", { m: r.a.nearestM || "?" })) + "</span></div>").join("") + "</div>" +
      '<p class="small">' + t("emp.src") + ' <a href="' + esc(SR.d.employers.source_url) + '" target="_blank" rel="noopener">' + esc(SR.d.employers.source) + "</a></p>";
  }

  async function fillNumbers() {
    const box = $("#numbers"), r = SR.d.reach, wd = r.weekday, tr = SR.d.transit;
    const bit = Planner.DAY_BIT.weekday, trips = tr.trips.filter((x) => x[1] & bit);
    const lateShare = trips.filter((x) => x[3][x[3].length - 1] >= 22 * 60).length / trips.length;
    const earlyShare = trips.filter((x) => x[3][0] < 5 * 60).length / trips.length;
    const noCar = SR.d.tracts.filter((x) => x.in_district).reduce((s, x) => s + x.hh_nocar, 0);
    const dth = SR.d.deaths || [], dark = dth.filter((d) => d[4]).length;
    const saf = SR.d.safety ? SR.d.safety.stops : [], nightStops = saf.filter((s) => s[0] > 0).length;
    const rr = SR.d.risk_report, mrow = rr && rr.rows.find((x) => x.name.startsWith("Road-features")), brow = rr && rr.rows[0];
    const spark = '<div class="spark" role="img" aria-label="' + t("nums.spark_alt") + '">' + wd.pop_share.map((v, i) => '<i class="' + (i === 23 ? "hi" : "") + '" style="height:' + Math.max(3, v * 100) + '%"></i>').join("") + "</div>";
    const regs = await SR.getRegions(), rows = [];
    for (const g of regs) { const x = await SR.getReach(g.id); if (x) rows.push([g.label, x.weekday.pop_share[23], g.id === SR.region]); }
    const hb = '<div class="hbars">' + rows.map((x) => "<div><span>" + esc(x[0].split(",")[0]) + '</span><span class="bar ' + (x[2] ? "you" : "") + '" style="width:' + Math.max(2, x[1] * 100) + '%"></span><span>' + SR.pct(x[1], 0) + "</span></div>").join("") + "</div>";
    const N = (big, text, src, extra, cls) => '<div class="num ' + (cls || "") + '"><b>' + big + "</b><p>" + text + "</p>" + (extra || "") + "<small>" + src + "</small></div>";
    box.innerHTML = '<h2 class="sec">' + t("nums.title") + "</h2>" + '<div class="numgrid">' +
      N(SR.pct(wd.pop_share[23], 0), t("nums.n1", { c: SR.cfg.short }), t("nums.s_sched"), spark, "wide2") +
      N(SR.pct(wd.pop_share[1], 0), t("nums.n2"), t("nums.s_sched")) +
      N(SR.pct(lateShare, 0), t("nums.n3"), t("nums.s_gtfs")) +
      N(SR.pct(earlyShare, 1), t("nums.n4"), t("nums.s_gtfs")) +
      N(SR.num(noCar), t("nums.n5", { c: SR.cfg.short, p: SR.pct(r.hh_nocar_share, 1) }), "Census ACS") +
      N(SR.pct(r.bus_commute_share, 1), t("nums.n6"), "Census ACS") +
      N(SR.num(r.district_trans_jobs), t("nums.n7", { c: SR.cfg.short, p: SR.pct(wd.trans_jobs_share_district[23], 0) }), "Census LODES 2022") +
      (dth.length ? N(SR.num(dth.length), t("nums.n8", { d: SR.pct(dark / dth.length, 0) }), "NHTSA FARS 2019–2023") : "") +
      (saf.length ? N(SR.pct(nightStops / saf.length, 0), t("nums.n9", { a: SR.num(nightStops), b: SR.num(saf.length) }), "NHTSA FARS + schedule") : "") +
      (rows.length > 1 ? N(SR.pct(wd.pop_share[23], 0), t("nums.n10"), t("nums.s_sched"), hb, "wide2") : "") +
      (mrow ? N(SR.pct(mrow.cap20, 0), t("nums.n11", { b: SR.pct(brow.cap20, 0), n: rr.n_test_deaths }), "NHTSA FARS + OpenStreetMap") : "") +
      "</div>";
  }

  async function fillFindings() {
    const regs = await SR.getRegions(), box = $("#findings");
    const here = SR.d.reach, wd = here.weekday;
    let others = [];
    for (const r of regs) {
      if (r.id === SR.region) continue;
      const x = await SR.getReach(r.id);
      if (x) others.push({ r, w: x.weekday });
    }
    const cmp = others.map((o) => esc(o.r.label) + " " + SR.pct(o.w.pop_share[23], 0)).join(", ");
    box.innerHTML = "<h2>" + t("find.title") + "</h2><ul>" +
      "<li>" + t("find.f1", { c: SR.cfg.short, a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 0), d: SR.pct(wd.pop_share[1], 0) }) + (cmp ? " " + t("find.f1b", { o: cmp }) : "") + "</li>" +
      "<li>" + t("find.f2", { c: SR.cfg.short, a: SR.pct(wd.trans_jobs_share_district[12], 0), b: SR.pct(wd.trans_jobs_share_district[23], 0),
        a8: SR.pct((here.sensitivity_800m || { 12: wd.trans_jobs_share_district[12] })["12"].trans_jobs_share_district, 0), b8: SR.pct((here.sensitivity_800m || { 23: wd.trans_jobs_share_district[23] })["23"].trans_jobs_share_district, 0) }) + "</li>" +
      (SR.d.risk_report ? "<li>" + t("find.f3") + "</li>" : "") + "</ul><p class=\"small\">" + t("find.note") + "</p>";
  }

  function modelTable(rows) {
    const body = rows.map((x) => "<tr><td>" + esc(x.name) + '</td><td class="num">' + SR.pct(x.cap10, 0) + '</td><td class="num">' + SR.pct(x.cap20, 0) + "</td></tr>").join("");
    return '<div class="tablewrap">' + "<table><thead><tr><th>" + t("about.method") + '</th><th class="num">' + t("about.top10") + '</th><th class="num">' + t("about.top20") + "</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function modelHtml(rr) {
    return "<p>" + t("about.model_txt", { train: rr.train, test: rr.test, n: rr.n_test_deaths, area: esc(rr.area) }) + "</p>" + modelTable(rr.rows) +
      "<p><b>" + (rr.beats_baseline ? t("about.beats") : t("about.not_beats")) + "</b> " + esc(rr.verdict || "") + "</p>" +
      (rr.rows_night ? "<h3>" + t("about.night", { n: rr.n_test_deaths_night }) + "</h3>" + modelTable(rr.rows_night) : "") +
      (rr.features ? '<p class="small">' + t("about.features") + ": " + rr.features.map(esc).join("; ") + "</p>" : "") +
      (rr.second_region ? '<p class="small"><b>' + t("about.second") + "</b> " + esc(rr.second_region) + "</p>" : "");
  }

  function renderAll() {
    applyStatic();
    const wd = SR.d.reach.weekday;
    const sens = SR.d.reach.sensitivity_800m;
    $("#hero").innerHTML = "<b>" + SR.pct(wd.pop_share[23], 0) + "</b><span>" + t("plan.hero", { c: SR.cfg.short }) + "</span>";
    SR.initPlan();
    SR.renderExamples();
    SR.initCity();
    SR.initReach();
    renderAbout();
    SR.paintArt();
    const g = $("#gaps");
    if (g && !g.querySelector("#gaps-req")) {
      const b = document.createElement("button");
      b.id = "gaps-req"; b.className = "btn primary"; b.type = "button"; b.textContent = t("city.request");
      b.onclick = () => SR.openRequest(null);
      g.append(b);
    }
    if (SR.currentTab === "map") { $("#layers").innerHTML = ""; SR.initMap(); }
  }

  SR.setLang = function (l) {
    SR.lang = l;
    try { localStorage.setItem("sr.lang", l); } catch (e) {}
    const keep = { from: $("#from").value, to: $("#to").value, time: $("#time").value, end: $("#end-time").value };
    renderAll();
    $("#from").value = keep.from; $("#to").value = keep.to; $("#time").value = keep.time; $("#end-time").value = keep.end;
  };

  /** "Install the app": the browser's own prompt where it exists, a one-line hint on iPhone, nothing once installed. */
  let deferredInstall = null;
  function setupInstall() {
    const box = $("#install"), standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) return;
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; box.hidden = false; $("#install-btn").hidden = false; });
    window.addEventListener("appinstalled", () => { box.hidden = true; deferredInstall = null; });
    $("#install-btn").onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; box.hidden = true; };
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (ios) { box.hidden = false; $("#install-btn").hidden = true; $("#install-ios").hidden = false; }
  }

  async function start() {
    try {
      let l = null;
      try { l = localStorage.getItem("sr.lang"); } catch (e) {}
      SR.lang = l || ((navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en");
      await SR.load();
    } catch (e) {
      $("#main").innerHTML = '<div class="card"><h2>' + t("err.title") + "</h2><p>" + t("err.txt") + "</p></div>";
      console.error(e);
      return;
    }
    $("#boot") && $("#boot").remove();
    renderAll();
    try {
      const regs = await SR.getRegions();
      const sel = $("#region");
      if (regs.length > 1) {
        sel.innerHTML = regs.map((r) => '<option value="' + r.id + '"' + (r.id === SR.region ? " selected" : "") + ">" + esc(r.label) + "</option>").join("");
        sel.hidden = false;
        sel.onchange = () => { location.search = "?r=" + sel.value; };
      }
    } catch (e) {}
    const net = () => { const o = $("#offline"); o.hidden = navigator.onLine; o.textContent = t("offline.txt"); };
    window.addEventListener("online", net); window.addEventListener("offline", net); net();
    window.addEventListener("resize", () => { SR.refreshMap && SR.refreshMap(); SR.refreshReach && SR.refreshReach(); });
    $("#theme").onclick = () => SR.setTheme(SR.theme === "dark" ? "light" : "dark");
    $("#lang").onclick = () => SR.setLang(SR.lang === "en" ? "es" : "en");
    document.querySelectorAll(".tabbar button").forEach((b) => (b.onclick = () => SR.showTab(b.dataset.tab)));
    const want = new URLSearchParams(location.search).get("tab");
    SR.showTab(["plan", "reach", "map", "city", "about"].includes(want) ? want : "plan");
    SR.autoLocate();
    setupInstall();
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", start);
})();
