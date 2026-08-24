/* util.js — мелкие помощники. Специально ES5: браузер PocketBook старый. */
var U = (function () {

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.appendChild(document.createTextNode(String(text))); }
    return n;
  }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

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

  /* JSON через XHR: fetch есть не везде, XHR есть везде. */
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

  /* Значение из массива hourly по ближайшему прошедшему часу. */
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
    if (!ts) { return 'нет данных'; }
    var min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) { return 'обновлено только что'; }
    if (min < 60) { return 'обновлено ' + min + ' мин назад'; }
    var h = Math.floor(min / 60);
    if (h < 24) { return 'обновлено ' + h + ' ч назад'; }
    return 'обновлено ' + Math.floor(h / 24) + ' дн назад';
  }

  var WEEK = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
             'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function dateText(d) { return d.getDate() + ' ' + MON[d.getMonth()] + ', ' + WEEK[d.getDay()]; }

  var WMO = {
    0: 'Ясно', 1: 'Малооблачно', 2: 'Переменная облачность', 3: 'Пасмурно',
    45: 'Туман', 48: 'Изморозь', 51: 'Морось слабая', 53: 'Морось', 55: 'Морось сильная',
    56: 'Ледяная морось', 57: 'Ледяная морось', 61: 'Дождь слабый', 63: 'Дождь', 65: 'Ливень',
    66: 'Ледяной дождь', 67: 'Ледяной дождь', 71: 'Снег слабый', 73: 'Снег', 75: 'Снегопад',
    77: 'Снежная крупа', 80: 'Ливни местами', 81: 'Ливни', 82: 'Сильные ливни',
    85: 'Снежные заряды', 86: 'Снежные заряды', 95: 'Гроза', 96: 'Гроза с градом', 99: 'Гроза с градом'
  };
  function wmoText(code) {
    if (code === null || code === undefined) { return '—'; }
    return WMO[code] || ('код ' + code);
  }

  function windDir(deg) {
    if (deg === null || deg === undefined) { return ''; }
    var names = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return names[Math.round(deg / 45) % 8];
  }

  return {
    $: $, el: el, clear: clear, clamp: clamp, num: num, fmt: fmt, pad2: pad2,
    getJSON: getJSON, hourlyNow: hourlyNow, isoLocalHour: isoLocalHour,
    agoText: agoText, dateText: dateText, wmoText: wmoText, windDir: windDir
  };
})();
