# imarket2web - agency site

Static HTML. No build step. Deploy the folder as-is to any static host (Netlify, Vercel, Cloudflare Pages, nginx).

## Structure

```
index.html                        Homepage
work/index.html                   Portfolio index - all 5 projects
work/permanent-guru/index.html    Case study - permanent makeup, Poznań PL
work/massage4you/index.html       Case study - massage & wellness, Poznań PL
work/stin-tattoo-studio/index.html Case study - tattoo studio, Prague CZ
work/beauty-massage/index.html    Case study - massage studio, Prague 4 CZ
work/migrona/index.html           Case study - freight forwarding, Tallinn EE
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
| GitHub Pages project site | `alporokh.github.io/imarket2web/` | yes - served from a subpath |
| Custom domain | `imarket2web.com/` | yes - served from root |

Root-absolute paths would 404 on GitHub Pages, because `/assets/site.css` resolves to
`alporokh.github.io/assets/site.css` rather than `alporokh.github.io/imarket2web/assets/site.css`.
**If you ever reintroduce a leading slash on an internal link, it will break the GitHub Pages
build and work fine locally** - which is the worst combination. Keep them relative.

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
(The Migrona cover is full-width - use 1600×900.)

Then run:

```
node tools/apply-images.js           # dry run - shows what it would change
node tools/apply-images.js --write   # apply
```

It finds each placeholder, checks whether the image actually exists, and swaps
in the `<img>` tag with the right relative path, alt text, dimensions and
`loading` attribute. Safe to run repeatedly - placeholders whose file is still
missing are left alone and listed, so you can add images a few at a time.

There are **30 image slots**: 5 covers (homepage + portfolio index share them),
5 case-study heroes, and 20 screenshot-strip images (4 per case study).

Keep `width`/`height` on every image - they prevent layout shift (Core Web Vitals).

## Placeholders still to fill

These are deliberate. Nothing unverified was published as fact.

- `[ADD VERIFIED DATA]` - results panels on all five case studies. Fill only from
  GA4 / Search Console, and state the date range the number covers.
- `[ CLIENT QUOTE - to collect ]` - testimonial blocks on four case studies.
  Permanent Guru has a real one from Iryna Malaniak; the homepage band carries
  the same quote.
- `[YOUR EMAIL]` and `[COMPANY / NIP DETAILS]` - footer, every page, plus `/privacy/`.
- `WEB3FORMS_KEY` in `assets/estimator.js` - the estimator cannot email until this is set.
- Layer checklists (`layers-list`) on each case study mark which of the 8 growth-system
  layers are live vs. in progress. Verify these match reality before launch.

## Pages linked but not yet built

The nav and footer link to pages that do not exist yet:
`/services/` (and its 7 sub-pages), `/about/`, `/insights/`, `/contact/`,
and the `/pl/` and `/uk/` language versions. These links were in the original
homepage design. Build them or trim the nav before launch - live 404s in the
main navigation hurt both trust and crawling.

## Project estimator (`/estimate/`)

A six-step questionnaire that prices a project in the browser and can email the
result. No backend - the maths runs client-side, so it works on GitHub Pages.

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

**Two values are assumptions, not from the rate card** - change them to whatever
you actually charge:

- `extraLanguagePct: 0.35` - each additional language adds 35% of the website base
- `rushPct: 0.25` - fast-track surcharge

`rangeUpliftPct: 0.30` sets how far above the floor the quoted range goes.

The 10-page package declares `bundles: ['gbp']`, so if someone picks that package
*and* the GBP add-on, the add-on shows as "included" instead of being charged
twice. Add the same key to any other package that already contains an add-on.

### Turning on email delivery

1. Get a free access key at <https://web3forms.com> (they email it to you; no account).
2. Put it in `WEB3FORMS_KEY` in `assets/estimator.js`. That single constant is
   pushed into the form's hidden field at runtime, so it is never set twice.
3. In the Web3Forms dashboard, **turn on Auto Reply** - otherwise only you receive
   the estimate and the client gets nothing.

Until a key is set, the form shows a plain "not configured yet" message rather
than failing silently.

### Design decisions worth keeping

- **The estimate is not gated.** People see the number before being asked for an
  email. Higher completion, and it avoids collecting personal data as the price of
  information - which matters under GDPR.
- **A honeypot field** (`botcheck`) catches bots without a CAPTCHA.
- **The range is presented as a ballpark, not a quote**, in the UI and in the
  emailed text.

## Scroll-scrub (homepage)

The hero-to-section-02 transition uses **CSS scroll-driven animations**
(`animation-timeline: view()`), not a JavaScript scroll handler. It runs off the
main thread, so it cannot drop frames while the page is still loading, and it
tracks scroll position rather than playing a fixed timeline - so it is naturally
interruptible and reversible.

Guarded twice: `@supports (animation-timeline: view())` and
`@media (prefers-reduced-motion: no-preference)`. Browsers without support get the
static page, which is already correct - nothing is hidden behind the animation.

Easing is `linear` on purpose. A scrub has to follow the finger 1:1; any curve
makes it feel laggy and disconnected from the gesture.

## Privacy, consent and fonts

### The site tracks nothing

Worth knowing before anyone adds a script: **this site sets no cookies and makes
no third-party requests.** The fonts are self-hosted (`assets/fonts/`, 16 woff2
files, latin + latin-ext + cyrillic), so not even Google sees a visitor IP. The
estimator does its maths in the browser.

That is why the banner does not say "we use cookies" - it would be false.

### Consent banner

`assets/consent.js` injects it on every page. It is a consent gate for
**analytics**, which is the only thing here that would ever need one.

- Sets **Google Consent Mode v2 defaults to denied** before anything else runs,
  which is what Consent Mode requires.
- Choice is stored in `localStorage` (not a cookie) under `i2w-consent`.
- Refusing is exactly as easy as accepting - same size, same prominence, one
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
`[REGISTERED ADDRESS - add before launch]`. GDPR expects a controller postal
address. Everything else is complete.

This is written to be read by a human rather than to imitate a law firm, and it
describes what the site actually does. It is not legal advice.

### Fonts

Self-hosted from `assets/fonts/`, declared at the top of `assets/site.css`.
Archivo has no Cyrillic subset on Google Fonts, so Ukrainian text ("Українська")
falls back to the system stack - it did before too; self-hosting did not change
it. If you want Cyrillic in Archivo you need a different family or a subset from
elsewhere.

Do not re-add the Google Fonts `<link>` tags. That would reintroduce the only
third-party request on the site and make the privacy page inaccurate.

## Estimator backend - Google Sheet + automated reply

The estimator posts to a **Google Apps Script** you own. That one script does
three things: writes the lead into a Google Sheet, emails the estimate to the
person who asked for it, and emails you a copy. No third-party form service,
and the mail goes out from your own Gmail.

**Sheet:** [imarket2web - Estimator leads](https://docs.google.com/spreadsheets/d/1rQQSdr7Lj_7mefZ7xW31CBGxCdlrwrV9mr-VtntRUMg/edit)

### Setup (once, ~5 minutes)

1. Open the Sheet → **Extensions → Apps Script**.
2. Delete the placeholder code, paste in all of `tools/apps-script/Code.gs`, save.
3. Run the `setup` function once. Authorise it when asked - that is it asking
   permission to write to your own Sheet and send mail as you. The
   "Google hasn't verified this app" warning is normal for your own scripts:
   **Advanced → Go to (project name)**.
4. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone** - not "Anyone with a Google account", or the
     website cannot reach it.
5. Copy the `/exec` URL and paste it into `ENDPOINT` in `assets/estimator.js`.
6. Submit a test from the live site. One row in the Sheet, two emails.

If you later edit `Code.gs`, you must **Deploy → Manage deployments → edit →
New version**, or the site keeps calling the old copy. This catches everyone once.

### If the form says it cannot reach the script

Open the /exec URL in a private browsing window. You should see
`{"ok":true,"service":"imarket2web estimator"}`. If you get a **Google sign-in
page** instead, the deployment is asking visitors to log in, so the website
cannot reach it:

**Deploy → Manage deployments → pencil icon → Who has access → Anyone → Deploy.**

"Anyone" and "Anyone with a Google account" are different settings, and only
the first one works for a public form.

### What lands in the Sheet

One row per submission: timestamp, name, email, estimate low/high, currency,
timeline, goal, website package, languages, fast-track, add-ons, message,
consent, the full text breakdown, and source.

### Switching back to Web3Forms

Set `PROVIDER = 'web3forms'` and put the access key in `ENDPOINT`. Note that on
their free tier the auto-reply is a paid feature, so only you would get the mail.

### Why the request has no Content-Type header

Apps Script cannot answer a CORS preflight. Sending the body as a plain string
makes it a "simple" request, which skips the preflight entirely. Do not add a
`Content-Type: application/json` header to that fetch - it will start failing.

## Insights (`/insights/`)

The blog section, using the space hero. Currently an honest empty state with the
planned article queue rather than filler posts.

**To publish the first article:** delete the `.empty-state` block in
`insights/index.html` and uncomment the article grid below it. Each article is
its own folder, e.g. `insights/why-one-page-per-treatment/index.html`.

## Hero - Matrix rain

`assets/matrix.js` draws falling characters behind the hero copy. The old
screenshot placeholders are gone; the hero is now one column with the rain
behind it.

**Colours** are two CSS variables in `site.css`:

```css
:root {
  --matrix-head: #7CBAF8;      /* leading glyph */
  --matrix-body: 255,255,255;  /* the trail, as r,g,b */
}
```

Defaults are white with a brand-blue leading glyph, because film-green fights
the palette. **For classic green:** `--matrix-head: #7CFFB2;` and
`--matrix-body: 120,255,170;`. Nothing else changes.

