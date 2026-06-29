# AGENTS.md — Complete Repository Guide

> **SAC_Website** — Official website of the Student Activity Council (SAC) at IISER Kolkata.
> A newspaper-themed static site with 3D paper-fold animations, calligraphy text reveals,
> dynamic textures, and synthesised audio. Served entirely via GitHub Pages — no backend,
> no build step, no runtime dependency beyond a modern browser.

---

## 1. Repository Structure (Top Level)

```
SAC_Website/
├── index.html                  # Home page (masthead, lead article, 5 body sections)
├── .github/workflows/deploy.yml # CI/CD: lint → test → verify → deploy to Pages
├── .gitmodules                 # Two submodules: public/assets (images) + utils/pretext
├── .nojekyll                   # Instructs GitHub Pages not to run Jekyll
├── .gitignore
├── .prettierrc.json
├── eslint.config.js            # ESLint flat config (2024+)
├── package.json                # Dev tooling: vitest, eslint, prettier, http-server
├── vitest.config.js            # Vitest config with jsdom environment
├── sw.js                       # Service Worker (sac-v8) — caches static assets
├── AGENTS.md                   # ← This file
├── README.md                   # Project overview and setup instructions
│
├── css/                        # 10 CSS files + 6 page-specific stylesheets
├── js/                         # 5 components + 5 page initializers + 3 utilities + loader + preloader
├── pages/                      # 16 static HTML pages (12 clubs + clubs, events, gallery, about)
├── assets/                     # 9 texture images (PNG/JPG) for paper backgrounds
├── docs/                       # 20 research documents on paper textures, animations, typography
├── diagrams/                   # Mermaid/architecture diagrams
├── test/                       # 11 test files (unit) + setup + e2e/integration/fixtures
├── public/                     # Git submodule → SAC_website_assets (429 JSONL entries)
│   └── assets/processed/       # assets_map.jsonl + WebP images + markdown docs
├── utils/                      # Git submodule → chenglou/pretext (text measurement library)
│   └── pretext/                # TypeScript source for @chenglou/pretext (v0.0.8)
└── .playwright-mcp/            # Playwright MCP session logs (console captures + page snapshots)
```

---

## 2. Git Submodules

### `public/assets` (SSH: `git@github.com:slashdot-iiserk/SAC_website_assets.git`)

- **Purpose**: Houses all processed media — images and markdown documents.
- **Key file**: `public/assets/processed/assets_map.jsonl` — the canonical 429-entry metadata file.
- **CI requirement**: Deploy fails if this submodule isn't checked out (`public/assets/processed/` must exist).

### `utils/pretext` (SSH: `git@github.com:chenglou/pretext.git`)

- **Purpose**: Vendored text measurement library by chenglou (MIT).
- **Uses**: Canvas-based `prepare()` + `layout()` for zero-reflow text measurement.
- **Built output**: `js/pretext/layout.js` (copied from `utils/pretext/dist/layout.js` via `npm run build:pretext`).
- **CI requirement**: Deploy verifies `js/pretext/layout.js` exists but does NOT rebuild it.

---

## 3. Entry Point — `index.html`

The home page is a single 615-line HTML file that acts as the site's landing page. Its structure:

```
index.html
├── <head>
│   ├── Meta (charset, viewport, description, SVG favicon)
│   ├── Stylesheets (10 CSS files in dependency order)
│   │   ├── css/preloader.css  (0-100% progress bar)
│   │   ├── css/reset.css      (minimal reset)
│   │   ├── css/variables.css  (design tokens, paper textures)
│   │   ├── css/main.css       (base layout, body background textures)
│   │   ├── css/components.css (navbar, footer, club cards, calligraphy)
│   │   ├── css/pages/home.css (masthead, lead article, poster cards, SAC diagram)
│   │   ├── css/loader.css     (newspaper loader animation + splash)
│   │   ├── css/settings.css   (settings panel + texture picker)
│   │   └── css/viewer.css     (lightbox overlay)
│   └── <script type="importmap"> (Three.js CDN: jsdelivr)
│
├── <body data-page="home">
│   ├── #preloader              (0-100% progress bar, managed by js/preloader.js)
│   │   └── <script src="js/preloader.js">
│   ├── #loader (z-index: 1000) (Newspaper ink loader, managed by js/loader.js)
│   │   ├── .ambient-grain
│   │   ├── #stageShell > #paperStage (newspaper elements)
│   │   ├── #status             (progress bar + club label)
│   │   ├── #inkFinale           (SVG seal, splash droplets, logo reveal)
│   │   └── .skip-btn
│   │
│   ├── <header>
│   │   ├── <nav id="navbar">  (populated by js/components/navbar.js)
│   │   └── #navbarCorner       (64×64 fold-corner button)
│   │
│   ├── <main class="home">
│   │   ├── .masthead           (newspaper title bar — Vol. 01, date, tagline)
│   │   ├── .lead-article       (featured intro with two-column body)
│   │   │   ├── h2#lead-headline (calligraphy reveal target)
│   │   │   ├── .lead-article__deck
│   │   │   ├── .lead-article__byline
│   │   │   └── .lead-article__body (3 paragraphs, column layout measured by pretext)
│   │   ├── .sac-diagram-section (inline SVG organisational chart)
│   │   └── #bodies             (5 mount points: council, academics, hostel, sports, cultural)
│   │
│   └── #footer                 (populated by js/components/footer.js)
│
└── <script type="module" src="js/main.js">  (entry point — dispatches to page init)
```

