/* =========================================================================
   imarket2web — light wave
   =========================================================================

   A gleam leaves the first letter of "Every layer makes the next one
   cheaper", travels out and down, and lands on the blue Enquiries card.
   It is the section's argument drawn as a line: every layer leads to the
   one number that pays the bills.

   Routing
   -------
   The cards sit in a 4x2 grid and the blue one is bottom-right, which puts
   card 04 directly above it — so a straight diagonal would cut across other
   cards. Instead the path leaves the heading, crosses the empty space to the
   right of the copy, drops through the outer gutter beside the grid, and
   curves back in to the blue card from its right edge. It touches nothing
   else, which was the point.

   The route is measured from the real elements every time it runs, so it
   stays correct at any width and after any copy change.

   Only runs at 900px and up: below that the gutter is too narrow to carry
   the line past the cards, and squeezing it through would clip the corners
   of the very cards it is meant to avoid.

   Plays once, when the section comes into view.
   ========================================================================= */

(function () {
  'use strict';

  var MIN_WIDTH = 900;
  var TRAVEL = 1500;   // ms for the gleam to cross the path
  var NS = 'http://www.w3.org/2000/svg';

  function init() {
    var section = document.querySelector('.growth');
    if (!section) return;
    var host = section.querySelector('.wrap');
    var h2 = section.querySelector('h2');
    var goal = section.querySelector('.layer--goal');
    var grid = section.querySelector('.grid-4');
    if (!host || !h2 || !goal || !grid) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    /* Wrap the first letter so there is something precise to start from.
       Done here rather than in the markup, so the HTML stays clean and
       nothing is left behind if this script never runs. */
    var anchor = h2.querySelector('.lw-start');
    if (!anchor) {
      var node = h2.firstChild;
      while (node && node.nodeType !== 3) node = node.nextSibling;
      if (!node || !node.nodeValue.trim()) return;
      var text = node.nodeValue;
      anchor = document.createElement('span');
      anchor.className = 'lw-start';
      anchor.textContent = text.charAt(0);
      node.nodeValue = text.slice(1);
      h2.insertBefore(anchor, node);
    }

    var svg, path, gleam, played = false;

    function build() {
      var hb = host.getBoundingClientRect();
      var ab = anchor.getBoundingClientRect();
      var gb = goal.getBoundingClientRect();
      var rb = grid.getBoundingClientRect();
      var sb = section.getBoundingClientRect();

      // Everything in section-local coordinates
      function X(v) { return v - sb.left; }
      function Y(v) { return v - sb.top; }

      var startX = X(ab.left + ab.width * 0.5);
      var startY = Y(ab.top + ab.height * 0.62);

      // The lane: between the grid's right edge and the section edge
      var laneX = X(rb.right) + Math.max(14, (sb.width - rb.width) / 4);
      laneX = Math.min(laneX, sb.width - 10);

      var turnY = Y(ab.bottom) + 12;              // just under the heading line
      var endX = X(gb.right) - gb.width * 0.32;   // inside the blue card
      var endY = Y(gb.top + gb.height * 0.5);
      var enterY = Y(gb.top) - 18;                // where it starts curving in

      return [
        'M', startX, startY,
        // out to the right, staying above the grid
        'C', startX + (laneX - startX) * 0.45, startY - 26,
             laneX - (laneX - startX) * 0.18, turnY - 30,
             laneX, turnY,
        // straight down the lane, past every other card
        'L', laneX, enterY,
        // curve back in, entering the blue card from its right
        'C', laneX, enterY + 34,
             endX + (laneX - endX) * 0.55, endY,
             endX, endY
      ].join(' ');
    }

    function make() {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'lw');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('preserveAspectRatio', 'none');

      var defs = document.createElementNS(NS, 'defs');
      var filter = document.createElementNS(NS, 'filter');
      filter.setAttribute('id', 'lw-glow');
      filter.setAttribute('x', '-60%');
      filter.setAttribute('y', '-60%');
      filter.setAttribute('width', '220%');
      filter.setAttribute('height', '220%');
      var blur = document.createElementNS(NS, 'feGaussianBlur');
      blur.setAttribute('stdDeviation', '4');
      blur.setAttribute('result', 'b');
      var merge = document.createElementNS(NS, 'feMerge');
      ['b', 'SourceGraphic'].forEach(function (n) {
        var m = document.createElementNS(NS, 'feMergeNode');
        m.setAttribute('in', n);
        merge.appendChild(m);
      });
      filter.appendChild(blur); filter.appendChild(merge);
      defs.appendChild(filter);
      svg.appendChild(defs);

      // A faint trail the gleam leaves behind
      path = document.createElementNS(NS, 'path');
      path.setAttribute('class', 'lw-trail');
      svg.appendChild(path);

      // The gleam itself
      gleam = document.createElementNS(NS, 'path');
      gleam.setAttribute('class', 'lw-gleam');
      gleam.setAttribute('filter', 'url(#lw-glow)');
      svg.appendChild(gleam);

      section.appendChild(svg);
    }

    function layout() {
      var sb = section.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + sb.width + ' ' + sb.height);
      svg.setAttribute('width', sb.width);
      svg.setAttribute('height', sb.height);
      var d = build();
      path.setAttribute('d', d);
      gleam.setAttribute('d', d);
    }

    function play() {
      if (played) return;
      played = true;

      if (reduced) {
        // No travelling light. The card still arrives, which is the meaning.
        goal.classList.add('is-lit');
        anchor.classList.add('is-lit');
        return;
      }

      make();
      layout();

      var len = gleam.getTotalLength();
      // A short bright segment, chased by a gap the length of the whole path
      var seg = Math.max(90, len * 0.13);
      gleam.style.strokeDasharray = seg + ' ' + len;
      gleam.style.strokeDashoffset = seg;
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;

      // Start the letter glowing as the gleam leaves it
      anchor.classList.add('is-lit');

      requestAnimationFrame(function () {
        gleam.style.transition = 'stroke-dashoffset ' + TRAVEL + 'ms cubic-bezier(0.55, 0, 0.35, 1)';
        gleam.style.strokeDashoffset = -len;
        path.style.transition = 'stroke-dashoffset ' + TRAVEL + 'ms cubic-bezier(0.55, 0, 0.35, 1)';
        path.style.strokeDashoffset = 0;
      });

      // The card lights as the gleam reaches it, not after
      setTimeout(function () { goal.classList.add('is-lit'); }, TRAVEL * 0.82);

      // Fade the trail out once it has made its point
      setTimeout(function () { svg.classList.add('is-done'); }, TRAVEL + 700);
      setTimeout(function () { if (svg && svg.parentNode) svg.remove(); }, TRAVEL + 2200);
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