The glyphs are code characters rather than katakana - braces, tags, operators,
hex - since the brief was "as if someone writes code".

Costs close to nothing: one canvas, throttled to 24fps, and it stops entirely
when the hero scrolls out of view or the tab is hidden. Reduced motion renders
one static frame, so the texture survives and the movement goes.

A radial mask keeps the rain off the headline. If you change the hero copy
width, adjust `.matrix-hero::after`.

## Section 05 - the eight steps shuffle and deal

`assets/shuffle.js`. The process cards gather into a loose pile, then deal out
to their real grid positions in order, 01 through 08. The order is the point:
the section says "Eight steps, then it loops", so watching them land in
sequence says the same thing as the copy.

It is a FLIP run backwards, and the grid is never touched:

1. Measure where each card actually is.
2. Transform it back toward the centre of the grid, rotated and slightly
   small, with no transition - so the stacking is never seen.
3. Remove the transform with a transition and a per-card delay, so they
   travel out to their real places one after another.

Because the end state is *no transform*, the layout stays correct at every
width and nothing is left pinned to a hardcoded position. If the script never
runs, the cards are simply already where they belong.

Per-element overrides: `data-shuffle-spread`, `data-shuffle-tilt` and
`data-shuffle-stagger` on the container. The two lists in section 04 use gentler
values than the process grid - short lines in a narrow card need less travel
than large cards do.

