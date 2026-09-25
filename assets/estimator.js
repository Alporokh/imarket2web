/* =========================================================================
   imarket2web - project estimator
   =========================================================================

   ALL PRICES BELOW ARE FROM THE REAL RATE CARD. Edit this one object to
   change what the calculator quotes - nothing else in this file needs
   touching.

   Values marked ASSUMPTION are NOT from the rate card - they are
   placeholders so the calculator stays usable. Set them to whatever you
   actually charge before sending anyone here.
   ========================================================================= */

const RATES = {
  currency: 'EUR',
  symbol: '€',

  // ---- Website packages -------------------------------------------------
  site: {
    upto4: {
      price: 500,
      label: 'Website, up to 4 pages',
      weeks: [2, 3],
      // The EUR 500 build is all-in: it carries the search work, the Google
      // Business Profile and the blog. The separate EUR 150 prices apply only
      // when a client already has a website and wants marketing on its own.
      bundles: ['seoStrategy', 'analytics', 'backlinks', 'gbp', 'blog'],
      includes: [
        'Google Business Profile setup & optimisation',
        'Blog + 5 articles & 3-month content plan',
        'SEO strategy, keywords & competitor research',
        'Backlink strategy',
        'GA4 + Search Console',
        'SEO-ready page structure',
        'Design system',
        'Logo',
        'Form with automated orders',
        'Google Sheets integration'
      ]
    },
    upto10: {
      price: 800,
      label: 'Website, up to 10 pages',
      weeks: [3, 5],
      // This package already contains GBP, plus the search work every build covers.
      bundles: ['gbp', 'blog', 'seoStrategy', 'analytics', 'backlinks'],
      includes: [
        'Blog + 5 articles & 3-month content plan',
        'SEO strategy, keywords & competitor research',
        'Backlink strategy',
        'GA4 + Search Console',
        'Home + service pages (up to 10)',
        'Google Business Profile setup & optimisation',
        'Design system',
        'Logo',
        'Form with automated orders',
        'Google Sheets integration'
      ]
    },
    over10: {
      price: 800,
      from: true,
      label: 'Larger SEO-focused website, 10+ pages',
      weeks: [5, 8],
      bundles: ['seoStrategy', 'analytics', 'backlinks', 'gbp', 'blog'],
      includes: [
        'Google Business Profile setup & optimisation',
        'Blog + 5 articles & 3-month content plan',
        'SEO strategy, keywords & competitor research',
        'Backlink strategy',
        'GA4 + Search Console',
        '10+ pages, SEO-focused architecture',
        'Form with automated orders',
        'Google Sheets integration'
      ]
    },
    none: { price: 0, label: 'No new website', weeks: [0, 0], includes: [] }
  },

  // ---- Add-on services --------------------------------------------------
  addons: {
    seoStrategy: {
      price: 300,
      label: 'SEO strategy + keywords + GBP registration + content + 2 posts + GSC + GA4',
      short: 'SEO strategy & keywords',
      weeks: [1, 2]
    },
    gbp: {
      price: 150,
      label: 'Google Business Profile setup & optimisation',
      short: 'Google Business Profile',
      weeks: [0, 1]
    },
    blog: {
      price: 150,
      label: 'Blog + 5 keyword-led articles + 3-month content plan',
      short: 'Blog + 5 articles',
      weeks: [1, 2],
      includes: [
        '5 articles researched against real keywords',
        'Content plan for 3 months',
        'Unique images, not stock',
        'FAQ sections written for AI answers'
      ]
    },
    analytics: {
      price: 150,
      label: 'GA4 + Search Console + conversions setup',
      short: 'Analytics & conversions',
      weeks: [0, 1]
    },
    automation: {
      price: 200,
      from: true,
      label: 'Simple n8n automation',
      short: 'Marketing automation',
      weeks: [1, 2]
    },
    social: {
      price: 0,
      label: 'Social: profile setup, 16-post calendar & posting automation',
      short: 'Social & content calendar',
      weeks: [1, 2],
      monthly: 150,
      monthlyLabel: 'Social content & posting automation, per month',
      monthlyNote: '16 posts a month, profile setup or optimisation, calendar and posting automation - approved by you in advance'
    },
    backlinks: {
      price: 0,
      label: 'Backlink strategy: link gap audit, target list, digital PR angles',
      short: 'Backlink strategy',
      weeks: [2, 3],
      // Ships with any website build, and backlink registration is part of
      // the monthly plan. It is never sold as a standalone one-off.
      inPlanOnly: true
    },
    // Everything a site that already exists needs, in one price. The four it
    // covers are EUR 750 bought one at a time.
    bundle: {
      price: 450,
      label: 'Search package: SEO strategy, Google Business Profile, blog and analytics',
      short: 'All-in-one search package',
      weeks: [2, 4],
      covers: ['seoStrategy', 'gbp', 'blog', 'analytics'],
      includes: [
        'Keyword research and the page structure it implies',
        'Google Business Profile set up and optimised',
        'Blog plus 5 keyword-led articles and a 3-month plan',
        'GA4, Search Console and conversion tracking'
      ]
    },

    // The recurring product. Ongoing work is quoted per month, on its own
    // line, so it is never mistaken for part of a one-off project total.
    plan: {
      price: 0,
      label: 'Monthly growth plan',
      short: 'Monthly growth plan',
      weeks: [0, 0],
      monthly: 250,
      monthlyMax: 300,
      monthlyLabel: 'Monthly growth plan, per month',
      monthlyNote: 'Content plans and their automation, Google Ads each month, blog posts, backlink registration',
      // Taking the plan covers these, so they stop being separate charges.
      covers: ['social', 'backlinks']
    }
  },

  // ---- Modifiers --------------------------------------------------------
  extraLanguagePct: 0.35, // % of website base per extra language - confirmed
  rushPct: 0.25,          // fast-track surcharge - confirmed
  rangeUpliftPct: 0       // flat card prices - a quote equals the rate card
};

