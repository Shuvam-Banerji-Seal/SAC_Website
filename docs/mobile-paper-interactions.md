# Mobile Gesture-Based Paper Interactions

A practical reference for building tactile, page-flip, and paper-like interactions on mobile web using pointer/touch events, Hammer.js, and CSS 3D transforms.

---

## Overview

"Paper interactions" on mobile web try to mimic the feel of a physical sheet: tilting under a finger, flipping front-to-back, snapping to alignment, peeling from an edge, and being flicked with momentum. Achieving this on the web means combining three layers:

1. **Input layer** — capturing finger movement via Pointer Events, Touch Events, or a gesture library like Hammer.js.
2. **Math layer** — converting raw deltas into angles, velocities, thresholds, and snap positions.
3. **Render layer** — applying CSS 3D transforms (`rotateY`, `rotateX`, `translateZ`) with proper `perspective`, `transform-style: preserve-3d`, and `backface-visibility` on the right elements.

This document covers all three layers, plus the iOS Safari quirks and accessibility concerns that determine whether the experience actually ships in production.

---

## Pointer Events vs Touch Events

Both APIs surface finger input, but they differ in abstraction level and ergonomics.

### Touch Events (WebKit-origin, still ubiquitous)

```js
element.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
});

element.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  const dx = t.clientX - startX;
  // ... use dx
});

element.addEventListener('touchend', (e) => {
  // e.changedTouches holds the finger that lifted
});
```

Touch Events expose a `TouchList` per event and require you to call `e.preventDefault()` to stop scroll. They have no concept of "this is a mouse emulation" — they only fire for actual touch.

### Pointer Events (W3C-recommended, unified)

```js
element.addEventListener('pointerdown', (e) => {
  startX = e.clientX;
  startY = e.clientY;
  element.setPointerCapture(e.pointerId);
});

element.addEventListener('pointermove', (e) => {
  const dx = e.clientX - startX;
  // ... use dx
});

element.addEventListener('pointerup', (e) => {
  // pointerId is no longer active
});
```

Pointer Events unify mouse, touch, and pen under one API. `pointerType` tells you which it is (`'touch'`, `'pen'`, `'mouse'`). `setPointerCapture` is a huge win: it routes subsequent move/up events to your element even if the finger leaves its bounding box.

### Which to use

| Concern | Pointer Events | Touch Events |
|---|---|---|
| Browser support (2024+) | Excellent | Excellent |
| Mouse + touch in one path | Yes | No (need mouse handlers too) |
| `setPointerCapture` | Yes | No (manual scroll math) |
| Velocity / multitouch helpers | No — roll your own | No — roll your own |
| iOS Safari quirks | Fewer (still rubber-band) | More (passive listener defaults) |

**Recommendation:** start with Pointer Events. Drop to Touch Events only when you need `TouchList` data (multi-finger geometry) that Pointer Events doesn't surface, or when supporting very old WebView builds.

If you do use Touch Events, remember to register `touchmove` as **non-passive** to be able to call `preventDefault()`:

```js
element.addEventListener('touchmove', handler, { passive: false });
```

---

## Hammer.js

Hammer.js is a ~7KB gesture-recognition library that builds recognizers (Pan, Pinch, Rotate, Swipe, Tap, Press) on top of Pointer/Touch Events. It saves you from writing threshold, velocity, and direction-detection code by hand.

### Loading

```html
<script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js"></script>
```

- **License:** MIT
- **Size:** ~7 KB minified
- **Version:** 2.0.8 (the canonical stable release; newer 2.x versions are minor)

### Basic usage

```js
const paper = document.getElementById('paper');
const hammertime = new Hammer(paper);

// Don't let Hammer swallow vertical pans as scrolls:
hammertime.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });

hammertime.on('pan', (ev) => {
  // ev.deltaX, ev.deltaY — total displacement since panstart
  // ev.velocityX, ev.velocityY — units/second
  const angle = (ev.deltaX / paper.offsetWidth) * 90;
  paper.style.transform = `perspective(1200px) rotateY(${angle}deg)`;
});

hammertime.on('panend', (ev) => {
  const angle = (ev.deltaX / paper.offsetWidth) * 90;
  if (Math.abs(angle) > 45 || ev.velocityX > 0.5) {
    flipToNext();
  } else {
    snapBack();
  }
});
```

