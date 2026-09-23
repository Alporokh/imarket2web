/* =========================================================================
   imarket2web — shuffle and deal
   =========================================================================

   The eight process cards gather into a loose pile, then deal out to their
   real grid positions in order, 01 through 08. The order is the point: the
   section says "Eight steps, then it loops", so watching them land in
   sequence says the same thing as the copy.

   How it works
   ------------
   The grid is never touched. The cards stay exactly where CSS puts them, and
   the animation is a transform applied on top and then removed — a FLIP, in
   effect, run backwards:

     1. Measure where each card actually is.
     2. Transform it back toward the centre of the grid, rotated and slightly
        small, so the set looks like a stack. No transition, so this is
        invisible.
     3. Remove the transform with a transition and a per-card delay, so they
        travel out to their real places one after another.

   Because the end state is "no transform", the layout is correct at every
   width and nothing is left pinned to a hardcoded position afterwards. If the
   script never runs, the cards are simply already where they belong.

   Plays once, when the section first comes into view. Repeating it on every
   scroll past would turn a nice moment into a tic.
   ========================================================================= */

(function () {
  'use strict';

  var STAGGER = 70;    // ms between consecutive cards
  var DURATION = 620;  // ms per card
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var SPREAD = 0.62;   // how far toward the pile each card starts (0-1)
  var TILT = 13;       // max degrees of rotation in the pile

  function init() {
    var grids = [].slice.call(document.querySelectorAll('[data-shuffle]'));
    if (!grids.length) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    // Reduced motion: no flying cards. A plain staggered fade still shows the
    // order, which is the part that carries meaning.
    grids.forEach(function (grid) {
      var cards = [].slice.call(grid.children);
      if (!cards.length) return;

      var played = false;

      function deal() {
        if (played) return;
        played = true;

        if (reduced) {
          cards.forEach(function (c, i) {
            c.style.opacity = '0';
            c.style.transition = 'opacity 420ms ease ' + (i * 45) + 'ms';
            requestAnimationFrame(function () { c.style.opacity = '1'; });
          });
          return;
        }

        // 1. Where is everything, really?
        var gb = grid.getBoundingClientRect();
        var cx = gb.left + gb.width / 2;
        var cy = gb.top + gb.height / 2;

        var starts = cards.map(function (c, i) {
          var b = c.getBoundingClientRect();
          var dx = (cx - (b.left + b.width / 2)) * SPREAD;
          var dy = (cy - (b.top + b.height / 2)) * SPREAD;
          // Deterministic tilt, so it looks shuffled but never lands oddly
          var tilt = (i % 2 ? 1 : -1) * (TILT - (i % 3) * 3.5);
          return { dx: dx, dy: dy, tilt: tilt };
        });

        // 2. Stack them, with no transition so the jump is not seen
        cards.forEach(function (c, i) {
          var s = starts[i];
          c.style.transition = 'none';
          c.style.transform =
            'translate3d(' + s.dx.toFixed(1) + 'px,' + s.dy.toFixed(1) + 'px,0) ' +
            'rotate(' + s.tilt.toFixed(2) + 'deg) scale(0.9)';
          c.style.opacity = '0';
          c.style.willChange = 'transform, opacity';
          // Later cards sit under earlier ones, so the pile reads as a deck
          c.style.zIndex = String(cards.length - i);
        });

        // Force the browser to apply the stacked state before animating out
        void grid.offsetHeight;

        // 3. Deal
        cards.forEach(function (c, i) {
          var delay = i * STAGGER;
          c.style.transition =
            'transform ' + DURATION + 'ms ' + EASE + ' ' + delay + 'ms, ' +
            'opacity ' + Math.round(DURATION * 0.55) + 'ms ease ' + delay + 'ms';
          c.style.transform = '';
          c.style.opacity = '';
        });

        // Clean up, so nothing is left with stale inline styles or will-change
        var total = (cards.length - 1) * STAGGER + DURATION + 60;
        setTimeout(function () {
          cards.forEach(function (c) {
            c.style.transition = '';
            c.style.willChange = '';
            c.style.zIndex = '';
          });
        }, total);
      }

      if (!('IntersectionObserver' in window)) { deal(); return; }

      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          io.disconnect();
          deal();
        }
      }, { threshold: 0.25 });
      io.observe(grid);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
