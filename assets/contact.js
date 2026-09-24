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

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby_qzVqUzfd-_Mm8W4TLByXyTEWXg1SwoCT3NPUQEd_yOBLtaC3io4L5X4zD6L5up1TzA/exec';

  /* ---- The form, as markup, so the dialog can build its own copy -------- */
  function fields() {
    return [
      '<label class="fld">',
      '  <span>Your name <em>required</em></span>',
      '  <input type="text" name="name" autocomplete="name" placeholder="Anna Kowalska">',
      '</label>',
      '<div class="fld">',
      '  <span>How should I reach you?</span>',
      '  <div class="chk-grid">',
      '    <label class="chk"><input type="radio" name="prefer" value="Phone call" checked><span>Phone call</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="Email"><span>Email</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="WhatsApp"><span>WhatsApp</span></label>',
      '    <label class="chk"><input type="radio" name="prefer" value="Telegram"><span>Telegram</span></label>',
      '  </div>',
      '</div>',
      '<label class="fld">',
      '  <span>Phone or handle <em>if you picked one of those</em></span>',
      '  <input type="tel" name="phone" autocomplete="tel" placeholder="+48 600 000 000, or @yourhandle">',
      '</label>',
      '<label class="fld">',
      '  <span>Email <em>so I can confirm I got this</em></span>',
      '  <input type="email" name="email" autocomplete="email" placeholder="anna@studio.com">',
      '</label>',
      '<label class="fld">',
      '  <span>What is it about?</span>',
      '  <textarea name="message" rows="3" placeholder="A sentence is plenty. What you sell, and what is not working."></textarea>',
      '</label>',
      '<input type="checkbox" name="botcheck" class="vh" tabindex="-1" autocomplete="off">',
      '<label class="form-consent">',
      '  <input type="checkbox" name="consent">',
      '  <span>Contact me about this. No list, no newsletter - see the <a href="/privacy/">privacy note</a>.</span>',
      '</label>',
      '<button type="submit" class="btn">Send it',
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

      if (!name) { say('Your name, so I know who I am replying to.', false); return; }
      // One route back is enough, but there has to be one.
      if (!email && !phone) {
        say('Leave a phone number or an email - otherwise I have no way to answer.', false);
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say('That email address does not look right.', false);
        return;
      }
      if (!form.querySelector('[name="consent"]').checked) {
        say('Please tick the consent box so I am allowed to reply.', false);
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
      say('Sending...');

      // Plain string body: a simple request, so no CORS preflight, which an
      // Apps Script web app cannot answer.
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) {
            form.innerHTML =
              '<div class="contact-done">' +
              '<span class="mono">Got it</span>' +
              '<h3 class="d">I will be in touch' +
              (prefer ? ' by ' + prefer.toLowerCase().replace('phone call', 'phone') : '') + '.</h3>' +
              '<p>Usually within one working day. If it is urgent, call ' +
              '<a href="tel:+48516492854">+48 516 492 854</a>.</p>' +
              '</div>';
          } else {
            say((res && res.message) || 'That did not send. Please call or email instead.', false);
            if (button) button.disabled = false;
          }
        })
        .catch(function () {
          say('That did not send - the connection failed. Please call or email instead.', false);
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
      '<button type="button" class="cdlg-x" aria-label="Close">',
      '  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>',
      '</button>',
      '<span class="mono">Usually within a working day</span>',
      '<h2 class="d" id="cdlg-title">Tell me how to reach you.</h2>',
      '<p class="cdlg-lead">One person answers, and it is the person who would do the work. ' +
      'Or skip this and call <a href="tel:+48516492854">+48 516 492 854</a>.</p>',
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
