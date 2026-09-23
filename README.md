# imarket2web — agency site

Static HTML. No build step. Deploy the folder as-is to any static host (Netlify, Vercel, Cloudflare Pages, nginx).

## Structure

```
index.html                        Homepage
work/index.html                   Portfolio index — all 5 projects
work/permanent-guru/index.html    Case study — permanent makeup, Poznań PL
work/massage4you/index.html       Case study — massage & wellness, Poznań PL
work/stin-tattoo-studio/index.html Case study — tattoo studio, Prague CZ
work/beauty-massage/index.html    Case study — massage studio, Prague 4 CZ
work/migrona/index.html           Case study — freight forwarding, Tallinn EE
assets/site.css                   All styles (Signal design system tokens + components)
assets/site.js                    Mobile menu + footer year
images/                           Logo files
images/work/                      Project screenshots (see below)
robots.txt, sitemap.xml
```

CSS and JS are shared across all pages, so a token change in `assets/site.css` updates the whole site.

## Local preview

```
npx http-server -p 8080
```

Then open <http://localhost:8080>.

## Deployment

All internal links are **relative** (`../assets/site.css`, not `/assets/site.css`).
This is deliberate: the site has to work in two places at once.

| Target | URL | Works? |
|--------|-----|--------|
| GitHub Pages project site | `alporokh.github.io/imarket2web/` | yes — served from a subpath |
| Custom domain | `imarket2web.com/` | yes — served from root |

Root-absolute paths would 404 on GitHub Pages, because `/assets/site.css` resolves to
`alporokh.github.io/assets/site.css` rather than `alporokh.github.io/imarket2web/assets/site.css`.
**If you ever reintroduce a leading slash on an internal link, it will break the GitHub Pages
build and work fine locally** — which is the worst combination. Keep them relative.

`.nojekyll` (empty file, repo root) is required. Without it GitHub Pages runs Jekyll,
which renders `README.md` as the site instead of serving `index.html`.

### Canonical tags

Every page declares `<link rel="canonical" href="https://imarket2web.com/...">`. That is
correct once the custom domain is live, and tells Google to ignore the GitHub Pages copy
in the meantime. If GitHub Pages is going to be the permanent public address, the
canonicals and `sitemap.xml` need rewriting to `alporokh.github.io/imarket2web/`.

## Adding project screenshots

Every image slot is a styled placeholder with the exact `<img>` tag to paste, in an
HTML comment right above it. Search for `Replace with:` to find them all.

Drop files into `images/work/` using this naming:

| File                              | Where it appears                          | Suggested size |
|-----------------------------------|-------------------------------------------|----------------|
| `<slug>-cover.jpg`                | Homepage grid + portfolio index card      | 1200×800       |
| `<slug>-hero.jpg`                 | Case study hero                           | 1200×900       |
| `<slug>-01/02/03.jpg`             | Case study screenshot strip               | 800×600        |

Slugs: `permanent-guru`, `massage4you`, `stin-tattoo`, `beauty-massage`, `migrona`.
(The Migrona cover is full-width — use 1600×900.)

Then swap the placeholder, e.g.:

```html
<div class="shot">
  <img src="/images/work/permanent-guru-cover.jpg"
       alt="Permanent Guru website homepage" loading="lazy" width="1200" height="800">
</div>
```

Keep `width`/`height` on every image — they prevent layout shift (Core Web Vitals).

## Placeholders still to fill

These are deliberate. Nothing unverified was published as fact.

- `[ADD VERIFIED DATA]` — results panels on all five case studies. Fill only from
  GA4 / Search Console, and state the date range the number covers.
- `[ CLIENT QUOTE — to collect ]` — testimonial blocks on each case study.
- `[YOUR EMAIL]` and `[COMPANY / NIP DETAILS]` — footer, every page, plus `/privacy/`.
- `WEB3FORMS_KEY` in `assets/estimator.js` — the estimator cannot email until this is set.
- Layer checklists (`layers-list`) on each case study mark which of the 8 growth-system
  layers are live vs. in progress. Verify these match reality before launch.

## Pages linked but not yet built

The nav and footer link to pages that do not exist yet:
`/services/` (and its 7 sub-pages), `/about/`, `/insights/`, `/contact/`,
and the `/pl/` and `/uk/` language versions. These links were in the original
homepage design. Build them or trim the nav before launch — live 404s in the
main navigation hurt both trust and crawling.

## Project estimator (`/estimate/`)

A six-step questionnaire that prices a project in the browser and can email the
result. No backend — the maths runs client-side, so it works on GitHub Pages.

### Changing prices

Every price lives in **one object** at the top of `assets/estimator.js`: `RATES`.
Nothing else in the file needs editing. The figures there come from the real rate
card:

