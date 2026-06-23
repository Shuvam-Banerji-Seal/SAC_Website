# CSS Paper Texture Techniques

A reference for building convincing paper surfaces — grain, fiber, ink soak, edge wear, and translucency — using only CSS and inline SVG. Every technique below runs in the browser without image assets, so the same source file scales infinitely and themes through custom properties.

## Overview

The browser ships with a small but unusually expressive toolkit for simulating fibrous substrates. None of these primitives are paper-specific; the craft is in **composition** — stacking gradients, blending modes, filters, masks, and noise until the flat rectangle stops reading as a div.

The eight building blocks used throughout this document:

| # | Primitive                  | Primary role                                   |
|---|----------------------------|------------------------------------------------|
| 1 | Gradients (4 flavors)      | Directional grain, fiber striations, vignetting |
| 2 | `mix-blend-mode`           | Tonal interaction between overlapping elements  |
| 3 | `background-blend-mode`    | Tonal interaction between stacked backgrounds    |
| 4 | `filter`                   | Aging, softening, color drift                    |
| 5 | `mask-image` / `mask-mode` | Edge wear, tears, feathered borders              |
| 6 | `backdrop-filter`          | Translucent stack behavior                       |
| 7 | SVG `feTurbulence`         | Organic, animation-friendly noise                |
| 8 | `@property`                | Typed, animatable custom properties              |

A finished paper is almost never one technique. It is two gradients (base + grain), an SVG noise layer with `background-blend-mode`, an `::after` overlay with `mix-blend-mode: multiply` for fiber shadows, and a masked edge. The sections below show how each piece fits.

### A reading note on "authentic" paper

Real paper has three spatial frequencies:

- **Macro** — color, fiber direction, deckle edges, watermarks.
- **Meso** — mottling, stains, age spots, fold creases.
- **Micro** — pulp grain, ink absorption halos, tooth roughness.

CSS can hit all three. Macro through base gradients and masks. Meso through `radial-gradient` stains and `filter: contrast`. Micro through `feTurbulence` and high-frequency `repeating-linear-gradient`. Conflating the three is what makes most "paper" look like wallpaper.

---

## 1. Gradients

Gradients are the cheapest, fastest, most deterministic layer. Use them for the **macro** signal — color, direction, soft shading — and let noise handle the rest.

### Linear gradient — fiber striations

A long, thin, semi-transparent stripe repeated along an axis reads as fiber. The trick is a near-zero alpha and a hue only a few points off the base.

```css
.kraft {
  background:
    repeating-linear-gradient(
      90deg,
      rgba(80, 50, 25, 0.04) 0 1px,
      transparent 1px 4px
    ),
    linear-gradient(180deg, #c9a575 0%, #b88f5a 100%);
  background-blend-mode: multiply, normal;
}
```

Notes:

- `1px` wide stripes at `4px` pitch simulate pulp alignment on a Fourdrinier wire.
- The second gradient in the stack supplies the body color; `background-blend-mode` multiplies the striations into it.
- `90deg` gives horizontal fiber; switch to `0deg` for cross-grain.

### Radial gradient — age spots and vignette

```css
.parchment-base {
  background:
    radial-gradient(circle at 30% 20%, rgba(120, 80, 30, 0.18), transparent 35%),
    radial-gradient(circle at 75% 80%, rgba(90, 60, 20, 0.14), transparent 40%),
    radial-gradient(ellipse at center, #f4e7c8 0%, #e6d3a4 100%);
}
```

The two small circles read as foxing (age spots). They are placed asymmetrically because symmetric stains look painted. The ellipse supplies the body color and a soft fall-off toward the edges.

For a darker, more dramatic vignette, swap the inner stop:

```css
radial-gradient(ellipse at center, transparent 55%, rgba(60, 40, 15, 0.35) 100%)
```

### Conic gradient — directional pulp flow

`conic-gradient` rotates around a point, which is useful for watermarks and faint iridescence on vellum.

```css
.vellum-watermark {
  background:
    conic-gradient(
      from 210deg at 50% 50%,
      rgba(255, 255, 255, 0)   0deg,
      rgba(255, 255, 255, 0.08) 60deg,
      rgba(255, 255, 255, 0)   120deg,
      rgba(255, 255, 255, 0.06) 240deg,
      rgba(255, 255, 255, 0)   360deg
    );
}
```

Place this as the topmost layer over the base vellum with `mix-blend-mode: overlay` and the marks only appear where the gradient intersects mid-tones.

### Repeating linear gradient — ruled paper and halftone beds

