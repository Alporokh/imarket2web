/* =========================================================================
   imarket2web - portal
   =========================================================================

   A circular portal for the services hero: a vortex lens that drags the
   photograph behind it into a spiral, a glowing rim, and particles winding
   in toward the centre.

   Why a shader and not more canvas particles
   ------------------------------------------
   orbit.js draws the work-page hero by writing pixels into an ImageData
   buffer, which is the right tool when every particle carries a colour
   sampled from a photograph. This is a different problem: the whole disc is
   warped every frame, and warping a bitmap per pixel on the CPU is hopeless.
   Here the GPU does it - one fullscreen quad whose fragment shader reads the
   photograph through a swirled coordinate, plus a few thousand GL_POINTS for
   the particles. Cost is roughly flat in particle count.

   Two passes, two blend modes
   ---------------------------
     1. the disc, blended normally, so it sits over the hero photograph
     2. the particles, blended additively, so overlaps build light

   Degrades to the photograph
   --------------------------
   The canvas starts transparent and is only faded in once a frame has
   actually been drawn. No WebGL, a failed shader compile, a texture that
   will not load, or reduced motion all leave the hero exactly as it was:
   the CSS background image, unchanged. Nothing here is load-bearing.

   Customising it
   --------------
   Every value below is overridable per element, so the same file can drive a
   different portal on another page without editing this one:

     data-portal-image    URL of the photograph to look through (optional -
                          without it the portal is purely procedural)
     data-portal-count    particle count                        (1600)
     data-portal-radius   disc radius, fraction of min(w,h)     (0.34)
     data-portal-x        centre, fraction of width             (0.74)
     data-portal-y        centre, fraction of height            (0.46)
     data-portal-swirl    vortex strength                       (0.35)
     data-portal-speed    global time scale                     (1)
     data-portal-glow     rim brightness                        (1)
     data-portal-flow     in | out | orbit                      (in)
     data-portal-color-a  inner//cool colour, hex               (#1668D8)
     data-portal-color-b  outer/hot colour, hex                 (#9FD2FF)
     data-portal-cursor   how far the pointer pulls the centre,
                          as a fraction of the radius           (0.07)
   ========================================================================= */

