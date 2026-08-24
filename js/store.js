/* store.js — настройки и последний снимок погоды в localStorage. */
var Store = (function () {
  var KEY = 'barogram.v1';
  var state = {
    theme: 'eink',
    lat: null, lon: null, place: '',
    lastData: null, lastTs: 0,
    bg: false, screen: false
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { return state; }
      var o = JSON.parse(raw);
      for (var k in o) { if (o.hasOwnProperty(k)) { state[k] = o[k]; } }
    } catch (e) { /* приватный режим / нет квоты — работаем без кеша */ }
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function set(patch) {
    for (var k in patch) { if (patch.hasOwnProperty(k)) { state[k] = patch[k]; } }
    save();
  }

  return { load: load, save: save, set: set, state: state };
})();