| Item | Price |
|---|---|
| Website, up to 4 pages (+ design system, logo, form, Sheets) | €500 |
| Website, up to 10 pages (+ GBP, design system, logo, form, Sheets) | €800 |
| Larger site, 10+ pages | from €800 |
| SEO strategy + keywords + GBP + content + 2 posts + GSC + GA4 | €300 |
| Google Business Profile setup/optimisation | €150 |
| Blog + 5 articles | €150 |
| GA4 + Search Console + conversions | €250 |
| n8n automation | from €300 |
| Social optimisation + 16-post calendar + reels | €200 |

**Two values are assumptions, not from the rate card** — change them to whatever
you actually charge:

- `extraLanguagePct: 0.35` — each additional language adds 35% of the website base
- `rushPct: 0.25` — fast-track surcharge

`rangeUpliftPct: 0.30` sets how far above the floor the quoted range goes.

The 10-page package declares `bundles: ['gbp']`, so if someone picks that package
*and* the GBP add-on, the add-on shows as "included" instead of being charged
twice. Add the same key to any other package that already contains an add-on.

### Turning on email delivery

1. Get a free access key at <https://web3forms.com> (they email it to you; no account).
2. Put it in `WEB3FORMS_KEY` in `assets/estimator.js`. That single constant is
   pushed into the form's hidden field at runtime, so it is never set twice.
3. In the Web3Forms dashboard, **turn on Auto Reply** — otherwise only you receive
   the estimate and the client gets nothing.

Until a key is set, the form shows a plain "not configured yet" message rather
than failing silently.

### Design decisions worth keeping

- **The estimate is not gated.** People see the number before being asked for an
  email. Higher completion, and it avoids collecting personal data as the price of
  information — which matters under GDPR.
- **A honeypot field** (`botcheck`) catches bots without a CAPTCHA.
- **The range is presented as a ballpark, not a quote**, in the UI and in the
  emailed text.

## Scroll-scrub (homepage)

The hero-to-section-02 transition uses **CSS scroll-driven animations**
(`animation-timeline: view()`), not a JavaScript scroll handler. It runs off the
main thread, so it cannot drop frames while the page is still loading, and it
tracks scroll position rather than playing a fixed timeline — so it is naturally
interruptible and reversible.

Guarded twice: `@supports (animation-timeline: view())` and
`@media (prefers-reduced-motion: no-preference)`. Browsers without support get the
static page, which is already correct — nothing is hidden behind the animation.

Easing is `linear` on purpose. A scrub has to follow the finger 1:1; any curve
makes it feel laggy and disconnected from the gesture.

## Privacy, consent and fonts

### The site tracks nothing

Worth knowing before anyone adds a script: **this site sets no cookies and makes
no third-party requests.** The fonts are self-hosted (`assets/fonts/`, 16 woff2
files, latin + latin-ext + cyrillic), so not even Google sees a visitor IP. The
estimator does its maths in the browser.

That is why the banner does not say "we use cookies" — it would be false.

### Consent banner

`assets/consent.js` injects it on every page. It is a consent gate for
**analytics**, which is the only thing here that would ever need one.

- Sets **Google Consent Mode v2 defaults to denied** before anything else runs,
  which is what Consent Mode requires.
- Choice is stored in `localStorage` (not a cookie) under `i2w-consent`.
- Refusing is exactly as easy as accepting — same size, same prominence, one
  click each. That is a GDPR requirement, not a style choice.
- Withdrawable any time via **Privacy settings** in the footer
  (any `[data-privacy-settings]` element reopens it).
- Fires a `consent:changed` event if you want to hook anything else up.

**To add GA4 later:** set `MEASUREMENT_ID` in `assets/consent.js`. That is all.
The script loads gtag only after consent is granted and updates it on withdrawal,
so nothing else needs touching.

### Privacy page

`/privacy/` is filled in with the real controller details: Olena Porokh,
NIP 9721328238, imarket2web@gmail.com, 24-month retention.

**One thing still missing:** the registered address, marked
`[REGISTERED ADDRESS — add before launch]`. GDPR expects a controller postal
address. Everything else is complete.

This is written to be read by a human rather than to imitate a law firm, and it
describes what the site actually does. It is not legal advice.

### Fonts

Self-hosted from `assets/fonts/`, declared at the top of `assets/site.css`.
Archivo has no Cyrillic subset on Google Fonts, so Ukrainian text ("Українська")
falls back to the system stack — it did before too; self-hosting did not change
it. If you want Cyrillic in Archivo you need a different family or a subset from
elsewhere.

Do not re-add the Google Fonts `<link>` tags. That would reintroduce the only
third-party request on the site and make the privacy page inaccurate.
