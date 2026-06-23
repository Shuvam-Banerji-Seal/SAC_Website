# CSS clip-path Techniques for Paper-Folds

> A research reference covering corner peels, page tears, dog-eared corners, and other paper-fold effects achievable with CSS `clip-path`, `mask-image`, and supporting techniques. Compiled from MDN, CSS-Tricks, web.dev, and Bennett Feely's Clippy tool.

---

## 1. Overview & TL;DR

Paper-fold effects in CSS are achieved by combining four techniques:

1. **`clip-path: polygon(...)`** — define a clipping polygon with straight edges. Dog-eared corners, page tears, and triangular peels are just polygons with carefully placed vertices. The reference box is `border-box` by default. Supports percentage and length units, so the same polygon scales to any container.
2. **`clip-path: path(...)`** — full SVG path with Bézier curves. Used for organic page tears with jagged, irregular edges.
3. **`clip-path: url("#svgId")`** — reference an SVG `<clipPath>` element declared in the document. The most powerful option for complex shapes that benefit from vector tooling.
4. **`mask-image: url("data:image/svg+xml,...")`** — embed an SVG mask directly into CSS as a data URL. No extra HTTP request, great for self-contained components.

**TL;DR rules of thumb:**

- A dog-eared corner is a 4-vertex polygon that "cuts" one corner off the rectangle: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)` becomes `polygon(0 0, 100% 0, 100% 100%, 20% 100%, 0 80%)` for a bottom-left fold.
- A page tear is an N-vertex polygon (often 8–14 points) where the tear edge zig-zags between two parallel paths.
- An animated peel-back uses `clip-path` on the front face and `transform: rotateX()` + `transform-origin` on the underside for 3D lift.
- The "two-triangle" technique pairs a clipped front triangle with a slightly offset underside triangle to fake paper thickness and shadow.
- **`clip-path` is animatable** as a basic shape (per the MDN definition: "Animation type: yes, as specified for `<basic-shape>`"). The polygon vertex count must match between keyframes, otherwise the change snaps.
- **Browser support** is Baseline Widely available since January 2020 (per MDN's `clip-path` page). `clip-path: path()` is broadly supported as of 2024. `mask-image` is Baseline since December 2023 (use `-webkit-mask-image` for older Safari/Chrome).
- **Accessibility**: respect `prefers-reduced-motion`. Decorative folds should have `aria-hidden="true"`; interactive peels should expose a button or link.

The next sections walk through each technique in depth.

---

## 2. `clip-path: polygon()` — syntax, browser support, animation

### Syntax

```css
clip-path: polygon([<fill-rule>,]? [<length-percentage> <length-percentage>]#);
```

- `fill-rule` is `nonzero` (default) or `evenodd`. Useful when polygon edges self-intersect (e.g., a star shape carved out of a page).
- Vertices are pairs of `<length>` or `<percentage>` values. A minimum of three vertices is required; there is no maximum.
- Coordinates are computed against the **reference box**. By default this is the `border-box`, but you can change it:

```css
clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) padding-box;
clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) margin-box;
clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) fill-box;
clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) view-box;
```

### Browser support

`clip-path` is listed as **Baseline Widely available** — it has worked across browsers since January 2020 (MDN reference page). `clip-path: polygon()` works in every evergreen browser (Chrome, Firefox, Safari, Edge) plus iOS Safari and Android Chrome for several versions. The older `-webkit-clip-path` prefix is no longer needed for any current browser.

### Animation

Per MDN's formal definition, the **animation type** for `clip-path` is:

> Animation type: yes, as specified for `<basic-shape>`, otherwise no

For `polygon()`, this means **you can animate between two polygons as long as they have the same number of vertices**. A change in vertex count between keyframes causes a "pop" — the browser cannot interpolate missing or extra points.

```css
.peel {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  transition: clip-path 0.6s ease;
}

