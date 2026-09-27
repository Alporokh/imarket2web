/* =========================================================================
   imarket2web - contact form, on the page and in a pop-up
   =========================================================================

   The lightest of the three ways in. The estimator asks twelve questions to
   reach a number; the brief asks eight sections to reach a proposal; this
   asks how to reach you and what it is about, and nothing else.

   It posts to the same Apps Script as the other two, tagged form: "contact",
   so the script files it under MQL rather than alongside people who have
   already priced the work.

   Either an email or a phone will do. Someone who picks "phone call" and
   types a number has told us everything we need, and demanding an email as
   well is the kind of friction that loses the enquiry. The confirmation
   reply is simply skipped when there is no address to send it to.

   The pop-up
   ----------
   Any link carrying data-contact-open opens the form in a dialog instead of
   navigating. Those links still point at /contact/, so this is an
   enhancement rather than a dependency: with no JavaScript, or in a browser
   without <dialog>, the click just loads the page and the form is there.

   <dialog> is used rather than a hand-rolled overlay because it brings the
   things that are easy to get wrong for free - focus is trapped inside it,
   Escape closes it, the rest of the page is inert, and focus returns to the
   link afterwards.
   ========================================================================= */

(function () {
  'use strict';

  var ENDPOINT = 'https://imarket2web-leads.imarket2web.workers.dev/';

  /* ---- Words -----------------------------------------------------------
     The pop-up and every status message are built here, so they do not get
     translated with the page around them. They follow <html lang>, like the
     consent banner. The radio values stay English on purpose: they land in
     the lead sheet, where one spelling per channel is what you filter by. */
  var TEXT = {
    en: {
      name: 'Your name', req: 'required', how: 'How should I reach you?',
      phoneCall: 'Phone call', email: 'Email',
      handle: 'Phone or handle', handleHint: 'if you picked one of those', handlePh: '+48 600 000 000, or @yourhandle',
      emailHint: 'so I can confirm I got this', about: 'What is it about?',
      aboutPh: 'A sentence is plenty. What you sell, and what is not working.',
      consent: 'Contact me about this. No list, no newsletter - see the <a href="/privacy/">privacy note</a>.',
      send: 'Send it',
      errName: 'Your name, so I know who I am replying to.',
      errRoute: 'Leave a phone number or an email - otherwise I have no way to answer.',
      errEmail: 'That email address does not look right.',
      errConsent: 'Please tick the consent box so I am allowed to reply.',
      sending: 'Sending...',
      failed: 'That did not send. Please call or email instead.',
      offline: 'That did not send - the connection failed. Please call or email instead.',
      gotIt: 'Got it', willBe: 'I will be in touch',
      by: { 'Phone call': ' by phone', 'Email': ' by email', 'WhatsApp': ' on WhatsApp', 'Telegram': ' on Telegram' },
      soon: 'Usually within one working day. If it is urgent, call ',
      close: 'Close', eyebrow: 'Usually within a working day', title: 'Tell me how to reach you.',
      lead: 'One person answers, and it is the person who would do the work. Or skip this and call '
    },
    pl: {
      name: 'Imię', req: 'wymagane', how: 'Jak mam się z Tobą skontaktować?',
      phoneCall: 'Telefon', email: 'E-mail',
      handle: 'Telefon lub nazwa użytkownika', handleHint: 'jeśli wybierasz jedną z tych opcji', handlePh: '+48 600 000 000 albo @twojanazwa',
      emailHint: 'żebym mogła potwierdzić, że dotarło', about: 'Czego to dotyczy?',
      aboutPh: 'Wystarczy jedno zdanie. Co sprzedajesz i co nie działa.',
      consent: 'Skontaktuj się ze mną w tej sprawie. Bez listy mailingowej i newslettera - zobacz <a href="/pl/prywatnosc/">informację o prywatności</a>.',
      send: 'Wyślij',
      errName: 'Podaj imię, żebym wiedziała, komu odpowiadam.',
      errRoute: 'Zostaw telefon albo e-mail - inaczej nie mam jak odpowiedzieć.',
      errEmail: 'Ten adres e-mail nie wygląda poprawnie.',
      errConsent: 'Zaznacz zgodę, żebym mogła odpowiedzieć.',
      sending: 'Wysyłam...',
      failed: 'Nie udało się wysłać. Zadzwoń albo napisz maila.',
      offline: 'Nie udało się wysłać - brak połączenia. Zadzwoń albo napisz maila.',
      gotIt: 'Dotarło', willBe: 'Odezwę się',
      by: { 'Phone call': ' telefonicznie', 'Email': ' mailem', 'WhatsApp': ' na WhatsAppie', 'Telegram': ' na Telegramie' },
      soon: 'Zwykle w ciągu jednego dnia roboczego. Jeśli to pilne, zadzwoń: ',
      close: 'Zamknij', eyebrow: 'Zwykle w ciągu dnia roboczego', title: 'Napisz, jak się z Tobą skontaktować.',
      lead: 'Odpowiada jedna osoba - ta, która wykona pracę. Możesz też od razu zadzwonić: '
    },
    uk: {
      name: 'Ваше ім’я', req: 'обов’язково', how: 'Як з вами зв’язатися?',
      phoneCall: 'Дзвінок', email: 'Пошта',
      handle: 'Телефон або нікнейм', handleHint: 'якщо обрали один із цих варіантів', handlePh: '+48 600 000 000 або @вашнік',
      emailHint: 'щоб я підтвердила, що все отримала', about: 'Про що йдеться?',
      aboutPh: 'Вистачить одного речення. Що ви продаєте і що не працює.',
      consent: 'Зв’яжіться зі мною щодо цього. Без розсилок і списків - див. <a href="/uk/pryvatnist/">про приватність</a>.',
      send: 'Надіслати',
      errName: 'Вкажіть ім’я, щоб я знала, кому відповідаю.',
      errRoute: 'Залиште телефон або пошту - інакше я не зможу відповісти.',
      errEmail: 'Ця адреса пошти виглядає неправильно.',
      errConsent: 'Позначте згоду, щоб я могла відповісти.',
      sending: 'Надсилаю...',
      failed: 'Не вдалося надіслати. Зателефонуйте або напишіть на пошту.',
      offline: 'Не вдалося надіслати - немає з’єднання. Зателефонуйте або напишіть на пошту.',
      gotIt: 'Отримала', willBe: 'Я зв’яжуся з вами',
      by: { 'Phone call': ' телефоном', 'Email': ' поштою', 'WhatsApp': ' у WhatsApp', 'Telegram': ' у Telegram' },
      soon: 'Зазвичай протягом робочого дня. Якщо терміново, телефонуйте: ',
      close: 'Закрити', eyebrow: 'Зазвичай протягом робочого дня', title: 'Скажіть, як з вами зв’язатися.',
      lead: 'Відповідає одна людина - та, яка виконає роботу. Або просто зателефонуйте: '
    },
    ru: {
      name: 'Ваше имя', req: 'обязательно', how: 'Как с вами связаться?',
      phoneCall: 'Звонок', email: 'Почта',
      handle: 'Телефон или никнейм', handleHint: 'если выбрали один из этих вариантов', handlePh: '+48 600 000 000 или @вашник',
      emailHint: 'чтобы я подтвердила, что все получила', about: 'О чем речь?',
      aboutPh: 'Хватит одного предложения. Что вы продаете и что не работает.',
      consent: 'Свяжитесь со мной по этому вопросу. Без рассылок и списков - см. <a href="/ru/konfidencialnost/">о конфиденциальности</a>.',
      send: 'Отправить',
      errName: 'Укажите имя, чтобы я знала, кому отвечаю.',
      errRoute: 'Оставьте телефон или почту - иначе я не смогу ответить.',
      errEmail: 'Этот адрес почты выглядит неправильно.',
      errConsent: 'Отметьте согласие, чтобы я могла ответить.',
      sending: 'Отправляю...',
      failed: 'Не удалось отправить. Позвоните или напишите на почту.',
      offline: 'Не удалось отправить - нет соединения. Позвоните или напишите на почту.',
      gotIt: 'Получила', willBe: 'Я свяжусь с вами',
      by: { 'Phone call': ' по телефону', 'Email': ' по почте', 'WhatsApp': ' в WhatsApp', 'Telegram': ' в Telegram' },
      soon: 'Обычно в течение рабочего дня. Если срочно, звоните: ',
      close: 'Закрыть', eyebrow: 'Обычно в течение рабочего дня', title: 'Скажите, как с вами связаться.',
      lead: 'Отвечает один человек - тот, кто будет делать работу. Или просто позвоните: '
    }
  };
  var W = TEXT[(document.documentElement.lang || 'en').slice(0, 2)] || TEXT.en;
  var PHONE_LINK = '<a href="tel:+48516492854">+48 516 492 854</a>';

  /* ---- The form, as markup, so the dialog can build its own copy -------- */
  function fields() {
    return [
      '<label class="fld">',
      '  <span>' + W.name + ' <em>' + W.req + '</em></span>',
      '  <input type="text" name="name" autocomplete="name" placeholder="Anna Kowalska">',
      '</label>',
      '<div class="fld">',
      '  <span>' + W.how + '</span>',
      '  <div class="chk-grid">',
      '    <label class="chk"><input type="radio" name="prefer" value="Phone call" checked><span>' + W.phoneCall + '</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="Email"><span>' + W.email + '</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="WhatsApp"><span>WhatsApp</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="Telegram"><span>Telegram</span></label>',
      '  </div>',
      '</div>',
      '<label class="fld">',
      '  <span>' + W.handle + ' <em>' + W.handleHint + '</em></span>',
      '  <input type="tel" name="phone" autocomplete="tel" placeholder="' + W.handlePh + '">',
      '</label>',
      '<label class="fld">',
      '  <span>' + W.email + ' <em>' + W.emailHint + '</em></span>',
      '  <input type="email" name="email" autocomplete="email" placeholder="anna@studio.com">',
      '</label>',
      '<label class="fld">',
      '  <span>' + W.about + '</span>',
      '  <textarea name="message" rows="3" placeholder="' + W.aboutPh + '"></textarea>',
      '</label>',
      '<input type="checkbox" name="botcheck" class="vh" tabindex="-1" autocomplete="off">',
      '<label class="form-consent">',
      '  <input type="checkbox" name="consent">',
      '  <span>' + W.consent + '</span>',
      '</label>',
      '<button type="submit" class="btn">' + W.send,
      '  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#FFFFFF" stroke-width="1.7" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
      '</button>',
      '<p class="form-status" role="status" aria-live="polite"></p>'
    ].join('\n');
  }

  /* ---- Submitting ------------------------------------------------------- */
  function bind(form) {
    if (!form || form.dataset.contactBound) return;
    form.dataset.contactBound = '1';

    function val(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    }
    function say(msg, ok) {
      var status = form.querySelector('.form-status');
      if (!status) return;
      status.textContent = msg;
      status.className = 'form-status' + (ok === true ? ' is-ok' : ok === false ? ' is-err' : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = val('name');
      var email = val('email');
      var phone = val('phone');
      var prefer = (form.querySelector('[name="prefer"]:checked') || {}).value || '';
      var button = form.querySelector('button[type="submit"]');

      if (!name) { say(W.errName, false); return; }
      // One route back is enough, but there has to be one.
      if (!email && !phone) {
        say(W.errRoute, false);
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say(W.errEmail, false);
        return;
      }
      if (!form.querySelector('[name="consent"]').checked) {
        say(W.errConsent, false);
        return;
      }

      var payload = {
        form: 'contact',
        name: name,
        email: email,
        phone: phone,
        prefer: prefer,
        message: val('message'),
        // Which page they were on when they stopped reading and asked. Useful
        // for knowing which pages raise questions they do not answer.
        page: location.pathname,
        consent: true,
        botcheck: (form.querySelector('[name="botcheck"]') || {}).checked || false
      };

      if (button) button.disabled = true;
      say(W.sending);

      // Plain string body: a simple request, so no CORS preflight, which an
      // Apps Script web app cannot answer.
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) {
            form.innerHTML =
              '<div class="contact-done">' +
              '<span class="mono">' + W.gotIt + '</span>' +
              '<h3 class="d">' + W.willBe + (W.by[prefer] || '') + '.</h3>' +
              '<p>' + W.soon + PHONE_LINK + '.</p>' +
              '</div>';
          } else {
            say((res && res.message) || W.failed, false);
            if (button) button.disabled = false;
          }
        })
        .catch(function () {
          say(W.offline, false);
          if (button) button.disabled = false;
        });
    });
  }

  /* ---- The pop-up ------------------------------------------------------- */
  var dlg = null;

  function modal() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'cdlg';
    dlg.setAttribute('aria-labelledby', 'cdlg-title');
    dlg.innerHTML = [
      '<button type="button" class="cdlg-x" aria-label="' + W.close + '">',
      '  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>',
      '</button>',
      '<span class="mono">' + W.eyebrow + '</span>',
      '<h2 class="d" id="cdlg-title">' + W.title + '</h2>',
      '<p class="cdlg-lead">' + W.lead + PHONE_LINK + '.</p>',
      '<form data-contact-form novalidate>' + fields() + '</form>'
    ].join('\n');

    document.body.appendChild(dlg);
    bind(dlg.querySelector('form'));
    dlg.querySelector('.cdlg-x').addEventListener('click', function () { dlg.close(); });
    // Clicking the backdrop: the dialog element itself is the backdrop area,
    // so a click landing on it rather than on its content means outside.
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  function init() {
    var forms = document.querySelectorAll('[data-contact-form]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);

    // No <dialog> support means no interception: the link goes to /contact/,
    // which is where the same form already lives.
    if (typeof HTMLDialogElement === 'undefined' ||
        !HTMLDialogElement.prototype.showModal) return;

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('[data-contact-open]') : null;
      if (!trigger) return;
      // Let people open it in a new tab if that is what they meant.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      modal().showModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