/* ---- Where submissions go -------------------------------------------------

   PROVIDER = 'apps-script'  (recommended)
     Posts to your own Google Apps Script, which writes the lead into the
     Google Sheet, emails the estimate to the person who asked for it, and
     emails you a copy. No third party, no limits worth worrying about, and
     the mail comes from your own Gmail.
     Setup: tools/apps-script/Code.gs - the instructions are at the top.
     Then paste the /exec URL into ENDPOINT below.

   PROVIDER = 'web3forms'
     Simpler, but a third party handles the data and the auto-reply is a
     dashboard setting rather than something you control.
     Put the access key in ENDPOINT.

   Until one is configured, the form says so plainly instead of failing
   silently, and the estimate stays visible on the page.
   ------------------------------------------------------------------------ */
const PROVIDER = 'apps-script';
const ENDPOINT = 'https://imarket2web-leads.imarket2web.workers.dev/';

/* ========================================================================= */

const state = {
  step: 0,
  goal: null,
  site: null,
  languages: 1,
  addons: new Set(),
  rush: false
};

const fmt = n => RATES.symbol + Math.round(n).toLocaleString('en-US');

/** Core pricing. Returns the full estimate for a given set of add-ons. */
function price(addonKeys) {
  const site = RATES.site[state.site] || RATES.site.none;
  const lines = [];
  const monthlyLines = [];   // recurring fees, deliberately outside the project total
  let monthlyTotal = 0;
  let floor = 0;
  let weeksMin = site.weeks[0];
  let weeksMax = site.weeks[1];
  let hasFrom = !!site.from;

  if (site.price > 0) {
    lines.push({ label: site.label, price: site.price, from: site.from, includes: site.includes });
    floor += site.price;
  }

  // Extra languages scale the website build only - add-ons are language-agnostic.
  const extraLangs = Math.max(0, state.languages - 1);
  if (extraLangs > 0 && site.price > 0) {
    const langCost = site.price * RATES.extraLanguagePct * extraLangs;
    lines.push({
      label: extraLangs + ' additional language' + (extraLangs > 1 ? 's' : ''),
      price: langCost,
      note: 'Any language you sell in. Separate keyword research and copy per language, never machine translation over the first'
    });
    floor += langCost;
    weeksMin += extraLangs;
    weeksMax += extraLangs * 2;
  }

  // Three things can cover an add-on: the website build, the monthly plan and
  // the all-in-one package. Any selected add-on that declares "covers" folds
  // those keys in, rather than the plan being hard-coded as the only one.
  const bundled = (site.bundles || []).slice();
  addonKeys.forEach(key => {
    const a = RATES.addons[key];
    if (!a || !a.covers) return;
    a.covers.forEach(k => { if (!bundled.includes(k)) bundled.push(k); });
  });
  // Layers overlap in practice - they are not worked one after another - so
  // add-on weeks accumulate at a reduced rate rather than stacking in full.
  const OVERLAP = 0.6;
  let addonWeeks = 0;
  addonKeys.forEach(key => {
    const a = RATES.addons[key];
    if (!a) return;
    if (bundled.includes(key)) {
      lines.push({ label: a.label, price: 0, included: true });
      return;
    }
    // A purely recurring service (the monthly plan, content automation) has no
    // project price: it belongs on the monthly lines only, never as a EUR 0 row.
    // A zero-price service that is not recurring is one that ships with a build
    // or the plan, so it reads as "included" rather than as free.
    if (a.price > 0) {
      lines.push({ label: a.label, price: a.price, from: a.from, note: a.note });
      floor += a.price;
    } else if (!a.monthly) {
      lines.push({ label: a.label, price: 0, included: true });
    }
    if (a.monthly) {
      monthlyLines.push({
        label: a.monthlyLabel, price: a.monthly, priceMax: a.monthlyMax, note: a.monthlyNote
      });
      monthlyTotal += a.monthly;
    }
    if (a.from) hasFrom = true;
    weeksMin = Math.max(weeksMin, a.weeks[0]);
    addonWeeks += a.weeks[1];
  });
  weeksMax += Math.ceil(addonWeeks * OVERLAP);

  // Everything a build covers is listed as "included" whether or not it was
  // ticked, so the customer can see what they are already getting for the
  // price rather than having to discover it by selecting it.
  bundled.forEach(key => {
    if (addonKeys.includes(key)) return;   // already rendered above
    const a = RATES.addons[key];
    if (a) lines.push({ label: a.label, price: 0, included: true });
  });

  if (state.rush && floor > 0) {
    const rush = floor * RATES.rushPct;
    lines.push({ label: 'Fast-track delivery', price: rush, note: 'Compressed schedule, priority scheduling' });
    floor += rush;
    weeksMin = Math.max(1, Math.round(weeksMin * 0.7));
    weeksMax = Math.max(weeksMin + 1, Math.round(weeksMax * 0.7));
  }

  const ceiling = floor * (1 + RATES.rangeUpliftPct);
  return { lines, floor, ceiling, weeksMin, weeksMax, hasFrom, monthlyLines, monthlyTotal };
}

