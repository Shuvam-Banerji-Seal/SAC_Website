# Halftone Printing Patterns — Research

> Background research for the SAC website newspaper-print theme.
> Focus: how to fake, generate, and combine **halftone dot patterns** (the
> way real newsprint simulates continuous tones with single-color ink)
> using only the tools the SAC site already uses: pure static
> HTML / CSS / SVG, with optional Canvas / JS for generated images.
>
> **Status:** Research doc · **Author:** SAC web team
> **Last updated:** 2026-06-22
> **Scope:** Source of truth for future PRs that add halftone imagery
> (gallery photos, club portraits, masthead badges, etc.).
> **Existing related doc:** `docs/loader-design.md` (covers the press
> metaphor in the loader; this doc focuses on the static
> ink-on-paper visual language that surrounds the loader).

---

## 1. What halftone is, and why we want it

A **halftone** is the reprographic technique that simulates a continuous-tone
image (a photograph, a gradient) using only one colour of ink, by breaking the
image into dots that vary in **size** (amplitude-modulated / AM — the
"classical" halftone) or in **spacing** (frequency-modulated / FM — the
"stochastic" halftone). From a few centimetres away the eye averages the
pattern into a smooth tone, the same way it averages the silver grains in
black-and-white film.

This is exactly what every black-and-white newspaper photo is made of, and
it is the visual cue that tells a reader *"this is a printed paper, not a
PDF"*. For the SAC homepage — which is already styled as parchment and
serif type — adding halftone dots to photos, badges, and divider bands is
the single highest-leverage thing we can do to push the print illusion
further.

### Key terms

| Term                | What it means                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| **Dot**             | The individual ink mark in a halftone.                                        |
| **Cell**            | The repeating unit (square or rotated) that contains one dot.                 |
| **Line screen (lpi)** | The number of cells (or rows of cells) per inch. Higher = finer detail.     |
| **Screen ruling**   | Synonym for lpi. Written "150 lpi" or "150#".                                |
| **Screen angle**    | The rotation of the cell grid (CMYK uses 15°, 45°, 75°, 90° to dodge moiré). |
| **Dot shape**       | Round (default), elliptical, square, diamond, line, brick.                    |
| **AM (amplitude)**  | Dots grow/shrink in a fixed grid. The "classical" newspaper halftone.         |
| **FM (frequency)**   | Dots are all the same size, distributed more or less densely. Stochastic.      |
| **Moiré**           | Distracting rosette pattern that appears when two regular grids overlap.      |
| **Rosette**         | The pleasing flower pattern CMYK dots form when correctly angled.             |

Source: [Halftone — Wikipedia][wp-halftone], [Stochastic screening — Wikipedia][wp-stochastic].

[wp-halftone]: https://en.wikipedia.org/wiki/Halftone
[wp-stochastic]: https://en.wikipedia.org/wiki/Stochastic_screening

### Typical line screens (lpi) we are trying to evoke

| Process                               | lpi      |
| ------------------------------------- | -------- |
| Screen printing (low end)             | 45–65    |
| Laser printer @ 300 dpi               | ~65      |
| Laser printer @ 600 dpi               | 85–105   |
| **Offset press, newsprint**           | **~85**  |
| Offset press, coated paper            | 85–185   |
| Magazines / high-end photo books      | 150–300+ |

Source: [Halftone — Wikipedia (Resolution of halftone screens)][wp-halftone].

For a website that wants to *look* like a mid-century offset newspaper,
**65–100 lpi** is the sweet spot — coarse enough that the dots read as
newsprint, fine enough that they don't dominate small photos. At typical
screen DPI (~96), 85 lpi works out to roughly one dot every **3 px**.

### Visual landmarks from real newsprint

When you zoom in on a real newspaper photo you see:

1. A regular, rotated grid of dots (typically 45° for the K plate).
2. Mid-grey areas where dots are spaced; shadows where dots touch and merge.
3. Bright areas where the dots shrink to almost nothing.
4. **Worn, ink-spread dots** — never perfectly round — because the paper fibres
   pull ink outward.
5. An overall **paper grain** behind everything (random fibrous texture).
6. Slight **misregistration** — the four colour plates don't line up perfectly.

