# Animation libraries for paper-fold / paper-texture effects

> Research document for the SAC website (a newspaper-themed static site —
> `js/` ES modules, `css/` variables, **no build step**). Goal: find the
> best library for adding **authentic paper-fold / paper-texture / print**
> animations without introducing a bundler, while keeping the loader pattern
> already established in `docs/loader-design.md` (CSS 3D transforms +
> SVG filters on real DOM).
>
> **Status:** Research · **Last updated:** 2026-06-22 ·
> **Author:** SAC web team · **Scope:** Vanilla JS, no build, no React.

---

## TL;DR

| Library | Gz size | License | Fit for paper-fold | Verdict |
|---|---|---|---|---|
| **GSAP** + ScrollTrigger + Flip | ~28 KB + 18 KB + ~12 KB | **Free** (Webflow, since 2024) | ★★★★★ | Best overall — `Flip` plugin is purpose-built for layout transitions (paper unfold, section re-arrange). ScrollTrigger handles masthead reveal. |
| **anime.js v4** | ~10 KB core, +4 KB Scroll | MIT | ★★★★☆ | Best lightweight choice — modular, scroll-observer built-in, timeline + stagger are first-class. Smaller than GSAP, no React needed. |
| **Motion One** (now `motion` v12) | ~22 KB gz core, +5 KB scroll | MIT | ★★★☆☆ | Excellent scroll API (uses native `ScrollTimeline`), spring physics, but no FLIP helper — for paper-flip you'd write the offsets yourself. |
| **Web Animations API** (native) | **0 KB** | — | ★★☆☆☆ | Built-in, no dep. Best for one-off page-reveal tweens; verbosity becomes painful for staggered sequences. |
| **Framer Motion** | — | MIT | — | **Not applicable** — the components are React-only. Skip. |
| **Popmotion** | ~7 KB gz | MIT | ★★☆☆☆ | Solid functional core but no scroll-triggered animations and maintenance has slowed. Mostly superseded by Motion. |
| **Lottie** (lottie-web) | ~77 KB gz | MIT (runtime) | ★★★★☆ | Highest *visual* quality for paper-fold (designer draws it in After Effects). Heavy bundle, requires AE pipeline to author. |
| **Rive** (rive-wasm) | ~59 KB gz + **1.3 MB WASM** | MIT (runtime) | ★★★☆☆ | Best *interactivity* (state machines, data binding) but WASM payload and the need for the Rive editor make it overkill for a brochure site. |

**Recommended starting point:** anime.js v4 for incremental additions
(scroll-revealed paper folds, masthead drop-ins) — it is the right size and
the right API for this site. Reach for GSAP + Flip only if we hit a
specific interaction that anime.js can't express (e.g. unfold-from-thumbnail
where two DOM states need to morph position and size together).

---

## Bundle sizes (measured)

Measured by downloading the canonical build from `cdn.jsdelivr.net` and
running `gzip -c`. Raw = minified uncompressed; gz = gzipped (what users
actually download on a cold cache).

| File | Raw | Gz | Source |
|---|--:|--:|---|
| `gsap.min.js` 3.13.0 | 72 KB | **28 KB** | jsDelivr |
| `ScrollTrigger.min.js` 3.13.0 | 44 KB | **18 KB** | jsDelivr |
| `animejs@4` ESM bundle | 119 KB | **40 KB** | jsDelivr (full bundle — modular in practice) |
| `animejs@3.2.2/lib/anime.min.js` | 17 KB | **7 KB** | jsDelivr (legacy single-file build) |
| `motion@12.40.0/dist/motion.js` | 135 KB | **45 KB** | jsDelivr (full `motion` package) |
| `popmotion@11.0.5` | 16 KB | **7 KB** | jsDelivr |
| `lottie-web@5.12.2` | 306 KB | **77 KB** | jsDelivr |
| `@rive-app/canvas@2.27.0/rive.js` | 261 KB | **59 KB** | jsDelivr |
| `@rive-app/canvas@2.27.0/rive.wasm` | **1.3 MB** | — | jsDelivr (separate file, also loads) |

> The anime.js homepage reports its modular bundle as **24.50 KB** total
> raw (Timer 5.60 + Animation 5.20 + Timeline 0.55 + Stagger 0.48 +
> Scroll 4.30 + …). With gzip and tree-shaking on what we actually import,
> the realistic cost is closer to **10–15 KB gz** for the pieces we need.

