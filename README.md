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
- `[YOUR EMAIL]` and `[COMPANY / NIP DETAILS]` — footer, every page.
- Layer checklists (`layers-list`) on each case study mark which of the 8 growth-system
  layers are live vs. in progress. Verify these match reality before launch.

## Pages linked but not yet built

The nav and footer link to pages that do not exist yet:
`/services/` (and its 7 sub-pages), `/about/`, `/insights/`, `/contact/`,
and the `/pl/` and `/uk/` language versions. These links were in the original
homepage design. Build them or trim the nav before launch — live 404s in the
main navigation hurt both trust and crawling.
