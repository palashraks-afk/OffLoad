/* Turn what a person types into a point. ZIPs and city names work offline; street addresses use
 * OpenStreetMap Nominatim from the visitor's browser (disclosed on the About page). */
(function () {
  "use strict";
  const SR = window.SR;
  const cache = new Map();

  SR.geocode = async function (text) {
    const q = (text || "").trim();
    if (!q) return null;
    if (cache.has(q)) return cache.get(q);
    let out = null;
    const zip = q.match(/\b(9\d{4})\b/);
    const onlyZip = /^\s*9\d{4}\s*$/.test(q);
    const cities = SR.d.places.cities;
    const cityKey = Object.keys(cities).find((c) => c.toLowerCase() === q.toLowerCase().replace(/,.*$/, "").trim());
    if (onlyZip && SR.d.places.zips[zip[1]]) {
      const z = SR.d.places.zips[zip[1]];
      out = { lat: z[0], lon: z[1], label: "ZIP " + zip[1], approx: true };
    } else if (cityKey) {
      out = { lat: cities[cityKey][0], lon: cities[cityKey][1], label: cityKey, approx: true };
    } else {
      try {
        const b = SR.d.boundary.geometry.coordinates.flat(2);
        const lons = b.filter((_, i) => i % 2 === 0), lats = b.filter((_, i) => i % 2 === 1);
        const pad = 0.25;
        const box = [Math.min(...lons) - pad, Math.max(...lats) + pad, Math.max(...lons) + pad, Math.min(...lats) - pad].join(",");
        const u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&viewbox=" + box +
          "&bounded=1&q=" + encodeURIComponent(q);
        const r = await fetch(u, { headers: { "Accept-Language": SR.lang } });
        const j = await r.json();
        if (j && j[0]) out = { lat: +j[0].lat, lon: +j[0].lon, label: j[0].display_name.split(",").slice(0, 3).join(","), approx: false };
      } catch (e) { out = null; }
      if (!out && zip && SR.d.places.zips[zip[1]]) {
        const z = SR.d.places.zips[zip[1]];
        out = { lat: z[0], lon: z[1], label: "ZIP " + zip[1], approx: true };
      }
    }
    if (out) cache.set(q, out);
    return out;
  };

  /** Where is this point, in words that work offline? "near Fontana". */
  SR.nearLabel = function (lat, lon) {
    let name = "";
    try { name = SR.nearestPlace(lat, lon); } catch (e) { /* data not loaded yet */ }
    return name ? SR.t("loc.near", { p: name }) : SR.t("plan.my_loc");
  };

  /**
   * Ask the browser where the person is. Resolves {lat, lon, accuracy, label}.
   * Rejects with {code}: "unsupported" | "denied" | "unavailable" | "timeout".
   * A first quick high-accuracy try, then one patient low-accuracy retry (indoors, a phone can take a while).
   */
  SR.locate = function () {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ code: "unsupported" });
      const done = (p) => {
        const g = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
        g.label = SR.nearLabel(g.lat, g.lon);
        try { sessionStorage.setItem("sr.loc", JSON.stringify({ lat: g.lat, lon: g.lon, t: Date.now() })); } catch (e) { /* private mode */ }
        resolve(g);
      };
      navigator.geolocation.getCurrentPosition(done, (e) => {
        if (e && e.code === 1) return reject({ code: "denied" });
        navigator.geolocation.getCurrentPosition(done, (e2) => {
          reject({ code: e2 && e2.code === 1 ? "denied" : e2 && e2.code === 3 ? "timeout" : "unavailable" });
        }, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    });
  };

  /** "granted" | "prompt" | "denied" | "unknown" without asking. */
  SR.locationPermission = async function () {
    try { return (await navigator.permissions.query({ name: "geolocation" })).state; } catch (e) { return "unknown"; }
  };

  /** Is a point inside the region we have data for? If not, which other region is it near? */
  SR.regionCheck = async function (lat, lon) {
    const km = (c) => Planner.hav(lat, lon, c[0], c[1]) / 1000;
    const here = SR.cfg.center ? km(SR.cfg.center) : 0;
    if (here <= 70) return { inside: true };
    const regs = await SR.getRegions();
    const other = regs.filter((r) => r.id !== SR.region && r.center).map((r) => ({ r, d: km(r.center) })).sort((a, b) => a.d - b.d)[0];
    return { inside: false, km: Math.round(here), suggest: other && other.d <= 70 ? other.r : null };
  };

  /** One place that handles the whole "use my location" story, with plain-language outcomes. */
  SR.useMyLocation = async function (opts) {
    const say = (msg, kind, act) => opts.say && opts.say(msg, kind, act);
    say(SR.t("loc.finding"), "info");
    let g;
    try { g = await SR.locate(); }
    catch (e) { say(SR.t("loc.err_" + (e.code || "unavailable")), "warn"); return null; }
    const chk = await SR.regionCheck(g.lat, g.lon);
    if (!chk.inside) {
      if (chk.suggest) say(SR.t("loc.other_region", { r: chk.suggest.label }), "warn", () => { location.search = "?r=" + chk.suggest.id; });
      else say(SR.t("loc.outside", { n: chk.km, r: SR.cfg.short }), "warn");
      return null;
    }
    say(SR.t("loc.ok", { l: g.label }), "ok");
    return g;
  };
})();