.peel:hover {
  /* Same 4 vertices, just deformed into a peeled corner */
  clip-path: polygon(0 0, 100% 0, 100% 100%, 25% 100%, 0 75%);
}
```

### Important properties of `clip-path`

- It does **not** change the box size or layout of the element. A floated element with `clip-path: circle(10%)` still occupies its full bounding box for surrounding content (CSS-Tricks notes this explicitly).
- It **does** create a new stacking context (like `opacity < 1`). This affects z-index and `position: fixed` descendants.
- Box-shadow, outline, and other outer decoration are clipped along with the element. To preserve a glow, use `inset(0 0 0 0 round 0)` with a negative inset or apply the shadow to a parent.

### Other basic shapes

For completeness, the four primitive shapes from MDN's "Try it" section are:

| Shape     | Example                                          | Use case                       |
|-----------|--------------------------------------------------|--------------------------------|
| circle    | `clip-path: circle(40%);`                        | Spotlight, iris transition     |
| ellipse   | `clip-path: ellipse(130px 140px at 10% 20%);`    | Soft oval mask                 |
| inset     | `clip-path: inset(100px 50px round 20px);`       | Curtain wipes, rounded corners |
| polygon   | `clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);` | Custom shapes, paper folds    |
| path      | `clip-path: path("M 0 200 L 0,75 ...");`         | Full SVG path, organic edges   |
| rect      | `clip-path: rect(5px 145px 160px 5px round 20%);`| Rounded rectangle              |
| xywh      | `clip-path: xywh(0 5px 100% 75% round 15% 0);`   | Rect with shorthand            |
| shape     | `clip-path: shape(from 0% 0%, line to 100% 0%, line to 50% 100%, close);` | Step-by-step path commands |

---

## 3. Dog-eared corner with clip-path

A dog-eared corner is the simplest paper-fold effect: one corner of a rectangle is folded over, leaving a diagonal cut and (in richer variants) an underside triangle visible.

### Minimal version (just the cut)

```html
<div class="note">Read me!</div>
```

```css
.note {
  width: 240px;
  height: 160px;
  background: #f4e8c1;
  padding: 1.5rem;
  /* Cut off the top-right corner with a 30% diagonal */
  clip-path: polygon(
    0 0,
    70% 0,
    100% 30%,
    100% 100%,
    0 100%
  );
}
```

This produces a rectangle with a single 30% diagonal cut at the top-right.

### With an underside triangle (the two-triangle technique)

See Section 9 for full details — the short version is: stack a colored triangle behind the clipped rectangle using absolute positioning so the colored triangle peeks out where the corner is "folded."

```css
.note-wrap {
  position: relative;
  width: 240px;
  height: 160px;
}

.note-wrap::before {
  /* Underside (back of the paper, slightly darker) */
  content: "";
  position: absolute;
  inset: 0;
  background: #d4b87a; /* darker shade of the same paper */
  clip-path: polygon(70% 0, 100% 30%, 70% 30%);
}

.note {
  width: 100%;
  height: 100%;
  background: #f4e8c1;
  padding: 1.5rem;
  clip-path: polygon(0 0, 70% 0, 100% 30%, 100% 100%, 0 100%);
}
```

The result is a yellow note with a small darker triangle visible at the folded corner.

### Dog-eared on any corner

The polygon vertex order just rotates. Top-right is the example above. For other corners, walk the perimeter in the same direction:

```css
/* Top-left dog-ear */
clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%, 0 30%);

/* Bottom-right dog-ear */
clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%);

/* Bottom-left dog-ear */
clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 70%);
```

### Animation

A dog-ear that **unfolds** on hover requires the same vertex count in both states:

```css
.dog-eared {
  --fold: 30%;
  background: #f4e8c1;
  clip-path: polygon(0 0, calc(100% - var(--fold)) 0, 100% var(--fold), 100% 100%, 0 100%);
  transition: clip-path 0.4s ease;
}

