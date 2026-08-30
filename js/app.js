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
  var APP_VERSION = '2026.08.30-8';

  var settings = Store.load();
  var demoMode = /[?&]demo=1/.test(location.search);
  var screenLock = null;
  var refreshing = false;
  var editing = false;
  var dragKey = null;
  var installPrompt = null;

  /* ---------- theme ----------
     Nothing is chosen on a first run, so the device decides. An e-ink reader
     gets one of the two flat, high-contrast designs — E-Ink Color where the
     screen has colour, Reader where it does not — and a phone or a computer
     gets Night or Light, following whatever it says about dark mode. */

  function media(query) {
    try { return !!(window.matchMedia && window.matchMedia(query).matches); }
    catch (e) { return false; }
  }

  function isReader() {
    var ua = navigator.userAgent || '';
    if (/PocketBook|Kobo|Kindle|Boox|Onyx|reMarkable|Bookeen|InkBook|Nook|EBRD|E-Ink/i.test(ua)) {
      return true;
    }
    /* An e-ink browser reports a screen it cannot repaint smoothly. */
    return media('(update: slow)');
  }

  /* Readers that have no colour screen at all, whatever the media query says. */
  function isGreyReader() {
    var ua = navigator.userAgent || '';
    return /Kindle|Kobo|reMarkable|Nook|InkBook/i.test(ua) ||
           media('(monochrome)') || media('(color: 0)');
  }

  function detectTheme() {
    if (isReader()) { return isGreyReader() ? 'eink' : 'tiles'; }
    return media('(prefers-color-scheme: dark)') ? 'night' : 'paper';
  }

  function themeIndex(id) {
    for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) { return i; } }
    return 0;
  }

  /* Some controls are on screen twice (the editor bar above and below the
     grid), so they are bound by class rather than by id. */
  function bindAll(selector, handler) {
    var nodes = U.all(selector), i;
    for (i = 0; i < nodes.length; i++) { nodes[i].onclick = handler; }
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

  /* Step through the designs — used by the left/right swipe. */
  function stepTheme(direction) {
    var count = THEMES.length;
    var theme = THEMES[(themeIndex(settings.theme) + direction + count) % count];
    applyTheme(theme.id);
    setStatus(I18N.t('ui.design', { name: I18N.t(theme.name) }));
    setTimeout(refreshStatus, 2500);
  }

  /* A horizontal swipe switches designs. Vertical movement wins ties so the
     page still scrolls, and swipes that start inside the open menu are left to
     its buttons. Nothing is prevented, so taps and scrolling behave as before. */
  function bindSwipe() {
    var startX = null, startY = null, startedAt = 0;

    document.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1 || editing || insideMenu(e.target)) {
        startX = null;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startedAt = Date.now();
    }, false);

    document.addEventListener('touchend', function (e) {
      if (startX === null || !e.changedTouches || !e.changedTouches.length) { return; }
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      var elapsed = Date.now() - startedAt;
      startX = null;
      if (elapsed > 700) { return; }
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) { return; }
      stepTheme(dx < 0 ? 1 : -1);
    }, false);
  }

  /* No Element.closest on the reader's browser, so walk up by hand. A swipe
     that starts inside the menu or inside a sheet belongs to that sheet. */
  function insideMenu(target) {
    var stops = [U.$('#panel'), U.$('#library'), U.$('#detail')];
    for (var n = target; n; n = n.parentNode) {
      for (var i = 0; i < stops.length; i++) { if (n === stops[i]) { return true; } }
    }
    return false;
  }

  /* ---------- menu ---------- */

  function setMenu(open) {
    if (open) { refreshPanelValues(); }
    U.$('#panel').hidden = !open;
    var button = U.$('#btn-menu');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    /* The button carries both glyphs and shows one: open it with the bars,
       close it with the ×, without a second control in the bar. An SVG element
       has no hidden property, so the attribute is set by hand. */
    showGlyph(U.$('#ico-menu'), !open);
    showGlyph(U.$('#ico-close'), open);
    setLabel(button, I18N.t(open ? 'ui.close' : 'ui.menu'));
  }

  function showGlyph(node, on) {
    if (on) { node.removeAttribute('hidden'); } else { node.setAttribute('hidden', 'hidden'); }
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
    buildDesignRow();
    refreshPanelValues();
    setHint('');
    if (!U.$('#install').hidden) { showInstall(true); }
    if (editing) {
      editHint(I18N.t('hint.editMode'));
      renderLibrary();
    }
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
    /* A sheet built in the old language cannot be patched string by string. */
    Detail.close();
    /* The menu button says Close while the panel is open. */
    setLabel(U.$('#btn-menu'), I18N.t(U.$('#panel').hidden ? 'ui.menu' : 'ui.close'));
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (i = 0; i < placeholders.length; i++) {
      placeholders[i].setAttribute('placeholder', I18N.t(placeholders[i].getAttribute('data-i18n-placeholder')));
    }
  }

  /* Every row shows its current value, so the panel reads without being poked. */
  function refreshPanelValues() {
    U.setText(U.$('#val-language'), I18N.t('lang.' + I18N.lang()));
    U.setText(U.$('#val-cards'), String(cardList().length));
    U.setText(U.$('#val-place'), settings.place || I18N.t('ui.noPlace'));
    U.setText(U.$('#val-coords'),
      settings.lat === null ? '' : (U.fmt(settings.lat, 2) + ', ' + U.fmt(settings.lon, 2)));
    U.setText(U.$('#val-updated'), U.agoText(settings.lastTs));
    U.setText(U.$('#version'), APP_VERSION);
    updateBackgroundButton();
    updateScreenButton();
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

  /* ---------- the card library ----------
     Every card is described here: where its number comes from, what its note
     says, and whether it carries a 24 h chart. The screen is then just a list
     of keys, which is what makes the cards rearrangeable. */

  var SPORTS = {
    snorkel: 1, bike: 1, run: 1, swim: 1, tennis: 1,
    hike: 1, fishing: 1, golf: 1, surf: 1, windsport: 1, drone: 1,
    boatFishing: 1, camping: 1, dogWalk: 1
  };

  function pct(v) { return v === null ? '—' : U.fmt(v, 0) + '%'; }

  var CARDS = {
    temp: {
      value: function (w) { return w.temp; },
      spark: { series: 'tempSeries', caption: 'spark.temp' },
      note: function (w) {
        return (w.tempMin !== null && w.tempMax !== null)
          ? I18N.t('note.tempRange', {
              feels: U.fmt(w.feels, 1), min: U.fmt(w.tempMin, 0), max: U.fmt(w.tempMax, 0) })
          : I18N.t('note.temp', { feels: U.fmt(w.feels, 1) });
      }
    },
    wind: {
      value: function (w) { return w.wind; },
      note: function (w) {
        return (w.windDir !== null)
          ? I18N.t('note.windDir', {
              gust: U.fmt(w.gust, 1), dir: U.windDir(w.windDir), deg: U.fmt(w.windDir, 0) })
          : I18N.t('note.wind', { gust: U.fmt(w.gust, 1) });
      }
    },
    rain: {
      value: function (w) { return w.rain; },
      spark: { series: 'rainSeries', caption: 'spark.rain' },
      note: function (w) {
        return (w.rainSum !== null)
          ? I18N.t('note.rainSum', { prob: pct(w.rainProb), sum: U.fmt(w.rainSum, 1) })
          : I18N.t('note.rain', { prob: pct(w.rainProb) });
      }
    },
    clouds: {
      value: function (w) { return w.clouds; },
      note: function (w) { return U.wmoText(w.code); }
    },
    uv: {
      value: function (w) { return w.uv; },
      note: function (w) {
        return w.uvMax === null ? I18N.t('note.uvDefault')
                                : I18N.t('note.uvMax', { max: U.fmt(w.uvMax, 1) });
      }
    },
    humidity: {
      value: function (w) { return w.humidity; },
      note: function () { return I18N.t('note.humidity'); }
    },
    pressure: {
      value: function (w) { return w.pressure; },
      spark: { series: 'pressureSeries', caption: 'spark.pressure' },
      note: function (w) {
        if (w.pressure === null) { return ''; }
        return (w.pressureTrend3h !== null)
          ? I18N.t('note.pressureTrend', { mmhg: toMmHg(w.pressure), trend: trendText(w.pressureTrend3h) })
          : I18N.t('note.pressure', { mmhg: toMmHg(w.pressure) });
      }
    },
    waves: {
      value: function (w) { return w.waveHeight; },
      note: function (w) {
        return w.hasSea
          ? I18N.t('note.waves', { period: U.fmt(w.wavePeriod, 1), temp: U.fmt(w.seaTemp, 1) })
          : I18N.t('note.noSea');
      }
    },
    feelsLike: {
      value: function (w) { return w.feels; },
      note: function (w) { return I18N.t('note.measured', { v: U.fmt(w.temp, 1) }); }
    },
    gusts: {
      value: function (w) { return w.gust; },
      note: function (w) { return I18N.t('note.steadyWind', { v: U.fmt(w.wind, 1) }); }
    },
    windDir: {
      value: function (w) { return w.windDir; },
      bandText: function (w) { return U.windDir(w.windDir); },
      icon: function (w) { return Icons.compass(w.windDir); },
      note: function (w) { return I18N.t('note.windFrom', { dir: U.windDir(w.windDir) }); }
    },
    rainProb: {
      value: function (w) { return w.rainProb; },
      note: function (w) { return I18N.t('note.rainAmount', { v: U.fmt(w.rainSum, 1) }); }
    },
    waterTemp: {
      value: function (w) { return w.seaTemp; },
      note: function (w) {
        return w.hasSea ? I18N.t('note.waterHint', { v: U.fmt(w.waveHeight, 2) })
                        : I18N.t('note.noSea');
      }
    },
    dewPoint: {
      value: function (w) { return w.dewPoint; },
      note: function () { return I18N.t('note.dewHint'); }
    },
    visibility: {
      value: function (w) { return w.visibility; },
      note: function () { return I18N.t('note.visHint'); }
    },
    airQuality: {
      value: function (w) { return w.airQuality; },
      note: function (w) {
        return w.pm25 === null ? I18N.t('note.noData') : I18N.t('note.pm', { v: U.fmt(w.pm25, 1) });
      }
    },
    pm25: {
      value: function (w) { return w.pm25; },
      note: function (w) {
        return w.airQuality === null ? I18N.t('note.noData')
                                     : I18N.t('metric.airQuality') + ' ' + U.fmt(w.airQuality, 0);
      }
    },
    pollen: {
      value: function (w) { return w.pollen; },
      note: function () { return I18N.t('note.pollenSpecies'); }
    }
  };

  /* Sports share one shape: the index, its reasons, and the sport's own icon. */
  function addSportCards() {
    var keys = [], k;
    for (k in SPORTS) { if (SPORTS.hasOwnProperty(k)) { keys.push(k); } }
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        CARDS[key] = {
          index: true,
          badge: function () { return I18N.t('card.index'); },
          value: function (w) { var r = Metrics[key](w); return r ? r.value : null; },
          note: function (w) {
            var r = Metrics[key](w);
            if (r) { return whyNote(r); }
            return (key === 'swim' || key === 'surf' || key === 'snorkel' || key === 'boatFishing')
              ? I18N.t('note.needSea') : I18N.t('note.noData');
          }
        };
      })(keys[i]);
    }
  }
  addSportCards();

  /* The screen as it comes out of the box, and the order of the library. */
  var DEFAULT_CARDS = ['temp', 'wind', 'rain', 'clouds', 'uv', 'humidity',
                       'pressure', 'waves', 'snorkel', 'bike'];
  /* The library, in the order and the grouping the picker shows. */
  var LIBRARY_GROUPS = [
    { title: 'group.weather',
      keys: ['temp', 'feelsLike', 'wind', 'gusts', 'windDir', 'rain', 'rainProb',
             'clouds', 'uv', 'humidity', 'dewPoint', 'pressure', 'visibility'] },
    { title: 'group.air', keys: ['airQuality', 'pm25', 'pollen'] },
    { title: 'group.sea', keys: ['waves', 'waterTemp'] },
    { title: 'group.sport',
      keys: ['snorkel', 'swim', 'surf', 'windsport', 'bike', 'run', 'hike',
             'tennis', 'golf', 'fishing', 'boatFishing', 'camping', 'drone', 'dogWalk'] }
  ];

  function cardList() {
    var list = settings.cards;
    if (!list || !list.length) { return DEFAULT_CARDS.slice(); }
    var out = [], i;
    for (i = 0; i < list.length; i++) {
      if (CARDS[list[i]]) { out.push(list[i]); }
    }
    return out.length ? out : DEFAULT_CARDS.slice();
  }

  function saveCards(list) { Store.set({ cards: list }); }

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

  /* Sky and rain show the weather itself, the sports show the sport with a
     verdict, everything else shows the face of its comfort band. The band class
     rides along on the element so each design can colour the icon by comfort. */
  function iconFor(key, value, w) {
    var spec = Metrics.SPEC[key];
    var band = (value === null || value === undefined || !spec)
      ? null : Metrics.band(spec.bands, value).cls;
    var icon;
    if (CARDS[key] && CARDS[key].icon) { icon = CARDS[key].icon(w); }
    else if (key === 'clouds') { icon = Icons.sky(w.code, w.clouds); }
    else if (key === 'rain') { icon = Icons.rain(w.rain); }
    else if (SPORTS[key]) { icon = Icons.sport(key, value); }
    else { icon = Icons.mood(band); }
    if (band) { icon.className = 'card-icon ' + band; }
    return icon;
  }

  function appendSpark(card, values, spec, captionKey) {
    if (!values || !values.length) { return; }
    var spark = Scale.sparkBars(values, spec, I18N.t(captionKey));
    if (spark) { card.appendChild(spark); }
  }

  function buildCard(key, w) {
    var def = CARDS[key];
    var spec = Metrics.SPEC[key];
    if (!def || !spec) { return null; }

    var value = def.value(w);
    var card = Scale.card({
      key: key, spec: spec, value: value,
      note: def.note ? def.note(w) : '',
      badge: def.badge ? def.badge() : null,
      bandText: def.bandText ? def.bandText(w) : null,
      icon: iconFor(key, value, w)
    });
    if (def.spark) { appendSpark(card, w[def.spark.series], spec, def.spark.caption); }
    if (editing) {
      card.appendChild(editControls(key));
      card.appendChild(deleteBadge(key));
    }
    return card;
  }

  function render(w) {
    var host = U.$('#cards');
    if (!host) { return; }
    U.clear(host);

    if (!w) {
      host.appendChild(U.el('p', 'empty', I18N.t('ui.noData')));
      U.setText(U.$('#cond'), ' ');
      return;
    }

    U.setText(U.$('#cond'), U.wmoText(w.code));

    /* In the editor the add bar frames the grid, top and bottom, so it is in
       reach without scrolling past every card first. */
    if (editing) { host.appendChild(addCardTile()); }

    var list = cardList(), i, card;
    for (i = 0; i < list.length; i++) {
      card = buildCard(list[i], w);
      if (card) {
        card.setAttribute('data-index', i);
        host.appendChild(card);
      }
    }
    if (editing) { host.appendChild(addCardTile()); }
  }


  /* ---------- editing the card set ----------
     Holding any card turns the screen into an editor: cards can be dragged into
     a new order, removed with ×, and new ones picked from the library. Arrow
     buttons do the same job as dragging, because dragging on electronic ink is
     a lottery. */

  /* The card in the editor: a grab handle across the foot with an arrow at each
     end — dragging on electronic ink is a lottery, so the arrows stay — and the
     removal on the corner, as a badge, where it cannot be hit by accident. */
  function editControls(key) {
    var box = U.el('div', 'card-edit');
    box.appendChild(editButton(Icons.chevron(-1), 'ui.moveLeft', 'btn-move',
      function () { moveCard(key, -1); }));
    var grip = U.el('span', 'card-grip');
    grip.appendChild(Icons.grip());
    box.appendChild(grip);
    box.appendChild(editButton(Icons.chevron(1), 'ui.moveRight', 'btn-move',
      function () { moveCard(key, 1); }));
    return box;
  }

  function deleteBadge(key) {
    return editButton(Icons.cross(), 'ui.removeCard', 'card-del',
      function () { removeCard(key); });
  }

  function editButton(glyph, labelKey, cls, onClick) {
    var button = U.el('button', cls);
    button.type = 'button';
    glyph.setAttribute('class', 'edit-ico');
    button.appendChild(glyph);
    setLabel(button, I18N.t(labelKey));
    button.onclick = function (e) {
      if (e && e.stopPropagation) { e.stopPropagation(); }
      onClick();
    };
    return button;
  }

  /* One wide bar rather than a tile the size of a card: it is the way out of the
     editor into the library, and on a reader it has to be hittable. */
  function addCardTile() {
    var tile = U.el('article', 'card card-add');
    var button = U.el('button', 'btn btn-add');
    button.type = 'button';
    button.appendChild(U.el('span', 'btn-add-plus', '+'));
    button.appendChild(U.el('span', 'btn-add-label', I18N.t('ui.library')));
    setLabel(button, I18N.t('ui.library'));
    button.onclick = openLibrary;
    tile.appendChild(button);
    return tile;
  }

  /* The editor bar exists twice, above and below the grid; both say the same. */
  function editHint(text) {
    var bars = U.all('.edit-hint'), i;
    for (i = 0; i < bars.length; i++) { U.setText(bars[i], text); }
  }

  function showEditBars(on) {
    var bars = U.all('.editbar'), i;
    for (i = 0; i < bars.length; i++) { bars[i].hidden = !on; }
  }

  function setEditing(on) {
    editing = !!on;
    Detail.close();
    document.body.setAttribute('data-editing', editing ? '1' : '0');
    showEditBars(editing);
    closeLibrary();
    if (editing) {
      setHint('');
      editHint(I18N.t('hint.editMode'));
      renderLibrary();
    }
    render(settings.lastData);
  }

  function moveCard(key, direction) {
    var list = cardList();
    var from = indexOfKey(list, key);
    var to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) { return; }
    list.splice(to, 0, list.splice(from, 1)[0]);
    saveCards(list);
    render(settings.lastData);
  }

  function removeCard(key) {
    var list = cardList();
    var at = indexOfKey(list, key);
    if (at < 0 || list.length <= 1) { return; }
    list.splice(at, 1);
    saveCards(list);
    renderLibrary();
    render(settings.lastData);
  }

  /* The sheet stays open after an add: setting up a screen usually means
     picking several cards, and the row just leaves the list. */
  function addCard(key) {
    var list = cardList();
    if (indexOfKey(list, key) >= 0) { return; }
    list.push(key);
    saveCards(list);
    renderLibrary();
    render(settings.lastData);
    editHint(I18N.t('hint.cardAdded', { name: I18N.t(Metrics.SPEC[key].title) }));
  }

  function indexOfKey(list, key) {
    for (var i = 0; i < list.length; i++) { if (list[i] === key) { return i; } }
    return -1;
  }

  /* ---------- the library sheet ----------
     A layer over the whole screen: grouped rows, each with the card's icon, its
     name and what it reads right now, so a card can be judged before it is
     added. It scrolls inside itself, so nothing ever starts below the fold. */

  function openLibrary() {
    var input = U.$('#lib-search');
    if (input) { input.value = ''; }
    renderLibrary();
    U.$('#library').hidden = false;
    U.$('#library').scrollTop = 0;
  }

  function closeLibrary() { U.$('#library').hidden = true; }

  /* The library only offers what is not on the screen already. */
  function renderLibrary() {
    var host = U.$('#lib-body');
    if (!host) { return; }
    U.clear(host);

    var query = libraryQuery();
    var list = cardList(), shown = 0, left = 0;
    var g, i, key, group, rows;

    for (g = 0; g < LIBRARY_GROUPS.length; g++) {
      group = LIBRARY_GROUPS[g];
      rows = [];
      for (i = 0; i < group.keys.length; i++) {
        key = group.keys[i];
        if (indexOfKey(list, key) >= 0 || !Metrics.SPEC[key]) { continue; }
        left++;
        if (query && !matchesQuery(key, query)) { continue; }
        rows.push(libraryRow(key));
      }
      if (!rows.length) { continue; }
      host.appendChild(U.el('div', 'lib-group', I18N.t(group.title)));
      for (i = 0; i < rows.length; i++) { host.appendChild(rows[i]); }
      shown += rows.length;
    }

    if (!shown) {
      host.appendChild(U.el('p', 'hint lib-note',
        I18N.t(left ? 'hint.noMatches' : 'hint.allCards')));
    }
  }

  function libraryQuery() {
    var input = U.$('#lib-search');
    var value = input ? input.value : '';
    return value ? value.toLowerCase().replace(/^\s+|\s+$/g, '') : '';
  }

  function matchesQuery(key, query) {
    return I18N.t(Metrics.SPEC[key].title).toLowerCase().indexOf(query) >= 0;
  }

  /* One row: icon, name, current reading, plus. */
  function libraryRow(key) {
    var spec = Metrics.SPEC[key];
    var row = U.el('button', 'lib-row');
    row.type = 'button';

    var value = currentValue(key);
    var icon;
    /* With no reading yet a card's own icon has nothing to draw from. */
    try { icon = iconFor(key, value, settings.lastData || {}); }
    catch (e) { icon = Icons.mood(null); }
    icon.setAttribute('class', 'lib-ico-svg');
    var box = U.el('span', 'lib-ico');
    box.appendChild(icon);
    row.appendChild(box);

    row.appendChild(U.el('span', 'lib-name', I18N.t(spec.title)));
    row.appendChild(U.el('span', 'lib-now', readingText(key, value)));
    row.appendChild(U.el('span', 'lib-plus', '+'));
    row.onclick = function () { addCard(key); };
    return row;
  }

  /* oninput is the modern event; the reader's browser only fires onkeyup. */
  function bindLibrarySearch() {
    var input = U.$('#lib-search');
    if (!input) { return; }
    var redraw = function () { renderLibrary(); };
    input.oninput = redraw;
    input.onkeyup = redraw;
    input.onchange = redraw;
  }

  function currentValue(key) {
    var def = CARDS[key];
    if (!def || !settings.lastData) { return null; }
    var value = def.value(settings.lastData);
    return (value === null || value === undefined || isNaN(value)) ? null : Number(value);
  }

  function readingText(key, value) {
    var spec = Metrics.SPEC[key];
    if (value === null) { return ''; }
    var text = U.fmt(value, spec.decimals);
    return spec.unit ? text + ' ' + I18N.t(spec.unit) : text;
  }

  function resetCards() {
    saveCards(DEFAULT_CARDS.slice());
    renderLibrary();
    render(settings.lastData);
  }

  /* Hold a card to enter the editor; in the editor a drag reorders instead;
     a plain tap opens the card at length. */
  function bindCardGestures() {
    var host = U.$('#cards');
    var holdTimer = null, startX = 0, startY = 0, moved = false, tapKey = null;

    function cardKeyAt(x, y) {
      var node = document.elementFromPoint(x, y);
      for (; node; node = node.parentNode) {
        if (node.className && String(node.className).indexOf('card') === 0 &&
            node.getAttribute && node.getAttribute('data-metric')) {
          return node.getAttribute('data-metric');
        }
      }
      return null;
    }

    function down(x, y) {
      startX = x; startY = y; moved = false;
      var key = cardKeyAt(x, y);
      tapKey = key;
      if (!key) { return; }
      if (editing) { dragKey = key; return; }
      holdTimer = setTimeout(function () {
        holdTimer = null;
        tapKey = null;          /* the hold has taken it: no tap follows */
        setEditing(true);
      }, 550);
    }

    function move(x, y) {
      if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) {
        moved = true;           /* a swipe or a drag, not a tap */
        tapKey = null;
      }
      if (holdTimer && moved) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (!editing || !dragKey) { return; }
      var over = cardKeyAt(x, y);
      if (!over || over === dragKey) { return; }
      var list = cardList();
      var from = indexOfKey(list, dragKey), to = indexOfKey(list, over);
      if (from < 0 || to < 0) { return; }
      list.splice(to, 0, list.splice(from, 1)[0]);
      saveCards(list);
      render(settings.lastData);
    }

    function up() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      dragKey = null;
      /* A tap that neither moved nor turned into a hold: open the card. In the
         editor the taps belong to the ‹ × › buttons instead. */
      if (tapKey && !moved && !editing) { openDetail(tapKey); }
      tapKey = null;
    }

    host.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) { return; }
      down(e.touches[0].clientX, e.touches[0].clientY);
    }, false);
    host.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches.length) { return; }
      if (editing && dragKey && e.preventDefault) { e.preventDefault(); }
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, false);
    host.addEventListener('touchend', up, false);
    host.addEventListener('touchcancel', up, false);

    host.addEventListener('mousedown', function (e) { down(e.clientX, e.clientY); }, false);
    document.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); }, false);
    document.addEventListener('mouseup', up, false);
  }

  /* ---------- one card at length ---------- */

  function openDetail(key) {
    var w = settings.lastData;
    var def = CARDS[key];
    if (!def || !Metrics.SPEC[key] || !w) { return; }
    var value = def.value(w);
    if (value !== null && value !== undefined && isNaN(value)) { value = null; }
    var index = def.index ? Metrics[key](w) : null;
    var icon;
    try { icon = iconFor(key, value, w); }
    catch (e) { icon = Icons.mood(null); }
    icon.setAttribute('class', 'det-icon-svg');

    Detail.open({
      key: key,
      value: (value === undefined) ? null : value,
      icon: icon,
      note: def.note ? def.note(w) : '',
      bandText: def.bandText ? def.bandText(w) : null,
      why: index ? index.why : null,
      w: w,
      place: settings.place || '',
      updated: U.agoText(settings.lastTs)
    });
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
      /* An open card sheet is looking at the old reading: rebuild it. */
      if (Detail.isOpen()) { openDetail(Detail.key()); }
      U.setText(U.$('#updated'), U.agoText(settings.lastTs));
      setStatus(I18N.t('status.ok'));
      refreshPanelValues();
      pushConfigToWorker();
    }, function (err) {
      refreshing = false;
      setStatus(I18N.t('status.failed', { err: err }));
    });
  }

  function setPlace(lat, lon, name, source) {
    Store.set({
      lat: lat, lon: lon,
      place: name || (U.fmt(lat, 2) + ', ' + U.fmt(lon, 2)),
      placeSource: source || 'city'
    });
    U.setText(U.$('#place'), settings.place);
    refreshPanelValues();
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

  /* The switch carries the state now, so the row keeps its plain name. */
  function setSwitch(switchId, buttonId, on) {
    var knob = U.$(switchId);
    if (knob) { knob.className = on ? 'switch is-on' : 'switch'; }
    var button = U.$(buttonId);
    if (button) { button.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }

  function updateBackgroundButton() {
    setSwitch('#sw-background', '#btn-background', !!settings.background);
  }

  function updateScreenButton() {
    setSwitch('#sw-screen', '#btn-screen', !!screenLock);
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

  /* ---------- installing ----------
     Chromium hands us a real install prompt through beforeinstallprompt; Safari
     never will, so there the banner carries the Share → Add to Home Screen
     instructions instead. As long as the app is not installed the offer comes
     back on every launch — installed is where the hourly wake-up and the
     offline copy actually work — and "Later" puts it away until the next one. */

  /* Dismissed for this run only: nothing about it is written down. */
  var installHidden = false;

  function isInstalled() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) { return true; }
    return navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) { return true; }
    /* iPadOS reports itself as a Mac, but a Mac has no touch points. */
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }

  function showInstall(force) {
    if (isInstalled()) { return; }
    if (!force && installHidden) { return; }
    var text = installPrompt ? I18N.t('install.ready')
                             : (isIOS() ? I18N.t('install.ios') : I18N.t('install.other'));
    U.setText(U.$('#install-text'), text);
    U.$('#btn-install').hidden = !installPrompt;
    U.$('#install').hidden = false;
  }

  function hideInstall(forThisRun) {
    U.$('#install').hidden = true;
    if (forThisRun) { installHidden = true; }
  }

  function runInstallPrompt() {
    if (!installPrompt) { return; }
    var deferred = installPrompt;
    installPrompt = null;
    U.$('#btn-install').hidden = true;
    deferred.prompt();
    if (deferred.userChoice && deferred.userChoice.then) {
      deferred.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          U.setText(U.$('#install-text'), I18N.t('install.done'));
          setTimeout(function () { hideInstall(true); }, 2500);
        } else {
          hideInstall(true);
        }
      });
    }
  }

  function bindInstall() {
    U.$('#btn-install').onclick = runInstallPrompt;
    U.$('#btn-install-close').onclick = function () { hideInstall(true); };
    U.$('#btn-install-help').onclick = function () { showInstall(true); closeMenu(); };

    window.addEventListener('beforeinstallprompt', function (e) {
      if (e.preventDefault) { e.preventDefault(); }
      installPrompt = e;
      showInstall(false);
    }, false);

    window.addEventListener('appinstalled', function () {
      installPrompt = null;
      hideInstall(true);
    }, false);

    /* Give the browser a moment to fire its own prompt before falling back to
       the instructions. */
    setTimeout(function () { showInstall(false); }, 2500);
  }

  /* ---------- place ---------- */

  function detectLocation() {
    if (!navigator.geolocation) {
      setHint(I18N.t('hint.geoUnsupported'));
      return;
    }
    setHint(I18N.t('hint.locating'));
    navigator.geolocation.getCurrentPosition(function (pos) {
      setPlace(U.num(pos.coords.latitude, 4), U.num(pos.coords.longitude, 4), '', 'geo');
      setHint(I18N.t('hint.geoOk'));
    }, function (e) {
      setHint(I18N.t('hint.geoFailed', { err: (e && e.message) ? e.message : 'error' }));
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  /* Every launch asks the device where it is, so a phone that travelled shows
     the weather where it woke up. A place typed in by hand is left alone — that
     is a deliberate choice, not a guess — and a refusal costs nothing: the
     browser remembers it and answers without asking again. Anything closer than
     a couple of kilometres counts as the same place and the cached reading
     stands. */
  var SAME_PLACE_KM = 2;

  function autoLocate() {
    if (demoMode || !navigator.geolocation) { return; }
    if (settings.lat !== null && settings.placeSource === 'city') { return; }

    var known = settings.lat !== null && settings.lon !== null;
    if (!known) { setHint(I18N.t('hint.locating')); }

    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = U.num(pos.coords.latitude, 4);
      var lon = U.num(pos.coords.longitude, 4);
      if (known && distanceKm(settings.lat, settings.lon, lat, lon) < SAME_PLACE_KM) {
        Store.set({ placeSource: 'geo' });
        return;
      }
      setPlace(lat, lon, '', 'geo');
      if (!known) { setHint(I18N.t('hint.geoOk')); closeMenu(); }
    }, function () {
      /* Refused, or no fix: whatever place is already stored still stands. */
      if (!known) { setHint(I18N.t('hint.pickPlace')); }
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  /* Flat-earth arithmetic, and quite enough to tell one town from the next. */
  function distanceKm(lat1, lon1, lat2, lon2) {
    var dLat = (lat2 - lat1) * 111;
    var dLon = (lon2 - lon1) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
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
      setPlace(U.num(result.latitude, 4), U.num(result.longitude, 4), result.name, 'city');
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
    U.$('#btn-edit').onclick = function () { setEditing(true); closeMenu(); };
    bindAll('.js-edit-done', function () { setEditing(false); });
    bindAll('.js-cards-reset', resetCards);
    U.$('#btn-library-close').onclick = closeLibrary;
    U.$('#btn-detail-close').onclick = function () { Detail.close(); };
    /* A hardware key on the reader and Escape on a desktop both close a sheet. */
    document.addEventListener('keydown', function (e) {
      if (e.keyCode !== 27) { return; }
      if (Detail.isOpen()) { Detail.close(); }
      else if (!U.$('#library').hidden) { closeLibrary(); }
    }, false);
    bindLibrarySearch();
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
    /* First run: no design remembered, so match the screen we are on. */
    else if (!settings.theme) { Store.set({ theme: detectTheme() }); }

    /* A snapshot from an older build may not have every field this one reads. */
    settings.lastData = Weather.fill(settings.lastData);

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
    /* The cached reading is already on screen; the fix arrives when it arrives. */
    autoLocate();

    scheduleHourlyRefresh();

    /* Back in the app — pull fresh data if what we have is older than half an hour. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { return; }
      U.setText(U.$('#updated'), U.agoText(settings.lastTs));
      if (Date.now() - settings.lastTs > 30 * 60 * 1000) { refresh(); }
    }, false);

    bindSwipe();
    bindCardGestures();
    bindInstall();
    registerWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
})();