For ruled notebook paper, the gap between rules should match the line-height you intend to print. For halftone beds (newsprint), use a small pitch and a hard color stop.

```css
.ruled-paper {
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0 31px,
      rgba(80, 120, 200, 0.35) 31px 32px
    ),
    #fbfaf6;
}

.newsprint-halftone {
  background:
    repeating-linear-gradient(
      45deg,
      rgba(40, 40, 40, 0.08) 0 1px,
      transparent 1px 3px
    ),
    #ececec;
}
```

The 45° on the halftone read aligns with how ink dots tile in offset printing.

### Stacking order

When stacking more than two gradients, **bottom-up**:

1. Body color (always last in source order so it sits on top in paint order? — see note).
2. Macro pattern (vignette, fiber direction).
3. Micro pattern (high-frequency grain).

The order in the `background` shorthand is *top to bottom* in paint order — the first listed gradient paints on top of the later ones. This trips people up constantly.

```css
/* Correct: vignette on top of body */
background:
  radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.25)),
  #f4e7c8;
```

---

## 2. `mix-blend-mode`

`mix-blend-mode` controls how one element composites onto what is *behind it in the stacking context*. For paper, the workhorse is `multiply` because ink darkens paper.

| Blend mode   | Visual effect on a paper stack                         |
|--------------|--------------------------------------------------------|
| `multiply`   | Darkens. Ink, fiber shadow, charcoal smudge.           |
| `screen`     | Lightens. Highlight from below, vellum sheen.          |
| `overlay`    | Pushes mid-tones out. Aggressive — use sparingly.      |
| `soft-light` | Gentle push. Best for fiber direction shading.         |
| `color-dodge`| Hot spots, paper thinning under light.                |
| `color-burn` | Stains, burns, scorch marks.                           |
| `darken`     | Picks the darker pixel. Good for ink "on top".         |

### A reusable fiber-shadow overlay

```css
.paper {
  position: relative;
  isolation: isolate;        /* contain the blend */
  background: #efe6cf;
}
.paper::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      92deg,
      transparent 0 6px,
      rgba(60, 40, 10, 0.05) 6px 7px
    );
  mix-blend-mode: multiply;
  pointer-events: none;
}
```

`isolation: isolate` is important. Without it the blend will escape the element and interact with the page beneath, which is almost never what you want for paper.

### Ink-on-paper

Text printed on rough paper is not pure black — it darkens the substrate and picks up the texture. A simple way to get this with HTML text:

```html
<div class="printed">
  <h2>EXTRA</h2>
  <p>...</p>
</div>
```

```css
.printed { color: #1a1a1a; }
.printed h2 {
  mix-blend-mode: multiply;
  /* Push the headline slightly into the page */
  filter: contrast(1.05);
}
```

For a heavier "cheap paper" feel, put a translucent dark layer over the entire article and blend it in:

```css
.printed::after {
  content: "";
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.08);
  mix-blend-mode: multiply;
  pointer-events: none;
}
```

---

## 3. `background-blend-mode`

Where `mix-blend-mode` operates across DOM elements, `background-blend-mode` operates across the **layers of one element's background**. The syntax is one blend mode per layer, comma-separated.

```css
background:
  url("noise.svg") center / 240px,
  radial-gradient(at 30% 20%, rgba(120,80,30,.2), transparent 40%),
  #f4e7c8;
background-blend-mode: overlay, multiply, normal;
```

Reading order:

- `noise.svg` blends with `overlay` against the layer below it.
- That combined result blends with `multiply` against the gradient.
- The gradient blends with `normal` against the base color.

If you have **N** background layers, you need **N** blend modes. The last blend mode is essentially always `normal` because the last layer is the paint below everything else.

### Common recipes

**Old letter with mottled ink:**

```css
background:
  radial-gradient(circle at 70% 30%, rgba(40,20,0,.25), transparent 40%),
  repeating-linear-gradient(0deg, rgba(80,50,20,.06) 0 1px, transparent 1px 3px),
  #f1e3c1;
background-blend-mode: multiply, multiply, normal;
```

**Vellum with watermark:**

```css
background:
  conic-gradient(from 200deg, rgba(255,255,255,.15), transparent 60%),
  url("vellum-noise.svg"),
  #f7f1e1;
background-blend-mode: overlay, soft-light, normal;
```

`soft-light` on the noise keeps the watermark from over-pushing.

---

## 4. `filter`

`filter` chains from left to right. Each function is applied to the result of the previous one, so order matters.

### Aging chain

A useful default for a paper that should look like it has been in a drawer for forty years:

```css
.aged {
  filter: sepia(0.35) contrast(1.08) brightness(0.97) saturate(0.85);
}
```

- `sepia(0.35)` — yellows the whites. Below `0.2` is invisible; above `0.6` looks like a sepia filter on Instagram.
- `contrast(1.08)` — restores snap lost to the sepia.
- `brightness(0.97)` — pulls the highlights down a hair.
- `saturate(0.85)` — desaturates any chroma left in the substrate.

### Softening grain

After stacking a noise layer you may find it too sharp. A tiny blur before contrast gives the noise a *felt* quality rather than a *pixel* quality:

```css
background: url("noise.svg");
filter: blur(0.4px) contrast(1.2);
```

The `contrast` after the `blur` recovers the lost bite. This pair is one of the most useful tricks in the entire document.

### Edge shadow

For a page sitting on a darker desk:

```css
.page {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25))
          drop-shadow(0 12px 24px rgba(0,0,0,0.15));
}
```

`drop-shadow` follows the alpha channel of the element, so it correctly traces a torn or feathered edge — unlike `box-shadow` which always paints a rectangle.

### Hue rotation for color drift

Different paper ages to different hues: newspaper yellows toward `38deg`, kraft reddens, vellum darkens toward brown.

```css
.newspaper-yellowed { filter: sepia(0.5) hue-rotate(-8deg); }
.kraft-aged         { filter: sepia(0.4) hue-rotate(10deg); }
.vellum-aged        { filter: sepia(0.25) hue-rotate(-4deg); }
```

### Filtering performance

Every `filter` chain creates a new stacking context and a backing buffer. For a full-bleed background this is one offscreen surface — fine. For a long scrollable list of filtered cards it can cost a frame. See **Performance pitfalls**.

---

## 5. `mask-image` and `mask-mode`

Masks cut the element by the alpha (or luminance) of an image. They are the only good way to get feathered, torn, or burnt edges in pure CSS.

### `mask-mode`

```css
mask-mode: alpha;       /* default — uses image alpha */
mask-mode: luminance;   /* uses image brightness; black = hidden */
mask-mode: match-source;/* honors the source type */
```

For paper, `luminance` is often more controllable because you can author the mask as a grayscale gradient without an alpha channel.

### Soft inner feather

A page that fades to transparent at its edges:

```css
.paper {
  mask-image: radial-gradient(ellipse at center, #000 70%, transparent 100%);
  mask-mode: luminance;
}
```

This is the same trick that vignette gradients use, but applied to the element's *visibility* instead of its color. The page literally disappears at the edges, which is how real aged paper behaves under raking light.

### Torn deckle edge with SVG

Embed an SVG with irregular alpha and use it as a mask:

```html
<div class="deckle"></div>
```

```css
.deckle {
  width: 600px; height: 400px;
  background: #efe2bf;
  mask-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>\
  <filter id='r'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3' seed='7'/>\
    <feDisplacementMap in='SourceGraphic' scale='14'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#r)'/>\
</svg>");
  mask-mode: luminance;
}
```

The `feTurbulence` + `feDisplacementMap` pair generates an irregular border. Save it as a separate file or inline it as a data URI as shown.

### Burnt corner

```css
.burnt-corner {
  mask-image:
    radial-gradient(circle at 0% 0%, transparent 0 18%, #000 35%),
    linear-gradient(#000, #000);
  mask-composite: subtract;     /* punch one out of the other */
}
```

`mask-composite` lets you stack masks subtractively, additively, or intersectively. Browser support is good in modern Chromium and Safari; Firefox added support more recently.

### Vendor prefix

For older WebKit:

```css
-webkit-mask-image: ...;
mask-image: ...;
```

---

## 6. `backdrop-filter`

`backdrop-filter` is a `filter` that runs against what's behind the element rather than the element itself. For paper, the headline use is **translucent layers**: a sheet of vellum that picks up the color of the surface beneath it.

```css
.vellum-sheet {
  background: rgba(255, 250, 235, 0.55);
  backdrop-filter: blur(6px) saturate(0.9);
}
```

A sheet of vellum is not white — it is a slightly cloudy layer that softens what shows through. `blur(6px)` plus a touch of `saturate` is the closest CSS gets to this. Below `4px` blur looks like a glass panel; above `12px` loses the paper reading entirely.

### Stacking translucent sheets

For a multi-page stack (a newspaper spread, a layered map), each page gets its own `backdrop-filter`. The result reads as cumulative scatter, which is what real paper stacks do.

