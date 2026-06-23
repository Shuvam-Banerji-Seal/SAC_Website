# JavaScript Page-Flip Libraries

A practical comparison of client-side libraries for creating realistic book / magazine / newspaper page-turn effects in the browser. This document focuses on static-page compatibility (i.e. dropping a script into an existing HTML file with no build step), bundle weight, dependency footprint, and API ergonomics.

---

## Overview

Page-flip libraries simulate the visual metaphor of turning a physical page. They differ widely in:

- **Rendering approach** — CSS 3D transforms, Canvas/WebGL, or DOM manipulation
- **Dependency model** — standalone, jQuery, or framework-coupled (React)
- **Bundle size** — ranges from ~5 KB (CSS-only) to ~40 KB (legacy jQuery plugins)
- **API surface** — from a single CSS class to a full controller object
- **Active maintenance** — some libraries have been frozen for years

The "newspaper page turn" — a broadsheet flipped like a print paper — has slightly different needs than a hardcover book. It usually wants:

- Big, two-page spreads
- A flexible (often free) container width
- Keyboard + drag navigation
- No build step

Below is an honest comparison. Version numbers reflect the most recent stable releases known to the author; verify before pinning in production.

---

## 1. turn.js

- **Homepage:** http://www.turnjs.com/
- **Repository:** historically on GitHub, now distributed via the commercial site
- **Latest version:** 4.x (the 5th-edition teaser has appeared in places, but 4.1.0 is the broadly-used release)
- **License:** MIT for older versions; current distribution leans commercial — verify before shipping
- **Bundle size:** ~40 KB minified (single `turn.min.js`)
- **Dependencies:** jQuery 1.7+
- **No-build static-page:** Yes — drop the script tag and call `$(selector).turn({...})`
- **API complexity:** Low–medium. One jQuery plugin call plus a small event API

### What it does well

turn.js is the most visually "book-like" of the jQuery-era options. It pioneered the corner-peel teaser and the soft-shadow page lift, both of which are still hard to match with raw CSS.

