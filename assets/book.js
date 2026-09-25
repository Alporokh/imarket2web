/* =========================================================================
   imarket2web - the project book
   =========================================================================

   The five projects as pages you turn. Drag across them, use the arrows, or
   the keyboard; each page hinges on its left edge and sweeps away, the way a
   page does.

   Progressive enhancement, deliberately
   -------------------------------------
   The markup in the HTML is the grid it has always been: five <a> cards that
   work with no JavaScript, no 3D support and no pointer. This file only
   rebuilds them into a book once it knows the browser can do it. Turning a
   working list of links into a widget that needs a script to be read would be
   a bad trade for a page whose job is to get people into the case studies.

   Under prefers-reduced-motion nothing happens at all. A page turn is the
   animation - remove it and there is no reason to hide four of five projects
   behind a drag.

   Why a transition rather than rAF
   --------------------------------
   The settle after you let go has to be interruptible: grab the page again
   mid-flight and it must follow the finger from where it actually is, not
   from where the animation thought it would be. A CSS transition retargets
   from the current computed value for free; a hand-rolled tween has to be
   taught to.

   The hinge is the left edge and the stage clips, so a turned page leaves to
   the left and the stage stays exactly one page wide - which is what makes
   this survive a phone screen.
   ========================================================================= */

(function () {
  'use strict';

  var SETTLE = 460;                                  // ms for the release
  var EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';       // the drawer curve
  var THRESHOLD = 0.34;                              // fraction of a turn that commits
  var FLICK = 0.45;                                  // px/ms that commits regardless

  function build(grid) {
    var cards = [].slice.call(grid.children);
    if (cards.length < 2) return;

    var book = document.createElement('div');
    book.className = 'book';
    var stage = document.createElement('div');
    stage.className = 'book-stage';
    book.appendChild(stage);

    var pages = cards.map(function (card, i) {
      var page = document.createElement('div');
      page.className = 'book-page';
      page.style.zIndex = String(cards.length - i);

      var front = document.createElement('div');
      front.className = 'book-face book-face--front';
      front.appendChild(card);

      // The shadow that deepens as the page lifts - most of what sells a turn
      // is not the rotation, it is the light changing across it.
      var shade = document.createElement('div');
      shade.className = 'book-shade';
      front.appendChild(shade);

      var back = document.createElement('div');
      back.className = 'book-face book-face--back';
      back.setAttribute('aria-hidden', 'true');

      page.appendChild(front);
      page.appendChild(back);
      stage.appendChild(page);
      return { el: page, card: card, shade: shade };
    });

    /* ---- controls: a drag nobody can see is a drag nobody uses ---- */
    var L = document.documentElement.lang === 'pl'
      ? { prev: 'Poprzednia realizacja', next: 'Następna realizacja' }
      : { prev: 'Previous project', next: 'Next project' };

    var nav = document.createElement('div');
    nav.className = 'book-nav';
    nav.innerHTML =
      '<button type="button" class="book-btn" data-prev aria-label="' + L.prev + '">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg></button>' +
      '<span class="book-count mono" aria-live="polite"></span>' +
      '<button type="button" class="book-btn" data-next aria-label="' + L.next + '">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></button>';
    book.appendChild(nav);

    grid.parentNode.replaceChild(book, grid);

    var prevBtn = nav.querySelector('[data-prev]');
    var nextBtn = nav.querySelector('[data-next]');
    var count = nav.querySelector('.book-count');

    var idx = 0;            // how many pages have been turned
    var last = pages.length - 1;

    /* ---- the stage is as tall as the tallest page ---- */
    function measure() {
      stage.style.height = 'auto';
      pages.forEach(function (p) { p.el.style.position = 'relative'; });
      var h = 0;
      pages.forEach(function (p) { h = Math.max(h, p.el.offsetHeight); });
      pages.forEach(function (p) { p.el.style.position = ''; });
      stage.style.height = h + 'px';
    }

    function angleOf(i) { return i < idx ? -180 : 0; }

    function paint(i, deg, instant) {
      var p = pages[i];
      p.el.style.transition = instant ? 'none' : 'transform ' + SETTLE + 'ms ' + EASE;
      p.el.style.transform = 'rotateY(' + deg + 'deg)';
      // darkest at the midpoint of the turn, where the page is edge-on
      var t = Math.min(1, Math.abs(deg) / 180);
      p.shade.style.opacity = String(Math.sin(t * Math.PI) * 0.55);
    }

    function sync() {
      pages.forEach(function (p, i) {
        paint(i, angleOf(i), true);
        var turned = i < idx;
        // A link under a turned page must not be reachable by tab.
        p.card.setAttribute('tabindex', i === idx ? '0' : '-1');
        p.el.setAttribute('aria-hidden', turned || i > idx ? 'true' : 'false');
        p.el.style.pointerEvents = i === idx ? '' : 'none';
      });
      count.textContent = (idx + 1) + ' / ' + pages.length;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === last;
    }

    function go(n) {
      n = Math.max(0, Math.min(last, n));
      if (n === idx) return;
      var moving = n > idx ? idx : n;          // the page that actually turns
      idx = n;
      paint(moving, angleOf(moving), false);
      pages.forEach(function (p, i) {
        if (i !== moving) paint(i, angleOf(i), true);
        p.card.setAttribute('tabindex', i === idx ? '0' : '-1');
        p.el.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
        p.el.style.pointerEvents = i === idx ? '' : 'none';
      });
      count.textContent = (idx + 1) + ' / ' + pages.length;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === last;
    }

    nextBtn.addEventListener('click', function () { go(idx + 1); });
    prevBtn.addEventListener('click', function () { go(idx - 1); });

    book.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });

    /* ---- the drag ---- */
    var drag = null;

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = {
        x: e.clientX, y: e.clientY, t: performance.now(),
        lastX: e.clientX, lastT: performance.now(), v: 0,
        page: -1, dir: 0, decided: false, moved: false
      };
    });

    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;

      if (!drag.decided) {
        // Let a vertical swipe scroll the page instead of turning a leaf.
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.dir = dx < 0 ? 1 : -1;
        drag.page = drag.dir === 1 ? idx : idx - 1;
        if (drag.page < 0 || (drag.dir === 1 && idx >= last)) { drag = null; return; }
        drag.decided = true;
        drag.moved = true;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('is-dragging');
      }

      var now = performance.now();
      if (now > drag.lastT) {
        drag.v = (e.clientX - drag.lastX) / (now - drag.lastT);
        drag.lastX = e.clientX; drag.lastT = now;
      }

      var w = stage.offsetWidth || 1;
      var deg;
      if (drag.dir === 1) deg = Math.max(-180, Math.min(0, (dx / w) * 180));
      else deg = Math.max(-180, Math.min(0, -180 + (dx / w) * 180));
      paint(drag.page, deg, true);
    });

    function release(e) {
      if (!drag) return;
      var d = drag; drag = null;
      stage.classList.remove('is-dragging');
      if (!d.decided) return;
      try { stage.releasePointerCapture(e.pointerId); } catch (err) {}

      var w = stage.offsetWidth || 1;
      var dx = e.clientX - d.x;
      var progress = Math.abs(dx) / w;
      var flicked = Math.abs(d.v) > FLICK && (d.v < 0) === (d.dir === 1);
      var commit = flicked || progress > THRESHOLD;

      if (commit) {
        go(d.dir === 1 ? idx + 1 : idx - 1);
      } else {
        paint(d.page, angleOf(d.page), false);     // back where it came from
      }
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    /* A drag that ends on a card must not also follow its link. The flag is
       cleared on the NEXT pointerdown rather than on pointerup: click fires
       after pointerup, so clearing it there would clear it before the click
       it is meant to stop. */
    stage.addEventListener('pointerdown', function () {
      stage.dataset.justDragged = '0';
    });
    stage.addEventListener('pointermove', function () {
      if (drag && drag.moved) stage.dataset.justDragged = '1';
    });
    stage.addEventListener('click', function (e) {
      if (stage.dataset.justDragged === '1') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); }, 140);
    });

    // Images inside the pages change the height when they land.
    var imgs = book.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) imgs[i].addEventListener('load', measure, { once: true });
    }

    measure();
    sync();
    book.classList.add('is-ready');
  }

  function init() {
    // A page turn IS the animation here; without it there is no reason to put
    // four of five projects behind a gesture.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!CSS.supports || !CSS.supports('transform-style', 'preserve-3d')) return;
    if (!window.PointerEvent) return;

    var grids = document.querySelectorAll('[data-book]');
    for (var i = 0; i < grids.length; i++) {
      try { build(grids[i]); } catch (e) { /* the grid stays as it is */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
