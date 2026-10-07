// imarket2web - shared behaviour (mobile menu + footer year)
(function () {
  /* The mobile menu is built from the desktop nav, so the page's HTML holds
     each menu link once (SEO tools count repeated anchors). It only matters
     with JavaScript anyway: the menu button that opens it is script-driven. */
  (function buildMobileMenu() {
    var menu = document.getElementById('mobile-menu');
    var nav = document.querySelector('.nav-links');
    if (!menu || !nav || menu.children.length) return;
    var kids = nav.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.classList.contains('nav-drop')) {
        var all = el.querySelector('.nav-drop-all');
        var btn = el.querySelector('.nav-drop-btn');
        var top = document.createElement('a');
        top.href = all ? all.getAttribute('href') : '#';
        top.textContent = btn ? btn.textContent.trim() : '';
        if (all && all.hasAttribute('aria-current')) top.setAttribute('aria-current', 'page');
        menu.appendChild(top);
        var sub = document.createElement('div');
        sub.className = 'mobile-sub';
        var links = el.querySelectorAll('.nav-drop-menu a:not(.nav-drop-all)');
        for (var j = 0; j < links.length; j++) sub.appendChild(links[j].cloneNode(true));
        menu.appendChild(sub);
      } else if (el.classList.contains('lang')) {
        var lang = el.cloneNode(true);
        lang.removeAttribute('aria-label');
        menu.appendChild(lang);
      } else if (el.tagName === 'A' && !el.classList.contains('nav-phone')) {
        var a = el.cloneNode(true);
        if (a.classList.contains('nav-cta')) { a.className = 'btn'; }
        menu.appendChild(a);
      }
    }
  })();

  var header = document.querySelector('.site-header');
  var btn = document.getElementById('menu-toggle');
  if (header && btn) {
    btn.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('#mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('is-open');
        btn.setAttribute('aria-expanded', false);
      });
    });
  }
  // Services dropdown: click toggles, Escape and an outside click close.
  document.querySelectorAll('.nav-drop').forEach(function (drop) {
    var b = drop.querySelector('.nav-drop-btn');
    if (!b) return;
    function set(open) { drop.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open); }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(!drop.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target)) set(false); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drop.classList.contains('is-open')) { set(false); b.focus(); }
    });
    // leaving by keyboard closes it too
    drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) set(false); });
  });

  // iOS applies :active to a plain div only when something is listening for
  // touch. The cards' press state depends on it, so this empty listener is
  // load-bearing despite doing nothing.
  document.addEventListener('touchstart', function () {}, { passive: true });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

/* ---- Services carousel: the loop copies are built here ------------------
   The HTML holds each card once, so crawlers and SEO tools read every
   service once. The seamless loop needs three copies of the cards (the
   keyframes move the track by exactly one third), so two more are cloned
   here - hidden from assistive tech, inert to keyboard and clicks, and with
   the heading demoted so the page outline lists each service once.
   Reduced motion: no copies, no animation, the row stays scrollable. */
(function () {
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;
  var tracks = document.querySelectorAll('.gal-track');
  for (var t = 0; t < tracks.length; t++) {
    var track = tracks[t];
    if (track.classList.contains('is-looped')) continue;
    var cards = Array.prototype.slice.call(track.children);
    for (var i = 0; i < 2; i++) {
      for (var c = 0; c < cards.length; c++) {
        var clone = cards[c].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('inert', '');
        var hs = clone.querySelectorAll('h3');
        for (var h = 0; h < hs.length; h++) {
          var p = document.createElement('p');
          p.className = hs[h].className + ' svc-title';
          p.innerHTML = hs[h].innerHTML;
          hs[h].parentNode.replaceChild(p, hs[h]);
        }
        track.appendChild(clone);
      }
    }
    track.classList.add('is-looped');
  }
})();
