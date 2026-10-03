# Architecture

How the SAC Chronicle fits together, and why it is shaped this way. For commands,
recipes and house rules see [`AGENTS.md`](../AGENTS.md); for setup see
[`README.md`](../README.md).

The site is **static**: HTML, CSS and ES modules served as-is by GitHub Pages.
There is no bundler and no runtime dependency. The `npm` setup exists only for
tests, linting and a few small generators in `tools/`.

---

## 1. The big picture

```
 pages/*.html  ──┐                         public/assets  (git submodule, ~6 GB, separate repo)
 index.html    ──┼─►  js/main.js  ──►  one page script ──►  assets_map.jsonl  (1,747 records)
 css/*.css     ──┘        │                                 processed/…  WebP, thumbs, markdown, video
                          └─►  shared shell: navbar, footer, settings, loader
```

- **Content is data.** Every photograph and club document lives in the assets
  submodule and is described by `public/assets/processed/assets_map.jsonl`. Pages
  fetch it at runtime and render from it. Club pages are static HTML for their
  text, and hydrate their images from the map.
- **One entry, one page script.** `js/main.js` runs on every page, renders the
  shell, then loads *only* the script for the current page (`body[data-page]`,
  or `data-club-slug` for club pages).
- **Generated, not hand-kept.** Anything that must stay in step across many
  files is produced by a tool in `tools/` and guarded by a test (§6).

## 2. How a page loads

```
HTML  ─► head: stylesheets · <link rel=modulepreload> block · <script type=module src=main.js>
      ─► body: #preloader (classic script, ~1 s guard)  ·  empty mounts
main.js
  ├─ applyPrefs()           theme / texture / font size / reduce-motion  (before anything paints)
  ├─ initLoader()           letterpress splash — once per tab session
  ├─ renderNavbar/Footer, setupNavbarFold, initSettings, initBackToTop
  ├─ import("./pages/<page>.js").then(init)           ← only this page's code
  └─ whenIdle(): lightbox, ambient-music element, reading progress
load event ─► idle ─► register the service worker
```

Why it is this way (all measured on a "slow 4G, 4× CPU" phone profile):

| Decision | Reason |
|---|---|
| Per-page dynamic `import()` | Every page used to load every other page's script (≈40 module requests). |
| `modulepreload` block in every `<head>` | ES modules are discovered one level at a time; each level is a network round trip. The block lists the whole graph so it is fetched in one round. It is **generated** from the real import graph (`tools/sync-pages.mjs`). |
| Service worker registered after load, shell-only precache | It used to precache ~1.7 MB (every page, textures, an audio track) *during* first paint. Now ~23 small files; everything else is cached the first time it is used. |
| Hero / masthead / textures served in several sizes | A phone fetched a 299 KB masthead and a 119 KB hero it could not use. |
| Campus Book loads only nearby pages | Twelve stacked plates meant even `loading="lazy"` fetched all of them. |
| Calendar loads on scroll | Its script, CSS and API request wait until the section is near the viewport. |

Result on the home page, same profile: 893 KB → 135 KB of images, 74 → 49
requests, LCP 6.7 s → 3.6 s. Lighthouse (mobile) is 100/100/100 on home, clubs
and club pages, and layout shift is ≈ 0 everywhere.

### Layout stability (CLS)

Three rules keep the page from jumping while it loads. Each one fixed a measured
shift, and each has a test:

1. **Reserve space in static HTML/CSS, never in JS.** Anything JS creates arrives
   after first paint. `<body class="has-topbar">` reserves the phone masthead strip;
   directory mounts (`#clubs-grid`, `#events-list`, …) hold `90svh`; club pages ship
   an empty `.section-nav--slot` that the jump bar fills in place.
2. **The footer must start below the fold** while content loads, or it is thrown
   out of view (0.5 CLS on its own) when the real list arrives.
3. **Fill a slot, don't insert an element**, when something arrives late.

## 3. Data

| Source | What | Notes |
|---|---|---|
| `assets_map.jsonl` | One JSON record per image, document, video, audio file | Loaded by `js/data.js`, cached in `sessionStorage` for 10 min (keyed by `CACHE_VERSION`). Gzipped by Pages: 2 MB → ~100 KB. |
| `public/duplicates.json` | Ids the site never shows | Applied inside `loadAssetsMap()`. See §4. |
| Google Calendar API | Events | Referrer-restricted key; see §5. |
| YouTube Data API | Latest videos | Home page only. |

The map's `id` is a generation-time counter, so anything that records ids must
also record paths and be checked against the current map (`dedupe.test.js` does).