A faithful web halftone only needs to nail items 1–3 to be recognisable.

---

## 2. How to fake halftone in CSS

CSS has no native halftone primitive, but there are three reliable tricks,
each with a different cost / fidelity trade-off.

### 2a. The cheap trick: `radial-gradient` as a dot pattern

The fastest, smallest halftone is just a single dot per tile drawn with
`background-image: radial-gradient(...)` and tiled with `background-repeat`.
This is *not* a true halftone (every dot is the same size), but it is the
classic "newspaper divider band" look.

```css
/* A 6x6 px tile with one 1.1 px-radius dot at the centre. */
.halftone-dots {
  background-image: radial-gradient(
    circle,
    rgba(24, 20, 16, 0.85) 1.1px,
    transparent 1.4px
  );
  background-size: 6px 6px;          /* cell size — lpi-ish control */
  background-color: var(--paper-base); /* the "white" between dots */
}
```

For a **rotated** screen (the classical 45° newspaper angle) wrap the
element so you can use `transform: rotate(...)`:

```css
.halftone-dots--newsprint {
  transform: rotate(45deg);
  background-color: var(--paper-base);
  background-image: radial-gradient(
    circle,
    var(--ink-base) 1.1px,
    transparent 1.4px
  );
  background-size: 6px 6px;
  /* Optional: dot the dots get bigger in shadow areas by stacking
     a second radial layer with a different size. */
  background-image:
    radial-gradient(circle at 25% 25%, var(--ink-base) 1.6px, transparent 2px),
    radial-gradient(circle at 75% 75%, var(--ink-base) 1.6px, transparent 2px);
  background-size: 8px 8px;
}
```

**Limitations**

- Every dot is the same size (no tone variation — just a decoration, not a
  real halftone photo).
- You cannot use it to simulate a photograph without rasterising the photo
  first (then it stops being a CSS trick and becomes an image trick — see
  §2b / §4).
- Aliasing: dots can shimmer when the tile size doesn't divide the viewport
  cleanly.

**Where to use it:** section divider bands, masthead underline, ticket-stub
frames, badge backgrounds. **Already partially implemented** in the SAC
site via `--paper-halftone` (see §6).

Source for the technique: the `radial-gradient` family is documented in
[radial-gradient() — MDN][mdn-radial] and is the same primitive used by
CSS-Tricks' *[Grainy Gradients][ct-grainy]* for noise patterns.

[mdn-radial]: https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient
[ct-grainy]: https://css-tricks.com/grainy-gradients/

### 2b. Mask an image through a dot pattern

Use a repeating dot pattern as a `mask-image`, and put the real photograph
underneath. The mask eats holes in the photo wherever the dots are,
producing the illusion that the photo was *printed* through a screen.

```css
.halftone-mask {
  /* The photo to print */
  background-image: url("/public/assets/club-photo.jpg");
  background-size: cover;
  background-position: center;

  /* The screen — white = keep, transparent = remove */
  --dot: radial-gradient(circle, #000 1.2px, transparent 1.5px);
  mask-image: var(--dot);
  mask-size: 6px 6px;
  mask-repeat: repeat;

  /* Optional: rotate to 45° for the newspaper angle */
  transform: rotate(45deg);
  transform-origin: center;
}
```

`mask-image` accepts both raster images and CSS gradients, so the screen
itself stays a tiny inline `radial-gradient` — no extra HTTP request.
**Browser caveat:** see [CSS-Tricks · mask-image][ct-mask]: `luminance`
masks are spotty across browsers; use `alpha` masks (the default) or
explicitly invert the gradient so transparent = hole, opaque = keep.

This is the most flexible *pure-CSS* halftone approach for an existing
photograph: keep the full-colour photo behind the mask, and only the dot
mask needs to be a single tile.

[ct-mask]: https://css-tricks.com/almanac/properties/m/mask-image/

### 2c. Stack a `radial-gradient` over a faded image (poor-man's halftone)

If masking feels heavy (and on large photos `mask-image` can trigger
composited-layer repaints on every scroll), use **stacked backgrounds**:

