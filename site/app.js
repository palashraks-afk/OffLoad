/* OffloadWatch: static app. Reads window.OW_DATA (site/data/bundle.js), no server, no tracking. */
(function () {
  'use strict';
  var D = window.OW_DATA;
  var mainEl = document.getElementById('app');
  var appEl = mainEl;
  if (!D) { mainEl.textContent = 'The data files did not load. Please reload. In an emergency, call 911.'; return; }

  var META = D.meta, HOSP = D.hospitals, CLINICS = D.clinics, FC = D.forecast;
  var BYID = {};
  HOSP.forEach(function (h) { BYID[h.id] = h; });
  var LATEST = META.latest_month;
  var HOME = META.home_district;
  var REPO = 'https://github.com/palashraks-afk/OffLoad';

  /* ---------- language ---------- */
  var lang = 'en';
  try {
    var saved = localStorage.getItem('ow-lang');
    if (saved === 'en' || saved === 'es') lang = saved;
    else if ((navigator.language || '').toLowerCase().indexOf('es') === 0) lang = 'es';
  } catch (e) { /* storage may be blocked */ }

  function raw(key) {
    var v = D.i18n[lang][key];
    return v === undefined ? D.i18n.en[key] : v;
  }
  function fill(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; });
  }
  function t(key, vars) { var v = raw(key); return typeof v === 'string' ? fill(v, vars) : v; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- formatting ---------- */
  var locale = function () { return lang === 'es' ? 'es-US' : 'en-US'; };
  function monthLabel(m, short) {
    var p = m.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, 1));
    return d.toLocaleDateString(locale(), short ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(min) {
    var s = Math.round(min * 60);
    return Math.floor(s / 3600) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
  }
  function num(n, d) { return Number(n).toLocaleString(locale(), { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function aboutMin(min) { return t('minutes.about', { n: Math.round(min) }); }
  function pctText(p) { return p == null ? t('pct.unknown') : num(p, 1) + '%'; }
  function builtLabel() {
    var p = META.built.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function miles(a, b, c, d) {
    var R = 3958.8, r = Math.PI / 180;
    var dl = (c - a) * r, dn = (d - b) * r;
    var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function distText(mi) {
    var r = Math.round(mi * 10) / 10;
    return r === 1 ? t('near.dist.one') : t('near.dist', { mi: num(r, 1) });
  }

  /* ---------- crowding bands: color + shape + word, never color alone ---------- */
  var SHAPES = {
    red: { icon: '▲', svg: '<polygon points="12,2 23,22 1,22"/>' },
    yellow: { icon: '◆', svg: '<polygon points="12,1 23,12 12,23 1,12"/>' },
    green: { icon: '●', svg: '<circle cx="12" cy="12" r="10"/>' },
    gray: { icon: '○', svg: '<circle cx="12" cy="12" r="9" fill-opacity=".15"/>' }
  };
  var COLORS = { red: '#b42318', yellow: '#b45f06', green: '#166534', gray: '#4a5360' };
  function badge(b) {
    return '<span class="badge b-' + b + '"><span aria-hidden="true">' + SHAPES[b].icon + '</span> ' + esc(t('band.' + b)) + '</span>';
  }
  function status(h) {
    var m = h.months[LATEST];
    if (m) return { listed: true, m: m, band: m.band === 'gray' ? 'gray' : m.band };
    return { listed: false, m: null, band: 'gray' };
  }
  function listedMonths(h) { return Object.keys(h.months).sort(); }

  /* ---------- tiny helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function hospCsvRows(list) {
    var rows = [['facility_id', 'hospital', 'district', 'month', 'offloads', 'p90_min', 'standard_min', 'pct_compliant', 'lower_bound_hours', 'source_file']];
    list.forEach(function (h) {
      listedMonths(h).forEach(function (mo) {
        var v = h.months[mo];
        rows.push([h.id, h.name, h.district || '', mo, v.offloads, v.p90_min, v.standard_min, v.pct_compliant, v.hours_min, v.source_file]);
      });
    });
    return rows;
  }

  /* ---------- page chrome ---------- */
  var ROUTES = [['#/', 'nav.map'], ['#/district/' + HOME, 'nav.district'], ['#/compare', 'nav.compare'], ['#/forecast', 'nav.forecast'], ['#/methods', 'nav.methods'], ['#/about', 'nav.about']];
  var current = { base: '#/' };

  function chrome() {
    document.documentElement.lang = lang;
    $('#skip').textContent = t('skip');
    $('#e911').setAttribute('aria-label', t('e911.label'));
    $('#e911').innerHTML = '<strong>' + esc(t('e911.title')) + '</strong> <span>' + esc(t('e911.body')) + '</span>';
    var nav = ROUTES.map(function (r) {
      var on = current.base === r[0].split('/').slice(0, 2).join('/') || (r[0] === '#/' && current.base === '#/') || (r[0].indexOf('#/district') === 0 && current.base === '#/district');
      return '<li><a href="' + r[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + esc(t(r[1])) + '</a></li>';
    }).join('');
    $('#top').innerHTML = '<div class="top-in">' +
      '<a class="brand" href="#/"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M16 8v16M8 16h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>' + esc(t('app.title')) + '</a>' +
      '<nav aria-label="' + esc(t('nav.label')) + '"><ul>' + nav + '</ul></nav>' +
      '<button type="button" class="langbtn" id="lang" lang="' + (lang === 'en' ? 'es' : 'en') + '" aria-label="' + esc(t('lang.toggle.label')) + '">' + esc(t('lang.toggle')) + '</button></div>';
    $('#lang').onclick = function () {
      lang = lang === 'en' ? 'es' : 'en';
      try { localStorage.setItem('ow-lang', lang); } catch (e) { /* ignore */ }
      chrome(); route(true);
    };
    $('#foot').innerHTML = '<p>' + esc(t('info.only')) + '</p><p>' + esc(t('footer.data')) + ' ' + esc(t('fresh.built', { built: builtLabel() })) + ' <a href="' + REPO + '/issues" rel="noopener">' + esc(t('footer.error')) + '</a> &middot; <a href="' + REPO + '" rel="noopener">GitHub</a></p>';
  }

  /* ---------- maps ---------- */
  var activeMap = null;
  function destroyMap() { if (activeMap) { try { activeMap.remove(); } catch (e) { /* ignore */ } activeMap = null; } }
  function featureFor(d) {
    for (var i = 0; i < D.geo.features.length; i++) if (D.geo.features[i].properties.district === d) return D.geo.features[i];
    return null;
  }
  function featureBounds(f) {
    var b = [999, 999, -999, -999];
    (function walk(c) {
      if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[1]); b[1] = Math.min(b[1], c[0]); b[2] = Math.max(b[2], c[1]); b[3] = Math.max(b[3], c[0]); }
      else c.forEach(walk);
    })(f.geometry.coordinates);
    return b; // south, west, north, east
  }
  function markerIcon(h) {
    var b = status(h).band;
    var html = '<svg class="mk" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="' + COLORS[b] + '" stroke="#fff" stroke-width="2">' + SHAPES[b].svg.replace('<circle cx="12" cy="12" r="9" fill-opacity=".15"/>', '<circle cx="12" cy="12" r="9" fill="#fff" stroke="' + COLORS.gray + '" stroke-width="3"/>') + '</svg>';
    return L.divIcon({ html: html, className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }
  function hospLabel(h) {
    var s = status(h);
    return h.name + ' - ' + t('band.' + s.band);
  }
  function drawMap(el, opts) {
    destroyMap();
    var map = L.map(el, { scrollWheelZoom: false });
    activeMap = map;
    try {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    } catch (e) { /* offline: points and outline still draw */ }
    var f = opts.district ? featureFor(opts.district) : null;
    if (f) L.geoJSON(f, { style: { color: '#0a5c7a', weight: 3, fillColor: '#0a5c7a', fillOpacity: 0.08 }, interactive: false }).addTo(map);
    opts.hospitals.forEach(function (h) {
      if (h.lat == null) return;
      var m = L.marker([h.lat, h.lon], { icon: markerIcon(h), title: hospLabel(h), alt: hospLabel(h), keyboard: true });
      m.bindPopup('<strong>' + esc(h.name) + '</strong><br>' + badge(status(h).band) + '<br><a href="#/hospital/' + encodeURIComponent(h.id) + '">' + esc(t('card.detail', { name: h.name })) + '</a>');
      m.addTo(map);
    });
    if (opts.pin) {
      L.circleMarker([opts.pin[0], opts.pin[1]], { radius: 8, color: '#000', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    }
    if (opts.view) map.setView(opts.view[0], opts.view[1]);
    else if (opts.bounds) map.fitBounds([[opts.bounds[0], opts.bounds[1]], [opts.bounds[2], opts.bounds[3]]], { padding: [20, 20] });
    else map.setView([34.1, -117.3], 10);
    return map;
  }
  function legendHtml() {
    return '<h2>' + esc(t('legend.title')) + '</h2><ul class="legend">' + ['red', 'yellow', 'green', 'gray'].map(function (b) {
      return '<li>' + badge(b) + '<span>' + esc(t('band.' + b + '.desc')) + '</span></li>';
    }).join('') + '</ul><p class="small">' + esc(t('legend.note')) + '</p>';
  }

  /* ---------- hospital card ---------- */
  function cardHtml(h, dist) {
    var s = status(h), body, where = [];
    if (h.city) where.push(esc(h.city));
    if (dist != null) where.push(esc(distText(dist)));
    var std;
    if (s.listed) {
      std = Math.round(s.m.standard_min);
      body = '<p class="big">' + Math.round(s.m.p90_min) + ' <small>' + esc(t('minutes.unit')) + '</small></p><p class="cap">' + esc(t('card.big.label')) + '</p>' +
        (s.m.pct_compliant == null ? '<p class="cap">' + esc(t('card.listed.nopct', { month: monthLabel(LATEST), p90: aboutMin(s.m.p90_min), std: std })) + '</p>'
          : '<div class="meter" role="img" aria-label="' + esc(t('card.meter', { pct: Math.round(s.m.pct_compliant), std: std })) + '"><span style="width:' + Math.max(2, Math.round(s.m.pct_compliant)) + '%"></span></div><p class="cap">' + esc(t('card.meter', { pct: Math.round(s.m.pct_compliant), std: std })) + '</p>') +
        '<details><summary>' + esc(t('card.exact')) + '</summary><p>' + esc(t('card.exact.body', { mmss: mmss(s.m.p90_min), n: num(s.m.offloads), pct: pctText(s.m.pct_compliant) })) + '</p></details>';
    } else {
      var lm = listedMonths(h);
      body = '<p class="cap"><strong>' + esc(t('card.notlisted.short', { month: monthLabel(LATEST) })) + '</strong></p>' +
        (lm.length ? '<p class="cap">' + esc(t('card.last', { month: monthLabel(lm[lm.length - 1]) })) + '</p>' : '') +
        '<p class="cap">' + esc(t('band.gray.desc')) + '</p>';
    }
    return '<li class="card hc"><h3>' + esc(h.name) + '</h3><p class="where">' + where.join(' &middot; ') + '</p><p>' + badge(s.band) + '</p>' + body +
      '<a class="more" href="#/hospital/' + encodeURIComponent(h.id) + '" aria-label="' + esc(t('card.detail', { name: h.name })) + '">' + esc(t('card.more')) + ' &rarr;</a></li>';
  }

  /* ---------- search ---------- */
  function cityOptions() {
    return '<option value="">' + esc(t('search.city.none')) + '</option>' + Object.keys(D.places.cities).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  }
  function searchFormHtml(q) {
    return '<form class="search" id="sf" role="search" novalidate><div class="field"><label for="q">' + esc(t('search.label')) + '</label>' +
      '<input type="search" id="q" name="q" autocomplete="street-address" placeholder="' + esc(t('search.placeholder')) + '" value="' + esc(q || '') + '"></div>' +
      '<button class="primary" type="submit">' + esc(t('search.button')) + '</button></form>' +
      '<div id="msg" role="status" aria-live="polite"></div><p class="small">' + esc(t('search.hint')) + '</p>';
  }
  function tryChips() {
    return '<div class="tryrow"><span>' + esc(t('search.try')) + '</span>' + ['92404', 'San Bernardino', 'Redlands', '92335'].map(function (x) { return '<button type="button" class="chip" data-q="' + x + '">' + x + '</button>'; }).join('') + '</div>';
  }
  function wireChips() {
    $all('[data-q]').forEach(function (b) { b.onclick = function () { $('#q').value = b.getAttribute('data-q'); $('#sf').requestSubmit(); }; });
  }
  function wireSearch() {
    var form = $('#sf'); if (!form) return;
    var msg = $('#msg');
    function say(html) { msg.innerHTML = html; }
    function toNear(lat, lon, q) { go('#/near?lat=' + lat.toFixed(5) + '&lon=' + lon.toFixed(5) + '&q=' + encodeURIComponent(q)); }
    form.onsubmit = function (ev) {
      ev.preventDefault();
      var q = $('#q').value.trim();
      if (!q) { say(esc(t('search.empty'))); return; }
      var zip = q.match(/^(\d{5})(-\d{4})?$/);
      if (zip) {
        var z = D.places.zips[zip[1]];
        if (z) { toNear(z[0], z[1], zip[1]); return; }
        say(emptySearchHtml()); wireTry(); return;
      }
      var cityKey = q.replace(/,?\s*(ca|california)\.?$/i, '').trim().toLowerCase();
      var hit = Object.keys(D.places.cities).filter(function (c) { return c.toLowerCase() === cityKey; })[0];
      if (hit) { toNear(D.places.cities[hit][0], D.places.cities[hit][1], hit); return; }
      say(esc(t('search.looking')));
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
      var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&viewbox=-124.6,42.1,-114.0,32.4&bounded=1&q=' + encodeURIComponent(q);
      fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function (j) {
        clearTimeout(timer);
        if (j && j[0]) toNear(parseFloat(j[0].lat), parseFloat(j[0].lon), q);
        else say(emptySearchHtml() + fallbackHtml());
        wireFallback(); wireTry();
      }).catch(function () {
        clearTimeout(timer);
        say('<p><strong>' + esc(t('search.fail')) + '</strong></p>' + fallbackHtml());
        wireFallback();
      });
    };
    function emptySearchHtml() {
      return '<div class="card empty"><h3>' + esc(t('empty.search.h')) + '</h3><p>' + esc(t('empty.search.p')) + '</p>' + tryChips() + '</div>';
    }
    function wireTry() { wireChips(); }
    function fallbackHtml() {
      return '<div><label for="cityfb">' + esc(t('search.city')) + '</label> <select id="cityfb">' + cityOptions() + '</select></div>';
    }
    function wireFallback() {
      var s = $('#cityfb'); if (!s) return;
      s.onchange = function () { var c = s.value; if (c) toNear(D.places.cities[c][0], D.places.cities[c][1], c); };
    }
  }

  /* ---------- views ---------- */
  function districtList() {
    var ids = {};
    HOSP.forEach(function (h) { if (h.district) ids[h.district] = 1; });
    return Object.keys(ids).sort(function (a, b) { return parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10); });
  }
  var vertCache = {};
  function vertices(d) {
    if (vertCache[d]) return vertCache[d];
    var out = [], f = featureFor(d);
    if (f) (function walk(c) { if (typeof c[0] === 'number') out.push(c); else c.forEach(walk); })(f.geometry.coordinates);
    vertCache[d] = out; return out;
  }
  /* Approximate distance (miles) from a hospital to the district outline, using outline vertices. */
  function distToDistrict(h, d) {
    var v = vertices(d), best = Infinity;
    for (var i = 0; i < v.length; i++) { var m = miles(h.lat, h.lon, v[i][1], v[i][0]); if (m < best) best = m; }
    return best;
  }
  function inDistrictArea(h, d, padMi) {
    if (h.lat == null) return false;
    if (h.district === d) return true;
    return distToDistrict(h, d) <= padMi;
  }

  function viewHome() {
    var d = HOME, cur = (D.districts[d] || { months: {} }).months[LATEST];
    var worst = null;
    HOSP.forEach(function (h) { if (h.district === d && h.months[LATEST] && (!worst || h.months[LATEST].p90_min > worst.p90_min)) worst = h.months[LATEST]; });
    appEl.innerHTML =
      '<section class="hero"><h1 id="h1" tabindex="-1">' + esc(t('hero.h1')) + '</h1><p class="lead">' + esc(t('hero.sub')) + '</p>' +
      searchFormHtml('') + tryChips() + '</section>' +
      '<div class="grid c3" style="margin-top:2rem">' +
      '<a class="card door" href="#/" id="d1"><span class="who">' + esc(t('door.res.who')) + '</span><h2 class="h3">' + esc(t('door.res.h')) + '</h2><p>' + esc(t('door.res.p')) + '</p><span class="go">' + esc(t('door.res.go')) + ' &rarr;</span></a>' +
      '<a class="card door" href="#/district/' + d + '"><span class="who">' + esc(t('door.off.who')) + '</span><h2 class="h3">' + esc(t('door.off.h')) + '</h2><p>' + esc(t('door.off.p')) + '</p><span class="go">' + esc(t('door.off.go')) + ' &rarr;</span></a>' +
      '<a class="card door" href="#/forecast"><span class="who">' + esc(t('door.ana.who')) + '</span><h2 class="h3">' + esc(t('door.ana.h')) + '</h2><p>' + esc(t('door.ana.p')) + '</p><span class="go">' + esc(t('door.ana.go')) + ' &rarr;</span></a></div>' +
      '<div class="grid c2 ps" style="margin-top:1rem"><div class="card"><h2 class="h3">' + esc(t('ps.problem.h')) + '</h2><p>' + esc(t('ps.problem')) + '</p></div>' +
      '<div class="card"><h2 class="h3">' + esc(t('ps.solution.h')) + '</h2><p>' + esc(t('ps.solution')) + '</p></div></div>' +
      '<h2>' + esc(t('stats.h', { d: d })) + ' <span class="small">&middot; ' + esc(monthLabel(LATEST)) + '</span></h2>' +
      '<div class="grid c3"><div class="card stat-tile"><p class="label">' + esc(t('stat.hospitals')) + '</p><p class="stat">' + (cur ? cur.listed : 0) + '</p><p class="sub">' + esc(t('stat.hospitals.sub', { month: monthLabel(LATEST) })) + '</p></div>' +
      '<div class="card stat-tile"><p class="label">' + esc(t('stat.hours')) + '</p><p class="stat">' + num(cur ? cur.hours_min : 0, 1) + ' <small>h</small></p><p class="sub">' + esc(t('stat.hours.sub', { month: monthLabel(LATEST) })) + '</p></div>' +
      '<div class="card stat-tile"><p class="label">' + esc(t('stat.wait')) + '</p><p class="stat">' + (worst ? Math.round(worst.p90_min) : '\u2014') + ' <small>' + esc(t('minutes.unit')) + '</small></p><p class="sub">' + esc(worst ? t('stat.wait.sub', { std: Math.round(worst.standard_min) }) : '') + '</p></div></div>' +
      '<h2>' + esc(t('map.h')) + '</h2>' +
      '<div class="row"><div><label for="dsel">' + esc(t('district.pick')) + '</label><br><select id="dsel">' +
      districtList().map(function (x) { return '<option value="' + x + '"' + (x === d ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
      '<div id="map" class="map" role="region" aria-label="' + esc(t('map.label')) + '"></div><p class="small">' + esc(t('map.note')) + '</p>' +
      legendHtml() +
      '<h2>' + esc(t('map.list')) + '</h2><p class="small">' + esc(t('map.list.help')) + '</p><ul class="cards three" id="hl"></ul>';
    wireSearch(); wireChips();
    $('#d1').onclick = function (ev) { ev.preventDefault(); var q = $('#q'); window.scrollTo(0, 0); q.focus(); };
    function show(dist) {
      var f = featureFor(dist), b = f ? featureBounds(f) : null;
      drawMap($('#map'), { district: dist, hospitals: HOSP, bounds: b });
      var list = HOSP.filter(function (h) { return h.lat != null && inDistrictArea(h, dist, 6); });
      var c = b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : [34.1, -117.3];
      list.sort(function (a, z) { return miles(c[0], c[1], a.lat, a.lon) - miles(c[0], c[1], z.lat, z.lon); });
      $('#hl').innerHTML = list.length ? list.map(function (h) { return cardHtml(h, null); }).join('')
        : '<li class="card empty"><h3>' + esc(t('empty.district.h', { d: dist })) + '</h3><p>' + esc(t('empty.district.p', { home: HOME })) + '</p></li>';
    }
    $('#dsel').onchange = function () { show(this.value); };
    show(d);
  }

  function viewNear(params) {
    var lat = parseFloat(params.lat), lon = parseFloat(params.lon), q = params.q || t('near.here');
    if (isNaN(lat) || isNaN(lon)) { go('#/'); return; }
    var near = HOSP.filter(function (h) { return h.lat != null; }).map(function (h) { return { h: h, d: miles(lat, lon, h.lat, h.lon) }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, 6);
    var cl = CLINICS.map(function (c) { return { c: c, d: miles(lat, lon, c.lat, c.lon) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 5);
    appEl.innerHTML =
      '<p class="crumb"><a href="#/">&larr; ' + esc(t('back.map')) + '</a></p><h1 id="h1" tabindex="-1">' + esc(t('near.h', { place: q })) + '</h1>' +
      '<div class="callout caution"><strong>' + esc(t('near.emergency')) + '</strong></div>' + searchFormHtml(params.q || '') +
      '<div id="map" class="map small" role="region" aria-label="' + esc(t('map.label')) + '"></div>' + legendHtml() +
      (near.length ? '<ul class="cards three">' + near.map(function (x) { return cardHtml(x.h, x.d); }).join('') + '</ul>' : '<div class="card empty"><h3>' + esc(t('empty.near.h')) + '</h3><p>' + esc(t('empty.near.p')) + '</p><div class="actions"><a class="btn primary" href="#/">' + esc(t('back.map')) + '</a><a class="btn" href="#/district/' + HOME + '">' + esc(t('nav.district')) + '</a></div></div>') +
      '<h2>' + esc(t('clinics.h')) + '</h2><p class="small">' + esc(t('clinics.note')) + '</p>' +
      (cl.length ? '<ul class="cards three">' + cl.map(function (x) {
        return '<li class="card hc"><h3>' + esc(x.c.name) + '</h3><p class="where">' + esc(x.c.address) + ' &middot; ' + esc(distText(x.d)) + '</p>' +
          (x.c.phone ? '<p>' + esc(t('clinics.call', { phone: x.c.phone })) + '</p>' : '') + '</li>';
      }).join('') + '</ul>' : '<div class="card empty"><h3>' + esc(t('empty.clinics.h')) + '</h3><p>' + esc(t('empty.clinics.p')) + '</p></div>');
    wireSearch();
    var pts = near.map(function (x) { return x.h; });
    var south = Math.min(lat, near.length ? Math.min.apply(null, pts.slice(0, 3).map(function (h) { return h.lat; })) : lat);
    var north = Math.max(lat, near.length ? Math.max.apply(null, pts.slice(0, 3).map(function (h) { return h.lat; })) : lat);
    var west = Math.min(lon, near.length ? Math.min.apply(null, pts.slice(0, 3).map(function (h) { return h.lon; })) : lon);
    var east = Math.max(lon, near.length ? Math.max.apply(null, pts.slice(0, 3).map(function (h) { return h.lon; })) : lon);
    drawMap($('#map'), { district: null, hospitals: pts, bounds: [south, west, north, east], pin: [lat, lon] });
  }

  /* ---- SVG charts (hand drawn, with a data table beneath) ---- */
  function lineChart(h, altText) {
    var W = 640, H = 280, L0 = 48, R0 = 16, T0 = 16, B0 = 44;
    var ms = META.months, vals = ms.map(function (m) { return h.months[m] ? h.months[m].p90_min : null; });
    var std = null; ms.forEach(function (m) { if (h.months[m]) std = h.months[m].standard_min; });
    var maxV = Math.max.apply(null, vals.filter(function (v) { return v != null; }).concat([std || 0]));
    var top = Math.ceil((maxV * 1.12) / 10) * 10 || 10;
    function x(i) { return L0 + (W - L0 - R0) * (ms.length === 1 ? 0.5 : i / (ms.length - 1)); }
    function y(v) { return T0 + (H - T0 - B0) * (1 - v / top); }
    var g = '';
    for (var v = 0; v <= top; v += 10) g += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="currentColor" stroke-opacity=".15"/><text class="muted" x="' + (L0 - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    ms.forEach(function (m, i) { g += '<text class="muted" x="' + x(i) + '" y="' + (H - 22) + '" text-anchor="middle">' + esc(monthLabel(m, true)) + '</text>'; });
    var line = '', run = [];
    vals.forEach(function (v2, i) {
      if (v2 == null) { if (run.length > 1) line += '<polyline fill="none" stroke="#0a5c7a" stroke-width="3" points="' + run.join(' ') + '"/>'; run = []; return; }
      run.push(x(i) + ',' + y(v2));
    });
    if (run.length > 1) line += '<polyline fill="none" stroke="#0a5c7a" stroke-width="3" points="' + run.join(' ') + '"/>';
    var pts = '';
    vals.forEach(function (v3, i) {
      if (v3 == null) pts += '<text class="muted" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(t('detail.notlisted.month')) + '</text>';
      else pts += '<circle cx="' + x(i) + '" cy="' + y(v3) + '" r="5" fill="#0a5c7a" stroke="#fff" stroke-width="2"/><text x="' + x(i) + '" y="' + (y(v3) - 10) + '" text-anchor="middle">' + Math.round(v3) + '</text>';
    });
    var stdLine = std == null ? '' : '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + y(std) + '" y2="' + y(std) + '" stroke="#15191f" stroke-width="2" stroke-dasharray="6 5"/><text x="' + (W - R0) + '" y="' + (y(std) - 6) + '" text-anchor="end" style="font-weight:600">' + esc(t('detail.target', { std: Math.round(std) })) + '</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(altText) + '">' + g + stdLine + line + pts + '</svg>';
  }
  function barChart(rows, altText) {
    var W = 640, H = 240, L0 = 52, R0 = 16, T0 = 20, B0 = 40;
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    var top = Math.ceil(max * 1.15 / 10) * 10 || 10, bw = (W - L0 - R0) / rows.length;
    var g = '';
    [0, 0.5, 1].forEach(function (f) { var v = top * f, yy = T0 + (H - T0 - B0) * (1 - f); g += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + yy + '" y2="' + yy + '" stroke="currentColor" stroke-opacity=".15"/><text class="muted" x="' + (L0 - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + num(v) + '</text>'; });
    rows.forEach(function (r, i) {
      var hh = (H - T0 - B0) * (r.v / top), xx = L0 + i * bw + bw * 0.18;
      g += '<rect x="' + xx + '" y="' + (H - B0 - hh) + '" width="' + (bw * 0.64) + '" height="' + hh + '" fill="#0a5c7a"/><text x="' + (xx + bw * 0.32) + '" y="' + (H - B0 - hh - 5) + '" text-anchor="middle">' + num(r.v, 1) + '</text><text class="muted" x="' + (xx + bw * 0.32) + '" y="' + (H - 20) + '" text-anchor="middle">' + esc(monthLabel(r.m, true)) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(altText) + '">' + g + '</svg>';
  }

  function forecastFor(id) {
    var items = FC.forecast.items;
    for (var i = 0; i < items.length; i++) if (items[i].facility_id === id) return items[i];
    return null;
  }
  function persistRate() { return FC.classification.test_base_rate; }

  function viewHospital(id) {
    var h = BYID[id];
    if (!h) { appEl.innerHTML = '<p>' + esc(t('detail.notfound')) + '</p><p><a href="#/">' + esc(t('back.map')) + '</a></p>'; return; }
    var s = status(h), lm = listedMonths(h), last = lm.length ? h.months[lm[lm.length - 1]] : null;
    var trauma = h.trauma ? '<p class="small">' + esc(t('detail.trauma', { level: h.trauma.replace(/^LEVEL\s+/i, 'Level ') })) + '</p>' : '';
    var sect = '';
    if (s.listed) {
      sect += '<div class="grid c2"><div class="card stat-tile"><p class="label">' + esc(t('detail.status', { month: monthLabel(LATEST) })) + '</p><p>' + badge(s.band) + '</p><p>' +
        esc(t(s.m.pct_compliant == null ? 'card.listed.nopct' : 'card.listed', { month: monthLabel(LATEST), p90: aboutMin(s.m.p90_min), std: Math.round(s.m.standard_min), pct: s.m.pct_compliant == null ? '' : Math.round(s.m.pct_compliant) })) + '</p>' +
        '<details><summary>' + esc(t('card.exact')) + '</summary><p>' + esc(t('card.exact.body', { mmss: mmss(s.m.p90_min), n: num(s.m.offloads), pct: pctText(s.m.pct_compliant) })) + '</p></details></div>' +
        '<div class="card stat-tile"><p class="label">' + esc(t('detail.hours', { month: monthLabel(LATEST) })) + '</p><p class="stat">' + num(s.m.hours_min, 1) + '</p><p class="small">' + esc(s.m.hours_min > 0 ? t('detail.hours.expl') : t('detail.hours.zero')) + '</p></div></div>';
    } else {
      sect += '<div class="card empty"><p>' + badge('gray') + '</p><p>' + esc(t('detail.notlisted.expl', { month: monthLabel(LATEST) })) + '</p>' +
        (lm.length ? '<p class="small">' + esc(t('card.last', { month: monthLabel(lm[lm.length - 1]) })) + '</p>' : '<p class="small">' + esc(t('card.never', { first: monthLabel(META.months[0]), last: monthLabel(LATEST) })) + '</p>') + '</div>';
    }
    if (lm.length) {
      var stdv = last.standard_min;
      sect += '<h2>' + esc(t('detail.trend')) + '</h2>' + lineChart(h, t('detail.trend.alt', { std: Math.round(stdv) })) +
        '<div class="tablewrap chartdata"><table><caption>' + esc(t('detail.table')) + '</caption><thead><tr><th scope="col">' + esc(t('detail.col.month')) + '</th><th scope="col">' + esc(t('detail.col.listed')) + '</th><th scope="col" class="num">' + esc(t('detail.col.n')) + '</th><th scope="col" class="num">' + esc(t('detail.col.p90')) + '</th><th scope="col" class="num">' + esc(t('detail.col.std')) + '</th><th scope="col" class="num">' + esc(t('detail.col.pct')) + '</th><th scope="col" class="num">' + esc(t('detail.col.hours')) + '</th></tr></thead><tbody>' +
        META.months.map(function (m) {
          var v = h.months[m];
          return v ? '<tr><th scope="row">' + esc(monthLabel(m)) + '</th><td>' + badge(v.band) + '</td><td class="num">' + num(v.offloads) + '</td><td class="num">' + num(v.p90_min, 1) + '</td><td class="num">' + num(v.standard_min) + '</td><td class="num">' + (v.pct_compliant == null ? esc(t('pct.unknown')) : num(v.pct_compliant, 1)) + '</td><td class="num">' + num(v.hours_min, 1) + '</td></tr>'
            : '<tr><th scope="row">' + esc(monthLabel(m)) + '</th><td>' + badge('gray') + '</td><td class="num" colspan="5">' + esc(t('detail.notlisted.month')) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var fi = forecastFor(h.id);
      sect += '<h2>' + esc(t('detail.forecast')) + '</h2><div class="callout caution">' + (fi && fi.status === 'forecast'
        ? esc(t('detail.forecast.body', { rate: Math.round(persistRate() * 100) + '%', over: num(s.listed ? s.m.over_min : 0, 1), prob: Math.round(fi.p_stays_listed * 100) + '%' }))
        : esc(t('detail.forecast.none'))) + '</div>';
    }
    sect += '<p>' + esc(h.district ? t('detail.district', { d: h.district }) : t('detail.district.none')) + (h.district ? ' <a href="#/district/' + h.district + '">' + esc(t('nav.district')) + '</a>' : '') + '</p>';
    if (last) sect += '<p class="small">' + esc(t('detail.source', { file: last.source_file })) + ' <a href="' + META.report_page + '" rel="noopener">' + esc(t('detail.source.link')) + '</a></p>';
    sect += '<p class="small">' + esc(t('detail.location', { src: h.location_source })) + '</p>';
    sect += '<p class="noprint">' + (lm.length ? '<button type="button" id="dl">' + esc(t('detail.download')) + '</button> ' : '') +
      '<a class="btn" href="' + REPO + '/issues/new?title=' + encodeURIComponent('Data error: ' + h.name) + '" rel="noopener">' + esc(t('detail.report')) + '</a></p>';
    appEl.innerHTML = '<p class="crumb"><a href="#/">&larr; ' + esc(t('back.map')) + '</a></p><h1 id="h1" tabindex="-1">' + esc(h.name) + '</h1>' +
      '<p class="small">' + esc(h.city ? t('detail.city', { city: h.city }) : '') + ' &middot; ' + esc(h.lemsa) + '</p>' + trauma + sect;
    var dl = $('#dl'); if (dl) dl.onclick = function () { downloadCsv('offloadwatch-' + h.id + '.csv', hospCsvRows([h])); };
    document.title = h.name + ' - OffloadWatch';
  }

  function viewDistrict(d) {
    d = d || HOME;
    var dsel = districtList();
    var list = HOSP.filter(function (h) { return h.district === d; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var dd = D.districts[d] || { months: {} };
    var tot = dd.months[LATEST] ? dd.months[LATEST].hours_min : 0;
    var bars = META.months.map(function (m) { var x = dd.months[m]; return { m: m, v: x ? x.hours_min : 0, n: x ? x.listed : 0 }; });
    var f = featureFor(d), nearby = [];
    if (f) {
      nearby = HOSP.filter(function (h) { return h.lat != null && h.district !== d && inDistrictArea(h, d, 6); }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    function rowFor(h) {
      var s = status(h);
      return '<tr><th scope="row"><a href="#/hospital/' + encodeURIComponent(h.id) + '">' + esc(h.name) + '</a><br><span class="small">' + esc(h.city) + '</span></th><td>' + badge(s.band) + '</td>' +
        (s.listed ? '<td class="num">' + num(s.m.offloads) + '</td><td class="num">' + esc(mmss(s.m.p90_min)) + '</td><td class="num">' + esc(pctText(s.m.pct_compliant)) + '</td><td class="num">' + num(s.m.hours_min, 1) + '</td>'
          : '<td class="num" colspan="4">' + esc(t('card.notlisted', { month: monthLabel(LATEST) })) + '</td>') + '</tr>';
    }
    var head = '<tr><th scope="col">' + esc(t('district.col.name')) + '</th><th scope="col">' + esc(t('district.col.status', { month: monthLabel(LATEST) })) + '</th><th scope="col" class="num">' + esc(t('district.col.n')) + '</th><th scope="col" class="num">' + esc(t('district.col.p90')) + '</th><th scope="col" class="num">' + esc(t('district.col.pct')) + '</th><th scope="col" class="num">' + esc(t('district.col.hours')) + '</th></tr>';
    appEl.innerHTML =
      '<h1 id="h1" tabindex="-1">' + esc(t('district.h')) + ': ' + esc(d) + '</h1>' +
      '<div class="row noprint"><div><label for="dsel">' + esc(t('district.pick')) + '</label><br><select id="dsel">' + dsel.map(function (x) { return '<option' + (x === d ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="primary" id="pr">' + esc(t('district.print')) + '</button><button type="button" id="dcsv">' + esc(t('district.csv')) + '</button></div>' +
      '<p class="lead">' + esc(t('district.intro', { d: d })) + '</p>' +
      '<div class="grid c2"><div class="card stat-tile"><p class="label">' + esc(t('district.total', { month: monthLabel(LATEST) })) + '</p><p class="stat">' + num(tot, 1) + '</p><p class="small">' + esc(t('district.total.expl')) + '</p></div>' +
      '<div class="card"><h2 style="margin-top:0">' + esc(t('whatif.h')) + '</h2><label for="wi" id="wl"></label><br><input type="range" id="wi" min="0" max="100" step="5" value="50"> <output id="wo" for="wi"></output><p id="wr" aria-live="polite"></p></div></div>' +
      '<h2>' + esc(t('district.table', { d: d })) + '</h2>' +
      (list.length ? '<div class="tablewrap"><table><thead>' + head + '</thead><tbody>' + list.map(rowFor).join('') + '</tbody></table></div>' : '<p>' + esc(t('district.none')) + '</p>') +
      (bars.length ? '<h2>' + esc(t('district.trend')) + '</h2>' + barChart(bars, t('district.trend.alt')) +
        '<div class="tablewrap chartdata"><table><caption class="sr">' + esc(t('district.trend')) + '</caption><thead><tr><th scope="col">' + esc(t('district.col.month')) + '</th><th scope="col" class="num">' + esc(t('district.col.listed')) + '</th><th scope="col" class="num">' + esc(t('district.col.hours')) + '</th></tr></thead><tbody>' +
        bars.map(function (b) { return '<tr><th scope="row">' + esc(monthLabel(b.m)) + '</th><td class="num">' + b.n + '</td><td class="num">' + num(b.v, 1) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      (nearby.length ? '<h2>' + esc(t('district.nearby')) + '</h2><p class="small">' + esc(t('district.nearby.expl')) + '</p><div class="tablewrap"><table><thead>' + head + '</thead><tbody>' + nearby.map(rowFor).join('') + '</tbody></table></div>' : '') +
      '<p class="small" style="margin-top:1rem">' + esc(t('district.source', { first: monthLabel(META.months[0]), last: monthLabel(LATEST), built: builtLabel() })) + '</p><p class="small">' + esc(t('district.limits')) + '</p>';
    $('#dsel').onchange = function () { go('#/district/' + this.value); };
    $('#pr').onclick = function () { window.print(); };
    $('#dcsv').onclick = function () { downloadCsv('offloadwatch-' + d + '.csv', hospCsvRows(list)); };
    var wi = $('#wi');
    function upd() {
      var p = +wi.value;
      $('#wl').textContent = t('whatif.label', { pct: p });
      $('#wo').textContent = p + '%';
      wi.setAttribute('aria-valuetext', p + '%');
      $('#wr').textContent = t('whatif.result', { h: num(tot * p / 100, 1) });
    }
    wi.oninput = upd; upd();
    document.title = d + ' - ' + t('district.h') + ' - OffloadWatch';
  }

  function viewCompare() {
    var rows = Object.keys(D.districts).map(function (d) {
      var mm = D.districts[d].months[LATEST]; if (!mm) return null;
      var longest = 0;
      HOSP.forEach(function (h) { if (h.district === d && h.months[LATEST]) longest = Math.max(longest, h.months[LATEST].p90_min); });
      return { d: d, n: mm.listed, hours: mm.hours_min, longest: longest };
    }).filter(Boolean).sort(function (a, b) { return b.hours - a.hours; });
    appEl.innerHTML = '<h1 id="h1" tabindex="-1">' + esc(t('compare.h')) + '</h1><p class="lead">' + esc(t('compare.lead')) + '</p>' +
      '<div class="row"><div><label for="stsel">' + esc(t('compare.state')) + '</label><br><select id="stsel"><option>California</option></select></div></div>' +
      '<p class="small">' + esc(t('compare.states')) + '</p>' +
      '<div class="tablewrap"><table><thead><tr><th scope="col">' + esc(t('compare.col.district')) + '</th><th scope="col" class="num">' + esc(t('compare.col.hospitals')) + '</th><th scope="col" class="num">' + esc(t('compare.col.hours', { month: monthLabel(LATEST) })) + '</th><th scope="col" class="num">' + esc(t('compare.col.longest')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><th scope="row"><a href="#/district/' + r.d + '" aria-label="' + esc(t('compare.open', { d: r.d })) + '">' + r.d + '</a></th><td class="num">' + r.n + '</td><td class="num">' + num(r.hours, 1) + '</td><td class="num">' + num(r.longest, 1) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function viewForecast() {
    var c = FC.classification, r = FC.regression, beats = FC.beats_baseline;
    var verdict = (beats.classification && beats.regression) ? 'forecast.verdict.yes' : 'forecast.verdict.no';
    var items = FC.forecast.items.filter(function (i) { return i.status === 'forecast' && BYID[i.facility_id]; });
    var homeItems = items.filter(function (i) { return BYID[i.facility_id].district === HOME; });
    var showAll = !homeItems.length;
    function f3(v) { return v == null ? '—' : num(v, 3); }
    function rowsFor(list) {
      list = list.slice().sort(function (a, b) { return BYID[a.facility_id].name.localeCompare(BYID[b.facility_id].name); });
      if (!list.length) return '<tr><td colspan="4"><strong>' + esc(t('empty.forecast.h')) + '</strong><br><span class="muted">' + esc(t('empty.forecast.p')) + '</span> <button type="button" class="chip" id="fall">' + esc(t('empty.forecast.go')) + '</button></td></tr>';
      return list.map(function (i) {
        var h = BYID[i.facility_id], m = h.months[LATEST];
        return '<tr><th scope="row"><a href="#/hospital/' + encodeURIComponent(h.id) + '">' + esc(h.name) + '</a></th><td class="num">' + (m ? num(m.over_min, 1) : '—') + '</td><td class="num">' + Math.round(i.p_stays_listed * 100) + '%</td><td>' +
          i.reasons.map(function (x) { return esc(t('forecast.driver.' + x.feature)) + ' ' + esc(t('forecast.' + x.push)); }).join('; ') + '</td></tr>';
      }).join('');
    }
    appEl.innerHTML = '<h1 id="h1" tabindex="-1">' + esc(t('forecast.h')) + '</h1><p class="lead">' + esc(t('forecast.lead')) + '</p>' +
      '<div class="callout caution"><strong>' + esc(t(verdict)) + '</strong></div>' +
      '<h2>' + esc(t('forecast.question')) + '</h2><p>' + esc(t('forecast.question.body')) + '</p>' +
      '<div class="tablewrap"><table><caption>' + esc(t('forecast.table', { test: FC.test_months.map(function (m) { return monthLabel(m); }).join(', ') })) + '</caption><thead><tr><th scope="col">' + esc(t('forecast.col.method')) + '</th><th scope="col" class="num">' + esc(t('forecast.col.acc')) + '</th><th scope="col" class="num">' + esc(t('forecast.col.auc')) + '</th><th scope="col" class="num">' + esc(t('forecast.col.brier')) + '</th></tr></thead><tbody>' +
      '<tr><th scope="row">' + esc(t('forecast.m.persist')) + '</th><td class="num">' + f3(c.persistence.accuracy) + '</td><td class="num">' + f3(c.persistence.auc) + '</td><td class="num">' + f3(c.brier_persistence) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('forecast.m.thresh')) + '</th><td class="num">' + f3(c.threshold.accuracy) + '</td><td class="num">' + f3(c.threshold.auc) + '</td><td class="num">—</td></tr>' +
      '<tr><th scope="row">' + esc(t('forecast.m.logit')) + '</th><td class="num">' + f3(c.logistic.accuracy) + '</td><td class="num">' + f3(c.logistic.auc) + '</td><td class="num">' + f3(c.logistic.brier) + '</td></tr></tbody></table></div>' +
      (r ? '<div class="tablewrap" style="margin-top:1rem"><table><caption>' + esc(t('forecast.minutes')) + '</caption><tbody>' +
        '<tr><th scope="row">' + esc(t('forecast.m.persist2')) + '</th><td class="num">' + num(r.persistence_mae, 2) + ' ' + esc(t('minutes.unit')) + '</td></tr>' +
        '<tr><th scope="row">' + esc(t('forecast.m.trend')) + '</th><td class="num">' + num(r.trend_mae, 2) + ' ' + esc(t('minutes.unit')) + '</td></tr>' +
        '<tr><th scope="row">' + esc(t('forecast.m.ridge')) + '</th><td class="num">' + num(r.ridge_mae, 2) + ' ' + esc(t('minutes.unit')) + '</td></tr></tbody></table></div>' : '') +
      '<h2>' + esc(t('forecast.calib')) + '</h2><p class="small">' + esc(t('forecast.calib.body')) + '</p><div class="tablewrap"><table><thead><tr><th scope="col">' + esc(t('forecast.calib.col')) + '</th><th scope="col" class="num">' + esc(t('forecast.calib.n')) + '</th><th scope="col" class="num">' + esc(t('forecast.calib.pred')) + '</th><th scope="col" class="num">' + esc(t('forecast.calib.act')) + '</th></tr></thead><tbody>' +
      FC.calibration.map(function (b) { return '<tr><th scope="row">' + esc(b.bin.replace('(-0.001,', '[0,')) + '</th><td class="num">' + b.n + '</td><td class="num">' + num(b.predicted, 2) + '</td><td class="num">' + num(b.actual, 2) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h2>' + esc(t('forecast.limits')) + '</h2><ul>' + raw('forecast.limits.items').map(function (s) { return '<li>' + esc(fill(s, { months: META.months.length })) + '</li>'; }).join('') + '</ul>' +
      '<h2>' + esc(t('forecast.list')) + '</h2><p class="small">' + esc(t('forecast.for', { month: monthLabel(FC.forecast.for_month), based: monthLabel(FC.forecast.based_on) })) + '</p>' +
      '<div class="row"><div><label for="ff">' + esc(t('forecast.filter')) + '</label><br><select id="ff"><option value="home"' + (showAll ? ' disabled' : ' selected') + '>' + esc(t('forecast.filter.home', { d: HOME })) + '</option><option value="all"' + (showAll ? ' selected' : '') + '>' + esc(t('forecast.filter.all')) + '</option></select></div><button type="button" id="fcsv">' + esc(t('forecast.csv')) + '</button></div>' +
      '<div class="tablewrap"><table><caption class="sr">' + esc(t('forecast.list')) + '</caption><thead><tr><th scope="col">' + esc(t('forecast.col.hospital')) + '</th><th scope="col" class="num">' + esc(t('forecast.col.over', { month: monthLabel(LATEST) })) + '</th><th scope="col" class="num">' + esc(t('forecast.col.prob')) + '</th><th scope="col">' + esc(t('forecast.col.drivers')) + '</th></tr></thead><tbody id="ftb">' + rowsFor(showAll ? items : homeItems) + '</tbody></table></div>';
    function paint(all) { $('#ftb').innerHTML = rowsFor(all ? items : homeItems); var b = $('#fall'); if (b) b.onclick = function () { $('#ff').value = 'all'; paint(true); }; }
    $('#ff').onchange = function () { paint(this.value === 'all'); };
    paint(showAll);
    $('#fcsv').onclick = function () {
      var rows = [['facility_id', 'hospital', 'district', 'based_on_month', 'forecast_for_month', 'minutes_over_target', 'experimental_p_stays_listed', 'experimental_minutes_over_next_month']];
      items.forEach(function (i) {
        var h = BYID[i.facility_id], m = h.months[LATEST];
        rows.push([h.id, h.name, h.district || '', FC.forecast.based_on, FC.forecast.for_month, m ? m.over_min : '', i.p_stays_listed, i.pred_over_min]);
      });
      downloadCsv('offloadwatch-forecast.csv', rows);
    };
  }

  function viewMethods() {
    var secs = raw('methods.sections');
    appEl.innerHTML = '<div class="prose"><h1 id="h1" tabindex="-1">' + esc(t('methods.h')) + '</h1>' +
      '<div class="callout"><h2 class="h3">' + esc(t('methods.short.h')) + '</h2><ul>' + raw('methods.short').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      secs.map(function (s) { return '<h2>' + esc(s.h) + '</h2>' + s.p.map(function (p) { return '<p>' + p + '</p>'; }).join(''); }).join('') +
      '<p><a href="' + REPO + '/issues" rel="noopener">' + esc(t('methods.issues')) + '</a> &middot; <a href="' + META.report_page + '" rel="noopener">' + esc(t('methods.emsa')) + '</a></p>' +
      '<h2>' + esc(t('methods.downloads')) + '</h2><ul>' +
      [['data/offloads.csv', 'methods.dl.offloads'], ['data/forecast.json', 'methods.dl.forecast'], ['data/hospitals.json', 'methods.dl.hospitals'], ['data/districts.json', 'methods.dl.districts'], ['data/clinics.json', 'methods.dl.clinics']].map(function (x) {
        return '<li><a href="' + x[0] + '" download>' + esc(t(x[1])) + '</a></li>';
      }).join('') + '</ul></div>';
  }

  function viewAbout() {
    var story = t('about.story');
    appEl.innerHTML = '<h1 id="h1" tabindex="-1">' + esc(t('about.h')) + '</h1><p class="lead">' + esc(t('about.lead')) + '</p><p>' + esc(t('about.who')) + '</p>' +
      '<div class="grid c2 ps"><div class="card"><h2 class="h3">' + esc(t('ps.problem.h')) + '</h2><p>' + esc(t('ps.problem')) + '</p></div><div class="card"><h2 class="h3">' + esc(t('ps.solution.h')) + '</h2><p>' + esc(t('ps.solution')) + '</p></div></div>' +
      (story ? '<h2>' + esc(t('about.story.h')) + '</h2><p>' + esc(story) + '</p>' : '') +
      '<h2>' + esc(t('about.why.h')) + '</h2><p>' + esc(t('about.why')) + '</p>' +
      '<h2>' + esc(t('about.modes.h')) + '</h2><ul>' + raw('about.modes').map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' +
      '<h2>' + esc(t('about.tools.h')) + '</h2><p>' + esc(t('about.tools')) + '</p>' +
      (lang === 'es' ? '<p class="callout caution">' + esc(t('about.translation')) + '</p>' : '') +
      '<p><a href="' + REPO + '" rel="noopener">' + esc(t('about.code')) + '</a></p>';
  }

  /* ---------- router ---------- */
  function parse() {
    var h = location.hash || '#/';
    var qs = {}, parts = h.split('?');
    if (parts[1]) parts[1].split('&').forEach(function (kv) { var p = kv.split('='); qs[p[0]] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    var segs = parts[0].replace(/^#\/?/, '').split('/');
    return { name: segs[0] || 'home', arg: segs[1] ? decodeURIComponent(segs[1]) : '', qs: qs };
  }
  function route(keepScroll) {
    var r = parse();
    current.base = r.name === 'home' ? '#/' : '#/' + r.name;
    chrome();
    destroyMap();
    var title = t('app.title');
    mainEl.innerHTML = '<p class="datanote">' + esc(t('fresh.short', { month: monthLabel(LATEST) })) + ' <a href="#/methods">' + esc(t('fresh.about')) + '</a></p>';
    appEl = document.createElement('div'); appEl.className = 'view'; mainEl.appendChild(appEl);
    try {
      if (r.name === 'near') viewNear(r.qs);
      else if (r.name === 'hospital') viewHospital(r.arg);
      else if (r.name === 'district') viewDistrict(r.arg);
      else if (r.name === 'compare') viewCompare();
      else if (r.name === 'forecast') viewForecast();
      else if (r.name === 'methods') viewMethods();
      else if (r.name === 'about') viewAbout();
      else if (r.name === 'home') viewHome();
      else appEl.innerHTML = '<p>' + esc(t('notfound')) + '</p><p><a href="#/">' + esc(t('back.map')) + '</a></p>';
    } catch (e) {
      appEl.innerHTML = '<p>' + esc(t('error.data')) + '</p>';
      if (window.console) console.error(e);
    }
    $all('.chartdata').forEach(function (w) {
      var d = document.createElement('details'), sm = document.createElement('summary');
      sm.textContent = t('details.table'); w.parentNode.insertBefore(d, w); d.appendChild(sm); d.appendChild(w);
    });
    $all('.tablewrap').forEach(function (w) {
      var cap = $('caption', w), prev = w.previousElementSibling;
      w.tabIndex = 0; w.setAttribute('role', 'region');
      w.setAttribute('aria-label', cap ? cap.textContent : (prev && /^H[1-3]$/.test(prev.tagName) ? prev.textContent : t('detail.table')));
    });
    var h1 = $('#h1');
    if (r.name !== 'hospital' && r.name !== 'district') document.title = (h1 ? h1.textContent + ' - ' : '') + title;
    if (!keepScroll) { window.scrollTo(0, 0); if (h1) h1.focus({ preventScroll: true }); }
  }
  window.addEventListener('beforeprint', function () { $all('details').forEach(function (d) { d.open = true; }); });
  window.addEventListener('hashchange', function () { route(); });
  route();
})();