---

## The full comparison matrix

| Capability | GSAP | anime.js v4 | Motion (One) | Framer Motion | Popmotion | Lottie | Rive | WAAPI |
|---|---|---|---|---|---|---|---|---|
| Latest stable | 3.13.0 | 4.4.1 | 12.40.0 | 12.x | 11.0.5 | 5.12.2 | 2.27.0 | — |
| License | Free* | MIT | MIT | MIT | MIT | MIT | MIT | — |
| Works no-build (CDN) | ✅ | ✅ | ✅ | ⚠️** | ✅ | ✅ | ✅ | n/a |
| Gzipped core | 28 KB | ~10–15 KB | 45 KB | 45 KB | 7 KB | 77 KB | 59 KB + 1.3 MB WASM | 0 |
| Scroll-driven animations | ✅ ScrollTrigger | ✅ `onScroll` | ✅ `scroll()` | ✅ | ❌ (driver API only) | ✅ | ✅ | ✅ (native + CSS `animation-timeline`) |
| SVG / clip-path animation | ✅ MorphSVG, DrawSVG | ✅ `morphTo`, `createDrawable`, `motionPath` | ✅ | ✅ | ❌ | ✅ (via JSON) | ✅ (in editor) | ✅ (CSS) |
| "Paper-flip" / FLIP helper | ✅ **`Flip` plugin** | ❌ (manual) | ❌ (manual) | ❌ | ❌ | n/a | n/a | ❌ |
| Independent transforms (`x`, `rotateY`…) | ✅ | ✅ (composition/blend) | ✅ (best-in-class) | ✅ | ⚠️ | ⚠️ (per-AE-layer) | ⚠️ | ⚠️ (CSS only) |
| React-only | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | n/a |
| Maintained | ✅ Webflow | ✅ Julian Garnier | ✅ Matt Perry / Framer | ✅ | ⚠️ slow | ✅ Airbnb | ✅ Rive Inc. | ✅ WHATWG/W3C |

\* GSAP's "Standard License" was made 100% free for all users (including
all plugins) in 2024 with Webflow sponsorship. Previously ScrollSmoother
and some premium plugins required a paid "BusinessGreen" membership; that
restriction is now lifted. See <https://gsap.com/pricing/>.

\*\* Framer Motion is React-only via `motion/react`. The vanilla JS
package is the **`motion`** package (formerly "Motion One"). We don't
use React, so Framer Motion is out.

---

## 1. GSAP — industry standard

- **Homepage / docs:** <https://gsap.com>
- **Latest:** 3.13.0 (verified by file header on CDN build)
- **License:** "Standard License" — **free for all users** since 2024
  (sponsored by Webflow). The "BusinessGreen" paid tier is gone for
  core + ScrollTrigger + Flip + most plugins. Some very niche plugins
  may still require membership; for our use case none do.
  Source: <https://gsap.com/pricing/>
- **CDN (no build):**
  - `<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js">`
  - `<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js">`
  - `<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/Flip.min.js">`
- **Bundle:** core 28 KB gz; ScrollTrigger +18 KB gz; Flip +12 KB gz.
- **Paper-flip helper:** **Yes — `Flip` plugin** (added v3.9.0). Records
  element position/size/rotation/scale, you change the DOM, GSAP applies
  inverse offsets and tweens them to zero. Handles nested transforms,
  flexbox, grid, even `position: absolute` toggles. Perfect for
  "card unfolds and reveals a full article below it" interactions.
  Docs: <https://gsap.com/docs/v3/Plugins/Flip/>
- **Scroll-driven:** Yes — `ScrollTrigger`. Scrub, pin, snap, callbacks,
  rich start/end syntax (`"top top"`, `"center 50%+=100px"`).
  Docs: <https://gsap.com/docs/v3/Plugins/ScrollTrigger/>

### Code example — 3D paper-fold tween (GSAP)

```js
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm";
import { Flip } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/Flip.min.js";
gsap.registerPlugin(Flip);

// One element: the "left half" of a paper page that hinges on its
// right edge, folds 90° around the spine, and reveals the back side.
gsap.fromTo(
  ".paper.left-half",
  {
    rotateY: 0,
    transformOrigin: "100% 50%",   // hinge at the spine (right edge)
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  },
  {
    rotateY: -90,
    boxShadow: "-12px 0 28px rgba(0,0,0,0.35)", // shadow under the fold
    duration: 1.2,
    ease: "power3.inOut",
    repeat: 1,
    yoyo: true,                     // unfold back
  }
);
```