## 4. Duplicate images

Three layers, all non-destructive — **nothing is deleted from the archive**:

1. **Fingerprints** (`tools/dedupe/hash_images.py`, `cluster.py`): perceptual
   hashes pair near-identical frames *within a club*. Thresholds are deliberately
   strict; loosening them merges different people photographed in the same studio.
2. **Curated** artefacts (blank slides, decorative renders): a hand-kept id list.
3. **Same person** (`tools/dedupe/same_person.json`): hashing cannot pair two
   different frames of one sitter, so a person groups the Dean's-office portraits
   by eye and records one keeper each. It is keyed by **path**, and
   `build_manifest.py` compiles it to ids.

`tools/dedupe/build_manifest.py` writes `public/duplicates.json`; `js/data.js`
applies it. The home page's Book, Board and Picture Desk additionally share a
`claimed` id set so a photograph appears once on the front page.

## 5. The calendar

The Google Calendar this site reads is shared as **free/busy only**
(`accessRole: "freeBusyReader"`): events arrive with times and **no title, place
or description**. The calendar is built to tell the truth about that.

- `js/utils/calendar-model.js` — pure, IST-based. Normalise events; collapse true
  duplicates; merge overlapping busy blocks; detect weekly series; build the grid.
- `js/utils/calendar.js` — `fetchEventsBetween(min, max)` → `{ events, mode }`,
  `mode` ∈ `detailed | busy | empty | error | unconfigured`. Never throws.
- `js/components/calendar.js` — the month view. In `busy` mode it draws hatched
  "booked" bars and a plain note; in `detailed` mode it shows titles, places and
  links. Both modes work today; sharing the calendar publicly switches it over.

Two things are decisions for the Council, not code: the calendar id in
`js/config.js` is a *personal* institute calendar (a dedicated, public "SAC
Events" calendar is the intended setup), and its sharing level.

## 6. Generated files and the tests that guard them

| Generator | Writes | Guarded by |
|---|---|---|
| `tools/sync-pages.mjs` | the `modulepreload` block in all 38 pages; the app-shell list in `sw.js` | `load-budget.test.js` runs it in `--check` mode |
| `tools/gen-sitemap.mjs` | `sitemap.xml`, `robots.txt` (CI regenerates both for the host being deployed) | `sitemap.test.js` |
| `tools/dedupe/build_manifest.py` | `public/duplicates.json` | `dedupe.test.js` |

The repo deploys from **two Pages hosts** with different path casing
(`…/SAC_Website/` and `…/SAC_website/`, case-sensitive), so nothing that needs an
absolute URL is hand-written.

Other invariants with tests: every page shares one stylesheet shell
(`page-shell.test.js`); ink on paper meets WCAG AA for every light texture
(`contrast.test.js`); a club agrees across its page, the directory map and the
archive (`club-registry.test.js`); `sw.js` and `js/data.js` carry the same cache
version (`site-hygiene.test.js`).

## 7. Look and motion

- **Tokens** live in `css/variables.css`. Paper ageing is one number, `--age`
  (Fresh 0.3, **Aged 1 — the default**, Rustic 1.5, dark 0.55), that scales
  every stain, foxing spot, vignette and fold. `--rust`/`--tea` are the oxidised
  end of the palette.
- **Motion** uses transform and opacity only, hover effects sit behind
  `(hover: hover)`, and everything stops under `prefers-reduced-motion` *and* the
  site's own Reduce-motion toggle (`html[data-reduce-motion="on"]`).
- **Progressive enhancement:** section entrances use CSS scroll-driven animation
  and page changes use cross-document view transitions. A browser without them
  shows the page.
- **Touch:** controls are ≥ 44 px on phones and touch screens.

## 8. Deployment

`.github/workflows/deploy.yml`: on pull requests, lint + format + tests. On a push
to `main`, the same, then stage only the files Pages serves into `_site/`
(`css js pages assets diagrams`, the processed archive, `duplicates.json`),
generate the sitemap for that host, and deploy. The submodule is checked out
recursively; the deploy fails loudly if it is missing.

## 9. Known limits

- The archive submodule is a separate repository; this repo records only the
  pinned commit. Hiding a photo is done with the manifest, not by deleting it.
- A 71 MB chess-finals video exceeds GitHub's 50 MB recommendation (under the
  100 MB hard limit).
- Third-party iframes (YouTube, Maps) emit their own console noise.
- The Calendar key is referrer-restricted: requests from `localhost` get a 403.
  Test the calendar by intercepting the API (see `calendar-component.test.js`).
