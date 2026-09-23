/* =========================================================================
   imarket2web - light wave
   =========================================================================

   A shimmer runs letter by letter across "Every layer makes the next one
   cheaper", and where it finishes a gleam leaves the line, travels out and
   down, and lands on the blue Enquiries card. The section's argument, drawn:
   every layer leads to the one number that pays the bills.

   Splitting the heading
   ---------------------
   Each letter needs its own element to shimmer independently. Two things
   that usually go wrong when text is split this way are handled here:

     - Words are wrapped too, as inline-block, so a line can only break
       between words. Splitting into bare letters lets a browser break a
       word anywhere, which looks broken.
     - The heading keeps an aria-label with the original sentence, so screen
       readers read a sentence rather than a pile of spans.

   The split happens in JS rather than in the markup, so the HTML stays
   readable and nothing is left behind if this never runs.

   Routing
   -------
   The cards are a 4x2 grid with the blue one bottom-right, which puts card
   04 directly above it - so a straight diagonal would cut across other
   cards. Instead the path leaves the last letter, crosses the empty space to
   the right of the copy, drops through the gutter beside the grid, and curves
   back into the blue card from its right edge. It touches nothing else.

   The route is measured from the real elements, so it holds at any width and
   after any copy change.

   Runs at 900px and up. Below that the gutter is too narrow to carry the
   line past the cards. Reduced motion skips both the shimmer and the travel
   and simply lights the card, which is the meaning without the movement.
   ========================================================================= */