```css
.halftone-print {
  background-color: var(--paper-base);
  background-image:
    /* Top layer: the dot screen */
    radial-gradient(circle, var(--ink-base) 1.1px, transparent 1.4px),
    /* Bottom layer: faded B/W photo */
    url("/public/assets/club-photo.jpg");
  background-size: 6px 6px, cover;
  background-blend-mode: multiply, normal;
  background-position: 0 0, center;
  filter: contrast(1.05);
}
```

The `multiply` blend mode lets the photo darken the dots and the paper
show through the gaps — not a *true* halftone (it's still a regular grid
over a photo), but it reads as "photo printed through a screen" and is
much cheaper than the mask approach.

### 2d. CSS-only trade-offs

| Technique                   | File weight | GPU cost   | Tone fidelity | When to pick it                         |
| --------------------------- | ----------- | ---------- | ------------- | --------------------------------------- |
| `radial-gradient` tile      | ~0 KB       | None       | None          | Decorative bands, dividers              |
| `mask-image` of photo       | 0 KB + img  | Medium     | High          | Hero photos where fidelity matters      |
| Stacked blend-mode          | 0 KB + img  | Low        | Medium        | Many photos, performance-sensitive      |
| Pre-rasterised halftone img | One JPG     | None       | Highest       | Static art, infrequent change           |

---

## 3. How to do it in SVG

SVG is the most powerful option for the SAC site: we already use inline
SVGs as data URIs for paper textures (see `variables.css`), and SVGs can
do **real** halftone of a raster image via filter primitives — no
JavaScript required.

### 3a. The primitive recipe (feMorphology + feGaussianBlur on a thresholded image)

A faithful halftone of a real image can be built with **four** SVG filter
primitives chained together:

1. **`<feColorMatrix type="luminanceToAlpha">`** — convert the source
   image to greyscale in alpha.
2. **`<feComponentTransfer>`** with `tableValues="0 0 0 0 0 0 1"` — push
   alpha above a threshold so we end up with a black-or-white (binary)
   mask.
3. **`<feMorphology operator="dilate" radius="X">`** — fatten the white
   islands into round dots. *This is the halftone step.*
4. **(Optional) `<feGaussianBlur stdDeviation="0.5">`** — anti-alias the
   dot edges so they don't shimmer at scale.

Drop in a `<pattern>` of `feMorphology`-shaped dots and you can tile the
output. The `feMorphology` operator is documented in
[MDN · feMorphology][mdn-femorph].

```svg
<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <filter id="halftone" x="0" y="0" width="100%" height="100%">
    <!-- 1. Greyscale the photo -->
    <feColorMatrix in="SourceGraphic" type="matrix"
      values="0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0.299 0.587 0.114 0 0" />
    <!-- 2. Threshold to black-or-white -->
    <feComponentTransfer>
      <feFuncA type="discrete" tableValues="0 0.5 1"/>
    </feComponentTransfer>
    <!-- 3. Fatten to round dots -->
    <feMorphology operator="dilate" radius="2"/>
    <!-- 4. Soften edges -->
    <feGaussianBlur stdDeviation="0.4"/>
  </filter>

  <image href="/public/assets/club-photo.jpg"
         width="300" height="200" filter="url(#halftone)"/>
</svg>
```

You can change `radius` to control dot size, and chain a `<feTile>` +
`<feComposite in="SourceGraphic" in2="..." operator="in"/>` to mask the
photo into a dot pattern (the inverse — dots are the holes, photo shows
between them).

### 3b. The dotted overlay pattern (background only)

If you only need a tiled dot *background* (no per-image halftone), use a
single-circle SVG as a 4x4 or 6x6 px tile and inline it as a data URI.
This is exactly what the SAC site already does in `variables.css`:

```css
--paper-halftone:
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><circle cx='1' cy='1' r='0.55' fill='rgb(24, 20, 16)'/></svg>");
```

To get a **45° rotated** version, add `transform="rotate(45 3 3)"` to
the SVG `<g>`:

```css
--paper-halftone-45:
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><g transform='rotate(45 3 3)'><circle cx='1' cy='1' r='0.55' fill='rgb(24, 20, 16)'/></g></svg>");
```