### Code example — complex stagger (GSAP)

```js
// A timeline that lands a stack of club papers one-by-one with
// "ink stamp" bounces, then reveals the masthead last.
const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

tl.from(".press-paper", {
  y: -800,
  rotate: () => gsap.utils.random(-25, 25),
  opacity: 0,
  duration: 0.9,
  stagger: { each: 0.18, from: "random" },
})
  .from(".ink-seal", { scale: 0, duration: 0.5, ease: "back.out(2.6)" }, "-=0.4")
  .from(".masthead",  { y: 40, opacity: 0, duration: 0.6 }, "-=0.2")
  .from(".headline",  { letterSpacing: "0.5em", opacity: 0, duration: 0.8 });
```

### Pros / cons for SAC

- ✅ Most powerful tween engine. `Flip` is a unique capability — no other
  library has an equivalent paper-flip helper that's this polished.
- ✅ ScrollTrigger is mature, scrub/pin work in every browser we care
  about, and the API is the de facto standard (most Stack Overflow
  answers will use it).
- ✅ Now 100% free — no licensing surprise.
- ❌ Larger bundle than anime.js (~46 KB gz for core + ScrollTrigger).
- ❌ "I just want a small fade-in" feels heavy.

---

## 2. anime.js v4 — lightweight modular

- **Homepage / docs:** <https://animejs.com>
- **Latest:** 4.4.1 (v4 is the current major; v3 still maintained as
  a single-file fallback)
- **License:** MIT
- **CDN (no build):**
  - ES module: `import { animate, stagger } from "https://cdn.jsdelivr.net/npm/animejs@4.4.1/+esm"`
  - IIFE single-file (v3 API): `<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js">`
- **Bundle:** ~24.50 KB raw modular (Timer 5.60 + Animation 5.20 +
  Timeline 0.55 + Stagger 0.48 + Scroll 4.30 + …). Realistic gz ~10–15 KB
  for the parts you'd import.
- **Paper-flip helper:** ❌ No dedicated plugin. You'd animate
  `rotateY` + `transform-origin` manually (same code shape as GSAP
  above). anime.js v4 has `composition: 'blend'` which is nice for
  *overlapping* paper-fold tweens.
- **Scroll-driven:** ✅ Built-in `Scroll Observer` (`onScroll`,
  `scroll: container`, thresholds, sync modes). No plugin needed.
  Docs: <https://animejs.com/documentation/scroll>
- **SVG / clip-path:** ✅ `morphTo`, `createDrawable`, motion-path
  helpers. Can animate any CSS property including `clip-path`.

### Code example — 3D paper-fold tween (anime.js v4)

```js
import { animate } from "https://cdn.jsdelivr.net/npm/animejs@4.4.1/+esm";

// Same paper-fold shape as the GSAP example — hinge at the spine,
// rotate -90° on Y, drop in a soft shadow under the fold.
animate(".paper.left-half", {
  rotateY: [0, -90, 0],          // keyframes: open → closed → open
  duration: 1200,
  ease: "inOut(3)",
  composition: "blend",          // smooth-blend with any other anims
  onUpdate: (self) => {
    // shadow grows as the fold deepens
    const t = Math.sin(self.progress * Math.PI); // 0→1→0
    document.querySelector(".paper.left-half").style.boxShadow =
      `${-12 * t}px 0 ${28 * t}px rgba(0,0,0,${0.35 * t})`;
  },
});
```

### Code example — complex stagger (anime.js v4)

```js
import { animate, stagger, createTimeline } from "https://cdn.jsdelivr.net/npm/animejs@4.4.1/+esm";

// Stack of papers drop from above, each rotated by a random angle.
createTimeline({ defaults: { duration: 900, ease: "out(4)" } })
  .add(".press-paper", {
    y: [-800, 0],
    rotate: () => animejs.utils.random(-25, 25), // function value
    opacity: [0, 1],
    delay: stagger(80, { from: "first" }),
  })
  .add(".ink-seal",    { scale: [0, 1], ease: "out(5)" }, "-=400")
  .add(".masthead",    { y: [40, 0], opacity: [0, 1] }, "-=300")
  .add(".headline",    { letterSpacing: ["0.5em", "0"], opacity: [0, 1] });
```

