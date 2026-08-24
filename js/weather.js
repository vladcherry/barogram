/* weather.js — загрузка и нормализация данных Open-Meteo (без ключей и регистрации). */
var Weather = (function () {

  var FORECAST = 'https://api.open-meteo.com/v1/forecast';
  var MARINE = 'https://marine-api.open-meteo.com/v1/marine';
  var GEO = 'https://geocoding-api.open-meteo.com/v1/search';

  function q(base, params) {
    var parts = [], k;
    for (k in params) {
      if (params.hasOwnProperty(k)) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return base + '?' + parts.join('&');
  }

  function forecastUrl(lat, lon) {
    return q(FORECAST, {
      latitude: lat, longitude: lon,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,rain,' +
               'weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
      hourly: 'temperature_2m,precipitation,precipitation_probability,uv_index,pressure_msl,cloud_cover,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset',
      wind_speed_unit: 'ms', timezone: 'auto', past_days: 1, forecast_days: 2
    });
  }

  function marineUrl(lat, lon) {
    return q(MARINE, {
      latitude: lat, longitude: lon,
      current: 'wave_height,wave_period,wave_direction,sea_surface_temperature,wind_wave_height',
      hourly: 'wave_height,sea_surface_temperature',
      timezone: 'auto', forecast_days: 1
    });
  }

  function searchCity(name, ok, fail) {
    U.getJSON(q(GEO, { name: name, count: 6, language: 'ru', format: 'json' }), function (d) {
      ok(d.results || []);
    }, fail);
  }

  /* Приводим ответы к плоской модели, с которой работают карточки. */
  function normalize(f, m) {
    var c = (f && f.current) || {};
    var h = (f && f.hourly) || {};
    var now = U.isoLocalHour(new Date());

    var out = {
      ts: Date.now(),
      tz: f && f.timezone,
      temp: pick(c.temperature_2m),
      feels: pick(c.apparent_temperature),
      humidity: pick(c.relative_humidity_2m),
      clouds: pick(c.cloud_cover),
      rain: pick(c.precipitation),
      pressure: pick(c.pressure_msl),
      wind: pick(c.wind_speed_10m),
      gust: pick(c.wind_gusts_10m),
      windDir: pick(c.wind_direction_10m),
      code: pick(c.weather_code),
      isDay: pick(c.is_day),
      uv: pick(c.uv_index),
      rainProb: null,
      tMax: null, tMin: null, uvMax: null, rainSum: null,
      pressureSeries: [], tempSeries: [], rainSeries: [],
      pressureTrend3h: null,
      waveHeight: null, wavePeriod: null, seaTemp: null, sea: false
    };

    if (out.uv === null) { out.uv = pick(U.hourlyNow(h.time, h.uv_index, now)); }
    out.rainProb = pick(U.hourlyNow(h.time, h.precipitation_probability, now));

    var d = (f && f.daily) || {};
    if (d.temperature_2m_max) { out.tMax = pick(d.temperature_2m_max[dayIndex(d.time)]); }
    if (d.temperature_2m_min) { out.tMin = pick(d.temperature_2m_min[dayIndex(d.time)]); }
    if (d.uv_index_max) { out.uvMax = pick(d.uv_index_max[dayIndex(d.time)]); }
    if (d.precipitation_sum) { out.rainSum = pick(d.precipitation_sum[dayIndex(d.time)]); }

    var idx = nowIndex(h.time, now);
    if (idx >= 0) {
      out.pressureSeries = slice(h.pressure_msl, idx - 23, idx);
      out.tempSeries = slice(h.temperature_2m, idx, idx + 23);
      out.rainSeries = slice(h.precipitation, idx, idx + 23);
      if (h.pressure_msl && idx >= 3) {
        var p0 = h.pressure_msl[idx - 3], p1 = h.pressure_msl[idx];
        if (p0 !== null && p1 !== null && p0 !== undefined && p1 !== undefined) {
          out.pressureTrend3h = U.num(p1 - p0, 1);
        }
      }
    }

    if (m && m.current) {
      out.waveHeight = pick(m.current.wave_height);
      if (out.waveHeight === null) { out.waveHeight = pick(m.current.wind_wave_height); }
      out.wavePeriod = pick(m.current.wave_period);
      out.seaTemp = pick(m.current.sea_surface_temperature);
      out.sea = (out.waveHeight !== null || out.seaTemp !== null);
    }
    return out;
  }

  function pick(v) { return (v === null || v === undefined || isNaN(v)) ? null : Number(v); }

  function dayIndex(times) {
    /* при past_days=1 сегодня — второй элемент */
    if (!times) { return 0; }
    var today = U.isoLocalHour(new Date()).substring(0, 10);
    for (var i = 0; i < times.length; i++) { if (times[i] === today) { return i; } }
    return 0;
  }

  function nowIndex(times, nowIso) {
    if (!times) { return -1; }
    var idx = -1;
    for (var i = 0; i < times.length; i++) {
      if (times[i] <= nowIso) { idx = i; } else { break; }
    }
    return idx;
  }

  function slice(arr, from, to) {
    if (!arr) { return []; }
    var out = [], i;
    for (i = Math.max(0, from); i <= Math.min(arr.length - 1, to); i++) {
      out.push(arr[i] === undefined ? null : arr[i]);
    }
    return out;
  }

  /* Запасной, заведомо минимальный набор полей: если сервер не примет
     расширенные параметры, приложение всё равно покажет погоду. */
  function fallbackUrl(lat, lon) {
    return q(FORECAST, {
      latitude: lat, longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,' +
               'pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation,uv_index,pressure_msl',
      wind_speed_unit: 'ms', timezone: 'auto', forecast_days: 1
    });
  }

  function withMarine(f, lat, lon, ok) {
    U.getJSON(marineUrl(lat, lon), function (m) { ok(normalize(f, m)); },
                                   function () { ok(normalize(f, null)); });
  }

  /* Грузим прогноз и (по возможности) море; море не обязательно — вглубь суши его нет. */
  function load(lat, lon, ok, fail) {
    U.getJSON(forecastUrl(lat, lon), function (f) {
      withMarine(f, lat, lon, ok);
    }, function () {
      U.getJSON(fallbackUrl(lat, lon), function (f) {
        withMarine(f, lat, lon, ok);
      }, fail);
    });
  }

  /* Демо-данные: чтобы посмотреть вёрстку без сети (index.html?demo=1). */
  function demo() {
    var i, press = [], temps = [], rains = [];
    for (i = 0; i < 24; i++) {
      press.push(1012 + Math.sin(i / 3.4) * 5 - i * 0.12);
      temps.push(21 + Math.sin((i - 4) / 3.8) * 6);
      rains.push(i > 14 && i < 19 ? (i - 14) * 0.35 : 0);
    }
    return {
      ts: Date.now(), tz: 'demo', temp: 26.4, feels: 28.1, humidity: 64, clouds: 35,
      rain: 0.2, pressure: 1008, wind: 6.2, gust: 11.4, windDir: 220, code: 2, isDay: 1,
      uv: 6.8, rainProb: 35, tMax: 29.3, tMin: 19.8, uvMax: 8.1, rainSum: 1.8,
      pressureSeries: press, tempSeries: temps, rainSeries: rains, pressureTrend3h: -1.8,
      waveHeight: 0.42, wavePeriod: 4.1, seaTemp: 24.3, sea: true
    };
  }

  return { load: load, demo: demo, normalize: normalize, searchCity: searchCity, forecastUrl: forecastUrl, marineUrl: marineUrl };
})();
