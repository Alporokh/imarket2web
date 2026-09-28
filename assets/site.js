// imarket2web - shared behaviour (mobile menu + footer year)
(function () {
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