### Code example — newspaper page turn

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="turn.css">
  <style>
    #newspaper { width: 1000px; height: 700px; }
    .page { background: #fdfcf7; padding: 24px; }
  </style>
</head>
<body>
  <div id="newspaper">
    <div class="page"><h2>Front Page</h2><p>Lead story…</p></div>
    <div class="page"><h2>Page 2</h2><p>Opinion…</p></div>
    <div class="page"><h2>Page 3</h2><p>Classifieds…</p></div>
    <div class="page"><h2>Back Page</h2><p>Sports…</p></div>
  </div>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="turn.min.js"></script>
  <script>
    $("#newspaper").turn({
      width: 1000,
      height: 700,
      autoCenter: true,
      display: "double",          // broadsheet spread
      acceleration: true,
      gradients: true,
      turnCorners: "bl,br",
      when: {
        turned: function (e, page) {
          console.log("Now on page", page);
        }
      }
    });

    // Keyboard nav
    $(document).keydown(function (e) {
      if (e.keyCode === 37) $("#newspaper").turn("previous");
      if (e.keyCode === 39) $("#newspaper").turn("next");
    });
  </script>
</body>
</html>
```

### Pros

- Most polished corner-peel and shadow effects of any library in this list
- Well-documented event model (`start`, `end`, `turned`, `missing`)
- Works on legacy browsers going back to IE9 (with the older jQuery)

### Cons

- Effectively unmaintained — last meaningful update in 2015/2016
- jQuery dependency is a heavy tax in 2025
- License is murky for new commercial projects
- The plugin wraps content in nested divs which complicates responsive layouts

---

## 2. StPageFlip

- **Homepage / repo:** https://github.com/Nodlik/StPageFlip
- **Latest version:** 2.x (active line of releases through 2024)
- **License:** MIT
- **Bundle size:** ~10 KB minified + gzipped, plus ~25 KB for the soft shadow image asset
- **Dependencies:** None (vanilla JS, TypeScript types ship in the package)
- **No-build static-page:** Yes — there is a UMD build at `dist/StPageFlip.umd.js` that attaches `window.StPageFlip`
- **API complexity:** Medium. A `PageFlip` controller class with methods, events, and configuration options

### What it does well

StPageFlip is the modern default. It is actively maintained, framework-agnostic, has a clean ES module entry, ships TypeScript definitions, and the visual quality is competitive with turn.js. It also exposes a sensible hook for state-based rendering (e.g. flip from `data-flipbook="page-3"` to `data-flipbook="page-4"`).

### Code example — newspaper page turn

```html
<!doctype html>
<html>
<head>
  <style>
    .flip-book { width: 900px; height: 600px; margin: 0 auto; }
    .page { background: #fafafa; padding: 20px; box-sizing: border-box; }
    .page img { width: 100%; display: block; }
  </style>
</head>
<body>
  <div class="flip-book" id="newspaper">
    <div class="page" data-density="soft"><h2>Front Page</h2></div>
    <div class="page"><h2>Page 2</h2></div>
    <div class="page"><h2>Page 3</h2></div>
    <div class="page" data-density="hard"><h2>Back Page</h2></div>
  </div>

  <script src="https://unpkg.com/page-flip/dist/js/page-flip.browser.js"></script>
  <script>
    const pageFlip = new St.PageFlip({
      width: 450,                 // single page width
      height: 600,
      size: "stretch",            // or "fixed"
      minWidth: 315,
      maxWidth: 1000,
      minHeight: 420,
      maxHeight: 1350,
      showCover: true,
      mobileScrollSupport: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page"));

    pageFlip.on("flip", (e) => {
      console.log("Flipped to", e.data);
    });

    // Hook up arrow keys for newspaper navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft")  pageFlip.flipPrev();
      if (e.key === "ArrowRight") pageFlip.flipNext();
    });
  </script>
</body>
</html>
```

### Pros

- Zero dependencies, modern ES module + UMD builds
- Active maintenance, regular bug fixes
- Configurable density (soft / hard) and orientation
- Good touch and pointer event support
- TypeScript types

### Cons

- Some edge cases with very small viewports
- The shadow image asset is an extra HTTP request unless you inline it
- Documentation is good but the API has grown; expect to read the README twice

---

## 3. react-pageflip

- **Repository:** https://github.com/Nodlik/react-pageflip (a thin React wrapper around StPageFlip by the same author)
- **Latest version:** Tracks StPageFlip's 2.x line
- **License:** MIT
- **Bundle size:** ~12 KB plus StPageFlip's runtime
- **Dependencies:** React 16+ (peer dep) and StPageFlip
- **No-build static-page:** No — this is a React component, so you need a build pipeline (Vite, Next.js, CRA, etc.) unless you ship pre-built output
- **API complexity:** Low. A `<HTMLFlipBook>` JSX component plus a `useFlip` hook

### What it does well

If you are already in a React app, this is the most ergonomic option. You get props for width, height, orientation, start page, animation duration, and a callback for the current spread.

### Code example — newspaper page turn

```jsx
import React from "react";
import HTMLFlipBook from "react-pageflip";

function Newspaper({ articles }) {
  return (
    <HTMLFlipBook
      width={450}
      height={600}
      size="stretch"
      minWidth={315}
      maxWidth={1000}
      minHeight={420}
      maxHeight={1350}
      showCover
      mobileScrollSupport={false}
      onFlip={(e) => console.log("page", e.data)}
    >
      {articles.map((a) => (
        <div className="page" key={a.id}>
          <h2>{a.headline}</h2>
          <p>{a.body}</p>
        </div>
      ))}
    </HTMLFlipBook>
  );
}
```

### Pros

- The shortest possible code in a React context
- Inherits StPageFlip's quality and event model
- TypeScript types out of the box

### Cons

- React-only — useless outside a React project
- Cannot be dropped into a plain HTML page
- You inherit React's runtime cost (~45 KB) on top of the flip engine

---

## 4. impress.js

- **Homepage:** https://impress.js.org/
- **Repository:** https://github.com/impress/impress.js
- **Latest version:** 2.x (1.x was the long-stable line)
- **License:** MIT
- **Bundle size:** ~25 KB minified
- **Dependencies:** None
- **No-build static-page:** Yes — single script tag, declarative via `data-*` attributes on the slides
- **API complexity:** Low for the basic case, high for the custom-3D case

### What it does well

impress.js is not strictly a page-flip library — it is a Prezi-style 3D presentation engine. But it can be coerced into a flat page-turn metaphor by constraining rotations to Y-axis flips, which is occasionally useful when you want a more "drama" feel than a standard flip.

### Code example — newspaper page turn

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="impress-demo.css">
</head>
<body>
  <div id="impress">

    <div class="step" data-x="0" data-y="0" data-rotate-y="0">
      <h1>Front Page</h1>
    </div>

    <div class="step" data-x="1200" data-y="0" data-rotate-y="-30">
      <h1>Page 2</h1>
    </div>

    <div class="step" data-x="2400" data-y="0" data-rotate-y="-30">
      <h1>Page 3</h1>
    </div>

    <div class="step" data-x="3600" data-y="0" data-rotate-y="-30">
      <h1>Back Page</h1>
    </div>
  </div>

  <script src="impress.js"></script>
  <script>impress().init();</script>
</body>
</html>
```

### Pros

- Zero dependencies, single-file drop-in
- The 3D transitions feel unique and presentation-y
- Works well for keynote-style content

### Cons

- Not actually a page-flip — the "page" does not bend, it rotates in 3D
- The metaphor is wrong for a literal newspaper reading experience
- Accessibility is poor; navigation is keyboard-driven but with no screen-reader story
- Mobile support is mediocre

---

## 5. BookBlock by Codrops

- **Homepage:** https://tympanus.net/codrops/2012/09/03/bookblock-a-content-slider-plugin/
- **Latest version:** 1.x (frozen; Codrops tutorial assets)
- **License:** MIT
- **Bundle size:** ~5 KB for the JS, plus ~2 KB CSS
- **Dependencies:** jQuery 1.7+ and Modernizr (for touch / CSS feature detection)
- **No-build static-page:** Yes — copy two script tags and a stylesheet
- **API complexity:** Low. One jQuery call with a config object

### What it does well

BookBlock is the lightweight option from Codrops. It is a content slider that uses CSS transforms to fold a panel like a book page. It is small, well-documented in a single tutorial post, and the CSS is easy to customise.

### Code example — newspaper page turn

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="bookblock.css">
  <style>
    .bb-item { width: 480px; height: 600px; background: #fafafa; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="bb-bookblock" id="bb-newspaper">
      <div class="bb-item"><h2>Front Page</h2></div>
      <div class="bb-item"><h2>Page 2</h2></div>
      <div class="bb-item"><h2>Page 3</h2></div>
      <div class="bb-item"><h2>Back Page</h2></div>
    </div>
    <nav>
      <a id="bb-nav-prev" href="#">&lsaquo; Prev</a>
      <a id="bb-nav-next" href="#">Next &rsaquo;</a>
    </nav>
  </div>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Modernizr/2.8.3/modernizr.min.js"></script>
  <script src="jquery.bookblock.js"></script>
  <script>
    $(function () {
      const $bb = $("#bb-newspaper").bookblock({
        orientation: "horizontal",
        direction: "ltr",
        speed: 700,
        shadow: true,
        perspective: 1200
      });

      $("#bb-nav-prev").on("click", () => $bb.bookblock("prev"));
      $("#bb-nav-next").on("click", () => $bb.bookblock("next"));
    });
  </script>
</body>
</html>
```

### Pros

- Tiny, ~5 KB
- Easy to theme — most of the look lives in CSS
- jQuery plugin model is approachable for newcomers

### Cons

- Frozen since 2012 — no bug fixes
- jQuery + Modernizr is a 90 KB+ chain for a 5 KB plugin
- No "spread" mode out of the box; it flips one panel at a time
- Touch support depends on Modernizr's feature detection, which is dated

---

## 6. CSS-only — Gerald Ference / Desandro 3D book

- **Source article:** https://3dtransforms.desandro.com/
- **License:** MIT (article code is free to reuse)
- **Bundle size:** 0 bytes of JS — pure CSS
- **Dependencies:** None
- **No-build static-page:** Yes — the article is literally a copy-paste tutorial
- **API complexity:** None in JS. You author the HTML and CSS, then add `:hover` or `:checked` triggers

### What it does well

A static 3D book made from CSS transforms, sometimes combined with a checkbox hack to trigger the open animation. Useful for landing pages, product hero shots, or anywhere you want a one-shot animation rather than a controllable flip.

### Code example — newspaper "page turn"

```html
<!doctype html>
<html>
<head>
  <style>
    .scene {
      width: 400px; height: 600px;
      perspective: 1200px;
      margin: 80px auto;
    }
    .book {
      width: 100%; height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transform: rotateY(-30deg);
      transform-origin: 0 50%;
      transition: transform 1s;
    }
    .book:hover { transform: rotateY(-150deg); }

    .page {
      position: absolute; inset: 0;
      background: #fafafa;
      border: 1px solid #ddd;
      transform-origin: 0 50%;
    }
    .page-1 { transform: rotateY(  0deg); }
    .page-2 { transform: rotateY( -90deg); }
    .page-3 { transform: rotateY(-180deg); }
    .page-4 { transform: rotateY(-270deg); }
  </style>
</head>
<body>
  <div class="scene">
    <div class="book">
      <div class="page page-1"><h2>Front Page</h2></div>
      <div class="page page-2"><h2>Page 2</h2></div>
      <div class="page page-3"><h2>Page 3</h2></div>
      <div class="page page-4"><h2>Back Page</h2></div>
    </div>
  </div>
</body>
</html>
```

### Pros

- Zero JavaScript
- Zero bundle weight
- Performant — GPU-accelerated
- Works in any modern browser

### Cons

- Not a real page-turn — it's a stack rotation
- No drag, no keyboard, no programmatic API
- Cannot be paginated dynamically
- The `:hover` / checkbox trigger limits real-world reading flows

---

## Comparison table

| Library | Version | License | Size (min) | Deps | No-build static? | API complexity | Newspaper fit |
|---|---|---|---|---|---|---|---|
| **turn.js** | 4.1.0 | MIT (verify) | ~40 KB | jQuery 1.7+ | Yes | Low–medium | Good — display:"double" spread |
| **StPageFlip** | 2.x | MIT | ~10 KB | None | Yes (UMD) | Medium | Excellent — modern default |
| **react-pageflip** | 2.x | MIT | ~12 KB + StPageFlip | React 16+ | No | Low (in React) | Excellent in React apps |
| **impress.js** | 2.x | MIT | ~25 KB | None | Yes | Low–high | Poor — 3D rotation, not a flip |
| **BookBlock** | 1.x | MIT | ~5 KB | jQuery + Modernizr | Yes | Low | Mediocre — single panel only |
| **CSS-only** | n/a | MIT | 0 KB | None | Yes | None | Poor — decoration only |

### Footprint vs. features

| Library | Total weight with deps | Features per KB |
|---|---|---|
| turn.js | ~130 KB (jQuery + plugin) | High |
| StPageFlip | ~10 KB | High |
| react-pageflip | ~55 KB (React + plugin) | High in React |
| impress.js | ~25 KB | Medium |
| BookBlock | ~95 KB (jQuery + Modernizr + plugin) | Low |
| CSS-only | 0 KB | N/A |

### Maintenance status

| Library | Last meaningful release | Risk |
|---|---|---|
| turn.js | 2015 | High (verify license) |
| StPageFlip | 2024 | Low |
| react-pageflip | 2024 | Low |
| impress.js | 2018 | Medium |
| BookBlock | 2012 | High |
| CSS-only | n/a (article code) | None — it's CSS |

---

## Recommendation

**For a static newspaper-style HTML page with no build step, use StPageFlip.** It is the only library in this list that is small, dependency-free, actively maintained, MIT-licensed, and ships a UMD build that drops into a `<script>` tag. The `size: "stretch"` option and `display: "double"` equivalent (just halve the page width and let the engine pair them) give a credible broadsheet experience. Pair it with simple keyboard arrow handlers as shown above.

**If you are in a React app**, use **react-pageflip**. It is the same engine wrapped in a JSX component, and you save yourself the controller boilerplate.

**If the goal is decorative rather than interactive** (a hero animation on a landing page, a marketing illustration), the **CSS-only** approach is the right answer. Zero JavaScript, zero risk, and you can ship it as a single `<style>` block.

**Avoid turn.js** for new projects in 2025. The license is unclear, the project is dormant, and the jQuery dependency is a non-trivial tax. The visual quality was once best-in-class, but StPageFlip has closed the gap.

**Avoid BookBlock** unless you specifically want a single-panel flip and enjoy the jQuery + Modernizr dependency chain. It is a museum piece.

**Avoid impress.js** for newspapers. It is a presentation tool; using it for a reading experience is fighting the metaphor.

### Quick decision tree

1. React app? → **react-pageflip**
2. Plain HTML, want to read like a paper? → **StPageFlip**
3. Plain HTML, just want a pretty animation? → **CSS-only**
4. Legacy jQuery site, must not add a framework? → **BookBlock** (or **turn.js** if you accept the license risk)
5. Prezi-style presentation, not a newspaper? → **impress.js**

---

## Appendix — Drop-in template using StPageFlip

A minimal, self-contained HTML file you can save as `newspaper.html` and open in a browser. No build step.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Newspaper</title>
  <style>
    body { margin: 0; background: #2a2a2a; font-family: Georgia, serif; }
    .stage { width: 100vw; height: 100vh; display: grid; place-items: center; }
    .flip-book {
      width: min(95vw, 1000px);
      height: min(90vh, 700px);
    }
    .page {
      background: #fdfcf7;
      padding: 24px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .page h2 { margin-top: 0; }
  </style>
</head>
<body>
  <div class="stage">
    <div class="flip-book" id="paper">
      <div class="page"><h2>The Daily Standard</h2><p>Lead story goes here…</p></div>
      <div class="page"><h2>Opinion</h2><p>Editorial…</p></div>
      <div class="page"><h2>Classifieds</h2><p>Listings…</p></div>
      <div class="page"><h2>Sports</h2><p>Final score…</p></div>
    </div>
  </div>

  <script src="https://unpkg.com/page-flip@2/dist/js/page-flip.browser.js"></script>
  <script>
    const pageFlip = new St.PageFlip(document.getElementById("paper"), {
      width: 500,
      height: 700,
      size: "stretch",
      minWidth: 315,
      maxWidth: 1000,
      minHeight: 420,
      maxHeight: 1350,
      showCover: true,
      mobileScrollSupport: false
    });
    pageFlip.loadFromHTML(document.querySelectorAll(".page"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft")  pageFlip.flipPrev();
      if (e.key === "ArrowRight") pageFlip.flipNext();
    });
  </script>
</body>
</html>
```

Save the file, double-click it, and you have a working newspaper flip. No `npm install`, no bundler, no server.
