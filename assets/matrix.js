/* =========================================================================
   imarket2web — Matrix rain hero
   =========================================================================

   Falling characters behind the hero copy, the way the film does it: each
   column has a bright leading glyph with a fading tail behind it, glyphs
   swap as they fall, and columns run at their own speeds.

   Two departures from the film, both deliberate:

     - The glyphs are real code, not katakana. The brief was "as if someone
       writes code", and the site sells building things, so the rain is made
       of the characters you actually type: braces, tags, operators, hex.
     - White with a blue leading glyph rather than green. The palette here is
       dark plus #4FA3F5, and film-green fights it. To go green anyway, set
       --matrix-head and --matrix-body in site.css — nothing else changes.

   Performance: one canvas, one rAF loop, throttled to ~24fps because the
   effect looks better slightly steppy than perfectly smooth, and it keeps
   the cost near zero. Pauses entirely when the hero scrolls out of view or
   the tab is hidden, so it never burns battery in the background.

   Honours prefers-reduced-motion by rendering one static frame instead of
   animating: the texture stays, the movement goes.
   ========================================================================= */

(function () {
  'use strict';

  var GLYPHS = '01{}[]()<>/\\|=+-*&^%$#@!?:;.,_~abcdefABCDEF</>';
  var FONT_SIZE = 15;
  var FPS = 24;

  function init() {
    var canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    var host = canvas.closest('.matrix-hero') || canvas.parentElement;
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var cs = getComputedStyle(document.documentElement);
    var HEAD = (cs.getPropertyValue('--matrix-head') || '#7CBAF8').trim();
    var BODY = (cs.getPropertyValue('--matrix-body') || '255,255,255').trim();

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    var w = 0, h = 0, dpr = 1, cols = 0;
    var drops = [];      // y position of each column's leading glyph, in rows
    var speeds = [];     // rows per frame
    var chars = [];      // the glyph currently shown at each row of each column

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function glyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

    function resize() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '500 ' + FONT_SIZE + 'px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';

      cols = Math.ceil(w / FONT_SIZE);
      drops = []; speeds = []; chars = [];
      for (var i = 0; i < cols; i++) {
        // Stagger the start so the screen is mid-rain immediately, not empty
        drops[i] = rnd(-40, h / FONT_SIZE);
        speeds[i] = rnd(0.22, 0.75);
        chars[i] = [];
      }
    }

    var rows = function () { return Math.ceil(h / FONT_SIZE) + 2; };

    function frame() {
      // Fade the previous frame instead of clearing it: that is what leaves
      // the trailing tail behind each leading glyph.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.085)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      var maxRow = rows();
      for (var i = 0; i < cols; i++) {
        var x = i * FONT_SIZE;
        var head = drops[i];
        var hr = Math.floor(head);

        if (hr >= 0 && hr < maxRow) {
          // Occasionally swap the glyph under the head, so the trail reads as
          // changing text rather than a static string sliding down.
          if (Math.random() < 0.5) chars[i][hr] = glyph();
          var g = chars[i][hr] || (chars[i][hr] = glyph());

          // Leading glyph: brand blue, with a glow
          ctx.shadowColor = HEAD;
          ctx.shadowBlur = 8;
          ctx.fillStyle = HEAD;
          ctx.fillText(g, x, hr * FONT_SIZE);
          ctx.shadowBlur = 0;

          // The one just behind it, bright white, no glow
          var pr = hr - 1;
          if (pr >= 0 && chars[i][pr]) {
            ctx.fillStyle = 'rgba(' + BODY + ',0.92)';
            ctx.fillText(chars[i][pr], x, pr * FONT_SIZE);
          }
        }

        drops[i] += speeds[i];

        // Restart the column above the top once it has fallen past the bottom
        if (drops[i] * FONT_SIZE > h + rnd(0, h * 0.8)) {
          drops[i] = rnd(-30, -2);
          speeds[i] = rnd(0.22, 0.75);
          chars[i] = [];
        }
      }
    }

    /* ---- Loop, paused whenever it cannot be seen --------------------------- */
    var running = false, visible = true, onScreen = true, last = 0;
    var interval = 1000 / FPS;

    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (t - last < interval) return;
      last = t;
      frame();
    }

    function start() {
      if (running || reduced) return;
      running = true; last = 0;
      requestAnimationFrame(loop);
    }
    function stop() { running = false; }
    function sync() { (visible && onScreen) ? start() : stop(); }

    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      sync();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(host);
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { resize(); if (reduced) staticFrame(); }, 150);
    }, { passive: true });

    /* Reduced motion: draw the texture once and leave it. */
    function staticFrame() {
      ctx.clearRect(0, 0, w, h);
      var maxRow = rows();
      for (var i = 0; i < cols; i++) {
        var runLen = (Math.random() * 14) | 0;
        var top = (Math.random() * maxRow) | 0;
        for (var r = 0; r < runLen; r++) {
          var row = top + r;
          if (row >= maxRow) break;
          var fade = 1 - r / runLen;
          ctx.fillStyle = r === 0
            ? HEAD
            : 'rgba(' + BODY + ',' + (fade * 0.5).toFixed(3) + ')';
          ctx.fillText(glyph(), i * FONT_SIZE, row * FONT_SIZE);
        }
      }
    }

    resize();
    if (reduced) staticFrame(); else start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
