/* Small line illustrations for empty states. One stroke weight, currentColor, nothing decorative that carries no meaning. */
(function () {
  "use strict";
  const SR = (window.SR = window.SR || {});
  const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  SR.ART = {
    // a bus-stop sign under a crescent moon, with the last route running off the edge
    stop: '<svg viewBox="0 0 220 140" width="220" height="140" role="img" aria-label="" ' + S + '>' +
      '<path d="M0 118h220" stroke-dasharray="3 5"/><path d="M62 118V38"/><rect x="42" y="18" width="40" height="30" rx="2"/>' +
      '<path d="M50 28h24M50 36h14"/><path d="M52 118h20"/>' +
      '<path d="M150 22a22 22 0 1 0 22 28a17 17 0 0 1-22-28z"/>' +
      '<path d="M96 104h54l8-14h26" stroke-dasharray="1 5"/><circle cx="100" cy="104" r="3.5"/><circle cx="184" cy="90" r="3.5"/></svg>',
    // rings of reach around a start point
    reach: '<svg viewBox="0 0 220 140" width="220" height="140" role="img" aria-label="" ' + S + '>' +
      '<circle cx="110" cy="70" r="6" fill="currentColor"/><circle cx="110" cy="70" r="24"/><circle cx="110" cy="70" r="44" stroke-dasharray="3 5"/>' +
      '<circle cx="110" cy="70" r="64" stroke-dasharray="1 6"/><path d="M110 70l30-18M110 70l-36 12M110 70l8 40"/><circle cx="140" cy="52" r="3.5"/><circle cx="74" cy="82" r="3.5"/><circle cx="118" cy="110" r="3.5"/></svg>',
  };
  /** The district's real bus network drawn from the schedule: every route running at noon next to every route running at 11 PM. */
  SR.networkArt = function (day) {
    const T = SR.d.transit, bit = Planner.DAY_BIT[day || "weekday"];
    const bb = SR.d.boundary.geometry.coordinates.flat(2); const lons = bb.filter((_, i) => i % 2 === 0), lats = bb.filter((_, i) => i % 2 === 1);
    const pad = 0.06, w0 = Math.min(...lons) - pad, w1 = Math.max(...lons) + pad, s0 = Math.min(...lats) - pad, s1 = Math.max(...lats) + pad;
    const W = 300, H = Math.round(W * (s1 - s0) / ((w1 - w0) * Math.cos(34 * Math.PI / 180))) || 190;
    const x = (lon) => ((lon - w0) / (w1 - w0)) * W, y = (lat) => H - ((lat - s0) / (s1 - s0)) * H;
    const best = {};   // per route and hour: the longest trip running then
    T.trips.forEach((tr) => {
      if (!(tr[1] & bit)) return;
      [12, 23].forEach((h) => {
        const first = tr[3][0], last = tr[3][tr[3].length - 1];
        if (first < (h + 1) * 60 && last >= h * 60) {
          const k = tr[0] + ":" + h;
          if (!best[k] || tr[2].length > best[k][2].length) best[k] = tr;
        }
      });
    });
    const panel = (h, label) => {
      let g = "";
      Object.keys(best).filter((k) => k.endsWith(":" + h)).forEach((k) => {
        const pts = best[k][2].map((s) => [x(T.stops[s][2]), y(T.stops[s][1])]).filter((p) => p[0] > -20 && p[0] < W + 20 && p[1] > -20 && p[1] < H + 20);
        if (pts.length > 1) g += '<polyline points="' + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".95"/>';
      });
      const n = Object.keys(best).filter((k) => k.endsWith(":" + h)).length;
      return '<figure><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + SR.t("net.alt", { l: label, n }) + '">' + g + "</svg><figcaption><b>" + label + "</b> · " + SR.t("net.routes", { n }) + "</figcaption></figure>";
    };
    return '<div class="netpair">' + panel(12, SR.hourLabel(12)) + panel(23, SR.hourLabel(23)) + "</div>";
  };

  SR.paintArt = function (root) {
    (root || document).querySelectorAll("[data-art]").forEach((el) => { el.innerHTML = el.dataset.art === "network" ? (SR.d && SR.d.transit ? SR.networkArt("weekday") : "") : (SR.ART[el.dataset.art] || ""); });
  };
})();
