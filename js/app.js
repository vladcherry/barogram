/* app.js — screen composition, clock, refresh schedule and background work. */
(function () {

  var THEMES = [
    { id: 'eink',  name: 'theme.eink',  color: '#ffffff' },
    { id: 'tiles', name: 'theme.tiles', color: '#ffffff' },
    { id: 'night', name: 'theme.night', color: '#0b0f14' },
    { id: 'paper', name: 'theme.paper', color: '#f6f3ec' }
  ];

  var HOUR = 60 * 60 * 1000;
  /* Shown in the Place panel: on a full-screen browser it is the only way to
     tell whether a new build actually arrived. Bump it with every release. */
  var APP_VERSION = '2026.08.29-3';

  var settings = Store.load();
  var demoMode = /[?&]demo=1/.test(location.search);
  var screenLock = null;
  var refreshing = false;

  /* ---------- theme ---------- */

  function themeIndex(id) {
    for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) { return i; } }
    return 0;
  }

  /* Icon buttons have no text, so their label goes into title and aria-label. */
  function setLabel(node, text) {
    if (!node) { return; }
    node.setAttribute('title', text);
    node.setAttribute('aria-label', text);
  }

  function applyTheme(id) {
    var theme = THEMES[themeIndex(id)];
    document.body.setAttribute('data-theme', theme.id);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { meta.setAttribute('content', theme.color); }
    Store.set({ theme: theme.id });
    markActiveTheme();
  }

  /* One button per design, the current one marked — on e-ink picking directly
     beats cycling through four full-screen repaints. */
  function buildDesignRow() {
    var row = U.$('#design-row');
    if (!row) { return; }
    U.clear(row);
    row.appendChild(U.el('span', 'menu-label', I18N.t('ui.designs')));
    for (var i = 0; i < THEMES.length; i++) {
      row.appendChild(designButton(THEMES[i]));
    }
    markActiveTheme();
  }

  function designButton(theme) {
    var button = U.el('button', 'btn btn-design', I18N.t(theme.name));
    button.type = 'button';
    button.setAttribute('data-theme-id', theme.id);
    button.onclick = function () {
      applyTheme(theme.id);
      closeMenu();
    };
    return button;
  }

  function markActiveTheme() {
    var buttons = document.querySelectorAll('.btn-design');
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i].getAttribute('data-theme-id') === settings.theme;
      buttons[i].className = 'btn btn-design' + (active ? ' is-active' : '');
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  /* ---------- menu ---------- */

  function setMenu(open) {
    U.$('#panel').hidden = !open;
    U.$('#btn-menu').setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMenu() { setMenu(U.$('#panel').hidden); }
  function closeMenu() { setMenu(false); }

  /* ---------- language ---------- */

  function applyLanguage(lang) {
    var active = I18N.use(lang);
    Store.set({ lang: active });
    document.documentElement.setAttribute('lang', active);
    document.title = I18N.t('app.title');
    translateStaticText();
    applyTheme(settings.theme);
    updateBackgroundButton();
    updateScreenButton();
    U.setText(U.$('#btn-language'), I18N.t('ui.language', { name: I18N.t('lang.' + active) }));
    buildDesignRow();
    U.setText(U.$('#version'), I18N.t('ui.version', { v: APP_VERSION }));
    U.setText(U.$('#place'), settings.place || I18N.t(demoMode ? 'ui.demoPlace' : 'ui.noPlace'));
    U.setText(U.$('#date'), U.dateText(new Date()));
    U.setText(U.$('#updated'), U.agoText(settings.lastTs));
    render(settings.lastData);
    refreshStatus();
    pushConfigToWorker();
  }

  /* The footer line describes the current state, so it is rebuilt, not translated. */
  function refreshStatus() {
    if (demoMode) { setStatus(I18N.t('status.demo')); }
    else if (settings.lat === null) { setStatus(I18N.t('status.noPlace')); }
    else if (settings.lastTs) { setStatus(I18N.t('status.ok')); }
    else { setStatus(I18N.t('status.initial')); }
  }

  /* Static labels carry data-i18n keys, so one pass retranslates the shell. */
  function translateStaticText() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      U.setText(nodes[i], I18N.t(nodes[i].getAttribute('data-i18n')));
    }
    var labelled = document.querySelectorAll('[data-i18n-label]');
    for (i = 0; i < labelled.length; i++) {
      setLabel(labelled[i], I18N.t(labelled[i].getAttribute('data-i18n-label')));
    }
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (i = 0; i < placeholders.length; i++) {
      placeholders[i].setAttribute('placeholder', I18N.t(placeholders[i].getAttribute('data-i18n-placeholder')));
    }
  }

  /* ---------- clock ---------- */

  function tickClock() {
    var now = new Date();
    U.setText(U.$('#clock'), U.pad2(now.getHours()) + ':' + U.pad2(now.getMinutes()));
    U.setText(U.$('#date'), U.dateText(now));
    U.setText(U.$('#updated'), U.agoText(settings.lastTs));
    /* land exactly on the minute boundary instead of drifting by 60 s steps */
    var ms = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    setTimeout(tickClock, ms + 30);
  }

  /* ---------- cards ---------- */

  function toMmHg(hpa) { return Math.round(hpa * 0.750062); }

  function trendText(delta) {
    var v = (delta > 0 ? '+' : '') + delta.toFixed(1) + ' ' + I18N.t('trend.unit');
    if (delta > 1.5) { return I18N.t('trend.riseFast', { v: v }); }
    if (delta > 0.4) { return I18N.t('trend.rise', { v: v }); }
    if (delta < -1.5) { return I18N.t('trend.fallFast', { v: v }); }
    if (delta < -0.4) { return I18N.t('trend.fall', { v: v }); }
    return I18N.t('trend.steady', { v: v });
  }

  function whyNote(index) {
    if (!index) { return I18N.t('note.noData'); }
    if (!index.why.length) { return I18N.t('note.noIssues'); }
    var parts = [];
    for (var i = 0; i < index.why.length; i++) {
      parts.push(I18N.t(index.why[i].key, index.why[i].params));
    }
    return I18N.t('note.why', { list: parts.join(', ') });
  }

  function appendSpark(card, values, spec, captionKey) {
    if (!values || !values.length) { return; }
    var spark = Scale.sparkBars(values, spec, I18N.t(captionKey));
    if (spark) { card.appendChild(spark); }
  }

  function render(w) {
    var host = U.$('#cards');
    if (!host) { return; }
    U.clear(host);

    if (!w) {
      host.appendChild(U.el('p', 'empty', I18N.t('ui.noData')));
      U.setText(U.$('#cond'), ' ');
      return;
    }

    U.setText(U.$('#cond'), U.wmoText(w.code));

    /* 1. Temperature */
    var tempNote = (w.tempMin !== null && w.tempMax !== null)
      ? I18N.t('note.tempRange', {
          feels: U.fmt(w.feels, 1), min: U.fmt(w.tempMin, 0), max: U.fmt(w.tempMax, 0)
        })
      : I18N.t('note.temp', { feels: U.fmt(w.feels, 1) });
    var tempCard = Scale.card({ key: 'temp', spec: Metrics.SPEC.temp, value: w.temp, note: tempNote });
    appendSpark(tempCard, w.tempSeries, Metrics.SPEC.temp, 'spark.temp');
    host.appendChild(tempCard);

    /* 2. Wind */
    var windNote = (w.windDir !== null)
      ? I18N.t('note.windDir', {
          gust: U.fmt(w.gust, 1), dir: U.windDir(w.windDir), deg: U.fmt(w.windDir, 0)
        })
      : I18N.t('note.wind', { gust: U.fmt(w.gust, 1) });
    host.appendChild(Scale.card({ key: 'wind', spec: Metrics.SPEC.wind, value: w.wind, note: windNote }));

    /* 3. Precipitation */
    var prob = w.rainProb === null ? '—' : U.fmt(w.rainProb, 0) + '%';
    var rainNote = (w.rainSum !== null)
      ? I18N.t('note.rainSum', { prob: prob, sum: U.fmt(w.rainSum, 1) })
      : I18N.t('note.rain', { prob: prob });
    var rainCard = Scale.card({ key: 'rain', spec: Metrics.SPEC.rain, value: w.rain, note: rainNote });
    appendSpark(rainCard, w.rainSeries, Metrics.SPEC.rain, 'spark.rain');
    host.appendChild(rainCard);

    /* 4. Cloud cover */
    host.appendChild(Scale.card({
      key: 'clouds', spec: Metrics.SPEC.clouds, value: w.clouds, note: U.wmoText(w.code)
    }));

    /* 5. UV */
    host.appendChild(Scale.card({
      key: 'uv', spec: Metrics.SPEC.uv, value: w.uv,
      note: w.uvMax === null ? I18N.t('note.uvDefault') : I18N.t('note.uvMax', { max: U.fmt(w.uvMax, 1) })
    }));

    /* 6. Humidity */
    host.appendChild(Scale.card({
      key: 'humidity', spec: Metrics.SPEC.humidity, value: w.humidity, note: I18N.t('note.humidity')
    }));

    /* 7. Pressure with the barogram */
    var pressureNote = '';
    if (w.pressure !== null) {
      pressureNote = (w.pressureTrend3h !== null)
        ? I18N.t('note.pressureTrend', { mmhg: toMmHg(w.pressure), trend: trendText(w.pressureTrend3h) })
        : I18N.t('note.pressure', { mmhg: toMmHg(w.pressure) });
    }
    var pressureCard = Scale.card({
      key: 'pressure', spec: Metrics.SPEC.pressure, value: w.pressure, note: pressureNote
    });
    appendSpark(pressureCard, w.pressureSeries, Metrics.SPEC.pressure, 'spark.pressure');
    host.appendChild(pressureCard);

    /* 8. Waves */
    var waveNote = w.hasSea
      ? I18N.t('note.waves', { period: U.fmt(w.wavePeriod, 1), temp: U.fmt(w.seaTemp, 1) })
      : I18N.t('note.noSea');
    host.appendChild(Scale.card({
      key: 'waves', spec: Metrics.SPEC.waves, value: w.waveHeight, note: waveNote
    }));

    /* 9. Snorkeling */
    var snorkel = Metrics.snorkel(w);
    host.appendChild(Scale.card({
      key: 'snorkel', spec: Metrics.SPEC.snorkel, value: snorkel ? snorkel.value : null,
      badge: I18N.t('card.index'),
      note: snorkel ? whyNote(snorkel) : I18N.t('note.needSea')
    }));

    /* 10. Cycling */
    var bike = Metrics.bike(w);
    host.appendChild(Scale.card({
      key: 'bike', spec: Metrics.SPEC.bike, value: bike ? bike.value : null,
      badge: I18N.t('card.index'),
      note: whyNote(bike)
    }));
  }

  /* ---------- data ---------- */

  function setStatus(text) { U.setText(U.$('#status'), text); }
  function setHint(text) { U.setText(U.$('#hint'), text); }

  function refresh() {
    if (refreshing) { return; }

    if (demoMode) {
      var demo = Weather.demo();
      Store.set({ lastData: demo, lastTs: demo.ts });
      render(demo);
      U.setText(U.$('#updated'), U.agoText(settings.lastTs));
      setStatus(I18N.t('status.demo'));
      return;
    }
    if (settings.lat === null || settings.lon === null) {
      setStatus(I18N.t('status.noPlace'));
      return;
    }

    refreshing = true;
    setStatus(I18N.t('status.updating'));
    Weather.load(settings.lat, settings.lon, function (data) {
      refreshing = false;
      Store.set({ lastData: data, lastTs: data.ts });
      render(data);
      U.setText(U.$('#updated'), U.agoText(settings.lastTs));
      setStatus(I18N.t('status.ok'));
      pushConfigToWorker();
    }, function (err) {
      refreshing = false;
      setStatus(I18N.t('status.failed', { err: err }));
    });
  }

  function setPlace(lat, lon, name) {
    Store.set({ lat: lat, lon: lon, place: name || (U.fmt(lat, 2) + ', ' + U.fmt(lon, 2)) });
    U.setText(U.$('#place'), settings.place);
    refresh();
  }

  /* ---------- schedule ---------- */

  /* Once an hour, twenty seconds past the hour: Open-Meteo publishes hourly values. */
  function scheduleHourlyRefresh() {
    var now = new Date();
    var ms = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 + 20000;
    setTimeout(function () {
      refresh();
      scheduleHourlyRefresh();
    }, ms);
  }

  /* ---------- background and screen ---------- */

  function pushConfigToWorker() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { return; }
    if (settings.lat === null) { return; }
    navigator.serviceWorker.controller.postMessage({
      type: 'config',
      forecast: Weather.forecastUrl(settings.lat, settings.lon),
      notify: !!settings.background,
      strings: {
        title: settings.place ? I18N.t('notify.title', { place: settings.place })
                              : I18N.t('notify.titlePlain'),
        wind: I18N.t('notify.wind'),
        uv: I18N.t('notify.uv'),
        humidity: I18N.t('notify.humidity')
      }
    });
  }

  function updateBackgroundButton() {
    U.setText(U.$('#btn-background'),
      I18N.t('ui.background', { state: I18N.t(settings.background ? 'ui.on' : 'ui.off') }));
  }

  function updateScreenButton() {
    U.setText(U.$('#btn-screen'),
      I18N.t('ui.keepScreen', { state: I18N.t(screenLock ? 'ui.on' : 'ui.off') }));
  }

  function toggleBackground() {
    if (settings.background) {
      Store.set({ background: false });
      updateBackgroundButton();
      pushConfigToWorker();
      setHint(I18N.t('hint.bgOff'));
      return;
    }

    var enable = function () {
      Store.set({ background: true });
      updateBackgroundButton();
      pushConfigToWorker();
      registerPeriodicSync();
    };

    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission(function (permission) {
        if (permission === 'granted') { enable(); } else { setHint(I18N.t('hint.bgNoPermission')); }
      });
    } else if (window.Notification && Notification.permission === 'granted') {
      enable();
    } else {
      enable();
      setHint(I18N.t('hint.bgNoNotifications'));
    }
  }

  function registerPeriodicSync() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.ready) {
      setHint(I18N.t('hint.swUnavailable'));
      return;
    }
    navigator.serviceWorker.ready.then(function (reg) {
      if (!reg.periodicSync) {
        setHint(I18N.t('hint.syncUnsupported'));
        return;
      }
      var register = function () {
        reg.periodicSync.register('barogram-hourly', { minInterval: HOUR }).then(function () {
          setHint(I18N.t('hint.bgOn'));
        }, function (e) {
          setHint(I18N.t('hint.syncRejected', { err: e }));
        });
      };
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'periodic-background-sync' }).then(function (status) {
          if (status.state !== 'granted') { setHint(I18N.t('hint.syncPermission')); }
          register();
        }, register);
      } else {
        register();
      }
    });
  }

  function toggleScreenLock() {
    if (screenLock) {
      try { screenLock.release(); } catch (e) {}
      screenLock = null;
      Store.set({ keepScreen: false });
      updateScreenButton();
      return;
    }
    if (!navigator.wakeLock) {
      setHint(I18N.t('hint.wakeLockUnsupported'));
      return;
    }
    navigator.wakeLock.request('screen').then(function (lock) {
      screenLock = lock;
      Store.set({ keepScreen: true });
      updateScreenButton();
      lock.addEventListener('release', function () {
        screenLock = null;
        updateScreenButton();
      });
    }, function (e) {
      setHint(I18N.t('hint.wakeLockRejected', { err: e }));
    });
  }

  /* ---------- reload and version update ---------- */

  /* A full-screen browser hides its own reload button, so the app carries one. */
  function reloadPage() { location.reload(); }

  /* Drop the service worker and its caches, then reload: the only reliable way
     to pick up a new build when there is no address bar to force-refresh. */
  function updateApp() {
    setHint(I18N.t('hint.updating'));
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) {
      setTimeout(reloadPage, 300);
      return;
    }
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var jobs = [], i;
      for (i = 0; i < regs.length; i++) { jobs.push(regs[i].unregister()); }
      return Promise.all(jobs);
    }).then(function () {
      if (!window.caches || !caches.keys) { return null; }
      return caches.keys().then(function (keys) {
        var jobs = [], i;
        for (i = 0; i < keys.length; i++) { jobs.push(caches['delete'](keys[i])); }
        return Promise.all(jobs);
      });
    }).then(reloadPage, reloadPage);
  }

  /* ---------- place ---------- */

  function detectLocation() {
    if (!navigator.geolocation) {
      setHint(I18N.t('hint.geoUnsupported'));
      return;
    }
    setHint(I18N.t('hint.locating'));
    navigator.geolocation.getCurrentPosition(function (pos) {
      setPlace(U.num(pos.coords.latitude, 4), U.num(pos.coords.longitude, 4), '');
      setHint(I18N.t('hint.geoOk'));
    }, function (e) {
      setHint(I18N.t('hint.geoFailed', { err: (e && e.message) ? e.message : 'error' }));
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  function searchCity() {
    var name = U.$('#city-input').value;
    if (!name || name.length < 2) {
      setHint(I18N.t('hint.enterCity'));
      return;
    }
    setHint(I18N.t('hint.searching'));
    Weather.searchCity(name, function (results) {
      var list = U.$('#found');
      U.clear(list);
      if (!results.length) {
        setHint(I18N.t('hint.nothingFound'));
        return;
      }
      setHint(I18N.t('hint.chooseCity'));
      for (var i = 0; i < results.length; i++) {
        list.appendChild(cityItem(results[i], list));
      }
    }, function (err) {
      setHint(I18N.t('hint.searchFailed', { err: err }));
    });
  }

  function cityItem(result, list) {
    var item = U.el('li', 'found-item');
    var label = result.name +
      (result.admin1 ? ', ' + result.admin1 : '') +
      (result.country ? ' · ' + result.country : '');
    var button = U.el('button', 'btn btn-found', label);
    button.type = 'button';
    button.onclick = function () {
      setPlace(U.num(result.latitude, 4), U.num(result.longitude, 4), result.name);
      U.clear(list);
      setHint(I18N.t('hint.placeSet', { name: result.name }));
      closeMenu();
    };
    item.appendChild(button);
    return item;
  }

  /* ---------- start ---------- */

  function bindControls() {
    U.$('#btn-menu').onclick = toggleMenu;
    U.$('#btn-refresh').onclick = function () { refresh(); closeMenu(); };
    U.$('#btn-language').onclick = function () { applyLanguage(I18N.next()); };
    U.$('#btn-geo').onclick = detectLocation;
    U.$('#btn-city').onclick = searchCity;
    U.$('#city-input').onkeydown = function (e) { if (e.keyCode === 13) { searchCity(); } };
    U.$('#btn-background').onclick = toggleBackground;
    U.$('#btn-screen').onclick = toggleScreenLock;
    U.$('#btn-reload').onclick = reloadPage;
    U.$('#btn-update').onclick = updateApp;
  }

  function registerWorker() {
    if (!navigator.serviceWorker) { return; }
    navigator.serviceWorker.register('sw.js').then(function () {
      navigator.serviceWorker.ready.then(function () { setTimeout(pushConfigToWorker, 500); });
    }, function () {});
    /* The worker refreshed in the background — reread, the response is cached. */
    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'refreshed') { refresh(); }
    });
  }

  function boot() {
    /* An explicit ?lang= in the URL outranks the remembered locale. */
    var langParam = /[?&]lang=([a-z]{2})/.exec(location.search);
    var forced = (langParam && I18N.supports(langParam[1])) ? langParam[1] : null;
    I18N.use(forced || settings.lang || I18N.detect());
    var themeParam = /[?&]theme=([a-z]+)/.exec(location.search);
    if (themeParam) { settings.theme = themeParam[1]; }

    applyLanguage(I18N.lang());
    tickClock();
    bindControls();
    /* A screen wake lock never survives a reload — it needs a fresh gesture. */
    Store.set({ keepScreen: false });
    updateScreenButton();

    if (demoMode || settings.lat !== null) {
      refresh();
    } else {
      setMenu(true);
      setHint(I18N.t('hint.pickPlace'));
      setStatus(I18N.t('status.noPlace'));
    }

    scheduleHourlyRefresh();

    /* Back in the app — pull fresh data if what we have is older than half an hour. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { return; }
      U.setText(U.$('#updated'), U.agoText(settings.lastTs));
      if (Date.now() - settings.lastTs > 30 * 60 * 1000) { refresh(); }
    }, false);

    registerWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
})();
