/* util.js — small helpers. Deliberately ES5: the PocketBook browser is old. */
var U = (function () {

  function $(sel, root) { return (root || document).querySelector(sel); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.appendChild(document.createTextNode(String(text))); }
    return n;
  }

  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

  function setText(node, text) {
    if (!node) { return; }
    clear(node);
    node.appendChild(document.createTextNode(String(text)));
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function num(v, d) {
    if (v === null || v === undefined || isNaN(v)) { return null; }
    var p = Math.pow(10, d || 0);
    return Math.round(Number(v) * p) / p;
  }

  function fmt(v, d, dash) {
    var n = num(v, d);
    if (n === null) { return dash || '—'; }
    return d ? n.toFixed(d) : String(n);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* JSON over XHR: fetch is missing on old browsers, XHR is everywhere. */
  function getJSON(url, ok, fail) {
    var x = new XMLHttpRequest();
    var done = false;
    x.open('GET', url, true);
    x.timeout = 20000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || done) { return; }
      done = true;
      if (x.status >= 200 && x.status < 300) {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
        if (data) { ok(data); } else if (fail) { fail('bad-json'); }
      } else if (fail) {
        fail('http-' + x.status);
      }
    };
    x.ontimeout = function () { if (!done) { done = true; if (fail) { fail('timeout'); } } };
    x.onerror = function () { if (!done) { done = true; if (fail) { fail('network'); } } };
    try { x.send(null); } catch (e) { if (fail) { fail('send'); } }
  }

  /* Value of an hourly series at the most recent past hour. */
  function hourlyNow(times, values, nowIso) {
    if (!times || !values) { return null; }
    var idx = -1, i;
    for (i = 0; i < times.length; i++) {
      if (times[i] <= nowIso) { idx = i; } else { break; }
    }
    if (idx < 0) { idx = 0; }
    var v = values[idx];
    return (v === null || v === undefined) ? null : v;
  }

  function isoLocalHour(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
           'T' + pad2(d.getHours()) + ':00';
  }

  function agoText(ts) {
    if (!ts) { return I18N.t('time.never'); }
    var min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) { return I18N.t('time.justNow'); }
    if (min < 60) { return I18N.t('time.minutes', { n: min }); }
    var h = Math.floor(min / 60);
    if (h < 24) { return I18N.t('time.hours', { n: h }); }
    return I18N.t('time.days', { n: Math.floor(h / 24) });
  }

  function dateText(d) {
    return I18N.t('date.format', {
      day: d.getDate(),
      month: I18N.list('date.months')[d.getMonth()],
      weekday: I18N.list('date.weekdays')[d.getDay()]
    });
  }

  function wmoText(code) {
    if (code === null || code === undefined) { return '—'; }
    var key = 'wmo.' + code;
    var text = I18N.t(key);
    return text === key ? I18N.t('wmo.unknown', { code: code }) : text;
  }

  function windDir(deg) {
    if (deg === null || deg === undefined) { return ''; }
    return I18N.list('compass.points')[Math.round(deg / 45) % 8];
  }

  return {
    $: $, el: el, clear: clear, setText: setText, clamp: clamp, num: num, fmt: fmt, pad2: pad2,
    getJSON: getJSON, hourlyNow: hourlyNow, isoLocalHour: isoLocalHour,
    agoText: agoText, dateText: dateText, wmoText: wmoText, windDir: windDir
  };
})();
