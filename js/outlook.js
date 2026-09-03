/* outlook.js — the hour-by-hour view of the comfort indices.

   No second rules engine: an hourly frame is shaped exactly like the current
   conditions, so every index in metrics.js is run against it unchanged. The
   traffic-light bands are the app's own index bands, which is why the bar can
   never contradict the card it sits above — a card reading "good" cannot show
   red in the matrix. */
var Outlook = (function () {

  /* The two thresholds are the boundaries of the index bands: at 6 a card says
     "good", at 4 it says "so-so", below that "poor". */
  var GOOD = 6;
  var FAIR = 4;

  function gradeOf(value) {
    if (value === null || value === undefined || isNaN(value)) { return null; }
    if (value >= GOOD) { return 'good'; }
    return (value >= FAIR) ? 'fair' : 'bad';
  }

  function isActivity(key) {
    for (var i = 0; i < Metrics.INDEX_KEYS.length; i++) {
      if (Metrics.INDEX_KEYS[i] === key) { return true; }
    }
    return false;
  }

  /* The activity cards on the screen, in the order the user put them. */
  function activities(keys) {
    var out = [], i;
    for (i = 0; i < keys.length; i++) { if (isActivity(keys[i])) { out.push(keys[i]); } }
    return out;
  }

  function scoreAt(key, frame) {
    var r;
    try { r = Metrics[key](frame); } catch (e) { return null; }
    return r ? r : null;
  }

  /* One row of the matrix: the index of this activity for every hour ahead. */
  function row(key, frames) {
    var cells = [], i, r, value;
    for (i = 0; i < frames.length; i++) {
      r = scoreAt(key, frames[i]);
      value = r ? r.value : null;
      cells.push({ hour: frames[i].hour, value: value, grade: gradeOf(value), why: r ? r.why : [] });
    }
    return { key: key, cells: cells, now: cells.length ? cells[0] : null, best: bestRun(cells) };
  }

  /* The longest stretch of good hours, or of merely acceptable ones if the day
     has no good stretch at all. Ties go to the earlier one: an evening that is
     as good as the morning is still the evening. */
  function bestRun(cells) {
    var run = longestRun(cells, 'good');
    if (!run) { run = longestRun(cells, 'fair'); }
    return run;
  }

  function longestRun(cells, grade) {
    var best = null, from = -1, i, len;
    for (i = 0; i <= cells.length; i++) {
      if (i < cells.length && cells[i].grade === grade) {
        if (from < 0) { from = i; }
        continue;
      }
      if (from >= 0) {
        len = i - from;
        if (!best || len > best.length) {
          best = { from: from, to: i - 1, length: len, grade: grade };
        }
        from = -1;
      }
    }
    return best;
  }

  /* The whole plan: one row per activity card on the screen. */
  function plan(keys, w) {
    var frames = (w && w.frames) ? w.frames : [];
    var list = activities(keys), rows = [], i;
    if (!frames.length) { return { frames: [], rows: [], list: list }; }
    for (i = 0; i < list.length; i++) { rows.push(row(list[i], frames)); }
    return { frames: frames, rows: rows, list: list };
  }

  /* What the bar says. Two sentences at most: what is worth doing now, and what
     is worth waiting for. */
  function summary(p) {
    var nowBest = null, later = [], stuck = [], i, r;
    for (i = 0; i < p.rows.length; i++) {
      r = p.rows[i];
      if (!r.now || r.now.grade === null) { continue; }
      if (r.now.grade === 'good') {
        if (!nowBest || r.now.value > nowBest.now.value) { nowBest = r; }
        continue;
      }
      /* Not now: is there a stretch later that is actually better? */
      if (r.best && r.best.from > 0 && betterThanNow(r)) { later.push(r); }
      else { stuck.push(r); }
    }
    return { now: nowBest, later: later, stuck: stuck, rows: p.rows, frames: p.frames };
  }

  function betterThanNow(r) {
    var at = r.cells[r.best.from];
    return at && r.now && at.value !== null && r.now.value !== null &&
           at.value - r.now.value >= 1;
  }

  /* Hours are shown as they are read out: "18:00". */
  function hourLabel(frame) {
    return U.pad2(frame.hour) + ':00';
  }

  return {
    plan: plan, summary: summary, row: row, activities: activities,
    gradeOf: gradeOf, hourLabel: hourLabel, GOOD: GOOD, FAIR: FAIR
  };
})();