(function () {
  'use strict';

  var MIN_WIDTH = 900;
  var STAGGER = 18;      // ms between letters
  var SHIMMER = 620;     // ms per letter
  var TRAVEL = 1300;     // ms for the gleam to cross the path
  var NS = 'http://www.w3.org/2000/svg';

  function init() {
    var section = document.querySelector('.growth');
    if (!section) return;
    var h2 = section.querySelector('h2');
    var goal = section.querySelector('.layer--goal');
    var grid = section.querySelector('.grid-4');
    if (!h2 || !goal || !grid) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    /* ---- Split into words, then letters ---------------------------------- */
    function split(root) {
      var letters = [];
      (function walk(node) {
        [].slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            child.nodeValue.split(/(\s+)/).forEach(function (chunk) {
              if (!chunk) return;
              if (/^\s+$/.test(chunk)) {
                frag.appendChild(document.createTextNode(chunk));
                return;
              }
              var word = document.createElement('span');
              word.className = 'lw-w';
              chunk.split('').forEach(function (ch) {
                var l = document.createElement('span');
                l.className = 'lw-l';
                l.textContent = ch;
                word.appendChild(l);
                letters.push(l);
              });
              frag.appendChild(word);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            walk(child);
          }
        });
      })(root);
      return letters;
    }

    var letters = h2.querySelectorAll('.lw-l').length
      ? [].slice.call(h2.querySelectorAll('.lw-l'))
      : (function () {
          h2.setAttribute('aria-label', h2.textContent.replace(/\s+/g, ' ').trim());
          return split(h2);
        })();
    if (!letters.length) return;

    var last = letters[letters.length - 1];
    var svg, trail, gleam, played = false;

    /* ---- The route ------------------------------------------------------- */
    function buildPath() {
      var sb = section.getBoundingClientRect();
      var ab = last.getBoundingClientRect();
      var gb = goal.getBoundingClientRect();
      var rb = grid.getBoundingClientRect();
      function X(v) { return v - sb.left; }
      function Y(v) { return v - sb.top; }

      var startX = X(ab.right);
      var startY = Y(ab.top + ab.height * 0.6);

      var laneX = Math.min(X(rb.right) + Math.max(14, (sb.width - rb.width) / 4),
                           sb.width - 10);
      var turnY = Y(ab.bottom) + 10;
      var endX = X(gb.right) - gb.width * 0.32;
      var endY = Y(gb.top + gb.height * 0.5);
      var enterY = Y(gb.top) - 18;

      return [
        'M', startX, startY,
        'C', startX + (laneX - startX) * 0.45, startY - 22,
             laneX - (laneX - startX) * 0.18, turnY - 26,
             laneX, turnY,
        'L', laneX, enterY,
        'C', laneX, enterY + 34,
             endX + (laneX - endX) * 0.55, endY,
             endX, endY
      ].join(' ');
    }

    function makeSvg() {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'lw');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('preserveAspectRatio', 'none');

      var defs = document.createElementNS(NS, 'defs');
      var filter = document.createElementNS(NS, 'filter');
      filter.setAttribute('id', 'lw-glow');
      filter.setAttribute('x', '-60%'); filter.setAttribute('y', '-60%');
      filter.setAttribute('width', '220%'); filter.setAttribute('height', '220%');
      var blur = document.createElementNS(NS, 'feGaussianBlur');
      blur.setAttribute('stdDeviation', '4'); blur.setAttribute('result', 'b');
      var merge = document.createElementNS(NS, 'feMerge');
      ['b', 'SourceGraphic'].forEach(function (n) {
        var m = document.createElementNS(NS, 'feMergeNode');
        m.setAttribute('in', n); merge.appendChild(m);
      });
      filter.appendChild(blur); filter.appendChild(merge);
      defs.appendChild(filter); svg.appendChild(defs);

      trail = document.createElementNS(NS, 'path');
      trail.setAttribute('class', 'lw-trail');
      svg.appendChild(trail);

      gleam = document.createElementNS(NS, 'path');
      gleam.setAttribute('class', 'lw-gleam');
      gleam.setAttribute('filter', 'url(#lw-glow)');
      svg.appendChild(gleam);

      section.appendChild(svg);

      var sb = section.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + sb.width + ' ' + sb.height);
      svg.setAttribute('width', sb.width);
      svg.setAttribute('height', sb.height);
      var d = buildPath();
      trail.setAttribute('d', d);
      gleam.setAttribute('d', d);
    }

    /* ---- Play ------------------------------------------------------------ */
    function play() {
      if (played) return;
      played = true;

      if (reduced) {
        goal.classList.add('is-lit');
        return;
      }

      // 1. Shimmer, letter by letter
      letters.forEach(function (l, i) {
        l.style.animation =
          'lwShimmer ' + SHIMMER + 'ms ease-out ' + (i * STAGGER) + 'ms';
      });

      // 2. The gleam leaves as the shimmer reaches the final letter
      var waveEnd = (letters.length - 1) * STAGGER;
      setTimeout(function () {
        makeSvg();
        var len = gleam.getTotalLength();
        var seg = Math.max(90, len * 0.13);
        gleam.style.strokeDasharray = seg + ' ' + len;
        gleam.style.strokeDashoffset = seg;
        trail.style.strokeDasharray = len;
        trail.style.strokeDashoffset = len;

        requestAnimationFrame(function () {
          var ease = 'cubic-bezier(0.55, 0, 0.35, 1)';
          gleam.style.transition = 'stroke-dashoffset ' + TRAVEL + 'ms ' + ease;
          gleam.style.strokeDashoffset = -len;
          trail.style.transition = 'stroke-dashoffset ' + TRAVEL + 'ms ' + ease;
          trail.style.strokeDashoffset = 0;
        });

        // 3. The card lights as the gleam arrives, not after
        setTimeout(function () { goal.classList.add('is-lit'); }, TRAVEL * 0.82);

        setTimeout(function () { svg.classList.add('is-done'); }, TRAVEL + 700);
        setTimeout(function () {
          if (svg && svg.parentNode) svg.remove();
          letters.forEach(function (l) { l.style.animation = ''; });
        }, TRAVEL + 2200);
      }, waveEnd + 120);
    }

    if (window.innerWidth < MIN_WIDTH) return;

    if (!('IntersectionObserver' in window)) { play(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); play(); }
    }, { threshold: 0.35 });
    io.observe(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
