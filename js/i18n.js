/* i18n.js — every user-facing string lives here. English is the source
   language, Russian is a locale on top of it. Locale is picked from the
   browser, can be overridden with ?lang=ru and is remembered afterwards. */
var I18N = (function () {

  var EN = {
    'app.title': 'Barogram — weather with intensity scales',

    'theme.eink': 'E-Ink',
    'theme.night': 'Night',
    'theme.paper': 'Analytics',

    'ui.design': 'Design: {name}',
    'ui.refresh': 'Refresh',
    'ui.place': 'Place',
    'ui.myLocation': 'My location',
    'ui.background': 'Background updates: {state}',
    'ui.keepScreen': 'Keep screen on: {state}',
    'ui.language': 'Language: {name}',
    'ui.on': 'on',
    'ui.off': 'off',
    'ui.cityPlaceholder': 'City (for example, Odesa)',
    'ui.find': 'Find',
    'ui.noPlace': 'No place selected',
    'ui.demoPlace': 'Demo mode',
    'ui.locating': 'Locating…',
    'ui.noData': 'No data yet. Tap "Refresh" or choose a place.',

    'time.never': 'no data yet',
    'time.justNow': 'updated just now',
    'time.minutes': 'updated {n} min ago',
    'time.hours': 'updated {n} h ago',
    'time.days': 'updated {n} d ago',

    'status.initial': 'Open-Meteo data. Hourly updates.',
    'status.updating': 'Updating…',
    'status.ok': 'Open-Meteo data · next update at the top of the hour',
    'status.failed': 'Update failed ({err}), showing last known data',
    'status.noPlace': 'No place selected — open "Place".',
    'status.demo': 'Demo data, no network used.',

    'hint.pickPlace': 'Choose a place: use the button below or search by name.',
    'hint.enterCity': 'Enter a city name.',
    'hint.searching': 'Searching…',
    'hint.nothingFound': 'Nothing found.',
    'hint.chooseCity': 'Pick a city:',
    'hint.searchFailed': 'Search failed: {err}',
    'hint.placeSet': 'Place: {name}',
    'hint.locating': 'Detecting coordinates…',
    'hint.geoOk': 'Coordinates received.',
    'hint.geoFailed': 'Could not detect the location ({err}).',
    'hint.geoUnsupported': 'Geolocation is unavailable, search by city name instead.',
    'hint.bgOff': 'Background notifications turned off.',
    'hint.bgOn': 'Hourly background updates enabled.',
    'hint.bgNoPermission': 'Without notification permission the screen cannot be woken up.',
    'hint.bgNoNotifications': 'Notifications are unavailable: updates run while the app is open.',
    'hint.swUnavailable': 'Service worker is unavailable: keep the app open, it refreshes itself.',
    'hint.syncUnsupported': 'Periodic background sync is not supported here. While the app is open it updates hourly.',
    'hint.syncRejected': 'The browser rejected background sync: {err}',
    'hint.syncPermission': 'Allow "periodic background sync" for the installed app.',
    'hint.wakeLockUnsupported': 'Wake Lock is not supported by this browser.',
    'hint.wakeLockRejected': 'Wake Lock rejected: {err}',

    'metric.temp': 'Temperature',
    'metric.wind': 'Wind',
    'metric.rain': 'Precipitation',
    'metric.clouds': 'Cloud cover',
    'metric.uv': 'UV index',
    'metric.humidity': 'Humidity',
    'metric.pressure': 'Pressure',
    'metric.waves': 'Waves',
    'metric.snorkel': 'Snorkeling',
    'metric.bike': 'Cycling',

    'unit.temp': '°C',
    'unit.wind': 'm/s',
    'unit.rain': 'mm/h',
    'unit.percent': '%',
    'unit.pressure': 'hPa',
    'unit.wave': 'm',
    'unit.index': '/10',

    'card.index': 'index',

    'note.temp': 'feels like {feels}°',
    'note.tempRange': 'feels like {feels}° · today {min}…{max}°',
    'note.wind': 'gusts {gust} m/s',
    'note.windDir': 'gusts {gust} m/s · {dir} ({deg}°)',
    'note.rain': 'probability {prob}',
    'note.rainSum': 'probability {prob} · {sum} mm over 24 h',
    'note.uvMax': "today's maximum {max}",
    'note.uvDefault': 'protection needed from UV 3 upwards',
    'note.humidity': 'comfort range 40–60%',
    'note.pressure': '{mmhg} mmHg',
    'note.pressureTrend': '{mmhg} mmHg · {trend}',
    'note.waves': 'period {period} s · water {temp}°',
    'note.noSea': 'no marine data for this point',
    'note.needSea': 'marine data required',
    'note.noData': 'no data',
    'note.noIssues': 'no downsides',
    'note.why': 'downsides: {list}',

    'spark.temp': 'temperature, next 24 h',
    'spark.rain': 'precipitation, next 24 h',
    'spark.pressure': 'barogram, past 24 h',

    'trend.unit': 'hPa/3h',
    'trend.riseFast': 'rising fast {v}',
    'trend.rise': 'rising {v}',
    'trend.steady': 'steady {v}',
    'trend.fall': 'falling {v}',
    'trend.fallFast': 'falling fast {v}',

    'why.waves': 'waves {v} m',
    'why.water': 'water {v}°',
    'why.wind': 'wind {v} m/s',
    'why.rain': 'rain',
    'why.rainLikely': 'rain likely',
    'why.lowLight': 'low light',
    'why.harshUv': 'harsh UV',
    'why.temp': '{v}°',
    'why.gusts': 'gusts',
    'why.uv': 'UV {v}',
    'why.mugginess': 'mugginess',

    'band.temp.deepFrost': 'Severe frost',
    'band.temp.frost': 'Frost',
    'band.temp.cold': 'Cold',
    'band.temp.cool': 'Cool',
    'band.temp.comfort': 'Comfortable',
    'band.temp.warm': 'Warm',
    'band.temp.hot': 'Hot',
    'band.temp.scorching': 'Scorching',

    'band.wind.calm': 'Calm',
    'band.wind.light': 'Light air',
    'band.wind.gentle': 'Light breeze',
    'band.wind.moderate': 'Moderate',
    'band.wind.fresh': 'Fresh',
    'band.wind.strong': 'Strong',
    'band.wind.nearGale': 'Near gale',
    'band.wind.storm': 'Storm',

    'band.uv.low': 'Low',
    'band.uv.moderate': 'Moderate',
    'band.uv.high': 'High',
    'band.uv.veryHigh': 'Very high',
    'band.uv.extreme': 'Extreme',

    'band.humidity.veryDry': 'Very dry',
    'band.humidity.dry': 'Dry',
    'band.humidity.comfort': 'Comfortable',
    'band.humidity.humid': 'Humid',
    'band.humidity.veryHumid': 'Very humid',
    'band.humidity.muggy': 'Muggy',

    'band.clouds.clear': 'Clear',
    'band.clouds.few': 'Few clouds',
    'band.clouds.partly': 'Partly cloudy',
    'band.clouds.cloudy': 'Cloudy',
    'band.clouds.overcast': 'Overcast',

    'band.rain.dry': 'Dry',
    'band.rain.drizzle': 'Drizzle',
    'band.rain.rain': 'Rain',
    'band.rain.heavy': 'Heavy rain',
    'band.rain.downpour': 'Downpour',

    'band.pressure.veryLow': 'Very low',
    'band.pressure.low': 'Low',
    'band.pressure.belowNormal': 'Below normal',
    'band.pressure.normal': 'Normal',
    'band.pressure.high': 'High',
    'band.pressure.veryHigh': 'Very high',

    'band.waves.glassy': 'Glassy',
    'band.waves.ripple': 'Ripple',
    'band.waves.small': 'Small waves',
    'band.waves.choppy': 'Choppy',
    'band.waves.rough': 'Rough sea',
    'band.waves.storm': 'Storm',

    'band.index.avoid': 'Not worth it',
    'band.index.poor': 'Poor',
    'band.index.soso': 'So-so',
    'band.index.good': 'Good',
    'band.index.great': 'Great',

    'notify.title': 'Weather: {place}',
    'notify.titlePlain': 'Weather updated',
    'notify.wind': 'wind',
    'notify.uv': 'UV',
    'notify.humidity': 'humidity',

    'wmo.0': 'Clear', 'wmo.1': 'Mainly clear', 'wmo.2': 'Partly cloudy', 'wmo.3': 'Overcast',
    'wmo.45': 'Fog', 'wmo.48': 'Rime fog',
    'wmo.51': 'Light drizzle', 'wmo.53': 'Drizzle', 'wmo.55': 'Dense drizzle',
    'wmo.56': 'Freezing drizzle', 'wmo.57': 'Freezing drizzle',
    'wmo.61': 'Light rain', 'wmo.63': 'Rain', 'wmo.65': 'Heavy rain',
    'wmo.66': 'Freezing rain', 'wmo.67': 'Freezing rain',
    'wmo.71': 'Light snow', 'wmo.73': 'Snow', 'wmo.75': 'Heavy snow', 'wmo.77': 'Snow grains',
    'wmo.80': 'Rain showers', 'wmo.81': 'Rain showers', 'wmo.82': 'Violent showers',
    'wmo.85': 'Snow showers', 'wmo.86': 'Snow showers',
    'wmo.95': 'Thunderstorm', 'wmo.96': 'Thunderstorm with hail', 'wmo.99': 'Thunderstorm with hail',
    'wmo.unknown': 'code {code}',

    'date.months': 'January,February,March,April,May,June,July,August,September,October,November,December',
    'date.weekdays': 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    'date.format': '{month} {day}, {weekday}',
    'compass.points': 'N,NE,E,SE,S,SW,W,NW',

    'lang.en': 'English',
    'lang.ru': 'Русский'
  };

  var RU = {
    'app.title': 'Barogram — погода со шкалами интенсивности',

    'theme.eink': 'E-Ink',
    'theme.night': 'Тёмный',
    'theme.paper': 'Аналитика',

    'ui.design': 'Дизайн: {name}',
    'ui.refresh': 'Обновить',
    'ui.place': 'Место',
    'ui.myLocation': 'Моё местоположение',
    'ui.background': 'Фоновое обновление: {state}',
    'ui.keepScreen': 'Не гасить экран: {state}',
    'ui.language': 'Язык: {name}',
    'ui.on': 'вкл',
    'ui.off': 'выкл',
    'ui.cityPlaceholder': 'Город (например, Одесса)',
    'ui.find': 'Найти',
    'ui.noPlace': 'Место не выбрано',
    'ui.demoPlace': 'Демо-режим',
    'ui.locating': 'Определяем место…',
    'ui.noData': 'Нет данных. Нажмите «Обновить» или выберите место.',

    'time.never': 'нет данных',
    'time.justNow': 'обновлено только что',
    'time.minutes': 'обновлено {n} мин назад',
    'time.hours': 'обновлено {n} ч назад',
    'time.days': 'обновлено {n} дн назад',

    'status.initial': 'Данные Open-Meteo. Обновление раз в час.',
    'status.updating': 'Обновляем…',
    'status.ok': 'Данные Open-Meteo · следующее обновление в начале часа',
    'status.failed': 'Не вышло обновить ({err}), показаны последние данные',
    'status.noPlace': 'Место не выбрано — откройте «Место».',
    'status.demo': 'Демо-данные, сеть не используется.',

    'hint.pickPlace': 'Выберите место: кнопка ниже или поиск по названию.',
    'hint.enterCity': 'Введите название города.',
    'hint.searching': 'Ищем…',
    'hint.nothingFound': 'Ничего не найдено.',
    'hint.chooseCity': 'Выберите город:',
    'hint.searchFailed': 'Поиск не удался: {err}',
    'hint.placeSet': 'Место: {name}',
    'hint.locating': 'Определяем координаты…',
    'hint.geoOk': 'Координаты получены.',
    'hint.geoFailed': 'Не удалось определить место ({err}).',
    'hint.geoUnsupported': 'Геолокация недоступна, найдите город по названию.',
    'hint.bgOff': 'Фоновые уведомления выключены.',
    'hint.bgOn': 'Фоновое обновление раз в час включено.',
    'hint.bgNoPermission': 'Без разрешения на уведомления разбудить экран нельзя.',
    'hint.bgNoNotifications': 'Уведомления недоступны: обновление идёт, пока приложение открыто.',
    'hint.swUnavailable': 'Service Worker недоступен: держите приложение открытым, оно обновится само.',
    'hint.syncUnsupported': 'Фоновая синхронизация не поддерживается браузером. Пока приложение открыто, обновление идёт раз в час.',
    'hint.syncRejected': 'Браузер отклонил фоновую синхронизацию: {err}',
    'hint.syncPermission': 'Разрешите «периодическую фоновую синхронизацию» для установленного приложения.',
    'hint.wakeLockUnsupported': 'Wake Lock не поддерживается этим браузером.',
    'hint.wakeLockRejected': 'Wake Lock отклонён: {err}',

    'metric.temp': 'Температура',
    'metric.wind': 'Ветер',
    'metric.rain': 'Осадки',
    'metric.clouds': 'Облачность',
    'metric.uv': 'УФ-индекс',
    'metric.humidity': 'Влажность',
    'metric.pressure': 'Давление',
    'metric.waves': 'Волны',
    'metric.snorkel': 'Снорклинг',
    'metric.bike': 'Велосипед',

    'unit.wind': 'м/с',
    'unit.rain': 'мм/ч',
    'unit.pressure': 'гПа',
    'unit.wave': 'м',

    'card.index': 'индекс',

    'note.temp': 'ощущается {feels}°',
    'note.tempRange': 'ощущается {feels}° · сегодня {min}…{max}°',
    'note.wind': 'порывы {gust} м/с',
    'note.windDir': 'порывы {gust} м/с · {dir} ({deg}°)',
    'note.rain': 'вероятность {prob}',
    'note.rainSum': 'вероятность {prob} · за сутки {sum} мм',
    'note.uvMax': 'максимум сегодня {max}',
    'note.uvDefault': 'защита нужна начиная с УФ 3',
    'note.humidity': 'комфортный коридор 40–60%',
    'note.pressure': '{mmhg} мм рт. ст.',
    'note.pressureTrend': '{mmhg} мм рт. ст. · {trend}',
    'note.waves': 'период {period} с · вода {temp}°',
    'note.noSea': 'морских данных для этой точки нет',
    'note.needSea': 'нужны данные о море',
    'note.noData': 'нет данных',
    'note.noIssues': 'условия без замечаний',
    'note.why': 'минусы: {list}',

    'spark.temp': 'температура, ближайшие 24 ч',
    'spark.rain': 'осадки, ближайшие 24 ч',
    'spark.pressure': 'барограмма, прошедшие 24 ч',

    'trend.unit': 'гПа/3ч',
    'trend.riseFast': 'растёт быстро {v}',
    'trend.rise': 'растёт {v}',
    'trend.steady': 'ровно {v}',
    'trend.fall': 'падает {v}',
    'trend.fallFast': 'падает быстро {v}',

    'why.waves': 'волна {v} м',
    'why.water': 'вода {v}°',
    'why.wind': 'ветер {v} м/с',
    'why.rain': 'дождь',
    'why.rainLikely': 'вероятен дождь',
    'why.lowLight': 'мало света',
    'why.harshUv': 'жёсткий УФ',
    'why.temp': '{v}°',
    'why.gusts': 'порывы',
    'why.uv': 'УФ {v}',
    'why.mugginess': 'духота',

    'band.temp.deepFrost': 'Сильный мороз',
    'band.temp.frost': 'Мороз',
    'band.temp.cold': 'Холодно',
    'band.temp.cool': 'Прохладно',
    'band.temp.comfort': 'Комфортно',
    'band.temp.warm': 'Тепло',
    'band.temp.hot': 'Жарко',
    'band.temp.scorching': 'Пекло',

    'band.wind.calm': 'Штиль',
    'band.wind.light': 'Лёгкий',
    'band.wind.gentle': 'Слабый',
    'band.wind.moderate': 'Умеренный',
    'band.wind.fresh': 'Свежий',
    'band.wind.strong': 'Сильный',
    'band.wind.nearGale': 'Крепкий',
    'band.wind.storm': 'Шторм',

    'band.uv.low': 'Низкий',
    'band.uv.moderate': 'Умеренный',
    'band.uv.high': 'Высокий',
    'band.uv.veryHigh': 'Очень высокий',
    'band.uv.extreme': 'Экстремальный',

    'band.humidity.veryDry': 'Очень сухо',
    'band.humidity.dry': 'Сухо',
    'band.humidity.comfort': 'Комфортно',
    'band.humidity.humid': 'Влажно',
    'band.humidity.veryHumid': 'Очень влажно',
    'band.humidity.muggy': 'Духота',

    'band.clouds.clear': 'Ясно',
    'band.clouds.few': 'Малооблачно',
    'band.clouds.partly': 'Переменная',
    'band.clouds.cloudy': 'Облачно',
    'band.clouds.overcast': 'Пасмурно',

    'band.rain.dry': 'Сухо',
    'band.rain.drizzle': 'Морось',
    'band.rain.rain': 'Дождь',
    'band.rain.heavy': 'Сильный дождь',
    'band.rain.downpour': 'Ливень',

    'band.pressure.veryLow': 'Очень низкое',
    'band.pressure.low': 'Низкое',
    'band.pressure.belowNormal': 'Ниже нормы',
    'band.pressure.normal': 'Норма',
    'band.pressure.high': 'Высокое',
    'band.pressure.veryHigh': 'Очень высокое',

    'band.waves.glassy': 'Зеркало',
    'band.waves.ripple': 'Рябь',
    'band.waves.small': 'Небольшая волна',
    'band.waves.choppy': 'Волнение',
    'band.waves.rough': 'Сильное волнение',
    'band.waves.storm': 'Шторм',

    'band.index.avoid': 'Не стоит',
    'band.index.poor': 'Плохо',
    'band.index.soso': 'Так себе',
    'band.index.good': 'Хорошо',
    'band.index.great': 'Отлично',

    'notify.title': 'Погода: {place}',
    'notify.titlePlain': 'Погода обновлена',
    'notify.wind': 'ветер',
    'notify.uv': 'УФ',
    'notify.humidity': 'влажность',

    'wmo.0': 'Ясно', 'wmo.1': 'Малооблачно', 'wmo.2': 'Переменная облачность', 'wmo.3': 'Пасмурно',
    'wmo.45': 'Туман', 'wmo.48': 'Изморозь',
    'wmo.51': 'Морось слабая', 'wmo.53': 'Морось', 'wmo.55': 'Морось сильная',
    'wmo.56': 'Ледяная морось', 'wmo.57': 'Ледяная морось',
    'wmo.61': 'Дождь слабый', 'wmo.63': 'Дождь', 'wmo.65': 'Ливень',
    'wmo.66': 'Ледяной дождь', 'wmo.67': 'Ледяной дождь',
    'wmo.71': 'Снег слабый', 'wmo.73': 'Снег', 'wmo.75': 'Снегопад', 'wmo.77': 'Снежная крупа',
    'wmo.80': 'Ливни местами', 'wmo.81': 'Ливни', 'wmo.82': 'Сильные ливни',
    'wmo.85': 'Снежные заряды', 'wmo.86': 'Снежные заряды',
    'wmo.95': 'Гроза', 'wmo.96': 'Гроза с градом', 'wmo.99': 'Гроза с градом',
    'wmo.unknown': 'код {code}',

    'date.months': 'января,февраля,марта,апреля,мая,июня,июля,августа,сентября,октября,ноября,декабря',
    'date.weekdays': 'воскресенье,понедельник,вторник,среда,четверг,пятница,суббота',
    'date.format': '{day} {month}, {weekday}',
    'compass.points': 'С,СВ,В,ЮВ,Ю,ЮЗ,З,СЗ'
  };

  var DICTS = { en: EN, ru: RU };
  var order = ['en', 'ru'];
  var current = 'en';

  function detect() {
    var q = /[?&]lang=([a-z]{2})/.exec(location.search);
    if (q && DICTS[q[1]]) { return q[1]; }
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('ru') === 0 ? 'ru' : 'en';
  }

  function use(lang) { current = DICTS[lang] ? lang : 'en'; return current; }
  function lang() { return current; }
  function next() { return use(order[(order.indexOf(current) + 1) % order.length]); }

  function t(key, params) {
    var dict = DICTS[current] || EN;
    var s = dict[key];
    if (s === undefined) { s = EN[key]; }
    if (s === undefined) { return key; }
    if (params) {
      for (var k in params) {
        if (params.hasOwnProperty(k)) {
          s = s.split('{' + k + '}').join(String(params[k]));
        }
      }
    }
    return s;
  }

  function list(key) { return t(key).split(','); }

  return { t: t, list: list, use: use, lang: lang, next: next, detect: detect, languages: order };
})();
