# SVG Filters for Paper Textures — Research Notes

> Research for the **SAC website** at `/store/shuvam/SAC_Website`, a pure
> static HTML/CSS/JS newspaper-themed site. The current code uses inline
> SVG data URIs with `feTurbulence`, `feDisplacementMap` and `feColorMatrix`
> (see `css/variables.css` lines 109-118, `css/loader.css` lines 659-661).
> The goal here is to gather the library-grade SVG filter vocabulary so we
> can move to richer, more authentic paper, ink and print effects.
>
> **Status:** Reference · **Last updated:** 2026-06-22 · **Audience:** SAC web team
> **Scope:** SVG filter primitives, paper-texture recipes, performance, browser support.
> **Out of scope:** WebGL, Three.js, 3D transforms, canvas as a primary surface.

---

## Table of Contents

1. [Current state in the repo](#current-state-in-the-repo)
2. [Authoritative sources cited](#authoritative-sources-cited)
3. [SVG filter primitives — reference table](#svg-filter-primitives--reference-table)
4. [Paper-texture recipes (library-grade)](#paper-texture-recipes-library-grade)
   - 4.1 Paper grain (current, evolved)
   - 4.2 Halftone / newsprint dot pattern
   - 4.3 Ink bleed / wet ink rough edge
   - 4.4 Fold crease shadow
   - 4.5 Coffee / tea stain
   - 4.6 Edge wear / vignette
   - 4.7 Embossed letterpress plate
   - 4.8 Paper-tear / deckle edge
   - 4.9 Smudge / dirt streaks
   - 4.10 Specular highlight on coated stock
   - 4.11 Aged / sepia print
   - 4.12 Drop-cap shadow (drop-shadow shorthand)
5. [Layering multiple filters — the pipeline pattern](#layering-multiple-filters--the-pipeline-pattern)
6. [Performance: what is cheap, what is expensive](#performance-what-is-cheap-what-is-expensive)
7. [Browser support and Safari quirks](#browser-support-and-safari-quirks)
8. [SVG filters vs canvas-generated textures — trade-offs](#svg-filters-vs-canvas-generated-textures--trade-offs)
9. [Recommendations for the SAC site](#recommendations-for-the-sac-site)
10. [Appendix A — quick cookbook (copy-paste)](#appendix-a--quick-cookbook-copy-paste)

---

## Current state in the repo

Five paper-texture SVG variables are already defined in
`css/variables.css` (lines 94-118) and used as `background-image` data
URIs across `home.css`, `loader.css`, and `components.css`:

| Token | Filter primitives used | Tile | Notes |
|---|---|---|---|
| `--paper-grain` | `feTurbulence` (`fractalNoise`, `baseFrequency=0.85`, `numOctaves=2`) → `feColorMatrix` (dark brown tint, alpha 0.18) | 160×160 | The fine fibre noise of real newsprint. |
| `--paper-halftone` | none (single `<circle>` pattern) | 6×6 | CMYK-style dot grid. |
| `--paper-fold-crease` | none (linear gradient strip) | 200×4 | Horizontal fold shadow, fades at ends. |
| `--paper-coffee-stain` | `feTurbulence` (`baseFrequency=0.04`) → `feDisplacementMap` (`scale=9`) on three overlapping brown circles | 160×160 | Irregular brown ring stain. |
| `--paper-edge-wear` | none (`radialGradient`) | 320×320 | Dark vignette around edges. |

`loader.css` also uses two layered `drop-shadow()` filters (line 659-661)
and `clip-path` reveals (line 668-671) on the ink finale.

**What's missing vs. "library-grade":** true embossed paper plate
lighting (`feSpecularLighting` + `feDiffuseLighting`), ink halo / wet-ink
filter (`feMorphology` + `feGaussianBlur`), edge-tear displacement
(`feDisplacementMap` at high scale), emboss / deboss (`feConvolveMatrix`
emboss kernel), sepia / aged print (`feColorMatrix` matrix), and proper
blend stacking (`feBlend` with `multiply`, `screen`, `darken`).

---

## Authoritative sources cited

1. **W3C — Filter Effects Module Level 1 (Editor's Draft, Feb 2026)**
   <https://drafts.csswg.org/filter-effects-1/>
   *The canonical specification.* Authoritative for all primitive
   semantics, attribute ranges, the `<filter>` element, and the
   `filter` CSS property. Use this as the final word on what a
   primitive does.
2. **MDN — `<feTurbulence>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence>
3. **MDN — `<feDisplacementMap>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap>
4. **MDN — `<feColorMatrix>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix>
5. **MDN — `<feMorphology>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feMorphology>
6. **MDN — `<feGaussianBlur>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feGaussianBlur>
7. **MDN — `<feComposite>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feComposite>
8. **MDN — `<feFlood>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feFlood>
9. **MDN — `<feConvolveMatrix>`**
   <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feConvolveMatrix>
10. **MDN — `<feSpecularLighting>`**
    <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feSpecularLighting>
11. **MDN — `<feDiffuseLighting>`**
    <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDiffuseLighting>
12. **MDN — SVG filters (guide)**
    <https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters>
    *Includes the canonical drop-shadow recipe used as the basis for
    the layered blur+offset+merge pattern below.*
13. **CSS-Tricks — `filter` property almanac (Chris Coyier)**
    <https://css-tricks.com/almanac/properties/f/filter/>
    *Best short summary of the CSS filter functions and the
    `filter: url()` syntax for referencing an SVG `<filter>` element.*
14. **CSS-Tricks — "Animating with Clip-Path" (Travis Almand, 2019)**
    <https://css-tricks.com/animating-with-clip-path/>
    *Relevant for the loader's `clip-path: inset(...)` reveal and for
    `mix-blend-mode`-style compositing with SVG filters.*
15. **CSS-Tricks — "Everything You Need To Know About SVG" (series)**
    <https://css-tricks.com/lodge/svg/>
    *Episode 32 ("SVG Filters on SVG and HTML Elements") covers the
    data-URI inline filter pattern we already use.*
16. **web.dev — "How to create high-performance CSS animations"
    (Kayce Basques, Rachel Andrew)**
    <https://web.dev/articles/animations-guide>
    *Authoritative for the rule "stick to `transform` and `opacity` for
    animation; everything else (including SVG filter url() swaps) is
    expensive".*
17. **caniuse — SVG filters**
    <https://caniuse.com/svg-filters>
    *Global support 96.57% (May 2026). Universal in modern browsers
    except IE 5.5–9.*
18. **MDN — Canvas pixel manipulation (for the SVG vs canvas trade-off)**
    <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas>

---

## SVG filter primitives — reference table

Each primitive operates on one or two input images (`in` and `in2`) and
produces one output image (`result`). Results are chained through
`result` names, exactly like a small command-line pipeline.

| Primitive | What it does | Key attributes | GPU-friendly? | Cost (rough) |
|---|---|---|---|---|
| `<feTurbulence>` | Synthesises a Perlin/fractal-noise image filling the filter region. *The starting point for almost every texture.* | `type` (`fractalNoise`/`turbulence`), `baseFrequency` (0.0001 → 1000, usually 0.01–1.5), `numOctaves` (1–10), `seed`, `stitchTiles` (`stitch`/`noStitch`) | ❌ CPU | Medium; cost scales with `numOctaves` |
| `<feColorMatrix>` | Multiplies each pixel `[R,G,B,A]` by a 5×5 matrix. The cheap way to tint, desaturate, sepia, contrast, invert. | `type` (`matrix`/`saturate`/`hueRotate`/`luminanceToAlpha`), `values` (20 numbers for matrix) | ✅ (matrix ops are GPU) | Very cheap |
| `<feFlood>` | Solid-color fill of the filter subregion. | `flood-color`, `flood-opacity` | ✅ | Trivial |
| `<feComposite>` | Porter-Duff compositing of two inputs: `over`, `in`, `out`, `atop`, `xor`, `lighter`, `arithmetic` (with `k1..k4`). | `in`, `in2`, `operator`, `k1`..`k4` | ✅ | Cheap |
| `<feGaussianBlur>` | Gaussian blur. Used everywhere — soft halos, shadow edges, paper grain. | `stdDeviation` (0 → ∞), `edgeMode` (`duplicate`/`wrap`/`none`) | ✅ GPU | Medium; cost scales with `stdDeviation²` |
| `<feOffset>` | Translate the input by `(dx, dy)`. Drop-shadow workhorse. | `dx`, `dy` | ✅ | Trivial |
| `<feMerge>` / `<feMergeNode>` | Stack multiple inputs top-to-bottom. With `feGaussianBlur` + `feOffset` + `SourceGraphic`, this is the canonical drop shadow. | (children only) | ✅ | Cheap |
| `<feBlend>` | `normal`, `multiply`, `screen`, `darken`, `lighten`, `overlay`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`. *Use `multiply` to lay ink-stained paper over the base colour; use `screen` for highlights.* | `in`, `in2`, `mode` | ✅ | Cheap |
| `<feMorphology>` | `erode` (shrink) or `dilate` (grow) the input alpha. *The primitive for "ink halo" and "embossed letterpress bulge".* | `operator` (`erode`/`dilate`), `radius` | ⚠️ Edge-only | Cheap |
| `<feDisplacementMap>` | Push each pixel by an `(x,y)` taken from `in2`'s R/G channels. *This is the primitive behind the coffee-stain and ink-rough-edge look.* | `in`, `in2`, `scale`, `xChannelSelector`, `yChannelSelector` | ⚠️ Often CPU | Medium-high (per-pixel) |
| `<feConvolveMatrix>` | Convolution with an N×M kernel. Sharpens, blurs (Gaussian/box), detects edges, embosses. *Use the emboss kernel `[0 1 0 / 1 0 -1 / 0 -1 0]` for the letterpress deboss.* | `order`, `kernelMatrix`, `divisor`, `bias`, `edgeMode`, `preserveAlpha` | ⚠️ Depends on order | Medium; cost = O(order² × pixels) |
| `<feSpecularLighting>` | Phong specular highlights from one light source using alpha as a bump map. *Use for glossy paper and the crest's gold shine.* | `surfaceScale`, `specularConstant`, `specularExponent`, `lighting-color` + child light (`feDistantLight`/`fePointLight`/`feSpotLight`) | ❌ Usually CPU | Medium |
| `<feDiffuseLighting>` | Lambertian diffuse shading from one light. *Use for soft paper emboss.* | `surfaceScale`, `diffuseConstant`, `kernelUnitLength` + light source | ❌ Usually CPU | Medium |
| `<feDropShadow>` | Convenience wrapper for the blur+offset+merge drop shadow. *This is the modern, one-liner replacement for the explicit pipeline.* | `dx`, `dy`, `stdDeviation`, `flood-color`, `flood-opacity` | ✅ | Cheap |
| `<feImage>`, `<feTile>` | Image input / tiling input. | — | ✅ | Cheap |
| `<feComponentTransfer>` + `feFunc*` | Per-channel lookup tables. *Use to posterise or threshold the noise into a halftone.* | `tableValues`, `slope`, `intercept`, `amplitude`, `exponent` | ✅ | Cheap |

> **Sources for the table:** W3C Filter Effects Module Level 1 §9
> ([drafts.csswg.org/filter-effects-1/](https://drafts.csswg.org/filter-effects-1/))
> and the MDN pages for each primitive listed above.

---

## Paper-texture recipes (library-grade)

> Each recipe is a **complete, drop-in `<svg>` filter** in the same
> inline data-URI idiom the repo already uses. Paste it into
> `css/variables.css`. Tile sizes are noted so you can pick one that
> matches the existing variables (160×160 is the convention here).

### 4.1 Paper grain (current, evolved)

> *Goal:* the fine fibre look of real newsprint. The repo already has
> this — this is the same idea with **two octaves of fine noise + a
> warm sepia tint** so it reads on cream paper.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
  <filter id="grain" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.9"
                  numOctaves="2" seed="3" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.12
                           0 0 0 0 0.10
                           0 0 0 0 0.08
                           0 0 0 0.22 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#grain)"/>
</svg>
```

```css
background-image: url("data:image/svg+xml;utf8,<svg …></svg>");
background-size: 160px 160px;
mix-blend-mode: multiply;   /* tints paper, never pure black */
opacity: .6;                /* keep fibre subtle */
```

**Why this works:** `feTurbulence` synthesises the noise (W3C §9.21,
MDN). `feColorMatrix` rewrites it to a warm-dark tone with 22 % alpha
(MDN). `mix-blend-mode: multiply` lets the underlying paper colour show
through (CSS Compositing Level 1, cited in MDN filter almanac).

---

### 4.2 Halftone / newsprint dot pattern

> *Goal:* the dots you see under a magnifying glass on cheap newsprint,
> or on Roy Lichtenstein-style pop art. Uses `feComponentTransfer` to
> threshold noise into hard dots.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">
  <filter id="dots" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="2.4"
                  numOctaves="1" seed="9" stitchTiles="stitch"/>
    <feComponentTransfer>
      <!-- threshold: keep only the darkest 35 % of the noise -->
      <feFuncR type="discrete" tableValues="0 0 0 1"/>
      <feFuncG type="discrete" tableValues="0 0 0 1"/>
      <feFuncB type="discrete" tableValues="0 0 0 1"/>
      <feFuncA type="linear"  slope="1"    intercept="-0.65"/>
    </feComponentTransfer>
    <feColorMatrix values="0 0 0 0 0.10
                           0 0 0 0 0.08
                           0 0 0 0 0.06
                           0 0 0 1 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#dots)"/>
</svg>
```

> **Lift from the repo:** this replaces the trivial
> `--paper-halftone` (currently a 6×6 single-dot pattern) with a
> thresholded noise field — much more organic.

---

### 4.3 Ink bleed / wet ink rough edge

> *Goal:* the halo of slightly different ink density around freshly
> printed type on absorbent paper. Uses `feMorphology` (dilate) +
> `feGaussianBlur` to make a fuzzy ring, then `feComposite arithmetic`
> with the source to darken only where the source is dark.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="ink-bleed" color-interpolation-filters="sRGB">
    <!-- 1. grow the alpha a tiny bit -->
    <feMorphology in="SourceAlpha" operator="dilate" radius="0.4"/>
    <!-- 2. blur the dilated alpha -->
    <feGaussianBlur stdDeviation="0.6" result="halo"/>
    <!-- 3. multiply halo with source so it only shows where ink is -->
    <feComposite in="halo" in2="SourceAlpha" operator="in" result="ring"/>
    <!-- 4. punch a bit darker than source colour into the ring -->
    <feFlood flood-color="#0a0a0a" flood-opacity="0.55"/>
    <feComposite in2="ring" operator="in" result="ring-dark"/>
    <!-- 5. lay ring-dark under the original source -->
    <feMerge>
      <feMergeNode in="ring-dark"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</svg>
```

Apply via CSS:

```css
.title { filter: url("data:image/svg+xml;utf8,<svg …>#ink-bleed"); }
```

> Source: derived from MDN's drop-shadow example
> (<https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters>)
> and the W3C spec §9.6, §9.13, §9.17.

---

### 4.4 Fold crease shadow

> *Goal:* a soft, slightly irregular horizontal shadow line where the
> paper was folded. The repo already does this with a `linearGradient`
> — this version adds a `feTurbulence` warper to break up the perfect
> line and a `feGaussianBlur` to soften it.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="10"
     preserveAspectRatio="none">
  <filter id="crease" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.9"
                  numOctaves="2" seed="7" stitchTiles="stitch"/>
    <feDisplacementMap in="SourceGraphic" scale="3"/>
    <feGaussianBlur stdDeviation="0.7"/>
  </filter>
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0"   stop-color="#181410" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#181410" stop-opacity="0.45"/>
      <stop offset="1"   stop-color="#181410" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)" filter="url(#crease)"/>
</svg>
```

> **Lift from the repo:** `--paper-fold-crease` becomes non-linear,
> far more believable. Works as a horizontal strip `background-image:
> repeat-x` over an article's centre fold.

---

### 4.5 Coffee / tea stain

> *Goal:* a brown ring with irregular outer edge. The repo's
> `--paper-coffee-stain` already uses `feDisplacementMap` — this is a
> stronger version with **two-pass displacement** (a turbulent warp
> of the displacement map itself), plus an inner highlight using
> `feSpecularLighting` so it reads as a wet ring.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"
     viewBox="0 0 240 240">
  <filter id="stain" color-interpolation-filters="sRGB">
    <!-- warp the warp: feed turbulence into the displacement map -->
    <feTurbulence type="fractalNoise" baseFrequency="0.05"
                  numOctaves="2" seed="5" stitchTiles="stitch"
                  result="warp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.18"
                  numOctaves="3" seed="13" stitchTiles="stitch"
                  result="warp2"/>
    <feDisplacementMap in="warp" in2="warp2" scale="14" result="warped"/>
    <feDisplacementMap in="SourceGraphic" in2="warped" scale="12"/>
  </filter>
  <g filter="url(#stain)">
    <circle cx="120" cy="120" r="92" fill="rgb(120,72,28)" opacity="0.30"/>
    <circle cx="106" cy="112" r="74" fill="rgb(86,52,24)" opacity="0.26"/>
    <circle cx="130" cy="128" r="60" fill="rgb(140,90,38)" opacity="0.22"/>
    <circle cx="118" cy="120" r="40" fill="rgb(168,120,60)" opacity="0.18"/>
  </g>
</svg>
```

> **Why the second `feDisplacementMap`:** warping the warp field
> (rather than warping straight noise) creates the long, sweeping
> irregularity of a real coffee ring, instead of small bumps.

---

### 4.6 Edge wear / vignette

> *Goal:* dark, slightly dusty edges around a paper sheet. Currently
> a pure `radialGradient` in the repo; this version adds a
> `feTurbulence` layer multiplied over the vignette so the darkening
> has texture.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
  <filter id="wear" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.6"
                  numOctaves="2" seed="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.10
                           0 0 0 0 0.08
                           0 0 0 0 0.06
                           0 0 0 0.4 0"/>
  </filter>
  <radialGradient id="v" cx="50%" cy="50%" r="68%">
    <stop offset="55%"  stop-color="#181410" stop-opacity="0"/>
    <stop offset="100%" stop-color="#181410" stop-opacity="0.45"/>
  </radialGradient>
  <rect width="100%" height="100%" fill="url(#v)" filter="url(#wear)"/>
</svg>
```

CSS:

```css
.paper {
  background-image: url("data:image/svg+xml;utf8,<svg …></svg>");
  background-size: 320px 320px;
  mix-blend-mode: multiply;
}
```

---

### 4.7 Embossed letterpress plate

> *Goal:* make text or a logo look like it's pressed *into* the paper.
> Uses `feDiffuseLighting` (matte shading) with `SourceAlpha` as the
> bump map. This is the closest you can get to a real deboss in
> pure SVG.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="emboss" color-interpolation-filters="sRGB">
    <!-- alpha → lighting -->
    <feDiffuseLighting in="SourceAlpha" surfaceScale="3"
                       diffuseConstant="1.1" lighting-color="#fff">
      <feDistantLight azimuth="135" elevation="42"/>
    </feDiffuseLighting>
    <feComposite in2="SourceAlpha" operator="in" result="light-clip"/>
    <!-- overlay with the source colour so it stays the right hue -->
    <feComposite in="SourceGraphic" in2="light-clip" operator="arithmetic"
                 k1="0" k2="1" k3="0.35" k4="0" result="embossed"/>
    <feMerge>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="embossed"/>
    </feMerge>
  </filter>
</svg>
```

Apply to a dark element on cream paper:

```css
.embossed-title { filter: url("…#emboss"); fill: #1a1410; }
```

> Source for the lighting math: W3C Filter Effects §9.10,
> `<feDiffuseLighting>` MDN page, and the historical 3D-lighting
> example in §1 of the W3C spec.

---

### 4.8 Paper-tear / deckle edge

> *Goal:* the irregular fuzzy edge of torn handmade paper. Strong
> `feDisplacementMap` on a rectangle whose alpha is a clean shape;
> the displacement source is two-octave noise.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
  <filter id="torn" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06"
                  numOctaves="3" seed="21" stitchTiles="stitch"
                  result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="22"
                       xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <rect width="100%" height="100%" fill="#f4f0e6" filter="url(#torn)"/>
</svg>
```

Apply as the **bottom** layer, with the actual content on top
clipped to the same torn silhouette using `clip-path: url(#torn-clip)`.

> Tip: to clip to the torn shape rather than just have a torn
> rectangle, render the same filter on a `<rect>` *inside* a
> `<clipPath>` element, then reference the clipPath.

---

### 4.9 Smudge / dirt streaks

> *Goal:* thumbprints, water marks, or accidental streaks across the
> page. Uses an elongated low-frequency `feTurbulence` (the trick is
> `baseFrequency="0.01 0.4"` — very different x/y frequencies).

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
  <filter id="streak" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.45"
                  numOctaves="2" seed="31" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.20
                           0 0 0 0 0.18
                           0 0 0 0 0.15
                           0 0 0 0.35 0"/>
    <feGaussianBlur stdDeviation="1.4"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#streak)"/>
</svg>
```

---

### 4.10 Specular highlight on coated stock

> *Goal:* the gloss of a magazine cover or a glossy seal. Uses
> `feSpecularLighting` (Phong) on a bump map derived from the alpha
> channel.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="gloss" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
    <feSpecularLighting in="blur" surfaceScale="6"
                        specularConstant="1.2" specularExponent="22"
                        lighting-color="#fff" result="spec">
      <fePointLight x="-60" y="-80" z="180"/>
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in"
                 result="spec-clip"/>
    <feComposite in="SourceGraphic" in2="spec-clip" operator="arithmetic"
                 k1="0" k2="1" k3="1" k4="0"/>
  </filter>
</svg>
```

> This is exactly the W3C spec's example in §1, generalised.

---

### 4.11 Aged / sepia print

> *Goal:* turn modern cream paper into aged yellowed newsprint with
> slightly lifted blacks. Pure `feColorMatrix`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <filter id="aged" color-interpolation-filters="sRGB">
    <feColorMatrix values="0.55 0.45 0.10 0 0.05
                           0.40 0.45 0.10 0 0.02
                           0.25 0.30 0.10 0 0.00
                           0     0    0    1 0"/>
  </filter>
</svg>
```

> This is the matrix equivalent of CSS `filter: sepia(0.7) contrast(1.1)`,
> but applied via `filter: url(#aged)` so it can be used as an SVG
> effect on text, shapes, or whole pages.

---

### 4.12 Drop-cap shadow (drop-shadow shorthand)

> *Goal:* a quick soft shadow under a drop cap or a logo. The CSS
> `filter: drop-shadow()` shorthand is the one-liner equivalent of
> the explicit `feGaussianBlur` + `feOffset` + `feMerge` pipeline.
> **Prefer this** for shadows; only fall back to the explicit
> pipeline when you need to mix the shadow with a texture.

```css
.dropcap {
  filter: drop-shadow(0 2px 1px rgba(24, 20, 16, 0.45))
          drop-shadow(0 0 12px rgba(24, 20, 16, 0.18));
}
```

> Source: W3C Filter Effects §6.1 (`drop-shadow()`), MDN
> [`feDropShadow`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDropShadow),
> and the existing pattern in `css/loader.css:659-661`.

---

## Layering multiple filters — the pipeline pattern

SVG filters are a **graph of primitive operations** chained through
named `result` buffers. The MDN SVG filters guide
(<https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters>)
demonstrates the canonical pattern with a six-step 3D-lighting drop
shadow, which is worth studying because the same shape works for
every "rich" effect:

```
1. feGaussianBlur in="SourceAlpha"  →  result="blur"
2. feOffset      in="blur"           →  result="offsetBlur"
3. feSpecularLighting in="blur"      →  result="specOut"
   (uses a child fePointLight / feDistantLight / feSpotLight)
4. feComposite   in="specOut" in2="SourceAlpha"
                 operator="in"       →  result="specOut"   // mask to source shape
5. feComposite   in="SourceGraphic" in2="specOut"
                 operator="arithmetic" k1="0" k2="1" k3="1" k4="0"
                                      →  result="litPaint" // multiply lighting over colour
6. feMerge                            // stack
   feMergeNode in="offsetBlur"        // shadow
   feMergeNode in="litPaint"          // lit object
```

**Three rules to remember:**

1. `in="SourceAlpha"` and `in="SourceGraphic"` are the only inputs that
   are *implicit* (no preceding `result` needed).
2. Any primitive with no explicit `in` reads from the previous
   primitive's output — but be explicit anyway, for clarity.
3. **`feComposite operator="arithmetic"` with `k1..k4`** is the
   formula `result = k1·i1·i2 + k2·i1 + k3·i2 + k4`. This is the
   "mix" operation that lets you scale and offset two images.
   See MDN `<feComposite>`.

---

## Performance: what is cheap, what is expensive

> **Authoritative source:** web.dev "How to create high-performance CSS
> animations" (<https://web.dev/articles/animations-guide>) by Kayce
> Basques and Rachel Andrew. The rule: **only animate `transform` and
> `opacity` on the compositor**. Everything else, including changing a
> `filter` value or a `background-image`, triggers paint or layout.

### Per-primitive cost (W3C spec implies, MDN + browser source confirms)

| Primitive | Cost on a 1080p tile | Notes |
|---|---|---|
| `feTurbulence` | O(pixels × octaves) | **CPU-only** in Chromium and Firefox today. The single most expensive texture primitive. Tile small. |
| `feGaussianBlur` | O(pixels × σ²) | GPU-accelerated in all engines when `stdDeviation` ≤ ~10. Above that, falls back to CPU. |
| `feDisplacementMap` | O(pixels) | Often CPU. Tile and resample carefully. |
| `feColorMatrix` | O(pixels) | GPU-friendly (matrix multiply). Essentially free. |
| `feConvolveMatrix` | O(pixels × order²) | Linear scaling with kernel size. `order="3"` is fine, `order="7"` is heavy. |
| `feMorphology` | O(pixels × radius²) | Cheap; radius usually ≤ 2 in practice. |
| `feComposite` / `feBlend` / `feMerge` | O(pixels) | All GPU-friendly. |
| `feDiffuseLighting` / `feSpecularLighting` | O(pixels × kernel²) | Often CPU. The big lighting primitives are expensive; reserve them for logos and small accents, not whole-page textures. |
| `feFlood` | O(pixels) | Trivial. |
| `feDropShadow` (CSS) | Same as `feGaussianBlur` + offset | GPU-accelerated. |

### Practical rules for SAC

1. **Tile small.** All existing `--paper-*` tokens use ≤ 320×320 tiles.
   Keep the new ones in the same range so the browser only runs the
   filter on a few hundred KB of pixels, not a full-viewport background.
2. **Use `color-interpolation-filters="sRGB"`** at the top of every
   filter. Without it, browsers run the filter in linear RGB which is
   perceptually wrong for paper textures (and slower on some engines).
   Confirmed in W3C §10.
3. **Cache the filter region.** When you reuse a `<filter>` definition
   across many elements via `filter: url(#same-id)`, browsers cache
   the rasterised result. This is why `loader.css:659-661` uses two
   *layered* `drop-shadow()` calls on the same element — cheap, and
   composited together.
4. **Animate `opacity` and `transform`, not the filter.** If you want
   a "page reveals" effect, use `clip-path: inset(0 0 100% 0)` and
   animate `clip-path` (this is what `loader.css:668-671` already
   does) — not a filter swap.
5. **Beware `feTurbulence` on huge surfaces.** A 1920×1080 noise
   generated live is the single most expensive thing you can do.
   Always tile. The `--paper-grain` 160×160 tile is correct.

### Hardware acceleration: the official CSS filter answer

CSS's own set of filter functions (`blur()`, `drop-shadow()`, `grayscale()`,
etc.) — listed at <https://css-tricks.com/almanac/properties/f/filter/>
— are GPU-accelerated in every modern engine. For the *common* cases
(blur, shadow, colour shift), prefer the CSS function over an SVG
filter; use SVG filters when you need primitives that CSS doesn't
expose (`feTurbulence`, `feDisplacementMap`, `feSpecularLighting`,
`feDiffuseLighting`, `feConvolveMatrix`, `feMorphology`).

---

## Browser support and Safari quirks

Source: <https://caniuse.com/svg-filters>, captured May 2026.

| Browser | SVG filters support |
|---|---|
| Chrome 8+ | ✅ Full |
| Firefox 3+ | ✅ Full |
| Safari 6+ (desktop and iOS) | ✅ Full |
| Edge 12+ | ✅ Full |
| Opera 9+ | ✅ Full |
| IE 10, 11 | ✅ Full |
| IE 5.5–9 | ❌ None |
| Safari 3.1–5.1 | ❌ None |
| Chrome 4 | ❌ None |
| Chrome 5–7 | ◐ Partial |
| **Global usage** | **96.57 %** |

### Safari-specific quirks (worth knowing)

- **`feDisplacementMap` is one of the slower primitives in Safari.**
  Apple has not GPU-accelerated it on all hardware. Keep `scale`
  modest (≤ 25 for visual effects; ≤ 10 for animation).
- **Safari renders `feTurbulence` at a slightly different default
  octaves interpretation** when `stitchTiles="stitch"` is omitted —
  always set `stitchTiles="stitch"` explicitly on tiled noise to
  avoid visible seams at tile edges (MDN `<feTurbulence>`).
- **`color-interpolation-filters="sRGB"` is required for predictable
  colours in Safari.** The default is `linearRGB`, which makes paper
  tints look noticeably off on macOS. W3C §10 confirms Safari and
  Chrome differ on this default.
- **`feDropShadow`** (the SVG element) was added later than the CSS
  `drop-shadow()` function and has historically had inconsistent
  behaviour in older Safari; **prefer the CSS `drop-shadow()`
  function** when you don't need to compose it with other SVG
  primitives. Source: caniuse `<feDropShadow>`.
- **No `BackgroundImage` source.** Modern browsers cannot use the
  pixels under a filtered element as input to the filter. This is
  why MDN's `<feComposite>` example uses an `<feImage>` workaround.
  Implication for SAC: when stacking texture overlays, use **CSS
  `background-image` layers**, not SVG `feImage` references to the
  underlying DOM.
- **Security restrictions:** W3C §15 specifies that `feDisplacementMap`
  cannot sample cross-origin images, `feImage` is origin-restricted,
  and `feFlood` + cross-origin compositions are blocked. None of
  this affects us (everything is inline data URI) but it matters if
  we ever reference an external PNG for a filter.

---

## SVG filters vs canvas-generated textures — trade-offs

| Dimension | SVG filters (current SAC pattern) | Canvas-generated textures |
|---|---|---|
| **File size** | Inline `<svg>` data URI: 0.5–4 KB per tile, fully cached | PNG export: 5–50 KB per tile, plus the JS that generates it |
| **Asset pipeline** | None. Edit `variables.css`, save, done. | Requires build step (sharp, ImageMagick, node-canvas, headless Chrome) or runtime `toDataURL()` |
| **Determinism** | 100 % deterministic across browsers and OS | `feTurbulence` differs slightly per engine (above); Canvas noise is engine-agnostic |
| **Runtime cost** | Recomputed on first paint of every element unless cached | Generated once at build, browser just blits |
| **Authenticity** | Procedural — never "as good as" a real photograph | Photographic — much more authentic, especially for fibre/tea-stain |
| **Animation** | Can animate any attribute (`seed`, `baseFrequency`, `scale`) | Frozen; would need to regenerate |
| **Print-quality zoom** | Vector tile: sharp at any zoom | Pixel tile: blurs above native size |
| **Reproducibility / git history** | Plain CSS, easy diff | Binary blobs in git or build artefacts |
| **Failure mode** | If filter is invalid, the browser silently draws the unfiltered source | If image is missing, you see an empty box |

### When to reach for canvas instead

- The texture is **photographic** — a real scanned piece of newsprint,
  a real rust spot, a real ink splotter. SVG cannot synthesise that
  level of authentic randomness.
- The texture is **truly tileable at large sizes** (e.g. a 1024×1024
  seamlessly-tiling paper grain). Building a seamless tile in
  `feTurbulence` is fiddly; doing it in canvas with `putImageData` and
  edge-blending is straightforward (MDN Canvas pixel-manipulation
  guide).
- The texture is **fixed and unchanging** across the entire site —
  export once, ship as PNG/JPG, and the browser caches it for free.
  This is what almost every production newspaper site does for the
  hero paper texture.

**For SAC today, SVG is the right choice.** The site is hand-edited,
no build step, all-static, and the existing tokens already encode
that decision. Switch to canvas only when a specific effect proves
impossible to get from SVG.

---

## Recommendations for the SAC site

Concrete upgrades to the existing `--paper-*` tokens, in priority
order. **None of these require modifying HTML or JS** — they only
touch `css/variables.css` (and optionally `loader.css`).

1. **Upgrade `--paper-grain`** to the 4.1 recipe above
   (`baseFrequency="0.9"`, two octaves, warm tint, `mix-blend-mode:
   multiply`). Same 160×160 tile, much more fibre-like.
2. **Upgrade `--paper-fold-crease`** to the 4.4 recipe (add
   `feDisplacementMap` + `feGaussianBlur`). The current flat gradient
   looks computer-generated; the new one reads as a real fold.
3. **Replace `--paper-coffee-stain`** with the 4.5 recipe (double
   `feDisplacementMap` with warped warp). One of the highest-impact
   improvements; the ring will look hand-made instead of stamped.
4. **Upgrade `--paper-edge-wear`** to the 4.6 recipe (add
   `feTurbulence` multiplied with the radial gradient).
5. **Add `--paper-ink-bleed`** for use on `<h1>`, `<h2>`, drop caps
   (recipe 4.3). Apply via `filter: url(#ink-bleed)` on the
   typographic element.
6. **Add `--paper-embossed`** (recipe 4.7) for use on the SAC seal
   and any text you want to feel letterpressed. **Cost warning:**
   `feDiffuseLighting` is the most expensive primitive in this doc —
   keep the element small.
7. **Add `--paper-aged`** (recipe 4.11) as a class `.aged` for
   "from-the-archive" sections. Pure `feColorMatrix`, GPU-cheap.
8. **Keep all existing CSS `filter:` calls** (the brightness, blur,
   grayscale, contrast, drop-shadow uses in `loader.css`,
   `home.css`, `main.css`). They are GPU-accelerated and correct.

**Don't change** the inline `filter: drop-shadow(...)` calls in
`loader.css:659-661`. They are the canonical CSS pattern and there's
nothing to improve.

---

## Appendix A — quick cookbook (copy-paste)

All recipes are SVG. Inline them as `data:image/svg+xml;utf8,<svg …>`,
remembering to URL-encode `#` as `%23` and quotes as `%22` if you use
double-quote attributes.

```css
:root {
  /* existing tokens preserved */
  --paper-grain:        url("data:image/svg+xml;utf8,…grain…");
  --paper-halftone:     url("data:image/svg+xml;utf8,…halftone…");
  --paper-fold-crease:  url("data:image/svg+xml;utf8,…crease…");
  --paper-coffee-stain: url("data:image/svg+xml;utf8,…stain…");
  --paper-edge-wear:    url("data:image/svg+xml;utf8,…wear…");

  /* new tokens proposed in §Recommendations */
  --paper-ink-bleed:    url("data:image/svg+xml;utf8,…ink-bleed…");
  --paper-streak:       url("data:image/svg+xml;utf8,…streak…");
  --paper-aged:         url("data:image/svg+xml;utf8,…aged…");
}
```

For the `<filter>` recipes in §4.3, §4.7, §4.8, §4.10, §4.11 (which
need to read `SourceGraphic` / `SourceAlpha`), put the `<filter>` in
an inline `<svg>` at the top of `index.html` (or in a hidden
`<div>`), give it an `id`, and reference with `filter: url(#id)`.

```html
<!-- inside <body>, before any element that uses the filter -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="ink-bleed" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="0.4"/>
      <feGaussianBlur stdDeviation="0.6" result="halo"/>
      <feComposite in="halo" in2="SourceAlpha" operator="in" result="ring"/>
      <feFlood flood-color="#0a0a0a" flood-opacity="0.55"/>
      <feComposite in2="ring" operator="in" result="ring-dark"/>
      <feMerge>
        <feMergeNode in="ring-dark"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
</svg>
```

```css
.headline { filter: url(#ink-bleed); }
```

> This is the pattern MDN explicitly recommends in the `<feMorphology>`
> "Filtering HTML content" example
> (<https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feMorphology>).
