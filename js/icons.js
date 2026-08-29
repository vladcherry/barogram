/* icons.js — card icons drawn as inline SVG.
   Sky and rain cards get a picture of the weather; the other readings get a
   comfort face for their band; the two sport indices get the sport itself,
   marked with a question mark when conditions are middling and struck through
   when they are bad. Everything is stroked in currentColor, so the icons follow
   the text colour of the card — including the white text on a coloured tile. */
var Icons = (function () {

  var NS = 'http://www.w3.org/2000/svg';

  function node(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (attrs.hasOwnProperty(k)) { n.setAttribute(k, String(attrs[k])); }
    }
    return n;
  }

  function svg(children) {
    var root = node('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
    for (var i = 0; i < children.length; i++) { root.appendChild(children[i]); }
    var box = document.createElement('span');
    box.className = 'card-icon';
    box.appendChild(root);
    return box;
  }

  function dot(cx, cy) { return node('circle', { cx: cx, cy: cy, r: 1.1, 'class': 'ico-solid' }); }
  function line(x1, y1, x2, y2) { return node('line', { x1: x1, y1: y1, x2: x2, y2: y2 }); }
  function path(d) { return node('path', { d: d }); }

  /* ---- weather ---- */

  function sunParts(cx, cy, r) {
    var parts = [node('circle', { cx: cx, cy: cy, r: r })];
    var rays = [[0, -1], [0, 1], [-1, 0], [1, 0], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];
    for (var i = 0; i < rays.length; i++) {
      var dx = rays[i][0], dy = rays[i][1];
      var gap = r < 3 ? 1.2 : 1.6, len = r < 3 ? 2.6 : 3.6;
      parts.push(line(cx + dx * (r + gap), cy + dy * (r + gap), cx + dx * (r + len), cy + dy * (r + len)));
    }
    return parts;
  }

  var CLOUD = 'M7.5 18h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 7.5 18z';

  function sun() { return svg(sunParts(12, 12, 4.2)); }

  /* Sun tucked into the top-left corner so the cloud does not sit on top of it. */
  function sunCloud() {
    var parts = sunParts(7.5, 6.5, 2.4);
    parts.push(path('M9 20h8a3 3 0 0 0 .3-6 4.6 4.6 0 0 0-8.8-1.1A3.1 3.1 0 0 0 9 20z'));
    return svg(parts);
  }

  function cloud() { return svg([path(CLOUD)]); }

  function fog() {
    return svg([
      path('M7.5 13h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 7.5 13z'),
      line(5, 17, 19, 17), line(7, 20, 17, 20)
    ]);
  }

  function rainCloud(drops) {
    var parts = [path('M7.5 14h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 7.5 14z')];
    var xs = drops >= 3 ? [8, 12, 16] : (drops === 2 ? [9.5, 14.5] : [12]);
    for (var i = 0; i < xs.length; i++) { parts.push(line(xs[i], 17, xs[i] - 1.2, 21)); }
    return svg(parts);
  }

  /* A two-stroke cross, not a six-armed star: three strokes turn to mush at
     20 px, which is the size these are actually seen at. */
  function flake(cx, cy, r) {
    return [line(cx - r, cy - r, cx + r, cy + r),
            line(cx - r, cy + r, cx + r, cy - r)];
  }

  /* Two well-spaced flakes: any more and they smudge into a blob at icon size. */
  function snowCloud() {
    var parts = [path('M7.5 13.5h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 7.5 13.5z')];
    return svg(parts.concat(flake(9, 18.6, 2.2), flake(15.6, 18.6, 2.2)));
  }

  function storm() {
    return svg([
      path('M7.5 14h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 7.5 14z'),
      path('M13 16l-3 3.5h3L11.5 23')
    ]);
  }

  function dryDrop() {
    return svg([
      path('M12 4.5c3 3.6 4.6 6.1 4.6 8.1a4.6 4.6 0 0 1-9.2 0c0-2 1.6-4.5 4.6-8.1z'),
      line(4, 20, 20, 4)
    ]);
  }

  /* Weather picture for the cloud-cover card, chosen from the WMO code. */
  function sky(code, clouds) {
    if (code === null || code === undefined) {
      return (clouds !== null && clouds > 60) ? cloud() : sun();
    }
    if (code >= 95) { return storm(); }
    if (code >= 71 && code <= 77) { return snowCloud(); }
    if (code === 85 || code === 86) { return snowCloud(); }
    if (code >= 80) { return rainCloud(3); }
    if (code >= 51) { return rainCloud(2); }
    if (code === 45 || code === 48) { return fog(); }
    if (code === 3) { return cloud(); }
    if (code === 1 || code === 2) { return sunCloud(); }
    return sun();
  }

  /* Rain card: how hard it is coming down, or a struck-through drop when dry. */
  function rain(mm) {
    if (mm === null || mm === undefined || mm < 0.05) { return dryDrop(); }
    if (mm < 0.5) { return rainCloud(1); }
    if (mm < 2) { return rainCloud(2); }
    return rainCloud(3);
  }

  /* ---- comfort faces ---- */

  var MOUTH = {
    happy:   'M8 14.2a4.6 4.6 0 0 0 8 0',
    ok:      'M8.4 14a4 4 0 0 0 7.2 0',
    neutral: 'M8.5 14.6h7',
    sad:     'M8 15.6a4.6 4.6 0 0 1 8 0',
    bad:     'M7.6 16.4a5 5 0 0 1 8.8 0'
  };

  /* Bands map onto five faces: the greens smile, the reds do not. */
  var FACE_BY_BAND = {
    'lv-good': 'happy', 'lv-calm': 'happy',
    'lv-mid': 'ok',
    'lv-warn': 'neutral',
    'lv-bad': 'sad', 'lv-cold': 'sad',
    'lv-crit': 'bad', 'lv-deep': 'bad'
  };

  function face(state) {
    var mouth = MOUTH[state] || MOUTH.neutral;
    var parts = [node('circle', { cx: 12, cy: 12, r: 9 }), dot(9, 10), dot(15, 10), path(mouth)];
    if (state === 'bad') {
      /* crossed-out eyes read as "really not good" even at icon size */
      parts = [node('circle', { cx: 12, cy: 12, r: 9 }),
               line(7.8, 8.8, 10.2, 11.2), line(10.2, 8.8, 7.8, 11.2),
               line(13.8, 8.8, 16.2, 11.2), line(16.2, 8.8, 13.8, 11.2),
               path(mouth)];
    }
    return svg(parts);
  }

  function mood(bandCls) {
    if (!bandCls) { return face('neutral'); }
    return face(FACE_BY_BAND[bandCls] || 'neutral');
  }

  /* ---- sports ---- */

  /* Diving mask with a strap and a snorkel, so it cannot be mistaken for the
     bicycle at 20 px. */
  function maskParts() {
    return [
      path('M5.5 8.5h9.5a1.2 1.2 0 0 1 1.2 1.2v3a3.2 3.2 0 0 1-3.2 3.2h-.7a1.5 1.5 0 0 1-1.4-1l-.6-1.6-.6 1.6a1.5 1.5 0 0 1-1.4 1h-.7A3.2 3.2 0 0 1 4.3 12.7v-3A1.2 1.2 0 0 1 5.5 8.5z'),
      line(2, 10.5, 4.3, 10.5),
      path('M16.2 9.6h1.6a1.6 1.6 0 0 1 1.6 1.6v5.6a2.4 2.4 0 0 1-2.4 2.4')
    ];
  }

  /* Bigger wheels plus a saddle and handlebar: the silhouette has to read as a
     bicycle, not as a pair of goggles. */
  function bikeParts() {
    return [
      node('circle', { cx: 5, cy: 16.5, r: 4.2 }),
      node('circle', { cx: 19, cy: 16.5, r: 4.2 }),
      path('M5 16.5l4.4-7.4h5.2L19 16.5'),
      line(12, 16.5, 14.6, 9.1),
      line(8, 9.1, 10.8, 9.1),
      line(13.8, 7.6, 16.4, 7.6),
      line(14.6, 9.1, 15.6, 7.6)
    ];
  }

  /* Sport icon plus a verdict: clean when it is worth going, a question mark
     when conditions are middling, struck through when they are not. */
  function sport(kind, value) {
    var parts = (kind === 'snorkel') ? maskParts() : bikeParts();
    if (value === null || value === undefined) { return svg(parts); }
    if (value < 4) {
      parts.push(line(3.5, 20.5, 20.5, 3.5));
    } else if (value < 6) {
      var mark = node('text', { x: 18.5, y: 8, 'class': 'ico-mark' });
      mark.appendChild(document.createTextNode('?'));
      parts.push(mark);
    }
    return svg(parts);
  }

  return { sky: sky, rain: rain, mood: mood, sport: sport, face: face };
})();