### Pros / cons for SAC

- ✅ Smallest viable library with first-class timelines, stagger, scroll,
  and SVG — perfect for a static site.
- ✅ Pure ESM import via jsDelivr — fits our `<script type="module">`
  setup without a build step.
- ✅ `composition: 'blend'` is great when a paper element needs to be
  both falling *and* rotating without conflict.
- ❌ v4 has a different API from v3 (full rewrite). Most tutorials
  online still show v3 — read the right docs.
- ❌ No FLIP-style helper — paper-flip is hand-coded.

---

## 3. Motion (formerly Motion One / Framer Motion vanilla)

- **Homepage / docs:** <https://motion.dev>
- **Latest:** 12.40.0 (vanilla JS `motion` package). React API is
  `motion/react` (formerly `framer-motion`).
- **License:** MIT
- **CDN (no build):**
  - `<script type="module">
       import { animate, scroll } from
         "https://cdn.jsdelivr.net/npm/motion@12.40.0/+esm";
     </script>`
- **Bundle:** `motion.js` 135 KB raw / 45 KB gz (full bundle). Tree-
  shakable if you use a real bundler; for no-build the full thing is
  ~45 KB gz.
- **Paper-flip helper:** ❌ No FLIP plugin. Manual tweens.
- **Scroll-driven:** ✅ `scroll()` function. Uses native
  `ScrollTimeline` API where supported (Chrome/Edge 115+, Safari 26+,
  Firefox 137+), falls back to JS measurements elsewhere. Hardware-
  accelerated when supported.
- **SVG / clip-path:** ✅ Animates any CSS property.

### Code example — 3D paper-fold tween (Motion)

```js
import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.40.0/+esm";

// animate() takes a target + keyframes + options. Independent transforms
// are first-class: x, y, rotateX, rotateY, scaleX, etc. compose without
// a transform string.
animate(
  ".paper.left-half",
  {
    rotateY: [0, -90, 0],
    boxShadow: [
      "0 0 0 rgba(0,0,0,0)",
      "-12px 0 28px rgba(0,0,0,0.35)",
      "0 0 0 rgba(0,0,0,0)",
    ],
  },
  { duration: 1.2, ease: [0.7, 0, 0.3, 1] }
);
```

### Code example — complex stagger (Motion)

```js
import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.40.0/+esm";

// Motion's stagger works directly on arrays of targets or CSS selectors.
animate(
  ".press-paper",
  {
    y: [-800, 0],
    rotate: [-25, 25, 0],    // underdamped spring ends up at 0
    opacity: [0, 1],
  },
  {
    delay: stagger(0.18, { start: 0.2 }),
    duration: 0.9,
    type: "spring",
    stiffness: 220,
    damping: 18,
  }
);
```

### Pros / cons for SAC

- ✅ Independent transforms + spring physics + native scroll acceleration
  — the *feel* is excellent and "newspaper physical" out of the box.
- ✅ MIT, single maintainer with a real company (Framer) behind it.
- ❌ ~45 KB gz is the biggest "vanilla" option we looked at.
- ❌ No FLIP helper.

---

## 4. Framer Motion — not applicable

- The `framer-motion` package was renamed to **`motion`** and is now
  distributed as `motion/react` for React components. There is no
  vanilla DOM API exposed via `framer-motion`.
- Our site is **pure HTML + ES modules**, no React. **Skip.**

---

## 5. Popmotion — functional, small, slowly maintained

- **Homepage / docs:** <https://popmotion.io> · GitHub:
  <https://github.com/Popmotion/popmotion>
- **Latest:** 11.0.5
- **License:** MIT
- **CDN:** `https://cdn.jsdelivr.net/npm/popmotion@11.0.5/dist/popmotion.min.js`
- **Bundle:** 16 KB raw / **7 KB gz**
- **Paper-flip helper:** ❌ No FLIP plugin.
- **Scroll-driven:** ❌ No built-in scroll observer. You can pass a
  custom `driver` (e.g. an `IntersectionObserver`-backed delta source)
  but it is more code than the others.
- **Maintenance:** Issues open since 2022 (most recently Aug 2025).
  Library is stable and feature-complete; new development has shifted
  to Motion (which is by the same author).

### When to use

If we ever want a 7 KB functional tweening core for a single component
and write all the scroll logic ourselves. Not recommended as a primary
choice; would lose to anime.js on size, features, and maintenance.

