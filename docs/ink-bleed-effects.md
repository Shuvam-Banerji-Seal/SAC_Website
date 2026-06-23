# Ink-Bleed Effects — CSS / SVG / Canvas Techniques

> Research for the **SAC website** at `/store/shuvam/SAC_Website`, a pure
> static HTML/CSS/JS newspaper-themed site. The current repo already has
> paper textures, halftone, and SVG filter pipelines (see
> `docs/svg-filters-for-paper.md`, `docs/halftone-printing-patterns.md`,
> `docs/newsprint-aging-authenticity.md`). The aim of this document is to
> collect the techniques needed to convincingly fake **ink behaviour on
> paper** — bleeding, smudging, feathering, bleed-through, stamp pressure,
> typewriter ribbon overstrike — so that headlines, drop caps, stamps, and
> pull-quotes read as if they were pressed or written on newsprint rather
> than rasterised glyphs.
>
> **Status:** Reference · **Last updated:** 2026-06-22 · **Audience:** SAC web team
> **Scope:** CSS `text-shadow` stacks, `filter: blur / drop-shadow`,
> SVG `feGaussianBlur` + `feDisplacementMap` + `feMorphology` + `feTurbulence`,
> canvas `ImageData` dilation, performance and a11y.
> **Out of scope:** WebGL ink simulation, native rasterisation, GLSL.

---

## Table of contents