/** The three comparison tiers. */
function tiers() {
  const chosen = [...state.addons];
  const essential = price([]);
  const recommended = price(chosen);
  const complete = price(Object.keys(RATES.addons));
  return { essential, recommended, complete };
}

/* ---- Rendering ---------------------------------------------------------- */

function renderResult() {
  const t = tiers();
  const r = t.recommended;

  const rangeEl = document.getElementById('res-range');
  // With no range uplift the floor is the price, so show one number rather
  // than the same figure twice.
  rangeEl.textContent = r.floor === 0
    ? '-'
    : (r.hasFrom ? 'from ' : '')
      + fmt(r.floor)
      + (Math.round(r.ceiling) > Math.round(r.floor) ? ' – ' + fmt(r.ceiling) : '');

  document.getElementById('res-weeks').textContent =
    r.weeksMin === 0 ? '-' : r.weeksMin + '–' + r.weeksMax + ' weeks';

  document.getElementById('res-items').textContent =
    r.lines.filter(l => !l.included).length + ' line items';

  // Breakdown
  const tbody = document.getElementById('res-breakdown');
  tbody.innerHTML = '';
  r.lines.forEach(l => {
    const row = document.createElement('div');
    row.className = 'bd-row' + (l.included ? ' bd-row--inc' : '');
    const left = document.createElement('div');
    left.innerHTML = '<span class="bd-label">' + escapeHtml(l.label) + '</span>' +
      (l.note ? '<span class="bd-note">' + escapeHtml(l.note) + '</span>' : '');
    const right = document.createElement('span');
    right.className = 'bd-price';
    right.textContent = l.included ? 'included' : (l.from ? 'from ' : '') + fmt(l.price);
    row.append(left, right);
    tbody.append(row);
  });

  // Recurring fees, shown apart from the project so the headline number
  // is never mistaken for the whole cost of running ads.
  const mWrap = document.getElementById('res-monthly-wrap');
  const mBody = document.getElementById('res-monthly');
  if (mWrap && mBody) {
    mBody.innerHTML = '';
    r.monthlyLines.forEach(l => {
      const row = document.createElement('div');
      row.className = 'bd-row';
      const left = document.createElement('div');
      left.innerHTML = '<span class="bd-label">' + escapeHtml(l.label) + '</span>' +
        (l.note ? '<span class="bd-note">' + escapeHtml(l.note) + '</span>' : '');
      const right = document.createElement('span');
      right.className = 'bd-price';
      right.textContent = (l.priceMax
        ? fmt(l.price) + ' – ' + fmt(l.priceMax)
        : fmt(l.price)) + ' /mo';
      row.append(left, right);
      mBody.append(row);
    });
    mWrap.hidden = r.monthlyLines.length === 0;
  }

  // What's included
  const inc = document.getElementById('res-includes');
  inc.innerHTML = '';
  const site = RATES.site[state.site];
  (site && site.includes ? site.includes : []).forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    inc.append(li);
  });

  // Tier comparison
  setTier('essential', t.essential, 'The build, with the search work it already covers');
  setTier('recommended', t.recommended, 'Exactly what you selected');
  setTier('complete', t.complete, 'Every layer of the growth system');

  document.getElementById('estimate-payload').value = plainText(r, t);
  lastResult = r;
}

