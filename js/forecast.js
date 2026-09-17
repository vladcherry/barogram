/* forecast.js — the two forecast sections inside a card sheet.

   Hour by hour comes from the same frames the outlook grades: one value per
   hour for this card's own reading, drawn as the bars the cards already use,
   with the peak and the low named in words.

   Day by day shows only what Open-Meteo aggregates itself. A day has no single
   humidity, pressure or air quality — inventing an average would read like a
   measurement and be neither — so those cards get the hourly section and no
   daily one, which is the honest answer to "what does the API have". */
var Forecast = (function () {

  /* What each card reads out of a daily record, and which figure carries the
     band colour. Anything absent here has no daily aggregate in the API. */
  var DAILY = {
    temp: function (d) {
      return pair(range(d.tempMax, d.tempMin, 1, 'unit.temp'), d.tempMax);
    },
    feelsLike: function (d) {
      return pair(range(d.feelsMax, d.feelsMin, 1, 'unit.temp'), d.feelsMax);
    },
    rain: function (d) {
      if (d.rainSum === null) { return null; }
      var text = U.fmt(d.rainSum, 1) + ' ' + I18N.t('unit.rainDay');
      if (d.rainProbMax !== null) { text += ' · ' + U.fmt(d.rainProbMax, 0) + ' %'; }
      return pair(text, d.rainSum);
    },
    rainProb: function (d) {
      return d.rainProbMax === null ? null
        : pair(U.fmt(d.rainProbMax, 0) + ' %', d.rainProbMax);
    },
    uv: function (d) { return d.uvMax === null ? null : pair(U.fmt(d.uvMax, 1), d.uvMax); },
    wind: function (d) {
      return d.windMax === null ? null
        : pair(U.fmt(d.windMax, 1) + ' ' + I18N.t('unit.wind'), d.windMax);
    },
    gusts: function (d) {
      return d.gustMax === null ? null
        : pair(U.fmt(d.gustMax, 1) + ' ' + I18N.t('unit.wind'), d.gustMax);
    },
    windDir: function (d) {
      return d.windDirDom === null ? null
        : pair(U.windDir(d.windDirDom) + ' (' + U.fmt(d.windDirDom, 0) + '°)', d.windDirDom);
    },
    waves: function (d) {
      return d.waveMax === null ? null
        : pair(U.fmt(d.waveMax, 2) + ' ' + I18N.t('unit.wave'), d.waveMax);
    },
    /* The sky has no daily number, but it has a daily verdict. */
    clouds: function (d) { return d.code === null ? null : pair(U.wmoText(d.code), null); },

    /* No daily aggregate in the API: the day is read off its own hours. */
    humidity: function (d) {
      return pair(range(d.humidityMax, d.humidityMin, 0, 'unit.percent'), d.humidityMax);
    },
    dewPoint: function (d) {
      return pair(range(d.dewMax, d.dewMin, 1, 'unit.temp'), d.dewMax);
    },
    pressure: function (d) {
      return pair(range(d.pressureMax, d.pressureMin, 0, 'unit.pressure'), d.pressureMax);
    },
    visibility: function (d) {
      return pair(range(d.visMax, d.visMin, 1, 'unit.km'), d.visMin);
    },
    waterTemp: function (d) {
      return pair(range(d.waterMax, d.waterMin, 1, 'unit.temp'), d.waterMax);
    },
    airQuality: function (d) {
      return d.aqiMax === null || d.aqiMax === undefined ? null
        : pair(U.fmt(d.aqiMax, 0), d.aqiMax);
    },
    pm25: function (d) {
      return d.pm25Max === null || d.pm25Max === undefined ? null
        : pair(U.fmt(d.pm25Max, 1) + ' ' + I18N.t('unit.ugm3'), d.pm25Max);
    },
    pollen: function (d) {
      return d.pollenMax === null || d.pollenMax === undefined ? null
        : pair(U.fmt(d.pollenMax, 0) + ' ' + I18N.t('unit.grains'), d.pollenMax);
    }
  };

  /* Every daily row is a maximum or a total except temperature, which is both
     ends of the day; the caption says which, so a number is never mistaken for
     an average. */
  var DAILY_NOTE = {
    temp: 'daily.range', feelsLike: 'daily.range', rain: 'daily.sum',
    rainProb: 'daily.max', uv: 'daily.max', wind: 'daily.max', gusts: 'daily.max',
    windDir: 'daily.dominant', waves: 'daily.max', clouds: 'daily.condition',
    humidity: 'daily.fromHourly', dewPoint: 'daily.fromHourly',
    pressure: 'daily.fromHourly', visibility: 'daily.fromHourly',
    waterTemp: 'daily.fromHourly', airQuality: 'daily.fromHourlyMax',
    pm25: 'daily.fromHourlyMax', pollen: 'daily.fromHourlyMax'
  };

  function pair(text, value) { return text === null ? null : { text: text, value: value }; }

  function range(hi, lo, digits, unit) {
    if (hi === null && lo === null) { return null; }
    if (lo === null) { return U.fmt(hi, digits) + ' ' + I18N.t(unit); }
    if (hi === null) { return U.fmt(lo, digits) + ' ' + I18N.t(unit); }
    return U.fmt(hi, digits) + ' / ' + U.fmt(lo, digits) + ' ' + I18N.t(unit);
  }

  function hasHourly(key, w) {
    return !!(Weather.FIELD[key] && w && w.frames && w.frames.length);
  }

  function hasDaily(key, w) {
    return !!(DAILY[key] && w && w.days && w.days.length);
  }

  /* ---- hour by hour ---- */

  function hourly(key, w) {
    if (!hasHourly(key, w)) { return null; }
    var field = Weather.FIELD[key];
    var spec = Metrics.SPEC[key];
    var values = [], i, v, known = 0;

    for (i = 0; i < w.frames.length; i++) {
      v = w.frames[i][field];
      v = (v === null || v === undefined || isNaN(v)) ? null : Number(v);
      if (v !== null) { known++; }
      values.push(v);
    }
    if (!known) { return null; }

    var box = U.el('div', 'fc-hourly');
    /* A bar says "more" or "less"; the numbers say how much. Every third hour
       carries its value, above the same tick that carries its hour, so a column
       reads top to bottom: the figure, the bar, the time. */
    box.appendChild(labels(values, spec));
    var bars = Scale.sparkBars(values, spec, '');
    if (bars) { box.appendChild(bars); }
    box.appendChild(ruler(w.frames));
    box.appendChild(extremes(key, values, w.frames, spec));
    return box;
  }

  /* Twenty-four numbers would not fit a phone; eight do. */
  function labels(values, spec) {
    var line = U.el('div', 'mx-row fc-labels');
    var cells = U.el('span', 'mx-cells');
    for (var i = 0; i < values.length; i++) {
      cells.appendChild(U.el('span', 'mx-tick',
        (i % 3 === 0 && values[i] !== null) ? shortValue(values[i], spec) : ''));
    }
    line.appendChild(cells);
    return line;
  }

  /* Three digits of precision is all the width there is: a pressure loses its
     decimal, a wave keeps two, everything else keeps one. */
  function shortValue(v, spec) {
    var digits = spec.decimals;
    if (Math.abs(v) >= 100) { digits = 0; }
    else if (digits > 1 && Math.abs(v) >= 10) { digits = 1; }
    return U.fmt(v, digits);
  }

  /* The same three-hour ticks as the outlook matrix, under the bars. */
  function ruler(frames) {
    var line = U.el('div', 'mx-row mx-ruler');
    var cells = U.el('span', 'mx-cells');
    for (var i = 0; i < frames.length; i++) {
      cells.appendChild(U.el('span', 'mx-tick', (i % 3 === 0) ? U.pad2(frames[i].hour) : ''));
    }
    line.appendChild(cells);
    return line;
  }

  /* The two hours worth naming: where it peaks and where it bottoms out. */
  function extremes(key, values, frames, spec) {
    var hi = null, lo = null, hiAt = 0, loAt = 0, i;
    for (i = 0; i < values.length; i++) {
      if (values[i] === null) { continue; }
      if (hi === null || values[i] > hi) { hi = values[i]; hiAt = i; }
      if (lo === null || values[i] < lo) { lo = values[i]; loAt = i; }
    }
    var box = U.el('div');
    if (hi === null) { return box; }
    box.appendChild(valueRow(I18N.t('daily.peak'), hi, hiAt, frames, spec));
    if (lo !== hi) { box.appendChild(valueRow(I18N.t('daily.low'), lo, loAt, frames, spec)); }
    return box;
  }

  function valueRow(name, value, at, frames, spec) {
    var text = U.fmt(value, spec.decimals) + (spec.unit ? ' ' + I18N.t(spec.unit) : '');
    var node = U.el('div', 'det-row');
    node.appendChild(U.el('span', 'det-row-name', name));
    var right = U.el('span', 'det-row-val');
    right.appendChild(U.el('span', Metrics.band(spec.bands, value).cls + '-text', text));
    right.appendChild(document.createTextNode(' · ' + U.pad2(frames[at].hour) + ':00'));
    node.appendChild(right);
    return node;
  }

  /* ---- day by day ---- */

  function daily(key, w) {
    if (!hasDaily(key, w)) { return null; }
    var spec = Metrics.SPEC[key];
    var box = U.el('div', 'fc-daily');
    var rows = 0, i, day, cell, node, right;

    for (i = 0; i < w.days.length; i++) {
      day = w.days[i];
      cell = DAILY[key](day);
      if (!cell) { continue; }
      node = U.el('div', 'det-row' + (i === 0 ? ' is-now' : ''));
      node.appendChild(U.el('span', 'det-row-name', dayName(day.date, i)));
      right = U.el('span', 'det-row-val');
      right.appendChild(U.el('span',
        cell.value === null ? '' : Metrics.band(spec.bands, cell.value).cls + '-text', cell.text));
      node.appendChild(right);
      box.appendChild(node);
      rows++;
    }
    if (!rows) { return null; }
    if (DAILY_NOTE[key]) { box.appendChild(U.el('p', 'det-note', I18N.t(DAILY_NOTE[key]))); }
    return box;
  }

  /* Today is called today; the rest are a weekday and a date. */
  function dayName(iso, index) {
    if (index === 0) { return I18N.t('daily.today'); }
    var parts = String(iso).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (index === 1) { return I18N.t('daily.tomorrow'); }
    return I18N.list('date.weekdaysShort')[d.getDay()] + ', ' + d.getDate();
  }

  return { hourly: hourly, daily: daily, hasHourly: hasHourly, hasDaily: hasDaily };
})();
