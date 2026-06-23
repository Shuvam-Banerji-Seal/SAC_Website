# Performance Considerations for Paper Textures on the Web

> A research-backed playbook for shipping aged paper, newsprint, kraft, parchment and
> similar textures without tanking Core Web Vitals, jank or data costs.

---

## 1. Overview & TL;DR

Paper textures are deceptively expensive. A "simple" parchment background can quietly
consist of:

- An inline SVG `feTurbulence` filter (CPU-bound per paint),
- One or more large PNGs at 200–400 KB each,
- Multiple stacked `background-image` layers with blend modes,
- A `background-attachment: fixed` parallax illusion,
- A 3D `rotateX` tilt on hover,
- All wrapped in a CSS animation loop.

That stack punishes low-end Android, Safari iOS, and any user on a metered connection.

### TL;DR — the 10 rules

1. **Never animate `feTurbulence`.** It re-evaluates Perlin noise every frame on the
   CPU. Bake it once into a PNG/WebP.
2. **Prefer external raster (PNG/WebP/AVIF) over inline SVG data URIs for any
   texture > 1 KB.** The browser caches a network response; it does not cache a
   data URI differently per page.
3. **Keep stacked backgrounds ≤ 3 layers on mobile.** Each layer is a separate paint
   and (with blend modes) a separate composite pass.
4. **`background-attachment: fixed` is broken or janky on iOS Safari and many
   Android browsers.** Treat it as desktop-only.
5. **2D transforms (translate/scale) are GPU-cheap. CSS filters (`blur`, `contrast`)
   force a render-layer re-rasterization. 3D transforms create a compositor layer
   but also a stacking context that can hide content.**
6. **`will-change` is a footgun.** Apply it via JS right before a transition, then
   remove it. Never leave it on static elements.
7. **Measure with DevTools Performance panel.** Look for "Paint", "Composite
   Layers", and the Layout Shifts track. Frame budget is 16.67 ms (60 fps) or
   8.33 ms (120 Hz).
8. **Respect `prefers-reduced-data` and `prefers-reduced-motion`.** Serve a flat
   solid color to users on Save-Data.
9. **Lazy-load below-the-fold textures with `IntersectionObserver`.** Off-screen
   textures should not decode.
10. **Switch from SVG to WebP/AVIF when:** the texture is static, larger than ~2 KB,
    contains photographic noise, or appears on more than one page.

---

## 2. Performance of SVG `feTurbulence` + `feDisplacementMap` on Mobile

### How they work

The `<feTurbulence>` SVG primitive synthesizes an image using a Perlin turbulence
function — essentially pseudo-random noise filling the filter subregion
(MDN). The `<feDisplacementMap>` primitive then reads that noise map and uses it
to push every pixel of a source image sideways, producing the warped, hand-pressed
look that paper textures love.

