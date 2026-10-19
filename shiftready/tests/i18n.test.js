// Every key the code asks for exists in English and Spanish, and placeholders match.
const fs = require("fs"), path = require("path"), assert = require("assert");
global.window = {}; global.window.SR = {};
eval(fs.readFileSync(path.join(__dirname, "../web/js/i18n.js"), "utf8").replace("window.SR = window.SR || {};", ""));
const STR = global.window.SR.STR;
const src = ["app", "ui-plan", "ui-map", "ui-city", "ui-reach"].map((f) => fs.readFileSync(path.join(__dirname, `../web/js/${f}.js`), "utf8")).join("\n") +
  fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");
const keys = new Set();
for (const m of src.matchAll(/\bt\("([a-z0-9_.]+)"/g)) keys.add(m[1]);
for (const m of src.matchAll(/data-i18n(?:-ph)?="([a-z0-9_.]+)"/g)) keys.add(m[1]);
for (const m of src.matchAll(/\{ k: "([a-z.]+)"/g)) keys.add(m[1]);
["day.weekday", "day.saturday", "day.sunday", "v.yes", "v.maybe", "v.no", "about.lim1", "about.lim2", "about.lim3", "about.lim4", "about.lim5", "about.lim6"].forEach((k) => keys.add(k));
// keys built by concatenation in the code ("why." + ...)
["why.no_stop_start", "why.no_stop_end", "why.no_bus"].forEach((k) => keys.add(k));
const bad = [];
for (const k of keys) {
  if (/\.$/.test(k) || k === "about.lim" || k === "faq.q" || k === "faq.a" || k === "emp.kind_") continue;   // prefixes completed in code
  for (const l of ["en", "es"]) if (!(k in STR[l])) bad.push(l + ":" + k);
}
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
for (const k of Object.keys(STR.en)) {
  if (!(k in STR.es)) bad.push("es missing " + k);
  else if (ph(STR.en[k]) !== ph(STR.es[k])) bad.push("placeholder mismatch " + k + " " + ph(STR.en[k]) + " vs " + ph(STR.es[k]));
}
for (const k of Object.keys(STR.es)) if (!(k in STR.en)) bad.push("en missing " + k);
assert.deepStrictEqual(bad, [], "translation problems:\n" + bad.join("\n"));
console.log(keys.size + " keys used; English and Spanish complete, placeholders match.");
