# Student Activity Council — IISER Kolkata

Official website of the **Student Activity Council (SAC)** at IISER Kolkata.
A newspaper-themed static site with 3D paper-fold animations, calligraphy text
reveal, pretext-based text measurement, and dynamic textures.

---

## What this is

A static site that showcases the cultural clubs, academic bodies, hostel
committee, and sports societies under the SAC umbrella at IISER Kolkata.
Every image and club document is served from a git submodule (`public/assets/`)
and described by a canonical `assets_map.jsonl` that the website fetches at
runtime to render club pages, event timelines, and the gallery.

## Features

- **Newspaper theme** — paper textures, ink colors, serif fonts, fold creases
- **Pre-loader** — 0-100% progress bar that pre-caches assets before the main loader
- **3D paper-fold animations** — masthead page-turn, body section fold reveal, card hover lift
- **Notice board effects** — nail/pin decorations, crooked cards, postmark stamps
- **Calligraphy text reveal** — headline appears as if being written, letter by letter
- **Sound effects** — paper scratching on scroll, printing press sounds (Web Audio API)
- **8 texture presets** — Fresh, Aged, Rustic, Notice Board, Dark, Kraft, Parchment, Slate
- **6 font presets** — Newspaper, Modern, Typewriter, Gothic, Classical, Monospace
- **Dark mode** — consistent across all pages, respects `prefers-color-scheme`
- **Pretext integration** — canvas-based text measurement for dynamic column layout
- **Service Worker** — stale-while-revalidate caching for fast subsequent loads
- **Responsive** — works on desktop, tablet, and mobile

## Folder structure

```
SAC_Website/
├── index.html              ← landing page with pre-loader + main loader
├── pages/                  ← all other HTML pages
│   ├── about.html
│   ├── clubs.html          ← all-clubs grid
│   ├── club.html           ← single template; uses ?id=<slug>
│   ├── events.html
│   └── gallery.html
├── css/
│   ├── preloader.css       ← pre-loader progress bar
│   ├── reset.css           ← minimal modern reset
│   ├── variables.css       ← theme tokens + 8 texture presets + dark mode
│   ├── main.css            ← base layout, typography, entrance animations
│   ├── components.css      ← navbar, club-card, thumb, footer, stat-grid
│   ├── settings.css        ← settings panel (dark mode, font, texture)
│   ├── viewer.css          ← image viewer/lightbox
│   ├── loader.css          ← newspaper ink loader animation
│   └── pages/              ← per-page stylesheets
├── js/
│   ├── preloader.js        ← asset pre-fetcher (plain script, no ES module)
│   ├── main.js             ← entry: renders nav + footer, dispatches by page
│   ├── config.js           ← site title, NAV_ITEMS
│   ├── data.js             ← loads + indexes assets_map.jsonl
│   ├── loader.js           ← newspaper ink loader animation
│   ├── pretext/            ← built pretext dist (text measurement library)
│   ├── components/
│   │   ├── navbar.js
│   │   ├── navbar-fold.js
│   │   ├── footer.js
│   │   ├── settings.js     ← dark mode, font, texture picker
│   │   └── viewer.js       ← image lightbox
│   ├── pages/
│   │   ├── home.js         ← landing page with calligraphy + paper fold
│   │   ├── clubs.js
│   │   ├── club.js         ← individual club template
│   │   ├── events.js
│   │   └── gallery.js
│   └── utils/
│       ├── dom.js          ← $, el(), onReady, pageUrl()
│       ├── text-measure.js ← pretext wrapper for text measurement
│       └── calligraphy.js  ← text reveal animation + sound effects
├── test/
│   ├── setup.js            ← global test setup (jsdom, mocks)
│   └── unit/
│       ├── dom.test.js
│       ├── data.test.js
│       ├── settings.test.js
│       ├── home-excerpt.test.js
│       ├── text-measure.test.js
│       ├── calligraphy.test.js
│       ├── preloader.test.js
│       └── config.test.js
├── package.json            ← npm scripts, dependencies, devDependencies
├── vitest.config.js        ← test configuration
├── eslint.config.js        ← linting rules
├── .prettierrc.json        ← code formatting
├── sw.js                   ← Service Worker (stale-while-revalidate)
├── public/
│   └── assets/             ← git submodule (SAC_website_assets)
│       └── processed/
│           ├── <clubs>/    ← website-ready WebP images + markdown
│           └── assets_map.jsonl ← canonical index
└── utils/
    └── pretext/            ← git submodule (chenglou/pretext)
```

## Development

### Prerequisites

- Node.js 18+ (for testing and tooling)
- A modern browser (the site itself is pure static HTML/CSS/JS)

### Setup

```bash
# Install dev dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format code
npm run format

# Security audit
npm audit

# Start a local dev server
npm run serve
# Then open http://localhost:8000/
```

### Building pretext

The pretext library (text measurement) is a git submodule. To rebuild it:

```bash
npm run build:pretext
```

This installs pretext's dependencies, compiles the TypeScript, and copies the
built files to `js/pretext/`.

## Testing

The project uses **Vitest** with **jsdom** for unit testing. Tests are in
`test/unit/` and cover:

- DOM utilities (`el()`, `$()`, `pageUrl()`, `isInPagesDir()`)
- Data indexing (`indexByClub()`, `pickLogo()`, `getClubEntries()`)
- Settings panel (dark mode, font selection, texture selection)
- Excerpt extraction from markdown
- Pretext text measurement wrapper
- Calligraphy animation
- Pre-loader

```bash
npm test          # run all tests
npm run test:coverage  # with coverage report
```

## CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs:

1. **Test job**: lint, format check, security audit, unit tests, coverage upload
2. **Deploy job** (main branch only): verify critical paths, deploy to GitHub Pages

## Deployment

The site is configured for GitHub Pages at **`/SAC_Website/`**:

1. Push to `main`
2. CI/CD pipeline runs tests
3. If tests pass, the site is deployed to GitHub Pages
4. Visit `https://<user>.github.io/SAC_Website/`

## SAC Bodies

The website organizes clubs into 5 SAC bodies:

| Body      | Section     | Description                                            |
| --------- | ----------- | ------------------------------------------------------ |
| Council   | Preface     | SAC General Secretary, Joint Secretary, and officers   |
| Academics | Section I   | Academic initiatives, placement cell, talks            |
| Hostel    | Section II  | Hostel committee, residence life, welfare              |
| Sports    | Section III | Sports clubs (cricket, football, etc.) — data arriving |
| Cultural  | Section IV  | 10 cultural clubs (drama, music, dance, film, etc.)    |

## Texture Presets

| Preset       | Look                                              |
| ------------ | ------------------------------------------------- |
| Fresh        | Clean, bright, minimal texture — modern newspaper |
| Aged         | Warm, slightly yellowed — vintage paper           |
| Rustic       | Coffee-stained, heavy aging — old document        |
| Notice Board | Corkboard with brass pins — pinned postcards      |
| Dark         | Dark coffee-stain — night reading mode            |
| Kraft        | Brown kraft paper — raw packaging                 |
| Parchment    | Cream parchment — medieval manuscript             |
| Slate        | Cool blue-gray — modern dark UI                   |

## License

The website source (HTML/CSS/JS) is part of the SAC_Website repo. Assets in
`public/assets/` belong to their respective owners and clubs.
