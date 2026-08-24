/* metrics.js — описание шкал интенсивности и расчёт индексов комфорта.
   Каждая метрика: min/max диапазон шкалы, число сегментов и цветовые зоны.
   Зона ищется как первая, у которой value <= to. */
var Metrics = (function () {

  function band(bands, v) {
    for (var i = 0; i < bands.length; i++) {
      if (v <= bands[i].to) { return bands[i]; }
    }
    return bands[bands.length - 1];
  }

  var SPEC = {
    temp: {
      title: 'Температура', unit: '°C', min: -20, max: 45, segments: 13, decimals: 1,
      bands: [
        { to: -10, cls: 'lv-deep', label: 'Сильный мороз' },
        { to: 0,   cls: 'lv-cold', label: 'Мороз' },
        { to: 8,   cls: 'lv-calm', label: 'Холодно' },
        { to: 15,  cls: 'lv-good', label: 'Прохладно' },
        { to: 24,  cls: 'lv-good', label: 'Комфортно' },
        { to: 29,  cls: 'lv-mid',  label: 'Тепло' },
        { to: 34,  cls: 'lv-warn', label: 'Жарко' },
        { to: 99,  cls: 'lv-bad',  label: 'Пекло' }
      ]
    },
    wind: {
      title: 'Ветер', unit: 'м/с', min: 0, max: 25, segments: 13, decimals: 1,
      bands: [
        { to: 1.5,  cls: 'lv-calm', label: 'Штиль' },
        { to: 3.3,  cls: 'lv-good', label: 'Лёгкий' },
        { to: 5.4,  cls: 'lv-good', label: 'Слабый' },
        { to: 7.9,  cls: 'lv-mid',  label: 'Умеренный' },
        { to: 10.7, cls: 'lv-warn', label: 'Свежий' },
        { to: 13.8, cls: 'lv-warn', label: 'Сильный' },
        { to: 17.1, cls: 'lv-bad',  label: 'Крепкий' },
        { to: 99,   cls: 'lv-crit', label: 'Шторм' }
      ]
    },
    uv: {
      title: 'УФ-индекс', unit: '', min: 0, max: 12, segments: 12, decimals: 1,
      bands: [
        { to: 2,  cls: 'lv-good', label: 'Низкий' },
        { to: 5,  cls: 'lv-mid',  label: 'Умеренный' },
        { to: 7,  cls: 'lv-warn', label: 'Высокий' },
        { to: 10, cls: 'lv-bad',  label: 'Очень высокий' },
        { to: 99, cls: 'lv-crit', label: 'Экстремальный' }
      ]
    },
    humidity: {
      title: 'Влажность', unit: '%', min: 0, max: 100, segments: 10, decimals: 0,
      bands: [
        { to: 25,  cls: 'lv-warn', label: 'Очень сухо' },
        { to: 35,  cls: 'lv-mid',  label: 'Сухо' },
        { to: 60,  cls: 'lv-good', label: 'Комфортно' },
        { to: 75,  cls: 'lv-mid',  label: 'Влажно' },
        { to: 90,  cls: 'lv-warn', label: 'Очень влажно' },
        { to: 100, cls: 'lv-bad',  label: 'Духота' }
      ]
    },
    clouds: {
      title: 'Облачность', unit: '%', min: 0, max: 100, segments: 10, decimals: 0,
      bands: [
        { to: 10,  cls: 'lv-good', label: 'Ясно' },
        { to: 30,  cls: 'lv-good', label: 'Малооблачно' },
        { to: 60,  cls: 'lv-mid',  label: 'Переменная' },
        { to: 85,  cls: 'lv-warn', label: 'Облачно' },
        { to: 100, cls: 'lv-bad',  label: 'Пасмурно' }
      ]
    },
    rain: {
      title: 'Осадки', unit: 'мм/ч', min: 0, max: 10, segments: 10, decimals: 1,
      bands: [
        { to: 0.05, cls: 'lv-good', label: 'Сухо' },
        { to: 0.5,  cls: 'lv-mid',  label: 'Морось' },
        { to: 2,    cls: 'lv-warn', label: 'Дождь' },
        { to: 6,    cls: 'lv-bad',  label: 'Сильный дождь' },
        { to: 99,   cls: 'lv-crit', label: 'Ливень' }
      ]
    },
    pressure: {
      title: 'Давление', unit: 'гПа', min: 980, max: 1040, segments: 12, decimals: 0,
      bands: [
        { to: 995,  cls: 'lv-bad',  label: 'Очень низкое' },
        { to: 1005, cls: 'lv-warn', label: 'Низкое' },
        { to: 1013, cls: 'lv-good', label: 'Ниже нормы' },
        { to: 1022, cls: 'lv-good', label: 'Норма' },
        { to: 1032, cls: 'lv-mid',  label: 'Высокое' },
        { to: 9999, cls: 'lv-warn', label: 'Очень высокое' }
      ]
    },
    waves: {
      title: 'Волны', unit: 'м', min: 0, max: 3, segments: 12, decimals: 2,
      bands: [
        { to: 0.15, cls: 'lv-calm', label: 'Зеркало' },
        { to: 0.35, cls: 'lv-good', label: 'Рябь' },
        { to: 0.6,  cls: 'lv-mid',  label: 'Небольшая волна' },
        { to: 1.0,  cls: 'lv-warn', label: 'Волнение' },
        { to: 1.8,  cls: 'lv-bad',  label: 'Сильное волнение' },
        { to: 99,   cls: 'lv-crit', label: 'Шторм' }
      ]
    },
    /* индексы комфорта: чем больше, тем лучше */
    snorkel: {
      title: 'Снорклинг', unit: '/10', min: 0, max: 10, segments: 10, decimals: 1,
      bands: [
        { to: 2,  cls: 'lv-crit', label: 'Не стоит' },
        { to: 4,  cls: 'lv-bad',  label: 'Плохо' },
        { to: 6,  cls: 'lv-warn', label: 'Так себе' },
        { to: 8,  cls: 'lv-mid',  label: 'Хорошо' },
        { to: 99, cls: 'lv-good', label: 'Отлично' }
      ]
    },
    bike: {
      title: 'Велосипед', unit: '/10', min: 0, max: 10, segments: 10, decimals: 1,
      bands: [
        { to: 2,  cls: 'lv-crit', label: 'Не стоит' },
        { to: 4,  cls: 'lv-bad',  label: 'Плохо' },
        { to: 6,  cls: 'lv-warn', label: 'Так себе' },
        { to: 8,  cls: 'lv-mid',  label: 'Хорошо' },
        { to: 99, cls: 'lv-good', label: 'Отлично' }
      ]
    }
  };

  /* ---- индексы комфорта ---- */

  function penalty(pairs, v) {
    for (var i = 0; i < pairs.length; i++) {
      if (v <= pairs[i][0]) { return pairs[i][1]; }
    }
    return pairs[pairs.length - 1][1];
  }

  /* Снорклинг: главное — волна и температура воды, дальше ветер, дождь, свет. */
  function snorkel(w) {
    if (w.waveHeight === null && w.seaTemp === null) { return null; }
    var p = 0, why = [];
    if (w.waveHeight !== null) {
      var pw = penalty([[0.15, 0], [0.3, 0.6], [0.5, 1.8], [0.8, 3.5], [1.2, 5.5], [99, 8]], w.waveHeight);
      p += pw; if (pw >= 1.8) { why.push('волна ' + w.waveHeight.toFixed(2) + ' м'); }
    }
    if (w.seaTemp !== null) {
      var pt = penalty([[17, 6], [20, 3.5], [22, 2], [24, 1], [26, 0.3], [99, 0]], w.seaTemp);
      p += pt; if (pt >= 1) { why.push('вода ' + Math.round(w.seaTemp) + '°'); }
    }
    if (w.wind !== null) {
      var pv = penalty([[3, 0], [5, 0.8], [8, 2], [11, 3.5], [99, 5]], w.wind);
      p += pv; if (pv >= 2) { why.push('ветер ' + Math.round(w.wind) + ' м/с'); }
    }
    if (w.rain !== null && w.rain > 0.3) { p += 1.2; why.push('дождь'); }
    if (w.clouds !== null && w.clouds > 80) { p += 0.6; why.push('мало света'); }
    if (w.uv !== null && w.uv >= 8) { p += 0.4; why.push('жёсткий УФ'); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  /* Оптимум для велосипеда 12..24 °C, дальше штраф в обе стороны. */
  function bikeTempPenalty(t) {
    if (t >= 12 && t <= 24) { return 0; }
    if (t > 24) { return penalty([[27, 1], [30, 2.5], [33, 4.5], [99, 6.5]], t); }
    if (t >= 8) { return 0.6; }
    if (t >= 3) { return 1.8; }
    if (t >= -3) { return 3.5; }
    return 5.5;
  }

  /* Велосипед: температура, ветер с порывами, дождь, УФ, духота. */
  function bike(w) {
    if (w.temp === null) { return null; }
    var p = 0, why = [];
    var pt = bikeTempPenalty(w.temp);
    p += pt; if (pt >= 1) { why.push(Math.round(w.temp) + '°'); }
    if (w.wind !== null) {
      var pv = penalty([[2, 0], [4, 0.6], [6, 1.5], [9, 3], [12, 4.5], [99, 6]], w.wind);
      p += pv; if (pv >= 1.5) { why.push('ветер ' + Math.round(w.wind) + ' м/с'); }
    }
    if (w.gust !== null && w.wind !== null && w.gust - w.wind > 5) { p += 0.8; why.push('порывы'); }
    if (w.rain !== null && w.rain > 0.1) { p += (w.rain > 1 ? 3 : 1.8); why.push('дождь'); }
    else if (w.rainProb !== null && w.rainProb >= 60) { p += 1.2; why.push('вероятен дождь'); }
    if (w.uv !== null && w.uv >= 8) { p += (w.uv >= 10 ? 1.4 : 0.8); why.push('УФ ' + Math.round(w.uv)); }
    if (w.humidity !== null && w.temp > 27 && w.humidity > 70) { p += 1; why.push('духота'); }
    return { value: U.clamp(10 - p, 0, 10), why: why };
  }

  return { SPEC: SPEC, band: band, snorkel: snorkel, bike: bike };
})();
