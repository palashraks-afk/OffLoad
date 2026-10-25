/* Health facts, a costed fix, a vanpool option, and weather/air quality for the wait.
 * Added 2026-10-24. Written by an AI assistant (Claude Code) and logged in docs/AI_USE_LOG.md.
 * Sources: docs/ANGLES_TO_STRENGTHEN.md. Information only; not medical advice. */
(function () {
  "use strict";
  const SR = window.SR;
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Total operating cost per vehicle revenue hour, FTA National Transit Database agency profile (Omnitrans, 2022).
  const RATE = { ca33: { perHour: 141, year: 2022 }, ca23: { perHour: 141, year: 2022 } };   // Omnitrans; the what-if lists only Omnitrans routes

  // Computed from NHTSA FARS 2019-2023 for pedestrians and cyclists killed inside the district boundary.
  const INJURY = {
    ca33: { deaths: 217, yll: 6838, dark: 88, scene: 61, hour: 83, fast: 88 },
    ca23: { area: "the San Bernardino County part of CA-23", area_es: "la parte de CA-23 en el condado de San Bernardino", deaths: 201, yll: 6271, dark: 84, scene: 62, hour: 81, fast: 89 },   // same method, polygon of CA-23 inside the county
  };

  // ---------- pure helpers (checked by shiftready/tests/impact.test.js) ----------
  function heatCategory(f) {            // National Weather Service heat index bands
    if (f >= 125) return "extreme_danger";
    if (f >= 103) return "danger";
    if (f >= 91) return "extreme_caution";
    if (f >= 80) return "caution";
    if (f <= 32) return "cold";
    return "none";
  }
  function aqiCategory(a) {             // EPA air quality index bands
    if (a <= 50) return "good";
    if (a <= 100) return "moderate";
    if (a <= 150) return "sensitive";
    if (a <= 200) return "unhealthy";
    if (a <= 300) return "very_unhealthy";
    return "hazardous";
  }
  function uvCategory(u) {              // WHO UV index bands
    if (u < 3) return "low";
    if (u < 6) return "moderate";
    if (u < 8) return "high";
    if (u < 11) return "very_high";
    return "extreme";
  }
  function dayType(dateStr) {           // "2026-10-26" -> weekday / saturday / sunday
    const d = new Date(dateStr + "T12:00:00Z").getUTCDay();
    return d === 0 ? "sunday" : d === 6 ? "saturday" : "weekday";
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  /** First forecast date that matches the wanted day type and is still ahead of "now" (all in the place's own time). */
  function pickDate(dates, nowIso, wanted, minuteOfDay) {
    const today = nowIso.slice(0, 10), nowMin = +nowIso.slice(11, 13) * 60 + +nowIso.slice(14, 16);
    const m = ((minuteOfDay % 1440) + 1440) % 1440;
    for (const d of dates) {
      if (dayType(d) !== wanted) continue;
      if (d === today && m <= nowMin) continue;
      return d;
    }
    return null;
  }
  function costPerYear(vehicleHoursPerDay, perHour) {
    return { allDays: vehicleHoursPerDay * 365 * perHour, weekdays: vehicleHoursPerDay * 250 * perHour };
  }

  const SUN = '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>', MOON = '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/></svg>';

  // ---------- cards ----------
  function healthHtml(R) {
    if (R && R.main && R.main.ok && R.verdict && R.verdict.level === "yes") {
      const bus = R.main.legs.find((l) => l.k === "bus"), h0 = bus ? Math.floor((((bus.dep % 1440) + 1440) % 1440) / 60) : 12;
      if (h0 >= 6 && h0 < 20) return "";   // easy daytime trip: skip the sleep and injury facts
    }
    const inj = INJURY[SR.cfg.id];
    let h = '<details class="card fold"><summary><h2>' + t("health.title") + "</h2></summary><ul>" +
      "<li>" + t("health.sleep", { a: "44.0", b: "28.8", c: "69.7", d: "52.3" }) + "</li>" +
      "<li>" + t("health.drowsy") + "</li>";
    if (inj) h += "<li>" + t("health.injury", { c: (SR.lang === "es" && inj.area_es) || inj.area || SR.cfg.short, n: SR.num(inj.deaths), dark: inj.dark, scene: inj.scene, hour: inj.hour, fast: inj.fast, yll: SR.num(inj.yll) }) + "</li>";
    h += "<li>" + t("health.speed") + "</li></ul><p class=\"small\">" + t("health.note") + " " + t("health.src") + "</p></details>";
    return h;
  }


  /** Compact "check live" row: official alert and tracking pages, and a warning when the timetable is about to end. */
  function fmtD(ymd) { return ymd && ymd.length === 8 ? ymd.slice(0, 4) + "-" + ymd.slice(4, 6) + "-" + ymd.slice(6) : ymd || ""; }
  function feedStatus(feedEnd, todayYmd) {   // "ok" | "soon" (ends within 21 days) | "expired" | null
    if (!feedEnd || feedEnd.length !== 8) return null;
    if (todayYmd > feedEnd) return "expired";
    const a = Date.UTC(+feedEnd.slice(0, 4), +feedEnd.slice(4, 6) - 1, +feedEnd.slice(6)), n = Date.UTC(+todayYmd.slice(0, 4), +todayYmd.slice(4, 6) - 1, +todayYmd.slice(6));
    return (a - n) / 864e5 <= 21 ? "soon" : "ok";
  }
  function liveHtml() {
    const c = SR.cfg, d = new Date(), ymd = "" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    const st = feedStatus(c.feed_end, ymd);
    let h = '<div class="card live"><h2>' + t("live.title") + '</h2><p class="small">' + t("live.txt") + "</p>";
    if (c.alerts_url || c.track_url || c.live_links) {
      h += '<div class="chips">';
      const who = c.live_links ? " · " + esc(c.agency) : "";   // with several operators, say whose alerts these are
      if (c.alerts_url) h += '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(c.alerts_url) + '">' + t("live.alerts") + who + "</a>";
      if (c.track_url) h += '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(c.track_url) + '">' + t("live.track") + who + "</a>";
      (c.live_links || []).forEach((x) => { h += '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(x.url) + '">' + esc(x.name) + "</a>"; });
      h += "</div>";
    }
    if (st === "soon" || st === "expired") h += '<p class="small"><b>' + t(st === "soon" ? "live.soon" : "live.expired", { b: fmtD(c.feed_end) }) + "</b></p>";
    else if (st === "ok") h += '<p class="small">' + t("live.valid", { b: fmtD(c.feed_end) }) + "</p>";
    return h + "</div>";
  }

  function vanpoolItem() {
    return "<li>" + (SR.cfg.id === "ca33" || SR.cfg.id === "ca23" ? t("help.vanpool_ca") : t("help.vanpool_gen")) + "</li>";
  }

  function costLine(vehicleHoursPerDay, people) {
    const r = RATE[SR.cfg.id];
    if (!r || !(vehicleHoursPerDay > 0)) return "";
    const c = costPerYear(vehicleHoursPerDay, r.perHour);
    return '<p class="small">' + t("wi.cost_year", { a: SR.num(c.allDays), b: SR.num(c.weekdays), r: r.perHour, agency: SR.cfg.agency, y: r.year }) +
      (people > 0 ? " " + t("wi.cost_person", { p: SR.num(c.allDays / people) }) : "") + "</p>";
  }

  /** Placeholder shown in the result; filled in by loadConditions once the forecast arrives (hidden if it cannot load). */
  function waitSlot() { return '<div id="wx"></div>'; }

  async function loadConditions(R) {
    const el = document.getElementById("wx");
    if (!el || !R || !R.main) return;
    const get = async (url) => {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error("bad"); return await r.json(); } finally { clearTimeout(to); }
    };
    const off = () => { el.innerHTML = '<p class="cond small">' + t("wx.off") + "</p>"; };   // never silently vanish
    try {
      const bus = R.main.ok ? R.main.legs.find((l) => l.k === "bus") : null;
      const when = bus ? bus.dep : R.main.ok ? R.main.leave : R.T;          // no bus works: use the time you asked about
      const bs = bus ? SR.d.transit.stops[bus.fromStop] : null;                      // weather where you will actually wait
      const lat = (bs ? bs[1] : R.from.lat).toFixed(2), lon = (bs ? bs[2] : R.from.lon).toFixed(2);   // rounded to about 1 km
      const wx = await get("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&hourly=apparent_temperature,uv_index&daily=sunrise,sunset&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto&forecast_days=7");
      const date0 = pickDate(wx.daily.time, wx.current.time, R.d, when);
      if (!date0) { off(); return; }
      const date = addDays(date0, Math.floor(when / 1440));
      const hour = Math.floor((((when % 1440) + 1440) % 1440) / 60);
      const stamp = date + "T" + String(hour).padStart(2, "0") + ":00";
      const i = wx.hourly.time.indexOf(stamp);
      if (i < 0) { off(); return; }
      const feels = Math.round(wx.hourly.apparent_temperature[i]), uv = wx.hourly.uv_index[i];
      const di = wx.daily.time.indexOf(date);
      const dark = di >= 0 ? (stamp < wx.daily.sunrise[di].slice(0, 16) || stamp >= wx.daily.sunset[di].slice(0, 16)) : null;
      let aqi = null;
      try {
        const aq = await get("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + lat + "&longitude=" + lon + "&hourly=us_aqi&timezone=auto&forecast_days=5");
        const j = aq.hourly.time.indexOf(stamp); if (j >= 0 && aq.hourly.us_aqi[j] != null) aqi = Math.round(aq.hourly.us_aqi[j]);
      } catch (e) { /* air quality is optional */ }
      const heat = heatCategory(feels);
      const when_txt = new Date(date + "T12:00:00Z").toLocaleDateString(SR.lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
      const item = (icon, label, val, cat) => '<span class="ci">' + icon + "<span>" + (val !== "" ? "<b>" + val + "</b> " : "") + label + (cat ? (label ? " · " : "") + cat : "") + "</span></span>";
      let h = '<div class="cond" aria-label="' + t("wx.title") + '"><span class="ct">' + t("wx.title") + "</span>" +
        item(heat === "none" ? "" : '<span class="dot ' + heat + '"></span>', t("wx.feels"), feels + "°F", t("wx.heat." + heat)) +
        item("", t("wx.uv"), uv == null ? "–" : Math.round(uv), uv == null ? "" : t("wx.uv." + uvCategory(uv))) +
        (aqi == null ? "" : item("", t("wx.air"), aqi, t("wx.aqi." + aqiCategory(aqi)))) +
        (dark == null ? "" : item(dark ? MOON : SUN, "", "", t(dark ? "wx.dark" : "wx.day"))) +
        '<span class="cn">' + t("wx.note", { d: esc(when_txt), t: SR.hm(when) }) + "</span></div>";
      el.innerHTML = h;
    } catch (e) { off(); }
  }

  SR.impact = { liveHtml, feedStatus, healthHtml, vanpoolItem, costLine, waitSlot, loadConditions, heatCategory, aqiCategory, uvCategory, dayType, addDays, pickDate, costPerYear };
  if (typeof module !== "undefined") module.exports = SR.impact;
})();
