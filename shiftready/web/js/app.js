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
    $("#lang").textContent = SR.lang === "en" ? "ES" : "EN";
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

  function renderAbout() {
    const rr = SR.d.risk_report, r = SR.d.reach;
    const src = [
      [esc(SR.d.transit.agency) + " GTFS", t("src.gtfs")], ["Census LODES 2022", t("src.lodes")], ["Census ACS 5-year", t("src.acs")],
      ["NHTSA FARS 2019–2023", t("src.fars")], ["OpenStreetMap", t("src.osm")], ["CDPH", t("src.cdph")],
    ];
    let h = '<div class="card" id="findings"></div><div class="card"><h2>' + t("about.what") + "</h2><p>" + t("about.what_txt") + "</p></div>";
    h += '<div class="card"><h2>' + t("about.how") + "</h2><ul><li>" + t("about.how1") + "</li><li>" + t("about.how2") + "</li><li>" + t("about.how3") + "</li></ul></div>";
    h += '<div class="card"><h2>' + t("about.data") + "</h2><table><tbody>" + src.map((s) => "<tr><th>" + s[0] + "</th><td>" + s[1] + "</td></tr>").join("") + "</tbody></table>" +
      '<p class="small">' + t("about.feed", { v: esc(SR.d.transit.agency) }) +
      (SR.cfg.feed_start ? " " + t("about.valid", { a: fmtDate(SR.cfg.feed_start), b: fmtDate(SR.cfg.feed_end) }) : "") + "</p></div>";
    h += '<div class="card"><h2>' + t("about.model") + "</h2>" + (rr ? modelHtml(rr) : "<p>" + t("about.model_none") + "</p>") + "</div>";
    h += '<div class="card"><h2>' + t("about.limits") + "</h2><ul>" + [1, 2, 3, 4, 5, 6].map((i) => "<li>" + t("about.lim" + i, { agency: SR.cfg.agency }) + "</li>").join("") + "</ul></div>";
    h += '<div class="card"><h2>' + t("about.privacy") + "</h2><p>" + t("about.privacy_txt") + "</p></div>";
    h += '<div class="card"><h2>' + t("about.ai") + "</h2><p>" + t("about.ai_txt") + "</p><p class=\"small\">" + t("about.es_note") + "</p></div>";
    $("#about").innerHTML = h;
    fillFindings();
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
    return "<table><thead><tr><th>" + t("about.method") + '</th><th class="num">' + t("about.top10") + '</th><th class="num">' + t("about.top20") + "</th></tr></thead><tbody>" + body + "</tbody></table>";
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
    $("#hero").innerHTML = t("plan.hero", { p: SR.pct(wd.pop_share[23], 0), p8: SR.pct(sens ? sens["23"].pop_share : wd.pop_share[23], 0), c: SR.cfg.short, w: SR.pct(wd.trans_jobs_share_district[23], 0) });
    SR.initPlan();
    SR.initCity();
    SR.initReach();
    renderAbout();
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
    $("#lang").onclick = () => SR.setLang(SR.lang === "en" ? "es" : "en");
    document.querySelectorAll(".tabbar button").forEach((b) => (b.onclick = () => SR.showTab(b.dataset.tab)));
    SR.showTab("plan");
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", start);
})();