---

## 6. Lottie — highest visual fidelity, designer-authored

- **Homepage / docs:** <https://airbnb.io/lottie/> · GitHub:
  <https://github.com/airbnb/lottie-web>
- **Latest:** 5.12.2
- **License:** MIT for the `lottie-web` runtime; Bodymovin (the After
  Effects export plugin) is free.
- **CDN:** `https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js`
- **Bundle:** 306 KB raw / **77 KB gz** — by far the largest.
- **Paper-flip helper:** Not a "plugin", but After Effects can hand-
  craft a paper-fold animation with realistic lighting, shadows, and
  paper-grain texture on every layer that no code tween can match.
- **Scroll-driven:** ✅ `lottie-web` supports scroll-controlled playback
  (segment in / segment out, time remapping).
- **Trade-off:** Every animation is a separate `.json` file exported
  from After Effects. Authors must use AE + Bodymovin. Not a fit for
  *code-driven* paper folds (e.g. "this card unfolded when the user
  scrolled past it, dynamically sized to its content").

### When to use

For the **masthead reveal** and other one-time brand-defining moments
where the visual fidelity justifies the bundle cost. For example, the
"ink stamp finale" in the loader could be a Lottie animation exported
once by a designer.

---

## 7. Rive — most interactivity, biggest payload

- **Homepage / docs:** <https://rive.app/docs/runtimes/web> · GitHub:
  <https://github.com/rive-app/rive-wasm>
- **Latest:** 2.27.0
- **License:** MIT for the runtime. The Rive editor is free with a
  generous free tier; some advanced features are paid.
- **CDN:** `https://unpkg.com/@rive-app/canvas@2` (recommended for
  lighter use) or `https://unpkg.com/@rive-app/webgl2@2` (more features,
  WebGL2 required).
- **Bundle:** 261 KB JS + **1.3 MB `rive.wasm`** for the canvas runtime.
  WASM is downloaded *separately* on first instantiation. Roughly
  1.4 MB total for a single canvas.
- **Paper-flip helper:** Not a "plugin" — designer authors animations
  in the Rive editor with state machines. Has unique strengths (data
  binding, interactive state machines, runtime parameter control).
- **Scroll-driven:** ✅ Rive animations can be scrubbed by external
  inputs (e.g. scroll progress).

### When to use

If we ever build a feature where the user *interactively* manipulates
a paper-fold (drag a corner, watch it crease, unfold). For pure
scrolling reveals it's overkill.

---

## 8. Web Animations API (WAAPI) — the no-library baseline

- **Docs:** <https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API>
- **Bundle:** **0 KB** — it's the browser.
- **Browser support:** `Element.animate()` in all modern browsers since
  ~2018. The CSS `animation-timeline` (scroll-driven) property is
  supported in Chrome/Edge 115+ (Jul 2023), Firefox 137+ (Apr 2025),
  Safari 26+ (Sep 2025). Global usage share ≈ 90%+ as of mid-2026.
- **Paper-flip helper:** ❌
- **Scroll-driven:** ✅ Two layers —
  1. **JS:** `el.animate(keyframes, { duration })` returns an
     `Animation` you can scrub manually based on scroll position.
  2. **CSS:** `@keyframes` + `animation-timeline: scroll()` /
     `view()` — pure CSS scroll-driven animation, hardware accelerated.

### Code example — paper-fold in pure WAAPI

```js
const paper = document.querySelector(".paper.left-half");
const fold = paper.animate(
  [
    { rotateY: "0deg",   boxShadow: "0 0 0 rgba(0,0,0,0)" },
    { rotateY: "-90deg", boxShadow: "-12px 0 28px rgba(0,0,0,0.35)",
                         offset: 0.5 },
    { rotateY: "0deg",   boxShadow: "0 0 0 rgba(0,0,0,0)" },
  ],
  { duration: 1200, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" }
);
// fold.pause(); fold.play(); fold.reverse(); fold.finish();
```

### CSS scroll-driven example (no JS)

```css
.paper.left-half {
  animation: paper-unfold linear forwards;
  animation-timeline: view();      /* progress 0..1 as it scrolls in */
  transform-origin: 100% 50%;
}
@keyframes paper-unfold {
  0%   { rotate: -90deg 0; box-shadow: -12px 0 28px rgba(0,0,0,0.35); }
  100% { rotate: 0 0;     box-shadow: 0 0 0 rgba(0,0,0,0); }
}
```

### Pros / cons for SAC

- ✅ Zero bundle cost, native, hardware accelerated, accessible.
- ✅ CSS scroll-driven animations are *the* right tool for "this
  thing happens as you scroll past it" — they're declarative and the
  browser handles scrubbing.
- ❌ Verbose for complex staggers; no FLIP helper; keyframe syntax is
  clunkier than library equivalents.

---

## Recommendations for SAC

1. **Start with `anime.js v4` + the CSS scroll-driven fallback.** It is
   the smallest viable animation layer that covers all of our stated
   needs (timeline, stagger, scroll, SVG, modular import). The current
   `css/loader.css` + `js/loader.js` keep doing the heavy lifting for
   the brand-defining masthead, and anime.js powers the **secondary**
   moments: scroll-revealed paper folds on the homepage, staggered
   card-arrivals on the clubs grid, etc.
2. **Add GSAP `Flip` only when we hit a specific interaction.** A
   classic paper-flip pattern is "click a club thumbnail → it morphs
   into the club page banner while the body slides up." That's a
   textbook `Flip.fit()` use case. Anime.js can't do this cleanly; GSAP
   can, in three lines.
3. **Consider Lottie for one or two signature moments only.** The masthead
   "ink press" finale in the loader is the kind of thing a designer
   can hand-tune in After Effects for ~30 minutes and ship as a 10 KB
   `.json` that's smaller than the current CSS animation.
4. **Use CSS `animation-timeline` for scroll-driven CSS effects.**
   Browsers that support it get free hardware acceleration; browsers
   that don't (Safari < 26, Firefox < 137) get a static end-state via
   `@supports not (animation-timeline: scroll())` queries. No JS
   needed.
5. **Skip Rive** for now — 1.4 MB of WASM is too much for a brochure
   site. Revisit if we ever build an interactive paper-craft toy.
6. **Skip Popmotion** — anime.js covers the same ground better and is
   actively maintained.

---

## Sources

Library docs and READMEs:

- GSAP installation — <https://gsap.com/docs/v3/Installation/>
- GSAP ScrollTrigger — <https://gsap.com/docs/v3/Plugins/ScrollTrigger/>
- GSAP Flip — <https://gsap.com/docs/v3/Plugins/Flip/>
- GSAP pricing (now 100% free) — <https://gsap.com/pricing/>
- anime.js (Julian Garnier) — <https://animejs.com>,
  <https://github.com/juliangarnier/anime>
- anime.js v4 animation docs — <https://animejs.com/documentation/animation>
- anime.js v4 WAAPI docs — <https://animejs.com/documentation/web-animation-api>
- Motion quick-start — <https://motion.dev/docs/quick-start>
- Motion scroll — <https://motion.dev/docs/scroll>
- Motion (motiondivision) — <https://github.com/motiondivision/motion>,
  <https://github.com/framer/motion>
- Popmotion — <https://github.com/Popmotion/popmotion>,
  <https://popmotion.io/docs/quick-start>
- Lottie (airbnb/lottie-web) — <https://airbnb.io/lottie/>,
  <https://github.com/airbnb/lottie-web>
- Rive (rive-app/rive-wasm) — <https://github.com/rive-app/rive-wasm>,
  <https://rive.app/docs/runtimes/web>
- Web Animations API — <https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API>
- CSS `animation-timeline` — <https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline>
- CSS scroll-driven animations guide — <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations>
- `caniuse` `css-animation-timeline` — <https://caniuse.com/css-animation-timeline>

CDN/package metadata (used to verify versions and sizes):

- jsDelivr package API for `gsap@3.13.0`,
  `motion@12.40.0`, `animejs@4.4.1`, `popmotion@11.0.5`,
  `@rive-app/canvas@2.27.0`, `lottie-web@5.12.2`.

## SAC-internal references

- `docs/loader-design.md` — established pattern: CSS 3D transforms +
  SVG filters on real DOM elements, no library. New animation work
  should stay consistent with this style unless there's a strong reason.
- `js/loader.js`, `css/loader.css` — current implementation. The
  library choice here should be **additive**, not a rewrite.
- `index.html`, `pages/*.html` — all `<script type="module">`-based,
  no bundler. Any new library must work as an ES module from a CDN.
