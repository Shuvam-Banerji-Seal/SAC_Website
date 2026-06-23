# SAC Newspaper Loader — design.md

> Design specification for the **newspaper-style ink loader** that plays
> when a visitor first lands on the SAC homepage.
>
> **Status:** Shipped · **Last updated:** 2026-06-22 · **Author:** SAC web team
> **Source:** `css/loader.css`, `index.html#loader`, `js/loader.js`

---

## Overview

The loader is the **brand-defining moment** of the SAC website. It plays
once per session on the homepage, before the masthead and body sections
reveal. The metaphor is **a printing press running its first edition** —
stacks of freshly printed club papers arrive, a SAC seal stamps itself
in ink, and the page emerges. The sequence runs **once the canonical
`assets_map.jsonl` is loaded**, so the loader doubles as a preloader
hiding the data fetch.

The loader is **5–8 s** on a typical connection, fully **interruptible**
via a "Skip" button, and runs only on the home page (`data-page="home"`).

**Category:** Brand preload / splash
**Primary surface:** `index.html#loader` (first child of `<body>`)
**Tone:** Confident, editorial, tactile, slightly mysterious
**Frameworks / libraries:** **None** — pure HTML + CSS + ES modules
**3D stack:** **None** — the loader uses 2D + CSS 3D transforms only
(no `<canvas>`, no WebGL, no Three.js). The ink finale is built with
SVG `<filter>` (`feTurbulence` + `feDisplacementMap`) and CSS
`transform: translate3d` on real DOM elements.

---

## Visual Language

### Color

| Role               | Token                | Notes |
| ------------------ | -------------------- | ----- |
| Background (base)  | `#1b1b22 → #0b0b0d → #030303` | Radial gradient — the "press room" — dark slate at top, near-black at edges. Stays the same across the entire sequence. |
| Paper surface      | `#f4f0e6` (parchment) | The body of each club newspaper. Matches the home-page masthead for visual continuity. |
| Ink / type         | `#181410` (deep ink) | Headline, body, fold lines. |
| Subhead / serif    | `#444` (warm grey)   | Article deck. |
| Drop cap / accent  | `#7e0909` (oxblood)  | Used for the masthead-level headline color. Not in the loader itself. |
| Gold (SAC seal)    | `#c9a84c → #f6df78` | Radial gradient on the crest's center emblem. |
| Inner cream        | `#f4f0e6`            | Crest text on the ink blob. |
| Skip button        | `rgba(255,255,255,0.36)`, border `rgba(255,255,255,0.14)` | Ghost-style; lifts on hover to `0.75` and `0.35` respectively. |

### Typography

| Role                | Family                                  | Weight | Size (in the 300×425 px paper) | Notes |
| ------------------- | --------------------------------------- | ------ | ------------------------------ | ----- |
| Kicker              | `"Courier New", monospace`              | 400    | 6 px                           | `letter-spacing: 3px`, all caps. |
| Newspaper title     | `Georgia, "Times New Roman", serif`     | 900    | 23 px                          | The SAC Chronicle. |
| Subtitle            | `"Courier New", monospace`              | 400    | 6 px                           | "Student Affairs Council Official Publication". |
| Club name           | `Georgia, "Times New Roman", serif`     | 900    | 13 px                          | Each club's name on its own paper. |
| Tagline             | `Georgia, "Times New Roman", serif`     | 400    | 7 px, italic                   | Tagline under the club name. |
| Article h1 / h2     | `Georgia, "Times New Roman", serif`     | 700    | 7.6 px                         | Two article columns per paper. |
| Article body        | `"Courier New", monospace`              | 400    | 5.6 px, line-height 1.48       | Justified. |
| Status text         | `"Courier New", monospace`              | 400    | 12 px (loader UI), `letter-spacing: 4px` | "Printing Club Editions". |
| Crest text          | `Georgia` + `"Courier New"`             | 700    | 17–25 px                       | "STUDENT AFFAIRS COUNCIL" on arc top, "★ IISER KOLKATA ★" on arc bottom. |

