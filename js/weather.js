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
      /* The hourly block carries every reading a comfort index weighs, so the
         same maths can be run hour by hour for the outlook. The wind at height
         is hourly-only anyway — Open-Meteo has no such field in "current". */
      hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,' +
              'precipitation_probability,weather_code,cloud_cover,pressure_msl,visibility,uv_index,is_day,' +
              'wind_speed_10m,wind_gusts_10m,wind_direction_10m,' +
              'wind_speed_80m,wind_speed_120m,wind_speed_180m,' +
              'wind_direction_80m,wind_direction_120m,wind_direction_180m',
      daily: 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset',
      wind_speed_unit: 'ms', timezone: 'auto', past_days: 1, forecast_days: 2
    });
  }

  function marineUrl(lat, lon) {
    return query(MARINE, {
      latitude: lat, longitude: lon,
      current: 'wave_height,wave_period,wave_direction,sea_surface_temperature,wind_wave_height',
      hourly: 'wave_height,sea_surface_temperature',
      timezone: 'auto', forecast_days: 2
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
  var POLLEN = ['alder_pollen', 'birch_pollen', 'grass_pollen',
                'mugwort_pollen', 'olive_pollen', 'ragweed_pollen'];

  function airUrl(lat, lon) {
    return query(AIR, {
      latitude: lat, longitude: lon,
      current: 'european_aqi,pm2_5,pm10,' + POLLEN.join(','),
      hourly: 'european_aqi,pm2_5,' + POLLEN.join(','),
      timezone: 'auto', forecast_days: 2
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
    var total = null, i, v;
    for (i = 0; i < POLLEN.length; i++) {
      v = pick(current[POLLEN[i]]);
      if (v !== null) { total = (total === null ? 0 : total) + v; }
    }
    return total;
  }

  function totalPollenAt(hourly, idx) {
    var total = null, i, v;
    if (!hourly || idx === undefined || idx < 0) { return null; }
    for (i = 0; i < POLLEN.length; i++) {
      v = at(hourly[POLLEN[i]], idx);
      if (v !== null) { total = (total === null ? 0 : total) + v; }
    }
    return total;
  }

  function at(arr, idx) {
    if (!arr || idx === undefined || idx < 0 || arr[idx] === undefined) { return null; }
    return pick(arr[idx]);
  }

  /* Endpoints answer on their own time arrays, so the hours are matched by the
     timestamp rather than by position. */
  function indexByTime(times) {
    var map = {}, i;
    if (!times) { return map; }
    for (i = 0; i < times.length; i++) { map[times[i]] = i; }
    return map;
  }

  /* ---- the hourly frames ----
     One snapshot per hour, shaped exactly like the current-conditions record,
     so every comfort index in metrics.js can be run against an hour of the
     forecast without knowing that it is not now. That is the whole trick: the
     outlook and the cards cannot disagree, because they are the same maths. */
  var HOURS_AHEAD = 24;

  function buildFrames(forecast, marine, air, out) {
    var hourly = (forecast && forecast.hourly) || {};
    var daily = (forecast && forecast.daily) || {};
    var marineHours = (marine && marine.hourly) || {};
    var airHours = (air && air.hourly) || {};
    if (!hourly.time || !hourly.time.length) { return []; }

    var nowIso = U.isoLocalHour(new Date());
    var start = hourIndex(hourly.time, nowIso);
    if (start < 0) { start = 0; }
    var marineAt = indexByTime(marineHours.time);
    var airAt = indexByTime(airHours.time);
    var day = todayIndex(daily.time);
    var tempMin = (daily.temperature_2m_min) ? pick(daily.temperature_2m_min[day]) : null;

    var frames = [], i, t, mi, ai, frame, before;
    for (i = start; i < hourly.time.length && frames.length < HOURS_AHEAD; i++) {
      t = hourly.time[i];
      mi = marineAt[t];
      ai = airAt[t];
      frame = {
        t: t,
        hour: Number(String(t).substring(11, 13)),
        temp: at(hourly.temperature_2m, i),
        feels: at(hourly.apparent_temperature, i),
        humidity: at(hourly.relative_humidity_2m, i),
        dewPoint: at(hourly.dew_point_2m, i),
        clouds: at(hourly.cloud_cover, i),
        rain: at(hourly.precipitation, i),
        rainProb: at(hourly.precipitation_probability, i),
        pressure: at(hourly.pressure_msl, i),
        wind: at(hourly.wind_speed_10m, i),
        gust: at(hourly.wind_gusts_10m, i),
        windDir: at(hourly.wind_direction_10m, i),
        wind80: at(hourly.wind_speed_80m, i),
        wind120: at(hourly.wind_speed_120m, i),
        wind180: at(hourly.wind_speed_180m, i),
        windDir80: at(hourly.wind_direction_80m, i),
        windDir120: at(hourly.wind_direction_120m, i),
        windDir180: at(hourly.wind_direction_180m, i),
        uv: at(hourly.uv_index, i),
        code: at(hourly.weather_code, i),
        isDay: at(hourly.is_day, i),
        visibility: null,
        waveHeight: at(marineHours.wave_height, mi),
        seaTemp: at(marineHours.sea_surface_temperature, mi),
        airQuality: at(airHours.european_aqi, ai),
        pm25: at(airHours.pm2_5, ai),
        pollen: totalPollenAt(airHours, ai),
        tempMin: tempMin,
        pressureTrend3h: null
      };
      var vis = at(hourly.visibility, i);
      frame.visibility = (vis === null) ? null : U.num(vis / 1000, 1);
      before = at(hourly.pressure_msl, i - 3);
      if (before !== null && frame.pressure !== null) {
        frame.pressureTrend3h = U.num(frame.pressure - before, 1);
      }
      frames.push(frame);
    }
    return frames;
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
      wind80: null, wind120: null, wind180: null,
      windDir80: null, windDir120: null, windDir180: null,
      airQuality: null, pm25: null, pm10: null, pollen: null,
      /* One snapshot per hour for the next day, for the outlook. */
      frames: []
    };

    var vis = pick(U.hourlyNow(hourly.time, hourly.visibility, nowIso));
    out.visibility = (vis === null) ? null : U.num(vis / 1000, 1);

    /* The wind profile: the same hour, one row per height above the ground. */
    out.wind80 = pick(U.hourlyNow(hourly.time, hourly.wind_speed_80m, nowIso));
    out.wind120 = pick(U.hourlyNow(hourly.time, hourly.wind_speed_120m, nowIso));
    out.wind180 = pick(U.hourlyNow(hourly.time, hourly.wind_speed_180m, nowIso));
    out.windDir80 = pick(U.hourlyNow(hourly.time, hourly.wind_direction_80m, nowIso));
    out.windDir120 = pick(U.hourlyNow(hourly.time, hourly.wind_direction_120m, nowIso));
    out.windDir180 = pick(U.hourlyNow(hourly.time, hourly.wind_direction_180m, nowIso));

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

    out.frames = buildFrames(forecast, marine, air, out);
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
  /* Demo frames: a day that starts hot and windy and cools off in the evening,
     so every band of the outlook has something to show. */
  function demoFrames(startHour) {
    var frames = [], i, h, warmth, gust;
    for (i = 0; i < 24; i++) {
      h = (startHour + i) % 24;
      warmth = 24 + 7 * Math.cos((h - 15) / 24 * 2 * Math.PI);
      gust = 4 + 4 * Math.max(0, Math.cos((h - 14) / 24 * 2 * Math.PI));
      frames.push({
        t: 'demo-' + h, hour: h,
        temp: U.num(warmth, 1), feels: U.num(warmth + 1.6, 1),
        humidity: Math.round(70 - (warmth - 20) * 2),
        dewPoint: U.num(warmth - 8, 1),
        clouds: (h > 12 && h < 18) ? 60 : 25,
        rain: (h === 16 || h === 17) ? 0.9 : 0,
        rainProb: (h > 14 && h < 19) ? 60 : 15,
        pressure: U.num(1010 - i * 0.1, 1),
        wind: U.num(gust, 1), gust: U.num(gust + 4, 1), windDir: 220,
        wind80: U.num(gust * 1.5, 1), wind120: U.num(gust * 1.7, 1), wind180: U.num(gust * 1.9, 1),
        windDir80: 225, windDir120: 230, windDir180: 235,
        uv: (h >= 8 && h <= 18) ? U.num(8 * Math.cos((h - 13) / 12 * Math.PI), 1) : 0,
        code: (h === 16 || h === 17) ? 61 : 2, isDay: (h >= 6 && h <= 20) ? 1 : 0,
        visibility: 24, waveHeight: 0.42, seaTemp: 24.3,
        airQuality: 32, pm25: 8.4, pollen: 21,
        tempMin: 19.8, pressureTrend3h: -1.8
      });
    }
    return frames;
  }

  /* The demo record and its first frame describe the same hour, so the cards and
     the outlook agree in the demo exactly as they do on real data. */
  function demo() {
    var record = demoRecord();
    var first = record.frames[0], k;
    if (first) {
      for (k in first) {
        if (first.hasOwnProperty(k) && record[k] !== undefined && k !== 'frames') {
          first[k] = record[k];
        }
      }
    }
    return record;
  }

  function demoRecord() {
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
      wind80: 9.4, wind120: 10.8, wind180: 12.1,
      windDir80: 228, windDir120: 235, windDir180: 240,
      airQuality: 32, pm25: 8.4, pm10: 14.2, pollen: 21,
      frames: demoFrames(new Date().getHours())
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
