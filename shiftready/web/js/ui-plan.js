/* The Plan tab: form, trip search, verdict, return trip, fallbacks. */
(function () {
  "use strict";
  const SR = window.SR;
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => SR.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const MAX_WALK_OK = 1200;     // metres of walking in total before a plan is "partly"
  const MIN_SLACK = 10;         // minutes to spare before the deadline for a clean "yes"
  const MAX_TRIP = 90;          // minutes door to door before a plan is "partly"
  const PRESETS = [
    { k: "preset.early", time: "05:00", mode: "arrive", end: "13:30" },
    { k: "preset.day", time: "08:00", mode: "arrive", end: "16:30" },
    { k: "preset.swing", time: "15:00", mode: "arrive", end: "23:30" },
    { k: "preset.night", time: "22:00", mode: "arrive", end: "06:30" },
    { k: "preset.appt", time: "09:00", mode: "arrive", end: "11:00" },
  ];

  function day() { return document.querySelector('input[name=day]:checked').value; }
  function mode() { return document.querySelector('input[name=mode]:checked').value; }

  SR.initPlan = function () {
    // quick picks
    const sel = $("#to-quick");
    sel.innerHTML = "";
    sel.append(new Option(t("plan.quick"), ""));
    const emps = (SR.d.employers && SR.d.employers.employers) || [];
    if (emps.length) {
      const ge = document.createElement("optgroup"); ge.label = t("plan.employers");
      emps.slice().sort((a, b) => (b.in_district - a.in_district) || a.name.localeCompare(b.name)).forEach((e) => ge.append(new Option(e.name + " · " + e.city, "emp:" + e.id)));
      sel.append(ge);
    }
    const g1 = document.createElement("optgroup"); g1.label = t("plan.jobareas");
    Object.keys(SR.d.sheds).map((id) => SR.tractById[id]).filter(Boolean)
      .sort((a, b) => b.jobs_trans - a.jobs_trans).slice(0, 12).forEach((tr) => {
        g1.append(new Option(SR.tractLabel(tr) + " · " + SR.num(tr.jobs_trans) + " " + t("plan.wh_jobs"), "tract:" + tr.id));
      });
    sel.append(g1);
    const kinds = {};
    SR.d.pois.forEach((p, i) => { (kinds[p.kind] = kinds[p.kind] || []).push([p, i]); });
    Object.keys(kinds).forEach((k) => {
      const g = document.createElement("optgroup"); g.label = SR.kind(k);
      kinds[k].sort((a, b) => (b[0].in_district - a[0].in_district) || a[0].name.localeCompare(b[0].name)).forEach(([p, i]) =>
        g.append(new Option(p.name + " · " + p.city, "poi:" + i)));
      sel.append(g);
    });
    sel.onchange = () => {
      const v = sel.value; if (!v) return;
      let pt;
      if (v.startsWith("emp:")) { const e = emps.find((x) => x.id === v.slice(4)); pt = { lat: e.lat, lon: e.lon, label: e.name }; }
      else if (v.startsWith("tract:")) { const tr = SR.tractById[v.slice(6)]; pt = { lat: tr.lat, lon: tr.lon, label: SR.tractLabel(tr) }; }
      else { const p = SR.d.pois[+v.slice(4)]; pt = { lat: p.lat, lon: p.lon, label: p.name }; }
      SR.coords.to = pt; $("#to").value = pt.label;
    };
    $("#to").oninput = () => { SR.coords.to = null; };
    $("#from").oninput = () => { SR.coords.from = null; };

    // presets
    const wrap = $("#presets");
    wrap.innerHTML = "";
    PRESETS.forEach((p) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = t(p.k);
      b.onclick = () => {
        $("#time").value = p.time; $("#end-time").value = p.end;
        document.querySelector('input[name=mode][value=' + p.mode + ']').checked = true;
      };
      wrap.append(b);
    });

    $("#loc").onclick = () => locateInto();
    $("#pick-from").onclick = () => SR.pickOnMap("from");
    $("#pick-to").onclick = () => SR.pickOnMap("to");
    $("#plan-form").onsubmit = (e) => { e.preventDefault(); runPlan(); };
    $("#want-home").onchange = () => { $(".endt").hidden = !$("#want-home").checked; };
    $("#swap").onclick = () => {
      const a = $("#from").value; $("#from").value = $("#to").value; $("#to").value = a;
      [SR.coords.from, SR.coords.to] = [SR.coords.to, SR.coords.from];
    };
    SR.renderSaved();
  };

  // ---------- saved commute (stays in this browser only) -----------------------------------------
  const SKEY = () => "sr.commute." + SR.region;
  function savedGet() { try { return JSON.parse(localStorage.getItem(SKEY()) || "null"); } catch (e) { return null; } }
  function savedSet(v) { try { if (v) localStorage.setItem(SKEY(), JSON.stringify(v)); else localStorage.removeItem(SKEY()); } catch (e) { /* private mode */ } }
  SR.renderSaved = function () {
    const box = $("#saved"), s = savedGet();
    if (!s) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = '<button type="button" class="chip-saved" id="saved-go"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7M5 10v10h14V10"/></svg>' +
      esc(s.from.label || "") + " → " + esc(s.to.label || "") + " · " + SR.hm(s.T) + '</button><button type="button" class="x" id="saved-x" aria-label="' + t("saved.remove") + '">×</button>';
    $("#saved-go").onclick = () => {
      SR.coords.from = s.from; SR.coords.to = s.to; $("#from").value = s.from.label || ""; $("#to").value = s.to.label || "";
      document.querySelector("input[name=day][value=" + s.d + "]").checked = true;
      document.querySelector("input[name=mode][value=" + s.m + "]").checked = true;
      $("#time").value = String(Math.floor(s.T / 60)).padStart(2, "0") + ":" + String(s.T % 60).padStart(2, "0");
      $("#want-home").checked = !!s.wantHome; $(".endt").hidden = !s.wantHome;
      if (s.endT != null) $("#end-time").value = String(Math.floor(s.endT / 60) % 24).padStart(2, "0") + ":" + String(s.endT % 60).padStart(2, "0");
      $("#plan-form").requestSubmit();
    };
    $("#saved-x").onclick = () => { savedSet(null); SR.renderSaved(); };
  };

  // ---------- the same trip on every kind of day ---------------------------------------------------
  const VI = { yes: ["●", "v.yes"], maybe: ["■", "v.maybe"], no: ["◆", "v.no"] };
  function weekHtml(R) {
    const rows = ["weekday", "saturday", "sunday"].map((d) => {
      const x = d === R.d ? R : compute(R.from, R.to, d, R.m, R.T, R.wantHome, R.endT, true);
      const out = x.verdict.level, home = !x.wantHome ? null : (x.home && x.home.ok ? "yes" : "no");
      const cell = (lv) => '<span class="vi ' + lv + '"><i aria-hidden="true">' + VI[lv][0] + "</i>" + t(VI[lv][1]) + "</span>";
      return '<div class="week-row"><b>' + t("day." + d) + "</b>" + cell(out) + (home ? cell(home) : "<span></span>") + "</div>";
    }).join("");
    return '<details class="card fold"><summary><h2>' + t("week.title") + '</h2></summary><p class="small">' + t("week.sub") + '</p><div class="week">' + rows + "</div></details>";
  }

  // ---------- what the trip costs, from the agency's own fare file ----------------------------------
  function costHtml(R) {
    const F = SR.d.transit.fares; if (!F || !R.main.ok) return "";
    const rides = R.main.boardings * (R.wantHome ? 2 : 1) * 22;   // 22 working days a month
    const pay = rides * F.adult.single;
    const best = Math.min(pay, F.adult.d31);
    let h = '<details class="card fold"><summary><h2>' + t("cost.title") + '</h2></summary><div class="kv"><div><b>$' + F.adult.single.toFixed(2) + "</b><span>" + t("cost.single") + "</span></div>" +
      "<div><b>$" + F.adult.d31.toFixed(0) + "</b><span>" + t("cost.d31") + "</span></div><div><b>$" + pay.toFixed(0) + "</b><span>" + t("cost.pay", { n: rides }) + "</span></div></div>";
    h += "<p>" + (F.adult.d31 < pay ? t("cost.save", { s: (pay - F.adult.d31).toFixed(0) }) : t("cost.cheaper")) + "</p>";
    if (F.reduced) h += '<p class="small">' + t("cost.reduced", { a: F.reduced.single.toFixed(2), b: F.reduced.d31.toFixed(0) }) + "</p>";
    return h + "</details>";
  }

  // ---------- where you CAN get to by then ----------------------------------------------------------
  function areasHtml(R) {
    const depart = R.m === "arrive" ? R.T - 75 : R.T, limit = R.m === "arrive" ? R.T : R.T + 60;
    const arr = Planner.earliestArrivals(SR.net, R.from, R.d, depart, 800, 120);
    const out = [];
    Object.keys(SR.d.sheds).forEach((id) => {
      const tr = SR.tractById[id]; if (!tr) return;
      for (const x of SR.net.near(tr.lat, tr.lon, 800)) {
        if (arr[x.s] + Planner.walkMinutes(x.d) <= limit) { out.push(tr); break; }
      }
    });
    out.sort((a, b) => b.jobs_trans - a.jobs_trans);
    if (!out.length) return "<li>" + t("help.no_areas") + "</li>";
    return "<li>" + t("help.areas", { a: out.slice(0, 3).map((x) => esc(SR.tractLabel(x)) + " (" + SR.num(x.jobs_trans) + ")").join(", ") }) + "</li>";
  }

  function locSay(msg, kind, act) {
    const el = $("#loc-msg"); el.hidden = !msg; el.className = "loc-msg " + (kind || "");
    el.textContent = msg || "";
    if (act) { const b = document.createElement("button"); b.type = "button"; b.className = "link"; b.textContent = t("loc.switch"); b.onclick = act; el.append(" ", b); }
  }
  /** Fill From with where the person is. `quiet` = no messages unless it worked (used for the automatic fill). */
  async function locateInto(quiet) {
    const btn = $("#loc"); btn.disabled = true;
    const g = await SR.useMyLocation({ say: (m, k, a) => { if (!quiet || k === "ok") locSay(m, k, a); } });
    btn.disabled = false;
    if (g) { SR.coords.from = g; $("#from").value = g.label; $("#from").dispatchEvent(new Event("change")); }
    return g;
  }
  /** One-tap demonstrations built from real places: they fill the form and run it. */
  SR.renderExamples = function () {
    const box = $("#examples"); if (!box) return;
    const emps = (SR.d.employers && SR.d.employers.employers) || [], find = (s) => emps.find((e) => e.name.toLowerCase().includes(s));
    const city = (n) => { const c = SR.d.places.cities[n]; return c ? { lat: c[0], lon: c[1], label: n } : null; };
    const list = [
      { k: "ex.night", from: city("Fontana"), to: find("amazon"), T: "22:00", end: "06:30" },
      { k: "ex.early", from: city("Rialto"), to: find("arrowhead"), T: "06:00", end: "14:30" },
      { k: "ex.day", from: city("Highland"), to: find("community hospital"), T: "09:00", end: "11:00" },
    ].filter((x) => x.from && x.to);
    box.innerHTML = list.length ? "<h3>" + t("ex.title") + "</h3>" + list.map((x, i) => '<button type="button" class="example" data-i="' + i + '"><b>' + t(x.k) + "</b><span>" + esc(x.from.label) + " → " + esc(x.to.name) + "</span></button>").join("") : "";
    box.querySelectorAll(".example").forEach((b) => {
      b.onclick = () => {
        const x = list[+b.dataset.i];
        SR.coords.from = x.from; $("#from").value = x.from.label;
        SR.coords.to = { lat: x.to.lat, lon: x.to.lon, label: x.to.name }; $("#to").value = x.to.name;
        document.querySelector("input[name=day][value=weekday]").checked = true; document.querySelector("input[name=mode][value=arrive]").checked = true;
        $("#time").value = x.T; $("#end-time").value = x.end; $("#want-home").checked = true; $(".endt").hidden = false;
        $("#plan-form").requestSubmit();
      };
    });
  };

  SR.autoLocate = async function () {
    if ($("#from").value || SR.coords.from || !SR.locationPermission) return;
    if ((await SR.locationPermission()) === "granted") locateInto(true);   // already allowed: no prompt, no typing
  };

  async function resolve(which) {
    const inp = $(which === "from" ? "#from" : "#to");
    if (SR.coords[which]) return SR.coords[which];
    const g = await SR.geocode(inp.value);
    if (g) SR.coords[which] = g;
    return g;
  }

  async function runPlan() {
    const out = $("#plan-result"), go = $("#plan-form button[type=submit]");
    go.disabled = true; const label = go.textContent; go.textContent = t("plan.working");
    out.innerHTML = '<div class="empty">' + t("plan.working") + "</div>";
    const [from, to] = await Promise.all([resolve("from"), resolve("to")]);
    if (!from || !to) {
      out.innerHTML = '<div class="verdict maybe"><div class="tag"><span class="icon">!</span>' + t("plan.need_places") + "</div></div>";
      go.disabled = false; go.textContent = label;
      return;
    }
    const d = day(), m = mode(), T = SR.parseTime($("#time").value);
    const wantHome = $("#want-home").checked;
    let endT = SR.parseTime($("#end-time").value);
    const R = compute(from, to, d, m, T, wantHome, endT);
    SR.lastPlan = R;
    out.innerHTML = render(R);
    out.classList.add("stagger");
    bindResult(R);
    go.disabled = false; go.textContent = label;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Plan one trip. "Be there by T" asks for a bus that gets you there MIN_SLACK minutes early; only if none exists do we accept a tighter one. */
  function planMain(from, to, d, m, T) {
    if (m !== "arrive") return { plan: Planner.plan(SR.net, from, to, { day: d, depart: T }), tight: false };
    const p = Planner.plan(SR.net, from, to, { day: d, arriveBy: T - MIN_SLACK });
    if (p.ok) return { plan: p, tight: false };
    const q = Planner.plan(SR.net, from, to, { day: d, arriveBy: T });
    return { plan: q, tight: q.ok };
  }

  function compute(from, to, d, m, T, wantHome, endT, light) {
    const pm = planMain(from, to, d, m, T);
    const main = pm.plan;
    const R = { from, to, d, m, T, main, wantHome, endT, tight: pm.tight };
    if (main.ok) {
      const firstBus = main.legs.find((l) => l.k === "bus");
      R.backup = Planner.plan(SR.net, from, to, { day: d, depart: firstBus.dep + 0.5 });
      R.slack = m === "arrive" ? T - main.arrive : null;
    }
    if (wantHome) {
      // A shift that ends earlier in the clock than it starts finishes the next morning.
      const startClock = m === "arrive" ? T : main.ok ? main.arrive : T;
      let rd = d, rt = endT;
      if (endT <= startClock - 60) { rd = SR.nextDay(d); }
      R.homeDay = rd;
      R.home = Planner.plan(SR.net, to, from, { day: rd, depart: rt });
      if (R.home.ok && R.home.leave - rt > 90) { R.homeLater = R.home; R.home = { ok: false, reason: "no_service" }; }   // a 2-hour wait is not a ride home
      const last = Planner.plan(SR.net, to, from, { day: rd, arriveBy: 30 * 60 });
      R.lastBus = last.ok ? last : null;
    }
    R.verdict = verdict(R);
    if (R.verdict.level !== "yes" && !light) R.alts = findAlternatives(R);
    return R;
  }

  function verdict(R) {
    const reasons = [];
    const mn = R.main;
    if (!mn.ok) {
      const key = mn.reason === "no_stop_near_start" ? "why.no_stop_start" : mn.reason === "no_stop_near_end" ? "why.no_stop_end" : "why.no_bus";
      return { level: "no", reasons: [t(key)] };
    }
    let level = "yes";
    const bad = (key, v) => { level = "maybe"; reasons.push(t(key, v)); };
    if (R.m === "depart") {
      const wait = mn.leave - R.T;
      if (wait > 90) return { level: "no", reasons: [t("why.first_bus", { t: SR.hm(mn.leave) })] };
      if (wait > 20) bad("why.wait", { n: Math.round(wait), t: SR.hm(mn.leave) });
    }
    if (R.tight) bad("why.tight", { n: Math.max(0, Math.round(R.slack)) });
    else if (R.m === "arrive" && R.slack > 90) bad("why.early", { n: Math.round(R.slack) });
    if (mn.walkM > MAX_WALK_OK) bad("why.walk", { m: SR.num(mn.walkM) });
    if (mn.minutes > MAX_TRIP) bad("why.long", { n: Math.round(mn.minutes) });
    if (mn.boardings >= 3) bad("why.transfers", { n: mn.boardings - 1 });
    if (R.wantHome) {
      if (!R.home || !R.home.ok) { level = "maybe"; reasons.push(t("why.no_home")); }
      else if (R.home.walkM > MAX_WALK_OK) bad("why.walk_home", { m: SR.num(R.home.walkM) });
    }
    if (!reasons.length) reasons.push(t("why.good"));
    return { level, reasons };
  }

  function findAlternatives(R) {
    const out = { earlier: null, later: null };
    for (let dm = 15; dm <= 240 && (!out.earlier || !out.later); dm += 15) {
      for (const sign of [-1, 1]) {
        const key = sign < 0 ? "earlier" : "later";
        if (out[key]) continue;
        const T = R.T + sign * dm;
        if (T < 0) continue;
        const pm = planMain(R.from, R.to, R.d, R.m, T);
        const p = pm.plan;
        if (!p.ok || pm.tight) continue;
        let homeOk = true;
        if (R.wantHome) { homeOk = !!(R.home && R.home.ok); }
        if (homeOk) out[key] = { T, plan: p };
      }
    }
    return out;
  }

  // ---------- rendering --------------------------------------------------------------------
  function stopRisk(i) {
    const s = SR.d.safety && SR.d.safety.stops && SR.d.safety.stops[i];
    return s ? { night: s[0], all: s[1], pct: s[2] } : null;
  }

  function legsHtml(p) {
    if (!p || !p.ok) return "";
    const rows = p.legs.map((l) => {
      if (l.k === "walk") {
        const m = Math.round(l.m);
        if (m < 15) return "";
        const where = l.end === "start" ? t("leg.walk_to", { s: esc(SR.stopName(l.to)) })
          : l.end === "finish" ? t("leg.walk_from", { s: esc(SR.stopName(l.from)) }) : t("leg.walk_xfer");
        return '<li><div class="t"></div><div class="what">' + where + "<small>" + SR.num(m) + " m · ~" + Math.max(1, Math.round(l.min)) + " min</small></div></li>";
      }
      return '<li class="bus" style="' + SR.routeStyle(l.route) + '"><div class="t">' + SR.hm(l.dep) + '</div><div class="what"><span class="route" aria-label="' + t("leg.bus", { r: esc(SR.routeName(l.route)) }) + '">' + esc(SR.routeName(l.route)) + "</span>" + esc(l.headsign || "") +
        "<small>" + esc(SR.stopName(l.fromStop)) + " → " + esc(SR.stopName(l.toStop)) + " · " + SR.hm(l.arr) + "</small></div></li>";
    }).join("");
    return '<ol class="steps">' + rows + "</ol>";
  }

  /** Another stop on the SAME route, same direction, about the same time, with fewer past night deaths nearby and not much farther to walk. */
  function saferBoarding(R, leg) {
    const S = SR.d.safety && SR.d.safety.stops;
    if (!S) return null;
    const cur = S[leg.fromStop], here = SR.net.stops[leg.fromStop], inf = SR.stopInfo(R.d), bit = Planner.DAY_BIT[R.d];
    const curWalk = Planner.hav(R.from.lat, R.from.lon, here[1], here[2]);
    let best = null;
    for (const c of SR.net.near(here[1], here[2], 450)) {
      if (c.s === leg.fromStop || !inf.routes[c.s].has(leg.route)) continue;
      const s = S[c.s];
      if (!(s[0] < cur[0] || (cur[2] != null && s[2] != null && s[2] <= cur[2] - 20))) continue;
      const st = SR.net.stops[c.s];
      const extra = (Planner.hav(R.from.lat, R.from.lon, st[1], st[2]) - curWalk) * Planner.walkMeters(1);
      if (extra > 350) continue;
      const ok = SR.d.transit.trips.some((tr) => {
        if (tr[0] !== leg.route || !(tr[1] & bit)) return false;
        const ia = tr[2].indexOf(c.s);
        if (ia < 0 || tr[2].indexOf(leg.toStop, ia) < 0) return false;
        const tm = tr[3][ia];
        return tm >= leg.dep - 3 && tm <= leg.dep + 25;
      });
      if (!ok) continue;
      const score = s[0] * 100 + extra / 10;
      if (!best || score < best.score) best = { stop: c.s, night: s[0], curNight: cur[0], extra: Math.max(0, Math.round(extra)), score };
    }
    return best;
  }

  function riskHtml(p, R) {
    if (!p || !p.ok || !SR.d.safety) return "";
    const buses = p.legs.filter((l) => l.k === "bus");
    const ids = [buses[0].fromStop, buses[buses.length - 1].toStop];
    const lines = ids.map((i) => ({ i, r: stopRisk(i) })).filter((x) => x.r);
    if (!lines.length) return "";
    const worst = lines.reduce((a, b) => (b.r.night > a.r.night ? b : a));
    const level = worst.r.night >= 2 ? "bad" : worst.r.night === 1 ? "warn" : "";
    let txt = worst.r.night === 0 ? t("risk.none", { s: esc(SR.stopName(worst.i)) })
      : t("risk.some", { n: worst.r.night, s: esc(SR.stopName(worst.i)) });
    if (worst.r.pct != null && worst.r.pct >= 90) txt += " " + t("risk.rank", { n: 100 - worst.r.pct });
    let out = '<div class="notice"><span class="badge ' + level + '">' + (level === "bad" ? "▲▲ " : level === "warn" ? "▲ " : "✓ ") + t("risk.label") + "</span> " + txt +
      ' <span class="small">' + t("risk.src") + "</span></div>";
    if (R) {
      const alt = saferBoarding(R, buses[0]);
      if (alt) out += '<div class="notice"><span class="badge">' + t("risk.alt_label") + "</span> " + t("risk.alt", { s: esc(SR.stopName(alt.stop)), m: alt.extra, a: alt.night, b: alt.curNight }) + "</div>";
    }
    return out;
  }

  function render(R) {
    const v = R.verdict, mn = R.main;
    const icon = { yes: "✓", maybe: "!", no: "✕" }[v.level];
    const word = t("v." + v.level);
    let h = '<div class="verdict ' + v.level + '" role="status"><div class="tag"><span class="icon"><span>' + icon + "</span></span>" + word + "</div>" +
      "<p class=\"sub\">" + v.reasons.map(esc).join(" ") + "</p></div>";

    if (mn.ok) {
      h += '<div class="card"><h2>' + t("res.plan") + "</h2>" +
        '<div class="kv"><div><b>' + SR.hm(mn.leave) + "</b><span>" + t("res.leave") + "</span></div>" +
        "<div><b>" + SR.hm(mn.arrive) + "</b><span>" + t("res.arrive") + "</span></div>" +
        "<div><b>" + Math.round(mn.minutes) + " min</b><span>" + t("res.door") + "</span></div>" +
        (SR.d.transit.fares ? "<div><b>$" + (mn.boardings * SR.d.transit.fares.adult.single).toFixed(2) + "</b><span>" + t("res.fare") + "</span></div>" : "") + "</div>" +
        legsHtml(mn) + riskHtml(mn, R);
      if (R.backup && R.backup.ok) {
        const late = R.m === "arrive" ? R.backup.arrive - R.T : null;
        h += '<h3>' + t("res.miss") + "</h3><p>" + t("res.miss_txt", { l: SR.hm(R.backup.leave), a: SR.hm(R.backup.arrive) }) +
          (late != null && late > 0 ? " <span class=\"badge warn\">" + t("res.late", { n: Math.round(late) }) + "</span>" : "") + "</p>";
      }
      h += "</div>" + SR.impact.waitSlot();
      setTimeout(() => SR.impact.loadConditions(R), 0);
    }

    if (R.wantHome) {
      h += '<div class="card"><h2>' + t("res.home") + "</h2>";
      if (R.home && R.home.ok) {
        h += '<div class="kv"><div><b>' + SR.hm(R.home.leave) + "</b><span>" + t("res.leave") + "</span></div><div><b>" + SR.hm(R.home.arrive) +
          "</b><span>" + t("res.home_arrive") + "</span></div>" + (R.lastBus ? "<div><b>" + SR.hm(R.lastBus.leave) + "</b><span>" + t("res.lastbus") + "</span></div>" : "") + "</div>" + legsHtml(R.home);
      } else {
        h += '<p><span class="badge bad">✕ ' + t("res.no_ride_home") + "</span> " + t("res.no_ride_home_txt", { t: SR.hm(R.endT) }) + "</p>";
        if (R.homeLater) h += "<p>" + t("res.next_home_txt", { t: SR.hm(R.homeLater.leave) }) + "</p>";
        if (R.lastBus) h += "<p>" + t("res.lastbus_txt", { t: SR.hm(R.lastBus.leave) }) + "</p>";
      }
      h += "</div>";
    }

    if (R.alts && (R.alts.earlier || R.alts.later)) {
      h += '<div class="card"><h2>' + t("res.alts") + "</h2><p class=\"small\">" + t("res.alts_txt") + "</p><div class=\"chips\">";
      [R.alts.earlier, R.alts.later].filter(Boolean).forEach((a) => {
        h += "<button type=\"button\" data-alt=\"" + a.T + "\">" + (R.m === "arrive" ? t("res.be_there", { t: SR.hm(a.T) }) : t("res.leave_at", { t: SR.hm(a.T) })) +
          " · " + t("res.works", { l: SR.hm(a.plan.leave) }) + "</button>";
      });
      h += "</div></div>";
    } else if (v.level === "no") {
      h += '<div class="card"><h2>' + t("res.alts") + "</h2><p>" + t("res.no_alts") + "</p></div>";
    }

    h += stripHtml(R) + weekHtml(R) + costHtml(R) + helpHtml(R) + SR.impact.healthHtml();
    h += '<div class="actions"><button id="req-open" class="btn primary" type="button">' + t("res.request") + "</button>" +
      '<button id="plan-save" class="btn ghost" type="button">' + t("saved.save") + "</button>" +
      (mn.ok ? '<button id="plan-map" class="btn ghost" type="button">' + t("res.showmap") + '</button><button id="plan-cal" class="btn ghost" type="button">' + t("res.cal") + '</button><button id="plan-card" class="btn ghost" type="button">' + t("res.card") + "</button>" : "") +
      '<button id="plan-share" class="btn ghost" type="button">' + t("res.share") + '</button><button id="plan-print" class="btn ghost" type="button">' + t("res.print") + "</button></div>";
    h += '<p class="small pad-top">' + t("res.limits", { agency: SR.cfg.agency }) + "</p>";
    return h;
  }

  function contextHtml(R) {
    const hr = Math.floor(((R.m === "arrive" ? R.T : R.T) % 1440) / 60);
    const reach = SR.d.reach[R.d];
    const jt = reach.trans_jobs_share_county[hr];
    return '<div class="card"><h2>' + t("res.context") + "</h2><p>" + t("res.context_txt", {
      h: SR.hourLabel(hr), p: SR.pct(reach.pop_share[hr]), j: SR.pct(reach.trans_jobs_share_district[hr], 1), c: SR.cfg.short,
    }) + "</p></div>";
  }

  // Ways to get there when buses will not: carpool from the commute shed, and a request.
  function helpHtml(R) {
    if (R.verdict.level === "yes") return "";
    const nt = SR.nearestTract(R.to.lat, R.to.lon, true);
    let h = '<details class="card fold" open><summary><h2>' + t("help.title") + "</h2></summary><ul>";
    h += "<li>" + t("help.shift") + "</li>" + areasHtml(R);
    if (nt && nt.d < 2500) {
      const shed = SR.d.sheds[nt.tract.id];
      const nearHome = shed.homes.filter(([id]) => { const x = SR.tractById[id]; return x && Planner.hav(R.from.lat, R.from.lon, x.lat, x.lon) < 3000; });
      const n = nearHome.reduce((a, b) => a + b[1], 0);
      if (n > 0) h += "<li>" + t("help.carpool", { n: SR.num(n), a: esc(SR.tractLabel(nt.tract)) }) + "</li>";
    }
    h += SR.impact.vanpoolItem() + "<li>" + t("help.request") + "</li></ul></details>";
    return h;
  }

  function shareText(R) {
    const m = R.main;
    if (!m.ok) return t("share.none", { a: R.from.label || "", b: R.to.label || "" });
    const buses = m.legs.filter((l) => l.k === "bus").map((l) => t("leg.bus", { r: SR.routeName(l.route) }) + " " + SR.hm(l.dep)).join(" → ");
    return t("share.txt", { a: R.from.label || "", b: R.to.label || "", l: SR.hm(m.leave), r: SR.hm(m.arrive), buses });
  }

  /** One cell per hour: does the same trip work if you must arrive by (or leave at) that hour? */
  function stripData(R) {
    const out = [];
    for (let h = 4; h <= 23; h++) {
      const T = h * 60, pm = planMain(R.from, R.to, R.d, R.m, T);
      let lv = "no";
      if (pm.plan.ok) {
        lv = "yes";
        if (pm.tight || pm.plan.walkM > MAX_WALK_OK || pm.plan.minutes > MAX_TRIP || pm.plan.boardings >= 3) lv = "maybe";
        if (R.m === "depart" && pm.plan.leave - T > 90) lv = "no";
        else if (R.m === "depart" && pm.plan.leave - T > 20) lv = "maybe";
      }
      out.push({ h, lv });
    }
    return out;
  }
  const GLYPH = { yes: "●", maybe: "■", no: "◆" };
  function stripHtml(R) {
    const cells = stripData(R);
    return '<details class="card fold strip" open><summary><h2>' + t("strip.title") + '</h2></summary><p class="small">' + t("strip.sub") + '</p><div class="strip-row" role="list">' +
      cells.map((c) => '<button type="button" role="listitem" class="cell ' + c.lv + (c.h * 60 === R.T ? " now" : "") + '" data-hour="' + c.h + '" aria-label="' + SR.hourLabel(c.h) + ": " + t("strip." + c.lv) + '"><i aria-hidden="true">' + GLYPH[c.lv] + "</i><span>" + SR.hourLabel(c.h).replace(" ", "") + "</span></button>").join("") +
      '</div><p class="small legend"><span class="cell-key yes">●</span> ' + t("strip.yes") + ' <span class="cell-key maybe">■</span> ' + t("strip.maybe") + ' <span class="cell-key no">◆</span> ' + t("strip.no") + "</p></details>";
  }

  function nextDate(dayType) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const ok = (x) => (dayType === "saturday" ? x === 6 : dayType === "sunday" ? x === 0 : x >= 1 && x <= 5);
    while (!ok(d.getDay())) d.setDate(d.getDate() + 1);
    return d;
  }
  function icsStamp(d, min) {
    const x = new Date(d.getTime() + Math.round(min) * 60000), z = (n) => String(n).padStart(2, "0");
    return x.getFullYear() + z(x.getMonth() + 1) + z(x.getDate()) + "T" + z(x.getHours()) + z(x.getMinutes()) + "00";
  }
  function downloadCalendar(R) {
    const m = R.main, d = nextDate(R.d), first = m.legs.find((l) => l.k === "bus");
    const esc2 = (s) => String(s).replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Shift Ready//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@shiftready",
      "DTSTAMP:" + icsStamp(new Date(), 0), "DTSTART:" + icsStamp(d, m.leave), "DTEND:" + icsStamp(d, m.arrive),
      "SUMMARY:" + esc2(t("leg.bus", { r: SR.routeName(first.route) }) + " → " + (R.to.label || "")),
      "DESCRIPTION:" + esc2(shareText(R)), "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:" + esc2(t("res.leave") + " " + SR.hm(m.leave)), "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" })); a.download = "shift-ready-trip.ics";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function printCard(R) {
    const row = (l, day) => {
      const inf = SR.stopInfo(day);
      return "<tr><td>" + esc(SR.stopName(l.fromStop)) + "</td><td>" + esc(SR.routeName(l.route)) + '</td><td class="num">' + (isFinite(inf.last[l.fromStop]) ? SR.hm(inf.last[l.fromStop]) : "–") + "</td></tr>";
    };
    let rows = R.main.legs.filter((l) => l.k === "bus").map((l) => row(l, R.d)).join("");
    let home = R.home && R.home.ok ? R.home.legs.filter((l) => l.k === "bus").map((l) => row(l, R.homeDay)).join("") : "";
    SR.printHtml("<h1>" + t("card.title") + "</h1><p>" + esc(R.from.label || "") + " → " + esc(R.to.label || "") + " · " + t("day." + R.d) + "</p><table><thead><tr><th>" + t("card.stop") + "</th><th>" + t("plan.from") + "</th><th>" + t("card.last") + "</th></tr></thead><tbody>" + rows +
      (home ? '<tr><td colspan="3"><b>' + t("card.home") + "</b></td></tr>" + home : "") + "</tbody></table><p>" + t("res.limits", { agency: SR.cfg.agency }) + "</p>");
  }

  function bindResult(R) {
    const sv = $("#plan-save");
    if (sv) sv.onclick = () => { savedSet({ from: R.from, to: R.to, d: R.d, m: R.m, T: R.T, wantHome: R.wantHome, endT: R.endT }); SR.renderSaved(); sv.textContent = t("saved.done"); };
    const cal = $("#plan-cal"); if (cal) cal.onclick = () => downloadCalendar(R);
    const cd = $("#plan-card"); if (cd) cd.onclick = () => printCard(R);
    document.querySelectorAll(".strip .cell").forEach((b) => {
      b.onclick = () => { const h = +b.dataset.hour; $("#time").value = String(h).padStart(2, "0") + ":00"; runPlan(); };
    });
    const o = $("#req-open"); if (o) o.onclick = () => SR.openRequest(R);
    const pm = $("#plan-map"); if (pm) pm.onclick = () => SR.showPlanOnMap(R);
    const sh = $("#plan-share");
    if (sh) sh.onclick = async () => {
      const txt = shareText(R);
      try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(txt); sh.textContent = t("req.copied"); } catch (e) {}
    };
    const p = $("#plan-print"); if (p) p.onclick = () => SR.printHtml("<h1>" + SR.t("plan.title") + "</h1>" + $("#plan-result").innerHTML.replace(/<button[^>]*>.*?<\/button>/g, ""));
    document.querySelectorAll("[data-alt]").forEach((b) => {
      b.onclick = () => { $("#time").value = String(Math.floor(+b.dataset.alt / 60) % 24).padStart(2, "0") + ":" + String(Math.round(+b.dataset.alt % 60)).padStart(2, "0"); runPlan(); };
    });
  }

  SR._compute = compute;   // used by tests
})();