### Key text content (hardcoded in index.html):

- **Masthead subtitle**: `"A record of the clubs, councils, and communities that shape campus life"`
- **Lead headline**: `"A Campus In Print: The Work And Life Of Twelve Societies"`
- **Lead deck**: _"The Student Activity Council brings together every cultural, academic, and residential society at IISER Kolkata under a single administrative body..."_
- **Body copy**: 3 paragraphs describing the SAC ecosystem, the card-based directory, and the living-document nature of the site

---

## 4. JavaScript Architecture (14 application files)

### Entry Point

```
js/main.js
├── Imports: dom.js, navbar.js, footer.js, navbar-fold.js, settings.js, viewer.js,
│           three-fold.js, home.js, clubs.js, club-images.js, events.js, gallery.js
├── onReady() ── applies saved theme/font/texture prefs (prevents FOUC)
│            ── renderNavbar(page), renderFooter()
│            ── setupNavbarFold(), initSettings(), initViewer(), initPaperFold()
│            ── initializers[page]?.()          # Home / Clubs / Events / Gallery
│            └─ if (body[data-club-slug]) initClubImages()
└── ── register Service Worker (/SAC_Website/sw.js)
```

### Module Dependency Graph

```
main.js
├── utils/dom.js          — $, $$, el(), clear(), onReady(), pageUrl(), isInPagesDir()
│
├── config.js             — SITE_TITLE, SITE_DESCRIPTION, NAV_ITEMS (5 entries)
│
├── data.js               — loadAssetsMap(), indexByClub(), getClub(), getClubEntries()
│   └── Fetches: public/assets/processed/assets_map.jsonl (429 lines, cached Promise)
│
├── components/
│   ├── navbar.js         — renderNavbar(activePage): builds <nav class="navbar"> from NAV_ITEMS
│   ├── navbar-fold.js    — setupNavbarFold(): mobile curtain pull-down (<1024px) / desktop corner drawer (>=1024px)
│   ├── footer.js         — renderFooter(): © year + SITE_TITLE
│   ├── settings.js       — initSettings(): dark mode, 6 font presets, 8 paper textures, localStorage
│   ├── viewer.js         — initViewer(): lightbox for [data-viewer] images, prev/next/keyboard
│   └── three-fold.js     — initPaperFold(): Three.js (dynamic import), 3D paper mesh with idle/visibility pausing
│       └── Dep: three (CDN import map, not npm)
│
├── pages/
│   ├── home.js           — initHome(): 5 body sections, card grid, lead-article column calc, calligraphy
│   ├── clubs.js          — initClubs(): full grid of all clubs with logos & stats
│   ├── club-images.js    — initClubImages(): per-club image grids filtered by role
│   ├── events.js         — initEvents(): event cards with lightbox wiring
│   └── gallery.js        — initGallery(): full image gallery with category grouping
│
├── loader.js             — self-initialising: newspaper animation (12→8→5 papers by device class)
│   └── Dep: data.js, sounds via calligraphy.js (playPrintSound)
│
├── preloader.js          — plain script (not ES module): 3-phase asset warm-up
│
└── utils/
    ├── calligraphy.js    — revealText(), initScrollSounds(), sound synthesis (3 sound types)
    └── text-measure.js   — measureText() → prepare() + layout() from pretext
        └── Dep: ../pretext/layout.js (vendored)
```

