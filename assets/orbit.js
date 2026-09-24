/* =========================================================================
   imarket2web - orbit
   =========================================================================

   The work page hero: a wide space scene - sun on the left, Earth and Moon
   on the right - rebuilt out of particles that swirl apart and reassemble,
   with the scroll driving a camera that travels from the sun to the Earth.

   The particle model follows ReactBits' ParticleImage, which is what was
   asked for, and keeps its vocabulary so the two are comparable:

     - colours are sampled from the source image, never hardcoded
     - particles accelerate along a Perlin noise flow field that evolves
       over time, so they drift in currents rather than sitting still
     - velocity is retained frame to frame and scaled by DAMPING
     - each particle has a LIFESPAN, after which it respawns at its home
       position with no velocity. That constant dying and returning is what
       reads as "swirl apart and reassemble"
     - the pointer transfers momentum to particles within CURSOR_RADIUS

   Two things are ours rather than theirs: the scroll drives a camera pan
   across the scene, and the source image stays faintly visible underneath
   so the sun and Earth remain readable while the particles are moving.

   Why offsets, not absolute positions
   -----------------------------------
   Each particle stores an offset from its home rather than a screen
   coordinate. The camera can then pan without dragging particles out of
   formation, and the noise field is sampled in scene space so the currents
   belong to the scene rather than to the viewport.

   Why no fillRect
   ---------------
   Several thousand path calls a frame would be slow. Particles are written
   into an ImageData buffer as pixels and blitted once with putImageData,
   which turns per-particle cost into a couple of array writes.

   Degrades to the photograph: the stage carries the scene as a CSS
   background and the canvas only fades in once particles are drawing, so
   no JS, reduced motion, a slow load or a tainted canvas all leave the hero
   as the image.
   ========================================================================= */

