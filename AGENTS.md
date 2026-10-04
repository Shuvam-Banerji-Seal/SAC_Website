# AGENTS.md — working in this repository

The official website of the **Student Activity Council (SAC), IISER Kolkata**: a
newspaper-themed **static** site (HTML, CSS, ES modules) on GitHub Pages. No
bundler, no runtime dependencies. `npm` is for tests, lint and small generators.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it fits together and
why. This file is the operating manual.

---

## Rules that are not negotiable

1. **Commit as the repository owner, and only as them.** Use the git identity that
   is already configured (`git var GIT_AUTHOR_IDENT`). Never set a bot name or email
   (earlier sessions committed as "SAC Deploy Bot"), never pass `-c user.*` or
   `--author`, and **never add a `Co-Authored-By:` trailer** — it adds a second
   contributor on GitHub.
2. **Never delete from the archive.** `public/assets` is a separate repository.
   Hide an image with the manifest (`public/duplicates.json`), don't remove the file.
3. **No force-push, history rewrite, or deploy without being asked.** A push to
   `main` deploys to production. Work on a branch; open a PR; say what you did.
4. **Tests, lint and format must pass** before a commit: `npm run check`.
5. **Don't hand-edit generated blocks** (see "Generated files"). Run the generator.
6. **Leave the owner's untracked files alone** (e.g. loose screenshots in the root).

## Commands

```bash
npm install                     # tooling only; the site itself needs nothing
npm run serve                   # http-server on :8000 (use another port if 8000 is taken)
npm run check                   # lint + prettier + generated-files check + all tests (what CI runs)
npm test                        # vitest only        npm run test:watch · test:coverage
npm run lint:fix · npm run format

npm run sync                    # regenerate generated page blocks (preloads, club breadcrumb/pager, home finder) + sw shell list
npm run sitemap                 # regenerate sitemap.xml / robots.txt (CI does this per host)
npm run dedupe:people           # recompile tools/dedupe/same_person.json -> public/duplicates.json
npm run build:pretext           # only if the utils/pretext submodule changes
```

Submodules: `git submodule update --init --recursive` (SSH URLs; CI uses the token).
`public/assets` is ~6 GB — `git fetch` inside it is slow; run it in the background.

## Repository map

```
index.html, pages/*.html   38 pages. body[data-page] picks the page script; club pages add data-club-slug.
js/
  main.js                  entry for every page (shell + one dynamic page import)
  data.js                  loads assets_map.jsonl, applies duplicates.json, indexes clubs
  config.js                site constants, nav, API keys (referrer-restricted)
  loader.js, preloader.js  the entrance (once per tab session); preloader is a classic script
  components/              navbar (folded-sheet nav), footer, settings, viewer, calendar, section-nav,
                           club-extras, campus-book/board, sac-diagram, council-facts, back-to-top,
                           reading-progress, club-spotlight (home "club of the day");
                           search-launcher (in the shell: "/" and Ctrl/⌘ K) and
                           search (the palette — loaded, with css/search.css, on first use)
  data/clubs.js            the club registry: slug, page, body, name, interests, keywords, crest, theme
  pages/                   home, clubs, club-page, club-images, events, gallery, campus-life
  utils/                   dom (el, pageUrl, assetUrl, loadStylesheet), calendar(+model), search-index,
                           club-filter, caption, thumb, media, reveal, skeleton, view-pref, calligraphy, music,
                           youtube, tenure, text-measure
  pretext/                 vendored text-measurement library (built from the submodule; don't edit)
css/                       preloader, reset, variables (tokens), main, components, loader, settings,
                           viewer, enhancements (last layer), print, search (loaded on demand),
                           pages/{home,clubs,club,club-themes,events,gallery,about,calendar}.css
tools/                     sync-pages.mjs · gen-sitemap.mjs · dedupe/ (Python, Pillow+numpy)
test/unit/                 48 files, ~800 tests (vitest + jsdom); setup in test/setup.js
assets/                    site images (hero, paper textures), logos/ (crests), motifs/ (one line drawing per club)
public/assets/             SUBMODULE: images, docs, video, assets_map.jsonl
public/duplicates.json     ids the site hides (generated + curated)
utils/pretext/             SUBMODULE (chenglou/pretext)
docs/                      ARCHITECTURE.md, new-design.md, research notes (docs/README.md)
sw.js                      service worker (code network-first, media stale-while-revalidate)
.github/workflows/         deploy.yml — test on PR/push, deploy on main
```

