/* sw.js — offline shell and hourly background refresh.
   Periodic Background Sync wakes the app once an hour; the notification it
   posts is what lights up the device screen with fresh numbers. */

var STATIC_CACHE = 'barogram-static-v7';
var DATA_CACHE = 'barogram-data-v1';
var CONFIG_KEY = 'https://barogram.local/config';
var LAST_KEY = 'https://barogram.local/last-forecast';
var SYNC_TAG = 'barogram-hourly';

var SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/theme-eink.css', 'css/theme-night.css', 'css/theme-paper.css',
  'css/theme-tiles.css', 'css/compact.css',
  'js/i18n.js', 'js/util.js', 'js/store.js', 'js/metrics.js', 'js/icons.js', 'js/scale.js',
  'js/detail.js',
  'js/weather.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
    return Promise.all(SHELL.map(function (url) {
      /* one optional file must not fail the whole install */
      return cache.add(url)['catch'](function () { return null; });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      if (key !== STATIC_CACHE && key !== DATA_CACHE) { return caches['delete'](key); }
      return null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

function putJSON(key, value) {
  return caches.open(DATA_CACHE).then(function (cache) {
    return cache.put(new Request(key), new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' }
    }));
  });
}

function readJSON(key) {
  return caches.open(DATA_CACHE).then(function (cache) {
    return cache.match(new Request(key)).then(function (res) { return res ? res.json() : null; });
  })['catch'](function () { return null; });
}

/* The page owns the language, so it hands over ready-made notification strings. */
self.addEventListener('message', function (e) {
  if (!e.data) { return; }
  if (e.data.type === 'config') {
    e.waitUntil(putJSON(CONFIG_KEY, {
      forecast: e.data.forecast,
      notify: !!e.data.notify,
      strings: e.data.strings || {}
    }));
  } else if (e.data.type === 'refresh-now') {
    e.waitUntil(refreshData());
  }
});

function round1(v) {
  return (v === null || v === undefined) ? '—' : (Math.round(v * 10) / 10);
}

function notify(json, config) {
  if (!config.notify || !self.registration.showNotification) { return Promise.resolve(); }
  var current = (json && json.current) || {};
  var s = config.strings || {};
  var body = round1(current.temperature_2m) + '° · ' + (s.wind || 'wind') + ' ' +
             round1(current.wind_speed_10m) + ' m/s';
  if (current.uv_index !== undefined) {
    body += ' · ' + (s.uv || 'UV') + ' ' + round1(current.uv_index);
  }
  if (current.relative_humidity_2m !== undefined) {
    body += ' · ' + (s.humidity || 'humidity') + ' ' + round1(current.relative_humidity_2m) + '%';
  }
  return self.registration.showNotification(s.title || 'Weather updated', {
    body: body,
    tag: SYNC_TAG,
    renotify: true,
    silent: false,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png'
  });
}

function tellClients() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) { clients[i].postMessage({ type: 'refreshed' }); }
  });
}

function refreshData() {
  return readJSON(CONFIG_KEY).then(function (config) {
    if (!config || !config.forecast) { return null; }
    return fetch(config.forecast, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) { throw new Error('http ' + res.status); }
      return caches.open(DATA_CACHE).then(function (cache) {
        return cache.put(new Request(config.forecast), res.clone());
      }).then(function () {
        return res.json();
      }).then(function (json) {
        return putJSON(LAST_KEY, { ts: Date.now(), json: json }).then(function () {
          return notify(json, config);
        }).then(tellClients);
      });
    })['catch'](function () { return null; });
  });
}

self.addEventListener('periodicsync', function (e) {
  if (e.tag === SYNC_TAG) { e.waitUntil(refreshData()); }
});

self.addEventListener('sync', function (e) {
  if (e.tag === SYNC_TAG) { e.waitUntil(refreshData()); }
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) {
      if ('focus' in clients[i]) { return clients[i].focus(); }
    }
    return self.clients.openWindow('./');
  }));
});

/* Shell from cache (e-ink devices start slowly), data from network with a cache fallback. */
self.addEventListener('fetch', function (e) {
  var request = e.request;
  if (request.method !== 'GET') { return; }

  if (request.url.indexOf('open-meteo.com') !== -1) {
    e.respondWith(fetch(request).then(function (res) {
      var copy = res.clone();
      caches.open(DATA_CACHE).then(function (cache) { cache.put(request, copy); });
      return res;
    })['catch'](function () {
      return caches.match(request).then(function (cached) {
        return cached || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      });
    }));
    return;
  }

  if (request.url.indexOf(self.location.origin) === 0) {
    e.respondWith(caches.match(request).then(function (cached) {
      var network = fetch(request).then(function (res) {
        var copy = res.clone();
        caches.open(STATIC_CACHE).then(function (cache) { cache.put(request, copy); });
        return res;
      })['catch'](function () { return cached; });
      return cached || network;
    }));
  }
});