/** The most recent calculation, so the form can send structured fields
    to the Sheet rather than only a block of text. */
let lastResult = null;

function payloadFields() {
  const r = lastResult;
  const site = RATES.site[state.site] || {};
  const addonNames = [...state.addons]
    .map(k => (RATES.addons[k] || {}).short || k)
    .join(', ');
  return {
    estimate_low: r ? Math.round(r.floor) : '',
    estimate_high: r ? Math.round(r.ceiling) : '',
    // Recurring fees are deliberately outside the project total, so they
    // need their own column or they vanish from the Sheet entirely.
    monthly: r && r.monthlyTotal ? Math.round(r.monthlyTotal) : '',
    currency: RATES.currency,
    timeline: r ? r.weeksMin + '–' + r.weeksMax + ' weeks' : '',
    goal: state.goal || '',
    website: site.label || '',
    languages: state.languages,
    rush: state.rush,
    addons: addonNames,
    source: 'estimator'
  };
}

function setTier(id, data, note) {
  document.getElementById('tier-' + id + '-price').textContent =
    data.floor === 0 ? '-' : (data.hasFrom ? 'from ' : '') + fmt(data.floor);
  document.getElementById('tier-' + id + '-weeks').textContent =
    data.weeksMin === 0 ? '-' : data.weeksMin + '–' + data.weeksMax + ' weeks';
  document.getElementById('tier-' + id + '-note').textContent = note;
}