```css
.stack > * {
  background: rgba(255, 252, 240, 0.7);
  backdrop-filter: blur(2px) brightness(1.02);
}
.stack > * + * {
  margin-top: -90%;
  transform: rotate(-1.2deg);
}
```

The negative margin and tiny rotation are unrelated to the filter but they sell the stack — the blur is doing optical work, the rotation is doing compositional work.

### Caveat

`backdrop-filter` forces a new stacking context and a backing surface. Avoid applying it to large scrolling regions. Limit it to small, fixed-size overlays.

---

## 7. SVG `feTurbulence` + `feColorMatrix`

The single most useful SVG primitive for paper. `feTurbulence` generates Perlin-style noise directly in the renderer; `feColorMatrix` re-tints it. Together they produce a tileable grain you can use as a background.

### Minimal noise as a data URI

```html
<style>
  .grain {
    background-color: #f1e3c1;
    background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>\
  <filter id='n'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/>\
    <feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 0.18 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#n)'/>\
</svg>");
    background-blend-mode: multiply;
  }
</style>
```

Decoding the `feColorMatrix` row by row — each row is `R G B A` output coefficients for the input `R G B A 1`:

- Row 1 outputs `R = 0.25` — fixed warm-dark red channel.
- Row 2 outputs `G = 0.18` — fixed warm-dark green.
- Row 3 outputs `B = 0.08` — fixed warm-dark blue.
- Row 4 outputs `A = 0.18 × inputA` — modulates the alpha by the input alpha, so transparent noise pixels stay transparent.

The result is a fixed brown tint whose alpha varies with the noise. When `background-blend-mode: multiply` runs against the body color, the variation reads as grain.

### `baseFrequency` cheat sheet

| Value        | Effect                                     |
|--------------|--------------------------------------------|
| `0.01 – 0.05`| Large, soft clouds. Stains, watermarks.    |
| `0.1 – 0.4`  | Mottling, dye variation, paper pulp.       |
| `0.6 – 1.5`  | Fine grain. Tooth roughness, ink halos.    |
| `> 2`        | Speckle. Use only for halftone-style noise.|

### `numOctaves` and detail

`numOctaves` controls how many octaves of noise are summed. Each octave doubles the frequency and halves the amplitude. Two octaves reads as paper. Four reads as a stormy sky. Six reads as electricity.

### `seed`

The `seed` attribute changes the noise field deterministically. Use a small set of seeds and cycle them — different papers should not share a seed or they will look related.

### Tileable noise

If the noise rect is `240×240`, repeating it with `background-repeat` is fine because `feTurbulence` is computed once over the whole rect — there are no seams at tile boundaries. You can verify this by changing the tile size; the pattern is the same.

### Animating noise

```css
@keyframes drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(-240px, 0); }
}
.grain { animation: drift 60s linear infinite; }
```

Translate the layer by exactly its tile width to keep the loop seamless. Slower than 60s reads as living paper; faster reads as TV static.

---

## 8. `@property`

`@property` registers a custom property with a type and inheritance behavior. The killer feature is that typed custom properties can be **animated by interpolation**, even when the underlying value would normally not be animatable (a string, for example).

### Animated vignette strength

```css
@property --vignette {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 0%;
}

.paper {
  background:
    radial-gradient(ellipse at center, transparent var(--vignette), rgba(0,0,0,0.4) 100%),
    #f1e3c1;
  transition: --vignette 600ms ease;
}
.paper:hover {
  --vignette: 30%;
}
```

Without `@property`, hovering would snap because the browser cannot interpolate `transparent` to `transparent` as a function of `var(--vignette)` — it can only swap a string. With the registration, the engine knows `--vignette` is a percentage and tweens it.

### Animated filter chain

```css
@property --age {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}

.paper {
  filter: sepia(calc(var(--age) * 0.5))
          contrast(calc(1 + var(--age) * 0.1))
          saturate(calc(1 - var(--age) * 0.2));
  transition: --age 800ms ease;
}
.paper.old { --age: 1; }
```

This lets a "fresh" sheet age into a "decades-old" sheet on hover or scroll, all in pure CSS.

### Browser support

`@property` is supported in Chromium and Safari. Firefox added it later than other typed-CSS features — check before relying on it for a critical effect.

---

## Paper Type Gallery

Each paper type below is a complete, drop-in example. They share the same architecture (base color, fiber gradient, noise overlay, edge treatment) and differ only in the parameters.

### Parchment

Animal-skin parchment is irregular, translucent in thin areas, with a slightly mottled cream color. The visual signature is **soft, low-frequency mottling** plus a faint **directional fiber** that runs with the original skin grain.