### Core Data Flow

```
assets_map.jsonl (429 entries)
    │
    ▼
loadAssetsMap() ── fetch + parse JSONL → Array<AssetEntry>
    │                                          │
    ▼                                          ▼
indexByClub()                              getClubEntries(slug)
    │                                          │
    ▼                                          ▼
Array<ClubRecord>                          Filtered entries
(logo, name, markdown, counts)             (by role/type)
    │
    ├── home.js → buckets clubs → 5 body sections with paper-card grid
    ├── clubs.js → full alphabetical grid
    └── club-images.js → images by role (ob_portrait, event, iicm, etc.)
```

### 3.1 File-by-File Reference

| File                           | Lines | Imports                                                                                                   | Exports                                                                                                                                       | Purpose                                                                       |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `js/main.js`                   | 64    | dom, navbar, footer, navbar-fold, settings, viewer, three-fold, home, clubs, club-images, events, gallery | (none — runs on load)                                                                                                                         | App entry: apply prefs, render nav/footer, dispatch to page init, register SW |
| `js/config.js`                 | 31    | (none)                                                                                                    | `SITE_TITLE`, `SITE_DESCRIPTION`, `NAV_ITEMS`                                                                                                 | Site-wide constants                                                           |
| `js/data.js`                   | 139   | dom                                                                                                       | `loadAssetsMap()`, `indexByClub()`, `getClub()`, `getClubEntries()`                                                                           | JSONL fetch, club indexing, logo detection                                    |
| `js/preloader.js`              | 351   | (none — plain script)                                                                                     | (none)                                                                                                                                        | 3-phase warm-up: download → decode → compositor warm                          |
| `js/loader.js`                 | 582   | data                                                                                                      | (none — self-inits via DOMContentLoaded)                                                                                                      | Newspaper loader animation with device-class scaled timing                    |
| `js/utils/dom.js`              | 57    | (none)                                                                                                    | `$`, `$$`, `el()`, `clear()`, `onReady()`, `getQueryParam()`, `isInPagesDir()`, `pageUrl()`                                                   | Tiny DOM helpers                                                              |
| `js/utils/calligraphy.js`      | 857   | (none)                                                                                                    | `revealText()`, `revealParagraphs()`, `setSoundEnabled()`, `initScrollSounds()`, `playPaperScratch()`, `playPrintSound()`, `playPenScratch()` | Calligraphy text reveal animation + Web Audio API sound synthesis             |
| `js/utils/text-measure.js`     | 81    | `../pretext/layout.js`                                                                                    | `measureText()`, `measureBlocks()`, `getMaxHeight()`, `clearMeasureCache()`                                                                   | Canvas-based text measurement wrapper                                         |
| `js/components/navbar.js`      | 49    | dom, config                                                                                               | `renderNavbar(activePage)`                                                                                                                    | Renders primary nav                                                           |
| `js/components/navbar-fold.js` | 202   | dom                                                                                                       | `setupNavbarFold()`                                                                                                                           | Mobile curtain + desktop corner drawer                                        |
| `js/components/footer.js`      | 31    | dom, config                                                                                               | `renderFooter()`                                                                                                                              | Renders site footer                                                           |
| `js/components/settings.js`    | 380   | dom                                                                                                       | `initSettings()`                                                                                                                              | Dark mode, 6 fonts, 8 textures, persistence                                   |
| `js/components/viewer.js`      | 191   | dom                                                                                                       | `initViewer()`                                                                                                                                | Image lightbox with navigation                                                |
| `js/components/three-fold.js`  | 168   | three (dynamic import)                                                                                    | `initPaperFold()`, `destroy()`                                                                                                                | Three.js 3D paper parallax                                                    |
| `js/pages/home.js`             | 449   | dom, data, calligraphy                                                                                    | `initHome()`, `adjustLeadLayout()`, `extractExcerpt()`                                                                                        | Home page initialiser                                                         |
| `js/pages/clubs.js`            | 76    | dom, data                                                                                                 | `initClubs()`                                                                                                                                 | All-clubs overview                                                            |
| `js/pages/club-images.js`      | 141   | dom, data, calligraphy                                                                                    | `initClubImages()`                                                                                                                            | Per-club image grids                                                          |
| `js/pages/events.js`           | ~120  | dom, data, calligraphy                                                                                    | `initEvents()`                                                                                                                                | Events page                                                                   |
| `js/pages/gallery.js`          | ~80   | dom, data                                                                                                 | `initGallery()`                                                                                                                               | Full gallery                                                                  |

