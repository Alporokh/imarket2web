/* =========================================================================
   imarket2web - project brief
   =========================================================================

   The long questionnaire, as opposed to the estimator. The estimator answers
   "roughly what does this cost"; this one answers "what do you actually
   need", which is the conversation that has to happen before a proposal.

   Everything is optional on purpose except name and email. A brief that
   demands twenty answers gets abandoned at question six; a brief that takes
   whatever you give it gets returned half-filled, which is still far more
   than an empty contact form.

   It posts to the same Apps Script endpoint as the estimator, with
   form: "brief", so the script can route it to its own tab.
   ========================================================================= */

(function () {
  'use strict';

  // Same endpoint as the estimator. Kept in one place there.
  var ENDPOINT = 'https://imarket2web-leads.imarket2web.workers.dev/';

  function init() {
    var form = document.getElementById('brief-form');
    if (!form) return;

    /* ---- Section progress -------------------------------------------- */
    var sections = [].slice.call(form.querySelectorAll('[data-section]'));
    var bar = document.getElementById('brief-bar');
    var label = document.getElementById('brief-label');

    function answered(sec) {
      var f = sec.querySelectorAll('input, textarea, select');
      for (var i = 0; i < f.length; i++) {
        var el = f[i];
        if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) return true; }
        else if (el.value && el.value.trim()) return true;
      }
      return false;
    }

    /* Built by script, so it follows <html lang> like the consent banner. */
    var MSG = {
      en: { need: 'Your name and email are the only two I need. Everything else can be left blank.', consent: 'Please tick the consent box so I am allowed to reply.', sending: 'Sending…', sent: 'Sent. I read these myself - expect a reply, not an autoresponder.', fail: 'Could not send: ', failTail: '. Email imarket2web@gmail.com instead, or copy your answers first.', copied: 'Copied', copy: 'Copy my answers' },
      pl: { need: 'Potrzebuję tylko imienia i e-maila. Resztę możesz zostawić pustą.', consent: 'Zaznacz zgodę, żebym mogła odpowiedzieć.', sending: 'Wysyłam…', sent: 'Wysłane. Czytam je sama - spodziewaj się odpowiedzi, nie autorespondera.', fail: 'Nie udało się wysłać: ', failTail: '. Napisz na imarket2web@gmail.com albo najpierw skopiuj odpowiedzi.', copied: 'Skopiowano', copy: 'Skopiuj moje odpowiedzi' },
      uk: { need: 'Мені потрібні лише ім’я та пошта. Усе інше можна залишити порожнім.', consent: 'Позначте згоду, щоб я могла відповісти.', sending: 'Надсилаю…', sent: 'Надіслано. Я читаю їх сама - чекайте відповіді, а не автовідповідача.', fail: 'Не вдалося надіслати: ', failTail: '. Напишіть на imarket2web@gmail.com або спершу скопіюйте відповіді.', copied: 'Скопійовано', copy: 'Скопіювати мої відповіді' },
      ru: { need: 'Мне нужны только имя и почта. Все остальное можно оставить пустым.', consent: 'Отметьте согласие, чтобы я могла ответить.', sending: 'Отправляю…', sent: 'Отправлено. Я читаю их сама - ждите ответа, а не автоответчика.', fail: 'Не удалось отправить: ', failTail: '. Напишите на imarket2web@gmail.com или сначала скопируйте ответы.', copied: 'Скопировано', copy: 'Скопировать мои ответы' }
    };
    var M = MSG[(document.documentElement.lang || 'en').slice(0, 2)] || MSG.en;

    function progressText(done, total) {
      var lang = (document.documentElement.lang || 'en').slice(0, 2);
      if (lang === 'pl') return done + ' z ' + total + ' sekcji rozpoczętych';
      if (lang === 'uk') return 'Розпочато розділів: ' + done + ' з ' + total;
      if (lang === 'ru') return 'Начато разделов: ' + done + ' из ' + total;
      return done + ' of ' + total + ' sections started';
    }

    function progress() {
      var done = sections.filter(answered).length;
      var pct = sections.length ? done / sections.length : 0;
      if (bar) bar.style.transform = 'scaleX(' + pct + ')';
      if (label) label.textContent = progressText(done, sections.length);
    }

    form.addEventListener('input', progress);
    form.addEventListener('change', progress);

    /* ---- Conditional blocks ------------------------------------------
       A "no" answer should hide the questions that only matter on a "yes",
       rather than leaving the reader to work out which ones to skip.     */
    function syncToggles() {
      form.querySelectorAll('[data-reveal]').forEach(function (box) {
        var target = document.getElementById(box.dataset.reveal);
        if (!target) return;
        var show = box.type === 'checkbox' ? box.checked : box.value === box.dataset.revealOn;
        target.hidden = !show;
      });
    }
    form.querySelectorAll('[data-reveal]').forEach(function (b) {
      b.addEventListener('change', function () { syncToggles(); progress(); });
    });

    /* ---- Build the readable brief ------------------------------------
       The email and the sheet get prose, not a field dump. Someone should
       be able to read it on a phone and know what the project is.       */
    function compose() {
      var out = [];
      out.push('IMARKET2WEB - PROJECT BRIEF');
      out.push('Received ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
      out.push('');

      sections.forEach(function (sec) {
        var lines = [];
        sec.querySelectorAll('[data-q]').forEach(function (field) {
          var q = field.dataset.q;
          var v = '';
          if (field.type === 'checkbox') {
            if (!field.checked) return;
            v = field.dataset.yes || 'yes';
          } else if (field.tagName === 'SELECT') {
            v = field.value;
          } else {
            v = (field.value || '').trim();
          }
          if (!v) return;
          // Indent the continuation lines of a textarea, so a list of pages
          // reads as a list rather than falling out of its section.
          v = v.split(/\r?\n/).map(function (line, i) {
            return i === 0 ? line : '      ' + line.trim();
          }).join('\n');
          lines.push('  ' + q + ': ' + v);
        });
        // grouped checkboxes
        var groups = {};
        sec.querySelectorAll('[data-group]').forEach(function (cb) {
          if (!cb.checked) return;
          (groups[cb.dataset.group] = groups[cb.dataset.group] || []).push(cb.value);
        });
        Object.keys(groups).forEach(function (g) {
          lines.push('  ' + g + ': ' + groups[g].join(', '));
        });

        if (lines.length) {
          out.push(sec.dataset.section.toUpperCase());
          out.push.apply(out, lines);
          out.push('');
        }
      });

      return out.join('\n');
    }

    /* ---- Submit -------------------------------------------------------- */
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = document.getElementById('brief-status');
      var btn = form.querySelector('button[type="submit"]');

      var name = form.querySelector('[name="name"]').value.trim();
      var email = form.querySelector('[name="email"]').value.trim();
      if (!name || !email) {
        status.className = 'form-status is-err';
        status.textContent = M.need;
        return;
      }
      if (!form.querySelector('[name="consent"]').checked) {
        status.className = 'form-status is-err';
        status.textContent = M.consent;
        return;
      }

      var body = compose();
      var payload = {
        form: 'brief',
        source: 'brief',
        name: name,
        email: email,
        company: (form.querySelector('[name="company"]') || {}).value || '',
        website: (form.querySelector('[name="current_site"]') || {}).value || '',
        // Both are in the composed text as well, but as columns they are
        // what you sort and filter a list of briefs by.
        timing: (form.querySelector('[name="timing"]') || {}).value || '',
        budget: (form.querySelector('[name="budget"]') || {}).value || '',
        message: (form.querySelector('[name="anything"]') || {}).value || '',
        consent: true,
        estimate: body,
        botcheck: (form.querySelector('[name="botcheck"]') || {}).checked || false
      };

      btn.disabled = true;
      status.className = 'form-status';
      status.textContent = M.sending;

      try {
        // Plain string body: a simple request, so no CORS preflight, which
        // Apps Script cannot answer.
        var res = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
        var out = await res.json();
        if (!out.success) throw new Error(out.message || 'Submission failed');
        status.className = 'form-status is-ok';
        status.textContent = M.sent;
        form.reset();
        syncToggles();
        progress();
      } catch (err) {
        status.className = 'form-status is-err';
        status.textContent = M.fail + err.message + M.failTail;
      } finally {
        btn.disabled = false;
      }
    });

    /* ---- Let people keep what they typed ------------------------------ */
    var copyBtn = document.getElementById('brief-copy');
    if (copyBtn) {
      var copyLabel = copyBtn.textContent;
      copyBtn.addEventListener('click', function () {
        var text = compose();
        if (navigator.clipboard) navigator.clipboard.writeText(text);
        copyBtn.textContent = M.copied;
        setTimeout(function () { copyBtn.textContent = copyLabel; }, 1600);
      });
    }

    syncToggles();
    progress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
