/* Offline support: keep the app and its data after the first visit. Map tiles are never cached here.
 * Code (HTML, JS, CSS) is fetched fresh when online so updates show up at once; data files come from the cache first. */
const CACHE = "shiftready-v2";
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const code = e.request.mode === "navigate" || /\.(js|css|html)$/.test(u.pathname) || u.pathname.endsWith("/");
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = () => fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (code) return net().catch(() => hit);       // network first, cache when offline
    return hit || net();                          // data: cache first
  }));
});
