/* weather.js — loading and normalising Open-Meteo data (no key, no signup). */
var Weather = (function () {

  var FORECAST = 'https://api.open-meteo.com/v1/forecast';
  var MARINE = 'https://marine-api.open-meteo.com/v1/marine';
  var GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';
  var AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  function query(base, params) {
    var parts = [], k;
    for (k in params) {
      if (params.hasOwnProperty(k)) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return base + '?' + parts.join('&');
  }

  function forecastUrl(lat, lon) {
    return query(FORECAST, {
      latitude: lat, longitude: lon,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,is_day,precipitation,rain,' +
               'weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
      hourly: 'temperature_2m,precipitation,precipitation_probability,uv_index,pressure_msl,cloud_cover,' +
              'wind_speed_10m,visibility',
      daily: 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset',
      wind_speed_unit: 'ms', timezone: 'auto', past_days: 1, forecast_days: 2
    });
  }

  function marineUrl(lat, lon) {
    return query(MARINE, {
      latitude: lat, longitude: lon,
      current: 'wave_height,wave_period,wave_direction,sea_surface_temperature,wind_wave_height',
      hourly: 'wave_height,sea_surface_temperature',
      timezone: 'auto', forecast_days: 1
    });
  }

  /* Deliberately minimal request: if the server rejects the extended parameter
     set, the app still has something to show. */
  function fallbackUrl(lat, lon) {
    return query(FORECAST, {
      latitude: lat, longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,' +
               'pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation,uv_index,pressure_msl',
      wind_speed_unit: 'ms', timezone: 'auto', forecast_days: 1
    });
  }

  /* Air quality and pollen come from a separate Open-Meteo endpoint. */
  function airUrl(lat, lon) {
    return query(AIR, {
      latitude: lat, longitude: lon,
      current: 'european_aqi,pm2_5,pm10,alder_pollen,birch_pollen,grass_pollen,' +
               'mugwort_pollen,olive_pollen,ragweed_pollen',
      timezone: 'auto'
    });
  }

  function searchCity(name, ok, fail) {
    var lang = I18N.lang();
    U.getJSON(query(GEOCODING, { name: name, count: 6, language: lang, format: 'json' }), function (data) {
      ok(data.results || []);
    }, fail);
  }

  function pick(v) { return (v === null || v === undefined || isNaN(v)) ? null : Number(v); }

  /* With past_days=1 in the request, "today" is not the first daily entry. */
  function todayIndex(times) {
    if (!times) { return 0; }
    var today = U.isoLocalHour(new Date()).substring(0, 10);
    for (var i = 0; i < times.length; i++) { if (times[i] === today) { return i; } }
    return 0;
  }

  function hourIndex(times, nowIso) {
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

  /* Pollen is reported per species; the cards want one number to react to. */
  function totalPollen(current) {
    var keys = ['alder_pollen', 'birch_pollen', 'grass_pollen',
                'mugwort_pollen', 'olive_pollen', 'ragweed_pollen'];
    var total = null, i, v;
    for (i = 0; i < keys.length; i++) {
      v = pick(current[keys[i]]);
      if (v !== null) { total = (total === null ? 0 : total) + v; }
    }
    return total;
  }

  /* Flatten every response into the single model the cards render from. */
  function normalize(forecast, marine, air) {
    var cur = (forecast && forecast.current) || {};
    var hourly = (forecast && forecast.hourly) || {};
    var daily = (forecast && forecast.daily) || {};
    var nowIso = U.isoLocalHour(new Date());

    var out = {
      ts: Date.now(),
      timezone: forecast && forecast.timezone,
      temp: pick(cur.temperature_2m),
      feels: pick(cur.apparent_temperature),
      humidity: pick(cur.relative_humidity_2m),
      clouds: pick(cur.cloud_cover),
      rain: pick(cur.precipitation),
      pressure: pick(cur.pressure_msl),
      wind: pick(cur.wind_speed_10m),
      gust: pick(cur.wind_gusts_10m),
      windDir: pick(cur.wind_direction_10m),
      code: pick(cur.weather_code),
      isDay: pick(cur.is_day),
      uv: pick(cur.uv_index),
      rainProb: null,
      tempMax: null, tempMin: null, uvMax: null, rainSum: null,
      pressureSeries: [], tempSeries: [], rainSeries: [],
      pressureTrend3h: null,
      waveHeight: null, wavePeriod: null, seaTemp: null, hasSea: false,
      dewPoint: pick(cur.dew_point_2m),
      visibility: null,
      airQuality: null, pm25: null, pm10: null, pollen: null
    };

    var vis = pick(U.hourlyNow(hourly.time, hourly.visibility, nowIso));
    out.visibility = (vis === null) ? null : U.num(vis / 1000, 1);

    if (out.uv === null) { out.uv = pick(U.hourlyNow(hourly.time, hourly.uv_index, nowIso)); }
    out.rainProb = pick(U.hourlyNow(hourly.time, hourly.precipitation_probability, nowIso));

    var day = todayIndex(daily.time);
    if (daily.temperature_2m_max) { out.tempMax = pick(daily.temperature_2m_max[day]); }
    if (daily.temperature_2m_min) { out.tempMin = pick(daily.temperature_2m_min[day]); }
    if (daily.uv_index_max) { out.uvMax = pick(daily.uv_index_max[day]); }
    if (daily.precipitation_sum) { out.rainSum = pick(daily.precipitation_sum[day]); }

    var idx = hourIndex(hourly.time, nowIso);
    if (idx >= 0) {
      out.pressureSeries = slice(hourly.pressure_msl, idx - 23, idx);
      out.tempSeries = slice(hourly.temperature_2m, idx, idx + 23);
      out.rainSeries = slice(hourly.precipitation, idx, idx + 23);
      if (hourly.pressure_msl && idx >= 3) {
        var before = hourly.pressure_msl[idx - 3];
        var now = hourly.pressure_msl[idx];
        if (before !== null && before !== undefined && now !== null && now !== undefined) {
          out.pressureTrend3h = U.num(now - before, 1);
        }
      }
    }

    if (marine && marine.current) {
      out.waveHeight = pick(marine.current.wave_height);
      if (out.waveHeight === null) { out.waveHeight = pick(marine.current.wind_wave_height); }
      out.wavePeriod = pick(marine.current.wave_period);
      out.seaTemp = pick(marine.current.sea_surface_temperature);
      out.hasSea = (out.waveHeight !== null || out.seaTemp !== null);
    }

    if (air && air.current) {
      out.airQuality = pick(air.current.european_aqi);
      out.pm25 = pick(air.current.pm2_5);
      out.pm10 = pick(air.current.pm10);
      out.pollen = totalPollen(air.current);
    }
    return out;
  }

  /* Marine and air quality are both optional: inland there are no waves, and the
     air endpoint can be missing for a point. Neither may block the forecast. */
  function withExtras(forecast, lat, lon, ok) {
    U.getJSON(marineUrl(lat, lon), function (marine) {
      withAir(forecast, marine, lat, lon, ok);
    }, function () {
      withAir(forecast, null, lat, lon, ok);
    });
  }

  function withAir(forecast, marine, lat, lon, ok) {
    U.getJSON(airUrl(lat, lon),
      function (air) { ok(normalize(forecast, marine, air)); },
      function () { ok(normalize(forecast, marine, null)); });
  }

  /* Forecast first, marine data if the point has any — inland it simply has none. */
  function load(lat, lon, ok, fail) {
    U.getJSON(forecastUrl(lat, lon), function (forecast) {
      withExtras(forecast, lat, lon, ok);
    }, function () {
      U.getJSON(fallbackUrl(lat, lon), function (forecast) {
        withExtras(forecast, lat, lon, ok);
      }, fail);
    });
  }

  /* Demo data, so the layout can be reviewed without network: index.html?demo=1 */
  function demo() {
    var i, pressure = [], temps = [], rains = [];
    for (i = 0; i < 24; i++) {
      pressure.push(1012 + Math.sin(i / 3.4) * 5 - i * 0.12);
      temps.push(21 + Math.sin((i - 4) / 3.8) * 6);
      rains.push(i > 14 && i < 19 ? (i - 14) * 0.35 : 0);
    }
    return {
      ts: Date.now(), timezone: 'demo', temp: 26.4, feels: 28.1, humidity: 64, clouds: 35,
      rain: 0.2, pressure: 1008, wind: 6.2, gust: 11.4, windDir: 220, code: 2, isDay: 1,
      uv: 6.8, rainProb: 35, tempMax: 29.3, tempMin: 19.8, uvMax: 8.1, rainSum: 1.8,
      pressureSeries: pressure, tempSeries: temps, rainSeries: rains, pressureTrend3h: -1.8,
      waveHeight: 0.42, wavePeriod: 4.1, seaTemp: 24.3, hasSea: true,
      dewPoint: 18.6, visibility: 24.0,
      airQuality: 32, pm25: 8.4, pm10: 14.2, pollen: 21
    };
  }

  /* A snapshot cached by an older build can be missing fields this one reads.
     The comfort maths tests for null, and undefined is not null, so anything
     absent is filled in from the shape of the demo record. */
  function fill(data) {
    if (!data) { return data; }
    var shape = demo(), k;
    for (k in shape) {
      if (!shape.hasOwnProperty(k) || data[k] !== undefined) { continue; }
      data[k] = (Object.prototype.toString.call(shape[k]) === '[object Array]') ? [] : null;
    }
    return data;
  }

  return {
    load: load, demo: demo, normalize: normalize, searchCity: searchCity, fill: fill,
    forecastUrl: forecastUrl, marineUrl: marineUrl
  };
})();