```html
<div class="parchment">
  <p>... medieval text ...</p>
</div>
```

```css
.parchment {
  position: relative;
  isolation: isolate;
  padding: 3rem 2.5rem;
  background:
    /* soft mottling — large low-frequency noise */
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>\
  <filter id='p'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' seed='11'/>\
    <feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.38  0 0 0 0 0.22  0 0 0 0.12 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#p)'/>\
</svg>"),
    /* foxing spots */
    radial-gradient(circle at 22% 18%, rgba(120, 70, 20, 0.22), transparent 18%),
    radial-gradient(circle at 78% 64%, rgba(100, 60, 15, 0.18), transparent 22%),
    radial-gradient(circle at 50% 90%, rgba(80, 50, 10, 0.14), transparent 25%),
    /* body */
    radial-gradient(ellipse at center, #f6e9c8 0%, #e8d6a4 100%);
  background-blend-mode: multiply, multiply, multiply, multiply, normal;
  color: #2b1d08;
}

.parchment::after {
  content: "";
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(
      88deg,
      transparent 0 7px,
      rgba(70, 45, 15, 0.04) 7px 8px
    );
  mix-blend-mode: multiply;
  pointer-events: none;
}

.parchment {
  /* worn edges */
  mask-image: radial-gradient(ellipse at center, #000 75%, transparent 100%);
  mask-mode: luminance;
}
```

The `88deg` fiber angle is a deliberate imperfection — straight `90deg` looks like ruled paper.

### Newsprint

Newsprint is **high-contrast monochrome on rough, off-white stock**. The signature is a visible **fiber/halftone bed** under the ink and a **slight yellowing** from lignin oxidation.

```css
.newsprint {
  position: relative;
  isolation: isolate;
  padding: 2rem;
  background:
    /* halftone-ish diagonal */
    repeating-linear-gradient(
      45deg,
      rgba(40, 40, 40, 0.05) 0 1px,
      transparent 1px 3px
    ),
    /* fine grain */
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>\
  <filter id='n'>\
    <feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='5'/>\
    <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.13 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#n)'/>\
</svg>"),
    #ececec;
  background-blend-mode: multiply, multiply, normal;
  color: #111;
  filter: sepia(0.25) contrast(1.12);
}

.newsprint::after {
  content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 60%, rgba(60, 50, 30, 0.18) 100%);
  mix-blend-mode: multiply;
  pointer-events: none;
}
```

The `baseFrequency='1.2'` is much higher than the parchment example — newsprint has a much finer tooth. The body color is a desaturated gray rather than cream because cheap newsprint is rarely warm-white.

For the ink-soak halo around bold headlines, see the **Ink bleed** section of the related documents in this directory.

### Kraft

Kraft paper is **brown, fibrous, and stiff-looking**. The fiber is coarser than parchment, more horizontal, and there is usually visible **directionality** from the pulping screen.

```css
.kraft {
  position: relative;
  isolation: isolate;
  padding: 2.5rem;
  background:
    /* long horizontal fiber */
    repeating-linear-gradient(
      90deg,
      transparent 0 5px,
      rgba(60, 35, 10, 0.07) 5px 6px
    ),
    /* coarse grain */
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>\
  <filter id='k'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.35' numOctaves='3' seed='9'/>\
    <feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.25  0 0 0 0 0.1  0 0 0 0.22 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#k)'/>\
</svg>"),
    /* body */
    linear-gradient(180deg, #c89a64 0%, #a87a48 100%);
  background-blend-mode: multiply, multiply, normal;
  color: #2a1a08;
}

.kraft::after {
  content: "";
  position: absolute; inset: 0;
  background:
    /* subtle horizontal "wire" striations */
    repeating-linear-gradient(
      90deg,
      rgba(80, 50, 20, 0.05) 0 1px,
      transparent 1px 12px
    );
  mix-blend-mode: multiply;
  pointer-events: none;
}
```

Two stacked fiber gradients (one tight, one wide) sell the **multi-scale** pulp structure — kraft in particular looks wrong if the fiber is only at one scale.

### Vellum

Modern vellum (the writing paper, not the animal skin) is **smooth, pale, slightly translucent**. It has very subtle tooth and reads as nearly white until you put it next to paper that is whiter.