Defaults at the top of the file: `STAGGER` (70ms between cards),
`DURATION` (620ms each), `SPREAD` (how tightly they pile) and `TILT`
(max rotation). Total run is about 1.1s.

Plays **once**, when the section first comes into view - repeating it on every
scroll past would turn a nice moment into a tic. Reduced motion gets a plain
staggered fade instead, which still shows the order.

To use it elsewhere, add `class="shuffle" data-shuffle` to any grid container.

## Section 02 - infinite gallery

The six service cards scroll as two rows moving in opposite directions,
looping forever. Pure CSS, no JS.

**How the seam is hidden:** each row holds its 3 cards **three times**, and the
track translates by exactly `-33.3333%`. At the moment the animation restarts,
the frame is pixel-identical to the frame before it, so there is no jump. If
you add or remove cards, keep three copies and that percentage stays right.

Only the first copy is real. The other two carry `aria-hidden="true"` and
`tabindex="-1"`, so screen readers and the keyboard meet each service **once**,
not three times.

Speed is per row: `galScroll 64s` and `galScrollRev 74s`. Deliberately
mismatched - equal speeds make the two rows look mechanically linked.

**It pauses on hover and on keyboard focus.** That is not decoration: WCAG
2.2.2 requires moving content to be pausable, and these cards are text people
need to read. Reduced motion stops the animation entirely and hands the row
back to normal horizontal scrolling with snap points, so every card stays
reachable.