---

## 5. CSS Architecture (10 files + 6 page-specific)

### File Dependency Order (as loaded in index.html)

| Order | File                    | Lines | Purpose                                                               |
| ----- | ----------------------- | ----- | --------------------------------------------------------------------- |
| 1     | `css/preloader.css`     | ~80   | 0-100% progress bar styles                                            |
| 2     | `css/reset.css`         | ~60   | Minimal browser reset                                                 |
| 3     | `css/variables.css`     | 339   | Design tokens: colors, fonts, spacing, paper textures (SVG data URIs) |
| 4     | `css/main.css`          | 439   | Body backgrounds, base typography, texture stacks                     |
| 5     | `css/components.css`    | ~650  | Navbar, footer, club cards, calligraphy animations, settings panel    |
| 6     | `css/pages/home.css`    | 875   | Masthead, lead article, paper cards, body sections, fold animation    |
| 7     | `css/loader.css`        | ~890  | Loader animation, newspaper entrance, splash droplets, SAC seal       |
| 8     | `css/settings.css`      | ~80   | Settings panel layout                                                 |
| 9     | `css/viewer.css`        | 194   | Lightbox overlay, frame decorations                                   |
| —     | `css/pages/club.css`    | ~450  | Individual club page styles                                           |
| —     | `css/pages/clubs.css`   | ~80   | All-clubs overview page                                               |
| —     | `css/pages/events.css`  | ~80   | Events page                                                           |
| —     | `css/pages/gallery.css` | ~80   | Gallery page                                                          |
| —     | `css/pages/about.css`   | ~40   | About page                                                            |

### Texture System (CSS Custom Properties)

All paper textures are defined as SVG data URIs in `css/variables.css`:

- `--paper-base`/`--paper-soft`/`--paper-deep`/`--paper-edge` — color ramp
- `--paper-grain` — 320×320 SVG `feTurbulence` fractal noise
- `--paper-stains` — radial gradient stains
- `--paper-fold-crease` — 200×4 horizontal gradient
- `--paper-coffee-stain` — 160×160 SVG with feDisplacementMap
- `--paper-halftone` — 6×10 SVG dot pattern
- `--paper-edge-wear` — 320×320 radial vignette
- `--paper-texture` — repeating linear gradient (laid-paper)

9 texture presets via `[data-texture="…"]`: fresh, aged, rustic, notice, dark, kraft, parchment, slate + combined data-theme.

---

## 6. HTML Pages (16 static + 1 entry)

### Home

| File         | Content                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `index.html` | Masthead, lead article, SAC diagram SVG, 5 body section mount points, loader, preloader |

### Club Pages (12 individual)

| File                   | Club                                 |
| ---------------------- | ------------------------------------ |
| `pages/aarshi.html`    | AARSHI — Drama Club                  |
| `pages/arts.html`      | Arts Club of IISER Kolkata           |
| `pages/radio.html`     | Campus Radio IISER KOLKATA (IKCR)    |
| `pages/ikqc.html`      | IKQC — Quiz Club of IISER Kolkata    |
| `pages/literary.html`  | Literary Club of IISER Kolkata       |
| `pages/movie.html`     | Movie Club of IISER K                |
| `pages/music.html`     | Music Club of IISER K                |
| `pages/nature.html`    | Nature Club of IISER Kolkata         |
| `pages/nrutya.html`    | Nrutya — Dance Club of IISER Kolkata |
| `pages/pixel.html`     | PIXEL — Photography Club             |
| `pages/academics.html` | SAC Academics                        |
| `pages/hostel.html`    | SAC Hostel Committee                 |

Each club page includes: static HTML content, office-bearer tables, event lists, achievements, contact info, social links, and `[data-club-images]` placeholder divs populated dynamically by `club-images.js`.

### Other Pages

| File                 | Content                   |
| -------------------- | ------------------------- |
| `pages/clubs.html`   | All-clubs overview grid   |
| `pages/events.html`  | Event cards with lightbox |
| `pages/gallery.html` | Full image gallery        |
| `pages/about.html`   | About SAC                 |

---

## 7. Loader System (Two-Phase)

### Phase 1: Preloader (`js/preloader.js`)

