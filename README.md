# Barogram — weather with intensity scales

A weather PWA for the **PocketBook Verse Pro Color** e-reader and for ordinary
phones. Next to every number there is an intensity scale, so you see not just
"6.2 m/s" but where that value sits between dead calm and a storm.

Four designs ship with the app and are cycled with the grid icon in the top bar.

| 1 · E-Ink | 2 · Tiles | 3 · Night | 4 · Analytics |
|---|---|---|---|
| ![](docs/design-1-eink.png) | ![](docs/design-4-tiles.png) | ![](docs/design-2-night.png) | ![](docs/design-3-paper.png) |

## Designs

1. **E-Ink** (`eink`) — for the Kaleido screen of the Verse Pro Color: white
   background, 3 px black borders, oversized numbers, the scale drawn as large
   outlined blocks. No shadows, gradients or animation — half-tones smear on
   e-ink and repaints are expensive. Colour appears only inside the scales,
   where Kaleido actually shows it.
2. **Tiles** (`tiles`) — all ten readings on one 6" screen with no scrolling:
   a two-column grid (three columns from 620 px). Inside each tile the number is
   as large as the cell allows and owns the left half over its full height, with
   the unit beneath it; the title, the band label and one clipped line of detail
   sit in the top right, and the comfort slider runs along the bottom right. The
   24-hour charts are dropped here — they are what pushes the last tiles below
   the fold.
3. **Night** (`night`) — for phones: two tiles per row, temperature across the
   full width, 18 px corners, a thin solid scale bar. The dark background is
   easy on an OLED panel and on the eyes at night.
4. **Analytics** (`paper`) — light paper, a single column of dense rows: label,
   large number, a full-width ruler-like scale and a coloured band marker down
   the left edge of the card. Maximum data per screen.

The chosen design is remembered. `?theme=tiles` forces one, which is handy for
screenshots.

The top bar holds only the clock and three icon buttons — cycle design, refresh,
place — so the readings get the rest of the screen. Their labels live in
`title`/`aria-label` and translate with the interface; after switching design the
footer names the one that was picked.

A full-screen browser (the way a reader is usually set up) hides its own address
bar and reload button, so the **Place** panel carries them instead: *Reload page*
reloads, *Update app* unregisters the service worker, drops its caches and
reloads — the reliable way to pick up a new build with no browser chrome around.
The version string next to them shows which build is actually running.

## What it shows

Every reading comes with a number, a scale with coloured bands, a marker at the
current value and a verbal band label.

| Card | Scale | Bands |
|---|---|---|
| Temperature | −20…45 °C | severe frost → comfortable → scorching |
| Wind | 0…25 m/s | calm → moderate → storm (Beaufort boundaries) |
| Precipitation | 0…10 mm/h | dry → drizzle → downpour, plus probability and 24 h total |
| Cloud cover | 0…100 % | clear → overcast, plus the decoded weather code |
| UV index | 0…12 | low → extreme (WHO boundaries) |
| Humidity | 0…100 % | very dry → 40–60 % comfort range → muggy |
| Pressure | 980…1040 hPa | plus mmHg, the 3-hour tendency and a **24 h barogram** |
| Waves | 0…3 m | glassy → storm, with wave period and water temperature |
| Snorkeling | index 0…10 | from waves, water temperature, wind, rain and light |
| Cycling | index 0…10 | from temperature, wind with gusts, rain, UV and mugginess |

The comfort indices live in `js/metrics.js` (`snorkel`, `bike`): each condition
adds a penalty, the penalties are subtracted from 10, and the card lists what
actually cost the points ("downsides: waves 0.42 m, wind 6 m/s").

Temperature and precipitation carry 24-hour forecast bars; pressure carries the
barogram of the past 24 hours.

## Data

[Open-Meteo](https://open-meteo.com/) — no key, no signup:

* `api.open-meteo.com/v1/forecast` — current values, hourly series, daily extremes;
* `marine-api.open-meteo.com/v1/marine` — waves and water temperature (inland
  there is none, and the waves and snorkeling cards say so plainly);
* `geocoding-api.open-meteo.com/v1/search` — city lookup by name.

The place comes either from the Geolocation API ("My location") or from the city
search. Coordinates and the last weather snapshot are kept in `localStorage`, so
the app opens with data even with no network.

## Hourly updates, minute-accurate clock

* **The clock** re-renders on the minute boundary (a `setTimeout` to the next
  `:00` second, so it never drifts), not every 60 s from launch.
* **The weather** refreshes 20 seconds past every hour — Open-Meteo publishes
  hourly values, more often buys nothing.
* **Background.** The "Background updates" button asks for notification
  permission and registers Periodic Background Sync (`sw.js`, tag
  `barogram-hourly`, `minInterval` one hour). When it fires, the service worker
  pulls a fresh forecast, caches it and posts a notification — and that
  notification is what wakes the device screen.
* **Coming back to the app.** On `visibilitychange`, data older than 30 minutes
  is re-fetched immediately.
* **Keep screen on** uses `navigator.wakeLock` for desk-clock mode.

Being honest about the limits: a web page can only wake a sleeping device
through the OS. Periodic Background Sync exists in Chromium browsers, only for
an installed PWA, and the browser decides how often to actually call it. The
stock PocketBook browser almost certainly does not support it; there the working
setup is the app kept open with the wake lock on, refreshing on the page's own
hourly timer.

## Language

All strings live in `js/i18n.js`. English is the source language; Russian,
Ukrainian and Spanish are locales on top of it, and any key a locale misses
falls back to English. The locale is picked from the browser, can be forced with
`?lang=uk`, is cycled with the language button in the **Place** panel and is
remembered. Dates, weekday names and the compass points are localised too.

## Running it

Any static server works (a service worker needs http(s) or localhost):

```bash
python3 -m http.server 8777
# then open http://localhost:8777/
```

To review the layout with no network: `http://localhost:8777/?demo=1`.

On a PocketBook: copy the folder onto the device and open `index.html` in the
browser, or host it anywhere over https (GitHub Pages is enough) and add it to
the home screen.

## Compatibility

The PocketBook browser is far older than a phone's, so the code deliberately
sticks to:

* plain ES5 — `var`, `function`, string concatenation, no arrow functions,
  classes or optional chaining;
* `XMLHttpRequest` instead of `fetch` (the service worker uses `fetch`, which
  exists wherever service workers do);
* CSS without custom properties and without `grid` — flexbox and explicit
  colours per theme;
* no bundler and no dependencies: files are included with plain `<script>` tags.

If the server rejects the extended parameter set, `js/weather.js` retries with a
minimal set of fields so the app still shows the weather.

## Layout

```
index.html              markup (one shell for all three designs)
css/base.css            structure and geometry
css/theme-eink.css      design 1
css/theme-night.css     design 3
css/theme-paper.css     design 4
css/theme-tiles.css     design 2
js/i18n.js              all user-facing strings: English source + ru/uk/es locales
js/util.js              helpers, XHR, formatting, weather codes
js/store.js             settings and cache in localStorage
js/metrics.js           scale bands and comfort-index maths
js/scale.js             scale, card and mini-chart rendering
js/weather.js           Open-Meteo requests and normalisation
js/app.js               screen, clock, schedule, background work
sw.js                   offline cache, hourly periodicsync, notifications
tools/make_icons.py     PNG icon generation with no third-party libraries
```
