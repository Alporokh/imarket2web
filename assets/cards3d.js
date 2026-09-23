/* =========================================================================
   imarket2web — service cards in 3D
   =========================================================================

   Section 02 becomes a depth stage, in the manner of pear.no's Questions
   section: the cards sit at different distances and travel toward the
   viewer as the page scrolls. Each one sharpens and fades its body copy in
   as it reaches the focal plane, then dissolves past the camera.

   How it works
   ------------
   A tall .cards3d-track holds a sticky .cards3d-stage. The stage carries the
   CSS perspective; the cards are absolutely positioned inside it, each with
   a fixed x/y slot and its own starting depth. Scroll progress through the
   track is mapped to a single travelling Z offset shared by every card, so
   they move together like objects passing a camera rather than animating
   independently.

   Degrades honestly
   -----------------
   Without JS, or with reduced motion, or on a narrow screen, the markup is
   left as an ordinary responsive grid — which is what it already was. The
   3D layer is only ever added on top of a layout that works without it.
   ========================================================================= */

(function () {
  'use strict';

  var MIN_WIDTH = 900;   // below this the grid reads better than the stage
  var CARD_W = 300;
  var CARD_H = 380;
  var DEPTH_GAP = 620;   // z distance between consecutive cards
  var FOCAL = 0;         // z at which a card is sharpest

  function init() {
    var track = document.querySelector('.cards3d-track');
    if (!track) return;
    var stage = track.querySelector('.cards3d-stage');
    var cards = [].slice.call(track.querySelectorAll('.svc'));
    if (!stage || !cards.length) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    var active = false;

    /* Scatter slots, as fractions of the stage box. Deliberately uneven so
       the cards read as objects in a space rather than a rotated grid. */
    var SLOTS = [
      { x: -0.30, y: -0.20 },
      { x:  0.28, y: -0.26 },
      { x: -0.34, y:  0.20 },
      { x:  0.32, y:  0.16 },
      { x: -0.02, y: -0.04 },
      { x:  0.06, y:  0.30 }
    ];

    function enable() {
      if (active) return;
      active = true;
      track.classList.add('is-3d');
      cards.forEach(function (c, i) {
        var s = SLOTS[i % SLOTS.length];
        c.style.position = 'absolute';
        c.style.width = CARD_W + 'px';
        c.style.minHeight = CARD_H + 'px';
        c.style.left = '50%';
        c.style.top = '50%';
        c._slot = s;
        c._z0 = -i * DEPTH_GAP;
      });
      render();
    }

    function disable() {
      if (!active) return;
      active = false;
      track.classList.remove('is-3d');
      cards.forEach(function (c) {
        c.style.cssText = '';
        c.classList.remove('is-focus');
      });
    }

    function progress() {
      var r = track.getBoundingClientRect();
      var range = track.offsetHeight - window.innerHeight;
      return Math.max(0, Math.min(1, -r.top / Math.max(1, range)));
    }

    function render() {
      if (!active) return;
      var p = progress();
      var travel = p * (cards.length + 0.6) * DEPTH_GAP;
      var sw = stage.clientWidth, sh = stage.clientHeight;

      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var z = c._z0 + travel;

        // Distance from the focal plane drives everything else
        var d = z - FOCAL;
        var opacity, blur;

        if (d > 240) {
          // Past the camera — dissolve out
          opacity = Math.max(0, 1 - (d - 240) / 320);
          blur = Math.min(6, (d - 240) / 90);
        } else if (d < -DEPTH_GAP * 1.6) {
          // Still far away
          opacity = Math.max(0, 1 + (d + DEPTH_GAP * 1.6) / (DEPTH_GAP * 0.9));
          blur = Math.min(5, -(d + DEPTH_GAP * 1.6) / 220);
        } else {
          opacity = 1;
          blur = 0;
        }

        var x = c._slot.x * sw;
        var y = c._slot.y * sh;

        c.style.transform =
          'translate3d(calc(-50% + ' + x.toFixed(1) + 'px), calc(-50% + ' +
          y.toFixed(1) + 'px), ' + z.toFixed(1) + 'px)';
        c.style.opacity = opacity.toFixed(3);
        c.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
        c.style.zIndex = String(1000 + Math.round(z / 10));

        // "In focus" = near the plane. Used to fade the body copy in.
        var focused = Math.abs(d) < 300;
        if (focused !== c._focused) {
          c._focused = focused;
          c.classList.toggle('is-focus', focused);
        }
      }
    }

    var ticking = false;
    function onScroll() {
      if (ticking || !active) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; render(); });
    }

    function sync() {
      var wide = window.innerWidth >= MIN_WIDTH;
      (wide && !reduced) ? enable() : disable();
      if (active) render();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(sync, 150);
    }, { passive: true });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