The row is full-bleed out of `.wrap` via negative margins, with a mask that
fades cards at both edges rather than cutting them off.

## Light wave - shimmer, then land on Enquiries

`assets/lightwave.js`. A shimmer runs letter by letter across "Every layer
makes the next one cheaper", and where it finishes a gleam leaves the line,
travels out and down, and lands on the blue Enquiries card.

**Splitting the heading.** Each letter needs its own element. Two things that
normally break when text is split this way are handled:

- Words are wrapped too, as `inline-block`, so a line can only break between
  words. Splitting into bare letters lets the browser break a word anywhere.
- The heading keeps an `aria-label` with the original sentence, so screen
  readers get a sentence rather than a pile of spans.

The split runs in JS, not in the markup, so the HTML stays readable. Verified
that the rendered text is character-identical afterwards and the blue accent
word survives intact.

The shimmer keyframe uses `color: inherit` at both ends, so cream letters
return to cream and the accent word returns to blue - one keyframe, both cases.

**Routing.** The cards are a 4x2 grid with the blue one bottom-right, putting
card 04 directly above it, so a straight diagonal would cut across other cards.
The path instead leaves the last letter, crosses the space right of the copy,
drops through the gutter beside the grid, and curves back into the blue card
from its right edge. Verified by sampling the generated bezier against every
card box: 01-07 clear, only 08 entered.

Timing: `STAGGER` 18ms per letter, `SHIMMER` 620ms each, `TRAVEL` 1300ms.
The wave crosses in about 580ms and the gleam leaves at about 700ms.

Runs at 900px and up. Reduced motion skips the shimmer and the travel and
simply lights the card.

### Client screenshots

The five project screenshots are in `images/work/` as WebP, 1400px wide.

They were supplied as PNGs at ~2800px (11.29 MB for the five). Re-encoded at
1400px WebP q80 they come to **0.25 MB total - 98% smaller**, which matters on
a site whose own copy sells Core Web Vitals. The originals are still in
`images/` if you need to re-export at another size; nothing on the site loads
them.

To re-do the optimisation after replacing a source file:

```
npx sharp-cli -i images/<file>.png -o images/work/<slug>.webp resize 1400 --withoutEnlargement -- webp --quality 80
```

Still placeholders: the three screenshot-strip images per case study
(`<slug>-01/02/03.jpg`), which want interior shots rather than the homepage.

### How screenshots are presented

A `.shot` that still holds a placeholder keeps its fixed height - an empty box
needs one. A `.shot` holding a real screenshot does not: it takes the image's
own proportions via `height: auto`, so the whole page top shows instead of a
slice cropped from the middle.

That distinction is what `.shot:has(img)` does, at the end of `site.css`. The
`!important` on the height is deliberate and commented: six context rules set a
fixed height on `.shot`, all more specific than `:has(img)`, and one override
beats adding `:not(:has(img))` to every one of them.

Because every `<img>` carries its real `width` and `height`, the browser
reserves the correct space before the file loads, so nothing jumps.

If a screenshot ever needs cropping instead - a very tall capture, say - set
`aspect-ratio` on that `.shot` and give the image
`object-fit: cover; object-position: top`, which shows the hero rather than
the middle.

### Case band background

The "Inside a project" band on the homepage uses `images/case-lilies.webp`
(2400x1029, 56 KB) instead of the old flat peach.