(function () {
  'use strict';

  /* ---- Tuning, in ParticleImage's terms -------------------------------- */
  var SAMPLE_W = 1300;      // width the scene is sampled at
  var STEP = 3;             // sampling grid - lower is denser and slower
  var LUM_MIN = 26;         // below this, a sample is empty space
  var PARTICLE_SIZE = 1;    // px - a fine dust, as in the reference
  var SPEED = 0.00022;      // how fast the flow field evolves
  var NOISE_SCALE = 0.0012; // lower = longer, smoother currents
  var NOISE_STRENGTH = 0.14; // tuned so the scene stays legible while it swirls
  var DAMPING = 0.94;       // velocity retained per frame
  var LIFESPAN = 190;       // frames before a particle returns home
  var CURSOR_RADIUS = 180;  // px
  var CURSOR_STRENGTH = 2.4;
  var ZOOM = 1.28;          // >1 so there is room to travel
  var MAX_DPR = 1.5;

  /* ---- Perlin noise ----------------------------------------------------- */
  var perm = new Uint8Array(512);
  (function () {
    var p = [], i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = (Math.random() * (i + 1)) | 0; t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y) {
    switch (h & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  }
  function perlin(x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    var u = fade(x), v = fade(y);
    return lerp(
      lerp(grad(perm[perm[X] + Y], x, y), grad(perm[perm[X + 1] + Y], x - 1, y), u),
      lerp(grad(perm[perm[X] + Y + 1], x, y - 1), grad(perm[perm[X + 1] + Y + 1], x - 1, y - 1), u),
      v);
  }

  /* ---- Trig lookup ------------------------------------------------------
     cos and sin are called twice per particle per frame. At thirty thousand
     particles that is the single most expensive thing in the loop, and the
     flow field does not need more angular precision than 1024 steps. */
  var LUT = 1024, COS = new Float32Array(LUT), SIN = new Float32Array(LUT);
  for (var li = 0; li < LUT; li++) {
    var la = li / LUT * Math.PI * 2;
    COS[li] = Math.cos(la); SIN[li] = Math.sin(la);
  }
  var LUT_K = LUT / (Math.PI * 2);

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
    if (reduced) return;

    // Transparent, so the source image stays faintly visible underneath
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var img = new Image();
    img.decoding = 'async';
    img.src = canvas.dataset.src || '../images/orbit-scene.webp';
    img.onload = function () { build(img); };

    function build(image) {
      /* ---- Sample the scene ------------------------------------------- */
      var ratio = image.naturalHeight / image.naturalWidth;
      // A smaller source should be sampled at its own resolution rather than
      // upscaled: upscaling cannot invent detail, it only blurs what is there.
      var sampleW = parseInt(track.getAttribute("data-orbit-sample"), 10) || SAMPLE_W;
      sampleW = Math.min(sampleW, image.naturalWidth);
      var sw = sampleW, sh = Math.round(sampleW * ratio);
      var off = document.createElement('canvas');
      off.width = sw; off.height = sh;
      var octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(image, 0, 0, sw, sh);

      var src;
      try { src = octx.getImageData(0, 0, sw, sh).data; } catch (e) { return; }

      var hx = [], hy = [], col = [];
      for (var y = 0; y < sh; y += STEP) {
        for (var x = 0; x < sw; x += STEP) {
          var o = (y * sw + x) * 4;
          var r = src[o], g = src[o + 1], b = src[o + 2];
          if (0.299 * r + 0.587 * g + 0.114 * b < LUM_MIN) continue;
          hx.push(x / sw); hy.push(y / sh);
          col.push([r, g, b]);
        }
      }
      var N = hx.length;
      if (!N) return;

      // Live state. Offsets from home, so the camera can pan freely.
      var ox = new Float32Array(N), oy = new Float32Array(N);
      var vx = new Float32Array(N), vy = new Float32Array(N);
      var age = new Uint16Array(N);
      for (var i = 0; i < N; i++) age[i] = (Math.random() * LIFESPAN) | 0;

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
      function packed(r, g, b) { return (255 << 24) | (b << 16) | (g << 8) | r; }
      var BG = 0; // fully transparent

      /* ---- Pointer ----------------------------------------------------- */
      var pxr = -9999, pyr = -9999;
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        pxr = (e.clientX - r.left) * dpr;
        pyr = (e.clientY - r.top) * dpr;
      }, { passive: true });
      stage.addEventListener('pointerleave', function () { pxr = pyr = -9999; }, { passive: true });

      // A panel hero has no scroll track of its own. Rather than force one,
      // the camera simply holds at a fixed point in the scene and the
      // particles keep flowing. data-orbit-focus picks that point: 0 is the
      // sun, 1 the Earth.
      var FOCUS = parseFloat(track.getAttribute("data-orbit-focus"));
      if (isNaN(FOCUS)) FOCUS = 0.5;

      // A wide scene wants zoom > 1 so the camera has room to travel. A
      // portrait wants the whole frame, so it sets 1.
      var zoom = parseFloat(track.getAttribute("data-orbit-zoom"));
      if (isNaN(zoom)) zoom = ZOOM;

      // Drift is absolute pixels, not a proportion of the frame. The strength
      // that reads as a gentle current across a 2000px scene would tear a face
      // apart inside a 420px portrait, so small frames set their own.
      var noise = parseFloat(track.getAttribute("data-orbit-noise"));
      if (isNaN(noise)) noise = NOISE_STRENGTH;

      // Same reasoning for the pointer: a push tuned for a full-width scene
      // would scatter a portrait the moment the cursor crossed it.
      var cursorK = parseFloat(track.getAttribute("data-orbit-cursor"));
      if (isNaN(cursorK)) cursorK = CURSOR_STRENGTH;
      var cursorR = parseFloat(track.getAttribute("data-orbit-cursor-radius"));
      if (isNaN(cursorR)) cursorR = CURSOR_RADIUS;

      function progress() {
        var range = track.offsetHeight - window.innerHeight;
        if (range <= 8) return FOCUS;
        var r = track.getBoundingClientRect();
        return Math.max(0, Math.min(1, -r.top / range));
      }

      var t = 0;
      function frame() {
        if (!buf32) return;
        buf32.fill(BG);
        t += SPEED;

        var p = progress();
        var travel = smooth(0.06, 0.94, p);
        // Near the end the currents strengthen, so the scene comes apart
        var gust = 1 + smooth(0.9, 1, p) * 5;

        var scale = (H / (sw * ratio)) * zoom;
        var sceneW = sw * scale;
        var sceneH = sw * ratio * scale;
        var camX = Math.max(0, sceneW - W) * travel;
        var camY = (sceneH - H) * 0.5;

        var size = PARTICLE_SIZE * (dpr > 1.2 ? 1 : 0.5) | 0;
        if (size < 1) size = 1;
        var r2 = cursorR * dpr, r2sq = r2 * r2;

        for (var i = 0; i < N; i++) {
          var homeX = hx[i] * sceneW - camX;

          // The camera only ever shows part of the scene, so roughly a
          // quarter of the particles are off to one side at any moment.
          // Skipping their physics entirely is the cheapest win available.
          if (homeX < -120 || homeX > W + 120) continue;

          if (age[i]++ >= LIFESPAN) {
            age[i] = 0; ox[i] = 0; oy[i] = 0; vx[i] = 0; vy[i] = 0;
          }
          var homeY = hy[i] * sceneH - camY;
          var cx = homeX + ox[i], cy = homeY + oy[i];

          // Flow field, sampled in scene space so the currents belong to
          // the scene rather than drifting with the camera
          var a = perlin((cx + camX) * NOISE_SCALE + t, (cy + camY) * NOISE_SCALE) * Math.PI * 4;
          var k = ((a * LUT_K) | 0) & (LUT - 1);
          vx[i] += COS[k] * noise * gust;
          vy[i] += SIN[k] * noise * gust;

          // Pointer momentum
          var dx = cx - pxr, dy = cy - pyr;
          var d = dx * dx + dy * dy;
          if (d < r2sq && d > 0.01) {
            var f = (1 - Math.sqrt(d) / r2) * cursorK;
            var inv = 1 / Math.sqrt(d);
            vx[i] += dx * inv * f;
            vy[i] += dy * inv * f;
          }

          vx[i] *= DAMPING; vy[i] *= DAMPING;
          ox[i] += vx[i]; oy[i] += vy[i];

          var xi = (homeX + ox[i]) | 0, yi = (homeY + oy[i]) | 0;
          if (xi < 0 || yi < 0 || xi >= W - size || yi >= H - size) continue;

          var c = col[i];
          var v = packed(c[0], c[1], c[2]);
          var base = yi * W + xi;
          buf32[base] = v;
          if (size > 1) {
            buf32[base + 1] = v;
            buf32[base + W] = v;
            buf32[base + W + 1] = v;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      /* ---- Loop, only while visible ------------------------------------ */
      var running = false, onScreen = false, docVisible = true;
      function loop() { if (!running) return; frame(); requestAnimationFrame(loop); }
      function sync() {
        var want = onScreen && docVisible;
        if (want && !running) { running = true; requestAnimationFrame(loop); }
        else if (!want) running = false;
      }

      resize();
      track.classList.add('is-live');
      frame();

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          onScreen = e[0].isIntersecting; sync();
        }, { rootMargin: '150px' }).observe(track);
      } else { onScreen = true; sync(); }

      document.addEventListener('visibilitychange', function () {
        docVisible = !document.hidden; sync();
      });

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { resize(); frame(); }, 150);
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