1. [What ink bleed actually is (physics)](#1-what-ink-bleed-actually-is-physics)
2. [Authoritative sources cited](#2-authoritative-sources-cited)
3. [Five primitives that fake every ink effect](#3-five-primitives-that-fake-every-ink-effect)
4. [CSS — text-shadow stacks and filter chains](#4-css--text-shadow-stacks-and-filter-chains)
5. [SVG — the filter graph for a bleeding letter](#5-svg--the-filter-graph-for-a-bleeding-letter)
6. [Canvas — pixel-level dilation for stamps](#6-canvas--pixel-level-dilation-for-stamps)
7. [Drop-shadow vs ink-bleed](#7-drop-shadow-vs-ink-bleed)
8. [The "wavy edge" — feathering at the paper boundary](#8-the-wavy-edge--feathering-at-the-paper-boundary)
9. [Bleed-through (showing ink on the back of the page)](#9-bleed-through-showing-ink-on-the-back-of-the-page)
10. [Three worked examples (copy-paste ready)](#10-three-worked-examples-copy-paste-ready)
11. [Typewolf and other design references](#11-typewolf-and-other-design-references)
12. [Performance budget](#12-performance-budget)
13. [Accessibility — legibility of bleeding type](#13-accessibility--legibility-of-bleeding-type)
14. [Recommendations for the SAC site](#14-recommendations-for-the-sac-site)
15. [Appendix A — at-a-glance cheat sheet](#appendix-a--at-a-glance-cheat-sheet)

---

## 1. What ink bleed actually is (physics)

Real ink on paper is not a solid colour block. Five physical phenomena
matter when we try to fake it digitally:

| Phenomenon | Real-world cause | Visual signature | CSS / SVG primitive |
|---|---|---|---|
| **Wicking / capillary spread** | Liquid ink is pulled along cellulose fibres by surface tension. Wider fibres pull faster. | Soft, fibrous edge halo, slightly stronger along the fibre grain. | `feGaussianBlur` on `SourceAlpha`, low `stdDeviation` (~0.4–1.2) |
| **Edge feathering** | Where the wet edge stops, evaporation sets up a concentration gradient — denser in the middle, diffuse outward. | Smooth radial alpha falloff; no hard boundary. | `filter: blur()` + `text-shadow` alpha falloff stack |
| **Bleed-through** | Ink soaks through the paper and re-emerges on the other side, mirrored, lighter, and slightly offset. | A pale, mirror-inverted copy of the same letter on the reverse side. | Duplicated element, `opacity ~0.18`, `mix-blend-mode: multiply`, slight `scaleY(-1)` |
| **Smudge / drag** | A wet stroke is moved before it dries — the dragged tail feathers even further than a static stroke. | A directional comet-tail that fades more in the direction of motion than across it. | Anisotropic blur via SVG `feGaussianBlur stdDeviation="6 1"` |
| **Overstrike (typewriter / stamp)** | Re-hitting the same glyph with ribbon or ink redistributes pigment into the depression of the paper. | Darker centre, slight pressure halo, sometimes a tiny "ghost" 0.5 px off. | `feOffset` (0.5,0.5) + `feFlood` + `feComposite operator="in"` |

The killer quote from the [Wikipedia: Ink](https://en.wikipedia.org/wiki/Ink) article is also the design brief: *"Ink can be a complex medium, composed of solvents, pigments, dyes, resins, lubricants, solubilizers, surfactants, particulate matter, fluorescents, and other materials."* On newsprint specifically, the cellulose fibre is ~10 µm across — *much* finer than a screen pixel — which means the visual signal we are faking is essentially a low-pass-filtered alpha mask of the glyph, modulated by a high-frequency noise texture for the fibre grain.

Two sources underpin this whole section:
[Wikipedia: Capillary action](https://en.wikipedia.org/wiki/Capillary_action) and
[Wikipedia: Surface tension](https://en.wikipedia.org/wiki/Surface_tension). Both
emphasise the same point: on absorbent paper, the relevant force is **adhesion
of the liquid to the cellulose**, not gravity. That is why ink spreads outward
*in the plane* of the paper, not downward through it — and why a digital fake
should put the strongest blur **around the perimeter of the glyph**, not behind
it (no offset).

---

## 2. Authoritative sources cited

In rough order of weight:

- **W3C — [Filter Effects 1](https://www.w3.org/TR/filter-effects-1/)** and
  **[SVG 1.1 — Filter Effects](https://www.w3.org/TR/SVG11/filters.html)**.
  The authoritative grammar for `feGaussianBlur`, `feMorphology`, `feOffset`,
  `feColorMatrix`, `feTurbulence`, `feDisplacementMap`, `feComponentTransfer`.
- **MDN** reference pages, which reflect the same specs with browser-support
  notes:
  [`feGaussianBlur`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur),
  [`feMorphology`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMorphology),
  [`feTurbulence`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence),
  [`feDisplacementMap`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap),
  [`feOffset`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feOffset),
  [`feColorMatrix`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix),
  [`feComponentTransfer`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feComponentTransfer),
  [`blur()` filter function](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/blur),
  [`drop-shadow()` filter function](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow),
  [`text-shadow`](https://css-tricks.com/almanac/properties/t/text-shadow/),
  [`filter` almanac](https://css-tricks.com/almanac/properties/f/filter/),
  [`mix-blend-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode),
  [`CanvasRenderingContext2D.filter`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter),
  [Filter effects guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects),
  [Using CSS filter effects](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects/Using),
  [Compositing and blending](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Compositing_and_blending).
- **CSS-Tricks** —
  [Breaking CSS: box-shadow vs filter: drop-shadow()](https://css-tricks.com/breaking-css-box-shadow-vs-drop-shadow/).
  Establishes that `drop-shadow()` follows the **alpha mask** of the
  element, not the box. For us this is the single most important rule —
  ink bleed hugs the *shape of the letter*, never a rectangle.
- **Physics background** —
  [Wikipedia: Capillary action](https://en.wikipedia.org/wiki/Capillary_action),
  [Wikipedia: Surface tension](https://en.wikipedia.org/wiki/Surface_tension),
  [Wikipedia: Ink](https://en.wikipedia.org/wiki/Ink),
  [Wikipedia: Watercolor painting](https://en.wikipedia.org/wiki/Watercolor_painting),
  [Wikipedia: Wash (visual arts)](https://en.wikipedia.org/wiki/Wash_(visual_arts)),
  [Wikipedia: Letterpress printing](https://en.wikipedia.org/wiki/Letterpress_printing),
  [Wikipedia: Typewriter](https://en.wikipedia.org/wiki/Typewriter),
  [Wikipedia: Fountain pen](https://en.wikipedia.org/wiki/Fountain_pen),
  [Wikipedia: Calligraphy](https://en.wikipedia.org/wiki/Calligraphy),
  [Wikipedia: Paper](https://en.wikipedia.org/wiki/Paper).
  All for one reason: they describe what ink physically *does*, which
  dictates what our filters must mimic.

A note on what did **not** pan out: the long-form articles at
CSS-Tricks (`/adding-shadow-text-effects-css/`, `/text-effects-with-css-text-shadow/`,
`/lots-of-possibilities-with-the-css-filter-property/`, `/inking-the-web-with-svg/`)
and Smashing (`/2015/02/creating-web-textures-with-css/`,
`/2012/06/paper-texture-effect-in-css-with-textures-and-blend-modes/`) and the
Codrops paper-effects post returned 404 from fetch. The MDN pages and W3C
specs covered the same ground without them, so no information was lost.

---

## 3. Five primitives that fake every ink effect

Every ink-bleed technique in this document is built from the same five
building blocks. Memorise these and the rest is composition.

| # | Primitive | What it actually does | The bleed parameter |
|---|---|---|---|
| 1 | `filter: blur(Npx)` (CSS) or `feGaussianBlur stdDeviation=N` (SVG) | Gaussian low-pass on alpha + colour | `N` ≈ 0.3–1.5 px for tight bleed, 2–6 px for soft wash, 8–20 px for smudge |
| 2 | `feMorphology operator="dilate" radius=N` | Pushes the alpha mask **outward** in all directions | `N` ≈ 0.5–2 px for fattened letters, 3–8 px for stamp haloes |
| 3 | `feDisplacementMap` + `feTurbulence baseFrequency` | Displaces every pixel by a noise field — gives the *wavy* edge | `scale` ≈ 1–3 for paper edge, 4–10 for stamp roughness |
| 4 | `feOffset dx, dy` | Translates the alpha mask | Use 0,0 for a centred bleed halo; use ~0.5,0.5 for "pressed twice" |
| 5 | `feComponentTransfer` `<feFuncA type="table">` | Remaps the alpha curve — turns a hard letter into a feathered one | Table of 4–6 stops to shape the falloff |

Plus one **composition** primitive, free from W3C:

| | `mix-blend-mode: multiply` | Ink stains darken the paper rather than replacing it | apply to bleed-through layers so the page colour shows through |

The reason these five are enough: real ink bleed is, mathematically, a
**convolution of the glyph's alpha mask with a 2-D kernel** (the fibre
spread function), optionally followed by a **non-linear tone curve**
(the concentration gradient). Steps 1–4 give you the convolution, step 5
gives you the tone curve. Everything in §4–§6 is just plumbing.

---

## 4. CSS — text-shadow stacks and filter chains

The cheapest and most accessible approach. No SVG, no JS. Pure
`text-shadow` plus `filter:`.

### 4.1 The "soft ink" head — multi-stop text-shadow

A single `text-shadow` with offset produces a *drop* shadow, not a *bleed*
shadow. To get a bleed we keep the offset at **0,0** and stack shadows of
decreasing alpha at increasing blur radii. This is the same trick
[CSS-Tricks almanac on text-shadow](https://css-tricks.com/almanac/properties/t/text-shadow/)
describes as "outer glow", just inverted in intent:

```css
/* Soft ink head — gives a wicking halo around each letter */
.soft-ink {
  color: #1a1410;
  text-shadow:
    0 0 0.5px rgba(20, 12,  8, 0.55),   /* dense, near edge */
    0 0 1.2px rgba(20, 12,  8, 0.30),
    0 0 2.5px rgba(20, 12,  8, 0.18),
    0 0 4.5px rgba(20, 12,  8, 0.10),
    0 0 8px   rgba(20, 12,  8, 0.05);   /* feathered outer halo */
}
```

Notes from the [MDN `blur()` docs](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/blur):
blur radius is the **standard deviation** of the Gaussian, so a `4.5px`
shadow actually affects pixels ~9 px away. That's why the falloff has
to be aggressive: the kernel has wide tails.

### 4.2 Stack five shadows, one per "concentration zone"

Modelling the physics: at the centre of the stroke the ink is dense
(alpha 1.0, fully opaque). At the wet edge it's about 0.5. In the
wicked-fibre region it's 0.2–0.3. Beyond that it's a faint stain.

```css
.bleed-stack {
  color: #111;
  text-shadow:
    0 0 0.3px rgba(0, 0, 0, 0.85),  /* core, opaque */
    0 0 0.8px rgba(0, 0, 0, 0.55),  /* dense ink */
    0 0 1.6px rgba(0, 0, 0, 0.30),  /* wet edge */
    0 0 3.0px rgba(0, 0, 0, 0.16),  /* wicked fibre */
    0 0 6.0px rgba(0, 0, 0, 0.08);  /* faint outer stain */
}
```

### 4.3 For a *coloured* bleed (e.g. a bleeding red headline)

Just change the shadow colour. The trick that sells it is **also giving
the `color` itself a slight alpha** so the body's stroke is slightly
softer than a vector — matching what fountain-pen ink does on cheap
paper ([Wikipedia: Fountain pen](https://en.wikipedia.org/wiki/Fountain_pen)).

```css
.red-bleed-headline {
  color: rgba(140, 12, 18, 0.92);                 /* crimson ink, slightly wet */
  text-shadow:
    0 0 0.4px rgba(120,  6, 12, 0.80),
    0 0 1.2px rgba(120,  6, 12, 0.45),
    0 0 3.0px rgba(120,  6, 12, 0.22),
    0 0 6.0px rgba(120,  6, 12, 0.10),
    0 1px 0   rgba(80,   0,  6, 0.35);             /* a hint of downward drip */
}
```

### 4.4 Plus a global `filter: blur()` for ultra-soft smudge

For a heavy smudge (e.g. the headline of a crime story that's been
thumb-smudged) wrap the element in `filter: blur(Npx) contrast(1.05)` —
the slight contrast boost compensates for the loss of edge the blur
causes. This is exactly the pattern MDN's [Using CSS filter effects
guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects/Using)
recommends for "glow" but works equally for "smudge".

```css
.smudged-headline {
  color: #1a1410;
  text-shadow: /* …same stack as 4.2… */ ;
  filter: blur(0.6px) contrast(1.04);
}
```

### 4.5 Why this is cheap

`text-shadow` is implemented at the glyph-rendering layer, not as a
post-process. Browsers ship the blurred copies in GPU buffers — five
shadows are essentially free. The cost cliff is `filter: blur()` on a
non-trivial element, because that creates a new stacking context and a
GPU readback.

---

## 5. SVG — the filter graph for a bleeding letter

When you need the wavy edge, the pressed-stamp halo, or the bleed-through
to the back of the page, CSS isn't enough. SVG filter primitives give
you per-pixel control. The grammar is fully specified in [W3C SVG11 —
Filter Effects](https://www.w3.org/TR/SVG11/filters.html) and the
[W3C Filter Effects 1 spec](https://www.w3.org/TR/filter-effects-1/).

### 5.1 The classic "bleeding letter" filter

This is the canonical pipeline: blur the alpha mask, dilate it slightly,
displace the result with low-frequency turbulence, then tone-curve the
alpha so the falloff is non-linear.

```xml
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="inkBleed" color-interpolation-filters="sRGB">
      <!-- 1. Feather the alpha edge -->
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="soft"/>

      <!-- 2. Push the soft alpha outward by 0.5 px (the wicking fibre) -->
      <feMorphology in="soft" operator="dilate" radius="0.5" result="halo"/>

      <!-- 3. Generate a smooth noise field for the wavy edge -->
      <feTurbulence type="fractalNoise" baseFrequency="0.9"
                    numOctaves="2" seed="3" result="noise"/>

      <!-- 4. Displace the halo by the noise to break the perfect roundness -->
      <feDisplacementMap in="halo" in2="noise" scale="1.4"
                         xChannelSelector="R" yChannelSelector="G"
                         result="rough"/>

      <!-- 5. Tone-curve the alpha so the falloff is non-linear (more like ink) -->
      <feComponentTransfer in="rough" result="inked">
        <feFuncA type="table"
                 tableValues="0 0.18 0.55 0.85 1 1 1 1"/>
      </feComponentTransfer>

      <!-- 6. Composite back over the original colour -->
      <feComposite in="inked" in2="SourceGraphic" operator="in" result="ring"/>

      <feMerge>
        <feMergeNode in="SourceGraphic"/>
        <feMergeNode in="ring"/>
      </feMerge>
    </filter>
  </defs>
</svg>
```

```css
.bleeding {
  color: #1a1410;
  filter: url(#inkBleed);
}
```

Reading it back through the MDN docs:

- [`feGaussianBlur`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur):
  `stdDeviation` is the Gaussian sigma. 0.8 px is a *tight* bleed —
  roughly equivalent to `text-shadow: 0 0 0.8px …` from §4.1.
- [`feMorphology`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMorphology):
  `operator="dilate"` (we want bigger, not smaller) with `radius=0.5`.
  This is the part that *expands* the alpha mask uniformly, modelling
  wicking.
- [`feTurbulence`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence)
  with `baseFrequency=0.9`: a higher frequency gives finer bumps; we
  want fine fibre bumps, so 0.9–1.5 is right. `numOctaves=2` keeps it
  cheap.
- [`feDisplacementMap`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap):
  `scale=1.4` is the **maximum pixel displacement** the noise can apply.
  Anything above ~3 px starts to look distressed rather than inked.
- [`feComponentTransfer`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feComponentTransfer)
  with `feFuncA type="table"`: a 4- to 8-stop table mapping input alpha
  to output alpha. The shape of this table **is** the concentration
  gradient described in §1.
- `color-interpolation-filters="sRGB"`: critical. Without it, primitives
  default to `linearRGB` and your greys go green at high blur values.

### 5.2 For a stamp (fatter, more rectangular halo, very slight rotation)

A stamp has a sharper, more "rectangular" bleed because the pressure is
distributed over the whole glyph. Swap `feGaussianBlur` for a small
`feMorphology` followed by a tiny `feGaussianBlur`, and reduce the
displacement `scale`.

```xml
<filter id="inkStamp" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="fat"/>
  <feGaussianBlur in="fat" stdDeviation="0.6" result="soft"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.2"
                numOctaves="2" seed="11" result="noise"/>
  <feDisplacementMap in="soft" in2="noise" scale="2.2"
                     xChannelSelector="R" yChannelSelector="G"
                     result="rough"/>
  <feComponentTransfer in="rough" result="inked">
    <feFuncA type="table" tableValues="0 0.4 0.95 1"/>
  </feComponentTransfer>
  <feMerge>
    <feMergeNode in="inked"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

### 5.3 For an old typewriter letter (overstrike)

A typewriter ribbon applies slightly more ink than a printer. The
signature is a faint secondary impression, half a pixel off. This is a
two-pass filter using [`feOffset`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feOffset):

```xml
<filter id="typewriter" color-interpolation-filters="sRGB">
  <!-- ghost overstrike -->
  <feOffset in="SourceAlpha" dx="0.6" dy="0.6" result="ghost"/>
  <feGaussianBlur in="ghost" stdDeviation="0.3" result="gsoft"/>
  <feComponentTransfer in="gsoft" result="ghostInk">
    <feFuncA type="linear" slope="0.35"/>
  </feComponentTransfer>
  <!-- core bleed -->
  <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="soft"/>
  <feComponentTransfer in="soft" result="softInk">
    <feFuncA type="table" tableValues="0 0.6 1"/>
  </feComponentTransfer>
  <feMerge>
    <feMergeNode in="ghostInk"/>
    <feMergeNode in="softInk"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

The `feFuncA type="linear" slope="0.35"` rebalances the ghost's alpha so
it sits at ~35 % of the core — exactly the visual cue of a ribbon that
hit the page twice.

---

## 6. Canvas — pixel-level dilation for stamps

CSS and SVG are declarative. When you need to apply the bleed to
**arbitrary raster input** — a PNG of an old photograph, a hand-scanned
letter, a user-uploaded image — you need the canvas 2-D API and
`ImageData`.

The reason this exists at all: CSS and SVG filters can't read a
photograph's local contrast the way a human eye does. A 1-pixel halo on
a high-contrast edge looks right; on a low-contrast edge it looks like
a smear. The canvas technique below lets you key the bleed to edge
energy.

### 6.1 Cheap dilation via blur-threshold

Canvas doesn't expose `feMorphology` directly, but it has
[`CanvasRenderingContext2D.filter`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)
which accepts the same CSS filter strings, including `blur()` and
`drop-shadow()`.

```js
// "ink-stamp" a canvas-rendered image
function inkStamp(ctx, src, options = {}) {
  const { halo = 1.4, threshold = 96, darken = 0.6 } = options;

  // 1. Read the source pixels
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // 2. Threshold to a binary ink mask (darker than `threshold` → inked)
  const mask = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    mask[j] = lum < threshold ? 255 : 0;
  }

  // 3. Cheap 3×3 dilation (the wicking spread)
  const out = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] = mask[i] || mask[i - 1] || mask[i + 1]
                   || mask[i - w] || mask[i + w] ? 255 : 0;
    }
  }

  // 4. Paint the dilated mask under the original, darken slightly
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    if (out[j]) {
      d[i]     = Math.max(0, d[i]     - 60);   // R
      d[i + 1] = Math.max(0, d[i + 1] - 60);   // G
      d[i + 2] = Math.max(0, d[i + 2] - 60);   // B
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}
```

The 3×3 dilation is the digital equivalent of the capillary wicking in
§1. To go one step further — to get a *Gaussian* spread rather than a
*square* spread — replace step 3 with a separable box blur of width
`2 × halo + 1`:

```js
// Better dilation: separable box blur of the ink mask
function boxBlur(mask, w, h, radius) {
  const tmp = new Uint8ClampedArray(w * h);
  const out = new Uint8ClampedArray(w * h);
  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) { sum += mask[y * w + xx]; n++; }
      }
      tmp[y * w + x] = sum / n;
    }
  }
  // vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; n++; }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}
```

For a real ink profile, blur the mask with a Gaussian (3 passes of
box-blur approximates a Gaussian to within 3 %), then threshold the
result so only the feathered edge remains.

### 6.2 When to use canvas vs SVG

Use canvas when:

- the input is a photograph or user upload
- you need edge-keyed bleed (the bleed intensity varies with local
  contrast)
- you want per-pixel control of the alpha curve (the table in §5.1)

Use SVG otherwise — it's GPU-accelerated and you don't ship JS.

---

## 7. Drop-shadow vs ink-bleed

This distinction is the most common mistake. From
[CSS-Tricks: box-shadow vs drop-shadow](https://css-tricks.com/breaking-css-box-shadow-vs-drop-shadow/):

> *"Filters are not bound to the box model. That means the outline of
> our triangle is recognized and the transparency around it is ignored
> so that the intended shape receives the shadow."*

For ink:

| | Drop-shadow (the "raised card" UI shadow) | Ink bleed |
|---|---|---|
| **Offset** | Yes, usually 2–6 px | **No.** Ink spreads in the plane of the paper, not behind it. |
| **Blur** | Modest, 4–12 px | Often very large relative to letter size (the bleed radius can be 30 % of the stroke width). |
| **Alpha falloff** | Sharp, exponential | Long, sometimes multi-modal — there's a dense core and a feathered outer ring. |
| **Colour** | Dark grey, often with hue shift | **Same as the ink.** The bleed is the ink, just diluted. |
| **Shape source** | Box (for `box-shadow`) or alpha (for `filter: drop-shadow()`) | **Alpha mask only**, never the box. |

In CSS, this translates to:

- **Always `filter: drop-shadow(...)`, never `box-shadow`** for ink.
- **Offset of 0,0** — or as close to zero as you can.
- **Multiple shadows** stacked to model the multi-modal falloff.

```css
/* WRONG — this is a drop shadow, not an ink bleed */
.bad {
  filter: drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.5));
}

/* RIGHT — same shape, but the alpha is centred on the letter */
.good {
  filter: drop-shadow(0 0 1.2px rgba(0, 0, 0, 0.55))
          drop-shadow(0 0 3px   rgba(0, 0, 0, 0.25))
          drop-shadow(0 0 7px   rgba(0, 0, 0, 0.10));
}
```

The [MDN `drop-shadow()` docs](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow)
confirm the alpha-mask behaviour and the formal syntax — and notably
warn that `drop-shadow` accepts **no spread parameter**, which is why we
have to stack multiple drop-shadows to fake the larger bleed.

---

## 8. The "wavy edge" — feathering at the paper boundary

Ink on absorbent paper has a slightly irregular boundary because the
cellulose fibres it soaks into aren't a uniform grid. The cheapest way
to fake this is `feTurbulence` + `feDisplacementMap`, with the noise
frequency tuned to the *fibre size* you want.

| Material | `baseFrequency` | `numOctaves` | `scale` (displacement) |
|---|---|---|---|
| Cheap newsprint (10 µm fibres) | 0.8–1.4 | 2 | 1.0–2.0 |
| Office paper (smoother) | 1.6–2.5 | 2 | 0.6–1.2 |
| Hand-made cotton paper | 0.4–0.7 | 3 | 2.0–4.0 |
| Waxed / coated paper (almost no bleed) | — | — | 0 (use a plain blur, skip displacement) |

The intuition: lower `baseFrequency` = larger features = coarser paper.
`scale` is the max displacement in pixels, so on a HiDPI display you'll
need roughly 2× the scale you'd use on a 1× display.

A reusable snippet:

```xml
<filter id="paperEdge" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.9"
                numOctaves="2" seed="5" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t"
                     scale="1.6"
                     xChannelSelector="R" yChannelSelector="G"/>
</filter>
```

To get **only an edge displacement** (not the whole letter), blur the
source first so the displacement acts on the soft boundary, not on the
hard glyph:

```xml
<filter id="wavyEdge" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="soft"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.0"
                numOctaves="2" seed="9" result="t"/>
  <feDisplacementMap in="soft" in2="t" scale="2.0"
                     xChannelSelector="R" yChannelSelector="G"
                     result="wavy"/>
  <feComposite in="wavy" in2="SourceGraphic" operator="in"/>
</filter>
```

The `feComposite operator="in"` at the end ensures only the displaced
mask colours, with the original letter colour as the source.

---

## 9. Bleed-through (showing ink on the back of the page)

When ink soaks through a sheet, the rear impression is:
1. **Mirrored vertically** (it's the *back* of the paper).
2. **Lighter** (the ink is split between two surfaces).
3. **Slightly defocused** (the paper fibres scatter it).
4. **Offset by a tiny angle** because the sheet isn't perfectly flat.

The CSS pattern is to duplicate the element with `transform: scaleY(-1)`,
set it to `opacity: 0.18`, blur it, and `mix-blend-mode: multiply` it
under the page texture:

```html
<article class="page">
  <h1 class="headline">EXTRA!</h1>
  <!-- invisible duplicate, shown only when bleed-through is on -->
  <h1 class="headline head-bleed" aria-hidden="true">EXTRA!</h1>
</article>
```

```css
.page {
  position: relative;
  background:
    /* paper texture here */;
}
.headline {
  color: #1a1410;
  position: relative;
  z-index: 2;
}
.head-bleed {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform: scaleY(-1) translateY(0.5rem);
  filter: blur(0.6px);
  opacity: 0.18;
  mix-blend-mode: multiply;
  color: #1a1410;
  pointer-events: none;
}
```

Why `mix-blend-mode: multiply`: a real bleed-through darkens the paper
rather than replacing it. `multiply` is the only blend mode that
behaves like ink on paper (see the [MDN `mix-blend-mode` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode)).
For an aged, sepia version of the same effect, set `color: #5a3a1a`
(warm brown) and `opacity: 0.12`.

---

## 10. Three worked examples (copy-paste ready)

### 10.1 Smudged rubber stamp ("CLASSIFIED")

A horizontal red bar with a smudged-bottom, slightly off-square stamp
impression. Uses SVG morphology + turbulence.

```html
<span class="stamp">CLASSIFIED</span>
```

```css
.stamp {
  display: inline-block;
  padding: 0.4em 0.9em;
  font: 700 1.5rem/1 "Courier New", monospace;
  letter-spacing: 0.15em;
  color: #a31515;
  border: 3px double #a31515;
  transform: rotate(-2.5deg);
  filter: url(#inkStamp);
}
```

(The `inkStamp` filter is defined in §5.2.)

### 10.2 Bleeding red banner headline

A heavy serif headline that has "just been printed", with a red bleed
halo. Uses pure CSS — no SVG.

```html
<h1 class="banner">THE FRONT PAGE</h1>
```

```css
.banner {
  font: 900 4rem/1.05 "Playfair Display", "Times New Roman", serif;
  color: rgba(170, 18, 24, 0.92);
  letter-spacing: -0.02em;
  text-shadow:
    0 0 0.3px rgba(120, 6, 12, 0.85),
    0 0 1.0px rgba(120, 6, 12, 0.55),
    0 0 2.5px rgba(120, 6, 12, 0.30),
    0 0 5.5px rgba(120, 6, 12, 0.14),
    0 0 11px  rgba(120, 6, 12, 0.06);
  filter: contrast(1.03);
}
```

### 10.3 Old typewriter letter

A paragraph set in a typewriter face with a slight per-ghost overstrike.
Uses the SVG filter from §5.3.

```html
<p class="typed">The witness said he saw the man at 11:42 pm.</p>
```

```css
.typed {
  font: 400 1.1rem/1.6 "Special Elite", "Courier New", monospace;
  color: #1a1410;
  filter: url(#typewriter);
}
```

The "Special Elite" face (a free typewriter font by Astigmatic) already
includes irregular ink distribution at the glyph level — combining it
with the SVG overstrike filter gives a very convincing manual typing
look.

---

## 11. Typewolf and other design references

These are not sources we *cited directly* — they're sites the SAC team
should bookmark as inspiration when picking reference imagery for the
newsprint effect:

- **[Typewolf](https://www.typewolf.com/)** — particularly the
  "Fonts in Use" section. Look for site recommendations tagged
  *editorial*, *newspaper*, *vintage*. The "Font Recommendations"
  page is a good source of serif/transitional pairs that read well
  when given a 0.5–1 px text-shadow bleed.
- **[Fonts In Use](https://fontsinuse.com/)** — search "newspaper" or
  "editorial". Pay attention to the relationship between display weight
  and body weight — too close a weight and the bleed merges the two.
- **[Calligraphics and Ink Library](https://en.wikipedia.org/wiki/Calligraphy)**
  on Wikipedia — the *Inks, papers and templates* subsection is a
  concise rundown of why absorbent paper (ruled paper, parchment) reads
  differently from coated stock.
- **[Letterpress printing on Wikipedia](https://en.wikipedia.org/wiki/Letterpress_printing)**
  — read the first three sections for the vocabulary: *impression*,
  *blow*, *slur*. The same vocabulary describes what we are trying to
  fake.

In terms of *which fonts* bleed best in CSS:

- Heavy serifs (Playfair Display, Bodoni, Old Standard) take a tight
  bleed (0.3–0.8 px stack) gracefully.
- Light serifs and slab serifs (Lora, Roboto Slab) need a wider bleed
  (1–2 px) and tend to lose legibility — keep the alpha low.
- Sans-serifs (Inter, Helvetica) read as "smudge" rather than "ink" —
  acceptable for redacted / stamped lookups, not for headlines.
- Monospaced (Special Elite, Courier) reads as "typewriter" with
  almost any bleed; this is because real typewriters produce a similar
  per-character overstrike.

---

## 12. Performance budget

The SAC site is pure static HTML/CSS/JS, so every filter has to be
re-evaluated on every repaint of every relevant element. Concretely:

| Technique | Per-element cost | Cacheable? | Notes |
|---|---|---|---|
| `text-shadow` stack (5 stops) | Very low — implemented at glyph layer | No (recomputed per text change) | Five shadows ~ free; ten is the practical ceiling |
| `filter: blur()` on text | Medium — creates stacking context, GPU readback | No | Avoid on >30 elements; use on hero only |
| `filter: drop-shadow()` x3 | Medium — same as above, x3 | No | Same as above |
| Inline SVG `<filter>` | Low–medium — GPU-accelerated when applied via `filter: url(#…)` | **Yes** — the filter is cached; reusing the same `id` across elements is essentially free |
| Canvas `ImageData` dilation | High — JS-driven, full pixel pass | Only if precomputed and cached to a PNG | Don't run on scroll/resize; bake once into a sprite |
| `feTurbulence` + `feDisplacementMap` | Medium — turbulence generation is the expensive bit | **Yes** once generated | Cache the turbulence texture by reusing one `<filter>` definition across many elements |

Three rules of thumb:

1. **Reuse one `<filter id="…">` across many elements** — the cost of
   a filter is paid once per filter ID, not once per element. Five
   headlines using `filter: url(#inkBleed)` cost roughly the same as
   one.
2. **Prefer `text-shadow` to `filter`** when the bleed is small.
   `text-shadow` is implemented in the glyph cache, not as a
   post-process.
3. **Cache canvas work**. If you stamp a photograph, do it once and
   save the result as a PNG. Don't run `inkStamp()` on every render.

For an additional sanity check, see the [MDN `filter` effects guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects),
which notes that `filter` *creates a new stacking context and a new
containing block for fixed-position descendants*. This is a layout cost
that's easy to miss.

---

## 13. Accessibility — legibility of bleeding type

Ink bleed by definition blurs the glyph outline. Five rules to keep the
text legible:

1. **Don't bleed body copy.** Reserve bleed effects for display sizes
   (≥ 2rem) and never apply them to running text below 1rem. At small
   sizes the bleed merges glyphs together and destroys the negative
   space.
2. **Keep alpha low on the outer shadow.** The 5th shadow in §4.2
   (the "faint outer stain") is at 0.08 alpha. That's the right range.
   Above 0.15 and the bleed is visible as a halo, not a stain.
3. **Don't reduce contrast below 4.5:1.** The WCAG AA contrast
   requirement applies to bleeding type too. A black-on-newsprint
   headline that's been blurred to 50 % opacity will fall below this.
   Keep `color` at the original value and bleed the *shadows* instead.
4. **Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.**
   Bleed effects aren't animation, but a smudge animation that grows
   the bleed should pause or stop on `prefers-reduced-motion`. The
   effect itself should also be tonally optional — wrap it in a
   `@media` block that disables the filter if the user prefers less
   motion (and therefore presumably less visual noise):

   ```css
   @media (prefers-reduced-transparency: reduce) {
     .bleed-stack { text-shadow: none; filter: none; }
   }
   ```

5. **Don't put bleed on interactive elements.** A button with a 5-stop
   text-shadow stack will lose its tap target boundary on slow devices.
   Reserve bleed for non-interactive headings.

The MDN [Using CSS filter effects guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects/Using)
makes the related point that filters *prevent text selection from
extending into the bleed halo*, which can be a usability surprise —
not a problem for the SAC site, but worth knowing.

---

## 14. Recommendations for the SAC site

Concretely, in priority order:

1. **Use the `text-shadow` 5-stop stack from §4.2 as a `.bleed` utility
   class.** Drop it onto any headline above 2rem that wants a soft-ink
   read. Cheapest possible technique, zero new files.
2. **Add the `inkBleed`, `inkStamp`, `typewriter` and `paperEdge`
   filters from §5 as inline `<svg>` in `index.html`.** Reference them
   from CSS via `filter: url(#inkBleed)`. Reuse one definition across
   many elements — the cost is amortised.
3. **For bleed-through effects (§9), duplicate the element with
   `scaleY(-1)` and `mix-blend-mode: multiply`.** This is the single
   most "expensive-looking" effect for the cheapest possible CSS.
4. **Reserve canvas (§6) for image-stamping only.** Specifically: if
   the user-uploaded section ever accepts photos, run them through
   `inkStamp()` once on upload and cache the result.
5. **Keep body copy free of all of this.** A newspaper that bleeds
   *all* its text stops looking like a newspaper and starts looking
   like an acid trip. Bleed belongs on display type: masthead, page
   numbers, drop caps, stamps, pull-quotes.
6. **Tune `baseFrequency` and `scale` to the actual paper texture** the
   rest of the site uses. If the paper grain is coarse (the
   `--paper-grain` token in `css/variables.css` is set high), drop
   `baseFrequency` to 0.6 and bump `scale` to 2.0 — match the surface
   you're printing on.

---

## Appendix A — at-a-glance cheat sheet

```css
/* 1. Cheapest — text-shadow bleed */
.bleed {
  color: #111;
  text-shadow:
    0 0 0.3px rgba(0, 0, 0, 0.85),
    0 0 0.8px rgba(0, 0, 0, 0.55),
    0 0 1.6px rgba(0, 0, 0, 0.30),
    0 0 3.0px rgba(0, 0, 0, 0.16),
    0 0 6.0px rgba(0, 0, 0, 0.08);
}

/* 2. Soft ink — same idea, more atmospheric */
.soft-ink {
  color: #1a1410;
  text-shadow:
    0 0 0.5px rgba(20, 12, 8, 0.55),
    0 0 1.2px rgba(20, 12, 8, 0.30),
    0 0 2.5px rgba(20, 12, 8, 0.18),
    0 0 4.5px rgba(20, 12, 8, 0.10),
    0 0 8px   rgba(20, 12, 8, 0.05);
  filter: contrast(1.03);
}

/* 3. Bleed-through — duplicate + flip + multiply */
.bleed-through {
  position: absolute;
  inset: 0;
  transform: scaleY(-1) translateY(0.5rem);
  opacity: 0.18;
  mix-blend-mode: multiply;
  filter: blur(0.6px);
  pointer-events: none;
}
```

```xml
<!-- 4. SVG: ink bleed filter, paste once in index.html -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="inkBleed" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="soft"/>
      <feMorphology in="soft" operator="dilate" radius="0.5" result="halo"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9"
                    numOctaves="2" seed="3" result="noise"/>
      <feDisplacementMap in="halo" in2="noise" scale="1.4"
                         xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feComponentTransfer in="rough" result="inked">
        <feFuncA type="table"
                 tableValues="0 0.18 0.55 0.85 1 1 1 1"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="SourceGraphic"/>
        <feMergeNode in="inked"/>
      </feMerge>
    </filter>
  </defs>
</svg>
```

```js
// 5. Canvas: stamp a raster image
inkStamp(ctx); // see §6.1 for full implementation
```

| Want | Use |
|---|---|
| Soft halo on a headline | `text-shadow` 5-stop stack (§4) |
| Wavy / feathered edge | SVG `inkBleed` filter (§5.1) |
| Stamp pressure / rectangular halo | SVG `inkStamp` filter (§5.2) |
| Typewriter overstrike | SVG `typewriter` filter (§5.3) |
| Ink showing on the back of the page | `scaleY(-1)` + `mix-blend-mode: multiply` (§9) |
| Stamp on a photo / user upload | `inkStamp()` on canvas (§6) |
| Apply globally, cheaply | Reuse one `<filter id="…">` across many elements (§12) |