The base colour `#021B26` in the `.case` rule is **sampled from the photograph's
own left-hand area**, and a gradient carries that colour across the copy. That
is why the join is invisible: the CSS colour and the image agree exactly. If you
swap the image, resample it or the seam will show.

Everything inside the band is restyled for dark - white cards would read as
holes punched in the photograph. The stat cards and the quote become glass with
a `backdrop-filter`, with an opaque fallback for browsers without it.

Below 900px the photo becomes a texture at 42% with a flat scrim over it: at
phone width you only see a slice of the composition, and the copy needs solid
ground more than it needs flowers.

The image was generated rather than licensed, so there is no attribution to
carry. Swap it for a photograph whenever you have one - the only things tied to
the file are the sampled colour and the `.case::before` URL.

### About the testimonial

The Permanent Guru quote appears in two places: the homepage "Inside a project"
band and the Permanent Guru case study. It is reproduced word for word.

**No `Review` schema is attached, deliberately.** Google does not show rich
results for reviews a business publishes about itself, so marking it up gains
nothing and risks a manual action for self-serving review markup. It is plain
content, which is the correct treatment.

`.quote.is-real` styles it as testimony rather than a placeholder - smaller,
darker, left-aligned with a 60ch measure. Centring three sentences leaves both
edges ragged and is measurably harder to read. The four case studies still
waiting on quotes keep the old muted centred treatment, so real and pending
stay distinguishable at a glance.

One thing to confirm: the quote says "Alena", the site says "Olena Porokh".
Left exactly as written, since altering a client's words is not ours to do -
but if that is a typo on their side, ask them to reissue it.

## Work page hero - the particle orbit

`assets/orbit.js` plus `images/orbit-scene.webp` (2000x857, 195 KB).

A wide space scene - sun left, Earth and Moon right - rebuilt out of particles
that swirl apart and reassemble, with the scroll driving a camera that travels
from the sun to the Earth.

### The particle model

It follows the ReactBits ParticleImage component, which is what was asked for,
and keeps its vocabulary so the two are comparable:

- colours are **sampled from the image**, never hardcoded
- particles accelerate along a **Perlin noise flow field** that evolves over time
- velocity is retained frame to frame and scaled by `DAMPING`
- each particle has a `LIFESPAN`, then respawns at home with no velocity. That
  constant dying and returning is what reads as "swirl apart and reassemble"
- the pointer transfers momentum within `CURSOR_RADIUS`

Two things are ours rather than theirs: the scroll drives a camera pan, and the
source image stays faintly visible underneath so the sun and Earth remain
readable while everything is moving.

### Measured

| | |
|---|---|
| particles | 28,709 |
| on screen at once | ~8,300 (the rest are culled) |
| frame cost | 4.92ms (budget 16.6ms) |
| drift | avg 131px against a 723px Earth, about 18% |

Two optimisations pay for that density. A **trig lookup table**: cos and sin
were called twice per particle per frame, and the flow field does not need more
than 1024 angular steps. And **off-screen culling**: the camera only shows part
of the scene, so around 20,000 particles sit outside the viewport at any moment
and their physics is skipped entirely. Together they took the frame from 9.70ms
to 4.92ms, which is what made 28,709 particles affordable instead of 5,242.

`NOISE_STRENGTH` is **0.14, tuned rather than guessed**. Drift is meaningful
only relative to the bodies: at 18% of the Earth diameter the scene still reads,
and past roughly 25% it smears. If you change `SAMPLE_W` or `ZOOM` the scene
scale changes with them, so re-measure rather than assuming the number still holds.
### Two implementation notes

**Offsets, not absolute positions.** Each particle stores an offset from its
home rather than a screen coordinate, so the camera can pan without dragging
particles out of formation, and the noise is sampled in scene space so the
currents belong to the scene rather than the viewport.

**No `fillRect`.** Several thousand path calls a frame would be slow. Particles
are written into an `ImageData` buffer as pixels and blitted once with
`putImageData`. Device pixel ratio capped at 1.5.