### 3c. The trick the SAC site already uses — `feTurbulence` for grain

The grain texture in `variables.css` (`--paper-grain`) is *not* halftone
(it's continuous-noise paper fibre), but it's the other half of the
newspaper look. Generated entirely in the browser:

```svg
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/>
    <feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0.18 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>
```

`feTurbulence` produces Perlin/fractal noise; the `feColorMatrix` then
turns the multi-channel noise into warm-brown grain with low alpha.
This technique is documented in [CSS-Tricks · Creating Patterns With SVG
Filters][ct-svgfilters], which is the cleanest single reference we have
for in-browser SVG noise/grain/halftone patterns.

[ct-svgfilters]: https://css-tricks.com/creating-patterns-with-svg-filters/
[mdn-femorph]: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feMorphology

### 3d. SVG trade-offs

| Filter chain            | Speed     | Quality          | Caveat                                        |
| ----------------------- | --------- | ---------------- | --------------------------------------------- |
| `feMorphology` dilate   | Fast      | Real halftone    | Binary image first — loses smooth greys       |
| `feTurbulence` grain    | Medium    | Texture, not halftone | Use as a layer under halftone, not on its own |
| Threshold + dilate + blur | Slow on big images | Best result | Cache as PNG if used on hero photo           |
| Pre-baked SVG circle tile | Negligible | Decoration only | One dot size, no tonal variation              |

The single biggest performance trap is applying a multi-primitive filter
to a full-bleed hero photo on every paint. **Always** pre-render to a
PNG/JPG at build time if the source image is static.

---

## 4. How to do it in Canvas (JavaScript)

Use Canvas when you need to **generate** the halftone of a *user-provided*
or *runtime-loaded* image — i.e. the gallery page where each club uploads
its own photo.

### 4a. The naïve algorithm

For each pixel in the source image, compare its luminance to a periodic
threshold (a Bayer matrix or sin wave), and paint a dot of corresponding
size. Two implementations, ordered by complexity:

```js
// 1) Ordered dithering (Bayer matrix) — fast, no per-pixel sizing.
function halftoneBayer(srcImageData) {
  const { data, width, height } = srcImageData;
  const out = new ImageData(width, height);
  const M = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      const threshold = (M[y % 4][x % 4] / 16) * 255;
      const v = lum < threshold ? 0 : 255;
      out.data[i] = out.data[i+1] = out.data[i+2] = v;
      out.data[i+3] = 255;
    }
  }
  return out;
}

// 2) Per-cell circle — gives a much more "newsprint" look.
// For each cell of size CELL×CELL, compute average luminance,
// then draw a circle whose radius is proportional to darkness.
function halftoneCircles(ctx, src, cell = 6) {
  const { width: w, height: h } = src;
  ctx.fillStyle = '#f4f0e6';                 // paper colour
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#181410';                 // ink colour
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(src, 0, 0);
  const img = tctx.getImageData(0, 0, w, h).data;
  for (let cy = 0; cy < h; cy += cell) {
    for (let cx = 0; cx < w; cx += cell) {
      // Average luminance over the cell.
      let sum = 0, n = 0;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const px = cx + x, py = cy + y;
        if (px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        sum += 0.299 * img[i] + 0.587 * img[i+1] + 0.114 * img[i+2];
        n++;
      }
      const lum = sum / n / 255;            // 0 = black, 1 = white
      const r = (cell / 2) * Math.sqrt(1 - lum); // dot area ∝ darkness
      ctx.beginPath();
      ctx.arc(cx + cell / 2, cy + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

The second algorithm is the "classical" newspaper halftone: per-cell dot
with radius proportional to √(1 - luminance). Rotating the grid by 45°
gives the canonical newspaper look:

```js
// Rotate the cell grid by 45°: translate to centre, rotate, offset.
ctx.save();
ctx.translate(w / 2, h / 2);
ctx.rotate(Math.PI / 4);
ctx.translate(-w / 2, -h / 2);
// ... run halftoneCircles here ...
ctx.restore();
```

### 4b. The cheap improvement: WebGL / GPU shaders

For a real-time halftone of *any* photo, the standard trick is a fragment
shader that, for every output pixel, looks up the corresponding cell's
luminance and decides whether to draw ink:

```glsl
// GLSL fragment shader sketch — not for production, but the shape.
uniform sampler2D u_image;
uniform vec2  u_cell;   // e.g. (6.0, 6.0)
uniform float u_angle;  // e.g. 0.785398 (= 45°)
varying vec2 v_uv;
void main() {
  // Rotate the sample point.
  float c = cos(u_angle), s = sin(u_angle);
  vec2 p = mat2(c, -s, s, c) * v_uv;
  // Cell coordinates.
  vec2 cellCoord = floor(p * u_cell);
  // Sample luminance at the cell centre.
  vec2 cellUV = (cellCoord + 0.5) / u_cell;
  vec3 rgb = texture2D(u_image, cellUV).rgb;
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  // Decide whether this pixel is inside the dot.
  float radius = 0.5 * sqrt(1.0 - lum);
  float dist = length(fract(p * u_cell) - 0.5);
  float ink = step(dist, radius);
  gl_FragColor = vec4(vec3(0.094, 0.078, 0.063), ink);
}
```

This is what production libraries (Pixi filters, Three.js postprocessing
shaders, WebGL Image Filter) do under the hood. For the SAC site we don't
need real-time — pre-rendering once is enough.

### 4c. Pre-rendering strategy for the gallery

For the gallery / club-portrait pages, the right pipeline is:

```
uploaded JPG
    │
    │  build-time (Node, sharp / canvas)
    ▼
halftone-circles.png     (printed version, 1×)
halftone-circles@2x.png  (retina)
halftone-bayer.png       (smaller, faster fallback)
    │
    ▼
served as <img src="...halftone-circles.png"> with srcset
```

This keeps the halftone out of the runtime entirely, which matters
because:

- Halftone-on-canvas is O(W·H) per image — for a 1600×1000 photo that's
  ~1.6 M iterations, noticeable on low-end phones.
- The output is **never going to change** once rendered. There is no reason
  to recompute it on every visit.

The [Dither — Wikipedia][wp-dither] article documents the dithering
algorithms (Floyd–Steinberg, Atkinson, etc.) and their visual differences.
The `halftone` ordered matrix inside Floyd–Steinberg's family produces
exactly the "newspaper Bayer" look (cross-hatched).

[wp-dither]: https://en.wikipedia.org/wiki/Dither

### 4d. Canvas trade-offs

| Approach             | Speed (1600×1000) | Best for                | Caveats                      |
| -------------------- | ----------------- | ----------------------- | ---------------------------- |
| Bayer threshold      | ~10 ms            | Static pre-render       | Cross-hatch, not dots        |
| Per-cell circles     | ~80 ms            | Authentic newspaper     | Slowest; iterate per cell    |
| WebGL shader         | <1 ms / frame     | Live filters            | Needs WebGL context          |
| Pre-rendered PNG     | 0 ms              | Anything static         | Largest asset                |

---

## 5. Off-the-shelf libraries

If we don't want to write the algorithm ourselves, here is what's out
there. **All of these add a runtime dependency** — weigh against the
SAC site's "pure static HTML/CSS/JS" constraint.

| Library        | What it does                                  | Size    | License | Notes |
| -------------- | --------------------------------------------- | ------- | ------- | ----- |
| **halftone.js** ([`meodai/halftone`](https://github.com/meodai/halftone)) | Canvas halftone of an arbitrary image — SVG, per-channel, dot/line/rect shapes | ~6 KB min | MIT | Closest match to "I just want one function that does it." |
| **`@pixi/filters-halftone`** | PixiJS filter — same algorithm, GPU accelerated | ~3 KB + Pixi | MIT | Only worth it if Pixi is already in the bundle |
| **`three/examples/jsm/postprocessing/HalftonePass`** | Three.js postprocessing pass | Three.js dep | MIT | 3D-only — overkill for 2D |
| **`p5.js` `loadImage` + custom shader** | Educational, easy to fork | p5 dep (~200 KB) | LGPL | Useful for prototyping |
| **ImageMagick `+dither`** / **GIMP halftone script** | Build-time, no runtime code | n/a (CLI) | Apache / GPL | Cleanest option if halftone is rendered once at deploy time |

**Recommendation for SAC:** keep the runtime bundle clean. Use a build-time
tool (Node + `sharp` + a halftone canvas script, or an ImageMagick
one-liner) to pre-render every photo into a halftone PNG, then serve the
PNG as a normal `<img>`. This way the SAC site stays zero-dependency in
the browser, which is its current stance (see `README.md` and
`docs/loader-design.md`).

ImageMagick example (for the record — *not* tested on the SAC site):

```bash
convert input.jpg -colorspace Gray \
  -ordered-dither threshold,4 \
  halftone-output.png
```

---

## 6. How to combine halftone with the existing paper-grain texture

The SAC site already stacks three SVG backgrounds on the home page
(`css/main.css:111-118`):

```css
body[data-page="home"] {
  background-image:
    var(--paper-edge-wear),     /* 1. Dark vignette around the page */
    var(--paper-stains),         /* 2. Warm radial stains */
    var(--paper-grain);          /* 3. Fine feTurbulence grain */
  background-size: 320px 320px, 100% 100%, 160px 160px;
  background-blend-mode: multiply, normal, multiply;
  background-attachment: fixed, fixed, fixed;
}
```

And `css/variables.css:111-112` defines a halftone SVG that is *defined
but not yet used on the body*:

```css
--paper-halftone:
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><circle cx='1' cy='1' r='0.55' fill='rgb(24, 20, 16)'/></svg>");
```

### Recommended layering (in `paint` order — top → bottom)

| z | Layer         | Source var            | `background-size`  | `background-blend-mode` |
| - | ------------- | --------------------- | ------------------ | ----------------------- |
| 4 | **Halftone** (rotated 45°) | `--paper-halftone-45` | `5px 5px`        | `multiply`              |
| 3 | Grain         | `--paper-grain`       | `160px 160px`      | `multiply`              |
| 2 | Stains        | `--paper-stains`      | `100% 100%`        | `normal`                |
| 1 | Edge wear     | `--paper-edge-wear`   | `320px 320px`      | `multiply`              |
| 0 | Paper colour  | `var(--paper-base)`   | n/a (background-color) | n/a               |

Why this order?

- **Edge wear on the bottom** so it darkens the page edges but doesn't
  contaminate the halftone pattern in the middle of the page.
- **Stains as a warm wash** — they only need to tint, not blend.
- **Grain next** — its 160-px tile is much coarser than the halftone's
  5-px tile, so the halftone reads on top of the grain rather than
  getting lost.
- **Halftone on top with `multiply`** — this is the new layer; it punches
  through the grain to leave crisp dots, exactly the way ink sits on top
  of paper fibre.

### Composite recipe for a single photo card

For the gallery / club cards, the cleanest CSS for a "printed photo" look
is:

```css
.printed-photo {
  position: relative;
  background-color: var(--paper-base);
  overflow: hidden;
  isolation: isolate;             /* keep blend modes local */
}
.printed-photo > img {            /* the photo */
  width: 100%; height: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.05);
}
.printed-photo::after {           /* the screen */
  content: "";
  position: absolute; inset: 0;
  background-image: var(--paper-halftone-45);
  background-size: 4px 4px;       /* tighter dot for small cards */
  mix-blend-mode: multiply;       /* ink * paper */
  pointer-events: none;
}
```

If you want a stronger halftone (dots replace the photo), swap the
`::after` for a `mask-image`:

```css
.printed-photo {
  mask-image: var(--paper-halftone-45);
  mask-size: 5px 5px;
  mask-repeat: repeat;
  /* Photo, rotation, sizing as above */
}
```

### What we already have, what we are missing

| Already shipped                                                                 | Missing                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `--paper-grain` (feTurbulence noise, 160×160 tile)                              | A **rotated** `--paper-halftone-45` token.                                                  |
| `--paper-edge-wear`, `--paper-stains` (warm radial washes)                      | A halftone *of an image* (mask-image recipe in §2b is the lowest-effort answer).            |
| `--paper-halftone` (6×6 dot tile, defined but unused on body)                   | A CMYK-angle palette of halftone tiles if we ever want to evoke 4-colour printing.           |
| `--paper-fold-crease`, `--paper-coffee-stain`                                   | Pre-rendered halftone PNGs in `public/assets/processed/` for the gallery (see §4c).         |
| Stack of 3 backgrounds on the home page with `background-blend-mode`            | A documented convention for which blend mode goes on which layer (proposed in §6).         |

The cheapest, highest-impact next step is therefore:

1. Add `--paper-halftone-45` to `variables.css`.
2. Add it as layer 4 of the body background stack in `main.css:111`.
3. Optionally, swap `mask-image` on a hero `<img>` on the gallery page to
   test the photo-through-a-screen effect.

---

## 7. Trade-offs summary

| Concern               | Cheapest option                                | Most faithful option                                  | What we lose going cheap                          |
| --------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| **File weight**       | CSS gradient (0 bytes asset)                   | Pre-rendered PNG (10–100 KB per photo)                | Tonal fidelity / per-image customisation          |
| **Runtime cost**      | Stacked `radial-gradient`                      | Pre-rendered PNG                                      | Background-blend-mode stack can hit scroll FPS    |
| **Accessibility**     | Pure CSS — no extra DOM                         | `<img>` with proper `alt`                             | CSS halftones need `prefers-reduced-motion`-safe blend modes (usually fine — halftones don't animate) |
| **Theming**           | CSS vars (already the SAC pattern)             | Re-render pipeline                                    | The PNG approach needs a build step to recolour   |
| **Print fidelity**    | 6×6 dot tile (~equivalent to 400 lpi @1×)      | Per-image halftone (~85 lpi newsprint)                | Decorative dots vs. photo-correct tonal variation |
| **Browser support**   | Gradients + blend-mode: all evergreen          | `mask-image`: all evergreen; WebGL: all but IE        | Nothing meaningful — every technique ships in    |
| **Caching**           | Always cached (part of CSS)                    | Browser-cached as an image                            | Re-rendering requires invalidation                |

### Accessibility notes

- Halftone overlays are decorative. They should never be the *only*
  carrier of information. If a "printed photo" conveys the club, the photo
  itself needs `alt` text.
- The `background-blend-mode: multiply` stack in the body background is
  fine with `prefers-reduced-motion` and `prefers-reduced-transparency`
  (it neither moves nor affects contrast adversely). For more aggressive
  halftone effects on text, gate them behind `@media (prefers-contrast: more)`
  so users who need high contrast still get clean text.
- A pure CSS halftone on text via `mask-image` can break the user's
  ability to select text. Avoid that on `<p>` / `<h*>` content; reserve
  it for `<img>` and decorative `<div>` wrappers.

### Performance notes

- Backgrounds on `body[data-page="home"]` are already
  `background-attachment: fixed` — this means the browser rasterises them
  once. Adding a 4th layer (halftone) is fine.
- For the gallery cards, prefer `mask-image` of an inlined SVG over a
  large halftone PNG per card. SVG masks scale to retina for free.
- A `feMorphology` chain inside an inline SVG that is referenced from
  many places (e.g. as a CSS filter) is re-evaluated each paint; do not
  apply it to `<img>` elements that animate.

---

## 8. Quick decision guide for the next PR

```
Need halftone on a single static image (hero, badge, illustration)?
  └─ YES → Pre-render to PNG at build time. Done.
            (§4c, ImageMagick / sharp pipeline)

