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
    /* ---- extra readings, off by default and added from the card library ---- */
    feelsLike: {
      title: 'metric.feelsLike', unit: 'unit.temp', min: -20, max: 45, segments: 13, decimals: 1,
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
    gusts: {
      title: 'metric.gusts', unit: 'unit.wind', min: 0, max: 30, segments: 12, decimals: 1,
      bands: [
        { to: 3,  cls: 'lv-calm', label: 'band.wind.calm' },
        { to: 6,  cls: 'lv-good', label: 'band.wind.light' },
        { to: 9,  cls: 'lv-mid',  label: 'band.wind.moderate' },
        { to: 13, cls: 'lv-warn', label: 'band.wind.fresh' },
        { to: 18, cls: 'lv-bad',  label: 'band.wind.strong' },
        { to: 99, cls: 'lv-crit', label: 'band.wind.storm' }
      ]
    },
    windDir: {
      title: 'metric.windDir', unit: 'unit.degree', min: 0, max: 360, segments: 12, decimals: 0,
      bands: [{ to: 360, cls: 'lv-calm', label: 'band.windDir.any' }]
    },
    rainProb: {
      title: 'metric.rainProb', unit: 'unit.percent', min: 0, max: 100, segments: 10, decimals: 0,
      bands: [
        { to: 20,  cls: 'lv-good', label: 'band.rainProb.unlikely' },
        { to: 50,  cls: 'lv-mid',  label: 'band.rainProb.possible' },
        { to: 80,  cls: 'lv-warn', label: 'band.rainProb.likely' },
        { to: 100, cls: 'lv-bad',  label: 'band.rainProb.certain' }
      ]
    },
    waterTemp: {
      title: 'metric.waterTemp', unit: 'unit.temp', min: 8, max: 32, segments: 12, decimals: 1,
      bands: [
        { to: 15, cls: 'lv-deep', label: 'band.water.icy' },
        { to: 19, cls: 'lv-cold', label: 'band.water.cold' },
        { to: 22, cls: 'lv-calm', label: 'band.water.brisk' },
        { to: 25, cls: 'lv-good', label: 'band.water.pleasant' },
        { to: 29, cls: 'lv-good', label: 'band.water.warm' },
        { to: 99, cls: 'lv-mid',  label: 'band.water.bath' }
      ]
    },
    dewPoint: {
      title: 'metric.dewPoint', unit: 'unit.temp', min: -5, max: 30, segments: 12, decimals: 1,
      bands: [
        { to: 5,  cls: 'lv-calm', label: 'band.dew.dry' },
        { to: 13, cls: 'lv-good', label: 'band.dew.comfort' },
        { to: 17, cls: 'lv-mid',  label: 'band.dew.sticky' },
        { to: 21, cls: 'lv-warn', label: 'band.dew.humid' },
        { to: 24, cls: 'lv-bad',  label: 'band.dew.oppressive' },
        { to: 99, cls: 'lv-crit', label: 'band.dew.miserable' }
      ]
    },
    visibility: {
      title: 'metric.visibility', unit: 'unit.km', min: 0, max: 30, segments: 12, decimals: 1,
      bands: [
        { to: 1,  cls: 'lv-crit', label: 'band.vis.fog' },
        { to: 4,  cls: 'lv-bad',  label: 'band.vis.poor' },
        { to: 10, cls: 'lv-mid',  label: 'band.vis.moderate' },
        { to: 20, cls: 'lv-good', label: 'band.vis.good' },
        { to: 99, cls: 'lv-good', label: 'band.vis.excellent' }
      ]
    },
    airQuality: {
      title: 'metric.airQuality', unit: '', min: 0, max: 120, segments: 12, decimals: 0,
      bands: [
        { to: 20,  cls: 'lv-good', label: 'band.aqi.good' },
        { to: 40,  cls: 'lv-good', label: 'band.aqi.fair' },
        { to: 60,  cls: 'lv-mid',  label: 'band.aqi.moderate' },
        { to: 80,  cls: 'lv-warn', label: 'band.aqi.poor' },
        { to: 100, cls: 'lv-bad',  label: 'band.aqi.veryPoor' },
        { to: 999, cls: 'lv-crit', label: 'band.aqi.extreme' }
      ]
    },
    pm25: {
      title: 'metric.pm25', unit: 'unit.ugm3', min: 0, max: 60, segments: 12, decimals: 1,
      bands: [
        { to: 5,  cls: 'lv-good', label: 'band.aqi.good' },
        { to: 15, cls: 'lv-mid',  label: 'band.aqi.fair' },
        { to: 25, cls: 'lv-warn', label: 'band.aqi.moderate' },
        { to: 50, cls: 'lv-bad',  label: 'band.aqi.poor' },
        { to: 999, cls: 'lv-crit', label: 'band.aqi.veryPoor' }
      ]
    },
    pollen: {
      title: 'metric.pollen', unit: 'unit.grains', min: 0, max: 120, segments: 12, decimals: 0,
      bands: [
        { to: 10,  cls: 'lv-good', label: 'band.pollen.low' },
        { to: 30,  cls: 'lv-mid',  label: 'band.pollen.moderate' },
        { to: 80,  cls: 'lv-warn', label: 'band.pollen.high' },
        { to: 999, cls: 'lv-bad',  label: 'band.pollen.veryHigh' }
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
    },
    run: {
      title: 'metric.run', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    swim: {
      title: 'metric.swim', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    tennis: {
      title: 'metric.tennis', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    hike: {
      title: 'metric.hike', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    fishing: {
      title: 'metric.fishing', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    golf: {
      title: 'metric.golf', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    surf: {
      title: 'metric.surf', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    windsport: {
      title: 'metric.windsport', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    drone: {
      title: 'metric.drone', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    boatFishing: {
      title: 'metric.boatFishing', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    camping: {
      title: 'metric.camping', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
      bands: INDEX_BANDS()
    },
    dogWalk: {
      title: 'metric.dogWalk', unit: 'unit.index', min: 0, max: 10, segments: 10, decimals: 1,
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

  /* ---- the rest of the sport library ----
     Each one weighs the conditions that actually decide whether the outing is
     worth it, so their optima differ: a runner wants cool air and clean air, a
     windsurfer wants the wind a golfer is ruined by. */

  function heatPenalty(t, pairs) { return penalty(pairs, t); }

  function airPenalty(w, weight) {
    var p = 0, why = [];
    if (w.airQuality !== null && w.airQuality > 40) {
      p += penalty([[60, 1], [80, 2.5], [100, 4], [999, 6]], w.airQuality) * weight;
      why.push(reason('why.air', { v: Math.round(w.airQuality) }));
    }
    return { p: p, why: why };
  }

  function merge(target, extra) {
    for (var i = 0; i < extra.why.length; i++) { target.why.push(extra.why[i]); }
    return extra.p;
  }

  /* Running: cool air, clean air and no downpour; pollen matters here. */
  function run(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [], res = { why: why };
    var pt = (w.temp >= 4 && w.temp <= 16) ? 0
      : (w.temp > 16 ? heatPenalty(w.temp, [[20, 0.8], [24, 1.8], [28, 3.2], [32, 5], [99, 6.5]])
                     : (w.temp >= 0 ? 0.8 : (w.temp >= -5 ? 2 : 3.5)));
    p += pt; if (pt >= 1) { why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.wind !== null) {
      var pw = penalty([[3, 0], [6, 0.6], [9, 1.6], [12, 3], [99, 4.5]], w.wind);
      p += pw; if (pw >= 1.6) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.rain !== null && w.rain > 0.1) { p += (w.rain > 1 ? 3 : 1.5); why.push(reason('why.rain')); }
    if (w.uv !== null && w.uv >= 8) { p += 0.8; why.push(reason('why.uv', { v: Math.round(w.uv) })); }
    if (w.humidity !== null && w.temp > 26 && w.humidity > 65) { p += 1; why.push(reason('why.mugginess')); }
    p += merge(res, airPenalty(w, 1));
    if (w.pollen !== null && w.pollen > 10) {
      p += penalty([[30, 0.6], [80, 1.6], [999, 2.5]], w.pollen);
      why.push(reason('why.pollen'));
    }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Open-water swimming: the water decides, then the chop. */
  function swim(w) {
    if (w.seaTemp === null && w.waveHeight === null) { return null; }
    var p = 0, why = [];
    if (w.seaTemp !== null) {
      var pt = penalty([[17, 7], [20, 4], [22, 2.5], [24, 1], [26, 0.3], [99, 0]], w.seaTemp);
      p += pt; if (pt >= 1) { why.push(reason('why.water', { v: Math.round(w.seaTemp) })); }
    }
    if (w.waveHeight !== null) {
      var pv = penalty([[0.2, 0], [0.4, 0.8], [0.7, 2], [1.1, 4], [99, 6.5]], w.waveHeight);
      p += pv; if (pv >= 0.8) { why.push(reason('why.waves', { v: w.waveHeight.toFixed(2) })); }
    }
    if (w.wind !== null) {
      var pwd = penalty([[4, 0], [7, 1], [10, 2.5], [99, 4]], w.wind);
      p += pwd; if (pwd >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.rain !== null && w.rain > 0.5) { p += 1; why.push(reason('why.rain')); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Tennis: a wet court ends it, and wind ruins the ball flight. */
  function tennis(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [];
    if (w.rain !== null && w.rain > 0.05) { p += 6; why.push(reason('why.wetCourt')); }
    else if (w.rainProb !== null && w.rainProb >= 60) { p += 2; why.push(reason('why.rainLikely')); }
    if (w.wind !== null) {
      var pw = penalty([[2, 0], [4, 0.8], [6, 2], [9, 3.5], [99, 5.5]], w.wind);
      p += pw; if (pw >= 0.8) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    var pt = (w.temp >= 12 && w.temp <= 26) ? 0
      : (w.temp > 26 ? penalty([[30, 1.5], [34, 3.5], [99, 5]], w.temp)
                     : (w.temp >= 8 ? 1 : (w.temp >= 3 ? 2.5 : 4.5)));
    p += pt; if (pt >= 1) { why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.uv !== null && w.uv >= 8) { p += 0.8; why.push(reason('why.uv', { v: Math.round(w.uv) })); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Hiking: a wide comfortable range, but rain and haze cost the view. */
  function hike(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [], res = { why: why };
    var pt = (w.temp >= 5 && w.temp <= 22) ? 0
      : (w.temp > 22 ? penalty([[26, 1], [30, 2.5], [34, 4.5], [99, 6]], w.temp)
                     : (w.temp >= 0 ? 1.5 : (w.temp >= -5 ? 3 : 4.5)));
    p += pt; if (pt >= 1) { why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.rain !== null && w.rain > 0.2) { p += 2.5; why.push(reason('why.rain')); }
    else if (w.rainProb !== null && w.rainProb >= 60) { p += 1; why.push(reason('why.rainLikely')); }
    if (w.wind !== null) {
      var pw = penalty([[5, 0], [9, 1], [13, 2.5], [99, 4]], w.wind);
      p += pw; if (pw >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.uv !== null && w.uv >= 8) { p += 0.8; why.push(reason('why.uv', { v: Math.round(w.uv) })); }
    if (w.visibility !== null && w.visibility < 5) {
      p += (w.visibility < 2 ? 2 : 1);
      why.push(reason('why.haze'));
    }
    p += merge(res, airPenalty(w, 0.6));
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Fishing: a light breeze beats dead calm, and a jumping barometer kills the
     bite more reliably than any of the rest. */
  function fishing(w) {
    if (w.wind === null && w.pressure === null) { return null; }
    var p = 0, why = [];
    if (w.wind !== null) {
      var pw = (w.wind < 1.5) ? 0.8 : penalty([[5.5, 0], [8, 1.5], [11, 3], [99, 5]], w.wind);
      p += pw;
      if (pw >= 1.5) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
      else if (pw > 0) { why.push(reason('why.deadCalm')); }
    }
    if (w.waveHeight !== null) {
      var pv = penalty([[0.4, 0], [0.8, 1], [1.5, 2.5], [99, 4]], w.waveHeight);
      p += pv; if (pv >= 1) { why.push(reason('why.waves', { v: w.waveHeight.toFixed(2) })); }
    }
    if (w.rain !== null && w.rain > 2) { p += 2; why.push(reason('why.rain')); }
    if (w.pressureTrend3h !== null) {
      var swing = Math.abs(w.pressureTrend3h);
      if (swing > 2) { p += 2; why.push(reason('why.pressureSwing')); }
      else if (swing > 1) { p += 1; why.push(reason('why.pressureSwing')); }
    }
    if (w.temp !== null && w.temp < 0) { p += 1.5; why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Golf: rain and wind, in that order. */
  function golf(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [];
    if (w.rain !== null && w.rain > 0.1) { p += 4; why.push(reason('why.rain')); }
    else if (w.rainProb !== null && w.rainProb >= 60) { p += 1.5; why.push(reason('why.rainLikely')); }
    if (w.wind !== null) {
      var pw = penalty([[3, 0], [6, 1], [9, 2.5], [12, 4], [99, 6]], w.wind);
      p += pw; if (pw >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    var pt = (w.temp >= 12 && w.temp <= 28) ? 0
      : (w.temp > 28 ? penalty([[32, 1.5], [99, 3]], w.temp)
                     : (w.temp >= 7 ? 1 : (w.temp >= 2 ? 2.5 : 4)));
    p += pt; if (pt >= 1) { why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.uv !== null && w.uv >= 9) { p += 0.5; why.push(reason('why.uv', { v: Math.round(w.uv) })); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Surfing wants the swell the swimmers are complaining about: flat water is
     the failure case here, not the storm. */
  function surf(w) {
    if (w.waveHeight === null) { return null; }
    var p = 0, why = [];
    var h = w.waveHeight;
    if (h < 0.3) { p += 5; why.push(reason('why.flat')); }
    else if (h < 0.5) { p += 3.5; why.push(reason('why.flat')); }
    else if (h < 0.8) { p += 1.5; why.push(reason('why.smallSwell')); }
    else if (h > 3.5) { p += 3.5; why.push(reason('why.waves', { v: h.toFixed(1) })); }
    else if (h > 2.5) { p += 1.5; why.push(reason('why.waves', { v: h.toFixed(1) })); }
    if (w.wind !== null) {
      var pw = penalty([[4, 0], [7, 1], [10, 2.5], [99, 4]], w.wind);
      p += pw; if (pw >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.seaTemp !== null) {
      var pt = penalty([[17, 3], [20, 1.5], [23, 0.5], [99, 0]], w.seaTemp);
      p += pt; if (pt >= 1.5) { why.push(reason('why.water', { v: Math.round(w.seaTemp) })); }
    }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Windsurf and kite: the one card that wants it blowing. */
  function windsport(w) {
    if (w.wind === null) { return null; }
    var p = 0, why = [];
    var v = w.wind;
    if (v < 4) { p += 5; why.push(reason('why.tooLittleWind')); }
    else if (v < 6) { p += 2; why.push(reason('why.tooLittleWind')); }
    else if (v > 18) { p += 5; why.push(reason('why.wind', { v: Math.round(v) })); }
    else if (v > 15) { p += 3; why.push(reason('why.wind', { v: Math.round(v) })); }
    else if (v > 12) { p += 1.5; why.push(reason('why.wind', { v: Math.round(v) })); }
    if (w.gust !== null && w.gust - v > 7) { p += 1.5; why.push(reason('why.gusts')); }
    if (w.waveHeight !== null && w.waveHeight > 2) {
      p += (w.waveHeight > 3 ? 3.5 : 2);
      why.push(reason('why.waves', { v: w.waveHeight.toFixed(1) }));
    }
    if (w.seaTemp !== null && w.seaTemp < 18) { p += 1; why.push(reason('why.water', { v: Math.round(w.seaTemp) })); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* A drone does not fly at ten metres. The legal ceiling is 120 m across most
     of Europe and 400 ft in the United States, and the wind up there is
     routinely half again the surface reading, because the ground stops slowing
     it down. So the index weighs the wind at the ceiling where the forecast
     carries it, and says which height it used. */
  function flightWind(w) {
    if (w.wind120 !== null && w.wind120 !== undefined) { return { v: w.wind120, h: 120 }; }
    if (w.wind80 !== null && w.wind80 !== undefined) { return { v: w.wind80, h: 80 }; }
    return { v: w.wind, h: 10 };
  }

  /* Drone flight: wind and its gusts decide, rain grounds it outright, and the
     rest is what stops you seeing the aircraft or holding a charge. */
  function drone(w) {
    var air = flightWind(w);
    if (air.v === null) { return null; }
    var p = 0, why = [];
    var pw = penalty([[4, 0], [6, 1], [8, 2.5], [10, 4.5], [99, 7]], air.v);
    p += pw;
    if (pw >= 1) {
      why.push(air.h === 10 ? reason('why.wind', { v: Math.round(air.v) })
                            : reason('why.windAloft', { v: Math.round(air.v), h: air.h }));
    }
    /* Gusts are forecast at ten metres only, so the gustiness of the surface
       wind is the proxy for how rough it is higher up. */
    if (w.gust !== null && w.wind !== null && w.gust - w.wind > 4) {
      p += (w.gust - w.wind > 7 ? 2.5 : 1.2);
      why.push(reason('why.gusts'));
    }
    if (w.rain !== null && w.rain > 0.05) { p += 5; why.push(reason('why.rain')); }
    else if (w.rainProb !== null && w.rainProb >= 60) { p += 1.5; why.push(reason('why.rainLikely')); }
    if (w.visibility !== null && w.visibility < 5) {
      p += (w.visibility < 2 ? 3 : 1.5);
      why.push(reason('why.haze'));
    }
    if (w.temp !== null) {
      if (w.temp < -5) { p += 2.5; why.push(reason('why.coldBattery')); }
      else if (w.temp < 5) { p += 1.2; why.push(reason('why.coldBattery')); }
      else if (w.temp > 35) { p += 1; why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Fishing from a boat is the same sport with the sea added: the chop decides
     first, and fog on the water is its own problem. */
  function boatFishing(w) {
    if (w.wind === null && w.waveHeight === null) { return null; }
    var p = 0, why = [];
    if (w.waveHeight !== null) {
      var pv = penalty([[0.3, 0], [0.6, 1], [1, 2.5], [1.5, 4.5], [99, 7]], w.waveHeight);
      p += pv; if (pv >= 1) { why.push(reason('why.waves', { v: w.waveHeight.toFixed(2) })); }
    }
    if (w.wind !== null) {
      var pw = penalty([[4, 0], [6, 1], [8, 2.5], [11, 4], [99, 6]], w.wind);
      p += pw; if (pw >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
      if (w.gust !== null && w.gust - w.wind > 5) { p += 1; why.push(reason('why.gusts')); }
    }
    if (w.rain !== null && w.rain > 1) { p += 1.5; why.push(reason('why.rain')); }
    if (w.pressureTrend3h !== null) {
      var swing = Math.abs(w.pressureTrend3h);
      if (swing > 2) { p += 1.5; why.push(reason('why.pressureSwing')); }
      else if (swing > 1) { p += 0.8; why.push(reason('why.pressureSwing')); }
    }
    if (w.visibility !== null && w.visibility < 2) { p += 1.5; why.push(reason('why.haze')); }
    if (w.temp !== null && w.temp < 0) { p += 1; why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Camping is judged on the night, not the afternoon: the low temperature is
     what you actually sleep in, and a wet tent ruins the rest. */
  function camping(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [];
    var night = (w.tempMin === null) ? w.temp : w.tempMin;
    if (night < 0) { p += 3; why.push(reason('why.coldNight', { v: Math.round(night) })); }
    else if (night < 5) { p += 2; why.push(reason('why.coldNight', { v: Math.round(night) })); }
    else if (night < 10) { p += 0.8; why.push(reason('why.coldNight', { v: Math.round(night) })); }
    if (w.temp > 30) { p += 1.5; why.push(reason('why.temp', { v: Math.round(w.temp) })); }
    if (w.rain !== null && w.rain > 0.2) {
      p += (w.rain > 2 ? 4 : 2.5);
      why.push(reason('why.rain'));
    } else if (w.rainProb !== null && w.rainProb >= 60) {
      p += 1.2; why.push(reason('why.rainLikely'));
    }
    if (w.wind !== null) {
      var pw = penalty([[5, 0], [8, 1], [12, 2.5], [99, 4.5]], w.wind);
      p += pw; if (pw >= 1) { why.push(reason('why.wind', { v: Math.round(w.wind) })); }
    }
    if (w.gust !== null && w.gust > 12) { p += 1; why.push(reason('why.gusts')); }
    if (w.dewPoint !== null && w.dewPoint > 20) { p += 1; why.push(reason('why.mugginess')); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Walking the dog. Heat is the real hazard, not cold: a dog sheds heat by
     panting, so it overheats where a person is merely uncomfortable, and humid
     air takes that away too. Sun-baked pavement burns paws well before the air
     feels dangerous, so it is estimated from sunshine and temperature — an
     estimate, not a measurement, and labelled as such. Thresholds are for an
     average mid-sized dog; a husky and a pug sit on either side of them. */
  function dogWalk(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [], t = w.temp;

    var heat = penalty([[20, 0], [24, 0.5], [27, 1.5], [30, 3], [33, 5], [99, 7]], t);
    p += heat;
    if (heat >= 1.5) { why.push(reason('why.temp', { v: Math.round(t) })); }
    if (t > 22 && w.dewPoint !== null && w.dewPoint > 18) {
      p += 1.5; why.push(reason('why.mugginess'));
    }

    /* Sunny and hot means the asphalt is far hotter than the air. */
    var sunny = (w.clouds === null || w.clouds < 50) && w.isDay !== 0;
    if (sunny && t >= 25) {
      p += (t >= 30 ? 2.5 : 1.5);
      why.push(reason('why.hotPavement'));
    }

    if (t < 5) {
      var cold = (t >= 0) ? 0.8 : (t >= -5 ? 2 : (t >= -10 ? 3.5 : 5));
      p += cold;
      if (cold >= 2) { why.push(reason('why.temp', { v: Math.round(t) })); }
      if (w.wind !== null && w.wind > 5) { p += 1; why.push(reason('why.windChill')); }
    }

    if (w.code !== null && w.code >= 95) { p += 5; why.push(reason('why.thunder')); }

    if (w.rain !== null && w.rain > 0.2) {
      p += (w.rain > 2 ? 2.5 : 1.5);
      why.push(reason('why.rain'));
    } else if (w.rainProb !== null && w.rainProb >= 70) {
      p += 0.8; why.push(reason('why.rainLikely'));
    }

    /* Freezing rain around zero: the hazard is the human on the other end. */
    if (t > -3 && t < 1 && w.rain !== null && w.rain > 0.1) {
      p += 1; why.push(reason('why.ice'));
    }

    if (w.wind !== null && w.wind > 12) {
      p += (w.wind > 15 ? 2.5 : 1.5);
      why.push(reason('why.wind', { v: Math.round(w.wind) }));
    }

    /* A dog breathes 30 cm off the ground, where the exhaust sits. */
    if (w.airQuality !== null && w.airQuality > 60) {
      p += (w.airQuality > 80 ? 2 : 1);
      why.push(reason('why.air', { v: Math.round(w.airQuality) }));
    }

    if (w.uv !== null && w.uv >= 9) { p += 0.5; why.push(reason('why.uv', { v: Math.round(w.uv) })); }
    if (w.visibility !== null && w.visibility < 1) { p += 0.8; why.push(reason('why.haze')); }

    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Every comfort index, in the order the library offers them. */
  var INDEX_KEYS = ['snorkel', 'swim', 'surf', 'windsport', 'bike', 'run', 'hike',
                    'tennis', 'golf', 'fishing', 'boatFishing', 'camping', 'drone', 'dogWalk'];

  return {
    SPEC: SPEC, band: band, INDEX_KEYS: INDEX_KEYS, drone: drone, flightWind: flightWind, boatFishing: boatFishing, camping: camping,
    dogWalk: dogWalk,
    snorkel: snorkel, bike: bike, run: run, swim: swim, tennis: tennis,
    hike: hike, fishing: fishing, golf: golf, surf: surf, windsport: windsport
  };
})();