### Degrades to the photograph

The scene sits on `::before` as an image layer at full strength. `orbit.js`
adds `.is-live` once particles are drawing, which drops it to 20% and fades the
canvas in. No JS, reduced motion, a slow load or a tainted canvas all leave the
hero as the image. The loop stops when the section is off screen or the tab is
hidden.

### Shuffle modes

`shuffle.js` has two, set with `data-shuffle-mode`:

- **`pile`** (default) gathers the cards to the centre of their container,
  tilted, then deals them out in order. Used by the eight process steps and the
  two lists in section 04.
- **`push`** is for a grid that should simply arrive: each card slides up into
  place, one after the next, no stacking and no tilt. Used by the project grids
  on the homepage and `/work/`.

Push mode writes no `z-index`, because the cards arrive in sequence rather than
as a deck, and CSS gives it `overflow: visible` - the clip that keeps a pile
tidy would cut cards off as they enter from below. Nothing moves sideways in
push mode, so that cannot produce a horizontal scrollbar.

Per-element: `data-shuffle-stagger` (95ms on the project grids, so "one by one"
reads clearly on large cards), `data-shuffle-push` (how far below it starts),
plus `data-shuffle-spread` and `-tilt` for pile mode.

### Orbit as a panel

`/estimate/` uses the same scene and particle engine, but as a hero rather than
a journey: `.orbit-track--panel` gives the stage a fixed height and drops the
sticky positioning, and `orbit.js` sees no scroll range so it holds the camera
at `data-orbit-focus` instead of panning.

That page is set to `0.78`, near the Earth - the destination, which suits a page
about what it costs to get there, and stays clear of the gust at 0.9 that
disperses the field at the end of the work page journey.

The reason it is a panel at all: the estimator's job is to get people into the
calculator, and a four-screen scroll in front of it would work against that.

### Using a different scene on a page

Two things must agree, and a third sets the sampling:

```html
<section class="orbit-track orbit-track--panel" data-orbit
         data-orbit-focus="0.78"
         data-orbit-sample="1300"
         style="--orbit-img: url(../images/your-scene.webp);">
  <canvas class="orbit-canvas" data-src="../images/your-scene.webp"></canvas>
```

- `--orbit-img` is the CSS underlay
- `data-src` is what the particle sampler reads
- `data-orbit-sample` is the width it samples at; it is clamped to the image's
  own width, because upscaling cannot invent detail, it only blurs

**Source resolution decides whether this effect works at all.** Particle spacing
on a 1400px hero, measured:

| source | sampled | particles | spacing | result |
|---|---|---|---|---|
| 1200x800 | 1200, step 3 | 55,153 | 3.5px | fine dust |
| 2400x1029 | 1300, step 3 | 28,709 | 3.2px | fine dust |
| 182x148 | 182, step 1 | 19,254 | 7.7px | coarse dot matrix |

Below roughly 1000px wide there is no setting that recovers it, because the
particle grid cannot be finer than the pixels it samples.

### The estimate scene

`/estimate/` uses `images/earth-beauty-hero.webp` (2400x1029, 99 KB), the work
page keeps `orbit-scene.webp`. Each page sets its own via `--orbit-img` and the
canvas `data-src`.

It was regenerated from `images/earth-beauty.jpg`, which is 182x148 and could
not drive the effect: at that size the particle grid lands 7.7px apart, a coarse
dot matrix rather than dust, and no setting recovers it. The replacement was
matched to the original by measurement rather than by eye - the reference's
bright areas average rgb(109,136,158) and the new one rgb(99,146,178), the same
cool blue-white, with the bodies right of centre and dark space on the left for
the copy. It yields 17,000 particles at 3.2px spacing.

`data-orbit-focus` is `0.25` here rather than the 0.78 used before. Focus is
where the camera sits in the scene, and since the bodies in this image are
already right of centre, a low value keeps them on the right of the frame with
the copy on clear ground. The original `earth-beauty.jpg` is kept as the
reference it was.
