/* app.js — сборка экрана, часы, расписание обновлений, фоновая работа. */
(function () {

  var THEMES = [
    { id: 'eink',  name: 'E-Ink',     color: '#ffffff' },
    { id: 'night', name: 'Тёмный',    color: '#0b0f14' },
    { id: 'paper', name: 'Аналитика', color: '#f6f3ec' }
  ];

  var S = Store.load();
  var demoMode = /[?&]demo=1/.test(location.search);
  var wakeLock = null;
  var refreshing = false;

  /* ---------- тема ---------- */

  function themeIndex(id) {
    for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) { return i; } }
    return 0;
  }

  function applyTheme(id) {
    var t = THEMES[themeIndex(id)];
    document.body.setAttribute('data-theme', t.id);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { meta.setAttribute('content', t.color); }
    U.$('#btn-theme').firstChild.nodeValue = 'Дизайн: ' + t.name;
    Store.set({ theme: t.id });
  }

  function nextTheme() {
    applyTheme(THEMES[(themeIndex(S.theme) + 1) % THEMES.length].id);
  }

  /* ---------- часы ---------- */

  function tickClock() {
    var d = new Date();
    U.$('#clock').firstChild.nodeValue = U.pad2(d.getHours()) + ':' + U.pad2(d.getMinutes());
    U.$('#date').firstChild.nodeValue = U.dateText(d);
    U.$('#updated').firstChild.nodeValue = U.agoText(S.lastTs);
    /* ровно на границе минуты, без дрейфа */
    var ms = 60000 - (d.getSeconds() * 1000 + d.getMilliseconds());
    setTimeout(tickClock, ms + 30);
  }

  /* ---------- карточки ---------- */

  function mmHg(hpa) { return Math.round(hpa * 0.750062); }

  function trendText(t) {
    if (t === null) { return ''; }
    if (t > 1.5) { return 'растёт быстро ' + fmtSigned(t); }
    if (t > 0.4) { return 'растёт ' + fmtSigned(t); }
    if (t < -1.5) { return 'падает быстро ' + fmtSigned(t); }
    if (t < -0.4) { return 'падает ' + fmtSigned(t); }
    return 'ровно ' + fmtSigned(t);
  }
  function fmtSigned(v) { return (v > 0 ? '+' : '') + v.toFixed(1) + ' гПа/3ч'; }

  function whyNote(res, good) {
    if (!res) { return ''; }
    if (!res.why.length) { return good; }
    return 'минусы: ' + res.why.join(', ');
  }

  function render(w) {
    var host = U.$('#cards');
    U.clear(host);
    if (!w) {
      host.appendChild(U.el('p', 'empty', 'Нет данных. Нажмите «Обновить» или выберите место.'));
      return;
    }

    U.$('#cond').firstChild.nodeValue = U.wmoText(w.code);

    /* 1. Температура */
    var tempNote = 'ощущается ' + U.fmt(w.feels, 1) + '°';
    if (w.tMin !== null && w.tMax !== null) {
      tempNote += ' · сегодня ' + U.fmt(w.tMin, 0) + '…' + U.fmt(w.tMax, 0) + '°';
    }
    var tempCard = Scale.card({ key: 'temp', spec: Metrics.SPEC.temp, value: w.temp, note: tempNote });
    if (w.tempSeries && w.tempSeries.length) {
      tempCard.appendChild(Scale.sparkBars(w.tempSeries, Metrics.SPEC.temp));
      tempCard.appendChild(U.el('div', 'spark-cap', 'температура, ближайшие 24 ч'));
    }
    host.appendChild(tempCard);

    /* 2. Ветер */
    var windNote = 'порывы ' + U.fmt(w.gust, 1) + ' м/с';
    if (w.windDir !== null) { windNote += ' · ' + U.windDir(w.windDir) + ' (' + U.fmt(w.windDir, 0) + '°)'; }
    host.appendChild(Scale.card({ key: 'wind', spec: Metrics.SPEC.wind, value: w.wind, note: windNote }));

    /* 3. Осадки */
    var rainNote = 'вероятность ' + (w.rainProb === null ? '—' : U.fmt(w.rainProb, 0) + '%');
    if (w.rainSum !== null) { rainNote += ' · за сутки ' + U.fmt(w.rainSum, 1) + ' мм'; }
    var rainCard = Scale.card({ key: 'rain', spec: Metrics.SPEC.rain, value: w.rain, note: rainNote });
    if (w.rainSeries && w.rainSeries.length) {
      rainCard.appendChild(Scale.sparkBars(w.rainSeries, Metrics.SPEC.rain));
      rainCard.appendChild(U.el('div', 'spark-cap', 'осадки, ближайшие 24 ч'));
    }
    host.appendChild(rainCard);

    /* 4. Облачность */
    host.appendChild(Scale.card({
      key: 'clouds', spec: Metrics.SPEC.clouds, value: w.clouds, note: U.wmoText(w.code)
    }));

    /* 5. УФ */
    host.appendChild(Scale.card({
      key: 'uv', spec: Metrics.SPEC.uv, value: w.uv,
      note: (w.uvMax === null ? 'защита нужна с УФ 3' : 'максимум сегодня ' + U.fmt(w.uvMax, 1))
    }));

    /* 6. Влажность */
    host.appendChild(Scale.card({
      key: 'humidity', spec: Metrics.SPEC.humidity, value: w.humidity, note: 'комфортный коридор 40–60%'
    }));

    /* 7. Давление + барограмма */
    var pNote = (w.pressure === null ? '' : mmHg(w.pressure) + ' мм рт. ст.');
    if (w.pressureTrend3h !== null) { pNote += ' · ' + trendText(w.pressureTrend3h); }
    var pCard = Scale.card({ key: 'pressure', spec: Metrics.SPEC.pressure, value: w.pressure, note: pNote });
    if (w.pressureSeries && w.pressureSeries.length) {
      pCard.appendChild(Scale.sparkBars(w.pressureSeries, Metrics.SPEC.pressure));
      pCard.appendChild(U.el('div', 'spark-cap', 'барограмма, прошедшие 24 ч'));
    }
    host.appendChild(pCard);

    /* 8. Волны */
    var waveNote = w.sea
      ? ('период ' + U.fmt(w.wavePeriod, 1) + ' с · вода ' + U.fmt(w.seaTemp, 1) + '°')
      : 'морских данных для этой точки нет';
    host.appendChild(Scale.card({ key: 'waves', spec: Metrics.SPEC.waves, value: w.waveHeight, note: waveNote }));

    /* 9. Снорклинг */
    var sn = Metrics.snorkel(w);
    host.appendChild(Scale.card({
      key: 'snorkel', spec: Metrics.SPEC.snorkel, value: sn ? sn.value : null,
      badge: 'индекс',
      note: sn ? whyNote(sn, 'условия без замечаний') : 'нужны данные о море'
    }));

    /* 10. Велосипед */
    var bk = Metrics.bike(w);
    host.appendChild(Scale.card({
      key: 'bike', spec: Metrics.SPEC.bike, value: bk ? bk.value : null,
      badge: 'индекс',
      note: bk ? whyNote(bk, 'условия без замечаний') : 'нет данных'
    }));
  }

  /* ---------- данные ---------- */

  function setStatus(text) { U.$('#status').firstChild.nodeValue = text; }
  function setHint(text) { U.$('#hint').innerHTML = ''; U.$('#hint').appendChild(document.createTextNode(text)); }

  function refresh() {
    if (refreshing) { return; }
    if (demoMode) {
      var d = Weather.demo();
      Store.set({ lastData: d, lastTs: d.ts });
      render(d); setStatus('Демо-данные, сеть не используется.');
      U.$('#updated').firstChild.nodeValue = U.agoText(S.lastTs);
      return;
    }
    if (S.lat === null || S.lon === null) { setStatus('Место не выбрано — откройте «Место».'); return; }
    refreshing = true;
    setStatus('Обновляем…');
    Weather.load(S.lat, S.lon, function (w) {
      refreshing = false;
      Store.set({ lastData: w, lastTs: w.ts });
      render(w);
      U.$('#updated').firstChild.nodeValue = U.agoText(S.lastTs);
      setStatus('Данные Open-Meteo · следующее обновление в начале часа');
      pushConfigToSW();
    }, function (err) {
      refreshing = false;
      setStatus('Не вышло обновить (' + err + '), показаны последние данные');
    });
  }

  function setPlace(lat, lon, name) {
    Store.set({ lat: lat, lon: lon, place: name || (U.fmt(lat, 2) + ', ' + U.fmt(lon, 2)) });
    U.$('#place').firstChild.nodeValue = S.place;
    refresh();
  }

  /* ---------- расписание ---------- */

  /* Раз в час, ровно после начала часа: данные Open-Meteo обновляются почасово. */
  function scheduleHourly() {
    var now = new Date();
    var ms = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 + 20000;
    setTimeout(function () {
      refresh();
      scheduleHourly();
    }, ms);
  }

  /* ---------- фон и экран ---------- */

  function pushConfigToSW() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { return; }
    if (S.lat === null) { return; }
    navigator.serviceWorker.controller.postMessage({
      type: 'config',
      forecast: Weather.forecastUrl(S.lat, S.lon),
      place: S.place,
      notify: !!S.bg
    });
  }

  function updateWakeBtn() {
    U.$('#btn-wake').firstChild.nodeValue = 'Фоновое обновление: ' + (S.bg ? 'вкл' : 'выкл');
  }

  function toggleBackground() {
    if (S.bg) {
      Store.set({ bg: false }); updateWakeBtn(); pushConfigToSW();
      setHint('Фоновые уведомления выключены.');
      return;
    }
    var enable = function () {
      Store.set({ bg: true }); updateWakeBtn(); pushConfigToSW();
      registerPeriodicSync();
    };
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission(function (p) {
        if (p === 'granted') { enable(); } else { setHint('Без разрешения на уведомления разбудить экран нельзя.'); }
      });
    } else if (window.Notification && Notification.permission === 'granted') {
      enable();
    } else {
      enable();
      setHint('Уведомления недоступны: обновление будет идти, пока приложение открыто.');
    }
  }

  function registerPeriodicSync() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.ready) {
      setHint('Service Worker недоступен: держите приложение открытым, оно обновится само.');
      return;
    }
    navigator.serviceWorker.ready.then(function (reg) {
      if (!reg.periodicSync) {
        setHint('Фоновая синхронизация не поддерживается браузером. Пока приложение открыто, обновление идёт раз в час.');
        return;
      }
      var go = function () {
        reg.periodicSync.register('barogram-hourly', { minInterval: 60 * 60 * 1000 }).then(function () {
          setHint('Фоновое обновление раз в час включено.');
        }, function (e) {
          setHint('Браузер отклонил фоновую синхронизацию: ' + e);
        });
      };
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'periodic-background-sync' }).then(function (st) {
          if (st.state === 'granted') { go(); }
          else { setHint('Разрешите «периодическую фоновую синхронизацию» для установленного приложения.'); go(); }
        }, go);
      } else { go(); }
    });
  }

  function toggleScreen() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) {}
      wakeLock = null;
      Store.set({ screen: false });
      U.$('#btn-screen').firstChild.nodeValue = 'Не гасить экран: выкл';
      return;
    }
    if (!navigator.wakeLock) { setHint('Wake Lock не поддерживается этим браузером.'); return; }
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      Store.set({ screen: true });
      U.$('#btn-screen').firstChild.nodeValue = 'Не гасить экран: вкл';
      lock.addEventListener('release', function () { wakeLock = null; });
    }, function (e) { setHint('Wake Lock отклонён: ' + e); });
  }

  /* ---------- место ---------- */

  function doGeo() {
    if (!navigator.geolocation) { setHint('Геолокация недоступна, найдите город по названию.'); return; }
    setHint('Определяем координаты…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      setPlace(U.num(pos.coords.latitude, 4), U.num(pos.coords.longitude, 4), '');
      setHint('Координаты получены.');
    }, function (e) {
      setHint('Не удалось определить место (' + (e && e.message ? e.message : 'ошибка') + ').');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  function doCitySearch() {
    var name = U.$('#city-input').value;
    if (!name || name.length < 2) { setHint('Введите название города.'); return; }
    setHint('Ищем…');
    Weather.searchCity(name, function (list) {
      var ul = U.$('#found');
      U.clear(ul);
      if (!list.length) { setHint('Ничего не найдено.'); return; }
      setHint('Выберите город:');
      for (var i = 0; i < list.length; i++) {
        (function (r) {
          var li = U.el('li', 'found-item');
          var b = U.el('button', 'btn btn-found',
            r.name + (r.admin1 ? ', ' + r.admin1 : '') + (r.country ? ' · ' + r.country : ''));
          b.type = 'button';
          b.onclick = function () {
            setPlace(U.num(r.latitude, 4), U.num(r.longitude, 4), r.name);
            U.clear(ul); setHint('Место: ' + r.name);
            U.$('#panel').hidden = true;
          };
          li.appendChild(b);
          ul.appendChild(li);
        })(list[i]);
      }
    }, function (e) { setHint('Поиск не удался: ' + e); });
  }

  /* ---------- старт ---------- */

  function boot() {
    var qTheme = /[?&]theme=([a-z]+)/.exec(location.search);
    applyTheme(qTheme ? qTheme[1] : S.theme);
    tickClock();

    U.$('#place').firstChild.nodeValue = S.place || (demoMode ? 'Демо-режим' : 'Место не выбрано');
    updateWakeBtn();
    Store.set({ screen: false }); /* Wake Lock переживает только текущую сессию */

    if (S.lastData) { render(S.lastData); }
    else { render(null); }

    U.$('#btn-theme').onclick = nextTheme;
    U.$('#btn-refresh').onclick = refresh;
    U.$('#btn-settings').onclick = function () {
      var p = U.$('#panel');
      p.hidden = !p.hidden;
    };
    U.$('#btn-geo').onclick = doGeo;
    U.$('#btn-city').onclick = doCitySearch;
    U.$('#city-input').onkeydown = function (e) { if (e.keyCode === 13) { doCitySearch(); } };
    U.$('#btn-wake').onclick = toggleBackground;
    U.$('#btn-screen').onclick = toggleScreen;

    if (demoMode) { refresh(); }
    else if (S.lat !== null) { refresh(); }
    else { U.$('#panel').hidden = false; setHint('Выберите место: кнопка ниже или поиск по названию.'); }

    scheduleHourly();

    /* вернулись к приложению — подтягиваем свежее, если данные старше получаса */
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
          U.$('#updated').firstChild.nodeValue = U.agoText(S.lastTs);
          if (Date.now() - S.lastTs > 30 * 60 * 1000) { refresh(); }
        }
      }, false);
    }

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('sw.js').then(function () {
        navigator.serviceWorker.ready.then(function () { setTimeout(pushConfigToSW, 500); });
      }, function () {});
      /* Service Worker обновился в фоне — перечитываем (ответ уже в кеше). */
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev.data && ev.data.type === 'sw-refreshed') { refresh(); }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else { boot(); }
})();