```css
.vellum {
  position: relative;
  isolation: isolate;
  padding: 2rem;
  background:
    /* watermark */
    conic-gradient(
      from 215deg at 50% 50%,
      transparent 0deg,
      rgba(255, 255, 255, 0.15) 40deg,
      transparent 80deg,
      rgba(255, 255, 255, 0.1) 200deg,
      transparent 240deg,
      rgba(255, 255, 255, 0.13) 320deg,
      transparent 360deg
    ),
    /* very fine grain */
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>\
  <filter id='v'>\
    <feTurbulence type='fractalNoise' baseFrequency='2.0' numOctaves='1' seed='2'/>\
    <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#v)'/>\
</svg>"),
    #fafaf4;
  background-blend-mode: overlay, multiply, normal;
  color: #1a1a1a;
}
```

Three details matter:

- The conic gradient is the **watermark**. `overlay` blend mode makes it visible only against mid-tones, so it disappears against pure black text — which is what real watermarks do.
- The grain is almost invisible (`alpha 0.06`). Push higher and vellum starts to look like newsprint.
- The base is nearly white (`#fafaf4`) because vellum is bright. The other papers sell themselves with color; vellum sells itself with restraint.

### Side-by-side palette

| Paper       | Body          | Fiber alpha | Grain frequency | Vignette |
|-------------|---------------|-------------|-----------------|----------|
| Parchment   | `#f6e9c8` → `#e8d6a4` | `0.04`      | `0.012`         | soft     |
| Newsprint   | `#ececec`     | `0.05`      | `1.2`           | medium   |
| Kraft       | `#c89a64` → `#a87a48` | `0.07`      | `0.35`          | none     |
| Vellum      | `#fafaf4`     | none        | `2.0`           | none     |

---

## Layering Strategy

A reliable order for the **whole element stack** (DOM + pseudo-elements):

```
┌──────────────────────────────────────────────┐
│ ::before — fiber direction / halftone bed    │   mix-blend-mode: multiply
├──────────────────────────────────────────────┤
│ ::after  — vignette / edge wear / mask soft  │   mix-blend-mode: multiply
├──────────────────────────────────────────────┤
│ element background — base color + gradients  │   background-blend-mode
│                          + feTurbulence noise│
├──────────────────────────────────────────────┤
│ content — text, images                      │
└──────────────────────────────────────────────┘
```

### Why this order

- The **base background** carries the body color and the noise. Putting noise in the base layer means it composites correctly with the body color through `background-blend-mode` — no extra DOM needed.
- The **::after pseudo-element** is the right home for an **edge wear overlay** because it can use `mix-blend-mode: multiply` against the noise-and-color stack below. It is also the natural place to attach `mask-image` if the page is being feathered.
- The **::before pseudo-element** is the right home for the **fiber direction** layer. Putting fiber on `::before` lets you change it independently of the noise — useful for switching from "kraft horizontal" to "parchment oblique" with a single class swap.

### Stacking-context hygiene

Each blend mode creates an implicit stacking context. When you stack a lot of them, the browser ends up painting into multiple offscreen buffers, which is expensive. Two rules help:

1. Use **`isolation: isolate`** on the parent. This confines descendant blends to the paper's own stacking context instead of leaking onto the page below.
2. Prefer **`background-blend-mode`** for things that are part of the element's paint, and **`mix-blend-mode`** only for things that need to live in their own DOM node.

### Multi-page spreads

For a newspaper spread (two facing pages), treat the spread as a flex container and each page as a paper element:

```html
<div class="spread">
  <article class="page left">...</article>
  <article class="page right">...</article>
</div>
```

```css
.spread {
  display: flex;
  gap: 2px;             /* the gutter */
  background: #2a2a2a;  /* the desk */
}
.page {
  flex: 1;
  /* full paper recipe */
}
```

The dark gap between pages is the **gutter shadow**. It costs nothing and reads as a fold.

### Composing with masks

To put torn edges on top of a multi-layer background, the mask must apply to the **whole element**, not to one layer. That means putting `mask-image` on the paper element itself, not on `::after`:

```css
.paper {
  /* ... full background stack ... */
  mask-image: url("deckle.svg");
  mask-mode: luminance;
}
.paper::after { /* vignette overlay still works */ }
```

The mask multiplies against the alpha of the element, so it cuts through the `::after` overlay as well. Apply the mask last in the cascade to be sure.

---

## Performance Pitfalls

CSS paper is cheap *in principle*. In practice, several common patterns are frame-killers on long pages or mobile.

### 1. Filter on scrolling content

`filter` and `backdrop-filter` force the browser to allocate a backing buffer and re-rasterize on scroll. A full-page paper background with a `filter` chain will stutter on low-end phones.

**Fix**: put the filtered paper on a **fixed-position background layer** so it does not repaint with scroll.

```css
.paper-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  filter: sepia(0.3) contrast(1.05);
}
```