.dog-eared:hover {
  --fold: 0%;
}
```

---

## 4. Page tear with clip-path (irregular polygon with concave cuts)

A page tear has a **jagged, irregular edge**. To achieve it with `polygon()`, generate a sequence of vertices along the tear line that alternate between "deeper into the page" and "sticking out." Use `evenodd` fill-rule if your tear loops back on itself.

### Simple 2D tear (top edge)

```css
.tear-top {
  /* Bottom edge straight; top edge zig-zags */
  clip-path: polygon(
    0% 8%,
    6% 4%,
    12% 10%,
    19% 3%,
    27% 9%,
    34% 2%,
    42% 7%,
    51% 1%,
    59% 8%,
    67% 3%,
    74% 9%,
    82% 4%,
    90% 7%,
    96% 2%,
    100% 6%,
    100% 100%,
    0% 100%
  );
}
```

This 15-vertex polygon produces a roughly straight page with a torn top edge. The Y values (`8%, 4%, 10%, 3%…`) are the irregular depths.

### Tear on two opposite edges (page ripped in half)

For a "torn out of a magazine" look, tear both the left and right edges:

```css
.tear-vertical {
  clip-path: polygon(
    0% 0%,
    5% 4%,
    3% 12%,
    6% 19%,
    2% 27%,
    5% 36%,
    3% 44%,
    6% 52%,
    2% 60%,
    5% 68%,
    3% 77%,
    6% 85%,
    2% 93%,
    5% 100%,
    95% 100%,
    97% 92%,
    94% 84%,
    98% 76%,
    95% 67%,
    98% 58%,
    94% 50%,
    97% 41%,
    94% 33%,
    98% 24%,
    95% 16%,
    97% 8%,
    94% 0%,
    100% 0%,
    100% 100%,
    0% 100%
  );
}
```

### Concave cuts (notches carved into a page)

A concave cut requires **two adjacent vertices to point inward** (toward the page interior). This is where `evenodd` fill-rule helps when the polygon self-intersects:

```css
.notch {
  /* Notch carved into the top edge, centered */
  clip-path: polygon(
    0 0,
    40% 0,
    45% 5%,
    48% 12%,
    50% 8%,   /* deepest point of the notch */
    52% 12%,
    55% 5%,
    60% 0,
    100% 0,
    100% 100%,
    0 100%
  );
}
```

The sequence `0 0 → 40% 0 → 45% 5% → 48% 12% → 50% 8% → 52% 12% → 55% 5% → 60% 0 → 100% 0` traces a V-shaped notch.

### Using `path()` for organic tears

When the tear needs curves, upgrade to `clip-path: path(...)`. This requires hardcoded coordinates since `path()` does not accept percentages:

```css
.tear-curve {
  clip-path: path("M0,20 Q40,5 80,18 T160,15 T240,22 T320,12 T400,20 L400,400 L0,400 Z");
}
```

The `T` command continues a smooth quadratic curve, producing a wavy torn edge with a few characters.

---

## 5. Animating clip-path

From CSS-Tricks' "Animating with Clip-Path" article (Travis Almand, 2019):

> Animating `clip-path` can be as simple as changing the property values from one shape to another using CSS transitions, triggered either by changing classes in JavaScript or an interactive change in state, like `:hover`.

### The vertex-count rule

CSS-Tricks is explicit:

> Each property represents vertices of the shape and at least three is required. The number of vertices beyond the required three is only limited by the requirements of the desired shape. **For each keyframe of an animation, or the two steps in a transition, the number of vertices must always match for a smooth animation. A change in the number of vertices can be animated, but will cause a popping in or out effect at each keyframe.**

In other words: if you animate from a 4-vertex polygon to a 4-vertex polygon, the vertices interpolate linearly. If you go from 4 to 6, the transition jumps.

### Simple transitions

```css
.fold {
  clip-path: circle(75%);
  transition: clip-path 1s;
}
.fold:hover {
  clip-path: circle(25%);
}
```

### CSS animations

```css
@keyframes peel {
  0%   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 30%, 70% 0); }
}