Need halftone on many user-uploaded photos (gallery)?
  └─ YES → Same pre-render pipeline, batched on upload or at build.
            Keep the SVG mask-image recipe as the *fallback* display
            when no halftone PNG is available.

Need halftone as a *decorative band* (divider, underline, badge bg)?
  └─ YES → Add `--paper-halftone-45` to variables.css, stack it as
            layer 4 of the body background. (~5 lines of CSS.)

Need a live halftone filter (slider demo, interactive demo page)?
  └─ YES → halftone.js (~6 KB) or a small Canvas script.
            Pre-render to PNG after the user settles on settings.

Need a CMYK look (multiple angled screens)?
  └─ YES → Four `--paper-halftone-XX` tiles, one per plate,
            each at a different `transform: rotate()` and blended
            with `screen` / `multiply`. Expensive but authentic.
```

---

## 9. Sources

### Encyclopaedic / background

- [Halftone — Wikipedia][wp-halftone] — primary reference for history,
  screen rulings, AM vs FM, dot shapes, screen angles, moiré.
- [Stochastic screening — Wikipedia][wp-stochastic] — FM screening
  (frequency-modulated halftone), its pros and cons.
- [Dither — Wikipedia][wp-dither] — dithering algorithms
  (Floyd–Steinberg, Atkinson, Bayer matrix) and how they relate to halftone.
- [Newsprint — Wikipedia][wp-newsprint] — paper substrate; explains why
  the dots in newsprint look the way they do (ink wicking, low-quality
  uncoated paper).
- [Line screen — Wikipedia][wp-linescreen] (separate article, may 404) —
  the lpi unit.

### CSS / SVG techniques

- [CSS-Tricks · Grainy Gradients][ct-grainy] — the `feTurbulence`
  noise-as-CSS-background technique the SAC site already uses for
  `--paper-grain`.
- [CSS-Tricks · Creating Patterns With SVG Filters][ct-svgfilters] —
  Bence Szabó's deep dive on `feTurbulence`, `feColorMatrix`,
  `feComponentTransfer` and how to chain them into patterns.
- [CSS-Tricks · mask-image][ct-mask] — when to use luminance vs alpha
  masks, browser support, and the `mask-image: gradient(...)` trick.
- [MDN · feMorphology][mdn-femorph] — the primitive that turns a
  thresholded image into round dots (the actual halftone step).
- [MDN · radial-gradient()][mdn-radial] — the workhorse for
  decorative dot tiles.
- [MDN · mask-image][mdn-mask] — same as the CSS-Tricks reference but
  from the spec side.

### Libraries

- [`meodai/halftone` on GitHub](https://github.com/meodai/halftone) —
  the canonical `halftone.js` library. Canvas-based, ~6 KB minified.
- [PixiJS Filters — Halftone](https://pixijs.io/filters/docs/FilterHalftone.html)
  — GPU-accelerated halftone for the Pixi renderer.
- [Three.js HalftonePass](https://threejs.org/examples/?q=halftone) —
  halftone as a postprocessing pass for 3D scenes.

### General image processing

- [ImageMagick — `+dither` option](https://imagemagick.org/script/command-line-options.php#dither) —
  the CLI one-liner for build-time halftone.
- [sharp (libvips) — halftone via composite](https://sharp.pixelplumbing.com/)
  — Node.js image processing; the cleanest build-time halftone in JS.

[wp-newsprint]: https://en.wikipedia.org/wiki/Newsprint
[wp-linescreen]: https://en.wikipedia.org/wiki/Line_screen
[mdn-mask]: https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image

---

## 10. Top 3 actionable findings

1. **Add a `--paper-halftone-45` token and stack it as layer 4 of the
   `body[data-page="home"]` background in `css/main.css`.** Zero JS,
   zero new HTTP requests, adds the most-on-brand single visual cue we
   can ship (~5 lines of CSS, ~300 bytes of inline SVG). The token,
   the stacking convention, and the blend mode are all specified in §6.

2. **Pre-render every gallery / club-portrait photo to a halftone PNG at
   build time** (Node + `sharp`, or ImageMagick) and serve them as
   `<img>` with `srcset` for retina. Keeps the runtime zero-dependency
   (preserving the SAC site constraint), avoids the O(W·H) cost of
   Canvas halftone on first paint, and lets us use a real
   per-cell-circles algorithm for proper newsprint tone (§4a algorithm
   2).

3. **For the few *hero* photos that need to be interactive / live**
   (e.g. a "see the halftone appear" teaser on the loader-finale page
   or a future "before / after" comparison), use the **CSS `mask-image`
   of an inlined `radial-gradient`** approach (§2b). It is the only
   technique that gives real per-pixel tonal halftone fidelity without
   any new build step or JS dependency, and it works in every evergreen
   browser.
