/* scale.js — шкала интенсивности: сегменты + бегунок + подпись зоны.
   Один и тот же DOM во всех трёх дизайнах, вид задаёт CSS темы. */
var Scale = (function () {

  /* Строит шкалу: сегменты окрашены по зонам, «пройденные» — залиты,
     остальные приглушены; треугольник-бегунок стоит на текущем значении. */
  function build(spec, value) {
    var wrap = U.el('div', 'scale');
    var track = U.el('div', 'scale-track');
    var n = spec.segments;
    var span = spec.max - spec.min;
    var pos = (value === null) ? null : U.clamp((value - spec.min) / span, 0, 1);
    var i, segValue, b, seg, cls;

    for (i = 0; i < n; i++) {
      segValue = spec.min + span * ((i + 0.5) / n);
      b = Metrics.band(spec.bands, segValue);
      cls = 'seg ' + b.cls;
      if (pos === null) { cls += ' seg-off'; }
      else if ((i + 1) / n <= pos + 0.0001) { cls += ' seg-on'; }
      else if (i / n < pos) { cls += ' seg-on seg-edge'; }
      else { cls += ' seg-off'; }
      seg = U.el('div', cls);
      track.appendChild(seg);
    }
    wrap.appendChild(track);

    if (pos !== null) {
      var marker = U.el('div', 'scale-marker');
      marker.style.left = (pos * 100).toFixed(1) + '%';
      wrap.appendChild(marker);
    }

    var ends = U.el('div', 'scale-ends');
    ends.appendChild(U.el('span', 'scale-min', U.fmt(spec.min, 0)));
    ends.appendChild(U.el('span', 'scale-max', U.fmt(spec.max, 0)));
    wrap.appendChild(ends);

    return wrap;
  }

  /* Карточка метрики целиком. */
  function card(opts) {
    var spec = opts.spec;
    var value = (opts.value === null || opts.value === undefined || isNaN(opts.value)) ? null : Number(opts.value);
    var b = value === null ? null : Metrics.band(spec.bands, value);

    var card = U.el('article', 'card' + (b ? ' ' + b.cls + '-card' : ' lv-none-card'));
    card.setAttribute('data-metric', opts.key);

    var head = U.el('div', 'card-head');
    head.appendChild(U.el('h2', 'card-title', spec.title));
    if (opts.badge) { head.appendChild(U.el('span', 'card-badge', opts.badge)); }
    card.appendChild(head);

    var row = U.el('div', 'card-value-row');
    var val = U.el('div', 'card-value', value === null ? '—' : U.fmt(value, spec.decimals));
    row.appendChild(val);
    if (spec.unit) { row.appendChild(U.el('div', 'card-unit', spec.unit)); }
    card.appendChild(row);

    card.appendChild(build(spec, value));

    var label = U.el('div', 'card-band' + (b ? ' ' + b.cls + '-text' : ''), b ? b.label : 'нет данных');
    card.appendChild(label);

    if (opts.note) { card.appendChild(U.el('div', 'card-note', opts.note)); }
    return card;
  }

  /* Мини-барограмма: столбики истории/прогноза под карточкой. */
  function sparkBars(values, spec) {
    var wrap = U.el('div', 'spark');
    var i, v, b, bar, h;
    var lo = null, hi = null;
    for (i = 0; i < values.length; i++) {
      v = values[i];
      if (v === null || v === undefined) { continue; }
      if (lo === null || v < lo) { lo = v; }
      if (hi === null || v > hi) { hi = v; }
    }
    if (lo === null) { return wrap; }
    if (hi - lo < 0.0001) { hi = lo + 1; }
    for (i = 0; i < values.length; i++) {
      v = values[i];
      bar = U.el('div', 'spark-bar');
      if (v === null || v === undefined) {
        bar.className = 'spark-bar spark-gap';
      } else {
        h = 12 + 88 * (v - lo) / (hi - lo);
        bar.style.height = h.toFixed(0) + '%';
        b = spec ? Metrics.band(spec.bands, v) : null;
        if (b) { bar.className = 'spark-bar ' + b.cls; }
      }
      wrap.appendChild(bar);
    }
    return wrap;
  }

  return { build: build, card: card, sparkBars: sparkBars };
})();