- Plain script (not ES module), runs immediately from `<script>` in `<body>`
- **3 phases**: Download (0→70%) → Decode (70→90%) → Warm-up (90→100%)
- Downloads CSS, JS, textures into HTTP cache; decodes images via `img.decode()`/`createImageBitmap()`; warms GPU compositor with dummy 3D transform
- Safety timeout: low=8000ms, medium=6000ms, high=4000ms
- Dispatches `"preloader-done"` event with `{ tier }` detail
- Sets `window.__sacDeviceTier`

### Phase 2: Loader (`js/loader.js`)

- ES module, imported by `js/main.js` but only runs if `#loader` element exists
- Waits for preloader-done event (with tier-scaled safety timeout)
- Fetches JSONL, builds 12/8/5 newspaper cards (by device class), runs staggered entrance animation → gather → ink drop → SAC seal → fade
- Device classification: `classifyDevice()` → phone | tablet | desktop (replaces old binary `isMobile()`)
- TIMING config per device class:
  - Phone: 5 papers, 400ms stagger, 1500ms gather delay
  - Tablet: 8 papers, 320ms stagger, 1200ms gather delay
  - Desktop: all papers, 270ms stagger, 1050ms gather delay

### Device Tier Detection (`js/preloader.js`)

```javascript
function detectDeviceTier() {
  // Returns "low" | "medium" | "high"
  // Low: ≤2 cores, ≤2 GB RAM, 2g/slow-2g, or save-data
  // Medium: mobile UA, ≤4 cores, ≤4 GB RAM, or 3g
  // High: everything else
}
```

---

## 8. Audio System (`js/utils/calligraphy.js`)

All sounds are synthesized via Web Audio API — no external files. Processing chain:

```
sound source → filter → gain → dryGain ──┐
                              → reverbSend → reverb → reverbWet → compressor → destination
```

### Master Chain

- **Compressor**: DynamicsCompressorNode (threshold -20dB, ratio 3.5, knee 10)
- **Reverb**: ConvolverNode with synthesized paper-room IR (0.35s stereo noise, exponential decay)
- **Wet/Dry**: 55% reverb send, 40% reverb return wet mix

### Three Sound Types

**1. Paper Scratch** (`playPaperScratch`) — scroll sound

- 4 layers: pink noise (sweeping BP 3200→1200Hz), white noise (HP 5000Hz), square crackle clicks, sine low thud (80→40Hz)
- Volume 0.04, duration 0.14s, velocity-based in scroll handler

**2. Printing Press** (`playPrintSound`) — loader sound

- 5 layers: dual sawtooth oscillators a fifth apart (55Hz+82Hz), AM-modulated brown noise (24Hz chatter), 3 sine thuds (140→40Hz), white noise impact transient (2000Hz HP), brown noise ink burst (600Hz LP)
- Volume 0.07, played when "SAC" seal stamps

**3. Pen Scratch** (`playPenScratch`) — calligraphy sound

- Character-type-aware: uppercase (4000Hz, 0.06s, 1.2×), lowercase (6000Hz, 0.04s, 1.0×), punctuation (7000Hz, 0.025s, 0.6×), digits (5000Hz, 0.045s, 0.9×)
- White noise burst through highpass filter with randomisation

### AudioContext Lifecycle

- Created inside `unlockAudio()` which is bound to first `click`/`touchstart` (browser gesture requirement)
- `audioUnlocked` flag prevents sound calls before gesture
- All sound functions silently return if audio not unlocked

---

## 9. Animation System

### Calligraphy Text Reveal (`revealText()`)

- Wraps each character in `<span class="calligraphy-char">` with:
  - Clip-path reveal (left-to-right, CSS animation)
  - Per-character rotation wobble (`--char-wobble`, -2° to +2°)
  - Ink-bleed shadow (`<span class="calligraphy-char__bleed">`)
  - Speed multiplier: spaces (0.25×), punctuation (0.4×), lowercase (1.0×), uppercase (1.4×)
- Sounds synced via `setTimeout` per character

### Scroll Sounds (`initScrollSounds()`)

- Velocity-based volume (`0.01 + velocity * 0.002`, capped at 0.04)
- Duration scales with velocity (`0.06 + velocity * 0.003`, capped at 0.15)
- 400ms throttle between sounds
- Guarded against double-binding (`window.__sacScrollSoundsBound`)

