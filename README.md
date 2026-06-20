# Student Activity Council — IISER Kolkata

Official website of the **Student Activity Council (SAC)** at IISER Kolkata.
Pure static HTML, CSS, and JavaScript — **no build step, no framework, no
runtime dependency** beyond a modern browser.

---

## What this is

A static site that showcases the ten cultural clubs under the SAC umbrella at
IISER Kolkata. Every image and club document is served from a git submodule
(`public/assets/`) and described by a canonical `assets_map.jsonl` that the
website fetches at runtime to render club pages, event timelines, and the
gallery.

The website is built around `assets_map.jsonl` as the single source of truth.
Regenerate that file (see *Regenerating the asset map* below) and the website
re-renders against the new data.

## Folder structure

```
SAC_Website/
├── index.html              ← landing page (at repo root, served at /)
├── pages/                  ← all other HTML pages
│   ├── about.html
│   ├── clubs.html          ← all-clubs grid
│   ├── club.html           ← single template; uses ?id=<slug>
│   ├── events.html
│   └── gallery.html
├── css/
│   ├── reset.css           ← minimal modern reset
│   ├── variables.css       ← theme tokens (colors, spacing, typography)
│   ├── main.css            ← base layout, typography, utility classes
│   ├── components.css      ← navbar, club-card, thumb, footer, stat-grid
│   └── pages/              ← per-page stylesheets
├── js/
│   ├── config.js           ← site title, NAV_ITEMS
│   ├── main.js             ← entry: renders nav + footer, dispatches by page
│   ├── data.js             ← loads + indexes assets_map.jsonl
│   ├── components/
│   │   ├── navbar.js
│   │   └── footer.js
│   ├── pages/
│   │   ├── home.js
│   │   ├── clubs.js
│   │   ├── club.js         ← individual club template
│   │   ├── events.js
│   │   └── gallery.js
│   └── utils/
│       └── dom.js          ← $, el(), onReady, isInPagesDir(), pageUrl()
├── public/
│   └── assets/             ← git submodule (SAC_website_assets)
│       └── processed/
│           ├── <10 clubs>/     ← website-ready WebP images + markdown
│           └── assets_map.jsonl ← canonical index (single source of truth)
└── utils/
    └── pretext/            ← git submodule (chenglou/pretext)
```

## How a page is loaded

1. `index.html` (or one of the files in `pages/`) is served by GitHub Pages.
2. The HTML includes a placeholder for the navbar (`<nav id="navbar">`) and
   the footer (`<div id="footer">`), and a `<main>` with a content mount
   element (e.g. `<section id="clubs-grid">`).
3. `<script type="module" src="js/main.js">` is the entry point.
4. `main.js`:
   - reads `body[data-page]` to know which page it's on,
   - renders the navbar and footer,
   - dispatches to the matching initialiser in `js/pages/`.
5. The page initialiser fetches `public/assets/processed/assets_map.jsonl`
   (via `js/data.js`) and renders the content into the mount element.

## How URLs are handled (no build step, no `<base>` tag)

The site uses **pure relative URLs everywhere** — no `<base href="…">`, no
absolute paths. A small helper in `js/utils/dom.js`:

```js
import { pageUrl } from "./utils/dom.js";
pageUrl("pages/clubs.html");
// from /index.html        → "pages/clubs.html"
// from /pages/about.html  → "../pages/clubs.html"
```

is used by `components/navbar.js`, `pages/home.js`, `pages/clubs.js`, and
`pages/club.js` so that links and `fetch()` calls resolve correctly from any
page depth.

Image and markdown URLs that the site puts in `<img src>` and `fetch()` come
straight from the `public_url` field in `assets_map.jsonl`, which is already
an absolute path (with the deploy prefix baked in by the generator).

## Local development

The site is pure static, so any HTTP server works. The simplest options:

```bash
# From the repo root:
python3 -m http.server 8000 --directory .

# Then open:
#   http://localhost:8000/                         ← index.html
#   http://localhost:8000/pages/about.html
#   http://localhost:8000/pages/club.html?id=AARSHI_-_Drama_Club
```

**Note on submodule paths:** the website uses `fetch()` to load
`public/assets/processed/assets_map.jsonl`. When serving from the repo root,
this resolves to `http://localhost:8000/public/assets/processed/assets_map.jsonl`,
which is correct.

ES modules (`<script type="module">`) require an HTTP server — they will
**not** work over `file://`. Use one of the commands above.

## Deployment (GitHub Pages)

The site is configured for GitHub Pages at **`/SAC_Website/`** (the default
for project pages on `github.com/<user>/SAC_Website`):

1. Push to `main`.
2. In the repo's GitHub settings, enable Pages: source = `main`, root.
3. Visit `https://<user>.github.io/SAC_Website/`.

The `public_url` field in `assets_map.jsonl` already encodes `/SAC_Website/`
as the deploy path, so the website works out of the box on this default
hosting setup.

### Custom domain / different subpath

If you ever deploy under a different path (custom domain, organisation page,
etc.), regenerate the asset map with the new base:

```bash
cd public/assets/tools
uv sync
sac-assets-map --site-base /your/new/path/
```

Then commit the new `processed/assets_map.jsonl` inside the
`public/assets` submodule.

## Regenerating the asset map

The `assets_map.jsonl` is the canonical index that drives the website. To
regenerate it (e.g. after the assets submodule updates):

```bash
cd public/assets
git pull                            # get the latest assets
uv sync                             # if not already done
sac-assets-map                      # writes processed/assets_map.jsonl
git add processed/assets_map.jsonl
git commit -m "..."
git push
```

The `sac-assets-map` tool lives in the submodule's `tools/` and is a thin
wrapper around `python3 -m generate_assets_map`.

## Conventions

- **HTML:** minimal, semantic, with placeholders for JS-rendered content
  (navbar, footer, page-specific mounts). Each page has `data-page="<id>"`
  on `<body>` to drive the JS dispatch.
- **CSS:** layered — reset → variables → main → components → per-page.
  Theme via CSS custom properties in `css/variables.css`. Dark mode is
  automatic via `prefers-color-scheme`.
- **JS:** ES modules natively, no bundler, no transpilation. Each page
  initialiser is in `js/pages/<page>.js` and exports an `init<Page>()`.
  Shared helpers live in `js/utils/dom.js`. Data fetching lives in
  `js/data.js`.
- **No build step.** What you write is what ships.

## License

The website source (HTML/CSS/JS) is part of the SAC_Website repo. Assets in
`public/assets/` belong to their respective owners and clubs; see the
`SAC_website_assets` repository for asset licensing.
