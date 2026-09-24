/* =========================================================================
   imarket2web - twinkle
   =========================================================================

   A grid of small squares over the services hero, brightest around the sun
   and fading out from it. Most of them sit almost invisibly; a few hundred
   breathe in and out on their own cycles, so the grid reads as alive rather
   than as a pattern.

   Why two canvases
   ----------------
   A 10px grid over the sun quadrant is a few thousand cells. Redrawing all
   of them every frame is thousands of fillRects for an effect nobody is meant
   to notice. So the dim static grid is drawn once into an off-screen canvas
   and blitted each frame, and only the few hundred cells that are actually twinkling
   are drawn individually. That is a flat cost regardless of how fine the grid
   gets.

   Why the mask is in CSS
   ----------------------
   The fade around the sun is a radial mask on the canvas element, not a
   per-cell alpha calculation. The GPU does it for free and it stays correct
   when the hero resizes, where a baked-in falloff would need recomputing.

   Degrades to nothing at all: no canvas, no 2D context or reduced motion and
   the hero is exactly what it was.
   ========================================================================= */

(function () {
  'use strict';

  var CELL = 11;            // grid pitch in CSS px
  var SQUARE = 4;           // the square drawn inside each cell
  var STATIC_ALPHA = 0.042; // the grid you are not meant to see
  var LIVE = 320;           // how many twinkle at once
  var MIN_PERIOD = 2200;    // ms for the slowest breath
  var MAX_PERIOD = 6200;
  var MAX_DPR = 2;

  function build(stage) {
    var canvas = document.createElement('canvas');
    canvas.className = 'twinkle';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;

    var colour = stage.getAttribute('data-twinkle-color') || '255,235,200';
    var W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
    var grid = document.createElement('canvas');
    var gctx = grid.getContext('2d');
    var cells = [];
    var running = false, raf = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      W = Math.round(r.width);
      H = Math.round(r.height);
      canvas.width = grid.width = Math.round(W * dpr);
      canvas.height = grid.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);

      // the dim grid, drawn once
      gctx.clearRect(0, 0, W, H);
      gctx.fillStyle = 'rgba(' + colour + ',' + STATIC_ALPHA + ')';
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          gctx.fillRect(x * CELL, y * CELL, SQUARE, SQUARE);
        }
      }

      // pick the ones that will breathe
      cells.length = 0;
      var n = Math.min(LIVE, cols * rows);
      for (var i = 0; i < n; i++) {
        cells.push({
          x: (Math.random() * cols | 0) * CELL,
          y: (Math.random() * rows | 0) * CELL,
          period: MIN_PERIOD + Math.random() * (MAX_PERIOD - MIN_PERIOD),
          phase: Math.random() * Math.PI * 2,
          peak: 0.34 + Math.random() * 0.62
        });
      }
    }

    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(grid, 0, 0, W, H);
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        // sin gives an even in-and-out; squaring it keeps each square dark for
        // most of its cycle, which is what makes it a twinkle and not a pulse
        var s = Math.sin((now / c.period) * Math.PI * 2 + c.phase) * 0.5 + 0.5;
        var a = s * s * c.peak;
        if (a < 0.02) continue;
        ctx.fillStyle = 'rgba(' + colour + ',' + a.toFixed(3) + ')';
        ctx.fillRect(c.x, c.y, SQUARE, SQUARE);
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    stage.appendChild(canvas);
    resize();

    if (reduced.matches) {
      // One held frame: the grid is still there, it just does not breathe.
      frame(0);
      window.addEventListener('resize', function () { resize(); frame(0); });
      return;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(stage);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 140);
    });
  }

  function init() {
    var stages = document.querySelectorAll('[data-twinkle]');
    for (var i = 0; i < stages.length; i++) {
      try { build(stages[i]); } catch (e) { /* the hero is unchanged */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