### 3D Paper Fold (`three-fold.js`)

- Three.js `PlaneGeometry(6, 4, 16, 12)` with dark semi-transparent material
- Mouse-follow parallax: `rotation.x/y` and `position` lerped at 0.05
- Idle detection: pauses render loop after 2s no mouse movement
- Visibility API: pauses when tab hidden, restarts if within idle window
- Proper `destroy()`: disposes Three.js resources, removes listeners
- Dynamic import of Three.js from CDN (graceful failure if unavailable)

### Body Section Folding (`setupFolding()` in home.js)

- Each `.body-section` starts with `rotateX(-90deg)` (folded shut)
- IntersectionObserver adds `.is-visible` at 15% viewport entry → animates flat
- Honours `prefers-reduced-motion`

### Navbar Reveal (`navbar-fold.js`)

- **Mobile** (< 1024px): curtain pull-down, `.navbar` translates from -100% to 0 after loader hides
- **Desktop** (≥ 1024px): corner-fold side drawer, 64×64 triangular button triggers `.is-open`
- Resize watcher: switches mode across the 1024px breakpoint
- Guards against double-binding (`__sacNavbarResizeBound`, `__sacFoldBound`)

---

## 10. Service Worker (`sw.js`)

- **Cache name**: `sac-v8` (bumped on significant CSS/JS changes)
- **Install**: `skipWaiting()`, caches 34 static assets (CSS, JS, textures, sub-pages)
- **Activate**: `clients.claim()`, deletes old cache versions
- **Fetch strategy**:
  - Dynamic assets (JSONL): network-first, cache fallback
  - Static assets: stale-while-revalidate (serve from cache, update in background)
- **Note**: Individual club pages (aarshi.html, arts.html, etc.) are NOT in the static cache list — they must be added if offline support is needed for those pages.

---

## 11. Settings Panel (`js/components/settings.js`)

### Features

- **Dark mode**: light / dark / auto (follows OS)
- **Font presets** (6): Newspaper (Playfair Display), Modern (EB Garamond), Typewriter (Special Elite), Gothic (IM Fell English), Classical (Cormorant), Monospace (IBM Plex Mono)
- **Paper textures** (8): Fresh, Aged, Rustic, Notice Board, Dark, Kraft, Parchment, Slate
- **Persistence**: localStorage key `sac-site-prefs` (JSON)
- **FOUC prevention**: `main.js` reads localStorage before rendering

### Google Fonts

- Loaded lazily (only when selected, not on page load)
- Preloaded after first render via `preloadFonts()` for instant switching

---

## 12. Viewer / Lightbox (`js/components/viewer.js`)

- Triggered by `data-viewer="groupname"` attribute on `<img>` elements
- Groups images by `data-viewer` value for prev/next navigation
- Keyboard support: Escape (close), ArrowLeft (prev), ArrowRight (next)
- Paper-themed frame: `viewer-frame__backing` + 4 corner decorations
- `will-change: transform` applied to frame while open, removed on close
- `backdrop-filter: blur(4px)` on overlay (with `-webkit-` prefix)

---

## 13. Pretext Text Measurement (`js/utils/text-measure.js`)

- **Library**: `@chenglou/pretext` v0.0.8 (vendored submodule at `utils/pretext/`)
- **Built output**: `js/pretext/layout.js` (7 companion files in `js/pretext/`)
- **Only consumer**: `home.js` → `adjustLeadLayout()` — measures lead-article body height to decide 1-vs-2 column layout
- **API**: `measureText(text, font, maxWidth, lineHeight)` → `{ height, lineCount }`
- **Caching**: Internal Map keyed by `text|font` string
- **Graceful degradation**: Dynamic import catches errors; CSS default (2 columns) preserved on failure
- **Build**: `npm run build:pretext` compiles TypeScript submodule and copies dist to `js/pretext/`

---

## 14. CI/CD Pipeline (`.github/workflows/deploy.yml`)

### Jobs

**1. test** (ubuntu-latest, 10min timeout):

```
checkout (recursive submodules) → setup Node 20 → npm ci → eslint → prettier check
→ npm audit → vitest run → upload coverage artifact
```

**2. deploy** (needs: test, only on main push):

```
checkout → verify critical paths (index.html, css/, js/, pages/, public/assets/,
  assets_map.jsonl, .nojekyll, js/pretext/layout.js)
  → configure-pages → upload artifact → deploy-pages
```

