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
  SR.paintArt = function (root) {
    (root || document).querySelectorAll("[data-art]").forEach((el) => { el.innerHTML = SR.ART[el.dataset.art] || ""; });
  };
})();