> The `paper-title` and `paper-name` use **`font-weight: 900`** and
> **`letter-spacing: 1px`** to feel like letterpress.

### Texture

| Layer                | Where                        | How |
| -------------------- | ---------------------------- | --- |
| Horizontal newsprint | Each `.newspaper`            | `repeating-linear-gradient` (1 px dark line every 2 px), `mix-blend-mode: multiply`. |
| Vertical newsprint   | Each `.newspaper`            | Same idea, 90° rotation, lower alpha. |
| Warm corner stains   | Each `.newspaper`            | Two `radial-gradient` (top-right, bottom-left) at 12 % and 9 % opacity. |
| Inner shadow         | Each `.newspaper`            | `box-shadow: inset 0 0 40px rgba(0,0,0,0.08)`. |
| Body lift shadow     | Each `.newspaper`            | `0 4px 12px rgba(0,0,0,0.35)` + `0 18px 45px rgba(0,0,0,0.38)`. |
| Ambient grain        | `#loader` background         | `repeating-linear-gradient` (1 px white at 3 % alpha every 3 px), `mix-blend-mode: overlay`. |
| Vignette             | `.loader-vignette`           | Radial gradient 0 % → 65 % black at edges. |
| Ink distortion       | `.ink-spread` SVG            | `feTurbulence baseFrequency=0.012 0.021, numOctaves=4, seed=11` + `feDisplacementMap scale=52`. |
| Crest ink roughness  | `.sac-crest` SVG             | `feTurbulence baseFrequency=0.028, numOctaves=2, seed=4` + `feDisplacementMap scale=1.8`. |
| Ink gradient         | `.ink-blob` fill             | Radial gradient `#151515 → #050505 → #000000` with cx 44 %, cy 38 % for the highlight. |
| Crest gold gradient  | `#sacGold` fill              | Radial gradient `#f6df78 → #c9a84c`. |
| Crest overprint      | `.sac-mark-wrap::before`     | `mix-blend-mode: multiply`; activates at 0.55 opacity 750 ms into the seal stamp. |

### Spacing & scale

- **Stage shell:** 380×540 px (auto-scaled to fit `min(viewport/440, viewport/650, 1.18)`).
- **Each paper:** 300×425 px (or 282×400 px on viewports < 520 px).
- **Logo plate:** 104×104 px circular, 1 px dashed inner ring, 2 px solid outer.
- **Status bar:** 235 px wide × 2 px tall (gold progress fill).
- **Crest:** `min(72vmin, 430px) × min(72vmin, 430px)`.

---

## Layout & Structure

The loader has three layers stacked under `position: fixed; inset: 0`:

```
┌──────────────────────────────────────────────────────────┐
│  #loader                                                  │
│   ├── .ambient-grain  (overlay blend, ambient film grain)│
│   ├── .stage-shell                                        │
│   │    └── .paper-stage  (12 .newspaper, 3D arranged)     │
│   ├── .status          (bottom-center, "Printing …" + bar)│
│   ├── .ink-finale     (3D ink drop + SAC seal, opacity 0) │
│   │    ├── .impact-glow  (rotatedX 68° ellipse)            │
│   │    ├── .drop-shadow  (ground shadow, rotatedX 72°)     │
│   │    ├── .drop3d       (3D ink blob falling)              │
│   │    ├── .ripple × 3   (staggered ripple rings)          │
│   │    ├── .ink-spread   (SVG ink blob, feDisplacementMap)│
│   │    ├── .splash-layer (splash droplets, JS-spawned)      │
│   │    └── .sac-logo-print                                │
│   │         ├── .sac-mark-wrap (clip-path stamped crest)  │
│   │         └── .sac-caption   (h2 + p below the crest)   │
│   ├── .loader-vignette  (final radial darkening)           │
│   └── .skip-btn         (right-bottom, ghost button)       │
└──────────────────────────────────────────────────────────┘
```

