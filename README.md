# Student Activity Council — IISER Kolkata

Official website of the **Student Activity Council (SAC)** at IISER Kolkata: a
newspaper-themed static site for the Council's clubs, committees, events and
campus life. Pure HTML, CSS and ES modules — served as-is by GitHub Pages, with no
build step and no runtime dependencies.

> Contributors and AI agents: start with [`AGENTS.md`](AGENTS.md) (rules, commands,
> recipes) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (how it fits together).

## What's on the site

- **Home** — masthead, the Council's group photograph, the lead story, the
  organisational chart, the _Campus Book_ (a flip-through album), the _Campus Board_
  (pinned postcards), a picture desk, latest videos and **The SAC Calendar**.
- **Clubs** — every club and committee in five bodies (Academics, Cultural, Food &
  Hygiene, Hostel, Sports), with a sticky jump bar and search.
- **Search** — press `/` (or Ctrl/⌘ K, or the sidebar's Search button) to find any club or
  page by name, by what it does ("telescope"), or by what you are into. It loads only when used.
- **Club pages** (32) — office bearers, events, achievements, galleries, and a
  jump bar built from the page's own sections. Each runs under its own newspaper desk
  ("The Chess Column", "The Sky Desk") with the ink, line drawing, border pattern, bullets,
  photo mounts and title type of what the club does.
- **Events, Gallery, Campus Life** — the photographic archive, grouped and searchable.
- **The SAC Calendar** — a month view backed by Google Calendar. It shows booked
  time slots while the calendar is shared as free/busy, and titles, places and
  details as soon as it is shared publicly.

## The look

An aged-paper broadsheet: warm stock with foxing, tea stains and a worn edge, rust
and oxblood accents, mono small-caps labels, pinned and taped cards. Paper ageing is
one setting — **Fresh**, **Aged** (default) or **Rustic** — alongside 17 paper textures,
7 type presets, dark mode, text size, and reduced-motion and sound toggles.
Hover and entrance motion is transform/opacity only and switches off for anyone who
asks for less motion.

## Fast on phones

The site is built to load quickly on a mid-range phone over a slow connection: each
page loads only its own script, images come in several sizes, below-the-fold work
waits until it is near the screen, and the service worker installs a small app shell
after the page has finished loading. Layout shift is ≈ 0 and Lighthouse (mobile) is
100 / 100 / 100 on the home page, clubs and club pages. Details and the numbers are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository layout

```
index.html, pages/       38 pages
css/                     tokens (variables.css), shell, per-page stylesheets
js/                      main.js (entry) · components/ · pages/ · utils/ · pretext/ (vendored)
tools/                   sync-pages · gen-sitemap · dedupe/ (image de-duplication, Python)
test/unit/               ~550 tests (Vitest + jsdom)
docs/                    ARCHITECTURE.md and research notes
public/assets/           git submodule — every image, document and video, plus assets_map.jsonl
public/duplicates.json   images the site hides (the archive itself is never edited)
utils/pretext/           git submodule — text-measurement library
sw.js                    service worker
```

## Development

Requires Node 18+ (tooling only) and Python 3 with Pillow and numpy (only for the
image de-duplication tools). The submodules use SSH URLs.

```bash
git clone --recurse-submodules git@github.com:Shuvam-Banerji-Seal/SAC_Website.git
cd SAC_Website
npm install

npm run serve     # http://localhost:8000/
npm run check     # lint + format + generated-files check + tests — what CI runs
```

`public/assets` is large (~6 GB). If you only need to work on code, you can skip it
for a while, but the site and most tests need its `assets_map.jsonl`.

Other scripts: `npm test`, `test:watch`, `test:coverage`, `lint:fix`, `format`,
`sync` (regenerate `<head>` preload blocks and the service-worker shell),
`sitemap`, `dedupe:people`, `build:pretext`. See [`AGENTS.md`](AGENTS.md).

## Deployment

Pushing to `main` runs lint, format and tests, then deploys to GitHub Pages
(`.github/workflows/deploy.yml`). The repository is deployed from two accounts, so the
workflow generates `sitemap.xml` and `robots.txt` for whichever host it is publishing
to. The deploy fails if the assets submodule isn't checked out.

## The calendar needs one setting

The Google Calendar the site reads is currently shared as **free/busy only**, so
Google returns no event names. To show titles, places and details: Google Calendar →
Settings → _Access permissions_ → make it public and choose **See all event
details**. Ideally use a dedicated, public "SAC Events" calendar (the one in
`js/config.js` is a personal institute calendar) and update `CALENDAR.CALENDAR_ID`.

## License

The website source (HTML/CSS/JS) is part of this repository. The images and documents
in `public/assets/` belong to their respective owners and clubs.
