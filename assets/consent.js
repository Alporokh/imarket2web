/* =========================================================================
   imarket2web - consent
   =========================================================================

   Google Analytics 4 (G-7VCYMXHF58) is on every page, in Consent Mode v2.
   Each page's <head> sets every consent type to "denied" before the Google
   tag loads - or restores "granted" if the visitor already agreed on an
   earlier visit - and then loads the tag. While consent is denied, GA sets
   no cookies and sends Google only cookie-free, anonymous pings.

   This file is the other half: the banner that asks, and the switch.
   Allowing or withdrawing updates analytics_storage through gtag, and the
   tag adjusts on its own. Nothing here loads Google - the <head> does.

   The visitor's choice is stored in localStorage, not a cookie, and can be
   changed at any time via the "Privacy settings" link in the footer.
   ========================================================================= */

(function () {
  'use strict';

  var KEY = 'i2w-consent';

  /* The consent default and the Google tag are set in each page's <head>. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

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
    document.dispatchEvent(new CustomEvent('consent:changed', { detail: { analytics: granted } }));
  }

  /* ---- Work out the path prefix from the page's own stylesheet link ------
     The site is served both from a GitHub Pages subpath and from the domain
     root, so links are relative. Deriving the prefix from a link that is
     already correct on this page avoids guessing the depth.              */
  function prefix() {
    // *= not $=: the href carries a ?v= cache-busting version
    var link = document.querySelector('link[rel="stylesheet"][href*="assets/site.css"]');
    if (!link) return './';
    return link.getAttribute('href').replace(/assets\/site\.css(\?.*)?$/, '');
  }

  /* ---- Banner ----------------------------------------------------------- */
  function build() {
    var p = prefix();
    var el = document.createElement('div');
    el.className = 'consent';
    el.id = 'consent';
    el.setAttribute('role', 'region');
    /* The banner is built by script, so it does not get translated with the
       page around it. A consent notice a visitor cannot read is not consent,
       so it follows <html lang> instead. */
    var T = {
      en: {
        region: 'Privacy choices',
        head: 'Analytics only if you say yes.',
        body: 'Google Analytics is on this site, but until you allow it, it sets no cookies and sends Google only anonymous, cookie-free page counts. There is no advertising, and the fonts are served from here. May I turn analytics on, so I can see which pages are useful? ',
        link: 'What I collect',
        privacy: 'privacy/',
        no: 'No thanks',
        yes: 'Allow analytics'
      },
      pl: {
        region: 'Wybory dotyczące prywatności',
        head: 'Analityka tylko za Twoją zgodą.',
        body: 'Na stronie jest Google Analytics, ale dopóki się nie zgodzisz, nie zapisuje ciasteczek i wysyła do Google tylko anonimowe liczniki odsłon, bez ciasteczek. Nie ma reklam, a fonty są serwowane stąd. Czy mogę włączyć analitykę, żeby wiedzieć, które strony są przydatne? ',
        link: 'Co zbieram',
        privacy: 'pl/prywatnosc/',
        no: 'Nie, dziękuję',
        yes: 'Zgoda na analitykę'
      },
      uk: {
        region: 'Налаштування приватності',
        head: 'Аналітика - лише з вашої згоди.',
        body: 'На сайті є Google Analytics, але доки ви не дозволите, вона не зберігає cookie і надсилає в Google лише анонімні лічильники переглядів без cookie. Реклами немає, шрифти віддаються звідси. Увімкнути аналітику, щоб я бачила, які сторінки корисні? ',
        link: 'Що я збираю',
        privacy: 'uk/pryvatnist/',
        no: 'Ні, дякую',
        yes: 'Дозволити аналітику'
      },
      ru: {
        region: 'Настройки конфиденциальности',
        head: 'Аналитика - только с вашего согласия.',
        body: 'На сайте есть Google Analytics, но пока вы не разрешите, она не сохраняет cookie и отправляет в Google только анонимные счетчики просмотров без cookie. Рекламы нет, шрифты загружаются отсюда. Включить аналитику, чтобы я видела, какие страницы полезны? ',
        link: 'Что я собираю',
        privacy: 'ru/konfidencialnost/',
        no: 'Нет, спасибо',
        yes: 'Разрешить аналитику'
      }
    };
    var t = T[(document.documentElement.lang || 'en').slice(0, 2)] || T.en;

    el.setAttribute('aria-label', t.region);
    el.innerHTML =
      '<div class="consent-inner">' +
        '<div class="consent-copy">' +
          '<p class="d">' + t.head + '</p>' +
          '<p>' + t.body +
          '<a href="' + p + t.privacy + '">' + t.link + '</a>.</p>' +
        '</div>' +
        '<div class="consent-btns">' +
          '<button type="button" class="consent-btn" data-consent="denied">' + t.no + '</button>' +
          '<button type="button" class="consent-btn consent-btn--yes" data-consent="granted">' + t.yes + '</button>' +
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