---

## 15. Test Suite (11 files, 96 tests)

| Test File                               | Tests | What It Tests                                                                                                         |
| --------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `test/unit/calligraphy.test.js`         | 6     | `revealText()`, `extractExcerpt()`, `initScrollSounds()` guard                                                        |
| `test/unit/config.test.js`              | 3     | `NAV_ITEMS` structure, URL formatting                                                                                 |
| `test/unit/css-fixes.test.js`           | 10    | `background-attachment` override, aspect ratio, `backdrop-filter` prefix, `--paper-edge-wear`, `build:pretext` script |
| `test/unit/data.test.js`                | 6     | `loadAssetsMap()`, `indexByClub()`, `getClub()`, `getClubEntries()`, logo fallbacks                                   |
| `test/unit/dom.test.js`                 | 9     | `el()`, `clear()`, `pageUrl()`, `isInPagesDir()`, `onReady()`                                                         |
| `test/unit/home-excerpt.test.js`        | 8     | `extractExcerpt()` with markdown, tables, headings, ALL-CAPS labels                                                   |
| `test/unit/loader.test.js`              | 25    | `classifyDevice()`, TIMING config, safety timeout, gather unification, splash params                                  |
| `test/unit/preloader.test.js`           | 6     | Preloader DOM structure, `is-done` class, `preloader-done` event                                                      |
| `test/unit/pretext-integration.test.js` | 9     | Real `prepare()` + `layout()` (not mocked), CJK, empty text, `clearCache()`, wrapper                                  |
| `test/unit/settings.test.js`            | 8     | Settings panel render, font/texture pickers, localStorage persistence                                                 |
| `test/unit/text-measure.test.js`        | 6     | `measureText()`, caching, invalid input guards, `clearMeasureCache()`                                                 |

### Test Infrastructure

- **Runner**: Vitest v4.1.9
- **Environment**: jsdom (with mocks for IntersectionObserver, ResizeObserver, matchMedia, fonts, serviceWorker, caches API, OffscreenCanvas)
- **Setup**: `test/setup.js` — global mocks + helpers (`setupPage()`, `flushPromises()`)
- **Config**: `vitest.config.js` — coverage thresholds 40/30/35/40, excludes `js/pretext/` and `js/config.js`
- **E2E**: `test/e2e/` (empty — Playwright MCP used for manual verification instead)

---

## 16. Assets (`public/assets/` Submodule + `assets/` Directory)

### `public/assets/processed/` (Git submodule — 429 entries)

The `assets_map.jsonl` is a newline-delimited JSON file with 429 records:

- 345 WebP images + 84 markdown documents
- 32 fields per record: path, public_url, filename, width, height, orientation, club, club_name, is_logo, is_markdown_content, is_ob_portrait, is_extracted_from_doc, is_event, is_iicm, role, file_type, mime, tenure, year, person, ob_role, tags, title, description, taken_at, venue, competition, alt_text, copyright, credit, parent_path, original_filename

### Image Roles

| Role        | Purpose                          | Count |
| ----------- | -------------------------------- | ----- |
| ob_portrait | Office-bearer portrait           | 50+   |
| logo        | Club logo                        | ~12   |
| event       | Event photography                | ~80   |
| iicm        | Inter-IISER Cultural Meet        | ~40   |
| equipment   | Equipment photos                 | ~20   |
| portfolio   | Portfolio/work samples           | ~30   |
| outer-fest  | External festival coverage       | ~15   |
| other       | Club documents, extracted images | ~180  |

### `assets/` Directory (9 texture images at repo root)

| File                 | Dimensions | Used In                                |
| -------------------- | ---------- | -------------------------------------- |
| `natural-paper.png`  | 523×384    | Body background (main.css)             |
| `newspaper-bg.jpg`   | 800×533    | `.lead-article::after`, `.body-banner` |
| `old-paper.jpg`      | 800×1200   | `.sac-diagram-wrap`                    |
| `paper.png`          | 500×593    | Settings preview only                  |
| `rice-paper.png`     | 485×485    | Settings preview only                  |
| `paper-fibers.png`   | 410×410    | Settings preview / docs                |
| `groovepaper.png`    | 300×300    | Settings preview only                  |
| `old-wall.png`       | 300×300    | Settings preview only                  |
| `stressed-linen.png` | 256×256    | Settings preview only                  |

---

## 17. Key Bug Fix History