### 2. Mask on large elements

`mask-image` is implemented as a shader pass on most browsers. A 4K screen-size mask with a noisy SVG source can cost 3–5 ms per frame on integrated GPUs. Avoid:

- Animating a mask.
- Using a mask on a full-viewport scrolling element.
- Using a high-frequency SVG noise as the mask source.

**Fix**: keep the mask at a small element size (a single card, a clipped image), or replace it with a static `radial-gradient` mask.

### 3. Inline SVG noise in critical CSS

Embedding `feTurbulence` as a data URI in a base stylesheet is fine because it is parsed once. Putting the same data URI in a component that renders 200 times is **not** fine — each instance re-parses the SVG.

**Fix**: extract the noise to a real `.svg` file and reference it with `url("noise.svg")`. Browsers cache the parsed SVG; data URIs are harder to dedupe.

### 4. `mix-blend-mode` escape

A `mix-blend-mode` on a child without `isolation: isolate` on the parent will composite against *everything* in the stacking context, including the page chrome. This can look great in demos and ruin performance in production.

**Fix**: always set `isolation: isolate` (or `will-change: isolation`, or transform) on the paper element before blending.

### 5. Many background layers

Each layer in a `background:` shorthand is a paint operation. Six gradients plus a noise image is seven. Most browsers cap at eight before they start simplifying silently — and silently means *your* gradients may quietly disappear.

**Fix**: consolidate. Use a single complex gradient (multi-stop, transparent in the middle) instead of three stacked single-color gradients.

### 6. Animating filter values

`filter: blur(...)` and `filter: contrast(...)` are animatable, but the browser creates a new backing surface for every frame of the animation. Smooth at 60fps for a small element; unusable for a fullscreen one.

**Fix**: animate `--age` (a `@property`-typed number) instead and **compute** the filter from it. The filter only repaints when the value changes, not on every frame.

### 7. `will-change` overuse

`will-change: filter` on an element tells the browser to keep it on the GPU forever. This is correct when the filter is animating and wrong when it is static.

**Fix**: apply `will-change` only on the elements you are about to animate, and remove it after the animation ends.

### 8. `backdrop-filter` with a complex background

`backdrop-filter` runs the filter against the pixels behind the element. If the background is itself filtered or has its own `backdrop-filter`, the cost multiplies.

**Fix**: keep `backdrop-filter` on small overlays; never on the document root.

### Performance budget — a rough rule of thumb

| Technique                  | Cost per repaint (fullscreen)  |
|----------------------------|--------------------------------|
| `background:` only         | 0.2 ms                         |
| + `background-blend-mode`  | 0.4 ms                         |
| + `filter` (static)        | 1.5 ms                         |
| + `mix-blend-mode` (static)| 1.0 ms                         |
| + `mask-image` (static)    | 1.5 ms                         |
| + `backdrop-filter`        | 3.0 ms                         |
| All of the above           | 6+ ms (likely below 60 fps)    |

These are rough — actual cost varies by GPU and driver. The point is that **a paper background should be cheap; a paper layout is not**.

---

## Newspaper Application

A realistic newspaper layout combines everything in this document. The goal is to reproduce the print artifact, not just its color.

### Layout shell

```html
<main class="paper newspaper">
  <header class="masthead">
    <h1>The Daily Texture</h1>
    <p>Vol. MMXXVI · No. 147</p>
  </header>

  <section class="lead">
    <h2>CSS Paper Now Reads As Paper, Studies Find</h2>
    <p>...</p>
  </section>

  <section class="column">
    <h3>Fiber Direction</h3>
    <p>...</p>
  </section>

  <aside class="sidebar">
    <h4>Weather</h4>
    <p>...</p>
  </aside>
</main>
```

### The full recipe

