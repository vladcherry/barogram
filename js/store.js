/* store.js — settings and the last weather snapshot in localStorage. */
var Store = (function () {
  var KEY = 'barogram.v2';
  var state = {
    theme: null,        /* null means: not chosen yet, pick one for the device */
    lang: null,
    lat: null, lon: null, place: '',
    lastData: null, lastTs: 0,
    background: false, keepScreen: false
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { return state; }
      var saved = JSON.parse(raw);
      for (var k in saved) { if (saved.hasOwnProperty(k)) { state[k] = saved[k]; } }
    } catch (e) { /* private mode or no quota — run without a cache */ }
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
