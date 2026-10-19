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
    const g1 = document.createElement("optgroup"); g1.label = t("plan.jobareas");
    Object.keys(SR.d.sheds).map((id) => SR.tractById[id]).filter(Boolean)
      .sort((a, b) => b.jobs_trans - a.jobs_trans).slice(0, 20).forEach((tr) => {
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
      if (v.startsWith("tract:")) { const tr = SR.tractById[v.slice(6)]; pt = { lat: tr.lat, lon: tr.lon, label: SR.tractLabel(tr) }; }
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

    $("#loc").onclick = async () => {
      try { const p = await SR.locate(); SR.coords.from = p; $("#from").value = t("plan.my_loc"); }
      catch (e) { $("#plan-result").innerHTML = '<div class="notice">' + t("plan.loc_fail") + "</div>"; }
    };
    $("#pick-from").onclick = () => SR.pickOnMap("from");
    $("#pick-to").onclick = () => SR.pickOnMap("to");
    $("#plan-form").onsubmit = (e) => { e.preventDefault(); runPlan(); };
    $("#want-home").onchange = () => { $("#end-time").hidden = !$("#want-home").checked; };
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

  function compute(from, to, d, m, T, wantHome, endT) {
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
    if (R.verdict.level !== "yes") R.alts = findAlternatives(R);
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
      const fare = SR.d.transit.fare_adult_single ? mn.boardings * SR.d.transit.fare_adult_single : null;
      h += '<div class="card"><h2>' + t("res.plan") + "</h2>" +
        '<div class="kv"><div><b>' + SR.hm(mn.leave) + "</b><span>" + t("res.leave") + "</span></div>" +
        "<div><b>" + SR.hm(mn.arrive) + "</b><span>" + t("res.arrive") + "</span></div>" +
        "<div><b>" + Math.round(mn.minutes) + " min</b><span>" + t("res.door") + "</span></div>" +
        (fare != null ? "<div><b>$" + fare.toFixed(2) + "</b><span>" + t("res.fare") + "</span></div>" : "") + "</div>" +
        legsHtml(mn) + riskHtml(mn, R);
      if (R.backup && R.backup.ok) {
        const late = R.m === "arrive" ? R.backup.arrive - R.T : null;
        h += '<h3>' + t("res.miss") + "</h3><p>" + t("res.miss_txt", { l: SR.hm(R.backup.leave), a: SR.hm(R.backup.arrive) }) +
          (late != null && late > 0 ? " <span class=\"badge warn\">" + t("res.late", { n: Math.round(late) }) + "</span>" : "") + "</p>";
      }
      h += "</div>";
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

    h += contextHtml(R) + helpHtml(R);
    h += '<div class="row gap wrap"><button id="req-open" class="btn primary" type="button">' + t("res.request") + '</button><button id="plan-print" class="btn ghost" type="button">' + t("res.print") + '</button><button id="plan-share" class="btn ghost" type="button">' + t("res.share") + '</button>' + (mn.ok ? '<button id="plan-map" class="btn ghost" type="button">' + t("res.showmap") + "</button>" : "") + "</div>";
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
    let h = '<div class="card"><h2>' + t("help.title") + "</h2><ul>";
    h += "<li>" + t("help.shift") + "</li>";
    if (nt && nt.d < 2500) {
      const shed = SR.d.sheds[nt.tract.id];
      const nearHome = shed.homes.filter(([id]) => { const x = SR.tractById[id]; return x && Planner.hav(R.from.lat, R.from.lon, x.lat, x.lon) < 3000; });
      const n = nearHome.reduce((a, b) => a + b[1], 0);
      if (n > 0) h += "<li>" + t("help.carpool", { n: SR.num(n), a: esc(SR.tractLabel(nt.tract)) }) + "</li>";
    }
    h += "<li>" + t("help.request") + "</li></ul></div>";
    return h;
  }

  function shareText(R) {
    const m = R.main;
    if (!m.ok) return t("share.none", { a: R.from.label || "", b: R.to.label || "" });
    const buses = m.legs.filter((l) => l.k === "bus").map((l) => t("leg.bus", { r: SR.routeName(l.route) }) + " " + SR.hm(l.dep)).join(" → ");
    return t("share.txt", { a: R.from.label || "", b: R.to.label || "", l: SR.hm(m.leave), r: SR.hm(m.arrive), buses });
  }

  function bindResult(R) {
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