```css
.newspaper {
  position: relative;
  isolation: isolate;
  max-width: 1100px;
  margin: 4rem auto;
  padding: 3rem 2.5rem;
  font-family: Georgia, "Times New Roman", serif;

  /* --- background stack --- */
  background:
    /* masthead ink bleed (top) */
    radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.08), transparent 35%),
    /* diagonal halftone */
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.045) 0 1px,
      transparent 1px 3px
    ),
    /* fine grain */
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>\
  <filter id='np'>\
    <feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='4'/>\
    <feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0.16 0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(#np)'/>\
</svg>"),
    /* body color */
    #ebe7dd;
  background-blend-mode: multiply, multiply, multiply, normal;

  /* global aging */
  filter: sepia(0.35) contrast(1.1) saturate(0.9);

  /* soft worn edges */
  mask-image: radial-gradient(ellipse at center, #000 88%, transparent 100%);
  mask-mode: luminance;

  /* drop shadow on the desk */
  filter:
    drop-shadow(0 2px 4px rgba(0,0,0,0.25))
    drop-shadow(0 16px 32px rgba(0,0,0,0.15))
    sepia(0.35) contrast(1.1) saturate(0.9);

  color: #14110a;
  line-height: 1.45;
}

/* --- fiber direction --- */
.newspaper::before {
  content: "";
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(
      93deg,
      transparent 0 5px,
      rgba(60, 40, 10, 0.035) 5px 6px
    );
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 0;
}

/* --- vignette and edge darkening --- */
.newspaper::after {
  content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 65%, rgba(40, 25, 5, 0.25) 100%);
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 0;
}

/* --- content sits above the pseudo-elements --- */
.newspaper > * { position: relative; z-index: 1; }
```

### Typography that sells the print artifact

```css
.masthead h1 {
  font-family: "Old English Text MT", "UnifrakturMaguntia", serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  text-align: center;
  letter-spacing: 0.02em;
  margin: 0;
  /* slight ink-soak via blur+contrast */
  filter: blur(0.2px) contrast(1.15);
}

.masthead p {
  text-align: center;
  font-style: italic;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.lead h2 {
  font-size: 1.8rem;
  line-height: 1.15;
  column-span: all;
}

.column {
  column-count: 3;
  column-gap: 1.5rem;
  column-rule: 1px solid rgba(0,0,0,0.15);
}

.column p {
  text-align: justify;
  text-indent: 1.2em;
  margin: 0 0 0.4rem;
}

.column h3 {
  font-variant: small-caps;
  letter-spacing: 0.05em;
  break-after: avoid;
}

.sidebar {
  float: right;
  width: 30%;
  padding: 0.8rem 1rem;
  margin: 0 0 1rem 1rem;
  border: 1px solid rgba(0,0,0,0.25);
  background: rgba(255, 250, 235, 0.4);
  backdrop-filter: blur(1.5px);
}
```

The `column-rule` plus `backdrop-filter` on the sidebar makes the boxed callout look like a real offset-printed box, not a card.

### Headline ink-bleed

A bold headline should darken the paper unevenly. A cheap way:

```css
.lead h2 {
  text-shadow:
    0 0 1px rgba(0,0,0,0.6),
    0 0 2px rgba(0,0,0,0.3);
  color: #050505;
}
```

For the heavy "headline stamp" look used in tabloids, layer two:

```css
.tabloid h1 {
  font-weight: 900;
  color: #000;
  text-shadow:
    0 0 0.5px rgba(0,0,0,0.8),
    -0.3px 0 0.5px rgba(0,0,0,0.8),
    0.3px 0 0.5px rgba(0,0,0,0.8);
}
```

### Ink halos around images

A printed photograph has a slight dark halo where ink soaks beyond the halftone boundary. Reproduce it with a pseudo-element:

```css
.figure {
  position: relative;
  display: inline-block;
}
.figure img {
  display: block;
  filter: contrast(1.05) sepia(0.1);
}
.figure::after {
  content: "";
  position: absolute;
  inset: -3px;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%);
  mix-blend-mode: multiply;
  pointer-events: none;
}
```

### Putting it together — checklist

When the layout is missing the print feeling, work down this list:

1. Is there a **body color** that isn't pure white? (Pure white reads as screen.)
2. Is there **grain** at the right frequency for the paper? (Cheap paper = high frequency.)
3. Is there a **fiber direction** with a slightly off-axis angle? (90° reads as ruled paper.)
4. Are **edges** either masked, vignetted, or both? (Sharp rectangular edges read as a div.)
5. Is the **type** blurred by a fraction of a pixel? (Crisp type reads as digital.)
6. Are **borders** slightly faded rather than pure black? (Print borders never go to 100% K.)
7. Is the **shadow** a `drop-shadow`, not a `box-shadow`? (Masks must propagate.)

If five of seven are answered yes, the page will read as paper. If only three are yes, it will read as a "skin" — and that's a different document.

---

## Quick reference — the one-liner recipe

For when you need a paper background on a deadline:

```css
.paper {
  position: relative;
  isolation: isolate;
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.8' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>"),
    #f1e3c1;
  background-blend-mode: multiply;
  filter: sepia(0.2) contrast(1.05);
  mask-image: radial-gradient(ellipse at center, #000 90%, transparent 100%);
}
```

That single block is enough to fool a screenshot at thumbnail size. Everything else in this document is refinement.
