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

  SR.locate = function () {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("unsupported"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, label: "My location", approx: false }),
        (e) => reject(e), { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    });
  };
})();
