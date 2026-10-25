/* Offline support. The app shell is stored when the app is first opened; schedule and map data are stored as they are used,
 * so a trip that has been checked once can be checked again with no signal. Map tiles are never cached here.
 * Code (HTML, JS, CSS) is fetched fresh when online so updates show up at once. */
const CACHE = "shiftready-v19";
const SHELL = ["./", "index.html", "offline.html", "css/style.css", "vendor/leaflet.css", "vendor/leaflet.js", "vendor/fonts/public-sans.woff2",
  "js/theme.js", "js/i18n.js", "js/planner.js", "js/data.js", "js/impact.js", "js/geocode.js", "js/art.js", "js/ui-plan.js", "js/ui-map.js", "js/ui-reach.js", "js/ui-city.js", "js/app.js",
  "logo.svg", "manifest.webmanifest", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "data/regions.json"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const code = e.request.mode === "navigate" || /\.(js|css|html)$/.test(u.pathname) || u.pathname.endsWith("/");
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = () => fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (code) return net().catch(async () => hit || (e.request.mode === "navigate" ? c.match("offline.html") : Response.error()));
    return hit || net();
  }));
});
