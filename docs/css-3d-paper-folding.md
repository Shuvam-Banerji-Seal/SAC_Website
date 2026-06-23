# CSS 3D Paper-Folding Techniques

> A practitioner's field guide to simulating real paper folds with CSS
> `transform-style`, `perspective`, `transform-origin`, `backface-visibility`,
> `clip-path`, and friends. Covers core properties, single-fold math,
> multi-page book turns, brochure reveals, crease/shadow tricks, performance
> pitfalls, and Safari/iOS quirks. Drawn from MDN, CSS-Tricks, David
> DeSandro's *Intro to CSS 3D transforms*, Codrops, web.dev, and
> Smashing Magazine references.

---

## Table of Contents

1. [The five core properties](#1-the-five-core-properties)
2. [Mental model: scene, object, faces](#2-mental-model-scene-object-faces)
3. [Faking a real paper fold](#3-faking-a-real-paper-fold)
4. [Crease & shadow effects](#4-crease--shadow-effects)
5. [Multi-step fold animations](#5-multi-step-fold-animations)
6. [The card-flip hover (the smallest fold)](#6-the-card-flip-hover-the-smallest-fold)
7. [The multi-page book turn](#7-the-multi-page-book-turn)
8. [The brochure reveal (Z-fold / tri-fold)](#8-the-brochure-reveal-z-fold--tri-fold)
9. [Clip-path: a parallel toolkit](#9-clip-path-a-parallel-toolkit)
10. [Performance pitfalls (layers, GPU, mobile)](#10-performance-pitfalls-layers-gpu-mobile)
11. [Browser quirks (Safari, iOS Safari, IE11)](#11-browser-quirks-safari-ios-safari-ie11)
12. [Accessibility & reduced motion](#12-accessibility--reduced-motion)
13. [Reference tables & checklist](#13-reference-tables--checklist)
14. [Sources](#14-sources)

---

## 1. The five core properties

Paper-folding is a problem of *placing a thin sheet in a 3D space, rotating a
portion of it, and hiding the back*. Five CSS properties do essentially all of
the work; everything else is `transform` and `clip-path` math.

| Property | Default | Purpose for paper folds | Notes |
|---|---|---|---|
| `transform-style` | `flat` | Keeps folded children in 3D instead of flattening onto the parent plane. Set to `preserve-3d` on every parent of nested folds. | Required on the `.scene` and every wrapper that itself has rotated children. |
| `perspective` | `none` | Distance from the viewer to the z=0 plane. Determines how strong the fold looks. Set on a parent of the folded element, *not* on the folded element itself. | Smaller = more dramatic. 600–1200 px is a safe range for cards, books, and brochures. |
| `perspective-origin` | `50% 50%` | The vanishing point of the 3D scene. Off-center origins mimic looking at the page from a slight angle. | Good for "isometric" brochure hero shots. |
| `transform-origin` | `50% 50% 0` | The pivot point of a single fold. **Set this to the crease line** (`left center`, `right center`, `top center`, `bottom center`). | Default `center` will fold the page through its own middle, not along an edge. |
| `backface-visibility` | `visible` | Hides the back of an element when its front has rotated past ~90°. Set to `hidden` on every face of a fold. | Without it, the back side of a page shows through the front and ruins the illusion. |

### 1.1 `transform-style` in detail

`transform-style` is *not inherited* — every non-leaf ancestor that has
3D-transformed descendants must declare it, or those descendants will be
flattened onto the ancestor's plane ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)).

```css
.scene { transform-style: preserve-3d; }
.book  { transform-style: preserve-3d; }
.page  { transform-style: preserve-3d; }
```

The spec forces `transform-style: flat` even when `preserve-3d` is requested
if any of these properties are used on the element ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)):

- `overflow` other than `visible` or `clip`
- `opacity` < `1`
- `filter` other than `none`
- `clip` other than `auto`
- `clip-path` other than `none`
- `isolation: isolate`
- `mask-image` other than `none`
- `mix-blend-mode` other than `normal`
- `contain: paint` (and any value causing paint containment)

This is the single biggest gotcha in paper-folding: a stray
`opacity: 0.99` on the scene container will silently kill all your 3D work.

### 1.2 `perspective` — the property vs. the function

There are two ways to add perspective, and they are not interchangeable
([CSS-Tricks: perspective](https://css-tricks.com/almanac/properties/p/perspective/),
[DeSandro](https://3dtransforms.desandro.com/perspective)):

```css
/* Property on a parent — children share one 3D space. */
.scene { perspective: 1000px; }
.card  { transform: rotateY(45deg); }

/* Function on the element itself — each element has its own vanishing point. */
.card  { transform: perspective(1000px) rotateY(45deg); }
```

**Always use the `perspective` *property* on a parent** when you have more
than one folded child (a book has many pages; a brochure has three panels).
The function form is fine for a lone card flip.

`perspective` also creates a new stacking context and a containing block for
`position: fixed` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)).

### 1.3 `transform-origin` — the crease line

`transform-origin` takes 1, 2, or 3 values; the third is the z-offset
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin)):

```css
transform-origin: center;          /* 50% 50% 0  — center of element */
transform-origin: left center;     /* crease on the left edge, fold right */
transform-origin: right center;    /* crease on the right edge */
transform-origin: top center;      /* crease along the top */
transform-origin: bottom center;   /* crease along the bottom */
transform-origin: 50% 50% 100px;   /* 3D pivot pushed 100px toward viewer */
```

For paper folds, the most common origins are the four edge-centers. The
default `center` will fold the sheet through its middle — useful for a
"fold in half" effect, wrong for a page turning on its spine.

### 1.4 `backface-visibility`

`backface-visibility: hidden` makes an element invisible when its back side
faces the viewer ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility)).
This is essential for two-sided folds (page front and back, brochure
panel front and back). It has no effect on purely 2D transforms.

```css
.page-face { backface-visibility: hidden; }
.page-face--back { transform: rotateY(180deg); } /* pre-flipped */
```

---

## 2. Mental model: scene, object, faces

David DeSandro's *Intro to CSS 3D transforms* recommends a strict three-level
DOM pattern for any 3D object
([card-flip](https://3dtransforms.desandro.com/card-flip)):

```html
<div class="scene">   <!-- 3D space: perspective here -->
  <div class="object"> <!-- 3D object: transform-style: preserve-3d -->
    <div class="face face--front"></div>
    <div class="face face--back"></div>
  </div>
</div>
```

| Layer | Class role | CSS responsibility |
|---|---|---|
| Scene | `.scene` | Sets `perspective`. Sizes the visible area. May clip overflow. |
| Object | `.card`, `.book`, `.page` | The thing that rotates. Sets `transform-style: preserve-3d` so descendants stay in 3D. |
| Faces | `.face` | The flat surfaces. `position: absolute`, `backface-visibility: hidden`, positioned in 3D with `translateZ`, `rotateX/Y`. |

This pattern scales cleanly: a book is a scene containing N page-objects, each
of which contains two faces. A brochure is one object with three faces.

---

## 3. Faking a real paper fold

A real fold has three properties a flat 2D card flip lacks:

1. **The fold is along a crease**, not through the middle.
2. **One half of the sheet is closer to the viewer than the other** when
   the fold is in progress.
3. **A crease shadow** appears where the two halves meet.

The math for (1) and (2) is just `transform-origin` + `translateZ`; (3) is a
trick (see §4).

### 3.1 The single-page fold (corner curl)

A corner curling forward toward the viewer is the smallest convincing
"paper" gesture.

```html
<div class="scene">
  <div class="paper">
    <div class="paper__face paper__face--front">Front</div>
    <div class="paper__corner"></div>
  </div>
</div>
```

```css
.scene { perspective: 1000px; }

.paper {
  position: relative;
  width: 200px;
  height: 280px;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.paper__face { position: absolute; inset: 0; }

.paper__corner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f5e9c8 0%, #c9a86a 100%);
  transform-origin: right bottom;     /* crease = bottom-right corner */
  transition: transform 0.6s ease;
  box-shadow: -2px -2px 4px rgba(0,0,0,0.25);
  cursor: pointer;
}

.paper:hover .paper__corner {
  transform: rotateX(-180deg);
}
```

`transform-origin: right bottom` puts the crease at one corner; rotating
around the X axis lifts the corner toward the viewer. `box-shadow` provides
the soft hint that the lifted corner is above the page.

### 3.2 The half-fold (bookmark / receipt)

A real receipt tears along a horizontal line. The fold has a single crease
halfway down:

```css
.scene { perspective: 900px; }

.page {
  position: relative;
  width: 200px;
  height: 280px;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(.4, 0, .2, 1);
}

.page--top-half {
  position: absolute;
  inset: 0 0 50% 0;     /* top half only */
  background: #f8f1e0;
  transform-origin: bottom;       /* crease = bottom edge of the half */
  transition: transform 0.8s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.page.is-folded .page--top-half {
  transform: rotateX(-178deg);    /* almost 180, never quite */
}
```

The "never quite 180" detail matters: at exactly 180° the back of the half
is parallel to the page below and looks like a flat color swatch in some
browsers. Stopping at 175–178° keeps the back's edge visible and reads as
folded paper.

### 3.3 The tri-fold panel

Three panels side-by-side, where panel 2 is the middle and is pre-rotated
180° around Y. This is the same trick as a card flip, just with three faces:

```css
.scene { perspective: 1400px; }
.brochure {
  position: relative;
  width: 600px;
  height: 200px;
  transform-style: preserve-3d;
  transition: transform 0.8s ease;
}

.panel { position: absolute; top: 0; height: 100%; width: 200px; }

.panel--left   { left: 0;   background: #d8c89a; }
.panel--center { left: 200px; background: #f0e3c0;
                 transform: rotateY(180deg);
                 transform-origin: left center; }
.panel--right  { left: 400px; background: #c8b07a; }

.brochure.is-open .panel--center { transform: rotateY(0); }
```

The middle panel is the only one that animates. Because it starts flipped,
`backface-visibility: hidden` makes it invisible until it has rotated past
90° — exactly what a real tri-fold does.

---

## 4. Crease & shadow effects

A flat sheet rotated 90° in 3D is *geometrically correct* but looks
*cheap*. The "real paper" feel comes from three layered effects.

### 4.1 The crease line — `box-shadow` inside the fold

When two halves meet, the page material forms a sharp line. Recreate it
with a thin `box-shadow` (or `filter: drop-shadow`) on the rotating face
that points *into* the crease:

```css
.page-half--top {
  transform-origin: bottom;
  box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.35); /* crease shadow */
}
```

The shadow sits just below the rotating edge and stays put during the
animation, reading as "the page is bent here, casting a shadow on what's
below it."

### 4.2 The lifted-corner gradient

A curled corner is brighter at the apex (catching light) and darker near
the crease. A `linear-gradient` at 135° is the cheapest approximation:

```css
.paper__corner {
  background: linear-gradient(
    135deg,
    #fff8e0 0%,
    #e8d5a0 60%,
    #b08c4a 100%
  );
}
```

The lighter the apex, the more the corner "catches the light." Reverse the
gradient for shadows instead of highlights.

### 4.3 The drop-shadow under the whole sheet

A real folded sheet casts a soft shadow on the surface below it. Use
`filter: drop-shadow()` (not `box-shadow`, which only follows the bounding
rectangle):

```css
.paper {
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.25));
}
```

`filter` is on the list of properties that force `transform-style: flat`
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)) —
so apply it to the *face* elements, not the scene.

### 4.4 The self-shadow on the back face

When the page is mid-fold, the back face is in shadow. Set a subtle dark
overlay on the back face, or use a `linear-gradient` on the back side:

```css
.face--back {
  background:
    linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)),
    var(--page-color);
}
```

---

## 5. Multi-step fold animations

Paper folds are almost never one step. A book page turn has three:
*lift → flip → settle*. A brochure reveal has two: *closed → opening → open*.
A real sheet folded in half has a pre-crease, a fold, and a release.

### 5.1 Choreographing with `animation-timing-function` per keyframe

```css
@keyframes fold {
  0%   { transform: rotateY(0);     animation-timing-function: ease-in;  }
  50%  { transform: rotateY(-150deg); animation-timing-function: ease-out; }
  100% { transform: rotateY(-180deg); }
}
```

The "ease-in then ease-out" reads as physics: the page accelerates as it
leaves the stack, decelerates as it lands.

### 5.2 Sequencing with `animation-delay`

```css
.fold-step-1 { animation: fold 0.5s 0.0s forwards; }
.fold-step-2 { animation: fold 0.5s 0.4s forwards; }
.fold-step-3 { animation: fold 0.5s 0.8s forwards; }
```

Each crease starts a beat after the previous. The total animation feels
like a single gesture instead of three parallel ones.

### 5.3 Sequencing with JS for state-driven folds

For interactive books and brochures, the choreography usually lives in JS
and toggles classes:

```js
const book = document.querySelector('.book');
document.querySelector('.next').onclick = () => {
  const top = book.querySelector('.page--top');
  top.style.transform = 'rotateY(-180deg)';
  top.addEventListener('transitionend', () => {
    book.appendChild(top); // recycle to the back of the stack
    top.style.transition = 'none';
    top.style.transform = 'rotateY(0)';
    requestAnimationFrame(() => { top.style.transition = ''; });
  }, { once: true });
};
```

Recycling the turned page to the back of the stack is the standard
"infinite book" trick ([Codrops](https://tympanus.net/codrops/)).

---

## 6. The card-flip hover (the smallest fold)

A card flip is a single-page fold along a vertical crease. This is the
canonical DeSandro card-flip pattern
([3dtransforms.desandro.com/card-flip](https://3dtransforms.desandro.com/card-flip)):

```html
<div class="scene">
  <div class="card">
    <div class="card__face card__face--front">front</div>
    <div class="card__face card__face--back">back</div>
  </div>
</div>
```

```css
.scene {
  width: 200px;
  height: 260px;
  perspective: 600px;
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 1s;
  transform-style: preserve-3d;
  cursor: pointer;
}

.card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0,0,0,0.25);
}

.card__face--front { background: #c0392b; color: #fff; }
.card__face--back  { background: #2980b9; color: #fff;
                     transform: rotateY(180deg); }

.card.is-flipped { transform: rotateY(180deg); }
```

```js
document.querySelector('.card').addEventListener('click', e => {
  e.currentTarget.classList.toggle('is-flipped');
});
```

For a "page slides out as it flips" effect, change the origin and add a
translate (DeSandro's *slide-flip*):

```css
.card { transform-origin: center right; }

.card.is-flipped {
  transform: translateX(-100%) rotateY(-180deg);
}
```

This is the closest pure-CSS analogue of a book page turn.

---

## 7. The multi-page book turn

A real book is *N* pages stacked on a spine. Each page is a `transform-style:
preserve-3d` container with two faces. The pages sit on top of each other
in the same plane; each one rotates around the same vertical axis (the
spine).

```html
<div class="book-scene">
  <div class="book">
    <div class="page" style="--i: 0">…</div>
    <div class="page" style="--i: 1">…</div>
    <div class="page" style="--i: 2">…</div>
    <!-- … -->
  </div>
</div>
```

```css
.book-scene {
  perspective: 1800px;
}

.book {
  position: relative;
  width: 400px;
  height: 560px;
  transform-style: preserve-3d;
}

/* Each page sits in the same plane. We add tiny z-offsets to prevent
   z-fighting between overlapping pages. */
.page {
  position: absolute;
  inset: 0;
  transform-origin: left center;     /* spine is on the left */
  transform: translateZ(calc(var(--i) * -1px));
  transition: transform 0.9s cubic-bezier(.45, .05, .25, 1);
  transform-style: preserve-3d;
}

.page__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  background: #f8f1e0;
  box-shadow: inset 3px 0 6px rgba(0,0,0,0.15);
}

.page__face--back {
  transform: rotateY(180deg);
  background: #f3e8c8;
}

.page.is-turned {
  transform: translateZ(calc(var(--i) * -1px)) rotateY(-180deg);
}
```

Three important details:

1. **The spine is the `transform-origin`.** Every page pivots on the same
   vertical line — the left edge.
2. **Negative `translateZ` per page** (or a similar offset) prevents
   z-fighting where pages overlap in screen space. Without it, the
   topmost page flickers as you turn it.
3. **`cubic-bezier(.45, .05, .25, 1)`** is a good "page falling" curve —
   slow at the start (lifting off the stack), quick in the middle, soft
   at the end (settling on the other side).

To turn a page, toggle `.is-turned`, and on `transitionend` move the
turned page to the back of the stack so the next click turns the next page.
This is the Codrops "realistic-looking book" pattern.

---

## 8. The brochure reveal (Z-fold / tri-fold)

A tri-fold brochure is a single sheet with two creases that fold it into
thirds. In CSS it's a 3-face scene where the middle face is pre-rotated
180° and slides into view on `is-open`.

```html
<div class="scene">
  <div class="brochure">
    <div class="panel panel--left">Left panel — the cover.</div>
    <div class="panel panel--mid">Middle panel — the spread.</div>
    <div class="panel panel--right">Right panel — the back cover.</div>
  </div>
</div>
```

```css
.scene {
  perspective: 1400px;
  perspective-origin: 50% 60%;
}

.brochure {
  position: relative;
  width: 600px;
  height: 200px;
  transform-style: preserve-3d;
  transform: rotateX(8deg);   /* tilt it like it's sitting on a table */
  transition: transform 0.8s ease;
}

.panel {
  position: absolute;
  top: 0; height: 100%;
  width: 200px;
  backface-visibility: hidden;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.18);
}

.panel--left  { left: 0;    background: #c9a86a; transform-origin: right center; }
.panel--mid   { left: 200px; background: #f0e3c0; transform-origin: left center;
                transform: rotateY(180deg); }
.panel--right { left: 400px; background: #b08c4a; transform-origin: left center; }

.brochure.is-open .panel--mid { transform: rotateY(0); }
```

Two creases means two `transform-origin` lines. The middle panel's origin
is the left edge of itself (which is the right edge of the left panel —
the first crease). The right panel's origin is the left edge of itself
(the second crease). All three panels are pre-positioned in screen space
side-by-side, but only the middle one is rotated.

For a *Z-fold* (one panel folds over the other, the third stays flat),
add a rotation to the right panel and a `translateZ` to lift it over
the middle.

---

## 9. Clip-path: a parallel toolkit

`clip-path` is the 2D cousin of 3D transforms. It cannot *rotate* a
sheet, but it can *reveal* one through a shape
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path),
[CSS-Tricks: Animating with Clip-Path](https://css-tricks.com/animating-with-clip-path/)).

For paper-fold UX, `clip-path` shines in two places:

1. **Page tear / shred effects** — animate a `polygon` with many
   vertices to "tear" the page into strips.
2. **Reveal-from-crease** — animate `inset()` to wipe the page into
   view from a single edge, mimicking a fold that has just settled.

```css
.page {
  clip-path: inset(0 100% 0 0);              /* hidden, on the right */
  transition: clip-path 0.8s ease;
}
.page.is-revealed {
  clip-path: inset(0 0 0 0);                 /* fully shown */
}
```

`clip-path` *also* forces `transform-style: flat`, so don't put a
`clip-path` on the same element that has a rotated, preserve-3d parent
unless you mean it.

### 9.1 The four basic shapes

| Shape | Example | Use for paper folds |
|---|---|---|
| `inset(top right bottom left)` | `inset(10% 20% 30% 40%)` | Reveal/wipe from a crease line. |
| `circle(r at x y)` | `circle(75% at 50% 50%)` | Page being "peeled" by a circular motion. |
| `ellipse(rx ry at x y)` | `ellipse(80% 50% at 50% 50%)` | A page peeling along an elliptical arc. |
| `polygon(x1 y1, x2 y2, ...)` | `polygon(50% 0, 100% 50%, 50% 100%, 0 50%)` | Tears, slots, shutters, multi-strip reveals. |

For the polygon shape, **the number of vertices must match across
keyframes** or the animation will pop. CSS-Tricks has working
examples of [slots, shutters, spiral, star, and iris](https://css-tricks.com/animating-with-clip-path/)
that are useful to study for the equivalent paper effects.

---

## 10. Performance pitfalls (layers, GPU, mobile)

3D paper folds are *not* free. Each folded element is a separate
composited layer on the GPU. A 20-page book is 20 layers. A brochure with
two `filter: drop-shadow` chains is two filter passes per frame.

### 10.1 What creates a layer (in Chrome / WebKit / Gecko)

- `transform` with a `3d` function: `translate3d`, `rotate3d`, `scale3d`,
  `translateZ(0)` (the famous hack).
- `will-change: transform` (use sparingly — see below).
- `transform-style: preserve-3d` on a parent.
- `filter` other than `none`.
- `backdrop-filter` other than `none`.
- `opacity < 1` combined with `transform`.
- `<video>`, `<canvas>`, `<iframe>`.

For a paper-fold scene this is *exactly what we want* — each page
deserves its own layer. But each layer costs GPU memory (a 1080p page is
8 MB of framebuffer). A book of 20 large pages is 160 MB of GPU memory
just for the book.

### 10.2 `will-change` — yes, but be specific

The `will-change` property is a hint to the browser to *promote* an
element to its own layer ahead of time. Use it on the things that will
actually animate, and remove it when the animation is over
([CSS-Tricks](https://css-tricks.com/almanac/properties/w/will-change/)):

```css
.page { will-change: transform; }
/* After the page is fully turned and recycled, JS removes the class. */
```

`will-change: transform, opacity` is fine. `will-change: all` is a
memory leak — don't use it.

### 10.3 Hardware acceleration with `translate3d(0, 0, 0)`

Quoting Dean Jackson (CSS 3D transform spec author) on
[DeSandro's site](https://3dtransforms.desandro.com/3d-transform-functions):

> any transform that has a 3D operation as one of its functions will
> trigger hardware compositing, even when the actual transform is 2D, or
> not doing anything at all (such as `translate3d(0,0,0)`). … it is very
> helpful in some situations and can significantly improve redraw
> performance.

Use this only when you have profiled and confirmed the layer promotion
matters. Modern browsers promote automatically when they detect an
animated `transform`.

### 10.4 Mobile-specific concerns

- **iOS Safari** is the most fragile renderer. See §11.
- **Lower-end Android (Mali-G31, Adreno 3xx class)** has a hard cap on
  layers (~16 in WebKit-derived browsers). A 20-page book will silently
  fail to render the back layers; reduce layer count by recycling pages
  aggressively.
- **Battery** — every animated transform is a wake-up of the GPU.
  Don't animate 3D on scroll unless the scroll is throttled.
- **Jank from paint** — a `box-shadow` with 30 px blur on an animating
  element forces a repaint per frame. Animate `opacity` and `transform`
  only; keep shadows static or animate them with `filter: drop-shadow`
  (cheaper, layer-aware).

### 10.5 Quick performance checklist

- [ ] Animate only `transform` and `opacity` on the folded elements.
- [ ] `will-change: transform` only on elements that *will* animate.
- [ ] Avoid `box-shadow` animations on folded faces; use static shadows
      or `filter: drop-shadow` on a non-animating parent.
- [ ] Cap `translateZ` depth at the smallest value that reads as 3D
      (often 0–50 px).
- [ ] Recycle turned pages in a book to keep the live layer count flat.
- [ ] Test on a real low-end Android, not just Chrome on a Pixel.

---

## 11. Browser quirks (Safari, iOS Safari, IE11)

### 11.1 Safari / iOS Safari

- **iOS Safari sometimes ignores `transform-style: preserve-3d` on
  `position: fixed` parents.** If your scene is fixed, restructure so
  the `preserve-3d` ancestor is in normal flow.
- **Backface blur**: a back face with a transparent background may show
  the front through it on iOS even with `backface-visibility: hidden`.
  Set a fully opaque background-color on both faces.
- **Perspective on the function form** (`transform: perspective(…)`)
  produces a different vanishing point per child. Always use the
  *property* on the parent when you have more than one face.
- **Safari Technology Preview** has had intermittent bugs with
  `clip-path: polygon()` animations on transformed parents. Avoid
  animating clip-path on a child of a preserve-3d element.
- **Forced 3D acceleration in Safari** is roughly the same as WebKit;
  `translate3d(0,0,0)` works but is less necessary than it was in 2014.
- **Tap delay** on iOS Safari removed the 300 ms delay if
  `touch-action: manipulation` is set on the scene.

### 11.2 Internet Explorer 11

IE 10/11 does **not** support `transform-style: preserve-3d`
([DeSandro](https://3dtransforms.desandro.com/)). Without it, every
nested 3D child flattens to the plane of its parent. There is no
workaround; IE 11 can do card flips (single-level 3D) but cannot do
books or brochures (multi-level 3D).

For a graceful fallback, serve a 2D cross-fade via `@supports`:

```css
.card { transition: opacity 0.4s; }
@supports (transform-style: preserve-3d) {
  .card {
    transform-style: preserve-3d;
    transition: transform 0.8s;
  }
}
```

### 11.3 Firefox

Firefox supports the full set but, like WebKit, force-uses `flat` when
any of the flattening properties are present on the same element
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)).
Firefox also has a known issue where `transform-origin: bottom`
interacts oddly with `position: absolute` children in flex containers.

### 11.4 Chrome

Chrome is the reference implementation. The most common Chrome-only
glitch is `filter: drop-shadow` clipping at the perspective plane edge
when a folded element rotates past 90°.

### 11.5 Feature-detect before animating

```js
const supports3D = CSS.supports('transform-style', 'preserve-3d');
if (!supports3D) {
  // Fall back to 2D cross-fade
}
```

---

## 12. Accessibility & reduced motion

A paper-fold effect that flips a 200 px page is not vestibular-harmful
on its own. But a brochure reveal that fires *on every scroll*, or a
book page that animates on hover near the cursor, can be.

Wrap the animation in a `prefers-reduced-motion` check:

```css
.page {
  transition: transform 0.8s ease;
}
@media (prefers-reduced-motion: reduce) {
  .page { transition: none; }
  .page.is-turned { transform: none; /* or apply via JS swap */ }
}
```

Also: the rotated content is in the **tab order** at all rotation
states. If a face contains focusable elements, the back face's tab order
will still fire when the back is rotated away. Solutions:

- Toggle `visibility: hidden` on the back face when `rotateY > 90deg` /
  `< -90deg` (via JS).
- Or `inert` the face (`inert` attribute) so its children are not
  focusable.

Provide a non-3D fallback content (e.g., a flat `<a>` link) for
screen-reader users.

---

## 13. Reference tables & checklist

### 13.1 Quick reference: every property involved

| Property | Where it goes | Why |
|---|---|---|
| `perspective` | Scene | Defines 3D space. Use the property, not the function, when you have multiple children. |
| `perspective-origin` | Scene | Moves the vanishing point. |
| `transform-style: preserve-3d` | Every ancestor of a 3D-transformed child | Keeps grandchildren in 3D. Must be on every level. |
| `transform-origin` | The element that rotates | Sets the crease. Default is center; for paper, use an edge. |
| `transform: rotateX/Y/Z` | The element that rotates | The fold itself. |
| `transform: translateZ` | Faces | Pulls a face into its 3D plane (e.g., `translateZ(50px)` to push a cube face out). |
| `backface-visibility: hidden` | Faces that should hide when flipped | Required for two-sided folds. |
| `transition` / `animation` | The element that rotates | Timing. |
| `filter: drop-shadow` | Parent of folded elements, NOT the scene | Soft shadow under the whole sheet. |
| `box-shadow` | Faces, not the rotating element | Crease and lifted-corner hints. |
| `clip-path` | Separate from preserve-3d, or on a face | Tears, peels, reveals. |
| `will-change: transform` | Only on elements that will animate | Hint for layer promotion. |

### 13.2 The "is it 3D?" checklist

- [ ] Perspective on the **scene** (parent), not the rotating element.
- [ ] `transform-style: preserve-3d` on every ancestor of rotated children.
- [ ] No `opacity < 1`, no `overflow: hidden`, no `filter`, no
      `clip-path` on the *same* element that has `preserve-3d`
      (these force `flat`).
- [ ] `transform-origin` set to the **crease line**, not center.
- [ ] `backface-visibility: hidden` on every face that should hide.
- [ ] Animate only `transform` and `opacity` on the folded element.
- [ ] Test on iOS Safari.
- [ ] `prefers-reduced-motion` fallback.
- [ ] No `transform-style: preserve-3d` required for IE11; provide a
      2D fallback.

### 13.3 The "is it *paper*?" checklist

- [ ] At least one face has a *gradient* (light at apex, dark at crease).
- [ ] A `box-shadow` is on the rotating face, not the bounding rect.
- [ ] A `filter: drop-shadow` is on a static parent, not the scene.
- [ ] The rotating face stops just shy of 180° (175–178°).
- [ ] Where two faces meet, a thin shadow sits at the seam.
- [ ] The page is *thin* in the z direction — push it back with a small
      `translateZ` if needed for z-fighting between pages.

---

## 14. Sources

1. MDN — [`transform-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)
2. MDN — [`perspective`](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)
3. MDN — [`backface-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility)
4. MDN — [`transform-origin`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin)
5. MDN — [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)
6. CSS-Tricks Almanac — [`perspective`](https://css-tricks.com/almanac/properties/p/perspective/) (Chris Coyier, 2012)
7. CSS-Tricks Almanac — [`transform-style`](https://css-tricks.com/almanac/properties/t/transform-style/) (Chris Coyier, 2012)
8. CSS-Tricks — [Animating with Clip-Path](https://css-tricks.com/animating-with-clip-path/) (Travis Almand, 2019)
9. David DeSandro — [*Intro to CSS 3D transforms*](https://3dtransforms.desandro.com/)
   - [Perspective](https://3dtransforms.desandro.com/perspective)
   - [3D transform functions](https://3dtransforms.desandro.com/3d-transform-functions)
   - [Card flip](https://3dtransforms.desandro.com/card-flip)
10. Codrops — [Inspiration for Article Intro Effects](https://tympanus.net/codrops/2014/05/22/inspiration-for-article-intro-effects/) (Manoela Ilic, 2014)
11. web.dev / HTML5Rocks — [3D and CSS](https://web.dev/articles/3d-css) (Paul Kinlan, 2010)
12. CSS Transforms Module Level 2 — [W3C draft](https://drafts.csswg.org/css-transforms-2/)

---

*Compiled for the SAC website. Last reviewed: 2026-06-22.*
