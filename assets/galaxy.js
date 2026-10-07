/* =========================================================================
   imarket2web - "Binary Orbits": a tilted spiral galaxy behind service heroes
   =========================================================================

   Two bright cores circle each other at the centre; stars stream outward
   along two logarithmic spiral arms and are reborn near the core, so the
   arms look like rivers of light rather than a picture that spins.

   The disc is drawn in 3D and tilted toward the viewer, then the whole
   image is rotated a little, so it reads as a galaxy seen at an angle.

   Usage: <canvas class="galaxy-canvas" aria-hidden="true"></canvas> as the
   first child of a section with class "galaxy-hero". Pauses when the hero is
   off-screen or the tab is hidden; reduced motion draws one still frame.
   ========================================================================= */
(function () {
  'use strict';

  var canvas = document.querySelector('.galaxy-canvas');
  if (!canvas) return;
  var host = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var TILT = 1.05;          // radians the disc leans back (0 = face-on)
  var ROLL = -0.42;         // radians the whole galaxy is turned on screen
  var ARMS = 2;
  var WIND = 3.4;           // how tightly the arms wind
  var COUNT_DESKTOP = 3400, COUNT_MOBILE = 1500;
  var BULGE = 0.22;         // share of stars in the round central bulge

  var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  var stars = [];
  var t0 = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  // a gaussian-ish spread, so stars hug the arm's centre line
  function spread() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function makeStar(fresh) {
    var arm = Math.floor(Math.random() * ARMS);
    if (fresh !== false && Math.random() < BULGE) return makeBulge();
    return {
      arm: arm,
      t: fresh ? Math.pow(Math.random(), 0.8) : rnd(0, 0.08),   // position along the arm, 0 = core
      speed: rnd(0.012, 0.03),                                 // arm lengths per second
      off: spread() * rnd(0.2, 0.75),                          // sideways from the arm line (arms fan out)
      z: spread() * 0.05,                                      // disc thickness
      size: Math.random() < 0.06 ? rnd(1.4, 2.2) : rnd(0.5, 1.2),
      hue: Math.random(),                                      // picks blue / white / warm
      tw: rnd(0, Math.PI * 2)                                  // twinkle phase
    };
  }

  // bulge stars circle the cores instead of streaming along an arm
  function makeBulge() {
    var r = Math.pow(Math.random(), 1.8) * 0.28;
    return { bulge: true, r: r, a: rnd(0, Math.PI * 2), w: rnd(0.25, 0.6) / (0.15 + r), z: spread() * 0.08 * (1 - r * 2),
      size: rnd(0.5, 1.3), hue: Math.random() < 0.6 ? 0.7 : Math.random(), tw: rnd(0, Math.PI * 2) };
  }

  function resize() {
    var r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var mobile = w < 760;
    cx = mobile ? w * 0.78 : w * 0.74;
    cy = mobile ? h * 0.22 : h * 0.5;
    R = Math.min(mobile ? w * 0.62 : w * 0.34, h * (mobile ? 0.5 : 0.62)) * 1.15;
    var n = mobile ? COUNT_MOBILE : COUNT_DESKTOP;
    stars = [];
    for (var i = 0; i < n; i++) stars.push(makeStar(true));
  }

  // 3D point on the disc -> screen
  var cosT = Math.cos(TILT), sinT = Math.sin(TILT), cosR = Math.cos(ROLL), sinR = Math.sin(ROLL);
  function project(x, y, z) {
    var y2 = y * cosT - z * sinT;           // tilt the disc back
    var z2 = y * sinT + z * cosT;
    var px = x * cosR - y2 * sinR;          // roll it on screen
    var py = x * sinR + y2 * cosR;
    var depth = 1 + z2 * 0.35;              // nearer side a touch larger
    return [cx + px * R * depth, cy + py * R * depth, depth];
  }

  function color(s, a) {
    if (s.hue < 0.55) return 'rgba(124,186,248,' + a + ')';   // brand light blue
    if (s.hue < 0.85) return 'rgba(242,240,234,' + a + ')';   // warm white
    return 'rgba(255,214,170,' + a + ')';                      // a few warm stars
  }

  function frame(now) {
    var time = now / 1000;
    var dt = t0 ? Math.min(0.05, time - t0) : 0.016;
    t0 = time;
    var spin = time * 0.05;                                    // the whole disc turns slowly

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // soft glow of the bulge
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
    g.addColorStop(0, 'rgba(255,236,210,0.22)');
    g.addColorStop(0.35, 'rgba(79,163,245,0.08)');
    g.addColorStop(1, 'rgba(79,163,245,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.bulge) {
        if (!reduced) s.a += s.w * dt;
        var bq = project(Math.cos(s.a) * s.r, Math.sin(s.a) * s.r, s.z);
        var ba = (0.45 + 0.5 * (1 - s.r / 0.28)) * (0.75 + 0.25 * Math.sin(time * 2 + s.tw));
        var bs = s.size * bq[2];
        ctx.fillStyle = color(s, ba.toFixed(3));
        ctx.fillRect(bq[0] - bs / 2, bq[1] - bs / 2, bs, bs);
        continue;
      }
      if (!reduced) {
        s.t += s.speed * dt;
        if (s.t > 1) { stars[i] = s = makeStar(false); }
      }
      var r = 0.04 + s.t;                                      // radius in disc units
      var theta = s.arm * (Math.PI * 2 / ARMS) + WIND * Math.log(1 + r * 3) + spin + s.off / (0.6 + r * 2);
      var x = Math.cos(theta) * r, y = Math.sin(theta) * r;
      var p = project(x, y, s.z * (1 - s.t * 0.6));
      var fade = s.t < 0.06 ? s.t / 0.06 : (s.t > 0.82 ? (1 - s.t) / 0.18 : 1);
      var tw = 0.75 + 0.25 * Math.sin(time * 2 + s.tw);
      var a = Math.max(0, fade * tw * (0.35 + 0.65 * (1 - s.t)));
      var size = s.size * p[2];
      ctx.fillStyle = color(s, a.toFixed(3));
      ctx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size);
    }

    // the binary pair: two cores orbiting their common centre
    var orbit = time * 0.9;
    for (var k = 0; k < 2; k++) {
      var ang = orbit + k * Math.PI;
      var q = project(Math.cos(ang) * 0.045, Math.sin(ang) * 0.045, 0);
      var core = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 14);
      core.addColorStop(0, k ? 'rgba(255,240,220,0.95)' : 'rgba(170,215,255,0.95)');
      core.addColorStop(0.25, k ? 'rgba(255,214,170,0.45)' : 'rgba(79,163,245,0.45)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(q[0], q[1], 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- loop, paused when it cannot be seen ---- */
  var running = false, visible = true, onScreen = true;
  function loop(now) { if (!running) return; frame(now); requestAnimationFrame(loop); }
  function start() { if (running || reduced) return; running = true; t0 = 0; requestAnimationFrame(loop); }
  function stop() { running = false; }
  function sync() { (visible && onScreen) ? start() : stop(); }

  document.addEventListener('visibilitychange', function () { visible = !document.hidden; sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; sync(); }, { threshold: 0 }).observe(host);
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduced) frame(performance.now()); }, 150);
  }, { passive: true });

  // first measure on the next frame, so it does not force a layout during load
  requestAnimationFrame(function () {
    resize();
    if (reduced) frame(performance.now()); else start();
    canvas.classList.add('is-on');
  });
})();