The stage shell uses `transform-style: preserve-3d` and inherits the
parent's `perspective: 1400px`. Mousemove tilts the whole stage
(`--rx`, `--ry` custom properties) up to ±10° on the X/Y axes, with
0.25 s ease.

The `.paper-stage` floats with a 5.5 s "stageFloat" keyframe
(`translateY(0px) → translateY(-12px) rotateZ(-0.8deg)`).

---

## Animation Sequence

The sequence has **five phases**, with named keyframes for each:

| Phase | Trigger                              | What happens | Duration |
| ----- | ------------------------------------ | ------------ | -------- |
| 1     | `init()`                             | Papers spawn with random entrance transforms (translateX ±760, translateY −390 to −640, translateZ 260–690, rotateX 45–90°, rotateY ±65°, rotateZ ±45°). | 0 → 320 ms |
| 2     | per paper, staggered 270 ms           | Paper's `transform` is replaced with its `dataset.finalTransform` (final X/Y/Z + small rotations). `opacity: 1`. After 900 ms, `.arrived` class triggers `paperBreath` (subtle brightness pulse). | 320 ms → ~3.5 s |
| 3     | last paper arrives                    | `gatherNewspapers()` removes the float animation, scoots each paper toward center with random micro-offsets, and dims the older ones (`opacity 0.62`). Status bar slides down. | ~3.5 s → 4.4 s |
| 4     | 4.4 s                                | `playInkFinale()` adds `.active` to `.ink-finale` → `.drop3d` falls from 78 vh above (1.12 s `cubic-bezier(0.36, 0.02, 0.24, 1)`). 1.08 s in: `.impact` class triggers the 3 ripples + 38 splash droplets (24 on small screens) + ink-blob scale 0 → 1.42 (1.65 s cubic-bezier). | 4.4 s → 6.6 s |
| 5     | 2.2 s in                             | `.logo` class stamps the SAC seal: `logoStamp` keyframe (1.32× scale + rotate −5° → 0°) with `printReveal` clip-path animation (22 steps, prints top-to-bottom), `printHead` sheen overlay, and `textureIn` for the overprint grain. Caption slides up 0.9 s in. | 6.6 s → 8.0 s |
| 6     | seal stamp complete + 1.2 s         | `hideLoader()` adds `.hidden` to `#loader` (opacity + visibility 0.9 s ease). 1 s later, all `.newspaper` nodes are removed from the DOM. | 8.0 s → 9.0 s |

### Keyframe catalog

