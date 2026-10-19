// Is the site ready to be deployed and installed? Checks files, manifest, icons, service-worker shell list.  node shiftready/tests/pwa.test.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const web = path.join(__dirname, "../web");
const read = (f) => fs.readFileSync(path.join(web, f), "utf8");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const m = JSON.parse(read("manifest.webmanifest"));
for (const k of ["name", "short_name", "start_url", "scope", "display", "background_color", "theme_color", "icons", "id", "description"]) ok(m[k], "manifest." + k);
ok(m.display === "standalone", "standalone display");
const png = (f) => { const b = fs.readFileSync(path.join(web, f)); ok(b.slice(1, 4).toString() === "PNG", f + " is a PNG"); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
for (const ic of m.icons) {
  ok(fs.existsSync(path.join(web, ic.src)), "icon exists: " + ic.src);
  if (ic.src.endsWith(".png")) { const [w, h] = png(ic.src); ok(`${w}x${h}` === ic.sizes, `${ic.src} is ${w}x${h}, manifest says ${ic.sizes}`); }
}
ok(m.icons.some((i) => i.sizes === "192x192") && m.icons.some((i) => i.sizes === "512x512"), "192 and 512 icons");
ok(m.icons.some((i) => i.purpose === "maskable"), "a maskable icon");
ok(png("icons/apple-touch-icon.png")[0] === 180, "apple touch icon 180");
const html = read("index.html");
for (const s of ['rel="manifest"', 'rel="apple-touch-icon"', 'name="theme-color"', "Content-Security-Policy", 'name="viewport"', 'lang="en"']) ok(html.includes(s), "index.html has " + s);
const sw = read("sw.js"); const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
for (const f of shell) ok(f === "./" || fs.existsSync(path.join(web, f)), "shell file exists: " + f);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((x) => x[1]);
for (const s of scripts) ok(shell.includes(s), "script is precached: " + s);
ok(fs.existsSync(path.join(web, "offline.html")) && fs.existsSync(path.join(web, "404.html")), "offline and 404 pages");
for (const r of ["ca33"]) for (const f of ["transit", "tracts", "reach", "sheds", "blocks", "boundary", "places", "pois", "region"]) ok(fs.existsSync(path.join(web, `data/${r}/${f}.json`)), `data/${r}/${f}.json`);
const big = fs.readdirSync(path.join(web, "data/cle")).map((f) => fs.statSync(path.join(web, "data/cle", f)).size).concat(fs.readdirSync(path.join(web, "data/ca33")).map((f) => fs.statSync(path.join(web, "data/ca33", f)).size));
ok(Math.max(...big) < 25 * 1024 * 1024, "no data file over 25 MB (GitHub limit is 100 MB)");
console.log(n + " deployment checks passed.");
