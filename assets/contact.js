/* =========================================================================
   imarket2web - contact form
   =========================================================================

   The lightest of the three ways in. The estimator asks twelve questions to
   reach a number; the brief asks eight sections to reach a proposal; this
   asks how to reach you and what it is about, and nothing else.

   It posts to the same Apps Script as the other two, tagged
   form: "contact", so the script can file it under MQL rather than
   alongside people who have already priced the work.

   Either an email or a phone will do. Someone who picks "phone call" and
   types a number has told us everything we need, and demanding an email
   from them as well is the kind of friction that loses the enquiry. The
   confirmation reply is simply skipped when there is no address to send it
   to.
   ========================================================================= */

(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby_qzVqUzfd-_Mm8W4TLByXyTEWXg1SwoCT3NPUQEd_yOBLtaC3io4L5X4zD6L5up1TzA/exec';

  function init() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = document.getElementById('contact-status');
    var button = form.querySelector('button[type="submit"]');

    function val(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    }

    function say(msg, ok) {
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
        // Which page they were on when they gave up looking and asked. Useful
        // for knowing which pages raise questions they do not answer.
        page: document.referrer || location.pathname,
        consent: true,
        botcheck: (form.querySelector('[name="botcheck"]') || {}).checked || false
      };

      if (button) button.disabled = true;
      say('Sending...');

      // Plain string body: a simple request, so no CORS preflight, which a
      // Apps Script web app cannot answer.
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) {
            form.innerHTML =
              '<div class="card svc-box">' +
              '<span class="mono">Got it</span>' +
              '<h2 class="d" style="font-size:22px;margin:8px 0 10px;">I will be in touch' +
              (prefer ? ' by ' + prefer.toLowerCase().replace('phone call', 'phone') : '') + '.</h2>' +
              '<p style="font-size:15px;line-height:1.6;color:var(--text-2);">Usually within one working day. ' +
              'If it is urgent, call <a href="tel:+48516492854">+48 516 492 854</a>.</p>' +
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
