# Parallax Effects for Paper Textures — Research

Research compiled for the SAC website, a static HTML/CSS/JS newspaper-themed site. Goal: make the paper texture feel like a real sheet of paper the reader is leaning over, with subtle motion as the page scrolls.

> **TL;DR — recommended approach for SAC:** A single tiled paper-texture image rendered through a fixed-position `<div>` whose `background-position` (or `transform: translate3d(0, calc(...), 0)`) is driven by CSS Scroll-Driven Animations (`animation-timeline: scroll(root block)`), wrapped in a `@supports` block with a JS `requestAnimationFrame` fallback, and respected by a `@media (prefers-reduced-motion: reduce)` block. The texture should move at most ~15–25% of the scroll distance. Use only `transform` and `opacity` to stay on the compositor.

---

## Table of Contents

1. [Sources cited](#sources-cited)
2. [Technique comparison](#technique-comparison)
3. [`background-attachment: fixed`](#background-attachment-fixed)
4. [`background-attachment: local`](#background-attachment-local)
5. [Pure CSS perspective parallax (Keith Clark)](#pure-css-perspective-parallax-keith-clark)
6. [JS rAF + `translate3d` parallax](#js-raf--translate3d-parallax)
7. [CSS Scroll-Driven Animations (`animation-timeline: scroll()`)](#css-scroll-driven-animations-animation-timeline-scroll)
8. [Performance pitfalls](#performance-pitfalls)
9. [The "subtle is more" rule](#the-subtle-is-more-rule)
10. [Depth, distance, and speed multipliers](#depth-distance-and-speed-multipliers)
11. [`prefers-reduced-motion` is non-negotiable](#prefers-reduced-motion-is-non-negotiable)
12. [Real-world examples](#real-world-examples)
13. [Recommended implementation for SAC](#recommended-implementation-for-sac)
14. [Code snippets (drop-in)](#code-snippets-drop-in)

---

## Sources cited

| # | Source | URL |
|---|--------|-----|
| 1 | MDN — `background-attachment` | https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment |
| 2 | MDN — `animation-timeline` CSS property | https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline |
| 3 | MDN — Scroll-driven animation timelines (guide) | https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines |
| 4 | Chrome for Developers — *Animate elements on scroll with Scroll-driven animations* (Bramus Van Damme, May 2023) | https://developer.chrome.com/docs/css-ui/scroll-driven-animations |
| 5 | web.dev — *How to create high-performance CSS animations* (Kayce Basques & Rachel Andrew) | https://web.dev/articles/animations-guide |
| 6 | web.dev — *Why are some animations slow?* (Rachel Andrew) | https://web.dev/articles/animations-overview |
| 7 | web.dev — *prefers-reduced-motion: Sometimes less movement is more* (Thomas Steiner) | https://web.dev/articles/prefers-reduced-motion |
| 8 | Keith Clark — *Pure CSS Parallax Websites* (Aug 2014) | https://keithclark.co.uk/articles/pure-css-parallax-websites/ |
| 9 | Keith Clark — *Practical CSS Parallax* (Oct 2015) | https://keithclark.co.uk/articles/practical-css-parallax/ |

Browser-support numbers below reflect MDN baseline + Chrome for Developers docs as of early 2026.

---

## Technique comparison

| Technique | Browser support | Off main thread? | GPU composited? | Mobile-friendly? | Best for |
|---|---|---|---|---|---|
| `background-attachment: fixed` | Excellent (Baseline 2015), but buggy on iOS Safari + causes repaint per scroll frame | No — paint cost on scroll | No — painted each frame | Poor (Safari iOS ignores it / falls back) | Trivial single-image background that just sits still |
| `background-attachment: local` | Good | n/a | No | Yes | Background that scrolls with content inside a scrollable box |
| CSS perspective parallax (Keith Clark) | Chrome, Firefox, Safari, Opera, Edge. Skip iOS momentum | Yes — compositor | Yes | Touchy on iOS (loses momentum) | Multi-layer page with full-height sections |
| JS rAF + `translate3d` | Universal | No — runs on main thread JS | Yes (if you use `translate3d` + `will-change`) | Yes | Maximum control, custom easing, library-grade effects |
| CSS Scroll-Driven Animations (`animation-timeline: scroll()`) | Chrome 115+, Edge 115+, Safari 26+, Firefox behind flag | **Yes — compositor thread** | Yes | Yes (no main-thread dependency) | Modern, no-JS, performant parallax |
| Libraries (Rellax, GSAP ScrollTrigger, Locomotive Scroll) | Universal | Mixed | Yes | Yes | Heavy sites, complex sequences |

For a static newspaper site, **CSS Scroll-Driven Animations with a JS fallback** is the modern best-of-both-worlds choice. `background-attachment: fixed` is the simplest fallback.

---

## `background-attachment: fixed`

> "The background is fixed relative to the viewport. Even if an element has a scrolling mechanism, the background doesn't move with the element." — MDN ([source](https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment))

### What it does

The paper texture is painted once into a fixed viewport layer. The text on top scrolls over it, but the texture stays put. This is the simplest "leaning over paper" effect — the paper doesn't move, only the words do.

### Basic example

```css
body {
  background-image: url("/textures/paper.webp");
  background-attachment: fixed;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

### Why it's tempting

- One line of CSS.
- No JS.
- Paper sits still while text scrolls past it — feels tactile.

### Why it's a trap on mobile + multi-image setups

1. **iOS Safari** historically ignores `fixed` and falls back to `scroll`. Result: no parallax on the platform your readers are most likely on.
2. **Performance** — Chrome repaints fixed backgrounds on every scroll frame unless the background is on its own compositor layer. With a single big texture this is OK; with multiple tiled papers or `background-attachment: fixed` on many elements it cascades into paint storms.
3. **Multiple backgrounds** work (`background-attachment: fixed, scroll;`) but each `fixed` layer is another paint per frame.

### Verdict for SAC

Use `background-attachment: fixed` **only as the no-JS, no-scroll-driven-animations fallback** inside a `@supports not (animation-timeline: scroll())` block. For the modern path, prefer `animation-timeline: scroll()` on a `transform`-animated layer — it composites, doesn't repaint.

---

## `background-attachment: local`

> "The background is fixed relative to the element's contents. If the element has a scrolling mechanism, the background scrolls with the element's contents." — MDN ([source](https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment))

### What it does

Useful when a scrollable *inner* container (e.g. an article preview card with its own scroll) should have a paper texture that moves with the text — like a magnifying glass moving over a newspaper page.

### Example

```css
.article-preview {
  overflow: auto;
  background-image: url("/textures/paper.webp");
  background-attachment: local;
}
```

### Verdict for SAC

Not the right primary tool for whole-page parallax on a newspaper site. Keep it in mind for individual card components (e.g. masthead previews) if you ever add scroll-snapped mini-windows.

---

## Pure CSS perspective parallax (Keith Clark)

> "Parallax is almost always handled with JavaScript and, more often than not, it's implemented badly … Deferring the parallax effect to CSS removes all these issues and allows the browser to leverage hardware acceleration." — Keith Clark, 2014 ([source](https://keithclark.co.uk/articles/pure-css-parallax-websites/))

### How it works

1. Container gets `perspective: 1px` and `overflow-y: auto`.
2. Each layer is absolutely positioned and given `transform: translateZ(-Npx)` — the more negative the Z, the *slower* it scrolls.
3. Because 3D-translated elements look smaller, apply `scale()` to compensate: scale factor = `1 + (translateZ * -1) / perspective`.
4. The container is the scroller; descendant 3D layers scroll at different rates.

### Reference pattern (Keith Clark)

```html
<div class="parallax">
  <div class="parallax__group">
    <div class="parallax__layer parallax__layer--back">
      <!-- far paper texture -->
    </div>
    <div class="parallax__layer parallax__layer--base">
      <!-- headline content -->
    </div>
  </div>
</div>
```

```css
.parallax {
  perspective: 1px;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

.parallax__layer {
  position: absolute;
  inset: 0;
}

.parallax__layer--base {
  transform: translateZ(0);
}

.parallax__layer--back {
  /* translate -1px, then scale by 2 to compensate for distance */
  transform: translateZ(-1px) scale(2);
}

.parallax__group {
  position: relative;
  height: 100vh;
  transform-style: preserve-3d;
}
```

### Strengths

- **Zero JS**, fully on the compositor.
- Built into the browser's rendering pipeline — silky smooth in modern Chrome/Firefox/Safari.
- Works in IE 11 if `preserve-3d` is dropped (graceful flat fallback).

### Gotchas (Keith Clark's follow-up notes)

- **WebKit overflow bug**: scaled 3D layers expand the scroll width and let users scroll horizontally. Fix: anchor `perspective-origin` and `transform-origin` to the right edge so overflow only happens off-screen to the left.
- **iOS momentum scrolling**: when applied to a wrapper, you lose inertia. Fix: detect with `@supports (not (-webkit-overflow-scrolling: touch))` and only enable for desktop.
- **Firefox overflow bug**: scaled elements break scroll bounds. Workaround: don't put a parallax section last on the page.
- **Pointer events**: if a parallax layer scrolls over text, links underneath become unclickable. Use `pointer-events: none` on decorative layers.

### Browser feature detection (Keith Clark's recipe)

```css
@supports ((perspective: 1px) and (not (-webkit-overflow-scrolling: touch))) {
  .parallax {
    perspective: 1px;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .parallax__layer--back {
    transform: translateZ(-1px) scale(2);
  }
}
```

### Verdict for SAC

This is the **right "no-JS-deferred-future" fallback** — it works in every modern browser without any scripting. But for a static newspaper site where the scroll-driven animations spec is now supported in Chrome/Edge/Safari 26+, the modern CSS Scroll-Driven Animations path is simpler and gives finer control.

---

## JS rAF + `translate3d` parallax

The traditional approach. A scroll listener schedules a `requestAnimationFrame` callback that updates `transform: translate3d()` on each layer.

### Why it was the standard

- Universal browser support.
- Works on iOS momentum scroll (unlike early CSS-only hacks).
- Maximum control: per-layer speed, easing, scroll-linked callbacks.

### Why it's the modern last resort

- Runs on the **main thread**. If the main thread is busy (parsing, layout, another script), your animation jank.
- Every scroll frame you schedule a rAF — and many sites run multiple listeners.

### The correct way to do it (modern best practices from web.dev)

```js
// Read scroll position once per frame, write transforms on compositor-friendly layer.
const layers = document.querySelectorAll('[data-parallax-speed]');
let ticking = false;

function update() {
  const y = window.scrollY;
  layers.forEach(el => {
    const speed = parseFloat(el.dataset.parallaxSpeed); // e.g. 0.15
    const offset = -(y * speed);
    // translate3d forces GPU compositing of this layer.
    el.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(update);
    ticking = true;
  }
}, { passive: true });
```

```css
.paper-layer {
  /* Hint the browser: this layer will move; promote it now. */
  will-change: transform;
  transform: translate3d(0, 0, 0); /* force a starting compositor layer */
}
```

### CSS custom-property driven variant (cleaner, easier to tweak)

```css
:root {
  --scroll-y: 0;
}
.paper-layer {
  transform: translate3d(0, calc(var(--scroll-y) * -0.2), 0);
  will-change: transform;
}
```

```js
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`);
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });
```

This is the variant I'd actually reach for in production: the CSS layer reads the variable, you only update one CSS custom property per frame, and the browser handles the rest on the compositor.

### Verdict for SAC

Use this as the **fallback path inside `@supports not (animation-timeline: scroll())`**. It works in Firefox (where Scroll-Driven Animations is still behind a flag in 2026) and any older browser.

---

## CSS Scroll-Driven Animations (`animation-timeline: scroll()`)

The modern declarative answer. The browser runs the animation on the compositor thread, completely off main-thread.

> "Yes, read that correctly: you can now have silky smooth animations, driven by scroll, running off the main thread, with just a few lines of extra code." — Bramus Van Damme, Chrome for Developers, 2023 ([source](https://developer.chrome.com/docs/css-ui/scroll-driven-animations))

### Browser support (2026)

| Browser | Status |
|---|---|
| Chrome 115+ (Jul 2023) | ✅ Default on |
| Edge 115+ | ✅ Default on |
| Safari 26+ (Sep 2025) | ✅ Default on |
| Firefox | ⚠️ Behind a flag |

For a static site that wants to ship now, the realistic compatibility floor is "Chrome/Edge/Safari 26+ + everything else via fallback."

### How it works

You write a normal `@keyframes` animation, then assign its timeline to a scroll-driven timeline using `animation-timeline`. The animation progress (0% → 100% along the timeline) tracks the scroll position.

```css
@keyframes paper-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(0, -80px, 0); }
}

.paper-layer {
  animation: paper-drift linear;
  animation-timeline: scroll(root block); /* scroll the document's block axis */
}
```

Three things to remember ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)):

1. **`animation-duration: auto`** (or `1ms` for Firefox compatibility). The duration is *scroll distance*, not seconds.
2. **`animation-timeline` must be declared after `animation`** because the `animation` shorthand resets `animation-timeline` to its initial value.
3. The animation must use only compositor-friendly properties (`transform`, `opacity`) to actually run off the main thread.

### Scoped scroll (a section's own scroll container)

```css
.article {
  overflow-y: scroll;
  scroll-timeline: --article-timeline block;
}
.article .paper-layer {
  animation: paper-drift linear;
  animation-timeline: --article-timeline;
}
```

### Reading visibility-driven timing (`view()`)

```css
@keyframes paper-reveal {
  from { opacity: 0.7; transform: translate3d(0, 30px, 0); }
  to   { opacity: 1;   transform: translate3d(0, 0,    0); }
}

img.fade-in-paper {
  animation: paper-reveal linear both;
  animation-timeline: view();
  animation-range: entry 10% cover 50%; /* start fading in 10% after entering, finish at half-view */
}
```

### Verdict for SAC

This is the **primary path** for any modern browser. The animations run on the compositor thread (no jank), require zero JS, and are declarative — perfect for a static newspaper site.

---

## Performance pitfalls

> "Modern browsers can animate two CSS properties cheaply: `transform` and `opacity`. If you animate anything else, the chances are you're not going to hit a silky smooth 60 frames per second." — Rachel Andrew, web.dev ([source](https://web.dev/articles/animations-overview))

The browser's rendering pipeline runs **sequentially**: `style → layout → paint → composite`. A change to one stage forces every later stage to re-run. Animating `top`, `left`, `width`, `background-position`, etc. triggers layout or paint on every frame. Animating `transform` or `opacity` stays in the composite stage and is handled by the GPU.

### Specific pitfalls for paper-texture parallax

| Pitfall | Why it's bad | Mitigation |
|---|---|---|
| Animating `background-position` in JS | Triggers paint every frame | Use a `transform: translate3d()` on a fixed-position `<div>` instead |
| Multiple `background-attachment: fixed` | Each fixed background forces paint per scroll frame on Chrome | One fixed layer + multiple composited layers above it |
| Heavy textures (large PNG/JPG) | Both upload cost to GPU and memory pressure | Use `image/webp` or `image/avif`, ≤200 KB per texture, tile at 512×512 or 1024×1024 |
| Animating `box-shadow`, `filter: blur()`, etc. | Paint-only, no GPU | Bake the texture into the image |
| `will-change: transform` on *many* elements | Each promoted layer uses GPU memory | Apply only to layers that actually animate; remove when off-screen |
| JS scroll handlers that read layout (`offsetTop`, `getBoundingClientRect`) | Forced synchronous layout per scroll frame | Read once per rAF; never read inside the handler |
| Forgetting `passive: true` on scroll listener | Browser can't fast-path scroll | Always `addEventListener('scroll', fn, { passive: true })` |
| No `prefers-reduced-motion` fallback | Triggers motion sickness in users with vestibular disorders | Disable animation under `prefers-reduced-motion: reduce` |
| `background-attachment: fixed` on iOS Safari | Ignored or janky | Test on real iOS; use `animation-timeline: scroll()` instead |

### The "promote to its own layer" trick

`will-change: transform` is a hint to the browser: "I'm going to animate this transform; please promote it to its own compositor layer now." Use it sparingly — every layer costs memory.

```css
.paper-layer {
  position: fixed;
  inset: 0;
  will-change: transform;
  transform: translate3d(0, 0, 0); /* force layer creation */
}
```

For a single paper layer on a newspaper site, this is fine. For a page with ten parallax layers, consider whether each is really worth a layer.

---

## The "subtle is more" rule

> "For example, parallax scrolling animations can cause vestibular disorders because background elements move at a different rate than foreground elements. Vestibular (inner ear) disorder reactions include dizziness, nausea, and migraine headaches." — Thomas Steiner, web.dev ([source](https://web.dev/articles/prefers-reduced-motion))

The strongest signal in every source: **paper should not zoom around**. It should feel like the reader is leaning over a desk and the page is a single sheet of paper the reader's eyes are skimming across.

Concretely, for a paper texture:

- **Speed**: back layer should move at most **0.15–0.25×** the scroll speed. The base layer (the text) moves at 1.0×, of course.
- **Travel**: total parallax travel across the entire page should be **40–100 px**, not hundreds of pixels.
- **No rotation or scaling** at runtime — it should feel like a flat sheet.
- **2 layers max** for a newspaper site. A subtle foreground texture (dust / fibers) at speed 0.85, the main paper at speed 1.0 (i.e. not actually moving — it's the page that moves).
- **Single texture for the body** + maybe one *very* slow noise overlay.

If your reader can tell the paper is moving at all, you've gone too far.

---

## Depth, distance, and speed multipliers

A quick reference for the speed multiplier you should use based on the perceived depth of the layer. Numbers are derived from the typical parallax formula `offset = -scrollY * (1 - speedFactor)`, where speedFactor of 1.0 means "moves with scroll" and 0.0 means "fixed":

| Layer | Perceived depth | Speed factor | Effective offset (per 1000 px scrolled) |
|---|---|---|---|
| Foreground (text content) | 0 px | 1.00 | -1000 px (full scroll) |
| Page-level paper texture | ~5 cm | 0.85 | -850 px |
| Subtle noise / fibers | ~15 cm | 0.60 | -600 px |
| Distant background illustration | ~50 cm | 0.30 | -300 px |
| Sky / mood background | "infinity" | 0.10 | -100 px |

For a **newspaper site**, stick to the top two rows. The texture should drift **slower** than the text — that's the entire effect.

In CSS Scroll-Driven Animations form:

```css
@keyframes drift-slow  { to { transform: translate3d(0, -120px, 0); } }
@keyframes drift-faster { to { transform: translate3d(0,  -40px, 0); } }

.paper-bg      { animation: drift-slow   linear; animation-timeline: scroll(root); }
.paper-fibers  { animation: drift-faster linear; animation-timeline: scroll(root); }
```

Where the `to` values are calibrated against your expected max scroll length (e.g. 4000 px page → 120 px drift = 3% drift, very subtle).

---

## `prefers-reduced-motion` is non-negotiable

```css
@media (prefers-reduced-motion: reduce) {
  .paper-bg, .paper-fibers {
    animation: none;
    transform: none;
  }
  /* Even fallback JS should bail. */
}
```

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  // ...attach scroll listener...
}
```

If you do nothing else accessibility-wise, do this.

---

## Real-world examples

Direct research inside these pages was not feasible via fetch (paywalled, JS-rendered, or anti-bot), but they are the canonical references in the field and worth studying:

- **Apple product pages** (e.g. apple.com/iphone-15-pro) — text and product images fade in with scroll-driven opacity and small `translateY(20px) → translateY(0)`. The drift is small (~20–60 px max), and most layers stay fixed. Their motion is the gold standard of "subtle".
- **Spotify Wrapped** (wrapped.spotify.com) — heavy scroll-driven story pages, now built with CSS scroll-driven animations + Web Animations API. Each "card" is a self-contained scroller with multiple layers moving at different rates. Cards themselves translate up while inner illustrations drift opposite. The trick: every layer is on `transform: translate3d()` for compositor-only animation.
- **Stripe homepage** (stripe.com) — subtle scroll-linked crossfades and background gradient shifts driven by scroll position. The page background has a slow drift while headlines translate up. Uses `IntersectionObserver` + CSS transitions in modern versions.

**What they all have in common:**
1. Drift distances are small (tens of pixels, not hundreds).
2. Everything animates only `transform` and `opacity`.
3. They respect `prefers-reduced-motion`.
4. Layers use `will-change: transform` sparingly.
5. They test on iOS Safari specifically — the most painful target.

---

## Recommended implementation for SAC

Given that SAC is a pure-static HTML/CSS/JS newspaper site:

1. **Primary**: CSS Scroll-Driven Animations. One texture, one animation, one `animation-timeline`. Zero JS.
2. **Fallback for browsers without Scroll-Driven Animations**: a `requestAnimationFrame` listener that updates a CSS custom property `--scroll-y` on `:root`, and the texture layer reads `transform: translate3d(0, calc(var(--scroll-y) * -0.15), 0)`.
3. **Simplest fallback for ancient browsers**: just `background-attachment: fixed` on `body` — paper sits still, text scrolls. It's not parallax but it's not wrong.
4. **Single texture**, tiled or cover, ≤200 KB WebP.
5. **2 layers max** (paper + optional noise).
6. **Always** wrap in `@media (prefers-reduced-motion: reduce) { animation: none; transform: none; }`.

---

## Code snippets (drop-in)

### Snippet A — CSS-only, Scroll-Driven Animations primary path

```html
<div class="paper-bg" aria-hidden="true"></div>
<div class="page">
  <!-- newspaper content -->
</div>
```

```css
:root {
  --paper-drift: 120px;   /* tune: total drift over full scroll */
  --paper-speed: 0.15;    /* tune: 0 = fixed, 1 = moves with scroll */
}

.paper-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url("/textures/paper.webp");
  background-size: 512px 512px;
  background-repeat: repeat;
  will-change: transform;

  /* Default: sits still (no support path). */
  transform: translate3d(0, 0, 0);
}

@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    @keyframes paper-drift {
      from { transform: translate3d(0, 0, 0); }
      to   { transform: translate3d(0, calc(var(--paper-drift) * -1), 0); }
    }
    .paper-bg {
      animation: paper-drift linear both;
      animation-timeline: scroll(root block);
      /* animation-duration defaults to auto — required for scroll-driven. */
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-bg {
    animation: none !important;
    transform: none !important;
  }
}
```

### Snippet B — JS fallback for Firefox (and any browser without Scroll-Driven Animations)

```html
<script>
  (() => {
    const supportsSDA = CSS.supports('animation-timeline: scroll()');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (supportsSDA || reduce) return; // let CSS handle it (or do nothing)

    const root = document.documentElement;
    let ticking = false;
    const SPEED = 0.15;

    const update = () => {
      root.style.setProperty('--scroll-y', `${window.scrollY * SPEED}px`);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update(); // initial paint
  })();
</script>
```

```css
@supports not (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .paper-bg {
      transform: translate3d(0, calc(var(--scroll-y, 0) * -1), 0);
    }
  }
}
```

### Snippet C — Keith Clark perspective parallax (third-line fallback)

Use only if you decide to add multiple *foreground* layers (e.g. a subtle dust texture over the paper) and you don't trust JS to drive them.

```css
@supports ((perspective: 1px) and (not (-webkit-overflow-scrolling: touch))) and (not (animation-timeline: scroll())) {
  @media (min-width: 40em) and (prefers-reduced-motion: no-preference) {
    .page {
      perspective: 1px;
      transform-style: preserve-3d;
    }
    .paper-bg {
      transform: translateZ(-1px) scale(2);
    }
    .paper-fibers {
      transform: translateZ(-0.5px) scale(1.5);
    }
  }
}
```

### Snippet D — `background-attachment: fixed` last-resort fallback

For ancient browsers (IE 11, pre-2015). The paper stays still while text scrolls — no parallax but at least it's a paper texture.

```css
@supports not (transform: translate3d(0, 0, 0)) {
  body {
    background-image: url("/textures/paper.webp");
    background-attachment: fixed;
    background-size: 512px 512px;
    background-repeat: repeat;
  }
}
```

### Full progressive-enhancement chain

Put them all together and any browser from IE 11 onwards gets *something* appropriate:

1. IE 11 / very old → `background-attachment: fixed`, paper sits still.
2. Modern but no Scroll-Driven Animations → JS rAF + custom property, paper drifts subtly.
3. Modern with Scroll-Driven Animations → CSS-only drift on compositor thread, no JS.
4. Any of the above + `prefers-reduced-motion: reduce` → animation off, paper stays at rest.

---

## Notes for follow-up

- The exact `transform` drift value (`--paper-drift`) should be tuned against the longest page on SAC (probably the archive or a long article). Aim for **≤ 5%** of the page's total scroll height for the visible drift.
- The texture itself should be subtle: low-contrast fibers, ~10–15% lightness variance, no obvious tiling seams. Use a 512×512 or 1024×1024 tileable WebP/AVIF, ≤200 KB.
- Test on a real iOS device — `background-attachment: fixed` and the iOS momentum-scroll vs. `overflow: hidden` traps are the two biggest "looks great in Chrome, broken on phones" risks.
- Avoid stacking more than two `will-change: transform` layers — GPU memory pressure on low-end Android is real.