(function () {
  'use strict';

  var MAX_DPR = 1.75;        // beyond this the fill cost stops buying anything
  var SMALL = 900;           // px - below this the portal recentres

  var DEFAULTS = {
    count: 1600,
    radius: 0.34,
    x: 0.74,
    y: 0.46,
    swirl: 0.35,
    speed: 1,
    glow: 1,
    flow: 'in',
    colorA: '#1668D8',
    colorB: '#9FD2FF',
    cursor: 0.07
  };

  /* ---- Shaders --------------------------------------------------------- */

  var QUAD_VS = [
    'attribute vec2 aPos;',
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var PORTAL_FS = [
    'precision highp float;',
    'uniform vec2  uRes;',
    'uniform vec2  uCenter;',
    'uniform float uRadius;',
    'uniform float uTime;',
    'uniform float uSwirl;',
    'uniform float uGlow;',
    'uniform vec3  uColA;',
    'uniform vec3  uColB;',
    'uniform sampler2D uTex;',
    'uniform float uHasTex;',
    'uniform vec2  uTexScale;',

    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }',
    '  return v;',
    '}',

    'void main() {',
    '  vec2 d = gl_FragCoord.xy - uCenter;',
    '  float r = length(d) / uRadius;',

    // Everything below costs five octaves of noise per pixel. Outside the
    // disc and its halo there is nothing to show, so leave before paying for
    // it - on a wide screen that is most of the fragments.
    '  if (r > 1.9) { gl_FragColor = vec4(0.0); return; }',

    '  float ang = atan(d.y, d.x);',

    // Rotation grows as the radius falls, so the disc winds up toward the eye
    // of the vortex instead of turning as one rigid plate.
    '  float wind = uSwirl / (r * r + 0.22);',
    '  float a2 = ang + wind - uTime * 0.22;',

    // Turbulence sampled in polar space, so the detail spirals with the disc.
    '  float n = fbm(vec2(a2 * 1.7, r * 2.6 - uTime * 0.5));',

    // Look through the portal: the scene, dragged round by that same vortex.
    '  vec2 warp = uCenter + vec2(cos(a2), sin(a2)) * (r * uRadius) * (0.94 + 0.10 * n);',
    '  vec2 uv = (warp / uRes - 0.5) * uTexScale + 0.5;',
    '  vec3 scene = texture2D(uTex, clamp(uv, 0.002, 0.998)).rgb * uHasTex;',

    // pow() is undefined for a negative base in GLSL ES, and both of these
    // bases go negative inside the disc. Square by multiplying instead.
    '  float rw = (r - 0.965) / 0.05;',
    '  float hw = (r - 1.02) * 2.0;',
    '  float inside = 1.0 - smoothstep(0.80, 1.0, r);',
    '  float rim    = exp(-rw * rw);',
    '  float core   = pow(max(0.0, 1.0 - r), 2.4);',
    '  float haze   = exp(-hw * hw) * 0.34;',

    '  vec3 energy = mix(uColA, uColB, clamp(n * 0.85 + core * 0.5, 0.0, 1.0));',
    '  vec3 col = scene * inside * (0.72 + 0.85 * n);',
    '  col += energy * (rim * uGlow + core * 0.5 + haze * 0.7 + n * 0.18 * inside);',

    '  float alpha = clamp(inside * (0.55 + 0.6 * n) + rim * uGlow * 0.9 + haze, 0.0, 1.0);',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  var PART_VS = [
    'precision highp float;',
    'attribute vec4 aSeed;',   // angle0, radius0, phase, tone/size
    'uniform vec2  uRes;',
    'uniform vec2  uCenter;',
    'uniform float uRadius;',
    'uniform float uTime;',
    'uniform float uFlow;',    // 1 in, -1 out, 0 orbit
    'uniform float uDpr;',
    'varying float vFade;',
    'varying float vTone;',

    'void main() {',
    '  float sp = 0.05 + aSeed.z * 0.09;',
    '  float life = fract(aSeed.z * 9.73 + uTime * sp);',

    '  float rr;',
    '  if (uFlow > 0.5)       rr = mix(1.75, 0.04, life);',
    '  else if (uFlow < -0.5) rr = mix(0.04, 1.75, life);',
    '  else                   rr = aSeed.y * (1.0 + 0.10 * sin(uTime * 1.3 + aSeed.x * 6.0));',

    // Angular speed rises as the radius falls, the way anything falling
    // inward actually behaves. It is what makes the centre look like a drain.
    '  float ang = aSeed.x + uTime * (0.35 + 0.9 / (rr + 0.35));',
    '  vec2 p = uCenter + vec2(cos(ang), sin(ang)) * rr * uRadius;',

    '  gl_Position = vec4((p / uRes) * 2.0 - 1.0, 0.0, 1.0);',
    '  gl_PointSize = (0.9 + aSeed.w * 2.6) * uDpr * (0.55 + 0.7 * (1.0 - min(rr, 1.0)));',

    // Orbiting particles never respawn, so they must not blink.
    '  float fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.82, 1.0, life));',
    '  vFade = (uFlow > 0.5 || uFlow < -0.5) ? fade : 1.0;',
    '  vTone = aSeed.w;',
    '}'
  ].join('\n');

  var PART_FS = [
    'precision mediump float;',
    'uniform vec3 uColA;',
    'uniform vec3 uColB;',
    'varying float vFade;',
    'varying float vTone;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float a = exp(-dot(c, c) * 16.0) * vFade;',
    '  gl_FragColor = vec4(mix(uColA, uColB, vTone), a);',
    '}'
  ].join('\n');

  /* ---- Small helpers --------------------------------------------------- */

  function num(el, name, fallback) {
    var v = parseFloat(el.getAttribute('data-portal-' + name));
    return isFinite(v) ? v : fallback;
  }

  function rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var i = parseInt(h, 16);
    if (!isFinite(i)) return [1, 1, 1];
    return [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function program(gl, vsSrc, fsSrc) {
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }

  function uniforms(gl, p, names) {
    var u = {};
    for (var i = 0; i < names.length; i++) u[names[i]] = gl.getUniformLocation(p, names[i]);
    return u;
  }

  /* ---- One portal ------------------------------------------------------ */

  function build(stage) {
    var cfg = {
      count: Math.max(0, Math.round(num(stage, 'count', DEFAULTS.count))),
      radius: num(stage, 'radius', DEFAULTS.radius),
      x: num(stage, 'x', DEFAULTS.x),
      y: num(stage, 'y', DEFAULTS.y),
      swirl: num(stage, 'swirl', DEFAULTS.swirl),
      speed: num(stage, 'speed', DEFAULTS.speed),
      glow: num(stage, 'glow', DEFAULTS.glow),
      cursor: num(stage, 'cursor', DEFAULTS.cursor),
      flow: stage.getAttribute('data-portal-flow') || DEFAULTS.flow,
      colA: rgb(stage.getAttribute('data-portal-color-a') || DEFAULTS.colorA),
      colB: rgb(stage.getAttribute('data-portal-color-b') || DEFAULTS.colorB),
      src: stage.getAttribute('data-portal-image') || ''
    };
    var flow = cfg.flow === 'out' ? -1 : cfg.flow === 'orbit' ? 0 : 1;

    var canvas = document.createElement('canvas');
    canvas.className = 'svc-hero-portal';
    canvas.setAttribute('aria-hidden', 'true');

    var opts = { alpha: true, antialias: false, depth: false, stencil: false,
                 premultipliedAlpha: false, powerPreference: 'low-power' };
    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return;

    var pPortal = program(gl, QUAD_VS, PORTAL_FS);
    var pPart = program(gl, PART_VS, PART_FS);
    if (!pPortal || !pPart) return;

    var uP = uniforms(gl, pPortal, ['uRes', 'uCenter', 'uRadius', 'uTime', 'uSwirl',
                                    'uGlow', 'uColA', 'uColB', 'uTex', 'uHasTex', 'uTexScale']);
    var uQ = uniforms(gl, pPart, ['uRes', 'uCenter', 'uRadius', 'uTime', 'uFlow',
                                  'uDpr', 'uColA', 'uColB']);

    // Fullscreen quad
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(pPortal, 'aPos');

    // Particle seeds. Nothing changes per frame - the vertex shader derives
    // the whole trajectory from the seed and the clock, so there is no buffer
    // upload after this one.
    var seeds = new Float32Array(cfg.count * 4);
    for (var i = 0; i < cfg.count; i++) {
      seeds[i * 4]     = Math.random() * Math.PI * 2;      // start angle
      seeds[i * 4 + 1] = 0.35 + Math.random() * 1.05;      // orbit radius
      seeds[i * 4 + 2] = Math.random();                    // phase + speed
      seeds[i * 4 + 3] = Math.random();                    // tone + size
    }
    var pbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    var aSeed = gl.getAttribLocation(pPart, 'aSeed');

    // A 1x1 texture stands in until (or instead of) the photograph, so the
    // sampler is always bound to something real.
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var hasTex = 0, imgW = 1, imgH = 1;
    if (cfg.src) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        // An image the context may not read (a cross-origin file, or any
        // image at all when the page is opened over file://) makes this
        // throw. That is survivable - the portal simply runs procedural.
        try {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          // The photograph is not a power of two, so: no mipmaps, clamped wrap.
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          imgW = img.naturalWidth;
          imgH = img.naturalHeight;
          hasTex = 1;
        } catch (e) { hasTex = 0; }
        // Held on a single frame, nothing would redraw once the photograph
        // arrives, so the lens would stay procedural. Redraw it.
        if (staticMode) frame(0);
      };
      img.src = cfg.src;
    }

    var W = 0, H = 0, dpr = 1;
    var cx = 0, cy = 0, radius = 0;     // resolved in device pixels
    var px = 0, py = 0;                 // pointer offset, eased
    var tx = 0, ty = 0;                 // pointer offset, target
    var running = false, drawn = false, raf = 0, staticMode = false;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      var rect = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      W = Math.max(1, Math.round(rect.width * dpr));
      H = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = W;
      canvas.height = H;
      var small = rect.width < SMALL;
      var fx = small ? 0.5 : cfg.x;
      var fy = small ? 0.32 : cfg.y;
      cx = W * fx;
      cy = H * (1 - fy);               // GL counts y from the bottom
      radius = Math.min(W, H) * cfg.radius * (small ? 0.82 : 1);
      gl.viewport(0, 0, W, H);
    }

    function texScale() {
      // cover-fit: show the largest centred rect of the image that fills the
      // canvas, the same framing CSS `background-size: cover` would pick.
      var ca = W / H, ia = imgW / imgH;
      return ca > ia ? [1, ia / ca] : [ca / ia, 1];
    }

    function frame(now) {
      var t = (now || 0) * 0.001 * cfg.speed;

      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;
      var ccx = cx + px * radius * cfg.cursor;
      var ccy = cy + py * radius * cfg.cursor;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);

      // Pass 1 - the disc, over the photograph
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pPortal);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uP.uTex, 0);
      gl.uniform1f(uP.uHasTex, hasTex);
      var s = texScale();
      gl.uniform2f(uP.uTexScale, s[0], s[1]);
      gl.uniform2f(uP.uRes, W, H);
      gl.uniform2f(uP.uCenter, ccx, ccy);
      gl.uniform1f(uP.uRadius, radius);
      gl.uniform1f(uP.uTime, t);
      gl.uniform1f(uP.uSwirl, cfg.swirl);
      gl.uniform1f(uP.uGlow, cfg.glow);
      gl.uniform3fv(uP.uColA, cfg.colA);
      gl.uniform3fv(uP.uColB, cfg.colB);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2 - particles, additive so overlaps build light
      if (cfg.count > 0) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(pPart);
        gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
        gl.enableVertexAttribArray(aSeed);
        gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
        gl.uniform2f(uQ.uRes, W, H);
        gl.uniform2f(uQ.uCenter, ccx, ccy);
        gl.uniform1f(uQ.uRadius, radius);
        gl.uniform1f(uQ.uTime, t);
        gl.uniform1f(uQ.uFlow, flow);
        gl.uniform1f(uQ.uDpr, dpr);
        gl.uniform3fv(uQ.uColA, cfg.colA);
        gl.uniform3fv(uQ.uColB, cfg.colB);
        gl.drawArrays(gl.POINTS, 0, cfg.count);
      }

      if (!drawn) {
        drawn = true;
        stage.classList.add('has-portal');
        canvas.classList.add('is-on');
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced.matches) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    stage.appendChild(canvas);
    resize();

    // A lost context leaves a blank canvas over a hero we have already dimmed
    // for it. Put the photograph back rather than leaving a dark hole.
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      stop();
      canvas.classList.remove('is-on');
      stage.classList.remove('has-portal');
    });

    // Reduced motion: one frame, held. The portal is still a portal; it just
    // does not move.
    if (reduced.matches) {
      staticMode = true;
      var once = function () { resize(); frame(0); };
      once();
      window.addEventListener('resize', once);
      return;
    }

    // Only run while it is actually on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
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
      rt = setTimeout(resize, 120);
    });

    // The pointer nudges the centre. Listening on the stage, not the canvas,
    // keeps the canvas pointer-events: none so the CTAs stay clickable.
    if (cfg.cursor > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      stage.addEventListener('pointermove', function (e) {
        var rect = stage.getBoundingClientRect();
        tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        ty = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      stage.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    }
  }

  function init() {
    var stages = document.querySelectorAll('[data-portal]');
    for (var i = 0; i < stages.length; i++) {
      try { build(stages[i]); } catch (e) { /* hero stays as the photograph */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
