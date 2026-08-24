/* scale.js — the intensity scale: coloured segments, a marker and a band label.
   All three designs share this DOM; the theme CSS decides how it looks. */
var Scale = (function () {

  /* Segments are coloured by band; the ones below the current value are filled,
     the rest stay muted, and a triangle marks the exact position. */
  function build(spec, value) {
    var wrap = U.el('div', 'scale');
    var track = U.el('div', 'scale-track');
    var count = spec.segments;
    var span = spec.max - spec.min;
    var pos = (value === null) ? null : U.clamp((value - spec.min) / span, 0, 1);
    var i, segValue, cls;

    for (i = 0; i < count; i++) {
      segValue = spec.min + span * ((i + 0.5) / count);
      cls = 'seg ' + Metrics.band(spec.bands, segValue).cls;
      if (pos === null) { cls += ' seg-off'; }
      else if ((i + 1) / count <= pos + 0.0001) { cls += ' seg-on'; }
      else if (i / count < pos) { cls += ' seg-on seg-edge'; }
      else { cls += ' seg-off'; }
      track.appendChild(U.el('div', cls));
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

  /* A whole metric card: title, number, scale, band label, note. */
  function card(opts) {
    var spec = opts.spec;
    var value = (opts.value === null || opts.value === undefined || isNaN(opts.value))
      ? null : Number(opts.value);
    var band = value === null ? null : Metrics.band(spec.bands, value);

    var node = U.el('article', 'card' + (band ? ' ' + band.cls + '-card' : ' lv-none-card'));
    node.setAttribute('data-metric', opts.key);

    var head = U.el('div', 'card-head');
    head.appendChild(U.el('h2', 'card-title', I18N.t(spec.title)));
    if (opts.badge) { head.appendChild(U.el('span', 'card-badge', opts.badge)); }
    node.appendChild(head);

    var row = U.el('div', 'card-value-row');
    row.appendChild(U.el('div', 'card-value', value === null ? '—' : U.fmt(value, spec.decimals)));
    if (spec.unit) { row.appendChild(U.el('div', 'card-unit', I18N.t(spec.unit))); }
    node.appendChild(row);

    node.appendChild(build(spec, value));

    node.appendChild(U.el('div', 'card-band' + (band ? ' ' + band.cls + '-text' : ''),
      band ? I18N.t(band.label) : I18N.t('note.noData')));

    if (opts.note) { node.appendChild(U.el('div', 'card-note', opts.note)); }
    return node;
  }

  /* Mini chart under a card: past barogram or upcoming hours. */
  function sparkBars(values, spec, caption) {
    var wrap = U.el('div', 'spark');
    var lo = null, hi = null, i, v, bar, height, band;

    for (i = 0; i < values.length; i++) {
      v = values[i];
      if (v === null || v === undefined) { continue; }
      if (lo === null || v < lo) { lo = v; }
      if (hi === null || v > hi) { hi = v; }
    }
    if (lo === null) { return null; }
    if (hi - lo < 0.0001) { hi = lo + 1; }

    for (i = 0; i < values.length; i++) {
      v = values[i];
      if (v === null || v === undefined) {
        wrap.appendChild(U.el('div', 'spark-bar spark-gap'));
        continue;
      }
      height = 12 + 88 * (v - lo) / (hi - lo);
      band = spec ? Metrics.band(spec.bands, v) : null;
      bar = U.el('div', 'spark-bar' + (band ? ' ' + band.cls : ''));
      bar.style.height = height.toFixed(0) + '%';
      wrap.appendChild(bar);
    }

    if (!caption) { return wrap; }
    var box = document.createDocumentFragment();
    box.appendChild(wrap);
    box.appendChild(U.el('div', 'spark-cap', caption));
    return box;
  }

  return { build: build, card: card, sparkBars: sparkBars };
})();
