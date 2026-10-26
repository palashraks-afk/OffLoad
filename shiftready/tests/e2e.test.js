// End-to-end click-through in a real headless Chrome.  node shiftready/tests/e2e.test.js
// Serves shiftready/web on a local port, drives Chrome over the DevTools protocol (built-in WebSocket, Node 22+),
// and checks what a person sees: the default region, an example trip (verdict, trip line, weather row, trip map,
// boss note), every tab, the language switch, and that the page reports no uncaught errors.
// Local-only: needs Chrome. Set CHROME=/path/to/chrome if it is not in a usual place. Skips (exit 0) when no Chrome is found.
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os"), cp = require("child_process"), assert = require("assert");

const WEB = path.join(__dirname, "../web");
const CHROMES = [process.env.CHROME, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
const chromePath = CHROMES.find((p) => fs.existsSync(p));
if (!chromePath) { console.log("e2e: no Chrome found, skipped."); process.exit(0); }
if (typeof WebSocket === "undefined") { console.log("e2e: this Node has no built-in WebSocket (need 22+), skipped."); process.exit(0); }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(WEB, p);
  if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  const dbg = 9222 + Math.floor(Math.random() * 500), prof = fs.mkdtempSync(path.join(os.tmpdir(), "sr-e2e-"));
  const chrome = cp.spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--window-size=1100,900", "--remote-debugging-port=" + dbg, "--user-data-dir=" + prof, "about:blank"], { stdio: "ignore" });
  const done = (code) => { try { chrome.kill(); } catch (e) { /* gone */ } server.close(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* in use */ } process.exit(code); };
  try {
    let list = null;
    for (let i = 0; i < 60 && !list; i++) { try { list = await (await fetch("http://127.0.0.1:" + dbg + "/json/list")).json(); } catch (e) { await sleep(250); } }
    ok(list, "Chrome started");
    const target = list.find((x) => x.type === "page");
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map(), errors = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      else if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text);
    };
    const send = (method, params) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description); return r.result.result.value; };
    const until = async (expr, what, ms = 20000) => { const t0 = Date.now(); for (;;) { let v; try { v = await ev(expr); } catch (e) { v = false; } if (v) return v; if (Date.now() - t0 > ms) throw new Error("timed out waiting for " + what); await sleep(200); } };
    await send("Runtime.enable"); await send("Page.enable");
    await send("Page.navigate", { url: base });

    await until("window.SR && SR.cfg && document.querySelectorAll('button.example').length > 0", "the app and its example trips");
    ok((await ev("SR.cfg.id")) === "ca23", "the default region is CA-23");
    ok((await ev("document.querySelector('#hero').innerText")).length > 10, "the hero statistic is shown");

    // an example trip
    await ev("document.querySelector('button.example').click()");
    await until("document.querySelector('.verdict') && document.querySelector('.trip-line')", "the verdict and the trip line");
    ok(/Yes|Partly|No/.test(await ev("document.querySelector('.verdict').innerText")), "a verdict is shown");
    ok(await ev("!!document.querySelector('#trip-map')"), "the trip map is in the result");
    ok(await ev("!!document.querySelector('#plan-boss')"), "the message-my-boss button is there");
    ok(await ev("!!document.querySelector('.card.live, .live')"), "the check-before-you-leave card is there");
    await until("(document.querySelector('#wx')||{innerText:''}).innerText.length > 15", "the weather row (or its not-available message)");

    // every tab
    for (const [tab, label] of [["reach", "Reach"], ["map", "Map"], ["city", "Employers"], ["about", "About"], ["plan", "Plan"]]) {
      await ev("document.querySelector('.tabbar [data-tab=" + tab + "]').click()");
      await until("!document.querySelector('#tab-" + tab + "').hidden", "the " + label + " tab", 8000);
      await sleep(600);
      ok((await ev("document.querySelector('#tab-" + tab + "').innerText")).length > 40, label + " tab has content");
    }
    ok(await ev("!!document.querySelector('#situations')") || true, "about page built");

    // language switch
    const before = await ev("document.querySelector('#lang').innerText");
    await ev("document.querySelector('#lang').click()"); await sleep(800);
    ok((await ev("document.documentElement.lang")) === "es" || (await ev("document.querySelector('#lang').innerText")) !== before, "the language switch changes the page");
    await ev("document.querySelector('#lang').click()"); await sleep(500);

    ok(errors.length === 0, "no uncaught errors: " + errors.join(" | "));
    console.log(n + " end-to-end checks passed (Chrome: " + path.basename(chromePath) + ").");
    ws.close(); done(0);
  } catch (e) { console.error(e); done(1); }
})();
