/* matrix.js — the hour-by-hour screen behind the outlook bar.

   A grid of the next 24 hours, one row per activity card on the screen, each
   hour coloured by the same index the card shows: green where the card would
   read "good", amber where it would read "so-so", red below that. Under the
   grid, one block per activity says when its window is and what is in the way
   until then, in the words the card itself uses. */
var Matrix = (function () {

  function open(plan) {
    var body = U.$('#matrix-body');
    if (!body) { return; }
    U.clear(body);

    body.appendChild(ruler(plan.frames));
    body.appendChild(grid(plan));
    body.appendChild(legend());

    for (var i = 0; i < plan.rows.length; i++) {
      body.appendChild(story(plan.rows[i], plan.frames));
    }

    U.$('#matrix').hidden = false;
    body.scrollTop = 0;
  }

  function close() { U.$('#matrix').hidden = true; }

  function isOpen() { return !U.$('#matrix').hidden; }

  /* The hours, labelled every third one: 24 labels would not fit a phone, and
     three-hour ticks are how a forecast is read anyway. */
  function ruler(frames) {
    var line = U.el('div', 'mx-row mx-ruler');
    line.appendChild(U.el('span', 'mx-name', ''));
    var cells = U.el('span', 'mx-cells');
    for (var i = 0; i < frames.length; i++) {
      cells.appendChild(U.el('span', 'mx-tick',
        (i % 3 === 0) ? U.pad2(frames[i].hour) : ''));
    }
    line.appendChild(cells);
    return line;
  }

  function grid(plan) {
    var box = U.el('div', 'mx-grid');
    for (var i = 0; i < plan.rows.length; i++) {
      box.appendChild(gridRow(plan.rows[i]));
    }
    return box;
  }

  function gridRow(r) {
    var line = U.el('div', 'mx-row');
    line.appendChild(U.el('span', 'mx-name', I18N.t(Metrics.SPEC[r.key].title)));
    var cells = U.el('span', 'mx-cells');
    for (var i = 0; i < r.cells.length; i++) {
      cells.appendChild(cell(r.cells[i]));
    }
    line.appendChild(cells);
    return line;
  }

  function cell(c) {
    var node = U.el('span', 'mx-cell' + (c.grade ? ' is-' + c.grade : ' is-none'));
    /* The number is the title, not the label: at this width nothing else fits,
       and a pointer or a screen reader can still get at it. */
    node.setAttribute('title', U.pad2(c.hour) + ':00 — ' +
      (c.value === null ? I18N.t('note.noData') : U.fmt(c.value, 1)));
    return node;
  }

  function legend() {
    var box = U.el('div', 'mx-legend');
    box.appendChild(key('good', 'legend.good'));
    box.appendChild(key('fair', 'legend.fair'));
    box.appendChild(key('bad', 'legend.bad'));
    return box;
  }

  function key(grade, label) {
    var item = U.el('span', 'mx-key');
    item.appendChild(U.el('span', 'mx-cell is-' + grade));
    item.appendChild(U.el('span', 'mx-key-text', I18N.t(label)));
    return item;
  }

  /* The words under the grid: when the window is, and what is in the way. */
  function story(r, frames) {
    var box = U.el('div', 'mx-story');
    box.appendChild(U.el('div', 'lib-group', I18N.t(Metrics.SPEC[r.key].title)));

    var now = r.now;
    var best = r.best;
    var head = U.el('div', 'mx-verdict'), text;

    if (now && now.grade === 'good') {
      text = I18N.t('outlook.goodNow', { until: endOf(r, frames) });
      head.className += ' lv-good-text';
    } else if (best && best.grade === 'good') {
      text = I18N.t('outlook.goodLater', {
        from: Outlook.hourLabel(frames[best.from]),
        to: Outlook.hourLabel(frames[best.to])
      });
      head.className += ' lv-mid-text';
    } else if (best) {
      text = I18N.t('outlook.fairOnly', {
        from: Outlook.hourLabel(frames[best.from]),
        to: Outlook.hourLabel(frames[best.to])
      });
      head.className += ' lv-warn-text';
    } else {
      text = I18N.t('outlook.none');
      head.className += ' lv-bad-text';
    }
    U.setText(head, text);
    box.appendChild(head);

    var why = reasonsFor(r);
    if (why) { box.appendChild(U.el('p', 'det-text', why)); }
    return box;
  }

  /* How long the good stretch we are in lasts. */
  function endOf(r, frames) {
    var i = 0;
    while (i + 1 < r.cells.length && r.cells[i + 1].grade === 'good') { i++; }
    return Outlook.hourLabel(frames[i]);
  }

  /* What is costing the activity points right now — and, when the window is
     later, what changes by then. */
  function reasonsFor(r) {
    var now = r.now;
    if (!now) { return ''; }
    var nowWhy = listOf(now.why);
    if (now.grade === 'good') {
      return nowWhy ? I18N.t('outlook.watch', { list: nowWhy }) : I18N.t('note.noIssues');
    }
    if (!nowWhy) { return ''; }
    var at = (r.best && r.best.from > 0) ? r.cells[r.best.from] : null;
    if (!at) { return I18N.t('outlook.blocked', { list: nowWhy }); }
    var thenWhy = listOf(at.why);
    return I18N.t('outlook.blocked', { list: nowWhy }) + ' ' +
      (thenWhy ? I18N.t('outlook.thenStill', { list: thenWhy, v: U.fmt(at.value, 1) })
               : I18N.t('outlook.thenClear', { v: U.fmt(at.value, 1) }));
  }

  function listOf(why) {
    if (!why || !why.length) { return ''; }
    var parts = [], i;
    for (i = 0; i < why.length && i < 4; i++) {
      parts.push(I18N.t(why[i].key, why[i].params));
    }
    return parts.join(', ');
  }

  return { open: open, close: close, isOpen: isOpen };
})();
