/* Light or dark, chosen before the page paints so there is no flash. Light is the default; the choice is remembered. */
(function () {
  "use strict";
  var SR = (window.SR = window.SR || {});
  var q = new URLSearchParams(location.search).get("theme"), saved = null;
  try { saved = localStorage.getItem("sr.theme"); } catch (e) { /* private mode */ }
  SR.theme = q === "dark" || q === "light" ? q : saved === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", SR.theme);
  SR.setTheme = function (t) {
    SR.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("sr.theme", t); } catch (e) { /* private mode */ }
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#101215" : "#13171d");
    if (SR.mapTheme) SR.mapTheme();
    if (SR.reachTheme) SR.reachTheme();
  };
})();
