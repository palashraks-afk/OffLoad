/* Health facts, a costed fix, a vanpool option, and weather/air quality for the wait.
 * Added 2026-10-24. Written by an AI assistant (Claude Code) and logged in docs/AI_USE_LOG.md.
 * Sources: docs/ANGLES_TO_STRENGTHEN.md. Information only; not medical advice. */
(function () {
  "use strict";
  const SR = window.SR;
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Total operating cost per vehicle revenue hour, FTA National Transit Database agency profile (Omnitrans, 2022).
  const RATE = { ca33: { perHour: 141, year: 2022 } };

  // Computed from NHTSA FARS 2019-2023 for pedestrians and cyclists killed inside the district boundary.
  const INJURY = { ca33: { deaths: 217, yll: 6838, dark: 88, scene: 61, hour: 83, fast: 88 } };

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
    if (inj) h += "<li>" + t("health.injury", { c: SR.cfg.short, n: SR.num(inj.deaths), dark: inj.dark, scene: inj.scene, hour: inj.hour, fast: inj.fast, yll: SR.num(inj.yll) }) + "</li>";
    h += "<li>" + t("health.speed") + "</li></ul><p class=\"small\">" + t("health.note") + " " + t("health.src") + "</p></details>";
    return h;
  }

  function vanpoolItem() {
    return "<li>" + (SR.cfg.id === "ca33" ? t("help.vanpool_ca") : t("help.vanpool_gen")) + "</li>";
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
    if (!el || !R || !R.main || !R.main.ok) return;
    const get = async (url) => {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error("bad"); return await r.json(); } finally { clearTimeout(to); }
    };
    try {
      const bus = R.main.legs.find((l) => l.k === "bus");
      const when = bus ? bus.dep : R.main.leave;
      const lat = R.from.lat.toFixed(2), lon = R.from.lon.toFixed(2);          // rounded to about 1 km
      const wx = await get("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&hourly=apparent_temperature,uv_index&daily=sunrise,sunset&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto&forecast_days=7");
      const date0 = pickDate(wx.daily.time, wx.current.time, R.d, when);
      if (!date0) { el.remove(); return; }
      const date = addDays(date0, Math.floor(when / 1440));
      const hour = Math.floor((((when % 1440) + 1440) % 1440) / 60);
      const stamp = date + "T" + String(hour).padStart(2, "0") + ":00";
      const i = wx.hourly.time.indexOf(stamp);
      if (i < 0) { el.remove(); return; }
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
      let h = '<div class="card"><h2>' + t("wx.title") + '</h2><div class="kv">' +
        "<div><b>" + feels + "°F</b><span>" + t("wx.feels") + " · " + t("wx.heat." + heat) + "</span></div>" +
        "<div><b>" + (uv == null ? "–" : Math.round(uv)) + "</b><span>" + t("wx.uv") + (uv == null ? "" : " · " + t("wx.uv." + uvCategory(uv))) + "</span></div>" +
        (aqi == null ? "" : "<div><b>" + aqi + "</b><span>" + t("wx.air") + " · " + t("wx.aqi." + aqiCategory(aqi)) + "</span></div>") +
        (dark == null ? "" : "<div><b>" + (dark ? MOON : SUN) + "</b><span>" + t(dark ? "wx.dark" : "wx.day") + "</span></div>") + "</div>" +
        '<p class="small">' + t("wx.note", { d: esc(when_txt), t: SR.hm(when) }) + "</p></div>";
      el.innerHTML = h;
    } catch (e) { el.remove(); }                    // offline or blocked: show nothing
  }

  SR.impact = { healthHtml, vanpoolItem, costLine, waitSlot, loadConditions, heatCategory, aqiCategory, uvCategory, dayType, addDays, pickDate, costPerYear };
  if (typeof module !== "undefined") module.exports = SR.impact;
})();
