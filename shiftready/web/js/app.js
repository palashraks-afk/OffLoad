/* Wiring: language, tabs, the About page, printing, start-up. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  SR.area = function () { return (SR.lang === "es" && SR.cfg.scope_es) || SR.cfg.scope || SR.cfg.short; };
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
    const aria = { region: "aria.region", from: "aria.from", to: "aria.to", "to-quick": "aria.quick", "r-day": "aria.day", "r-budget": "aria.budget", "reach-map": "aria.reachmap", map: "aria.map", "m-search": "aria.search" };
    Object.keys(aria).forEach((id) => { const el = document.getElementById(id); if (el) el.setAttribute("aria-label", t(aria[id])); });
    document.title = "Shift Ready · " + t("brand.slogan").split(". ")[0];
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
    return '<div class="problem"><h2>' + t("problem.title") + "</h2><p>" + t("problem.lead", { c: SR.area(), a: SR.pct(wd.pop_share[12], 0), b: SR.pct(wd.pop_share[23], 0), d: SR.pct(wd.pop_share[1], 0) }) + "</p>" +
      '<div class="pgrid">' +
      P("who", { j: SR.num(r.district_trans_jobs), c: SR.area(), h: SR.num(noCar), w: SR.pct(r.bus_commute_share, 1) }) +
      P("data", { a: SR.pct(wd.pop_share[20], 0), b: SR.pct(wd.pop_share[22], 0), c: SR.pct(wd.pop_share[23], 0), s: SR.pct(r.saturday.pop_share[23], 0) }) +
      P("cost", { k: dark != null ? SR.pct(dark, 0) : "most" }) +
      P("gap", {}) + '</div><div class="art" data-art="network"></div></div>' +
      '<div class="flow"><div><b>' + t("flow.1") + "</b><span>" + t("flow.1s") + "</span></div><div><b>" + t("flow.2") + "</b><span>" + t("flow.2s") + "</span></div>" +
      "<div><b>" + t("flow.3") + "</b><span>" + t("flow.3s") + "</span></div><div><b>" + t("flow.4") + "</b><span>" + t("flow.4s") + "</span></div></div>";
  }

  const GH = "https://github.com/palashraks-afk/OffLoad";

  // Each agency's published timetable (GTFS) file, as listed in shiftready/regions/*.json. All checked 2026-10-25.
  const FEEDS = {
    ca23: [["Omnitrans (buses, sbX)", "http://www.omnitrans.org/google/google_transit.zip"], ["Metrolink (commuter rail, Arrow)", "https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip"],
      ["Victor Valley Transit Authority", "https://api.transloc.com/gtfs/vvta.zip"], ["Morongo Basin Transit Authority", "https://data.trilliumtransit.com/gtfs/morongobasin-ca-us/morongobasin-ca-us.zip"],
      ["Mountain Transit (Big Bear)", "http://data.trilliumtransit.com/gtfs/bigbear-ca-us/bigbear-ca-us.zip"]],
    ca33: [["Omnitrans (buses, sbX)", "http://www.omnitrans.org/google/google_transit.zip"], ["Metrolink (commuter rail, Arrow)", "https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip"]],
    cle: [["GCRTA (Cleveland)", "https://www.riderta.com/sites/default/files/gtfs/latest/google_transit.zip"]],
    mia: [["Miami-Dade Transit", "https://www.miamidade.gov/transit/googletransit/current/google_transit.zip"]],
    sac: [["SacRT (Sacramento)", "https://apps.sacrt.com/gtfs/srtd/google_transit.zip"]],
    den: [["RTD (Denver)", "https://www.rtd-denver.com/files/gtfs/google_transit.zip"]],
    atl: [["MARTA (Atlanta)", "https://www.itsmarta.com/google_transit_feed/google_transit.zip"]],
    sea: [["King County Metro (Seattle)", "https://metro.kingcounty.gov/GTFS/google_transit.zip"]],
    bos: [["MBTA (Boston)", "https://cdn.mbta.com/MBTA_GTFS.zip"]],
  };
  const isCA = () => SR.cfg.id === "ca33" || SR.cfg.id === "ca23";
  const link = (u, s) => '<a href="' + u + '" target="_blank" rel="noopener">' + s + "</a>";

  /** Ten facts that were read from their sources on 2026-10-25 (docs/research/19_evidence_summary.md), each with what it cannot show. */
  function evidenceHtml() {
    const U = {
      1: "https://www.bls.gov/news.release/flex2.nr0.htm", 2: "https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6116a2.htm", 3: "https://www.pnas.org/doi/10.1073/pnas.1510383112",
      4: "https://www.urban.org/features/unequal-commute", 5: "https://www.iihs.org/topics/fatality-statistics/detail/pedestrians", 6: "https://aaafoundation.org/impact-speed-pedestrians-risk-severe-injury-death/",
      7: "https://www.worldtransitresearch.info/research/11390", 8: "https://blogs.worldbank.org/impactevaluations/taking-the-bus-to-opportunity-guest-post-by-david-phillips",
      9: "https://omnitrans.org/wp-content/uploads/2025/06/Service-Plan-FY-2026.pdf", 10: "https://www.americanprogress.org/article/there-are-significant-business-costs-to-replacing-employees/",
    };
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 10].concat(isCA() ? [9] : []);
    return '<ol class="ledger">' + ids.map((i) => '<li><span class="lf">' + t("ev." + i + ".f") + "</span><div><p>" + t("ev." + i + ".t") + '</p><p class="ll"><b>' + t("ev.limit") + "</b> " + t("ev." + i + ".l") +
      ' <span class="ls">' + link(U[i], t("ev." + i + ".s")) + "</span></p></div></li>").join("") + "</ol>" +
      '<div class="ev-not"><h3>' + t("evn.title") + "</h3><ul>" + [1, 2, 3, 4].map((i) => "<li>" + t("evn." + i) + "</li>").join("") + "</ul></div>" +
      '<p class="small">' + link(GH + "/blob/main/docs/research/19_evidence_summary.md", "docs/research/19_evidence_summary.md") + " · " + link(GH + "/tree/main/docs/research", t("ds.own.res")) + "</p>";
  }

  /** Every dataset, with a link, what it is used for, its version and its terms. */
  function dataHtml() {
    const rows = [["lodes", "https://lehd.ces.census.gov/data/lodes/LODES8/"], ["acs", "https://censusreporter.org/"], ["tiger", "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html"],
      ["fars", "https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars"], ["osm", "https://www.openstreetmap.org/copyright"]];
    if ((SR.d.pois || []).length) rows.push(["cdph", "https://data.chhs.ca.gov/"]);
    rows.push(["wx", "https://open-meteo.com/en/docs"], ["bls", "https://www.bls.gov/news.release/flex2.nr0.htm"]);
    if (isCA()) rows.push(["ntd", "https://www.transit.dot.gov/ntd"], ["sbc", "https://indicators.sbcounty.gov/transportation/mobility/"]);
    const feeds = FEEDS[SR.cfg.id] || [];
    const reg = SR.cfg.short || SR.cfg.id;
    let h = '<p class="ab-lead">' + t("ds.lead") + "</p>" +
      '<div class="ds-feeds"><h3>' + t("ds.feeds", { r: esc(reg) }) + "</h3><ul>" + feeds.map((f) => "<li>" + link(f[1], esc(f[0])) + "</li>").join("") + "</ul>" +
      '<p class="small">' + t("ds.feeds_note") + (SR.cfg.feed_start ? " " + t("ds.feedwin", { a: fmtDate(SR.cfg.feed_start), b: fmtDate(SR.cfg.feed_end) }) : "") + "</p></div>" +
      "<h3>" + t("ds.general") + '</h3><dl class="ds">' + rows.map((r) => "<div><dt>" + link(r[1], t("ds." + r[0] + ".n")) + "</dt><dd>" + t("ds." + r[0] + ".u") +
        '<span class="dsm"><b>' + t("ds.vintage") + ":</b> " + t("ds." + r[0] + ".v") + " · <b>" + t("ds.terms") + ":</b> " + t("ds." + r[0] + ".t") + "</span></dd></div>").join("") + "</dl>" +
      "<h3>" + t("ds.own") + '</h3><p class="small">' + t("ds.own_note") + '</p><ul class="own">' +
      "<li>" + link(GH + "/tree/main/shiftready/web/data/" + SR.cfg.id, t("ds.own.data")) + "</li>" +
      '<li><a href="data/open/' + SR.cfg.id + '_coverage_by_hour.csv" download>' + t("ds.own.open") + '</a> · <a href="data/open/' + SR.cfg.id + '_coverage_by_hour.json" download>' + t("ds.own.open_json") + '</a> · <a href="data/open/all_regions_coverage_by_hour.csv" download>' + t("ds.own.open_all") + '</a> · <a href="data/open/README.md" target="_blank" rel="noopener">' + t("ds.own.open_readme") + "</a></li>" +
      "<li>" + link(GH + "/tree/main/shiftready/prep", t("ds.own.prep")) + "</li>" +
      "<li>" + link(GH + "/tree/main/shiftready/tests", t("ds.own.tests")) + "</li>" +
      "<li>" + link(GH + "/blob/main/docs/AI_USE_LOG.md", t("ds.own.ai")) + "</li>" +
      "<li>" + link(GH + "/tree/main/docs/research", t("ds.own.res")) + "</li>" +
      "<li>" + link(GH + "/blob/main/docs/SCORECARD.md", t("ds.own.score")) + "</li></ul>";
    return h;
  }

  function checksHtml() {
    return '<ol class="steps">' + [1, 2, 3, 4].map((i) => "<li>" + t("ck." + i) + "</li>").join("") + '</ol><p class="ab-callout">' + t("ck.cannot") + "</p>";
  }

  function renderAbout() {
    const rr = SR.d.risk_report;
    const sit = SR.workedExamples ? SR.workedExamples() : [];
    const sec = (id, inner) => '<section class="ab-sec" id="a-' + id + '"><h2 class="ab-h">' + t("ab.n." + id) + "</h2>" + inner + "</section>";
    let problem = problemHtml() + '<div id="numbers"></div><div class="card" id="findings"></div><p class="ab-lead">' + t("about.what_txt") + "</p>";
    if (isCA()) problem += '<div class="ab-more"><h3>' + t("ang.title") + "</h3><ul>" + [1, 4, 2, 3].map((i) => "<li>" + t("ang." + i) + "</li>").join("") + '</ul><p class="small">' + t("ang.src") + "</p></div>";
    problem += '<div class="card empabout" id="about-emp"></div>';
    let situations = "";
    if (sit.length) {
      situations = '<p class="small">' + t("sit.lead") + "</p>" + sit.map((x) => {
        const R = x.R, lv = R.verdict.level, hm = SR.hm;
        const home = R.home && R.home.ok ? t("sit.home_ok", { t: hm(R.home.leave) }) : t("sit.home_no", { e: hm(R.endT) });
        const hh = (v) => hm(+v.split(":")[0] * 60 + +v.split(":")[1]);
        return '<div class="sit"><b>' + t(x.k) + "</b> · " + t("sit.row", { a: esc(x.from), b: esc(x.to), s: hh(x.T), e: hh(x.end) }) +
          '<br><span class="badge ' + (lv === "yes" ? "ok" : lv === "maybe" ? "warn" : "bad") + '">' + t("v." + lv) + "</span> " + esc(R.verdict.reasons[0] || "") + " " + home + "</div>";
      }).join("") + "<h3>" + t("sit.forum") + '</h3><ul class="small">' + [1, 2, 3, 4, 5, 6].map((i) => "<li>" + t("sit.f." + i) + "</li>").join("") + '</ul><p class="small">' + t("sit.forum_note") + "</p>";
    }
    const how = '<ul>' + [1, 2, 3, 4, 5].map((i) => "<li>" + t("diff." + i) + "</li>").join("") + "</ul><h3>" + t("about.how") + "</h3><ul><li>" + t("about.how1") + "</li><li>" + t("about.how2") + "</li><li>" + t("about.how3") + "</li></ul>" +
      "<h3>" + t("build.title") + "</h3><p>" + t("build.txt") + "</p>";
    const checks = checksHtml() + "<h3>" + t("about.model") + "</h3>" + (rr ? modelHtml(rr) : "<p>" + t("about.model_none") + "</p>");
    const limits = '<ul class="lims">' + [1, 2, 3, 4, 5, 6].map((i) => "<li>" + t("about.lim" + i, { agency: SR.cfg.agencies || SR.cfg.agency }) + "</li>").join("") + "</ul>" +
      "<h3>" + t("about.privacy") + "</h3><p>" + t("about.privacy_txt") + " " + t("about.weather_txt") + "</p>" +
      "<h3>" + t("faq.title") + "</h3>" + [1, 2, 3, 4, 5].map((n) => '<details class="faq"><summary>' + t("faq.q" + n) + "</summary><p>" + t("faq.a" + n) + "</p></details>").join("");
    const credits = "<p>" + t("about.origin_txt") + "</p><h3>" + t("about.ai") + "</h3><p>" + t("about.ai_txt") + '</p><p class="small">' + t("about.es_note") + "</p>" +
      '<div class="logo-card"><img src="logo.svg" width="96" height="96" alt="Shift Ready logo"><div><h4>' + t("logo.title") + '</h4><p class="small">' + t("logo.txt") + '</p><div class="row gap wrap"><button type="button" id="logo-copy" class="btn ghost sm">' + t("logo.copy") + '</button><a class="btn ghost sm" href="logo.svg" download>' + t("logo.dl") + "</a></div></div></div>";
    const parts = [["problem", problem], ["situations", situations], ["evidence", evidenceHtml()], ["how", how], ["data", dataHtml()], ["checks", checks], ["limits", limits], ["credits", credits]].filter((x) => x[1]);
    const toc = '<nav class="ab-toc" aria-label="' + t("ab.toc") + '"><span class="ab-toc-l">' + t("ab.toc") + "</span>" + parts.map((x) => '<a href="#a-' + x[0] + '" data-go="a-' + x[0] + '">' + t("ab.n." + x[0]) + "</a>").join("") + "</nav>";
    const evTitle = '<p class="ab-lead ev-lead">' + t("ev.lead") + "</p>";
    $("#about").innerHTML = '<header class="ab-head"><p class="ab-intro">' + t("ab.intro") + "</p></header>" + toc +
      parts.map((x) => sec(x[0], (x[0] === "evidence" ? evTitle : "") + x[1])).join("");
    fillFindings();
    fillNumbers();
    fillEmployersAbout();
    document.querySelectorAll(".ab-toc a").forEach((a) => {
      a.onclick = (e) => {
        e.preventDefault();
        const el = document.getElementById(a.dataset.go);
        if (el) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      };
    });
    const lb = $("#logo-copy"); if (lb) lb.onclick = async () => { try { const s = await (await fetch("logo.svg")).text(); await navigator.clipboard.writeText(s); lb.textContent = t("req.copied"); } catch (e) { lb.textContent = "logo.svg"; } };
  }

  /** The problem at named workplaces: which of the biggest employers have a bus when shifts change. */
  function fillEmployersAbout() {
    const box = $("#about-emp"), E = SR.d.employers && SR.d.employers.employers;
    if (!E || !E.length) { box.hidden = true; return; }
    const rows = E.map((e) => ({ e, a: SR.employerAccess(e, "weekday") }));
    const n = rows.length, at = (h) => rows.filter((r) => r.a.hours[h]).length;
    const feat = rows.filter((r) => r.e.kind === "warehouse" || r.e.kind === "health").sort((x, y) => (x.a.hours[23] - y.a.hours[23]) || x.e.name.localeCompare(y.e.name));
    box.innerHTML = "<h2>" + t("empabout.title") + "</h2><p>" + t("empabout.lead", { n, a: at(23) + (SR.lang === "es" ? " de " : " of ") + n, b: at(5) + (SR.lang === "es" ? " de " : " of ") + n }) + '</p><div class="emp-mini">' +
      feat.map((r) => "<div><b>" + esc(r.e.name) + "</b>" + SR.hourBars(r.a.hours) + '<span class="small">' + esc(r.e.city) + " · " + esc(r.e.size) + " " + t("emp.people") + " · " + (r.a.first != null ? t("map.first_last", { a: SR.hm(r.a.first), b: SR.hm(r.a.last) }) : t("emp.no_walk", { m: r.a.nearestM || "?" })) + "</span></div>").join("") + "</div>" +
      '<p class="small">' + t("emp.src") + ' <a href="' + esc(SR.d.employers.source_url) + '" target="_blank" rel="noopener">' + esc(SR.d.employers.source) + "</a></p>";
  }

  async function fillNumbers() {
    const box = $("#numbers"), r = SR.d.reach, wd = r.weekday, tr = SR.d.transit;
    const bit = Planner.DAY_BIT.weekday, trips = tr.trips.filter((x) => (x[1] & bit) && !/^Metrolink/.test(tr.routes[x[0]][1]));   // these two numbers are about buses
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
      N(SR.pct(wd.pop_share[23], 0), t("nums.n1", { c: SR.area() }), t("nums.s_sched"), spark, "wide2") +
      N(SR.pct(wd.pop_share[1], 0), t("nums.n2"), t("nums.s_sched")) +
      N(SR.pct(lateShare, 0), t("nums.n3"), t("nums.s_gtfs")) +
      N(SR.pct(earlyShare, 1), t("nums.n4"), t("nums.s_gtfs")) +
      N(SR.num(noCar), t("nums.n5", { c: SR.area(), p: SR.pct(r.hh_nocar_share, 1) }), "Census ACS") +
      N(SR.pct(r.bus_commute_share, 1), t("nums.n6"), "Census ACS") +
      N(SR.num(r.district_trans_jobs), t("nums.n7", { c: SR.area(), p: SR.pct(wd.trans_jobs_share_district[23], 0) }), "Census LODES 2022") +
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
      "<li>" + t("find.f1", { c: SR.area(), a: SR.pct(wd.pop_share[12]), b: SR.pct(wd.pop_share[23], 0), d: SR.pct(wd.pop_share[1], 0) }) + (cmp ? " " + t("find.f1b", { o: cmp }) : "") + "</li>" +
      "<li>" + t("find.f2", { c: SR.area(), a: SR.pct(wd.trans_jobs_share_district[12], 0), b: SR.pct(wd.trans_jobs_share_district[23], 0),
        a8: SR.pct((here.sensitivity_800m || { 12: wd.trans_jobs_share_district[12] })["12"].trans_jobs_share_district, 0), b8: SR.pct((here.sensitivity_800m || { 23: wd.trans_jobs_share_district[23] })["23"].trans_jobs_share_district, 0) }) + "</li>" +
      (SR.d.risk_report ? "<li>" + t("find.f3") + "</li>" : "") + "</ul><p class=\"small\">" + t("find.note") + "</p>";
  }

  function modelTable(rows) {
    const body = rows.map((x) => "<tr><td>" + esc(x.name) + '</td><td class="num">' + SR.pct(x.cap10, 0) + '</td><td class="num">' + SR.pct(x.cap20, 0) + "</td></tr>").join("");
    return '<div class="tablewrap">' + "<table><thead><tr><th>" + t("about.method") + '</th><th class="num">' + t("about.top10") + '</th><th class="num">' + t("about.top20") + "</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function modelHtml(rr) {
    return (SR.lang === "es" ? '<p class="small">' + t("about.tech_en") + "</p>" : "") + "<p>" + t("about.model_txt", { train: rr.train, test: rr.test, n: rr.n_test_deaths, area: esc(rr.area) }) + "</p>" + modelTable(rr.rows) +
      "<p><b>" + (rr.beats_baseline ? t("about.beats") : t("about.not_beats")) + "</b> " + esc(rr.verdict || "") + "</p>" +
      (rr.rows_night ? "<h3>" + t("about.night", { n: rr.n_test_deaths_night }) + "</h3>" + modelTable(rr.rows_night) : "") +
      (rr.features ? '<p class="small">' + t("about.features") + ": " + rr.features.map(esc).join("; ") + "</p>" : "") +
      (rr.second_region ? '<p class="small"><b>' + t("about.second") + "</b> " + esc(rr.second_region) + "</p>" : "") + externalHtml();
  }

  /** Tests of the model on a district it never saw (prep/risk_external.py). Shown whatever the result. */
  function externalHtml() {
    const ex = SR.d.risk_external;
    if (!ex || !ex.tests || !ex.tests.length) return "";
    const pc = (v) => SR.pct(v, 0), pts = (v) => (v >= 0 ? "+" : "−") + Math.abs(Math.round(v * 100));
    return "<h3>" + t("ext.title") + "</h3>" + ex.tests.map((x) => {
      const m = x.rows.find((r) => r.name.indexOf("Model trained") === 0), c10 = x.comparisons.find((c) => c.q === 0.1), c20 = x.comparisons.find((c) => c.q === 0.2);
      const b = x.rows.find((r) => r.name === c10.baseline);
      const word = { better: t("ext.beats"), partial: t("ext.partial"), mixed: t("ext.mixed"), worse: t("ext.worse"), tie: t("ext.tie") }[x.outcome] || t("ext.tie");
      const ref = x.in_district_reference ? " " + t("ext.ref", { b: esc(x.tested_on.short), r: pc(x.in_district_reference.cap20) }) : "";
      return "<p>" + t("ext.txt", { a: esc(x.trained_on.short), b: esc(x.tested_on.short), n: x.n_test_deaths, m20: pc(m.cap20), b20: pc(b.cap20), d20: pts(c20.diff), l20: pts(c20.ci[0]), h20: pts(c20.ci[1]),
        m10: pc(m.cap10), b10: pc(b.cap10), d10: pts(c10.diff), l10: pts(c10.ci[0]), h10: pts(c10.ci[1]) }) + " <b>" + word + "</b>" + ref + "</p>";
    }).join("") + '<p class="small">' + t("ext.note", { b: esc(ex.tests[0].tested_on.short) }) + "</p>";
  }

  function renderAll() {
    applyStatic();
    const wd = SR.d.reach.weekday;
    const sens = SR.d.reach.sensitivity_800m;
    $("#hero").innerHTML = "<b>" + SR.pct(wd.pop_share[23], 0) + "</b><span>" + t("plan.hero", { c: SR.area() }) + "</span>";
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
    if (SR.rerenderPlan) SR.rerenderPlan();
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
