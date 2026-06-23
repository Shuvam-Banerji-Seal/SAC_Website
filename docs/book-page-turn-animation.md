# Book Page-Turn Animation — design.md

> Research notes and implementation guide for **book-like page-turn
> interactions** on the SAC website, beyond the current newspaper theme.
>
> **Status:** Research · **Last updated:** 2026-06-22 · **Author:** SAC web team
> **Target surface:** future "book" / "magazine" / "yearbook" views inside
> the SAC site (e.g. an annual report, a club chronicle, a multi-page
> magazine spread)
> **Stack:** **Pure static HTML + CSS + ES modules** — no React, no
> jQuery, no Three.js. The page-turn itself is built from real DOM
> elements (real `<article>` pages, real `box-shadow`, real `transform`)
> styled with CSS 3D transforms.

---

## Overview

A book page-turn is a **3-D rotation of a single page element around a
hinge line that lives on the book's spine**. The animation is almost
always implemented as a CSS transform animation on a real DOM element
(an `<article>` or `<section>`), not as canvas or WebGL.

The technique is mature: CSS 3D transforms are Baseline (shipped across
all major browsers since at least 2022), and well-known reference
implementations like [Codrops BookBlock (2012)](https://tympanus.net/codrops/2012/09/03/bookblock-a-content-flip-plugin/)
and [turn.js (2013, ongoing)](https://github.com/blasten/turn.js) have
been used in production for over a decade. The modern, dependency-free
[Nodlik StPageFlip](https://github.com/Nodlik/StPageFlip) library
exports a clean API for both image-mode and HTML-mode page flips and is
the closest peer to what we want.

The recommendation for SAC is **build the flip directly in CSS 3D + a
small JS pointer wrapper**, not pull in a third-party library. The
animation is small enough (one rotating page, one shadow, one fixed
spine) that the entire feature can live in roughly 80 lines of CSS and
60 lines of JS.

**Category:** Navigation / transition (between "pages" of a long-form
view)
**Primary surface:** a `section.book` inside `pages/book.html` (to be
created) or as a nested component inside `pages/club.html`
**Tone:** Tactile, slow, deliberate. Roughly **700–1000 ms** per flip.
**Frameworks / libraries:** **None**. Optional dependency-free library
if scope grows: `page-flip` (npm).
**3-D stack:** CSS 3D only. No WebGL, no Three.js, no `<canvas>` for
the page flip itself. `transform-style: preserve-3d` is required on
every ancestor of the rotating page (or the 3D effect collapses).

---

## The mechanics, in plain words

A real-world book page-turn has six mechanical ingredients:

1. **Hinge line.** A line on the page that does not move during the
   turn. On a right-to-left book the hinge is the **left edge** of the
   page (the spine side); on a left-to-right book (Western) the hinge
   is the **right edge**. The page rotates **around this line**, not
   around its own center. In CSS this is exactly `transform-origin`
   set to `left center` or `right center`.
2. **Page curl.** The page arcs through 3-D space from its starting
   position to the other side of the spine. It is a `rotateY` from
   `0deg` to `-180deg` (or `+180deg` depending on direction) with a
   perspective applied to the parent so the rotation looks like an
   arc, not a flat spin.
3. **Shadow on the page being turned.** As the page lifts away from
   the stack it casts a shadow on the page below. The shadow is
   **denser at the hinge and lighter at the free edge** (because the
   free edge is higher). This is typically done with an inset
   `box-shadow` or a gradient overlay on the page below the turning
   page.
4. **Shadow under the turning page itself.** The page also has its
   **own shadow that grows as it rises** — usually a soft
   `box-shadow` whose `blur` and `y-offset` are animated in lockstep
   with the rotation.
5. **Back of the turning page.** In a real book, the back of the
   turning page is the **reverse side of the page you're turning to**
   (i.e. the front of page N+1 is the back of page N as it lifts). It
   is the same content mirrored — or, more commonly for the "back of
   the turning page" effect, a **slightly darker, slightly
   desaturated** version of the page below it (because you can see
   some of the next page through the paper). Implemented with
   `backface-visibility: hidden` and a second pseudo-element rotated
   to `180deg`.
6. **Double-page spread.** When two pages are visible at once, they
   sit side by side with a thin shadowed gutter in the middle (the
   spine valley). The flipping page covers exactly one half.

---

## The CSS properties involved

| Property | Where it's used | What it does |
| --- | --- | --- |
| `perspective` | On the **book container** | Gives all children a shared 3-D vanishing point. Smaller value = more dramatic. ~`1200–2000px` reads as "page on a desk", <`600px` reads as "macro lens". |
| `transform: perspective(…)` | On the **page itself** | Alternative to the parent `perspective` property. Affects only that one element. **Do not mix** — use one or the other, not both on the same element. |
| `perspective-origin` | On the book container | Moves the vanishing point. `50% 50%` (default) works for a centered book. |
| `transform-style: preserve-3d` | On **every ancestor** of the rotating page | Without this, descendants get flattened to the plane of their parent and the rotation looks flat. **Required** for any nested 3D. |
| `transform-origin` | On the **page being turned** | Set to `0% 50%` for left-side hinge (right-page turn) or `100% 50%` for right-side hinge (left-page turn). |
| `transform: rotateY(…)` | On the **page being turned** | The flip itself. `-180deg` for left-to-right (Western), `+180deg` for right-to-left. |
| `backface-visibility` | On the **back face** of the page | `hidden` lets the next-page content show through cleanly without the page's mirror image. |
| `box-shadow` (multiple) | On the turning page + the page below | Animate `blur`, `y-offset`, `opacity` to fake the lifting shadow and the cast shadow. |
| `transition` or `animation` | On the page | The actual motion. Real page turns are ~`800–1000 ms` with an `ease-in-out` curve. |
| `will-change: transform` | On the turning page (sparingly) | Hints to the compositor to GPU-accelerate the page. |

### Pitfalls from the spec

A [long list of CSS properties silently force
`transform-style: flat`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style#description)
even when `preserve-3d` is set on a parent. From the MDN reference,
these are the ones to watch for in our code:

* `overflow` anything other than `visible` or `clip`
* `opacity` less than `1`
* `filter` other than `none`
* `clip-path` other than `none`
* `isolation: isolate`
* `mask-image` / `mask-border-source` other than `none`
* `mix-blend-mode` other than `normal`
* `contain: paint` (and any property that triggers paint containment,
  including `content-visibility: hidden`)

**Practical consequence for SAC:** do **not** put
`overflow: hidden` on the book container while a page is mid-flip.
If we need to clip the book to a viewport, do it on a wrapper *outside*
the `transform-style: preserve-3d` ancestor chain.

---

## The DOM model

The flip is built from real DOM elements — there is no canvas, no SVG
animation. A canonical structure:

```html
<section class="book" aria-label="SAC Chronicle, 2025 edition">
  <div class="book-stage">                    <!-- perspective lives here -->

    <div class="book-spread" aria-hidden="false">
      <article class="page page-left">Page 4</article>     <!-- fixed left page -->
      <article class="page page-right">Page 5</article>    <!-- fixed right page -->

      <article class="page page-turning" aria-hidden="true">
        <div class="page-front">Page 5 (front)</div>       <!-- what the reader sees lifting -->
        <div class="page-back">Page 4 (back, desaturated)</div>
      </article>
    </div>

    <div class="book-shadow" aria-hidden="true"></div>     <!-- ground shadow under the whole book -->
  </div>

  <nav class="book-controls" aria-label="Book navigation">
    <button type="button" class="book-prev">Previous page</button>
    <span class="book-position" aria-live="polite">Page 5 of 24</span>
    <button type="button" class="book-next">Next page</button>
  </nav>
</section>
```

Only the `page-turning` element rotates. The two fixed pages stay in
place. When the flip finishes, the turning element is removed from the
DOM and the **previous/next** pair slides into the static slots.

---

## CSS — the full anatomy

```css
/* 1. The stage: gives every child a shared 3-D vanishing point. */
.book-stage {
  perspective: 1800px;
  perspective-origin: 50% 40%;
}

/* 2. The spread: enables nested 3-D for the turning page.
      Without preserve-3d here, the rotation collapses to a flat skew. */
.book-spread {
  position: relative;
  transform-style: preserve-3d;
  width: 720px;          /* 2 × page width */
  height: 480px;
}

/* 3. The static pages share a base style. */
.page {
  position: absolute;
  top: 0;
  width: 360px;
  height: 480px;
  background: #f4f0e6;                       /* parchment, matches SAC palette */
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.08),      /* page curl inner shadow */
    0 1px 0 rgba(0, 0, 0, 0.12);             /* edge of the page */
  overflow: hidden;                          /* fine: not on the rotating one */
}
.page-left  { left: 0;   border-right: 1px solid rgba(0,0,0,.18); }
.page-right { left: 360px; border-left:  1px solid rgba(0,0,0,.18); }

/* 4. The turning page. transform-origin = spine (left edge here). */
.page-turning {
  position: absolute;
  top: 0;
  left: 360px;                               /* sits on top of page-right */
  width: 360px;
  height: 480px;
  transform-origin: 0% 50%;                  /* hinge = spine */
  transform-style: preserve-3d;
  transition:
    transform 900ms cubic-bezier(.45, .05, .32, 1),  /* the flip */
    box-shadow 900ms ease-out;                       /* the lift */
  box-shadow:
    0 4px 8px  rgba(0,0,0,.18),
    0 18px 32px rgba(0,0,0,.22);              /* grows during the flip */
}

/* 5. Front face is the page being revealed. Back face is the same page
      mirrored, slightly desaturated — that's the "you can almost see
      through the paper" effect. */
.page-front,
.page-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.page-back {
  transform: rotateY(180deg);
  filter: brightness(.92) saturate(.85);     /* the desaturated back */
}

/* 6. The flip animation. Direction is "left page turn" (Western, ltr).
      -180deg swings the right page over to the left. */
.page-turning.is-turning {
  transform: rotateY(-180deg);
  box-shadow:
    0 22px 50px rgba(0,0,0,.32),
    0 60px 90px rgba(0,0,0,.18);             /* shadow expands */
}

/* 7. Shadow on the page below the turning page — drawn on the static
      right page itself, as an inset gradient that fades in. */
.page-right::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(0,0,0,.28) 0%,
    rgba(0,0,0,.10) 40%,
    rgba(0,0,0,0)   80%
  );
  opacity: 0;
  transition: opacity 900ms ease-out;
  pointer-events: none;
}
.book-spread.is-turning .page-right::after {
  opacity: 1;
}

/* 8. Ground shadow under the whole book — a single blurry ellipse that
      darkens slightly when the book is "open and lifted". */
.book-shadow {
  width: 720px;
  height: 30px;
  margin: 24px auto 0;
  background: radial-gradient(
    ellipse at center,
    rgba(0,0,0,.45) 0%,
    rgba(0,0,0,0)   70%
  );
  filter: blur(6px);
}
```

---

## Drawing the back of the turning page

The trick to the "back of the page" effect is the **`transform-style:
preserve-3d`** + **`backface-visibility: hidden`** combo.

Two child faces are stacked inside the page element:

* `.page-front` — the content the reader sees on the front of the
  lifted page. `backface-visibility: hidden` means when it rotates past
  90° it disappears (so we don't see the mirror image bleeding through
  the next page).
* `.page-back` — the content shown when the rotation is past 90°. It
  is the **same content as the page that was just turned**, but with a
  slight `filter: brightness(.92) saturate(.85)` to suggest the bleed
  of the page underneath through the paper. It starts pre-rotated
  `rotateY(180deg)` so it is already facing away from the viewer when
  the page is at rest.

This is the same technique used for **playing-card flips** and **3-D
cube faces** and is the most reliable way to get a believable
back-of-page without resorting to canvas.

---

## Double-page spread

The book-spread layout above is the spread: two static pages side by
side, with a **1 px shadowed gutter in the middle** (`border-right` /
`border-left` on the inner edges). For the "hard-page turn" variant
(i.e. a thick cover or chapter divider) we add:

* A `box-shadow: inset 4px 0 8px rgba(0,0,0,.22)` on the back face to
  imply paper thickness.
* A `transition-timing-function` that lingers briefly past 90° (an
  `ease-in` for the first half, `ease-out` for the second), so the
  page feels heavier than a regular page. The library `StPageFlip`
  exposes this as a per-page `data-density="hard"` attribute.

In Codrops' reference [BookBlock
plugin](https://tympanus.net/codrops/2012/09/03/bookblock-a-content-flip-plugin/),
the equivalent is the `shadows: true` option, which adds two overlays:
one on the static pages (`shadowSides`, default 0.2 opacity) and one
on the flipping page (`shadowFlip`, default 0.1 opacity). That gives a
realistic cast shadow without animating `box-shadow` directly.

---

## Hard-page turn

A "hard" page (cover, chapter divider, the first/last page) feels
heavier because:

* It rotates **more slowly** (longer `flippingTime` — the StPageFlip
  default is 1000 ms, hard pages can go to 1400 ms).
* It has a **visible thickness** on the back face (an inner
  `box-shadow` that mimics the paper stack).
* It does not flip from a free corner the way a regular page does —
  you have to grab the corner to lift it. The Codrops BookBlock plugin
  enforces this by disabling click-to-flip on `data-density="hard"`
  pages and requiring a click in the corner region.

For SAC's purposes the hard-page behavior is needed for at most two
places: the **front cover** and the **back cover**. Everything else
in a club chronicle would be soft pages.

---

## Mobile-friendly variants

On mobile, a touch drag is more natural than a mouse click. The
canonical "feel" parameters, taken from
[StPageFlip's configuration
options](https://github.com/Nodlik/StPageFlip):

| Option | Default | What it does |
| --- | --- | --- |
| `swipeDistance` | `30` (px) | Minimum horizontal/vertical drag before a swipe counts as a page turn. Below this, treat the gesture as a tap. |
| `mobileScrollSupport` | `true` | If `false`, calling `preventDefault` on `touchmove` while inside the book. If `true`, scrolling inside the page content still works — you have to start the swipe from the page edge. |
| `usePortrait` | `true` | Falls back to single-page mode on narrow viewports (< ~640 px). |
| `useMouseEvents` | `true` | On touch devices, the same pointer code path handles both `mousedown` and `touchstart`. |
| `disableFlipByClick` | `false` | On mobile, set this to `true` so a tap on the page does not flip — only a swipe (or the prev/next buttons) does. Otherwise accidental taps cause page changes. |

The CSS for the responsive layout is just `width`/`height` media
queries — the 3-D transform pipeline is identical.

```css
@media (max-width: 640px) {
  .book-spread { width: 360px; height: 600px; }   /* single page */
  .page-left   { display: none; }                  /* hide left page */
  .book-stage  { perspective: 1400px; }            /* less aggressive */
}
```

---

## Accessibility

This is the most important section in this document. A page-turn is a
**decorative large motion effect** and falls squarely under WCAG 2.3
(Make all functionality available from a keyboard) and WCAG 2.2's
expanded motion and pointer guidance.

### Reduced motion (WCAG 2.3.3)

[MDN's `prefers-reduced-motion` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
defines the media query and lists the OS-level toggles for honoring it
(Windows 11 *Settings > Accessibility > Visual Effects > Animation
Effects*, macOS *System Settings > Accessibility > Motion > Reduce
motion*, iOS *Settings > Accessibility > Motion*, Android *Settings
> Accessibility > Remove animations*).

```css
/* Default: full 3-D flip. */
.page-turning {
  transition: transform 900ms cubic-bezier(.45, .05, .32, 1);
}

/* Reduced motion: snap, no rotation. The page still changes, the URL
   still updates, focus still moves — but no 3-D arc. */
@media (prefers-reduced-motion: reduce) {
  .page-turning {
    transition: opacity 120ms linear;
    transform: none !important;
  }
  .page-turning.is-turning {
    opacity: 0;
  }
}
```

This is also recommended by [WebKit's blog post on responsive design
for motion](https://webkit.org/blog/7551/responsive-design-for-motion/),
and a CSS-Tricks intro to
[the reduced-motion media
query](https://css-tricks.com/introduction-reduced-motion-media-query/).

### Keyboard navigation (WCAG 2.1.1)

Every flip must be reachable by keyboard. The W3C
[WAI-ARIA Carousel
pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) — the
closest authoritative pattern for a book-style "slide" UI — prescribes:

* **A region/landmark wrapper** (`<section role="region"
  aria-roledescription="book" aria-label="SAC Chronicle">`).
* **Prev/Next buttons** as the primary keyboard controls. `Tab` moves
  focus through them in DOM order.
* **A live region** for the current page position (`<span
  aria-live="polite">Page 5 of 24</span>`), so screen readers
  announce the change after each flip.
* **Optional slide picker controls** as a `tablist` of tabs for
  jumping to a specific page (good for a 24-page annual report,
  overkill for a 4-page club chronicle).

### Pointer alternatives (WCAG 2.5.7, new in 2.2)

If the flip is **drag-driven**, we must also provide a **single-tap
alternative** — the W3C
["What's New in WCAG 2.2"](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
explains 2.5.7 (Dragging Movements) as: *"For any action that involves
dragging, provide a simple pointer alternative."* Our Prev/Next
buttons are exactly that alternative.

### Color contrast (WCAG 1.4.3)

The [W3C's Colors with Good Contrast
guidance](https://www.w3.org/WAI/perspective-videos/contrast/) is
unambiguous: any text or icon on a paper-coloured surface must meet a
**4.5:1 contrast ratio** for normal text and **3:1** for large text.
For the SAC palette (`#181410` ink on `#f4f0e6` parchment) the
contrast is ~13.5:1 — comfortably AA. But: the **desaturated back of
the turning page** (filter `brightness(.92) saturate(.85)`) lowers
contrast by ~10–15%. Either (a) ensure the content on the back is
decorative only, or (b) bump the back-face filter back up for any
text-bearing page.

### Focus indicator (WCAG 2.4.13, new in 2.2)

The flip itself must not steal keyboard focus mid-animation. Use
`aria-hidden="true"` on the `.page-turning` element and update
`tabindex` on the visible pages only after the flip completes.

---

## Performance

Two performance rules apply, both well-established:

1. **Animate `transform` and `opacity` only.** A
   [CSS-Tricks write-up on the FLIP
   technique](https://css-tricks.com/animating-layouts-with-the-flip-technique/)
   explains why: any property that triggers layout (`height`, `width`,
   `top`, `left`, `margin`) forces a re-layout and can cause dropped
   frames at 60 fps. Book-flip animations only ever animate
   `transform` (the rotation) and `box-shadow` (which is GPU-composited
   on most browsers — verify in DevTools).
2. **`will-change: transform`** on the turning page, **only while it
   is turning**. Remove it after the animation completes, otherwise
   the browser keeps the element on a permanent compositor layer and
   memory pressure rises. The pattern is:
   ```js
   page.addEventListener('transitionstart', () => page.style.willChange = 'transform');
   page.addEventListener('transitionend',   () => page.style.willChange = '');
   ```

The Codrops BookBlock reference impl uses jQuery but the technique is
identical — Codrops' `speed` option is just the CSS `transition`
duration. The StPageFlip library uses `requestAnimationFrame` to drive
the rotation directly, which is the alternative pattern for when you
need **drag-follows-finger** behavior (the page follows the user's
finger during a drag, snaps to fully-turned on release).

---

## Real-world references (what shipped products do)

| Product | Library / technique | Why we look at it |
| --- | --- | --- |
| **iBooks (iOS)** | Core Animation `pageCurl` transition | The "gold standard" — a true cylinder curl with two-sided shading. Not achievable in pure CSS, but the visual reference for our back-face desaturation. |
| **Google Play Books** | CSS `transform: rotateY` + canvas shadow | Hybrid approach — DOM for the page content, canvas for the soft shadow gradient on the page below. Confirms that CSS alone is viable. |
| **Kindle in browser** (cloud reader) | Two absolutely-positioned divs + JS drag | A reference for the **drag-to-flip-then-release-to-snap** pattern. StPageFlip is the open-source descendant. |
| **Flipboard** | CSS `transform: rotateY` with `transform-style: preserve-3d` | A reference for the **"page lifts and folds"** effect on iOS / Safari — works because Apple still ships 3-D transforms in WKWebView. |
| **Codrops BookBlock (2012)** | jQuery + jQuery++ + 2 overlays for shadow | Reference implementation. The `shadowSides` / `shadowFlip` / `shadows: true` options are the cleanest abstraction we have for the cast shadow. |
| **Nodlik StPageFlip** (current, MIT) | Pure JS, no deps. ~10 kB minified, supports image & HTML mode. | The closest **production-quality** library. Good API to copy patterns from (`flip`, `flipNext`, `flipPrev`, events `flip`, `changeOrientation`). |

We are **not** recommending we ship with StPageFlip — but the API is a
useful design template for our own wrapper.

---

## Code example: single page curl (no JavaScript required)

The simplest possible page-turn, usable as a **static decoration** on
a section divider, with no JS at all:

```html
<article class="page-curl">
  <h2>Chapter One</h2>
  <p>…content…</p>
</article>
```

```css
.page-curl {
  position: relative;
  width: 320px;
  padding: 32px;
  background: #f4f0e6;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,.08),
    0 8px 24px rgba(0,0,0,.18);

  /* The corner curl. */
  background-image: linear-gradient(
    135deg,
    transparent 50%,
    rgba(0,0,0,.06) 50%,
    rgba(0,0,0,.18) 92%,
    rgba(0,0,0,.32) 100%
  );
  background-size: 100% 100%;
  background-position: bottom right;
  background-repeat: no-repeat;
}
```

This is a "fake" curl (no actual 3-D) but it's < 20 lines and looks
good on hover.

---

## Code example: minimal interactive flip (CSS + 30 lines of JS)

```html
<section class="book" aria-label="Sample flip book">
  <div class="book-stage">
    <article class="page page-current" id="page-current">
      <h2>Page 1</h2>
      <p>The first page of our chronicle.</p>
    </article>
  </div>

  <button type="button" class="book-prev" aria-label="Previous page">←</button>
  <button type="button" class="book-next" aria-label="Next page">→</button>
</section>
```

```css
.book {
  --page-bg: #f4f0e6;
  position: relative;
  width: min(640px, 90vw);
  margin: 0 auto;
}
.book-stage {
  perspective: 1800px;
  height: 400px;
}
.page {
  position: absolute;
  inset: 0;
  background: var(--page-bg);
  padding: 32px;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,.08),
    0 8px 24px rgba(0,0,0,.22);
  transform-origin: left center;
  transition: transform 800ms cubic-bezier(.45,.05,.32,1),
              box-shadow 800ms ease-out;
  backface-visibility: hidden;
}
.page.is-flipping {
  transform: rotateY(-180deg);
  box-shadow:
    0 20px 50px rgba(0,0,0,.32),
    0 60px 90px rgba(0,0,0,.18);
}
@media (prefers-reduced-motion: reduce) {
  .page { transition: opacity 120ms linear; transform: none !important; }
  .page.is-flipping { opacity: 0; }
}
.book-prev, .book-next {
  margin-top: 16px;
  font-size: 1.5em;
}
```

```js
// 30-line wrapper. Vanilla, no deps.
const pages = ['Page 1 content…', 'Page 2 content…', 'Page 3 content…', 'Page 4 content…'];
let index = 0;
const stage = document.querySelector('.book-stage');
const current = document.getElementById('page-current');

function render(html) {
  current.innerHTML = html;
  current.classList.remove('is-flipping');
}

function flip(direction) {
  const next = (index + direction + pages.length) % pages.length;
  current.classList.add('is-flipping');
  current.addEventListener('transitionend', function once() {
    current.removeEventListener('transitionend', once);
    index = next;
    render(pages[index]);
  }, { once: true });
}

document.querySelector('.book-prev').addEventListener('click', () => flip(-1));
document.querySelector('.book-next').addEventListener('click', () => flip(+1));

// Keyboard navigation.
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  flip(-1);
  if (e.key === 'ArrowRight') flip(+1);
});

render(pages[index]);
```

This is the **recommended starting point for SAC**. When (and only
when) we need drag-to-flip or hard-page density, we'd graduate to the
StPageFlip library.

---

## References

1. **MDN** — [`perspective`](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)
2. **MDN** — [`transform-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)
3. **MDN** — [`transform-origin`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin) (via CSS-Tricks almanac)
4. **MDN** — [`backface-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility)
5. **MDN** — [`@media/prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
6. **MDN** — [Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations)
7. **CSS-Tricks** — [`perspective` almanac](https://css-tricks.com/almanac/properties/p/perspective/)
8. **CSS-Tricks** — [`transform-origin` almanac](https://css-tricks.com/almanac/properties/t/transform-origin/)
9. **CSS-Tricks** — [Animating layouts with the FLIP technique](https://css-tricks.com/animating-layouts-with-the-flip-technique/)
10. **Codrops** — [BookBlock: A Content Flip Plugin (2012)](https://tympanus.net/codrops/2012/09/03/bookblock-a-content-flip-plugin/)
11. **GitHub: Nodlik/StPageFlip** — [Modern, dep-free page-flip library](https://github.com/Nodlik/StPageFlip)
12. **GitHub: blasten/turn.js** — [jQuery-based page-flip library (2013)](https://github.com/blasten/turn.js)
13. **W3C WAI** — [Carousel (Slide Show or Image Rotator) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
14. **W3C WAI** — [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
15. **W3C WAI** — [Colors with Good Contrast](https://www.w3.org/WAI/perspective-videos/contrast/)
