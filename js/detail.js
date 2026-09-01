/* detail.js — the long form of a card.
   Tapping a card opens this: what the reading actually means, the whole scale
   with the current band marked, and — for a comfort index — what is dragging it
   down right now and every reading that went into it. The bottom of the sheet
   answers the other question: where each figure comes from and how it is put
   together, down to the API endpoint and the field name. */
var Detail = (function () {

  /* Which Open-Meteo endpoint and field every reading is read from. The three
     endpoints are the ones weather.js calls; nothing else is fetched. */
  var SOURCES = {
    temp:       { api: 'forecast', field: 'temperature_2m' },
    feelsLike:  { api: 'forecast', field: 'apparent_temperature' },
    wind:       { api: 'forecast', field: 'wind_speed_10m' },
    gusts:      { api: 'forecast', field: 'wind_gusts_10m' },
    windDir:    { api: 'forecast', field: 'wind_direction_10m' },
    rain:       { api: 'forecast', field: 'precipitation' },
    rainProb:   { api: 'forecast', field: 'precipitation_probability' },
    clouds:     { api: 'forecast', field: 'cloud_cover' },
    uv:         { api: 'forecast', field: 'uv_index' },
    humidity:   { api: 'forecast', field: 'relative_humidity_2m' },
    dewPoint:   { api: 'forecast', field: 'dew_point_2m' },
    pressure:   { api: 'forecast', field: 'pressure_msl' },
    visibility: { api: 'forecast', field: 'visibility' },
    airQuality: { api: 'air',      field: 'european_aqi' },
    pm25:       { api: 'air',      field: 'pm2_5' },
    pollen:     { api: 'air',      field: 'alder + birch + grass + mugwort + olive + ragweed_pollen' },
    waves:      { api: 'marine',   field: 'wave_height' },
    waterTemp:  { api: 'marine',   field: 'sea_surface_temperature' }
  };

  /* Where each reading sits in the normalised model, so the sheet can show the
     inputs of an index with their current values. */
  var FIELD = {
    temp: 'temp', feelsLike: 'feels', wind: 'wind', gusts: 'gust', windDir: 'windDir',
    rain: 'rain', rainProb: 'rainProb', clouds: 'clouds', uv: 'uv', humidity: 'humidity',
    dewPoint: 'dewPoint', pressure: 'pressure', visibility: 'visibility',
    airQuality: 'airQuality', pm25: 'pm25', pollen: 'pollen',
    waves: 'waveHeight', waterTemp: 'seaTemp'
  };

  /* What every comfort index reads, in the order it weighs them. */
  var INPUTS = {
    snorkel:     ['waves', 'waterTemp', 'wind', 'rain', 'clouds', 'uv'],
    swim:        ['waterTemp', 'waves', 'wind', 'rain'],
    surf:        ['waves', 'wind', 'waterTemp'],
    windsport:   ['wind', 'gusts', 'waves', 'waterTemp'],
    bike:        ['temp', 'wind', 'gusts', 'rain', 'rainProb', 'uv', 'humidity'],
    run:         ['temp', 'wind', 'rain', 'uv', 'humidity', 'airQuality', 'pollen'],
    hike:        ['temp', 'rain', 'rainProb', 'wind', 'uv', 'visibility', 'airQuality'],
    tennis:      ['rain', 'rainProb', 'wind', 'temp', 'uv'],
    golf:        ['rain', 'rainProb', 'wind', 'temp', 'uv'],
    fishing:     ['wind', 'waves', 'rain', 'pressure', 'temp'],
    boatFishing: ['waves', 'wind', 'gusts', 'rain', 'pressure', 'visibility', 'temp'],
    camping:     ['temp', 'rain', 'rainProb', 'wind', 'gusts', 'dewPoint'],
    drone:       ['wind', 'gusts', 'rain', 'rainProb', 'visibility', 'temp'],
    dogWalk:     ['temp', 'dewPoint', 'clouds', 'wind', 'rain', 'rainProb', 'airQuality', 'uv', 'visibility']
  };

  /* The wind profile, as the drone sheet shows it: one row per height above the
     ground. Only the ten-metre wind exists in "current"; the rest is hourly. */
  var PROFILE = [
    { height: 10,  speed: 'wind',    dir: 'windDir',    field: 'wind_speed_10m' },
    { height: 80,  speed: 'wind80',  dir: 'windDir80',  field: 'wind_speed_80m' },
    { height: 120, speed: 'wind120', dir: 'windDir120', field: 'wind_speed_120m', ceiling: true },
    { height: 180, speed: 'wind180', dir: 'windDir180', field: 'wind_speed_180m' }
  ];

  var current = null;

  function isIndex(key) { return !!INPUTS[key]; }

  function valueOf(w, key) {
    var field = FIELD[key];
    if (!field || !w) { return null; }
    var v = w[field];
    return (v === null || v === undefined || isNaN(v)) ? null : Number(v);
  }

  function reading(key, value) {
    var spec = Metrics.SPEC[key];
    if (value === null || !spec) { return I18N.t('note.noData'); }
    var text = U.fmt(value, spec.decimals);
    return spec.unit ? text + ' ' + I18N.t(spec.unit) : text;
  }

  /* A key gets its own explanation where the maths is worth spelling out;
     everything else is read from the API unchanged. */
  function mathText(key) {
    var own = 'math.' + key;
    return I18N.has(own) ? I18N.t(own) : I18N.t('math.direct');
  }

  function title(key) { return I18N.t(Metrics.SPEC[key].title); }

  /* ---- pieces of the sheet ---- */

  function head(text) { return U.el('div', 'lib-group', text); }

  function row(name, value, extraClass) {
    var node = U.el('div', 'det-row' + (extraClass ? ' ' + extraClass : ''));
    node.appendChild(U.el('span', 'det-row-name', name));
    node.appendChild(U.el('span', 'det-row-val', value));
    return node;
  }

  function para(text) { return U.el('p', 'det-text', text); }

  /* The reading itself: number, unit, icon, scale and band, as on the card but
     with room for the full scale and its end labels. */
  function hero(opts) {
    var spec = Metrics.SPEC[opts.key];
    var box = U.el('div', 'det-hero');
    var line = U.el('div', 'det-value-row');
    line.appendChild(U.el('div', 'det-value', opts.value === null ? '—' : U.fmt(opts.value, spec.decimals)));
    if (spec.unit) { line.appendChild(U.el('div', 'det-unit', I18N.t(spec.unit))); }
    if (opts.icon) {
      var holder = U.el('div', 'det-icon');
      holder.appendChild(opts.icon);
      line.appendChild(holder);
    }
    box.appendChild(line);
    box.appendChild(Scale.build(spec, opts.value));
    var band = opts.value === null ? null : Metrics.band(spec.bands, opts.value);
    box.appendChild(U.el('div', 'det-band' + (band ? ' ' + band.cls + '-text' : ''),
      opts.bandText || (band ? I18N.t(band.label) : I18N.t('note.noData'))));
    if (opts.note) { box.appendChild(U.el('div', 'det-note', opts.note)); }
    return box;
  }

  /* The whole scale as a table: every band, its range, and which one we are in.
     A scale nobody can read the thresholds of explains nothing. */
  function bandTable(key, value) {
    var spec = Metrics.SPEC[key];
    var host = document.createDocumentFragment();
    var now = value === null ? null : Metrics.band(spec.bands, value);
    var from = null, i, b, range;

    for (i = 0; i < spec.bands.length; i++) {
      b = spec.bands[i];
      range = bandRange(spec, from, b, i === spec.bands.length - 1);
      from = b.to;
      host.appendChild(row(I18N.t(b.label), range,
        (now && now === b) ? 'is-now ' + b.cls + '-text' : ''));
    }
    return host;
  }

  function bandRange(spec, from, band, last) {
    var d = spec.decimals > 1 ? 1 : spec.decimals;
    if (spec.bands.length === 1) { return ''; }
    if (from === null) { return '≤ ' + U.fmt(band.to, d); }
    if (last || band.to > spec.max) { return '> ' + U.fmt(from, d); }
    return U.fmt(from, d) + ' – ' + U.fmt(band.to, d);
  }

  /* For an index: everything it read, with the value each one has right now. */
  function inputTable(key, w) {
    var keys = INPUTS[key], host = document.createDocumentFragment(), i;
    for (i = 0; i < keys.length; i++) {
      host.appendChild(row(title(keys[i]), reading(keys[i], valueOf(w, keys[i]))));
    }
    return host;
  }

  function metres(height) { return height + ' ' + I18N.t('unit.wave'); }

  /* Wind by height: what the aircraft actually flies in, not what the anemometer
     on its two-metre post reports. The ceiling row is the one the index uses. */
  function windProfile(w) {
    var host = document.createDocumentFragment();
    var spec = Metrics.SPEC.wind;
    /* The height the index actually weighed — 120 m where the forecast has it,
       whatever it fell back to otherwise. */
    var used = Metrics.flightWind(w).h;
    var aloft = 0, i, item, v, dir, text, node, band;

    for (i = 0; i < PROFILE.length; i++) {
      item = PROFILE[i];
      v = (w && w[item.speed] !== null && w[item.speed] !== undefined) ? Number(w[item.speed]) : null;
      if (v === null || isNaN(v)) { continue; }
      if (item.height > 10) { aloft++; }
      dir = (w[item.dir] === null || w[item.dir] === undefined) ? null : w[item.dir];
      node = row(metres(item.height), '',
        'det-wind-row' + (item.height === used ? ' is-now' : ''));
      /* The speed carries the band colour on its own element: a colour set
         directly always beats one inherited from the row. */
      band = Metrics.band(spec.bands, v);
      text = U.el('span', band.cls + '-text', U.fmt(v, 1) + ' ' + I18N.t('unit.wind'));
      node.childNodes[1].appendChild(text);
      if (dir !== null) {
        node.childNodes[1].appendChild(document.createTextNode(' · ' + U.windDir(dir)));
      }
      host.appendChild(node);
    }
    /* One row is not a profile: with nothing above ten metres the block says
       nothing the wind card does not already say. */
    return aloft ? host : null;
  }

  /* And where each of those readings came from. */
  function sourceTable(keys) {
    var host = document.createDocumentFragment(), i, src;
    for (i = 0; i < keys.length; i++) {
      src = SOURCES[keys[i]];
      if (!src) { continue; }
      host.appendChild(row(title(keys[i]), I18N.t('src.api.' + src.api)));
      host.appendChild(U.el('div', 'det-field', src.field));
    }
    return host;
  }

  function sourceBlock(key, opts) {
    var box = U.el('div', 'det-src');
    box.appendChild(head(I18N.t('ui.detailSource')));

    if (isIndex(key)) {
      box.appendChild(para(I18N.t('src.derived')));
      box.appendChild(sourceTable(INPUTS[key]));
      if (key === 'drone') { box.appendChild(profileSources()); }
    } else {
      var src = SOURCES[key];
      if (src) {
        box.appendChild(row(I18N.t('src.source'), I18N.t('src.api.' + src.api)));
        box.appendChild(U.el('div', 'det-field', src.field));
      }
    }

    box.appendChild(row(I18N.t('src.cadence'), I18N.t('src.hourly')));
    if (opts.place) { box.appendChild(row(I18N.t('src.point'), opts.place)); }
    if (opts.updated) { box.appendChild(row(I18N.t('src.read'), opts.updated)); }
    box.appendChild(para(I18N.t('src.licence')));
    return box;
  }

  /* The profile has no card of its own, so its fields are named here. */
  function profileSources() {
    var host = document.createDocumentFragment(), i;
    for (i = 1; i < PROFILE.length; i++) {
      host.appendChild(row(I18N.t('ui.windAt', { h: metres(PROFILE[i].height) }),
        I18N.t('src.api.forecast')));
      host.appendChild(U.el('div', 'det-field', PROFILE[i].field));
    }
    return host;
  }

  function mathBlock(key) {
    var box = U.el('div', 'det-math');
    box.appendChild(head(I18N.t('ui.detailMath')));
    if (isIndex(key)) {
      box.appendChild(para(I18N.t('math.index', { list: inputList(key) })));
      if (I18N.has('best.' + key)) {
        box.appendChild(head(I18N.t('ui.best')));
        box.appendChild(para(I18N.t('best.' + key)));
      }
    } else {
      box.appendChild(para(mathText(key)));
    }
    return box;
  }

  function inputList(key) {
    var keys = INPUTS[key], names = [], i;
    for (i = 0; i < keys.length; i++) { names.push(title(keys[i]).toLowerCase()); }
    return names.join(', ');
  }

  /* What is costing the index points right now, in its own words. */
  function whyBlock(why) {
    var box = U.el('div');
    box.appendChild(head(I18N.t('ui.detailFactors')));
    if (!why || !why.length) {
      box.appendChild(para(I18N.t('note.noIssues')));
      return box;
    }
    for (var i = 0; i < why.length; i++) {
      box.appendChild(row('· ' + I18N.t(why[i].key, why[i].params), ''));
    }
    return box;
  }

  /* ---- the sheet ---- */

  function open(opts) {
    var key = opts.key;
    if (!Metrics.SPEC[key]) { return; }
    current = key;

    var body = U.$('#detail-body');
    U.clear(body);
    U.setText(U.$('#detail-title'), title(key));

    body.appendChild(hero(opts));

    if (I18N.has('about.' + key)) {
      body.appendChild(head(I18N.t('ui.detailAbout')));
      body.appendChild(para(I18N.t('about.' + key)));
    }

    if (isIndex(key)) {
      body.appendChild(whyBlock(opts.why));
      /* For a drone the wind profile is the reading that matters most, so it
         comes before the flat list of everything else. */
      if (key === 'drone') {
        var profile = windProfile(opts.w);
        if (profile) {
          body.appendChild(head(I18N.t('ui.windProfile')));
          body.appendChild(profile);
          body.appendChild(para(I18N.t('note.ceiling')));
        }
      }
      body.appendChild(head(I18N.t('ui.detailInputs')));
      body.appendChild(inputTable(key, opts.w));
    }

    body.appendChild(head(I18N.t('ui.detailScale')));
    body.appendChild(bandTable(key, opts.value));

    body.appendChild(mathBlock(key));
    body.appendChild(sourceBlock(key, opts));

    U.$('#detail').hidden = false;
    body.scrollTop = 0;
  }

  function close() {
    current = null;
    U.$('#detail').hidden = true;
  }

  function isOpen() { return !U.$('#detail').hidden; }

  function key() { return current; }

  return { open: open, close: close, isOpen: isOpen, key: key,
           inputs: INPUTS, sources: SOURCES };
})();