.fold-anim {
  animation: peel 1s ease forwards;
}
```

### What you cannot animate

- The **basic shape type** itself (polygon → circle). Browsers cannot interpolate between fundamentally different shape definitions — use opacity or a wrapper transform instead.
- A `<url>` reference (e.g., `clip-path: url(#svgPath)`). Only `<basic-shape>` is animatable; SVG clip sources are not.

### Compound animations using stacked vertices

CSS-Tricks' "complex shapes" examples (Chevron, Spiral, Slots, Shutters, Star) all rely on **stacking vertices** — placing two vertices at the same coordinate to make an "invisible" line. This is the same trick used for the X-Plus demo where the negative space is animated:

```css
@keyframes star {
  0% {
    clip-path: polygon(0% 0%, 50% 0%, 100% 0%, 100% 50%, 100% 100%, 50% 100%, 0% 100%, 0% 50%);
  }
  50% {
    clip-path: polygon(0% 0%, 50% 100%, 100% 0%, 0% 50%, 100% 100%, 50% 0%, 0% 100%, 100% 50%);
  }
  100% {
    clip-path: polygon(50% 50%, 50% 100%, 50% 50%, 0% 50%, 50% 50%, 50% 0%, 50% 50%, 100% 50%);
  }
}
```

The Star demo's 8 vertices form a square at 0%, an X at 50% (vertices swapped to opposite sides), and collapse to the center at 100%. Same vertex count throughout — that's what makes the morph smooth.

### Animating SVG `<path>` data

Per CSS-Tricks: "It's perhaps the most flexible of the bunch because we can draw custom, or even multiple, shapes with it. Chris has written and even spoken on it before." But note: the syntax for `path()` as a CSS clip-path value is fully supported in all modern browsers as of 2024.

```css
@keyframes melt {
  0%   { clip-path: path("M0,0 L200,0 L200,200 L0,200 Z"); }
  100% { clip-path: path("M0,0 C50,40 150,40 200,0 L200,200 L0,200 Z"); }
}
```

---

## 6. mask-image: url("data:image/svg+xml,...")

`mask-image` works similarly to `clip-path` but uses **image alpha** (or luminance) to determine what shows through. This makes it ideal for embedding complex paper-fold shapes as inline SVG without external assets.

### Inline SVG mask via data URL

```css
.peel-mask {
  mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='0,0 70,0 100,30 100,100 0,100' fill='white'/></svg>");
  -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='0,0 70,0 100,30 100,100 0,100' fill='white'/></svg>");
}
```

Notes:

- The mask's `fill="white"` is what becomes visible. Black or transparent areas are hidden.
- The SVG must be properly URL-encoded. `<` and `>` and `#` and double-quotes inside the SVG body must be percent-encoded (`%3C`, `%3E`, `%23`, `%22`) for cross-browser safety.
- Use a `viewBox` rather than fixed `width`/`height` so the mask scales with the element.

### Mask with a CSS gradient

From web.dev's article on `mask-image`:

> Using a CSS gradient as your mask is an elegant way of achieving a masked area without needing to go to the trouble of creating an image or SVG.

```css
.soft-tear {
  mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
}
```

A linear gradient as a mask is great for fade-out page edges or torn-paper reveals.

### Browser compatibility

web.dev states:

> While CSS masking is Baseline Newly available, most of the features of `mask-image` are available in earlier browser versions using the prefixed `-webkit-mask-image`. The following examples show how to use both properties together for the best browser support.

Always ship both `mask-image` and `-webkit-mask-image` for Safari < 15.4 and older Android Chrome.

### Mask-mode

`mask-mode` controls whether alpha or luminance drives the mask. For SVG data URLs with `fill="white"`, default `match-source` → `alpha` (when used as `<image>`) → only opacity matters, color is irrelevant.

```css
.luminance-mask {
  mask-image: url("mask.svg");
  mask-mode: luminance;
}
```

For paper folds, **`alpha` mode is almost always what you want** — solid white fill, transparent elsewhere.

### Mask-size and mask-repeat

Like `background-size` and `background-repeat`:

```css
.peel-mask {
  mask-image: url("data:image/svg+xml;utf8,...");
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-position: center;
}
```

---

## 7. clip-path: url("#svgPath") for SVG-based paths

When the paper-fold shape is complex enough that hand-writing coordinates is painful, define an SVG `<clipPath>` element and reference it.

### Basic SVG clipPath

```html
<svg width="0" height="0" style="position:absolute">
  <defs>
    <clipPath id="tear-clip" clipPathUnits="objectBoundingBox">
      <path d="M0,0.05 L0.06,0.02 L0.12,0.08 L0.19,0.01 L0.27,0.07
               L0.34,0.00 L0.42,0.05 L0.51,0.02 L0.59,0.06 L0.67,0.01
               L0.74,0.07 L0.82,0.03 L0.90,0.05 L0.96,0.01 L1,0.05
               L1,1 L0,1 Z"/>
    </clipPath>
  </defs>
</svg>

<article class="page">Page contents…</article>
```

```css
.page {
  clip-path: url("#tear-clip");
}
```

### clipPathUnits

- `userSpaceOnUse` (default): coordinates are in user-space units of the SVG canvas. Convenient if your SVG is fixed-size.
- `objectBoundingBox`: coordinates are normalized 0–1 and scaled to the clipped element's box. This is what you want for responsive paper folds.

### Why use SVG instead of `polygon()`?

- Curves (`Q`, `C`, `S`, `A`) are first-class. Polygon only does straight lines.
- Multiple disjoint shapes can be combined in a single `<clipPath>` via multiple `<path>` children.
- Tooling: draw the tear in Illustrator / Figma / Inkscape, export the path data, paste into `<clipPath>`. Saves hand-tweaking vertex coordinates.

### Animation gotcha

As MDN notes: clip-path with `<url>` source has **animation type "no"**. You cannot transition between two SVG clip paths. To animate, either:

- Animate the path's `d` attribute with SMIL or JS (complex).
- Switch to `clip-path: path(...)` in CSS, where the path string is animatable between two values with the same command structure.

---

## 8. clip-path + 3D transform for peel-back

The classic "page peel" or "card lift" effect uses 3D transforms. `clip-path` does the silhouette; `transform: rotateX(...)` does the lift; `transform-origin` controls the hinge; `box-shadow` or a filter does the soft shadow.

### Basic lift

```css
.card {
  width: 240px;
  height: 320px;
  background: #f4e8c1;
  transform-style: preserve-3d;
  transform-origin: top right;
  transition: transform 0.6s ease;
}

.card:hover {
  transform: rotateX(-25deg) rotateY(15deg);
}
```

### Peel with clipped underside

```html
<div class="card-wrap">
  <div class="card-front">Front</div>
  <div class="card-back">Back</div>
</div>
```

```css
.card-wrap {
  perspective: 1000px;
  width: 240px;
  height: 320px;
}

.card-front,
.card-back {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.card-front {
  background: #f4e8c1;
  /* Clipped: dog-ear the bottom-left corner */
  clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 70%);
  transform-origin: top right;
  transition: transform 0.6s ease;
}

.card-back {
  /* The underside of the fold: a triangle peeking out */
  background: #d4b87a;
  clip-path: polygon(0 70%, 30% 100%, 0 100%);
  /* Hide until front lifts */
  opacity: 0;
  transition: opacity 0.4s ease;
}

.card-wrap:hover .card-front {
  transform: rotateX(60deg) translateZ(5px);
}

.card-wrap:hover .card-back {
  opacity: 1;
}
```

### Why this works

- `perspective` on the parent gives 3D depth.
- `transform-style: preserve-3d` keeps the children in the same 3D space (otherwise they flatten onto the parent's plane).
- `clip-path` on the front card makes the silhouette dog-eared.
- When the front rotates `rotateX(60deg)` about its top edge, the dog-eared corner lifts and the back triangle (peeking from behind) becomes visible.
- `box-shadow` on the lifted element sells the depth:

```css
.card-front {
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.25));
}
```

(`filter: drop-shadow` is preferred over `box-shadow` for non-rectangular shapes — it follows the clipped outline.)

### CSS 3D context checklist

- Parent needs `perspective` (numeric value) or `transform: perspective(...)`.
- Children need `transform-style: preserve-3d`.
- The element being clipped must keep `transform-style: preserve-3d` if its children also need 3D positioning.
- `backface-visibility: hidden` is useful when flipping between two sides of a card.

---

## 9. The "two-triangle" technique (top + offset underside)

This is the simplest convincing way to fake a folded paper corner without any 3D transforms. You stack two triangles:

1. **Top triangle** — clipped from the front face (the visible paper).
2. **Bottom triangle** — clipped from a slightly darker color (the back of the paper), positioned just behind/below.

### Pattern

```html
<div class="folded-corner">
  <div class="front">…content…</div>
  <div class="underside"></div>
</div>
```

```css
.folded-corner {
  position: relative;
  width: 240px;
  min-height: 160px;
}

/* Front: paper with top-right corner cut off */
.front {
  position: relative;
  background: #f4e8c1;
  padding: 1.5rem;
  clip-path: polygon(
    0 0,
    calc(100% - 40px) 0,
    100% 40px,
    100% 100%,
    0 100%
  );
}

/* Underside: a small darker triangle behind, offset for "thickness" */
.underside {
  position: absolute;
  inset: 0;
  background: #c4a86c; /* darker shade of front */
  clip-path: polygon(
    calc(100% - 40px) 0,
    100% 40px,
    calc(100% - 40px) 40px
  );
}
```

The underside is a right triangle whose hypotenuse matches the front's diagonal cut, and whose third vertex sits 40px inside the rectangle (so it looks like the underside of a fold, not a flush cut).

### Adding a shadow under the fold

```css
.underside {
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.2));
}
```

Or apply a subtle `linear-gradient` background to fake shadow depth without `filter`:

```css
.underside {
  background: linear-gradient(
    135deg,
    #c4a86c 0%,
    #b8985c 50%,
    #a4884c 100%
  );
}
```

### Animated two-triangle peel

```css
.folded-corner {
  --fold: 40px;
  --shadow: 2px 2px 3px rgba(0, 0, 0, 0.2);
}

.front {
  clip-path: polygon(
    0 0,
    calc(100% - var(--fold)) 0,
    100% var(--fold),
    100% 100%,
    0 100%
  );
  transition: clip-path 0.4s ease;
}

.underside {
  clip-path: polygon(
    calc(100% - var(--fold)) 0,
    100% var(--fold),
    calc(100% - var(--fold)) var(--fold)
  );
  filter: var(--shadow);
  transition: clip-path 0.4s ease, filter 0.4s ease;
}

.folded-corner:hover {
  --fold: 80px;
}
```

The `--fold` custom property is updated on hover, and both triangles transition their `clip-path` simultaneously. The shadow grows as the fold gets bigger because it remains a CSS custom property reference.

### Why this technique works

- No `transform: rotateX` — works in any browser that supports `clip-path`.
- The clipped underside is the **same shape as the fold's missing region**, just placed behind.
- The offset between the front's diagonal and the underside's hypotenuse fakes paper thickness.

---

## 10. Real-world examples

### Book cover with dog-eared corner

A common library/reader UI mock-up. Front is the cover image; underside is a flat darker color peeking through.

```css
.book {
  position: relative;
  width: 180px;
  height: 270px;
}

.book-cover {
  width: 100%;
  height: 100%;
  background: url("cover.jpg") center/cover;
  clip-path: polygon(
    0 0,
    calc(100% - 24px) 0,
    100% 24px,
    100% 100%,
    0 100%
  );
}

.book-underside {
  position: absolute;
  inset: 0;
  background: #2a1a0a;
  clip-path: polygon(
    calc(100% - 24px) 0,
    100% 24px,
    calc(100% - 24px) 24px
  );
}
```

### Receipt with torn bottom edge

Receipts have a clean top and a jagged bottom. The polygon traces the full perimeter.

```css
.receipt {
  width: 280px;
  background: #faf6e8;
  padding: 1.5rem;
  clip-path: polygon(
    0 0,
    100% 0,
    100% 92%,
    96% 95%,
    90% 90%,
    84% 96%,
    78% 91%,
    72% 95%,
    66% 90%,
    60% 96%,
    54% 92%,
    48% 97%,
    42% 91%,
    36% 95%,
    30% 90%,
    24% 96%,
    18% 92%,
    12% 97%,
    6% 91%,
    0 95%
  );
}
```

### Sticky note with curled corner

```css
.sticky {
  width: 200px;
  height: 200px;
  background: #fff3a0;
  padding: 1rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 30px),
    calc(100% - 30px) 100%,
    0 100%
  );
}
```

### Page corner peel on hover (interactive)

```css
.peek {
  position: relative;
  width: 280px;
  height: 200px;
  overflow: hidden;
  cursor: pointer;
}

.peek img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.peek::after {
  /* The folded triangle */
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: linear-gradient(
    225deg,
    transparent 50%,
    rgba(0, 0, 0, 0.1) 50%,
    #ddd 51%
  );
  transition: transform 0.4s ease;
}

.peek:hover img {
  transform: scale(1.05);
}

.peek:hover::after {
  transform: rotate(15deg) translate(-10px, -10px);
}
```

This uses a CSS gradient for the fold rather than `clip-path`, but the visual is in the same family.

### Notebook with spiral binding (multi-edge clip)

```css
.notebook {
  width: 240px;
  height: 320px;
  background: #4a90d9;
  /* Cut a series of small notches along the left edge for spiral holes */
  clip-path: polygon(
    4% 0,
    8% 0, 6% 1%,
    12% 0, 10% 1%,
    16% 0, 14% 1%,
    20% 0, 18% 1%,
    24% 0, 22% 1%,
    28% 0, 26% 1%,
    32% 0, 30% 1%,
    /* ... continues for full spiral ... */
    96% 0,
    100% 0,
    100% 100%,
    0 100%
  );
}
```

Each spiral hole is two vertices forming a small triangular notch.

### Postage stamp (perforated edges)

```css
.stamp {
  width: 200px;
  height: 240px;
  background: #fff;
  padding: 1rem;
  clip-path: polygon(
    /* Top edge with semicircular perforations */
    0% 4%, 2% 0%, 4% 4%, 6% 0%, 8% 4%, 10% 0%, 12% 4%,
    /* ... continues ... */
    100% 0%,
    /* Right edge */
    100% 100%,
    /* Bottom edge */
    /* ... */
    0% 100%,
    /* Left edge */
    0% 4%
  );
}
```

Real postage stamps use circular notches; with `clip-path: polygon()` you approximate them with very tight zig-zags (8–12 vertices per perforation). For real circles, use `clip-path: url(#stamp-clip)` with an SVG `<clipPath>` containing `<circle>` elements.

---

## 11. Code examples: corner peel, page tear, fold reveal

### Example A — Static corner peel (two-triangle)

```html
<div class="paper">
  <h2>Today's Memo</h2>
  <p>Lorem ipsum dolor sit amet.</p>
</div>
```

```css
.paper {
  --fold-size: 36px;
  --paper: #faf3e0;
  --paper-back: #d4b87a;
  position: relative;
  width: 320px;
  padding: 2rem;
  background: var(--paper);
  color: #2a1a0a;
  font-family: Georgia, serif;
  clip-path: polygon(
    0 0,
    calc(100% - var(--fold-size)) 0,
    100% var(--fold-size),
    100% 100%,
    0 100%
  );
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15));
}

.paper::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--paper-back);
  clip-path: polygon(
    calc(100% - var(--fold-size)) 0,
    100% var(--fold-size),
    calc(100% - var(--fold-size)) var(--fold-size)
  );
  pointer-events: none;
}
```

### Example B — Animated page tear (top edge only)

```html
<article class="torn-page">
  <h2>Field Notes</h2>
  <p>Sketched on location.</p>
</article>
```

```css
.torn-page {
  --tear-depth: 6%;
  width: 100%;
  max-width: 480px;
  padding: 2rem 1.5rem;
  background: #f4ecd6;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03) 0,
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 28px
    );
  clip-path: polygon(
    0% 8%, 6% 4%, 12% 10%, 19% 3%, 27% 9%, 34% 2%, 42% 7%,
    51% 1%, 59% 8%, 67% 3%, 74% 9%, 82% 4%, 90% 7%, 96% 2%, 100% 6%,
    100% 100%,
    0% 100%
  );
  transition: clip-path 0.6s ease;
}

.torn-page:hover {
  /* Animate to a less-torn shape — same vertex count */
  clip-path: polygon(
    0% 4%, 6% 3%, 12% 5%, 19% 2%, 27% 4%, 34% 1%, 42% 3%,
    51% 0%, 59% 4%, 67% 2%, 74% 4%, 82% 2%, 90% 3%, 96% 1%, 100% 3%,
    100% 100%,
    0% 100%
  );
}
```

### Example C — Fold reveal (interactive)

Reveal a hidden layer by peeling back a clipped corner on click.

```html
<div class="reveal" data-state="closed">
  <div class="front">
    <p>Hover or click to reveal the back.</p>
  </div>
  <div class="back">
    <p>Hidden message here.</p>
  </div>
</div>
```

```css
.reveal {
  position: relative;
  width: 320px;
  height: 200px;
  perspective: 800px;
  cursor: pointer;
}

.front,
.back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  transition: transform 0.6s ease, clip-path 0.6s ease;
}

.front {
  background: #f4e8c1;
  padding: 1.5rem;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  transform-origin: top right;
}

.back {
  background: #d4b87a;
  padding: 1.5rem;
  clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
}

.reveal[data-state="open"] .front {
  clip-path: polygon(0 0, 70% 0, 100% 30%, 100% 100%, 0 100%);
  transform: rotateX(15deg) translateY(-4px);
}

.reveal[data-state="open"] .back {
  clip-path: polygon(70% 0, 100% 30%, 100% 100%, 0 100%, 0 0);
}
```

```js
const reveal = document.querySelector(".reveal");
reveal.addEventListener("click", () => {
  reveal.dataset.state = reveal.dataset.state === "open" ? "closed" : "open";
});
```

The `data-state` attribute swap changes both polygons and the front's 3D rotation simultaneously, producing a coordinated peel.

### Example D — Stack of cards with progressive dog-ears

```html
<div class="card-stack">
  <div class="card card-1"></div>
  <div class="card card-2"></div>
  <div class="card card-3"></div>
</div>
```

```css
.card-stack {
  position: relative;
  width: 240px;
  height: 320px;
}

.card {
  position: absolute;
  inset: 0;
  background: #faf6e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-1 {
  /* Top-right dog-ear */
  clip-path: polygon(0 0, 75% 0, 100% 25%, 100% 100%, 0 100%);
  transform: translate(8px, 8px);
  z-index: 3;
}

.card-2 {
  /* Bottom-right dog-ear */
  clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
  transform: translate(4px, 4px);
  z-index: 2;
}

.card-3 {
  /* Bottom-left dog-ear */
  clip-path: polygon(25% 0, 100% 0, 100% 100%, 0 100%, 0 25%);
  z-index: 1;
}
```

Each card has a different dog-ear corner and slight translation, suggesting a fanned stack.

---

## 12. Performance and accessibility

### Performance

**`clip-path` is GPU-accelerated** in most browsers when the clipped element is on its own compositor layer. The browser rasterizes the unclipped content to a texture and applies the path as a fragment shader step. This makes `clip-path` cheap to animate (no layout, no paint of the rest of the page).

Tips for smooth 60fps animations:

- Stick to **`polygon()`** and **`circle()`** for animated values. These are the cheapest to interpolate.
- Avoid animating `clip-path: path()` on large elements. Path interpolation requires more CPU than polygon vertex interpolation. If you must, use `will-change: clip-path` to hint the browser.
- Don't animate `clip-path: url(#svgId)`. It's not animatable per MDN; the browser will snap between values.
- Combine with `transform: translateZ(0)` or `will-change: clip-path` to force a compositor layer on weak hardware.
- `filter: drop-shadow` is also GPU-accelerated but expensive on large areas — apply only to the folded region, not the whole page.

**`mask-image`** is more expensive than `clip-path` because the browser must composite the mask image with the element. For data-URI SVG masks, decoding the SVG on every paint is the main cost. Mitigations:

- Inline the SVG as a `<svg>` element rather than a data URL when possible.
- Use `mask-size` to keep the mask at its natural resolution.
- Avoid `mask-mode: luminance` if `alpha` works (alpha is single-channel, faster to evaluate).

### Accessibility

**`prefers-reduced-motion`**: from CSS-Tricks' article (closing reminder):

> Remember to be mindful of those who may prefer to limit the amount of animation or movement, for example, by setting reduced motion preferences.

```css
@media (prefers-reduced-motion: reduce) {
  .fold-anim,
  .torn-page,
  .reveal .front,
  .reveal .back {
    transition: none;
    animation: none;
  }
}
```

**Decorative vs interactive**: A static dog-eared note is purely decorative — wrap the visual in `aria-hidden="true"`. An interactive peel-back that reveals content must keep that content in the accessibility tree but visually hidden until revealed:

```html
<button class="reveal" aria-expanded="false" aria-controls="reveal-content">
  <span class="front">Click to reveal</span>
  <span class="back" id="reveal-content">Hidden message</span>
</button>
```

**Text in clipped areas**: Clipped text remains in the DOM and is read by screen readers. If you only want the visible portion read, use `aria-hidden="true"` on the visually clipped portion or move the text into the DOM conditionally.

**Color contrast**: Paper-fold effects often layer colors. Maintain at least WCAG AA contrast (4.5:1 for body text) between text and the underlying paper color, even at the folded corner where two colors meet.

**Focus visibility**: When a `clip-path` is applied to a focusable element, ensure `:focus-visible` adds an outline that's not clipped away. Use `outline-offset` or place the outline on a parent:

```css
.card:focus-visible {
  outline: 3px solid #4a90d9;
  outline-offset: 4px;
}
```

**Touch and pointer events on clipped regions**: `clip-path` does not affect hit-testing — the element is still clickable in its full bounding box, including visually clipped corners. If you need the clipped corner to be click-through (e.g., to reveal content beneath), apply `pointer-events: none` to a wrapper or use `clip-path` on a sibling rather than the interactive element.

**Stacking context**: As MDN notes: "A computed value other than `none` results in the creation of a new stacking context." This is normally what you want for paper folds, but it can break `position: fixed` descendants or unexpectedly reorder elements. Test z-index behavior whenever you add a `clip-path`.

---

## Appendix: Quick reference

### Pattern cheat sheet

| Effect            | Clip technique                                 | Vertex count |
|-------------------|------------------------------------------------|--------------|
| Dog-eared corner  | `polygon()` with 5 vertices                    | 5            |
| Page tear (top)   | `polygon()` with 15+ vertices                  | 15+          |
| Page tear (both)  | `polygon()` with 30+ vertices                  | 30+          |
| Folded corner lift| Two stacked `polygon()` triangles              | 5 each       |
| 3D peel           | `polygon()` + `transform: rotateX()`          | 5            |
| Curved tear       | `clip-path: path()`                            | any          |
| SVG-driven clip   | `clip-path: url("#id")`                        | any          |
| Gradient fade     | `mask-image: linear-gradient(...)`             | n/a          |
| Inline SVG mask   | `mask-image: url("data:image/svg+xml,...")`    | any          |

### Browser support summary (as of mid-2026)

| Feature                         | Chrome | Firefox | Safari | Baseline status |
|---------------------------------|--------|---------|--------|-----------------|
| `clip-path: polygon()`          | ✓      | ✓       | ✓      | Widely available (Jan 2020) |
| `clip-path: path()`             | ✓      | ✓       | ✓      | Widely available |
| `clip-path: url("#id")`         | ✓      | ✓       | ✓      | Widely available |
| `clip-path: shape()`            | ✓ 119+ | ✓ 124+  | ✓ 17.4+| Newer           |
| `clip-path: xywh()`             | ✓ 119+ | ✓ 124+  | ✓ 17.4+| Newer           |
| `mask-image`                    | ✓      | ✓       | ✓ 15.4+| Baseline (Dec 2023) |
| `-webkit-mask-image`            | ✓ (legacy) | ✓ (legacy) | ✓ (legacy) | Universal      |
| `transform: rotateX()` 3D       | ✓      | ✓       | ✓      | Widely available |

### Sources consulted

1. [MDN — `clip-path` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)
2. [CSS-Tricks — Animating with Clip-Path (Travis Almand, 2019)](https://css-tricks.com/animating-with-clip-path/)
3. [MDN — `mask-image` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image)
4. [Bennett Feely — Clippy (CSS clip-path maker)](https://bennettfeely.com/clippy/)
5. [CSS-Tricks — Clip Path Masks](https://css-tricks.com/clip-path-masks/) *(URL returned 404 at retrieval time; superseded by web.dev and MDN references)*
6. [web.dev — Apply effects to images with the CSS mask-image property (Rachel Andrew)](https://web.dev/articles/css-masking)
