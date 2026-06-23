# SAC Website — design + research docs

> A research-driven look at how to make the SAC website feel like a
> real, printed newspaper — and what other paper-like visual languages
> (book, old map) might extend the aesthetic.

| File | Lines | Size | TL;DR |
| ---- | ----: | ---: | ---- |
| [`loader-design.md`](./loader-design.md) | 313 | 19 KB | The newspaper-style ink loader that plays on the home page. Already shipped. |
| [`css-paper-texture-techniques.md`](./css-paper-texture-techniques.md) | 1 170 | 40 KB | Every CSS property that can fake paper: gradients, blend modes, filter, mask-image, backdrop-filter. Heavy focus on layered backgrounds (stain + grain + edge wear + fold). |
| [`svg-filters-for-paper.md`](./svg-filters-for-paper.md) | 808 | 38 KB | Deep dive into `feTurbulence` + `feDisplacementMap` + the rest of the SVG filter primitives. Includes the spec's `color-interpolation-filters="sRGB"` gotcha. |
| [`canvas-paper-texture.md`](./canvas-paper-texture.md) | 895 | 36 KB | How to procedurally generate paper grain, fold creases, edge wear, and coffee stains on `<canvas>`, then export to a CSS data URI. |
| [`css-3d-paper-folding.md`](./css-3d-paper-folding.md) | 902 | 32 KB | `transform-style: preserve-3d`, `perspective`, `transform-origin`, `backface-visibility`. The full list of CSS properties that silently flatten 3-D back to 2-D. |
| [`clip-path-paper-folds.md`](./clip-path-paper-folds.md) | 1 208 | 37 KB | `clip-path: polygon()` + `mask-image` for dog-eared corners, page tears, fold reveals. The "two-triangle" peel technique. |
| [`ink-bleed-effects.md`](./ink-bleed-effects.md) | 934 | 40 KB | `text-shadow` 5-stop stack, `feMorphology` + `feGaussianBlur` pipeline, `mix-blend-mode: multiply` for ink-on-paper. |
| [`halftone-printing-patterns.md`](./halftone-printing-patterns.md) | 786 | 35 KB | Real newsprint halftone — 85 lpi on 60-line screen, the dot shapes, the CMYK screen angles, and how to fake it in CSS / SVG / canvas. |
| [`newsprint-aging-authenticity.md`](./newsprint-aging-authenticity.md) | 702 | 30 KB | Lignin photo-oxidation, the warm palette drift from cream → ochre → umber, edge-first darkening from acid hydrolysis, foxing. |
| [`aged-paper-color-theory.md`](./aged-paper-color-theory.md) | 424 | 21 KB | 11-stop palette interpolation for fresh → 100-year-old paper. Why `mix-blend-mode: multiply` is the correct ink-on-paper blend. |
| [`free-texture-resources.md`](./free-texture-resources.md) | 556 | 44 KB | License-clear paper / newsprint / parchment textures: ambientCG, Texturelabs, transparenttextures, Unsplash, Wikimedia. |
| [`parallax-paper-texture.md`](./parallax-paper-texture.md) | 648 | 28 KB | `background-attachment: fixed` vs CSS scroll-driven animations (`animation-timeline: scroll()`) for subtle paper parallax. |
| [`paper-texture-performance.md`](./paper-texture-performance.md) | 653 | 26 KB | SVG filters on mobile, layered backgrounds, `will-change` trade-offs, DevTools measurement, reduced-data. |
| [`animation-libraries-for-paper.md`](./animation-libraries-for-paper.md) | 536 | 24 KB | GSAP, anime.js, Motion One, Popmotion, Lottie, Rive, WAAPI. The right default for our no-build static site. |
| [`js-page-flip-libraries.md`](./js-page-flip-libraries.md) | 578 | 19 KB | turn.js, StPageFlip, impress.js, BookBlock, react-pageflip, CSS-only. Which ones work in a no-build static site. |
| [`book-page-turn-animation.md`](./book-page-turn-animation.md) | 660 | 27 KB | The physics of a real page turn — hinge line, page curl, back-face content, WAI-ARIA carousel pattern. |
| [`mobile-paper-interactions.md`](./mobile-paper-interactions.md) | 994 | 31 KB | Hammer.js + Pointer Events + touch deltas mapped to CSS 3-D rotation. iOS Safari gotchas (rubber-band, scroll chaining, viewport-units). |
| [`web-typography-for-print.md`](./web-typography-for-print.md) | 567 | 28 KB | Newspaper display / body / monospace / drop-cap faces on Google Fonts. OpenType features to enable. Drop-cap CSS techniques. |
| [`old-map-cartography-aesthetic.md`](./old-map-cartography-aesthetic.md) | 727 | 30 KB | Hand-drawn coastlines, compass roses, sea monsters, sepia palette, frayed linen backing, ochre + iron-gall ink. The "book / old map" extension of the newspaper look. |
| **TOTAL** | **14 061** | **608 KB** | — |

---

## How to read this

If you only have **15 minutes**:

1. [`loader-design.md`](./loader-design.md) — what we already shipped
2. [`newsprint-aging-authenticity.md`](./newsprint-aging-authenticity.md) — the *only* doc that grounds the visual language in real paper chemistry
3. [`svg-filters-for-paper.md`](./svg-filters-for-paper.md) — section 1 + 2 only

If you have **an hour**:

1. Read all 19, in any order. The docs are independent.

If you're about to **start a new PR** on the home page:

1. `svg-filters-for-paper.md` — for any new texture
2. `css-3d-paper-folding.md` — for any new fold animation
3. `clip-path-paper-folds.md` — for any new peel or tear
4. `paper-texture-performance.md` — before adding a 6th background layer
5. `newsprint-aging-authenticity.md` — before picking any new color

---

## What the docs agree on

After 18 parallel research agents dug through ~70 sources (MDN, W3C
specs, CSS-Tricks, Smashing, Codrops, Wikipedia, library docs, etc.),
a few things kept coming back as the high-leverage moves:

1. **The current implementation is on the right track but light.** The
   five `--paper-*` data URIs cover ~30 % of what's available. The
   biggest single upgrade is a `feDiffuseLighting` recipe for the
   SAC seal — embossed letterpress without any new image assets.
2. **CSS scroll-driven animations replace JS parallax for free.**
   `animation-timeline: scroll()` runs on the compositor thread,
   zero JS, ~90 %+ global support. Drop the JS `rAF` parallax.
3. **Drop in a real paper texture file alongside the SVG noise.**
   ambientCG's `Paper001` (CC0, 5 MB) or Texturelabs' `Paper 366`
   (1940s newsprint) jump the visual fidelity past what any
   filter can produce. Self-host it.
4. **The "newsprint" identity is mostly correct.** Lignin
   photo-oxidation, not acid decay, drives the yellowing. Palette
   anchors on a warm drift (`#f4f0e6` → `#c9a16b` → `#8b6f3a`).
   The current `--paper-base` sits correctly on the curve.
5. **No need for a page-flip library.** StPageFlip is the best
   in class but adds 12 KB of code for a feature we don't need yet.
   CSS 3-D + IntersectionObserver covers the "section folds in as
   you scroll" interaction. Reserve a library for if/when we add
   a real book-spread inside a club page.

---

## Source counts (per doc)

The top three by sources cited:

- [`free-texture-resources.md`](./free-texture-resources.md) — 45 sources
- [`svg-filters-for-paper.md`](./svg-filters-for-paper.md) — 9 sources
- [`ink-bleed-effects.md`](./ink-bleed-effects.md) — 10 sources
- (every doc cites between 4 and 45 sources, with at least one
  W3C spec or MDN page in each)
