/* sw.js — офлайн-оболочка и почасовое фоновое обновление.
   Periodic Background Sync будит приложение раз в час; уведомление
   зажигает экран устройства и показывает свежие цифры. */

var STATIC = 'barogram-static-v1';
var DATA = 'barogram-data-v1';
var CONFIG_KEY = 'https://barogram.local/config';
var LAST_KEY = 'https://barogram.local/last-forecast';

var SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/theme-eink.css', 'css/theme-night.css', 'css/theme-paper.css',
  'js/util.js', 'js/store.js', 'js/metrics.js', 'js/scale.js', 'js/weather.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(STATIC).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u)['catch'](function () { /* необязательный файл — не валим установку */ });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== STATIC && k !== DATA) { return caches['delete'](k); }
      return null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

function putJSON(key, obj) {
  return caches.open(DATA).then(function (c) {
    return c.put(new Request(key), new Response(JSON.stringify(obj), {
      headers: { 'Content-Type': 'application/json' }
    }));
  });
}

function getJSON(key) {
  return caches.open(DATA).then(function (c) {
    return c.match(new Request(key)).then(function (r) { return r ? r.json() : null; });
  })['catch'](function () { return null; });
}

self.addEventListener('message', function (e) {
  if (!e.data) { return; }
  if (e.data.type === 'config') {
    e.waitUntil(putJSON(CONFIG_KEY, {
      forecast: e.data.forecast, place: e.data.place || '', notify: !!e.data.notify
    }));
  } else if (e.data.type === 'refresh-now') {
    e.waitUntil(refreshData());
  }
});

function fmt1(v) {
  return (v === null || v === undefined) ? '—' : (Math.round(v * 10) / 10);
}

function notify(json, cfg) {
  if (!cfg.notify || !self.registration.showNotification) { return Promise.resolve(); }
  var c = (json && json.current) || {};
  var body = fmt1(c.temperature_2m) + '° · ветер ' + fmt1(c.wind_speed_10m) + ' м/с' +
             (c.uv_index === undefined ? '' : ' · УФ ' + fmt1(c.uv_index)) +
             (c.relative_humidity_2m === undefined ? '' : ' · влажн. ' + fmt1(c.relative_humidity_2m) + '%');
  return self.registration.showNotification(cfg.place ? ('Погода: ' + cfg.place) : 'Погода обновлена', {
    body: body,
    tag: 'barogram-hourly',
    renotify: true,
    silent: false,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png'
  });
}

function tellClients() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { list[i].postMessage({ type: 'sw-refreshed' }); }
  });
}

function refreshData() {
  return getJSON(CONFIG_KEY).then(function (cfg) {
    if (!cfg || !cfg.forecast) { return null; }
    return fetch(cfg.forecast, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) { throw new Error('http ' + r.status); }
      return caches.open(DATA).then(function (c) {
        return c.put(new Request(cfg.forecast), r.clone());
      }).then(function () { return r.json(); }).then(function (json) {
        return putJSON(LAST_KEY, { ts: Date.now(), json: json }).then(function () {
          return notify(json, cfg);
        }).then(tellClients);
      });
    })['catch'](function () { return null; });
  });
}

self.addEventListener('periodicsync', function (e) {
  if (e.tag === 'barogram-hourly') { e.waitUntil(refreshData()); }
});

self.addEventListener('sync', function (e) {
  if (e.tag === 'barogram-hourly') { e.waitUntil(refreshData()); }
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) { return list[i].focus(); }
    }
    return self.clients.openWindow('./');
  }));
});

/* Оболочка — из кеша (e-ink стартует медленно), данные — из сети с откатом в кеш. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url = req.url;
  var isApi = url.indexOf('open-meteo.com') !== -1;

  if (isApi) {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone();
      caches.open(DATA).then(function (c) { c.put(req, copy); });
      return r;
    })['catch'](function () {
      return caches.match(req).then(function (r) { return r || new Response('{}', {
        headers: { 'Content-Type': 'application/json' }
      }); });
    }));
    return;
  }

  if (url.indexOf(self.location.origin) === 0) {
    e.respondWith(caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(STATIC).then(function (c) { c.put(req, copy); });
        return r;
      })['catch'](function () { return cached; });
      return cached || net;
    }));
  }
});