## Conventions

- **Vanilla ES modules.** No frameworks, no new runtime dependencies. Build DOM with
  `el(tag, attrs, ...children)` from `js/utils/dom.js`. Use `pageUrl()`/`assetUrl()`
  for paths — pages live at two depths.
- **Style:** Prettier (100 cols, double quotes, ES5 trailing commas); ESLint flat
  config. CSS uses tokens from `variables.css`; square corners, hard offset shadows,
  mono small-caps for labels. New colours go in `variables.css` with a dark value.
- **Comments say why.** The code is full of "this fixed bug X on date Y" — keep that
  habit; it is how the next person avoids undoing a fix.
- **Motion:** transform/opacity only; gate hover behind `(hover: hover)`; honour both
  `prefers-reduced-motion` and `html[data-reduce-motion="on"]`.
- **Touch targets ≥ 44 px** on phones. **Contrast:** ink on every light paper must
  meet AA (`contrast.test.js` reads the real CSS).
- **A test with the fix.** Prefer tests of structure and behaviour over byte counts.
  When a measured problem is fixed, write down the number in the commit message.

## Generated files — change the source, run the tool

| File / block | Source | Command |
|---|---|---|
| `<!-- preload:start … preload:end -->` in every page head | the import graph of `js/main.js` + the page's module (`PAGE_MODULES` in the tool) | `npm run sync` |
| `<!-- club-crumbs … -->` and `<!-- club-pager … -->` on the 32 club pages | the club registry, `js/data/clubs.js` | `npm run sync` |
| `data-motif data-band data-bullet data-frame data-type` on each club page's `<body>`, and its `club-themes.css` link | `THEMES` in the registry | `npm run sync` |
| `<!-- home-finder … -->` in `index.html` ("What are you into?" chips + the spotlight's mount) and `<!-- clubs-filter … -->` in `pages/clubs.html` (the interest filter row) | `INTERESTS` and the listed clubs in the registry | `npm run sync` |
| `SHELL` list in `sw.js` | same graph + shared CSS | `npm run sync` |
| `sitemap.xml`, `robots.txt` | page list + git dates + **host** | `npm run sitemap` (CI regenerates per host) |
| `public/duplicates.json` | `tools/dedupe/*` | see `tools/dedupe/README.md` |

`npm run sync:check` (part of `check`) fails if any are stale.

## Recipes

**Add a club.** (1) Create `pages/<slug>.html` from a sibling; set
`<body class="has-topbar" data-page="club" data-club-slug="<Archive_Folder_Slug>">`;
keep the `.section-nav--slot` before the first section. (2) Add one row to `CLUBS` in
`js/data/clubs.js` (page, body, name, short name, interests, search keywords) — the
directory, footer, pager, search, interest filter and the home chips' counts all read it. Give it `keywords` people would
actually type ("telescope" finds the astronomy club); `search-index.test.js` fails if a club cannot
be found by its own name. (3) Give it a look: a row in `THEMES` (motif, band, bullet, frame, type,
desk, tag, stamp), a drawing `assets/motifs/<motif>.svg` (240×240, stroke only, ~2 KB — draw it, then
preview it as a mask), and a `body[data-motif="…"]` block in `css/pages/club-themes.css` with an ink
that passes AA on light and dark papers (`--club-ink`, `--club-ink-dark`) and `--club-art`.
(4) `npm run sync` (writes its breadcrumb, "more clubs" and `<body data-…>` attributes, and the
preload blocks) and `npm run sitemap`. (5) `npm test` — `club-registry.test.js`, `club-pages.test.js`
and `club-themes.test.js` name whatever you missed.

**Add a stylesheet or script only some visitors need** (a palette, a calendar). Don't link it from
pages: load it on first use, `loadStylesheet("css/<name>.css")` from `utils/dom.js` plus a dynamic
`import()`. The search palette is the model (`search-launcher.js` in the shell, `search.js` on demand).

**Add a script to every page's critical path.** Don't. Import it dynamically from the
page module or from `whenIdle()` in `main.js`. `load-budget.test.js` caps the shell.

**Add a stylesheet.** Link it on every page that needs it, *after* `components.css`
and *before* `enhancements.css`. Core sheets must be on all 38 pages (`page-shell.test.js`).

**Hide a duplicate photo.** Same photo twice → regenerate with the fingerprint tools.
Different frames of one *person* → add a group to `tools/dedupe/same_person.json`, then
`npm run dedupe:people`. If unsure two portraits are the same person, keep both.

**Change the hero.** `assets/hero-people.webp` is pinned on purpose (it used to rotate by
calendar month). Re-export all four sizes (480/800/1100/1400), update the width/height in
`index.html`, and keep share images absolute (`hero.test.js` checks all of this).

**Touch the caches.** Bump `CACHE_NAME` in `sw.js` **and** `CACHE_VERSION` in
`js/data.js` together (a test enforces equality) whenever cached JSON or the shell changes.

## Checking your work in a browser

- Serve on a free port (`npx http-server . -p 8123 -c-1`); the Playwright MCP can drive it.
- **Clear state between runs:** `sessionStorage` (the map cache is keyed by version and
  lives 10 minutes) and, on https, the service worker. Stale caches have produced false
  bug reports more than once.
- `localhost` can't call the Calendar API (referrer-restricted → 403). Intercept
  `https://www.googleapis.com/calendar/**` with `page.route` to test both modes.
- `http-server` doesn't gzip, so local byte counts overstate the live site (the 2 MB map
  is ~100 KB on Pages). Throttle (1.6 Mbps, 150 ms, 4× CPU) when judging load time.
