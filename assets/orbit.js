/* =========================================================================
   imarket2web - orbit
   =========================================================================

   The work page hero. A wide space scene - sun on the left, Earth and Moon
   on the right - rebuilt out of particles, with the scroll driving a camera
   that travels from the sun across to the Earth.

   How it draws
   ------------
   The scene image is decoded once into an offscreen canvas and sampled on a
   grid. Every sample brighter than a threshold becomes a particle carrying
   that pixel's colour, which is why the sun comes out orange, the Earth blue
   and the starfield white without any of it being hardcoded. Dark space
   yields no particles, so roughly ten thousand describe the whole scene.

   Ten thousand fillRect calls a frame would be slow, so nothing is drawn
   with the 2D path API. Particles are written straight into an ImageData
   buffer as pixels and blitted once per frame with putImageData. That turns
   per-particle cost into a couple of array writes.

   Scroll phases
   -------------
     assemble  particles converge from a scatter into the scene
     travel    the camera pans from the sun to the Earth and Moon
     disperse  particles drift apart again as the section hands over

   Degrades honestly: the stage carries the scene as an ordinary CSS
   background. The canvas only hides it once the particles are running, so
   with no JS, with reduced motion, or before the script loads, the hero is
   simply the photograph.
   ========================================================================= */

(function () {
  'use strict';

  var SRC = '../images/orbit-scene.webp';
  var SAMPLE_W = 1000;   // width the scene is sampled at
  var STEP = 4;          // sampling grid, in sampled-image pixels
  var LUM_MIN = 26;      // below this a sample is empty space
  var ZOOM = 1.28;       // >1 so there is room to travel across the scene
  var MAX_DPR = 1.5;

  function smooth(a, b, x) {
    x = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  function init() {
    var track = document.querySelector('[data-orbit]');
    if (!track) return;
    var stage = track.querySelector('.orbit-stage');
    var canvas = track.querySelector('.orbit-canvas');
    if (!stage || !canvas) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}
    if (reduced) return;  // the CSS background stays, and that is correct

    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    var img = new Image();
    img.decoding = 'async';
    img.src = canvas.dataset.src || SRC;

    img.onload = function () { build(img); };
    img.onerror = function () { /* background image still shows */ };

    function build(image) {
      /* ---- Sample the scene into particles ---------------------------- */
      var ratio = image.naturalHeight / image.naturalWidth;
      var sw = SAMPLE_W, sh = Math.round(SAMPLE_W * ratio);
      var off = document.createElement('canvas');
      off.width = sw; off.height = sh;
      var octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(image, 0, 0, sw, sh);

      var src;
      try { src = octx.getImageData(0, 0, sw, sh).data; }
      catch (e) { return; }  // tainted canvas: leave the background in place

      var px = [], py = [], pr = [], pg = [], pb = [], ox = [], oy = [];
      for (var y = 0; y < sh; y += STEP) {
        for (var x = 0; x < sw; x += STEP) {
          var o = (y * sw + x) * 4;
          var r = src[o], g = src[o + 1], b = src[o + 2];
          if (0.299 * r + 0.587 * g + 0.114 * b < LUM_MIN) continue;
          px.push(x / sw);          // scene coordinates, 0..1
          py.push(y / sh);
          pr.push(r); pg.push(g); pb.push(b);
          // where this particle drifts in from, and back out to
          var ang = Math.random() * Math.PI * 2;
          var dist = 0.25 + Math.random() * 0.85;
          ox.push(Math.cos(ang) * dist);
          oy.push(Math.sin(ang) * dist * 0.6);
        }
      }
      var N = px.length;
      if (!N) return;

      /* ---- Buffer ------------------------------------------------------ */
      var W = 0, H = 0, dpr = 1, imgData = null, buf32 = null;

      function resize() {
        var rect = stage.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        W = Math.max(1, Math.round(rect.width * dpr));
        H = Math.max(1, Math.round(rect.height * dpr));
        canvas.width = W; canvas.height = H;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        imgData = ctx.createImageData(W, H);
        buf32 = new Uint32Array(imgData.data.buffer);
      }

      // 0xAABBGGRR on little-endian, which is every browser we care about
      function packed(r, g, b) { return (255 << 24) | (b << 16) | (g << 8) | r; }
      var BG = packed(4, 7, 14);

      function progress() {
        var r = track.getBoundingClientRect();
        var range = track.offsetHeight - window.innerHeight;
        return Math.max(0, Math.min(1, -r.top / Math.max(1, range)));
      }

      function draw() {
        if (!buf32) return;
        buf32.fill(BG);

        var p = progress();
        var assemble = smooth(0, 0.16, p);
        var travel = smooth(0.10, 0.94, p);
        var disperse = smooth(0.93, 1, p);

        // Scale the scene to cover the stage height, with room to pan
        var scale = (H / (SAMPLE_W * ratio)) * ZOOM;
        var sceneW = SAMPLE_W * scale;
        var sceneH = SAMPLE_W * ratio * scale;
        var camX = Math.max(0, sceneW - W) * travel;
        var camY = (sceneH - H) * 0.5;

        var spread = (1 - assemble) + disperse * 1.4;
        var alpha = assemble * (1 - disperse);
        if (alpha <= 0.01) { ctx.putImageData(imgData, 0, 0); return; }

        var dotW = dpr > 1.2 ? 2 : 1;

        for (var i = 0; i < N; i++) {
          var tx = px[i] * sceneW - camX;
          var ty = py[i] * sceneH - camY;
          if (spread > 0.001) {
            tx += ox[i] * sceneW * spread;
            ty += oy[i] * sceneH * spread;
          }
          var xi = tx | 0, yi = ty | 0;
          if (xi < 0 || yi < 0 || xi >= W - dotW || yi >= H - dotW) continue;

          var c = packed(
            (pr[i] * alpha) | 0,
            (pg[i] * alpha) | 0,
            (pb[i] * alpha) | 0
          );
          var base = yi * W + xi;
          buf32[base] = c;
          if (dotW === 2) {
            buf32[base + 1] = c;
            buf32[base + W] = c;
            buf32[base + W + 1] = c;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      /* ---- Loop, only while the section is on screen -------------------- */
      var ticking = false, onScreen = false;
      function request() {
        if (ticking || !onScreen) return;
        ticking = true;
        requestAnimationFrame(function () { ticking = false; draw(); });
      }

      resize();
      track.classList.add('is-live');

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          onScreen = e[0].isIntersecting;
          if (onScreen) draw();
        }, { rootMargin: '120px' }).observe(track);
      } else {
        onScreen = true;
      }
      draw();

      window.addEventListener('scroll', request, { passive: true });
      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { resize(); draw(); }, 150);
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