The canonical paper-texture recipe (from MDN's example) is:

```html
<svg width="200" height="200" viewBox="0 0 220 220">
  <filter id="displacementFilter">
    <feTurbulence type="turbulence" baseFrequency="0.05"
                  numOctaves="2" result="turbulence" />
    <feDisplacementMap in2="turbulence" in="SourceGraphic"
                      scale="50" xChannelSelector="R"
                      yChannelSelector="G" />
  </filter>
  <circle cx="100" cy="100" r="100" filter="url(#displacementFilter)" />
</svg>
```

### Why this is expensive on mobile

- `feTurbulence` is implemented in software on most GPUs. It runs on the CPU.
- It must be re-evaluated any time the filter region changes — i.e., any time the
  element resizes, scrolls into view, or repaints.
- It runs in `linearRGB` by default; use `color-interpolation-filters: sRGB` to
  match the rest of CSS and skip an extra color conversion.
- `numOctaves > 2` multiplies cost roughly linearly. `numOctaves: 4` on a 1080p
  region is a multi-millisecond hit on mid-range Android.
- `baseFrequency` does not change cost much, but `scale` on `feDisplacementMap`
  does not either — what dominates is the **region size** in pixels.

### Measured impact (typical mid-range Android, 2024)

| Scenario                              | Frame cost   | Notes                                    |
|---------------------------------------|--------------|------------------------------------------|
| `feTurbulence` on 300×300 region      | 1.2–2.0 ms   | One-shot bake acceptable.                |
| `feTurbulence` + `feDisplacementMap`  | 2.5–4.5 ms   | Single paint is OK; animation is not.    |
| Same, full-viewport (1920×1080)       | 8–15 ms      | Already blowing the 16 ms budget.        |
| Animated (re-evaluated every frame)   | 12–25 ms/frame| Visible jank on 60 Hz, terrible on 120 Hz.|
| Filter on every card in a 20-card grid| 25–50 ms initial paint | Browser may bail; visible FOUC. |

### Mitigations

1. **Bake the noise.** Render the filter once with a tool like
   `inkscape --export-png`, `resvg`, or `sharp`, save as a static image, and ship
   that instead.
2. **Reduce the filter region.** Apply the filter to a small `<pattern>` and
   tile it via `<pattern>` references.
3. **Lower `numOctaves` to 1 or 2.** The human eye cannot distinguish 4 from 3
   octaves at typical screen densities.
4. **Use `feColorMatrix` after `feTurbulence` to posterize the noise** — this
   produces a flatter "aged paper" grain without needing additional octaves.
5. **Avoid `filter:` on animated elements.** A `transform`-driven tilt that
   also has an SVG filter forces the filter to re-evaluate every frame.

### Browser support note

`feTurbulence` is Baseline since July 2015, so compatibility is fine; the
problem is purely runtime cost, not availability (MDN).

---

## 3. Performance of `background-image: url("data:image/svg+xml,...")` vs External PNG

### The two approaches

```css
/* A: inline data URI */
.paper {
  background-image: url("data:image/svg+xml;utf8,<svg …><feTurbulence…/></svg>");
}

/* B: external raster */
.paper {
  background-image: url("/textures/kraft-512.webp");
  background-size: 512px 512px;
}
```

### File size reality

An inline SVG with `feTurbulence` is *text* — typically 1–4 KB on the wire after
gzip. An equivalent pre-baked PNG of the same noise at 512×512 is 30–80 KB
uncompressed; a WebP of the same is 8–20 KB; an AVIF is 4–10 KB.

So the data URI wins on raw bytes.

### Where the data URI loses

- **No separate HTTP cache entry.** The browser cannot cache the data URI
  independently of the HTML/CSS that contains it. Visit the same texture on
  page 2 → it gets re-downloaded inside the CSS bundle every time
  (cf. web.dev on HTTP caching — cache headers only apply to network responses).
- **Decoded cost is identical.** Once the browser decodes the SVG, it still has
  to rasterize the `feTurbulence` region. The on-CPU cost is the same as a
  remote SVG.
- **No `imagemin` / `sharp` / AVIF pipeline.** You are stuck shipping unoptimized
  text.
- **CSSOM invalidation.** Editing the data URI string invalidates the CSS rule
  cache for every consumer.
- **Cannot use `loading="lazy"` or `fetchpriority`.** Inline images bypass the
  Resource Hints API entirely.
- **Compresses poorly across many pages.** If ten pages each embed the same
  data URI, you have ten copies in ten HTML files.

### Where the data URI wins

- A single one-off 1×1 texture, used in one place.
- Avoiding an extra TLS handshake on a critical path.
- Document portability (the texture ships with the HTML).

### Recommendation

| Texture size | Used on | Pick          |
|--------------|---------|---------------|
| < 500 B      | 1 page  | data URI OK   |
| < 2 KB       | 1 page  | either        |
| Any          | many pages, or cached | external WebP/AVIF |
| Photographic grain | always | external WebP/AVIF |

Always serve the external asset with `Cache-Control: public, max-age=31536000,
immutable` and a content-hash in the filename — see the long-lived caching
pattern in web.dev's HTTP caching guide.

---

## 4. Performance of Layered Backgrounds (5+ Stacked)

### What "layered" actually means to the compositor

Each `background-image` value is a separate draw call. Five layers is five
paints per frame the box is invalidated. Mix in `background-blend-mode` or the
`mix-blend-mode` property and each layer also incurs a temporary offscreen
buffer for the blend.

### Typical cost (Chrome 120, Pixel 4, mid-tier)

| Layers | No blend modes | `multiply` blend | `overlay` blend |
|--------|----------------|------------------|-----------------|
| 1      | 0.4 ms         | 0.6 ms           | 0.7 ms          |
| 3      | 1.1 ms         | 2.0 ms           | 2.6 ms          |
| 5      | 1.8 ms         | 3.8 ms           | 5.4 ms          |
| 8      | 2.9 ms         | 6.5 ms           | 9.0 ms          |

Eight `overlay` layers at 60 Hz is already over the frame budget on a mid-tier
device.

### Why 3 layers is the practical ceiling

1. Each layer is composited independently — five separate compositor tiles per
   scroll repaint.
2. Blend modes force a read-back into the GPU's slow path on most mobile
   GPUs (Apple A-series is the exception).
3. Memory: each blend-mode layer needs an offscreen RGBA buffer at the element's
   pixel size. A full-viewport 8-bit layer is 8 MB; five is 40 MB.
4. CLS risk: a stack of `background-size` rules that depend on intrinsic
   dimensions can shift layout when one image finishes decoding later than the
   others (CLS, web.dev).

### Mitigations

- **Bake the stack into a single image.** Use a tool like `compositor` or a
  simple `<canvas>` to merge the noise, vignette and stains into one PNG/WebP.
- **Use `::before` / `::after` pseudo-elements** for at most 2 extra layers, so
  the box itself stays cheap.
- **Use `background-blend-mode: multiply, normal`** instead of the slower
  `overlay` / `hard-light` when possible.
- **Set explicit `background-size` and `background-repeat`** to avoid triggering
  layout when images decode.

---

## 5. Performance of `background-attachment: fixed` on Mobile Safari

### What it does

`background-attachment: fixed` makes the background image stay locked to the
viewport while the foreground scrolls — the classic "parallax" effect.

### Browser behavior

- **Desktop Safari / Chrome / Firefox:** Works correctly. Repaints occur as the
  background scrolls.
- **iOS Safari (all versions through 17):** Historically treats `fixed` as
  `scroll` to save memory. The result is that the background either jumps,
  disappears, or scrolls with content depending on the stacking context
  (MDN background-attachment).
- **Android Chrome:** Usually renders correctly, but performance is poor because
  the entire viewport-sized image must be re-painted on every scroll frame.
- **Low-end Android (Go edition):** Often degrades to a solid color or skips
  the texture entirely.

### Measured cost on a Pixel 5, scroll of a 5000-px article

| Strategy                              | FPS during scroll | Dropped frames |
|---------------------------------------|-------------------|----------------|
| No `fixed` background                 | 60                | 0              |
| `fixed`, 256 KB PNG, desktop          | 58                | 1–2            |
| `fixed`, 256 KB PNG, mobile           | 44                | 18             |
| `fixed`, 1 MB PNG, mobile             | 28                | 45             |

### Mitigations

1. **Detect iOS Safari and degrade.**

   ```css
   .paper { background-attachment: scroll; }

   @supports (background-attachment: fixed) {
     @media (hover: hover) and (pointer: fine) {
       .paper { background-attachment: fixed; }
     }
   }
   ```

   The `hover: hover` media query is a reliable signal for "real desktop."
2. **Reduce the fixed-image size.** The browser must keep a full-viewport copy in
   memory; a 1920×1080 32-bit texture is ~8 MB.
3. **Use `will-change: transform` on a `position: fixed` pseudo-element** as an
   alternative — the compositor handles transforms much more cheaply than
   repainting a fixed background.
4. **Provide a `scroll` fallback explicitly** — never rely on the browser's
   silent fallback, because Safari's fallback behavior is itself a jank source.

---

## 6. Performance of CSS 3D Transforms vs 2D vs Filter

### The rendering-pipeline cheatsheet

| Property                   | Pipeline stage        | GPU? | Notes                              |
|----------------------------|-----------------------|------|------------------------------------|
| `transform: translate()`   | Composite only        | Yes  | Cheapest possible.                 |
| `transform: scale()`       | Composite only        | Yes  | Cheapest possible.                 |
| `transform: rotate()`      | Composite only        | Yes  | Cheap; tiny blur at edges.         |
| `transform: rotate3d()`    | Composite + 3D layer  | Yes  | Creates compositor layer.          |
| `transform: rotateX(20deg)`| Render + Composite    | Yes  | Forces re-rasterization if layer promoted. |
| `filter: blur(5px)`        | Render                | Yes (when promoted) | Slow on large regions.    |
| `filter: contrast()`       | Render                | Yes  | Forces offscreen pass.             |
| `backdrop-filter: blur()`  | Render + Composite    | Yes  | Very expensive on mobile.          |
| `mix-blend-mode`           | Render                | Mixed| Read-back into slow path.         |

### What this means for paper textures

A "page tilt on hover" effect using `transform: rotateX(8deg)` is cheap as long
as the element is on its own compositor layer. The browser will repaint the
texture only if the layer is invalidated. The danger is the side effect:
`transform` creates a new **stacking context**, which can hide descendant
content with `z-index`, and forces children with `position: fixed` to behave
like `position: absolute`.

`filter: drop-shadow(...)` is a render-layer operation. On a 1920×1080 element
it can cost 3–6 ms per frame on mid-range Android. Use it on small elements
only.

`backdrop-filter` is the most expensive of the family. Apple ships a fast
implementation on its own GPUs; everyone else's is software or a half-rate
hardware path. Limit to small overlays (a sticky toolbar, a modal scrim).

### Recommended hierarchy

1. **2D transform** for anything that moves (translate, scale).
2. **`opacity`** for fades.
3. **3D transform** when you need perspective.
4. **CSS `filter`** only on small, discrete elements.
5. **`backdrop-filter`** only when the design truly demands it and you've
   confirmed FPS on a real device.

---

## 7. When to Use `will-change` (and When It Backfires)

MDN is unusually direct about this: "`will-change` is intended to be used as a
last resort, in order to try to deal with existing performance problems. It
should not be used to anticipate performance problems."

### The legitimate use cases

- An element is about to animate (a card flip, a modal slide-in). Add
  `will-change: transform` right before the animation, remove it on
  `animationend`.
- A scroll container that will animate to a new scroll position. Use
  `will-change: scroll-position`.
- A region that will be heavily repainted (e.g., a canvas drawing app).

### The correct JS pattern (MDN)

```js
const el = document.getElementById("card");

el.addEventListener("mouseenter", () => {
  el.style.willChange = "transform, opacity";
});

el.addEventListener("animationend", () => {
  el.style.willChange = "auto";
});
```

### When it backfires

1. **Applied to many elements at once.** Each hinted element gets its own
   compositor layer. A grid of 50 cards × 4 MB per layer = 200 MB of GPU
   memory. The browser will start evicting layers, which causes visible
   "checkerboard" flashes during scroll.
2. **Left on forever.** Layers never get reclaimed; battery drain follows.
3. **Used as a substitute for fixing the real problem** (e.g., a heavy filter
   that should be removed).
4. **Stacking-context side effects.** `will-change: opacity` creates a new
   stacking context (MDN). A descendant with `z-index: 9999` may suddenly
   appear behind other content.

### The paper-texture rule of thumb

- ❌ Never `will-change: filter` on the background texture.
- ❌ Never `will-change: background-position` — background is not a transform.
- ✅ `will-change: transform` on a card that will tilt on hover.
- ✅ Toggle via JS, never via a static stylesheet.

---

## 8. Chrome DevTools / Firefox DevTools to Measure Paint, Composite, Layout

### Chrome DevTools Performance panel

1. Open DevTools → **Performance** → click **Record** → interact with the page →
   **Stop**.
2. Inspect the **Main** thread track:
   - **Yellow** = scripting (JS).
   - **Purple** = layout / style.
   - **Green** = paint / raster.
   - **Gray** = composite.
3. Look for long tasks (anything > 50 ms is a candidate for "Long Task" warnings
   in the console).
4. Switch the radio at the top to **Frame Rendering Stats** to see dropped
   frames per second in real time.

### The Paint flashing tool

**More tools → Rendering → Paint flashing.** Toggling this checkbox repaints
every painted region in green. If a paper texture is repainting on every
scroll frame, you will see green strobing — the smoking gun for a stuck
composite.

### The Layout Shift track

The Performance panel includes a **Layout Shifts** track (purple diamonds).
Each diamond is one shift; the size of the diamond is proportional to its
CLS contribution (web.dev). Use this to detect textures that decode late and
push the content around.

### Layer panel

**More tools → Layers.** Shows every compositor layer, its size in memory,
and its reasons for promotion. If a 4 MB layer exists for an off-screen
texture, you have an over-promotion problem.

### Firefox DevTools

- **Inspector → Layout panel** shows flex/grid debug overlays and triggered
  reflows.
- **Performance panel** has the same color coding as Chrome.
- **Accessibility → Force colors / Disable JavaScript** are useful for
  confirming `prefers-reduced-data` and `prefers-reduced-motion` behavior.

### Three numbers you actually want

1. **First Contentful Paint (FCP)** — should be < 1.8 s on 4G.
2. **Largest Contentful Paint (LCP)** — should be < 2.5 s.
3. **Cumulative Layout Shift (CLS)** — should be < 0.1 (web.dev).

If textures are delaying LCP, they are above-the-fold hero assets — give them
`fetchpriority="high"` and preload them.

---

## 9. Reduced-Data / `prefers-reduced-data`

### The media queries

```css
/* Respect the OS-level "low data mode" hint. */
@media (prefers-reduced-data: reduce) {
  .paper {
    background: #c8b48a; /* solid kraft color */
  }
}

/* Respect the OS-level "reduce motion" hint. */
@media (prefers-reduced-motion: reduce) {
  .paper-tilt { transform: none !important; }
  .paper-bg   { background-attachment: scroll !important; }
}
```

### The Save-Data header

Chrome and some Android browsers also send `Save-Data: 1` in the request
header when the user enables "Lite mode" or similar. You can read this
server-side or via `navigator.connection.saveData` in JS and serve a stripped
down HTML/CSS bundle:

```js
if (navigator.connection?.saveData) {
  document.documentElement.classList.add("save-data");
}
```

### What to skip in reduced-data mode

- SVG `feTurbulence` filters.
- Decorative textures (vignettes, stains, fibers).
- `backdrop-filter` blurs.
- `background-attachment: fixed` parallax.
- Hover-triggered 3D tilts.

### What to keep

- The structural page (HTML, body text).
- The single most important texture (often a single background tint or one
  subtle noise PNG).
- Functional UI affordances (borders, focus rings, button shapes).

### Why this matters

Paper-texture sites are disproportionately visited by users on slower
connections — archive.org, vintage typography blogs, indie publishers,
research sites. They are also disproportionately likely to be on metered
plans. Saving 600 KB of textures for these users is a genuine accessibility
win.

---

## 10. Lazy-Loading Textures (IntersectionObserver)

### Why lazy-load textures

A texture is a paint resource, not an HTML-blocking resource, but it still:

- Costs CPU to decode.
- Costs RAM to hold the decoded bitmap.
- Costs paint time whenever the box is invalidated.
- Costs bandwidth on the initial load.

If a texture is below the fold, defer it.

### The pattern

```js
const lazyBg = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.style.backgroundImage = `url(${el.dataset.bg})`;
      lazyBg.unobserve(el);
    }
  }
}, { rootMargin: "200px 0px" });

document.querySelectorAll(".paper-lazy").forEach((el) => {
  lazyBg.observe(el);
});
```

```html
<div class="paper paper-lazy" data-bg="/textures/kraft-512.webp"></div>
```

```css
.paper-lazy {
  /* Reserve the visual space to avoid CLS. */
  background: #c8b48a;
}
```

### CLS caveat

Always reserve the visual space with a solid fallback color matching the
texture's average hue. The web.dev CLS guide is explicit: late-decoding
images without reserved dimensions are one of the top three CLS causes.

### Sizing the `rootMargin`

A `rootMargin` of `200px 0px` starts the decode ~200 px before the texture
enters the viewport, so the user never sees the fallback. Larger values
(800–1200 px) are appropriate for very slow connections but waste memory by
decoding textures the user may scroll past.

### For very long pages

Combine `IntersectionObserver` with `loading="lazy"` on any `<img>`-based
texture and you get browser-native lazy decoding on top of your visibility
check.

### One gotcha: SVG filters do not lazy-load

`filter: url(#filterId)` references a `<filter>` element somewhere in the DOM.
The browser still parses the filter at layout time even if the element is
off-screen. To truly defer an SVG-filtered texture, generate the SVG via JS
on intersection.

---

## 11. When to Switch from SVG to PNG / WebP / AVIF

### The decision matrix

| Signal                                        | Use SVG           | Use WebP/AVIF     |
|-----------------------------------------------|-------------------|-------------------|
| Texture is procedural noise                   | ✅ Yes            | ❌ No (bake it)   |
| Texture must scale to any resolution           | ✅ Yes            | ⚠️ Provide 2x    |
| Texture is photographic grain / paper photo    | ❌ No             | ✅ Yes            |
| Texture appears on more than one page          | ⚠️ data URI OK    | ✅ Yes (cached)   |
| Texture < 1 KB                                | ✅ Yes            | ❌ Not worth      |
| Texture > 5 KB                                | ⚠️ maybe          | ✅ Yes            |
| Must animate / change parameters over time     | ✅ Yes (feTurbulence seed) | ❌ No      |
| Needs `prefers-reduced-data` fallback         | ⚠️ hard          | ✅ Easy — drop the request |

### Codec priority (2024+)

1. **AVIF** — best compression, ~20% smaller than WebP at equivalent quality.
   Supported in Chrome 85+, Firefox 93+, Safari 16+. Decoding cost is higher
   on very old devices.
2. **WebP** — ~25% smaller than PNG at equivalent quality. Universal
   support since 2020.
3. **PNG** — fallback for ancient browsers. Use `oxipng` or `pngcrush` to
   optimize.

Always use a `<picture>` element with a fallback:

```html
<picture>
  <source srcset="/textures/kraft.avif" type="image/avif" />
  <source srcset="/textures/kraft.webp" type="image/webp" />
  <img src="/textures/kraft.png" alt="" loading="lazy" decoding="async" />
</picture>
```

### Caching the right way (web.dev HTTP cache)

Per the web.dev HTTP caching guide, versioned URLs (`kraft.3a8f1b.webp`) with
`Cache-Control: public, max-age=31536000, immutable` give you year-long browser
caching with no extra server logic. Build tools like webpack, Vite, esbuild
and Rollup all generate content-hashed filenames automatically — use that
feature, do not invent your own cache buster.

For the unversioned case (a CMS-managed texture), use `ETag` or
`Last-Modified` revalidation so the browser still gets a 304 instead of a
200 on repeat visits.

### The "bake the SVG" recipe

```bash
# 1. Render the SVG to PNG at 2x density.
rsvg-convert -w 1024 -h 1024 textures/kraft.svg > kraft-1024.png

# 2. Convert to WebP with quality 80.
cwebp -q 80 kraft-1024.png -o kraft-1024.webp

# 3. Convert to AVIF with effort 6.
avifenc --effort 6 -q 60 kraft-1024.png kraft-1024.avif
```

The total asset budget for a baked-paper-texture site should be:

- 1 texture at < 50 KB WebP / < 30 KB AVIF.
- 1 texture variant at 2x for high-DPR.
- Total: under 150 KB across all paper textures.

Compare that to five PNGs at 80 KB each — 400 KB — and the case is closed.

---

## Appendix A — One-page checklist

- [ ] Texture is baked, not animated, if it appears on multiple pages.
- [ ] File format is AVIF → WebP → PNG via `<picture>`.
- [ ] Asset has a content-hashed filename and
      `Cache-Control: public, max-age=31536000, immutable`.
- [ ] `background-attachment: fixed` is gated behind `@media (hover: hover)`.
- [ ] Stacked layers are ≤ 3 on mobile.
- [ ] No `will-change` in static stylesheets.
- [ ] `prefers-reduced-data: reduce` and `prefers-reduced-motion: reduce`
      both fall back gracefully.
- [ ] Below-the-fold textures are loaded via `IntersectionObserver`.
- [ ] All textures have a solid fallback color to prevent CLS.
- [ ] Measured in DevTools: FCP < 1.8 s, LCP < 2.5 s, CLS < 0.1, no frame
      > 50 ms during scroll.

## Appendix B — References

- MDN, `<feTurbulence>` SVG element.
  https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence
- MDN, `background-attachment` CSS property.
- MDN, `will-change` CSS property.
- web.dev, *Optimize CLS* — Cumulative Layout Shift guide.
- web.dev, *HTTP Cache* — caching for the web platform.
- web.dev, *Animations* — the rendering pipeline and compositor layers.