| #   | Bug                                                                      | Fix                                                                       | File                                     |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Tablet loader — binary isMobile() misclassified iPad/Android tablet      | `classifyDevice()` → phone/tablet/desktop with TIMING config              | `js/loader.js`                           |
| 2   | Safety timeout race — loader waited 5000ms but preloader can take 8000ms | Tier-scaled: low=10000, medium=8000, high=6000                            | `js/loader.js`                           |
| 3   | Device tier too aggressive — cores<=4→low, cores<=8→medium               | Low: ≤2 cores, Medium: isMobileUA\|≤4 cores                               | `js/preloader.js`                        |
| 4   | `background-attachment:fixed` on .masthead breaks on iOS                 | `@media (hover:none) and (pointer:coarse)` override                       | `css/main.css`, `css/pages/home.css`     |
| 5   | natural-paper.png 523×384 tiled at 400×400 — distortion                  | Changed to `400px auto`                                                   | `css/main.css`                           |
| 6   | backdrop-filter missing -webkit- prefix                                  | Added `-webkit-backdrop-filter`                                           | `css/viewer.css`                         |
| 7   | build:pretext script fragile (used `;` not `&&`)                         | Changed `;` to `&&`, removed `2>/dev/null`                                | `package.json`                           |
| 8   | `--paper-edge-wear` dead — defined only in dark theme                    | Added to `:root` with light colors                                        | `css/variables.css`                      |
| 9   | Audio system — no reverb, mono, basic envelopes                          | Added ConvolverNode reverb, compressor, ADSR, char-type-aware pen scratch | `js/utils/calligraphy.js`                |
| 10  | Poster click-fold animation glitch                                       | Removed `.is-folding` click handler; hover-only                           | `js/pages/home.js`, `css/pages/home.css` |

---

## 18. Known Limitations

1. **No DPR handling for raster textures**: `natural-paper.png`, `newspaper-bg.jpg`, `old-paper.jpg` lack @2x variants — blurry on retina displays. Fix requires generating @2x images and using `image-set()` in CSS.
2. **Individual club pages not in SW cache**: The Service Worker cache list (`sw.js:12-68`) doesn't include the 12 individual club pages (aarshi.html through hostel.html). Offline navigation to club pages won't work.
3. **Submodule SSH URLs**: Both submodules use SSH URLs which fail in CI environments without SSH keys. CI works because checkout uses `GITHUB_TOKEN` credentials. Local clone requires SSH setup.
4. **Pretext tests mock the library**: `text-measure.test.js` mocks `prepare`/`layout`. The real integration test (`pretext-integration.test.js`) provides coverage but requires jsdom canvas mock.
5. **No E2E test suite**: `test/e2e/` directory exists but is empty. Playwright MCP is used for manual verification.
6. **Pretext bundle is oversized**: Only `prepare()` and `layout()` are used, but the entire library (7 files, 4k+ lines) is shipped including unused rich-inline, bidi, and line-text machinery.

---

## 19. Local Development

```bash
# Prerequisites
node >= 18.0.0
git with SSH keys (for submodules)

# Clone with submodules
git clone --recurse-submodules git@github.com:Shuvam-Banerji-Seal/SAC_Website.git
cd SAC_Website

# Install dependencies (testing/lint tooling only — not needed for the site)
npm install

# Run tests
npm test                # vitest (all unit tests)
npm run test:watch      # vitest watch mode
npm run test:coverage   # with coverage report

# Lint & format
npm run lint
npm run format:check
npm run lint:fix        # auto-fix
npm run format          # auto-format

# Audit
npm audit

# Serve locally
npm run serve           # http-server on port 8000

# Build pretext (only if utils/pretext submodule is updated)
npm run build:pretext

# Deploy (CI handles this — but manual push triggers it)
git push origin main
```

---

## 20. Deployment

- **Platform**: GitHub Pages
- **URL**: `https://shuvam-banerji-seal.github.io/SAC_Website/`
- **Trigger**: Push to `main` branch → GitHub Actions → Deploy
- **CDN propagation**: ~60-90s after deploy completes
- **Cache**: Service Worker caches at `sac-v8`; clients need hard refresh to pick up new SW
- **No build step**: The site is pure static — what you see in the repo is what's served

---

_Generated by deep audit of the repository. Last updated: June 2026._
_Repository: https://github.com/Shuvam-Banerji-Seal/SAC_Website_
