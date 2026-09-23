/* =========================================================================
   imarket2web - consent
   =========================================================================

   This site currently sets NO cookies and makes NO third-party requests.
   Fonts are self-hosted, so nothing about a visitor reaches anyone else.

   So this banner is not a "we use cookies" notice - that would be untrue.
   It is a consent gate for analytics, which is the only thing that would
   ever need one, and it is wired for Google Consent Mode v2 so that the
   moment GA4 is added it respects the visitor's choice automatically.

   TO ADD GA4 LATER
   ----------------
   1. Paste the usual gtag snippet into each page's <head>, AFTER this file.
      This file sets consent defaults to "denied" before gtag runs, which is
      exactly what Consent Mode v2 requires.
   2. Set MEASUREMENT_ID below. Nothing else changes - granting or
      withdrawing consent updates gtag on its own.

   The visitor's choice is stored in localStorage, not a cookie, and can be
   changed at any time via the "Privacy settings" link in the footer.
   ========================================================================= */

(function () {
  'use strict';

  var KEY = 'i2w-consent';
  var MEASUREMENT_ID = ''; // e.g. 'G-XXXXXXXXXX' - leave empty until GA4 is added

  /* ---- Consent Mode v2 defaults: denied until the visitor says otherwise -- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted', // strictly necessary only
    security_storage: 'granted',
    wait_for_update: 500
  });

  /* ---- Stored choice ---------------------------------------------------- */
  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode - session only */ }
  }

  function apply(choice) {
    var granted = choice === 'granted';
    gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied'
    });
    if (granted && MEASUREMENT_ID && !window.__i2wGaLoaded) {
      window.__i2wGaLoaded = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('config', MEASUREMENT_ID, { anonymize_ip: true });
    }
    document.dispatchEvent(new CustomEvent('consent:changed', { detail: { analytics: granted } }));
  }

  /* ---- Work out the path prefix from the page's own stylesheet link ------
     The site is served both from a GitHub Pages subpath and from the domain
     root, so links are relative. Deriving the prefix from a link that is
     already correct on this page avoids guessing the depth.              */
  function prefix() {
    var link = document.querySelector('link[href$="assets/site.css"]');
    if (!link) return './';
    return link.getAttribute('href').replace(/assets\/site\.css$/, '');
  }

  /* ---- Banner ----------------------------------------------------------- */
  function build() {
    var p = prefix();
    var el = document.createElement('div');
    el.className = 'consent';
    el.id = 'consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Privacy choices');
    el.innerHTML =
      '<div class="consent-inner">' +
        '<div class="consent-copy">' +
          '<p class="d">This site does not track you.</p>' +
          '<p>No cookies, no third-party scripts, and the fonts are served from here rather than Google - so nothing about your visit reaches anyone else. May I turn on privacy-friendly analytics to see which pages are useful? ' +
          '<a href="' + p + 'privacy/">What I collect</a>.</p>' +
        '</div>' +
        '<div class="consent-btns">' +
          '<button type="button" class="consent-btn" data-consent="denied">No thanks</button>' +
          '<button type="button" class="consent-btn consent-btn--yes" data-consent="granted">Allow analytics</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelectorAll('[data-consent]').forEach(function (b) {
      b.addEventListener('click', function () {
        var choice = b.dataset.consent;
        write(choice);
        apply(choice);
        close(el);
      });
    });

    requestAnimationFrame(function () { el.classList.add('is-in'); });
    return el;
  }

  function close(el) {
    el.classList.remove('is-in');
    var done = function () { if (el.parentNode) el.remove(); };
    // matchMedia is guarded: if it is missing the banner must still close,
    // because the choice has already been recorded by this point.
    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { /* treat as no preference */ }
    if (reduced) return done();
    el.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 400); // fallback if the transition never fires
  }

  /* ---- Public API, so the footer link can reopen the choice -------------- */
  window.imarket2web = window.imarket2web || {};
  window.imarket2web.consent = {
    get: read,
    set: function (v) { write(v); apply(v); },
    reopen: function () {
      if (!document.getElementById('consent')) build();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var choice = read();
    if (choice) {
      apply(choice); // honour the stored decision, show nothing
    } else {
      build();
    }

    document.querySelectorAll('[data-privacy-settings]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        window.imarket2web.consent.reopen();
      });
    });
  });
})();
