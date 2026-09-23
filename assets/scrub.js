/* =========================================================================
   imarket2web — scroll-scrub fallback
   =========================================================================

   The hero parallax is done properly in CSS with scroll-driven animations
   (see the SCROLL-SCRUB block in site.css). That runs off the main thread
   and is the preferred path.

   But `animation-timeline: view()` only exists in Chrome/Edge 115+,
   Firefox 144+ and Safari 26+. Everywhere else the CSS @supports guard
   degrades to a completely static hero — correct, but invisible.

   This file fills that gap: if the browser lacks support, it reproduces the
   same motion with a rAF-throttled scroll handler. It reads the SAME custom
   properties the CSS uses, so tuning --scrub-copy / --scrub-shots /
   --scrub-strip in site.css changes both paths at once.

   Does nothing at all when:
     - the browser supports scroll-driven animations (the CSS handles it), or
     - the visitor has asked for reduced motion.
   ========================================================================= */

(function () {
  'use strict';

  var supportsNative =
    window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (supportsNative) return;

  var reduced = false;
  try {
    reduced = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* treat as no preference */ }
  if (reduced) return;

  document.addEventListener('DOMContentLoaded', function () {
    var copy = document.querySelector('.hero > div:first-child');
    var shots = document.querySelector('.hero-shots');
    var strip = document.querySelector('.clients');
    if (!copy && !shots && !strip) return; // not the homepage

    document.documentElement.classList.add('scrub-js');

    // Read the tuning values from CSS so there is one source of truth.
    var cs = getComputedStyle(document.documentElement);
    function px(name, fallback) {
      var v = parseFloat(cs.getPropertyValue(name));
      return isNaN(v) ? fallback : v;
    }
    var D_COPY = px('--scrub-copy', -64);
    var D_SHOTS = px('--scrub-shots', -132);
    var D_STRIP = px('--scrub-strip', -30);

    var layers = [
      { el: copy,  dist: D_COPY,  minOpacity: 0.25 },
      { el: shots, dist: D_SHOTS, minOpacity: 0.35 },
      { el: strip, dist: D_STRIP, minOpacity: 0.30 }
    ].filter(function (l) { return l.el; });

    var ticking = false;

    /** 0 while the element is fully in view, 1 once it has completely left
        the top of the viewport — the same span as CSS `exit 0%` → `exit 100%`. */
    function exitProgress(el) {
      var r = el.getBoundingClientRect();
      if (r.bottom <= 0) return 1;      // gone
      if (r.top >= 0) return 0;         // not started leaving
      return Math.min(1, Math.max(0, -r.top / r.height));
    }

    function frame() {
      ticking = false;
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        var p = exitProgress(l.el);
        if (p === l.last) continue;     // skip untouched layers
        l.last = p;
        l.el.style.transform = p === 0
          ? ''
          : 'translate3d(0,' + (l.dist * p).toFixed(1) + 'px,0)';
        l.el.style.opacity = p === 0
          ? ''
          : (1 - (1 - l.minOpacity) * p).toFixed(3);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame(); // set the correct state for a page loaded mid-scroll
  });
})();