### Recognizers

```js
const mc = new Hammer.Manager(element);
mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 8 }));
mc.add(new Hammer.Swipe({ velocity: 0.3 }));
mc.add(new Hammer.Pinch());
mc.add(new Hammer.Tap({ event: 'singletap', taps: 1 }));
mc.add(new Hammer.Press({ time: 500 }));

// Require pan + pinch to coexist, not compete:
mc.get('pinch').recognizeWith(mc.get('pan'));
```

### When NOT to use Hammer

- If you only need a single gesture and one threshold, the library overhead isn't worth it.
- If you need fine-grained control over multitouch (e.g. per-finger paths for drawing apps), the raw `TouchList` is more flexible.
- If your stack already includes a framework-specific gesture handler (React Use Gesture, Framer Motion drag), don't double up.

---

## The Math

The core mapping for paper tilting is **touch position → rotation angle**. The simplest stable form is:

```
rotation = (touchX - elementCenter) / elementWidth * maxAngle
```

Where:
- `touchX` is the current finger X (in client coordinates, or relative to the element's left edge).
- `elementCenter` is the X coordinate of the element's horizontal midpoint.
- `elementWidth` is the element's rendered width in pixels.
- `maxAngle` is the visual ceiling, typically `20°` to `45°` for a subtle tilt.

### Worked example

For a 320px-wide card, center at 160, with `maxAngle = 30°`:

```js
function tilt(touchX) {
  const rect = card.getBoundingClientRect();
  const center = rect.left + rect.width / 2;
  const offset = (touchX - center) / rect.width;  // -0.5 .. +0.5
  return offset * 60;  // -30deg .. +30deg
}
```

### Translation-based tilt (for "pickup at finger")

Sometimes you want the card to feel glued to the finger, not rotated about its own center. Then:

```
rotation = touchDeltaX / referenceWidth * maxAngle
translationX = touchDeltaX * 0.3  // partial follow
```

The 0.3 factor means the card moves 30% of the finger's actual travel — feels physical without losing the page edge.

### Velocity

Track position over time and average the last few frames:

```js
let lastX = 0, lastT = 0;
function onMove(x, t) {
  const dt = t - lastT;
  if (dt > 0) velocityX = (x - lastX) / dt;  // px/ms
  lastX = x; lastT = t;
}
```

Or with Hammer, use `ev.velocityX` directly (it's in px/ms, multiply by 1000 for px/s).

### Threshold

A "dead zone" prevents jitter on the first few pixels:

```js
const THRESHOLD = 6;  // px
if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
```

Hammer's `pan` threshold defaults to `1`, but `5–10` is the practical sweet spot for paper interactions.

### Snap points

After release, the page must settle at one of several discrete positions (open, half-flip, closed). The simplest snap math:

```js
function snapAngle(currentAngle) {
  const stops = [-180, -90, 0, 90, 180];
  return stops.reduce((best, s) =>
    Math.abs(s - currentAngle) < Math.abs(best - currentAngle) ? s : best
  );
}
```

For springy snaps, animate the angle toward the target with a critically-damped spring:

```js
function springStep(angle, target, vel, dt, k = 180, d = 22) {
  const a = -k * (angle - target) - d * vel;
  const newVel = vel + a * dt;
  const newAngle = angle + newVel * dt;
  return [newAngle, newVel];
}
```

---

## CSS Setup

A paper-flip element needs four CSS ingredients: a `perspective` ancestor, `transform-style: preserve-3d` on the rotating layer, `transform-origin` on the hinge, and the `rotateY` itself.

```css
.stage {
  perspective: 1200px;
  perspective-origin: 50% 50%;
  width: 320px;
  height: 480px;
}

.paper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face--back {
  transform: rotateY(180deg);
}
```

### Why `perspective` is on the parent

`perspective` defines how aggressive the 3D foreshortening is. Lower values (e.g. `600px`) make the card look like it's tilting in your face; higher values (e.g. `2000px`) make it look flatter. `1200px` is a good default for a single card on a phone screen.

### Why `transform-style: preserve-3d` is on the paper

Without it, the `.face--back` child gets flattened back to the plane of `.paper` before being rotated 180°, so you only see the front. `preserve-3d` tells the browser to compose the children's 3D transforms in the parent's 3D space.

### Hardware acceleration hint

`will-change: transform` is fine for one or two cards. For a stack of 20, switch to a real WebGL/Canvas pipeline — DOM compositing won't keep up.

---

## Back Face

The "back face" of a paper is the side revealed when the rotation passes 90°. The trick is two children stacked in the same box, one rotated 180° on Y, both with `backface-visibility: hidden`.

```html
<div class="paper">
  <div class="face face--front">…</div>
  <div class="face face--back">…</div>
</div>
```

```css
.paper {
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;  /* Safari */
}

.face--back {
  transform: rotateY(180deg);
}
```

When the paper rotates 0°–90°, you see the front (the back is facing away from the camera, culled). At 90°–180°, the back is now facing the camera and the front is culled. At exactly 90°, both are edge-on and disappear — this is correct.

### Vendor prefixes

`backface-visibility` still needs `-webkit-` in older Safari. Always ship both:

```css
.face {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

### Common pitfall

If a child of `.face` has its own `transform` that breaks `preserve-3d` (e.g. a `translateZ` on a button), the face may render as a 2D plane regardless. Be deliberate about which children carry 3D.

---

## Velocity and Snap

After a pan ends, you need to decide: which stop does the paper land on, and with what momentum?

### Decision rule

```js
function decide(panAngle, velocityX) {
  const FLIP_THRESHOLD = 60;       // deg
  const FLICK_VELOCITY = 0.6;      // px/ms (Hammer units)

  if (Math.abs(panAngle) > FLIP_THRESHOLD || Math.abs(velocityX) > FLICK_VELOCITY) {
    return panAngle > 0 ? 180 : -180;  // complete the flip
  }
  return 0;  // snap back
}
```

### Spring animation

A clean spring is more pleasant than `transition: transform 0.4s`. Example using rAF:

```js
function animateSpring(fromAngle, toAngle, duration = 600) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    // Critically damped approach; curve approximated by easeOutBack
    const eased = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
    const angle = fromAngle + (toAngle - fromAngle) * eased;
    paper.style.transform = `perspective(1200px) rotateY(${angle}deg)`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

For higher fidelity, use a real spring (stiffness + damping + mass) — see the "Spring math" section in any animation framework's docs.

---

## Pull-to-Refresh as Page-Flip

The classic pull-to-refresh pattern (drag down from the top, release, fetch) can be reframed as a partial page flip — the user grabs the top edge, the page tilts toward them, and on release the page either snaps back or completes a flip-to-reveal-new-content.

```js
let startY = 0;
let pulling = false;

paper.addEventListener('pointerdown', (e) => {
  if (e.clientY < 60) {  // only at top edge
    startY = e.clientY;
    pulling = true;
  }
});

window.addEventListener('pointermove', (e) => {
  if (!pulling) return;
  const dy = e.clientY - startY;
  if (dy <= 0) return;
  // Map 0..200px of pull to 0..40deg of X rotation
  const angle = Math.min(40, (dy / 200) * 40);
  paper.style.transform = `perspective(1200px) rotateX(${angle}deg)`;
  paper.style.transformOrigin = '50% 0%';
});

window.addEventListener('pointerup', () => {
  if (!pulling) return;
  pulling = false;
  const dy = event.clientY - startY;
  if (dy > 120) {
    fetchNewContent().then(() => animateSpring(40, 180, 500));
  } else {
    animateSpring(currentAngle, 0, 300);
  }
});
```

### Scaffolding for the fetch

```js
async function fetchNewContent() {
  const res = await fetch('/api/feed?since=' + lastTimestamp);
  const data = await res.json();
  renderNewContent(data);
  lastTimestamp = data.timestamp;
}
```

### Visual feedback

Show a spinner arc that fills as the user pulls:

```css
.spinner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}
```

```js
spinner.style.opacity = Math.min(1, dy / 120);
```

---

## Edge-Swipe to Peek

Edge-swipe is the "back" gesture in iOS Safari: swipe from the left edge of the screen to peek at the previous page. Reproducing it in-app:

```js
const EDGE_WIDTH = 24;   // px from screen edge
const PEEK_ANGLE = 12;   // deg

window.addEventListener('pointerdown', (e) => {
  if (e.clientX < EDGE_WIDTH) {
    this.edgeSwiping = true;
    this.edgeStartX = e.clientX;
  }
});

window.addEventListener('pointermove', (e) => {
  if (!this.edgeSwiping) return;
  const dx = e.clientX - this.edgeStartX;
  if (dx <= 0) return;
  const angle = Math.min(PEEK_ANGLE, (dx / 100) * PEEK_ANGLE);
  paper.style.transform = `perspective(1200px) rotateY(${-angle}deg)`;
});

window.addEventListener('pointerup', () => {
  if (!this.edgeSwiping) return;
  this.edgeSwiping = false;
  animateSpring(currentAngle, 0, 250);
});
```

### Be careful with native edge gestures

iOS reserves ~20px on each side for system back-swipe and pull-to-refresh. If your app's edge-swipe lives in that zone, you must call `preventDefault()` on the `touchmove` (or use `touch-action: none`) or iOS will steal the event for system navigation.

---

## iOS Safari Gotchas

Mobile Safari is where most of the production bugs live. The issues fall into a few categories.

### Rubber-band scroll

When the page scrolls past its top/bottom edge, iOS animates a bounce. Inside a paper-flip region, this is unwanted. Kill it with `overscroll-behavior` plus blocking the touch.

```css
.paper-region {
  overscroll-behavior: none;
  touch-action: none;
}
```

```js
paper.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
```

### Scroll chaining

A drag that crosses a boundary (e.g. a swiper inside a scrollable list) shouldn't cause the outer list to scroll. Use `overscroll-behavior: contain` on the inner element.

```css
.swiper {
  overscroll-behavior: contain;
}
```

### `touch-action`

`touch-action: none` tells the browser you will handle all gestures yourself — no built-in panning, no pinch-zoom. This is the single most important CSS property for paper-flip regions.

```css
.paper {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
```

If you need vertical scrolling inside the paper but want to handle horizontal pans yourself:

```css
.paper {
  touch-action: pan-y;  /* only vertical pan is the browser's; rest is yours */
}
```

### Viewport units

Safari's URL bar used to make `100vh` a moving target. In 2024+, use the **dynamic viewport units** (`dvh`, `svh`, `lvh`):

```css
.full-height {
  height: 100vh;   /* fallback */
  height: 100dvh;  /* shrinks/grows as the URL bar shows/hides */
}
```

- `svh` — small viewport (URL bar visible)
- `lvh` — large viewport (URL bar hidden)
- `dvh` — dynamic (the current actual value)

For a paper that should fill the visible area at all times, `dvh` is the right answer.

### Other mobile Safari specifics

- **`-webkit-overflow-scrolling: touch`** is no longer needed; ignore it.
- **Double-tap to zoom** is suppressed by `touch-action: manipulation` or `none`.
- **Tap highlight** is suppressed by `-webkit-tap-highlight-color: transparent`.
- **iOS 13+ safe-area insets** still apply: respect `env(safe-area-inset-left/right/top/bottom)`.
- **Pinch-zoom conflicts:** if you have multi-finger gestures inside a paper region, make sure the viewport meta tag is `user-scalable=no` (or scope pinch-zoom to a `maximum-scale=1`).
- **Keyboard events on iPadOS** sometimes need explicit `keydown` for arrow keys; touch alone isn't enough for accessibility.

---

## Accessibility

A tactile interaction that breaks for keyboard or screen-reader users fails a lot of audits. Mitigations:

### Touch targets

WCAG 2.5.5 / Apple HIG both specify a minimum touch target of **44×44 CSS pixels**.

```css
.flip-button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}
```

This applies to anything the user can tap to trigger the same action as a gesture. A swipe-to-flip must have a tap-to-flip button of at least 44×44px, even if hidden in a menu.

### Gestures vs keyboard

Every gesture must have a non-gesture equivalent.

| Gesture | Keyboard equivalent |
|---|---|
| Swipe left → next page | `→` or `PageDown` |
| Swipe right → previous page | `←` or `PageUp` |
| Pull to refresh | `R` key, or a refresh button |
| Long-press for menu | `Enter` on the focused card |

```js
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') flipToNext();
  if (e.key === 'ArrowLeft') flipToPrev();
  if (e.key.toLowerCase() === 'r') refresh();
});
```

### `prefers-reduced-motion`

Users with vestibular disorders can disable motion. When they opt out, **don't animate the flip** — just snap to the new content state.

```css
@media (prefers-reduced-motion: reduce) {
  .paper {
    transition: none !important;
  }
}
```

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function flipTo(target) {
  if (reducedMotion) {
    paper.style.transition = 'none';
    paper.style.transform = `rotateY(${target}deg)`;
    // force reflow then re-enable transitions for other users
    paper.offsetWidth;
    paper.style.transition = '';
  } else {
    paper.style.transform = `rotateY(${target}deg)`;
  }
}
```

### Screen readers

- Mark the paper region as `role="region"` with an `aria-label` like "Article page 1 of 5".
- For flip buttons, use `aria-label="Next page"` / `"Previous page"`.
- If the paper's content changes after a flip, use `aria-live="polite"` on a status region to announce it.

```html
<div class="paper" role="region" aria-label="Article">
  <button class="flip flip--prev" aria-label="Previous page">‹</button>
  <button class="flip flip--next" aria-label="Next page">›</button>
  <div aria-live="polite" class="sr-only" id="page-status"></div>
</div>
```

```js
document.getElementById('page-status').textContent = `Page ${current} of ${total}`;
```

### Focus management

After a programmatic flip, move focus to the new page's heading so keyboard users continue from the right spot:

```js
function flipToNext() {
  currentPage++;
  render();
  document.querySelector(`[data-page="${currentPage}"] h2`)?.focus();
}
```

---

## Code Examples

### Example 1: Hammer.js + CSS `rotateY` driven by touch delta

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Paper flip — Hammer.js</title>
<style>
  body { margin: 0; display: grid; place-items: center; min-height: 100dvh; background: #f4f4f4; }
  .stage { perspective: 1200px; width: 320px; height: 480px; }
  .paper {
    position: relative;
    width: 100%; height: 100%;
    transform-style: preserve-3d;
    transform-origin: 50% 50%;
    transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
    touch-action: none;
    will-change: transform;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
    background: white;
    border-radius: 6px;
  }
  .face {
    position: absolute; inset: 0;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    display: grid; place-items: center;
    font: 600 24px/1.2 system-ui;
  }
  .face--back {
    background: #1f2937; color: white;
    transform: rotateY(180deg);
  }
  button {
    position: fixed; top: 16px; padding: 12px 16px;
    font: 600 16px system-ui; min-width: 44px; min-height: 44px;
  }
</style>
</head>
<body>
  <button id="prev" aria-label="Previous page">‹ Prev</button>
  <button id="next" aria-label="Next page">Next ›</button>

  <div class="stage">
    <div class="paper" id="paper">
      <div class="face face--front">Front</div>
      <div class="face face--back">Back</div>
    </div>
  </div>

<script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js"></script>
<script>
  const paper = document.getElementById('paper');
  const FLIP_THRESHOLD = 60;   // deg
  const FLICK_VEL = 0.6;       // px/ms
  const MAX_ANGLE = 180;       // deg at full drag
  let currentAngle = 0;
  let dragging = false;

  const mc = new Hammer.Manager(paper, { touchAction: 'none' });
  mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 8 }));

  mc.on('panstart', () => { dragging = true; });
  mc.on('pan', (ev) => {
    const width = paper.offsetWidth;
    const angle = (ev.deltaX / width) * MAX_ANGLE;
    paper.style.transform = `perspective(1200px) rotateY(${angle}deg)`;
  });
  mc.on('panend', (ev) => {
    dragging = false;
    const width = paper.offsetWidth;
    const angle = (ev.deltaX / width) * MAX_ANGLE;
    const go = Math.abs(angle) > FLIP_THRESHOLD || Math.abs(ev.velocityX) > FLICK_VEL;
    currentAngle = go ? (angle > 0 ? currentAngle + 180 : currentAngle - 180) : 0;
    paper.style.transform = `perspective(1200px) rotateY(${currentAngle}deg)`;
  });

  document.getElementById('next').addEventListener('click', () => {
    currentAngle += 180;
    paper.style.transform = `perspective(1200px) rotateY(${currentAngle}deg)`;
  });
  document.getElementById('prev').addEventListener('click', () => {
    currentAngle -= 180;
    paper.style.transform = `perspective(1200px) rotateY(${currentAngle}deg)`;
  });
</script>
</body>
</html>
```

### Example 2: Vanilla Pointer Events version

```js
class PaperFlip {
  constructor(el) {
    this.el = el;
    this.angle = 0;
    this.startX = 0;
    this.startAngle = 0;
    this.active = false;
    this.id = null;
    this.t = 0;

    el.addEventListener('pointerdown', this.onDown.bind(this));
    el.addEventListener('pointermove', this.onMove.bind(this));
    el.addEventListener('pointerup', this.onUp.bind(this));
    el.addEventListener('pointercancel', this.onUp.bind(this));
  }

  onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.active = true;
    this.id = e.pointerId;
    this.startX = e.clientX;
    this.startAngle = this.angle;
    this.t = performance.now();
    this.el.setPointerCapture(e.pointerId);
    this.el.style.transition = 'none';
  }

  onMove(e) {
    if (!this.active || e.pointerId !== this.id) return;
    const dx = e.clientX - this.startX;
    const width = this.el.offsetWidth;
    const next = this.startAngle + (dx / width) * 180;
    this.angle = Math.max(-180, Math.min(180, next));
    this.el.style.transform = `perspective(1200px) rotateY(${this.angle}deg)`;
  }

  onUp(e) {
    if (!this.active || e.pointerId !== this.id) return;
    this.active = false;
    this.el.releasePointerCapture(e.pointerId);

    const dt = performance.now() - this.t || 1;
    const velocity = (this.angle - this.startAngle) / dt;  // deg/ms
    const shouldFlip = Math.abs(this.angle - this.startAngle) > 60 || Math.abs(velocity) > 0.6;
    const target = shouldFlip
      ? (this.angle > this.startAngle ? 180 : -180)
      : 0;
    this.snapTo(target);
  }

  snapTo(target) {
    this.el.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)';
    this.angle = target;
    this.el.style.transform = `perspective(1200px) rotateY(${this.angle}deg)`;
  }
}

new PaperFlip(document.getElementById('paper'));
```

### Example 3: Pull-to-refresh with paper-flip animation

```html
<style>
  .container { height: 100dvh; overflow: hidden; touch-action: none; }
  .paper {
    height: 100%; width: 100%;
    transform-style: preserve-3d;
    transform-origin: 50% 0%;
    background: white;
    will-change: transform;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  .indicator {
    position: absolute; top: 14px; left: 50%;
    width: 28px; height: 28px;
    transform: translateX(-50%);
    border: 3px solid #ddd;
    border-top-color: #111;
    border-radius: 50%;
    opacity: 0;
  }
  .indicator.is-active { opacity: 1; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: translateX(-50%) rotate(360deg); } }
  .status {
    position: absolute; top: 56px; left: 50%;
    transform: translateX(-50%);
    font: 600 14px system-ui; opacity: 0;
  }
  .status.is-active { opacity: 0.7; }
  @media (prefers-reduced-motion: reduce) {
    .paper { transition: none !important; }
  }
</style>

<div class="container" id="container">
  <div class="paper" id="paper">
    <div class="indicator" id="indicator"></div>
    <div class="status" id="status" role="status" aria-live="polite"></div>
    <p>Pull the top of this page down to refresh.</p>
  </div>
</div>

<script>
  const container = document.getElementById('container');
  const paper = document.getElementById('paper');
  const indicator = document.getElementById('indicator');
  const status = document.getElementById('status');
  const MAX_PULL = 180;     // px
  const MAX_ANGLE = 70;     // deg
  const REFRESH_THRESHOLD = 110; // px

  let pulling = false;
  let startY = 0;
  let currentAngle = 0;

  container.addEventListener('pointerdown', (e) => {
    if (e.clientY > 60) return;  // only at the top edge
    pulling = true;
    startY = e.clientY;
    paper.style.transition = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    if (!pulling) return;
    const dy = e.clientY - startY;
    if (dy <= 0) { currentAngle = 0; }
    else {
      // Rubber-band feel: dimishing returns past 50% of MAX_PULL
      const adjusted = dy < MAX_PULL * 0.5
        ? dy
        : MAX_PULL * 0.5 + (dy - MAX_PULL * 0.5) * 0.4;
      currentAngle = Math.min(MAX_ANGLE, (adjusted / MAX_PULL) * MAX_ANGLE);
    }
    paper.style.transform = `perspective(1200px) rotateX(${currentAngle}deg)`;
    indicator.classList.toggle('is-active', dy > 20);
    indicator.style.opacity = Math.min(1, e.clientY - startY / 120);
    status.classList.toggle('is-active', dy > 20);
  });

  window.addEventListener('pointerup', async () => {
    if (!pulling) return;
    pulling = false;
    const dy = (event.clientY ?? startY) - startY;

    if (dy > REFRESH_THRESHOLD) {
      status.textContent = 'Refreshing…';
      try {
        await fetch('/api/refresh', { method: 'POST' });
        status.textContent = 'Updated';
      } catch {
        status.textContent = 'Failed';
      }
      // Finish the flip-to-new-content
      paper.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      currentAngle = 180;
      paper.style.transform = `perspective(1200px) rotateX(${currentAngle}deg)`;
      setTimeout(() => {
        paper.style.transition = 'none';
        currentAngle = 0;
        paper.style.transform = `perspective(1200px) rotateX(${currentAngle}deg)`;
        status.textContent = '';
        indicator.classList.remove('is-active');
      }, 600);
    } else {
      paper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      currentAngle = 0;
      paper.style.transform = `perspective(1200px) rotateX(${currentAngle}deg)`;
      indicator.classList.remove('is-active');
      status.classList.remove('is-active');
    }
  });
</script>
```

### Example 4: Edge-swipe peek

```js
function setupEdgeSwipe(paper, { edgePx = 24, peekDeg = 12 } = {}) {
  let active = false;
  let startX = 0;
  let baseAngle = 0;

  paper.addEventListener('pointerdown', (e) => {
    if (e.clientX > edgePx) return;
    active = true;
    startX = e.clientX;
    baseAngle = 0;  // measure from rest
    paper.style.transition = 'none';
  });

  paper.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    if (dx < 0) return;
    const angle = Math.min(peekDeg, (dx / 120) * peekDeg);
    paper.style.transform = `perspective(1200px) rotateY(${-angle}deg)`;
  });

  const release = (e) => {
    if (!active) return;
    active = false;
    paper.style.transition = 'transform 0.25s ease-out';
    paper.style.transform = `perspective(1200px) rotateY(0deg)`;
  };

  paper.addEventListener('pointerup', release);
  paper.addEventListener('pointercancel', release);
}
```

---

## Production Checklist

Before shipping, confirm:

- [ ] `touch-action: none` on every interactive paper region
- [ ] `overscroll-behavior: contain` (or `none`) where appropriate
- [ ] `100dvh` instead of `100vh` for full-screen regions
- [ ] `backface-visibility: hidden` on every face, **with** `-webkit-` prefix
- [ ] Keyboard equivalents for every gesture
- [ ] `prefers-reduced-motion` honored — no flip animation when reduced
- [ ] 44×44px minimum touch targets for tap-to-flip buttons
- [ ] `aria-live` announcement of page changes
- [ ] Tested in iOS Safari (rubber-band, viewport resize) and Android Chrome (back-button, system gestures)
- [ ] Tested with a screen reader (VoiceOver, TalkBack) — focus lands on the right heading after a flip
- [ ] Tested with a single CPU throttle (e.g. 4× slowdown) — animations stay smooth

---

## Further Reading

- MDN — Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN — Touch Events: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
- W3C — Pointer Events Level 3: https://www.w3.org/TR/pointerevents3/
- CSS — `transform-style` and `backface-visibility`: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style
- WCAG 2.5.5 — Target Size: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Viewport units (`dvh`, `svh`, `lvh`): https://www.w3.org/TR/css-values-4/#viewport-relative-units
