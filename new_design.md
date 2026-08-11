# SAC Chronicle — CSS-Grid Broadsheet Design

This redesign adapts the editorial structure of [The Daily Prophet CSS Grid example](https://redonion.se/cssgrid/) to the Student Activity Council at IISER Kolkata. The reference uses a centered paper, double rules, a six-column grid, contrasting headline/body type, short editorial modules, vertical labels, and an index-like footer. SAC keeps that visual language while using the existing directory data and club pages.

## Design goals

- Keep the site static and readable with JavaScript unavailable.
- Remove the Three.js CDN, import map, web fonts, SVG turbulence filters, and runtime animation loops.
- Use CSS Grid, multi-column text, `transform`, `opacity`, and a small amount of semantic JavaScript only.
- Give every page the same newspaper shell: left sidebar, paper background, settings sheet, footer, and lightweight print entrance.
- Preserve the existing 35-page content set, JSONL asset directory, lightbox, search/filter behavior, and print stylesheet.

## Page composition

The shared shell is a fixed 218px index rail on desktop and an off-canvas rail below 1024px. The home page is the main edition:

1. Masthead between double horizontal rules — volume, edition date, title, and tagline.
2. Lead article — a large condensed headline, italic deck, byline, drop cap, and justified two-column copy.
3. Organization diagram — inline SVG with no filter or external request.
4. Dynamic news sections — club cards grouped under SAC Council, Academics, Hostel, Sports, and Cultural.
5. Optional video/calendar modules, bulletin strip, and an index-style footer.

Individual club pages retain their detailed content but are now set as editorial articles: large section titles, drop caps, column rules, paper-framed image grids, and responsive office-bearer tables. Clubs, Events, Gallery, and About use the same page width and section rules.

## Tokens and typography

`css/variables.css` is intentionally small. The paper surface is a warm cream with two gradients and a repeating one-pixel grain. No raster texture is required for the critical path.

- Paper: `#f7f2e7` / `#fffaf0`
- Ink: `#181410`
- Accent: SAC red `#830d0d`
- Display: local condensed system stack (`Impact`, `Arial Narrow Bold`, etc.)
- Body: local serif stack (`Georgia`, `Times New Roman`, `Charter`)
- Utility: local monospace stack for labels, dates, and metadata

Theme, text size, reduced motion, sound, and the existing seven local font presets/eight texture labels are persisted under `sac-site-prefs`. The presets are CSS-only; none loads a remote font. The settings panel is a right side-sheet so it does not compete with the newspaper column system.

## Navigation

`js/components/navbar.js` renders the five primary links into the existing `#navbar` mount on every page. The current page gets an accent-red rule and `aria-current="page"`. Desktop keeps the rail visible. Mobile uses `#navbarCorner`, a transform-only drawer, a scrim, and Escape-to-close behavior.

## Paper entrance

`js/loader.js` builds six or fewer text-only club sheets from static names. `css/loader.css` handles the visual work:

- staggered sheets fall into a stack;
- each sheet has a clipped zig-zag torn edge;
- the progress rule fills while the stack settles;
- the sheets lift away and reveal the page.

The loader uses only `transform`, `opacity`, a small `clip-path`, and CSS timing. `prefers-reduced-motion` and the Settings motion switch skip the sequence. `js/preloader.js` is only a short first-paint guard and never downloads the entire site.

## Performance decisions

- No Three.js, WebGL, CDN import map, Google Fonts, canvas text measurement, or SVG turbulence in the critical path.
- Images remain lazy and are still loaded from the canonical processed asset map.
- YouTube and Calendar remain opt-in asynchronous sections.
- Paper grain is a repeating gradient; touch devices switch fixed backgrounds to scroll to avoid mobile compositor work.
- The service-worker cache is bumped to `sac-v16` so deployed clients receive the new shell.

## Accessibility and fallback

The sidebar has a labelled navigation region, active-page state, a skip link, keyboard Escape handling, and a scrim that closes the mobile drawer. Settings controls are native buttons/checkboxes. Tables become labelled cards below 520px. Print mode removes navigation, controls, loaders, and decorative strips while preserving content and rules.