- Measure layout shift with a `PerformanceObserver` for `layout-shift`; expect ≈ 0.
  Use a **fresh browser context per measurement** (`browser.newContext()`) and one observer:
  every `page.addInitScript` stacks for the life of the page, so a second run in the same
  context counts each shift twice (a phantom 0.40 became 1.30 → 1.74 → 2.03 once). Land on an
  anchor (`index.html#finder-title`) to measure what fills in while it is on screen, and scroll
  at human pace to measure lazy sections — a 120 ms scroll loop loads the calendar mid-jump.
- To check a change against `main`, serve a throwaway `git worktree` on another port; don't
  `pkill -f` by command text (it matches your own shell) — find the PID with `ss -ltnp`.
- Lighthouse (mobile) should stay 100 / 100 / 100 on home, clubs and a club page.

## Gotchas

- **Two Pages hosts**, different casing: `shuvam-banerji-seal.github.io/SAC_Website/` and
  `slashdot-iiserk.github.io/SAC_website/`. Never hard-code either in a page-level path.
- `assets_map.jsonl` ids shift when the map is regenerated; always pair ids with paths.
- Hover/animation CSS on `.thumb` must keep `opacity` in its `transition` list or the
  reveal fade breaks (a specificity side-effect we already hit once).
- The Calendar currently returns **no titles** (free/busy sharing). That is a sharing
  setting, not a bug in the code. See `docs/ARCHITECTURE.md` §5.
- Don't test the splash by reloading: it plays once per tab session
  (`sessionStorage["sac-splash"]`).

## Known limits

See `docs/ARCHITECTURE.md` §10.