/** Plain-text estimate - this is the body that gets emailed. */
function plainText(r, t) {
  const L = [];
  L.push('IMARKET2WEB - PROJECT ESTIMATE');
  L.push('Generated ' + new Date().toISOString().slice(0, 10));
  L.push('');
  L.push('YOUR ANSWERS');
  L.push('  Goal:      ' + (state.goal || '-'));
  L.push('  Website:   ' + ((RATES.site[state.site] || {}).label || '-'));
  L.push('  Languages: ' + state.languages);
  L.push('  Timeline:  ' + (state.rush ? 'Fast-track' : 'Standard'));
  L.push('');
  L.push('BREAKDOWN');
  r.lines.forEach(l => {
    const p = l.included ? 'included' : (l.from ? 'from ' : '') + fmt(l.price);
    L.push('  ' + l.label);
    L.push('      ' + p);
  });
  L.push('');
  L.push('ESTIMATE:  ' + (r.hasFrom ? 'from ' : '') + fmt(r.floor) + ' – ' + fmt(r.ceiling));
  L.push('TIMELINE:  ' + r.weeksMin + '–' + r.weeksMax + ' weeks');
  if (r.monthlyLines.length) {
    L.push('');
    L.push('THEN, MONTHLY');
    r.monthlyLines.forEach(l => {
      L.push('  ' + l.label);
      L.push('      ' + fmt(l.price) + ' /month');
      if (l.note) L.push('      ' + l.note);
    });
  }
  L.push('');
  L.push('COMPARISON');
  L.push('  Essential:   ' + fmt(t.essential.floor));
  L.push('  Recommended: ' + fmt(t.recommended.floor));
  L.push('  Complete:    ' + fmt(t.complete.floor));
  L.push('');
  L.push('This is a ballpark estimate, not a binding quote. The final figure');
  L.push('is confirmed after a short call about scope.');
  L.push('');
  L.push('imarket2web · Poznan · +48 516 492 854');
  return L.join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---- Step navigation ---------------------------------------------------- */

const steps = () => [...document.querySelectorAll('[data-step]')];

function showStep(n) {
  const all = steps();
  state.step = Math.max(0, Math.min(n, all.length - 1));
  all.forEach((el, i) => { el.hidden = i !== state.step; });

  const pct = (state.step / (all.length - 1)) * 100;
  document.getElementById('prog-bar').style.transform = 'scaleX(' + (pct / 100) + ')';
  document.getElementById('prog-label').textContent =
    'Step ' + (state.step + 1) + ' of ' + all.length;

  if (all[state.step].dataset.step === 'result') renderResult();

  const h = all[state.step].querySelector('h2');
  if (h) h.setAttribute('tabindex', '-1'), h.focus({ preventScroll: true });
  document.getElementById('estimator').scrollIntoView({ block: 'start', behavior: 'smooth' });
  validateStep();
}

/** A step with required choices cannot be left until one is made. */
function validateStep() {
  const el = steps()[state.step];
  const next = el.querySelector('[data-next]');
  if (!next) return;
  const req = el.dataset.require;
  let ok = true;
  if (req === 'goal') ok = !!state.goal;
  if (req === 'site') ok = !!state.site;
  next.disabled = !ok;
  next.setAttribute('aria-disabled', String(!ok));
}

/* ---- Wiring ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('estimator')) return;

  document.querySelectorAll('[data-choice]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.choice;
      const value = btn.dataset.value;
      state[field] = value;
      if (field === 'site') syncBundledOptions();
      btn.parentElement.querySelectorAll('[data-choice]').forEach(b => {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      validateStep();
    });
  });

  document.querySelectorAll('[data-addon]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.addon;
      // Already covered by the chosen build: nothing to buy, so ignore.
      if (btn.getAttribute('aria-disabled') === 'true') return;
      state.addons.has(key) ? state.addons.delete(key) : state.addons.add(key);
      const on = state.addons.has(key);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  });

  const langs = document.getElementById('langs');
  if (langs) langs.addEventListener('input', () => {
    state.languages = parseInt(langs.value, 10);
    document.getElementById('langs-out').textContent =
      state.languages + (state.languages === 1 ? ' language' : ' languages');
  });

  const rush = document.getElementById('rush');
  if (rush) rush.addEventListener('change', () => { state.rush = rush.checked; });

  document.querySelectorAll('[data-next]').forEach(b =>
    b.addEventListener('click', () => showStep(state.step + 1)));
  document.querySelectorAll('[data-prev]').forEach(b =>
    b.addEventListener('click', () => showStep(state.step - 1)));

  document.getElementById('restart').addEventListener('click', e => {
    e.preventDefault();
    state.goal = state.site = null;
    state.languages = 1;
    state.rush = false;
    state.addons.clear();
    document.querySelectorAll('.opt').forEach(b => {
      b.classList.remove('is-on');
      b.setAttribute('aria-pressed', 'false');
    });
    if (langs) { langs.value = 1; document.getElementById('langs-out').textContent = '1 language'; }
    if (rush) rush.checked = false;
    showStep(0);
  });

  wireForm();
  showStep(0);
});

/* ---- Submission ---------------------------------------------------------- */

function wireForm() {
  const form = document.getElementById("estimate-form");
  if (!form) return;

  const keyField = form.querySelector("input[name=access_key]");
  if (keyField) keyField.value = PROVIDER === "web3forms" ? ENDPOINT : "";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const status = document.getElementById("form-status");
    const btn = form.querySelector("button[type=submit]");

    if (!ENDPOINT || ENDPOINT.indexOf("PASTE-") === 0 || ENDPOINT.indexOf("YOUR-") === 0) {
      status.className = "form-status is-err";
      status.textContent = "Email delivery is not set up yet - see tools/apps-script/Code.gs. Your estimate is shown above and can still be printed.";
      return;
    }
    if (!form.querySelector("[name=consent]").checked) {
      status.className = "form-status is-err";
      status.textContent = "Please tick the consent box so I am allowed to email you.";
      return;
    }

    const data = Object.assign(
      Object.fromEntries(new FormData(form)),
      payloadFields()
    );
    data.consent = !!form.querySelector("[name=consent]").checked;

    btn.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";

    try {
      let ok;
      if (PROVIDER === "apps-script") {
        // A plain-string body is sent as text/plain, which is a "simple"
        // request - no CORS preflight, which Apps Script cannot answer.
        const res = await fetch(ENDPOINT, { method: "POST", body: JSON.stringify(data) });
        const out = await res.json();
        ok = out.success;
        if (!ok) throw new Error(out.message || "Submission failed");
      } else {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        });
        const out = await res.json();
        ok = out.success;
        if (!ok) throw new Error(out.message || "Submission failed");
      }
      status.className = "form-status is-ok";
      status.textContent = "Sent. Check your inbox - the estimate is on its way.";
      form.reset();
    } catch (err) {
      status.className = "form-status is-err";
      status.textContent = "Could not send: " + err.message + ". Email imarket2web@gmail.com instead.";
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---- Bundled add-ons -----------------------------------------------------
   When a website build is chosen, the services that build already covers are
   marked as included and taken out of the selection, so nobody is invited to
   pay twice for work that is in the price. Choosing "no new website" puts
   them all back: that is the path for a business that already has a site and
   only wants promotion. */
function syncBundledOptions() {
  const site = RATES.site[state.site];
  const bundled = (site && site.bundles) || [];
  document.querySelectorAll('[data-addon]').forEach(btn => {
    const key = btn.getAttribute('data-addon');
    const isBundled = bundled.includes(key);
    btn.classList.toggle('opt--inc', isBundled);
    btn.setAttribute('aria-disabled', isBundled ? 'true' : 'false');
    let tag = btn.querySelector('.opt-inc-tag');
    if (isBundled) {
      state.addons.delete(key);
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('is-on');
      if (!tag) {
        tag = document.createElement('span');
        tag.className = 'opt-inc-tag';
        tag.textContent = 'Included in your website price';
        btn.append(tag);
      }
    } else if (tag) {
      tag.remove();
    }
  });
}