| Name              | File:line            | Duration | Easing     | Trigger                | Notes |
| ----------------- | -------------------- | -------- | ---------- | ---------------------- | ----- |
| `stageFloat`      | `css/loader.css:82`  | 5.5 s    | ease-in-out| infinite               | Lifts the whole stage — gives the papers life. |
| `paperBreath`     | `css/loader.css:154` | 3 s      | ease-in-out| infinite (per paper)   | Subtle `filter: brightness(1 → 1.045 → 1)` on each arrived paper. |
| `impactGlow`      | `css/loader.css:437` | 1.25 s   | ease       | `.ink-finale.active`   | The radial white glow that "ignites" the moment of impact. |
| `dropFall3D`      | `css/loader.css:505` | 1.12 s   | `cubic-bezier(0.36, 0.02, 0.24, 1)` | `.ink-finale.active` | The 3D drop falling from above the viewport, with squash + rotateX. |
| `shadowApproach`  | `css/loader.css:537` | 1.12 s   | `cubic-bezier(0.36, 0.02, 0.24, 1)` | `.ink-finale.active` | The ground shadow scaling up as the drop approaches. |
| `rippleOut`       | `css/loader.css:560` | 0.9 / 1.15 / 1.35 s | ease-out | `.ink-finale.impact` | Three concentric rings, staggered by 80 ms. |
| `inkBloom`        | `css/loader.css:582` | 1.65 s   | `cubic-bezier(0.2, 0.82, 0.12, 1)` | `.ink-finale.impact` | The SVG ink blob scaling 0 → 1.42. |
| `splashThrow`     | `css/loader.css:617` | per-droplet (0.72–1.34 s) | `cubic-bezier(0.12, 0.78, 0.24, 1)` | `.ink-finale.impact` (with per-droplet `--dur` and `--delay`) | Splash droplets spawned by JS with random angle + distance. |
| `logoStamp`       | `css/loader.css:641` | 0.72 s   | `cubic-bezier(0.16, 1.25, 0.28, 1)` | `.ink-finale.logo`   | The crest "stamps" in from 1.32× scale, rotate −5°. |
| `printReveal`     | `css/loader.css:668` | 1.05 s   | `steps(22, end)` 0.18 s delay | `.ink-finale.logo` | `clip-path: inset(0 0 100% 0) → inset(0 0 0 0)` — a printer-head sweeping top-to-bottom. |
| `printHead`       | `css/loader.css:689` | 1.05 s   | ease 0.18 s delay | `.ink-finale.logo`   | A horizontal gold sheen on the crest that sweeps down 1280 % as the print completes. |
| `textureIn`       | `css/loader.css:715` | 0.6 s    | ease 0.75 s delay | `.ink-finale.logo`   | The overprint grain (mix-blend-mode: multiply) on the crest, settling to 55 % opacity. |
| `captionUp`       | `css/loader.css:733` | 0.75 s   | ease 0.9 s delay | `.ink-finale.logo`   | The "Student Affairs Council" caption slides up from below. |

---

## JavaScript Architecture

`js/loader.js` is a single ES module that owns the entire sequence.
It runs on the home page only (it is a separate `<script type="module">`
in `index.html`, not gated by `body[data-page]`).

### State

```js
const els = {};     // cached DOM references (loader, stage, inkFinale, …)
let papers = [];    // array of .newspaper nodes
let skipped = false;
```

### Phases (functions)

| Function             | Responsibility |
| -------------------  | -------------- |
| `transformsFor(i, total)` | Computes random entrance and final transforms for paper *i*. |
| `buildClubData(clubs)`     | Maps each club → logo URL, tagline, article copy. |
| `createNewspaper(club, i)` | Builds the `.newspaper` DOM with a kicker, title, fold line, logo, club name, tagline, ornament, article grid, footer. |
| `spawnSplashDroplets()`    | Generates 24–38 absolutely-positioned `.splash-dot` divs with random angle, distance, size, duration, and arc; each gets CSS custom properties `--x / --y / --size / --dur / --delay / --arc / --s` consumed by `splashThrow`. |
| `startLoader(data)`        | Spawns the 12 papers and runs the staggered arrival. |
| `gatherNewspapers()`       | Removes the stage float animation, scoots papers to center, dims older ones, hides the status bar. |
| `playInkFinale()`          | Adds the three classes (`.active`, `.impact`, `.logo`) on a fixed schedule; calls `spawnSplashDroplets()`. |
| `hideLoader()`             | Adds `.hidden` to `#loader` and removes `body.loader-active`; 1 s later, removes the paper nodes. |
| `skipLoader()`             | User-pressed-Skip path: instantly hides, sets `skipped` so subsequent scheduled callbacks short-circuit. |
| `fitStage()`               | Computes `--stage-scale` to fit the 380×540 stage into the viewport. |
| `wireEvents()`             | Mousemove parallax on the stage, resize re-fit, click on `#skipBtn`. |
| `init()`                   | Locks body scroll, caches DOM, wires events, fetches JSONL, kicks off `startLoader()`. |

### Data flow

```
DOMContentLoaded
  └─ init()
      ├─ add "loader-active" to body (locks overflow)
      ├─ cache DOM, wire events, fit stage
      └─ loadAssetsMap() + indexByClub()
           └─ startLoader(data)
                ├─ for each club: createNewspaper() + transformsFor()
                └─ for each paper, setTimeout(..., 320 + i * 270):
                     paper.style.opacity = 1
                     paper.style.transform = final
                     update progress + status text
                     schedule gather → inkFinale → hide
```

