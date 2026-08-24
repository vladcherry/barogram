/* metrics.js — intensity-scale definitions and comfort-index maths.
   Every metric declares the range of its scale, how many segments it has and
   the coloured bands inside it. A band matches the first entry with value <= to.
   Titles, units and band labels are i18n keys, resolved at render time. */
var Metrics = (function () {

  function band(bands, v) {
    for (var i = 0; i < bands.length; i++) {
      if (v <= bands[i].to) { return bands[i]; }
    }
    return bands[bands.length - 1];
  }

  var SPEC = {
    temp: {
      title: 'metric.temp', unit: 'unit.temp', min: -20, max: 45, segments: 13, decimals: 1,
      bands: [
        { to: -10, cls: 'lv-deep', label: 'band.temp.deepFrost' },
        { to: 0,   cls: 'lv-cold', label: 'band.temp.frost' },
        { to: 8,   cls: 'lv-calm', label: 'band.temp.cold' },
        { to: 15,  cls: 'lv-good', label: 'band.temp.cool' },
        { to: 24,  cls: 'lv-good', label: 'band.temp.comfort' },
        { to: 29,  cls: 'lv-mid',  label: 'band.temp.warm' },
        { to: 34,  cls: 'lv-warn', label: 'band.temp.hot' },
        { to: 99,  cls: 'lv-bad',  label: 'band.temp.scorching' }
      ]
    },
    wind: {
      title: 'metric.wind', unit: 'unit.wind', min: 0, max: 25, segments: 13, decimals: 1,
      bands: [
        { to: 1.5,  cls: 'lv-calm', label: 'band.wind.calm' },
        { to: 3.3,  cls: 'lv-good', label: 'band.wind.light' },
        { to: 5.4,  cls: 'lv-good', label: 'band.wind.gentle' },
        { to: 7.9,  cls: 'lv-mid',  label: 'band.wind.moderate' },
        { to: 10.7, cls: 'lv-warn', label: 'band.wind.fresh' },
        { to: 13.8, cls: 'lv-warn', label: 'band.wind.strong' },
        { to: 17.1, cls: 'lv-bad',  label: 'band.wind.nearGale' },
        { to: 99,   cls: 'lv-crit', label: 'band.wind.storm' }
      ]
    },
    uv: {
      title: 'metric.uv', unit: '', min: 0, max: 12, segments: 12, decimals: 1,
      bands: [
        { to: 2,  cls: 'lv-good', label: 'band.uv.low' },
        { to: 5,  cls: 'lv-mid',  label: 'band.uv.moderate' },
        { to: 7,  cls: 'lv-warn', label: 'band.uv.high' },
        { to: 10, cls: 'lv-bad',  label: 'band.uv.veryHigh' },
        { to: 99, cls: 'lv-crit', label: 'band.uv.extreme' }
      ]
    },
    humidity: {
      title: 'metric.humidity', unit: 'unit.percent', min: 0, max: 100, segments: 10, decimals: 0,
      bands: [
        { to: 25,  cls: 'lv-warn', label: 'band.humidity.veryDry' },
        { to: 35,  cls: 'lv-mid',  label: 'band.humidity.dry' },
        { to: 60,  cls: 'lv-good', label: 'band.humidity.comfort' },
        { to: 75,  cls: 'lv-mid',  label: 'band.humidity.humid' },
        { to: 90,  cls: 'lv-warn', label: 'band.humidity.veryHumid' },
        { to: 100, cls: 'lv-bad',  label: 'band.humidity.muggy' }
      ]
    },
    clouds: {
      title: 'metric.clouds', unit: 'unit.percent', min: 0, max: 100, segments: 10, decimals: 0,
      bands: [
        { to: 10,  cls: 'lv-good', label: 'band.clouds.clear' },
        { to: 30,  cls: 'lv-good', label: 'band.clouds.few' },
        { to: 60,  cls: 'lv-mid',  label: 'band.clouds.partly' },
        { to: 85,  cls: 'lv-warn', label: 'band.clouds.cloudy' },
        { to: 100, cls: 'lv-bad',  label: 'band.clouds.overcast' }
      ]
    },
    rain: {
      title: 'metric.rain', unit: 'unit.rain', min: 0, max: 10, segments: 10, decimals: 1,
      bands: [
        { to: 0.05, cls: 'lv-good', label: 'band.rain.dry' },
        { to: 0.5,  cls: 'lv-mid',  label: 'band.rain.drizzle' },
        { to: 2,    cls: 'lv-warn', label: 'band.rain.rain' },
        { to: 6,    cls: 'lv-bad',  label: 'band.rain.heavy' },
        { to: 99,   cls: 'lv-crit', label: 'band.rain.downpour' }
      ]
    },
    pressure: {
      title: 'metric.pressure', unit: 'unit.pressure', min: 980, max: 1040, segments: 12, decimals: 0,
      bands: [
        { to: 995,  cls: 'lv-bad',  label: 'band.pressure.veryLow' },
        { to: 1005, cls: 'lv-warn', label: 'band.pressure.low' },
        { to: 1013, cls: 'lv-good', label: 'band.pressure.belowNormal' },
        { to: 1022, cls: 'lv-good', label: 'band.pressure.normal' },
        { to: 1032, cls: 'lv-mid',  label: 'band.pressure.high' },
        { to: 9999, cls: 'lv-warn', label: 'band.pressure.veryHigh' }
      ]
    },
    waves: {
      title: 'metric.waves', unit: 'unit.wave', min: 0, max: 3, segments: 12, decimals: 2,
      bands: [
        { to: 0.15, cls: 'lv-calm', label: 'band.waves.glassy' },
        { to: 0.35, cls: 'lv-good', label: 'band.waves.ripple' },
        { to: 0.6,  cls: 'lv-mid',  label: 'band.waves.small' },
        { to: 1.0,  cls: 'lv-warn', label: 'band.waves.choppy' },
        { to: 1.8,  cls: 'lv-bad',  label: 'band.waves.rough' },
        { to: 99,   cls: 'lv-crit', label: 'band.waves.storm' }
      ]
    },
    /* comfort indices: the higher, the better */
    snorkel: {
      title: 'metric.snorkel', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    bike: {
      title: 'metric.bike', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    }
  };

  function INDEX_BANDS() {
    return [
      { to: 2,  cls: 'lv-crit', label: 'band.index.avoid' },
      { to: 4,  cls: 'lv-bad',  label: 'band.index.poor' },
      { to: 6,  cls: 'lv-warn', label: 'band.index.soso' },
      { to: 8,  cls: 'lv-mid',  label: 'band.index.good' },
      { to: 99, cls: 'lv-good', label: 'band.index.great' }
    ];
  }

  /* ---- comfort indices ---- */

  function penalty(pairs, v) {
    for (var i = 0; i < pairs.length; i++) {
      if (v <= pairs[i][0]) { return pairs[i][1]; }
    }
    return pairs[pairs.length - 1][1];
  }

  /* Reasons are collected as i18n keys so the card can render them in any language. */
  function reason(key, params) { return { key: key, params: params || null }; }

  /* Snorkeling: waves and water temperature dominate, then wind, rain, light. */
  function snorkel(w) {
    if (w.waveHeight === null && w.seaTemp === null) { return null; }
    var p = 0, why = [];
    if (w.waveHeight !== null) {
      var pWave = penalty([[0.15, 0], [0.3, 0.6], [0.5, 1.8], [0.8, 3.5], [1.2, 5.5], [99, 8]], w.waveHeight);
      p += pWave;
      if (pWave >= 1.8) { why.push(reason('why.waves', { v: w.waveHeight.toFixed(2) })); }
    }
    if (w.seaTemp !== null) {
      var pWater = penalty([[17, 6], [20, 3.5], [22, 2], [24, 1], [26, 0.3], [99, 0]], w.seaTemp);
      p += pWater;
      if (pWater >= 1) { why.push(reason('why.water', { v: Math.round(w.seaTemp) })); }
    }
    if (w.wind !== null) {
      var pWind = penalty([[3, 0], [5, 0.8], [8, 2], [11, 3.5], [99, 5]], w.wind);
      p += pWind;
      if (pWind >= 2) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.rain !== null && w.rain > 0.3) { p += 1.2; why.push(reason('why.rain')); }
    if (w.clouds !== null && w.clouds > 80) { p += 0.6; why.push(reason('why.lowLight')); }
    if (w.uv !== null && w.uv >= 8) { p += 0.4; why.push(reason('why.harshUv')); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Cycling is happiest between 12 and 24 °C; both directions cost points. */
  function bikeTempPenalty(t) {
    if (t >= 12 && t <= 24) { return 0; }
    if (t > 24) { return penalty([[27, 1], [30, 2.5], [33, 4.5], [99, 6.5]], t); }
    if (t >= 8) { return 0.6; }
    if (t >= 3) { return 1.8; }
    if (t >= -3) { return 3.5; }
    return 5.5;
  }

  /* Cycling: temperature, wind with gusts, rain, UV and mugginess. */
  function bike(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [];
    var pTemp = bikeTempPenalty(w.temp);
    p += pTemp;
    if (pTemp >= 1) { why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.wind !== null) {
      var pWind = penalty([[2, 0], [4, 0.6], [6, 1.5], [9, 3], [12, 4.5], [99, 6]], w.wind);
      p += pWind;
      if (pWind >= 1.5) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.gust !== null && w.wind !== null && w.gust - w.wind > 5) { p += 0.8; why.push(reason('why.gusts')); }
    if (w.rain !== null && w.rain > 0.1) {
      p += (w.rain > 1 ? 3 : 1.8);
      why.push(reason('why.rain'));
    } else if (w.rainProb !== null && w.rainProb >= 60) {
      p += 1.2;
      why.push(reason('why.rainLikely'));
    }
    if (w.uv !== null && w.uv >= 8) {
      p += (w.uv >= 10 ? 1.4 : 0.8);
      why.push(reason('why.uv', { v: Math.round(w.uv) }));
    }
    if (w.humidity !== null && w.temp > 27 && w.humidity > 70) { p += 1; why.push(reason('why.mugginess')); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  return { SPEC: SPEC, band: band, snorkel: snorkel, bike: bike };
})();