### Key timings (also constants in source)

```js
const HOLD_AFTER_LOGO = 1800; // ms the seal stays on screen before we dismiss
```

Everything else is hard-coded in `setTimeout(...)` inside
`startLoader`, `gatherNewspapers`, and `playInkFinale`.

---

## Motion & Interaction

- **Mousemove parallax** on the stage shell — tilts ±10° Y / ±7° X with
  0.25 s ease. Subtle, not aggressive; sells the "paper on a desk"
  feel.
- **Skip button** — ghost button at `right: 20px; bottom: 18px`,
  `letter-spacing: 2px` Courier, all-caps, 10 px. Lifts on hover to
  brighter white and stronger border.
- **Status bar** slides down 0.45 s as the gather starts. The progress
  fill is a `linear-gradient(90deg, #c9a84c, #ecd36b)` with a
  `0 0 12px rgba(201,168,76,0.6)` glow.
- **No clickable elements on papers** — they are decorative; the user
  waits for the seal stamp, or hits Skip.

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  #loader *, #loader { animation-duration: 0.001ms !important; … }
}
```

All keyframes collapse to ~0 s, but the structural state changes
(opacity, transform application) still fire, so the loader still
appears + disappears. To make it fully skip-able for reduced-motion
users, the JS would need to also short-circuit (currently it does
not — see Limitations).

---

## Accessibility

- `aria-hidden="true"` on the loader wrapper.
- `body.loader-active` is added in JS to lock scroll while the loader
  is up; removed on hide.
- The Skip button is a real `<button type="button">` with a visible
  label, reachable by keyboard.
- The crest is purely decorative SVG; `aria-hidden` is implicit
  (no role).
- No focus-trap is needed since the loader is not modal — the
  underlying page is `overflow: hidden` and the only interactive
  thing inside the loader is Skip.

**Known gap:** the loader does not announce itself to screen readers
(no `aria-live`, no polite message). The Skip button is the
escape hatch. A future iteration could add
`role="status" aria-live="polite"` on the `.status` block.

---

## Performance Notes

- **DOM size during loader:** 12 papers × ~14 child nodes ≈ 170 elements,
  plus 38 splash dots, plus the SVG ink blob. All positioned via
  `transform`, which stays on the compositor thread.
- **No repaint-triggering properties animate** (no `width`, `height`,
  `top`, `left` — only `transform`, `opacity`, `filter`).
- **`will-change`** is set on each paper to keep them on their own
  compositor layer.
- **Splash droplets** use CSS custom properties for all per-instance
  values, so they all share a single `@keyframes splashThrow` —
  no inline styles for the per-droplet random data.
- **`prefers-reduced-motion: reduce`** collapses all keyframes to
  ~0 ms. The loader still plays but the visual effect is gone.

---

## Limitations & known issues

- The whole sequence is **deterministic once it starts** — there's
  no seeded variation per page-load. Two visits in a row look
  identical (except the random droplet positions and angles).
- The crest text **may not print on top of every browser's font
  fallbacks** — the arc text uses `<textPath href="#arcTop">` and
  relies on Georgia + Courier New being available.
- The whole loader is **tied to the home page** (index.html). It does
  not run on `/pages/clubs.html` etc. — those pages skip straight to
  the body.
- The `feDisplacementMap` ink filter can be expensive on low-end GPUs;
  on a slow phone the seal stamp may stutter. A fallback could be to
  swap the SVG ink for a static PNG at the start of phase 5.

---

## Changelog

- **2026-06-21** — Initial design.md by SAC web team, documenting the
  loader shipped in the same release as the home page newspaper
  theme.
- **2026-06-22** — design.md cleaned up and expanded after the user's
  research pass. Added the "Performance Notes" and "Limitations"
  sections.
