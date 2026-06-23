# Old Map / Cartography Aesthetic — Reference for the SAC Website

> A research dossier on the visual vocabulary of antique cartography, gathered to guide a hand-drawn, sepia-and-ink, deckle-edged look for the SAC site. Sources include Wikipedia, the David Rumsey Map Collection, the Library of Congress, the British Library, cartographic-history monographs, and modern design blogs.

---

## 1. Why the old-map aesthetic?

Hand-drawn maps from the 14th–19th centuries carry a very specific mood that modern flat design cannot reach: warmth, craftsmanship, mystery, and the romance of exploration. For an academic-club site, that mood reads as **heritage, scholarship, and adventure** — exactly the qualities a SAC (Student Astronomy Club / Student Activity Center / etc.) page often wants to convey. The aesthetic is also a forgiving container: it can hold scientific diagrams, event posters, navigation through layered content, and ornament without feeling cluttered.

This document collects:

- the **physical facts** that make an old map look old (materials, pigments, paper, ink);
- the **graphic conventions** of antique cartography (compass roses, hachures, rhumb lines, cartouches);
- the **typography** that lives inside that vocabulary;
- **hex-accurate color palettes** lifted from real antique maps;
- **CSS / SVG recipes** that suggest the look without literally drawing a map;
- and **links to real antique maps and to modern sites** that pull the look off well.

---

## 2. Physical characteristics of an authentic old map

### 2.1 The substrate — vellum, parchment, rag paper

Maps were drawn on three principal supports, each leaving a distinct visual fingerprint.

| Substrate | Period | Visual tell | Source |
|---|---|---|---|
| **Vellum** (calfskin) | Portolan charts, c. 1300–1600 | Smooth, slightly translucent, faint vein patterns, warm cream, irregular edges | [Wikipedia – Vellum](https://en.wikipedia.org/wiki/Vellum) |
| **Parchment** (sheep/goat) | Medieval mappae mundi | More textured, hair follicle pits visible, yellower, scratches | [Wikipedia – Vellum](https://en.wikipedia.org/wiki/Vellum) |
| **Linen rag paper** | Engraved maps, 17th–19th c. | Visible chain-lines & laid lines, deckle edge, foxing, fox-marks, plate mark from copperplate | [Wikipedia – Vellum](https://en.wikipedia.org/wiki/Vellum) |
| **Wood-pulp paper** | Late 19th c. onward | Yellows faster, uniform texture, no deckle | — |

The supporting layer in a frame is often **frayed linen backing** — an aged textile stretched behind the map, slightly visible at the edges. We can suggest this with a linen-texture image at low opacity.

### 2.2 The ink — oxidised iron-gall

Iron-gall ink was the **standard writing ink of Europe from the 5th to the 19th century** ([Wikipedia – Iron gall ink](https://en.wikipedia.org/wiki/Iron_gall_ink)). It was made from oak galls (tannic acid) + iron(II) sulfate + gum arabic. Its signature behaviors:

- Fresh ink starts **pale grey** and oxidizes to a **deep purplish-black or sepia brown** ([Wikipedia – Iron gall ink](https://en.wikipedia.org/wiki/Iron_gall_ink)).
- It is **waterproof once dry** (soaks into the paper fibers).
- Over centuries it **eats through the paper**, leaving characteristic brown halos and "ghost" script on the reverse.
- Modern equivalents (LAMY, Rohrer & Klingner *Salix*, Platinum Classic) give us an authentic dark "registrar's blue-black" that photographs like aged ink.

For CSS, we want colors that **brown rather than grey** when desaturated — see §5.

### 2.3 Hand-drawn coastlines

Aged coastlines were drawn freehand with a quill or engraving burin. They are **never smooth Bezier curves** — they have:

- micro-jitter from the draughtsman's hand;
- a thicker outer stroke and thinner inner shading;
- small overshoots and loose ends at corners;
- a tendency to "bulge" at pen lifts.

We can simulate this with an SVG `<path>` with `stroke-linecap="round"`, a tiny `filter: url(#wobble)` displacement, or simply by chaining many short `L` commands.

### 2.4 Sea monsters, ships, and vignettes

Marginal decoration on portolan charts and 16th–17th century maps includes:

- **Sea monsters** (the *cetus*, sea-serpent, kraken). The [Wikipedia – Sea monster](https://en.wikipedia.org/wiki/Sea_monster) article catalogues *Carta Marina*'s famous monsters.
- **Ships** with billowing sails, often filling otherwise-empty oceans.
- **Putti** blowing winds, mermaids, compass-bearing cherubs.
- **Local costume figures** at coastlines (Africa, Asia) — now considered offensive but historically central.

A modern site can echo these as **silhouetted line drawings** in SVG, no fill, 1.2–1.5 px stroke.

### 2.5 Sepia / ochre palette

Real antique maps are dominated by:

- **Iron-gall ink black** (now brown-black, ≈ #3a2c1c)
- **Sepia wash** for oceans and shadows
- **Hand-applied yellow ochre** in landmasses
- **Verdigris / verdigris green** for rivers and the occasional decorative wash
- **Carmine / madder red** for cartouches and rhumb lines
- **Lead white highlights** in illuminated cartouches

See §5 for the full palette.

### 2.6 Deckle edges and foxing

The **deckle edge** is the rough, feathered, untrimmed border of handmade paper. Modern letterpress stationery imitates it. CSS can fake one with `mask-image` and a feathery PNG.

**Foxing** is the rust-colored spotting caused by iron impurities and mold. A subtle SVG `<filter>` using `feTurbulence` + `feDisplacementMap` and a brown `<feColorMatrix>` simulates it convincingly.

---

## 3. Graphic conventions of antique cartography

### 3.1 Compass rose

The compass rose is the most recognizable single motif. Per [Wikipedia – Compass rose](https://en.wikipedia.org/wiki/Compass_rose):

> "Cresques Abraham of Mallorca, in his Catalan Atlas of 1375, was the first to draw an ornate compass rose on a map."

Standard features we should preserve in an SVG:

- **8 or 16 points** (or 32 on the most ornate maps).
- North marked with a **fleur-de-lis** (introduced by Pedro Reinel, c. 1500).
- East marked with a **cross pattée** (the "Jerusalem cross", pointing east toward the Holy Land).
- A **central pivot dot** and concentric rings.
- The cardinal letters **T, G, L, S, O, L, P, M** (Tramontana, Greco, Levante, Scirocco, Ostro, Libeccio, Ponente, Maestro).
- **Black** for the eight principal winds, **green** for half-winds, **red** for quarter-winds (this is the original medieval color code).

Minimal SVG compass rose (works at any size):

```html
<svg viewBox="-50 -50 100 100" class="compass-rose" aria-hidden="true">
  <!-- 16-point star -->
  <g fill="none" stroke="#2b1d10" stroke-width="1.2" stroke-linejoin="round">
    <polygon points="0,-44 4,-4 44,0 4,4 0,44 -4,4 -44,0 -4,-4" fill="#2b1d10"/>
    <polygon points="0,-44 8,0 0,44 -8,0" fill="#d6c08a" opacity="0.85"/>
    <polygon points="-44,0 0,-8 44,0 0,8" fill="#d6c08a" opacity="0.85"/>
    <polygon points="0,-30 4,0 0,30 -4,0" fill="#fff" opacity="0.7"/>
  </g>
  <!-- Fleur-de-lis as north mark -->
  <g transform="translate(0,-30)" fill="#2b1d10">
    <path d="M0 -8 C -3 -4 -3 0 0 4 C 3 0 3 -4 0 -8 Z M -5 0 H 5 L 0 6 Z"/>
  </g>
  <!-- Cardinal letters -->
  <g font-family="IM Fell English, serif" font-size="9" text-anchor="middle" fill="#2b1d10">
    <text y="-38">N</text>
    <text x="38" y="3">E</text>
    <text y="42">S</text>
    <text x="-38" y="3">W</text>
  </g>
</svg>
```

### 3.2 Cartouche

A **cartouche** is the framed, decorated emblem that holds the title, scale, dedication, and often a scene of trade or exploration. Per [Wikipedia – Cartouche (cartography)](https://en.wikipedia.org/wiki/Cartouche_(cartography)):

> "The cartouche emerged from decorative borders around the map in the 15th century… The cartographic cartouche had its heyday in the Baroque period. Toward the end of the 18th century ornamental effects in cartography became less popular, and their style developed to simple ovals or they were omitted entirely."

The David Rumsey Map Collection's ["Cartouches, or Decorative Map Titles"](https://www.davidrumsey.com/blog/2010/2/25/cartouches-decorative-map-titles) post surveys fifty from 1703–1852 — the most productive reference we have for revival work. Common elements:

- A **rolled scroll** at top and/or bottom (suggesting a parchment being unrolled).
- A **central oval or shield** for the title.
- **Acanthus scrolls**, **putti**, **armorial supporters**.
- **Allegorical figures** (Commerce, Navigation, the continents personified as women).
- Surrounding **vegetal scrollwork** in strapwork style.

### 3.3 Rhumb lines

On a portolan chart, **rhumb lines** radiate from each compass rose in 16 or 32 directions. Per [Wikipedia – Portolan chart](https://en.wikipedia.org/wiki/Portolan_chart):

> "The earliest portolan charts are characterized by their rhumbline networks, which emanate out from compass roses located at various points on the map."

The medieval color code is itself a design language we can borrow:

| Line weight | Meaning | Color in medieval charts |
|---|---|---|
| Heavy stroke | 8 principal winds | Black |
| Medium stroke | 8 half-winds | Green |
| Light stroke | 16 quarter-winds | Red |

These give us a three-tone palette (ink black, verdigris, carmine) that already feels antique.

### 3.4 Hachures

**Hachures** are short parallel strokes used to indicate slope and relief on terrain. Per [Wikipedia – Hachure map](https://en.wikipedia.org/wiki/Hachure_map):

> "Hachure representation of relief was standardized by the German topographer Johann Georg Lehmann in 1799… they show orientation of slope, and by their thickness and overall density they provide a general sense of steepness."

Six rules (after G. R. P. Lawrence): strokes run downhill, are arranged in rows perpendicular to slope, are thicker on steeper ground, are evenly spaced within a row, and thin on the illuminated side. We rarely need full terrain relief on a website, but a tiny **hachure fill in a divider or section break** is a brilliant cartographic fingerprint.

CSS-replicating hachure:

```css
.hachure-band {
  background:
    repeating-linear-gradient(
      100deg,
      transparent 0 6px,
      rgba(59, 41, 18, 0.55) 6px 7px
    );
  /* Older hands tilted at slightly varying angles —
     layer two gradients for authenticity. */
  background-image:
    repeating-linear-gradient(100deg, transparent 0 6px, rgba(59,41,18,.5) 6px 7px),
    repeating-linear-gradient(82deg,  transparent 0 9px, rgba(59,41,18,.3) 9px 10px);
}
```

### 3.5 Strapwork

**Strapwork** is the ribbon-and-scroll framework that surrounds cartouches and panel borders. From [Wikipedia – Strapwork](https://en.wikipedia.org/wiki/Strapwork):

> "Strapwork is the use of stylised representations in ornament of ribbon-like forms. These may loosely imitate leather straps, parchment or metal cut into elaborate shapes, with piercings, and often interwoven in a geometric pattern."

Italian 15th-c. → spread to Fontainebleau in the 1530s → Cornelis Floris, Hans Vredeman de Vries (Antwerp, 1550s) → England and Northern Europe. It became the default "decoration engine" of Mannerist ornament and survives today in gilded book covers, baroque ceiling mouldings, and what your eye reads as "fancy old" borders.

CSS-style strapwork: chain two `border-image` strips and add `border-radius` with `clip-path: polygon(...)`. In SVG, draw a path of alternating Bézier loops.

### 3.6 Fleur-de-lis

The **fleur-de-lis** is the canonical north mark on compass roses from c. 1500 ([Wikipedia – Fleur-de-lis](https://en.wikipedia.org/wiki/Fleur-de-lis)). Pedro Reinel introduced it and it became universal on portolan charts. Unicode: `⚜` (U+269C). As an SVG path it traces three bound petals on a band, mirroring the iris / lily of French royal arms.

### 3.7 Vignettes

A **vignette** on a map is a small framed scene — a city view, a battle, a port — set into an otherwise empty corner of the ocean. The Tallis, SDUK and Fullarton examples in the Rumsey collection are full of these. On a website, vignettes map perfectly to **hero illustrations**, **section dividers**, or **event poster art**.

---

## 4. Typography conventions

Antique maps use very specific type. The modern revival favors the same families because their small caps, old-style figures, swashes, and irregular inking read "of-the-period" instantly.

### 4.1 Display / cartouche faces

Used in the title cartouche. Look for:

- **IM Fell English**, **IM Fell English SC**, **IM Fell Double Pica** (free, Google Fonts) — modeled on the type of Dr. John Fell (17th-c. Oxford).
- **Cardo**, **EB Garamond**, **Cormorant Garamond** — historical Garamond cuts.
- **Trajan Pro** — modeled on the Trajan column inscriptional capitals, used for monumental titles.
- **Caslon**, **Goudy**, **Bookman** — revival faces with old-style figures.

Pair with a **small-caps** variant (`font-feature-settings: "smcp" 1; "c2sc" 1;`) for all-caps running text.

### 4.2 Body / running text

For paragraphs and captions:

- **EB Garamond**, **Cormorant Garamond**, **Crimson Pro**, **Sorts Mill Goudy**.
- Always set with **old-style figures** (`font-feature-settings: "onum" 1;`) and **discretionary ligatures** (`"dlig" 1;`).

### 4.3 Italic conventions

Italics on antique maps are used for:

- **Latin or vernacular place names** (the running text is upright, the names slant).
- **Captions and explanatory notes**.
- **Sea labels** ("MARE INDICUM", "OCEANUS ÆTHIOPICUS" — note the medieval ligature æ).

Italic + small caps is the canonical cartographic headline style:

```css
.cartographic-title {
  font-family: "IM Fell English", "EB Garamond", serif;
  font-feature-settings: "smcp" 1, "c2sc" 1, "liga" 1;
  font-style: italic;
  letter-spacing: 0.08em;
  color: var(--ink);
}
```

### 4.4 Old-style figures

Map numbers (latitudes, scales, mile markers) almost always use **non-aligning old-style figures** so they sit at x-height with the surrounding text. Enable with:

```css
.figures { font-feature-settings: "onum" 1, "lnum" 0; }
```

### 4.5 Condensed display faces

For tight cartouches and headers, use **condensed display cuts** with high contrast (Didot, Bodoni). Modern equivalents: **Bodoni Moda**, **DM Serif Display**, **Playfair Display SC**.

---

## 5. Color palettes from real antique maps

Hex codes approximated from photographs of authentic maps at David Rumsey, the Library of Congress, and the British Library. Use the primary palette as CSS custom properties.

### 5.1 Primary "portolan" palette

| Role | Name | Hex | Where it appears |
|---|---|---|---|
| Substrate | Vellum cream | `#f3e7c8` | Map paper |
| Substrate shadow | Foxed parchment | `#e8d4a0` | Aged paper edges |
| Ink line | Iron-gall black | `#2b1d10` | Coastlines, type |
| Ink aged | Sepia ink | `#3e2a14` | Old strokes, decorative ink |
| Wash | Sea blue wash | `#5b7d8a` | Oceans on late 18th-c. maps |
| Wash deeper | Indigo wash | `#324a5c` | Deep ocean, rhumb-line shadows |
| Ochre | Hand-tinted yellow | `#c9a85b` | Landmasses |
| Ochre deep | Burnt sienna | `#8a5a2b` | Mountain hachures, highlights |
| Carmine | Madder red | `#9b2d20` | Cartouches, rhumb lines |
| Verdigris | Copper green | `#5d7a4a` | Rivers, decorative washes |
| Lead white | Highlight | `#fbf6e6` | Cartouche highlights, ivory panel |

### 5.2 Secondary "Mercator-Hondius" palette (1595–1650)

A more saturated range, used in the Dutch Golden Age:

| Role | Hex |
|---|---|
| Deep ocean | `#1f3a4a` |
| Ocean mid | `#3d6b7a` |
| Land ochre | `#d4a64a` |
| Land shadow | `#7a4a1a` |
| Cartouche red | `#a8311e` |
| Cartouche gold | `#b7892a` |
| Ivory | `#f3e0b0` |
| Black | `#1a1209` |

### 5.3 Tertiary "blue-and-pink" Stieler's Hand-Atlas palette (1817–)

A 19th-century German convention, popular in atlases of the late Romantic period:

| Role | Hex |
|---|---|
| Pink land | `#e8b8a0` |
| Blue ocean | `#a8c5d6` |
| Mountain grey | `#8a8275` |
| Border grey | `#4a4338` |
| Title sepia | `#5a3a1a` |

### 5.4 Quick-start CSS variables

```css
:root {
  /* substrate */
  --vellum:        #f3e7c8;
  --vellum-dark:   #e8d4a0;
  --vellum-edge:   #c9b585;
  /* ink */
  --ink:           #2b1d10;
  --ink-soft:      #3e2a14;
  --ink-faded:     #6a4e30;
  /* washes */
  --sea:           #5b7d8a;
  --sea-deep:      #324a5c;
  --ochre:         #c9a85b;
  --ochre-deep:    #8a5a2b;
  --carmine:       #9b2d20;
  --verdigris:     #5d7a4a;
  /* accents */
  --highlight:     #fbf6e6;
  --shadow:        #1a1209;
}
```

---

## 6. Border & frame treatments

Old-map borders were drawn, not computed. The standard components, all of which CSS/SVG can approximate:

### 6.1 Ruled lines

A simple double or triple rule around the page. CSS:

```css
.map-frame {
  border: 2px solid var(--ink);
  outline: 1px solid var(--ink);
  outline-offset: 6px;
  box-shadow: 0 0 0 1px var(--ink), 0 0 0 8px transparent;
}
```

Or, for a more authentic look, use `border-image` with a hand-drawn PNG rule.

### 6.2 Fleurons and bull's-eyes

A **fleuron** (❦, ❧) is a typographic ornament placed at line ends or section breaks. CSS-content version:

```css
.section-break::before {
  content: "❦";
  display: block;
  text-align: center;
  color: var(--ink);
  font-size: 1.5em;
  margin: 2rem 0;
}
```

A **bull's-eye** (● within ○) marks mileage on a scale bar; replicate with `radial-gradient`.

### 6.3 Cartouche frame (SVG)

A minimal cartouche frame, 200×80:

```html
<svg viewBox="0 0 200 80" class="cartouche">
  <defs>
    <pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 3 H6 M3 0 V6" stroke="#3e2a14" stroke-width="0.5" fill="none"/>
    </pattern>
  </defs>
  <rect x="2" y="2" width="196" height="76" rx="38"
        fill="#f3e7c8" stroke="#3e2a14" stroke-width="1.5"/>
  <rect x="8" y="8" width="184" height="64" rx="32"
        fill="none" stroke="#3e2a14" stroke-width="0.6"/>
  <!-- scrolled ends -->
  <circle cx="14" cy="40" r="6" fill="url(#weave)" stroke="#3e2a14"/>
  <circle cx="186" cy="40" r="6" fill="url(#weave)" stroke="#3e2a14"/>
  <!-- title text -->
  <text x="100" y="46" text-anchor="middle"
        font-family="IM Fell English, serif" font-style="italic"
        fill="#2b1d10">Terra Incognita</text>
</svg>
```

### 6.4 Scale bar

Always present on a real map. A classic 5-segment scale bar:

```html
<svg viewBox="0 0 240 30" class="scale-bar">
  <g stroke="#2b1d10" stroke-width="1" fill="none">
    <rect x="0"   y="10" width="40" height="6" fill="#2b1d10"/>
    <rect x="40"  y="10" width="40" height="6" fill="#f3e7c8"/>
    <rect x="80"  y="10" width="40" height="6" fill="#2b1d10"/>
    <rect x="120" y="10" width="40" height="6" fill="#f3e7c8"/>
    <rect x="160" y="10" width="40" height="6" fill="#2b1d10"/>
  </g>
  <g font-family="EB Garamond, serif" font-size="9" fill="#2b1d10"
     text-anchor="middle">
    <text x="20"  y="28">10</text>
    <text x="60"  y="28">20</text>
    <text x="100" y="28">30</text>
    <text x="140" y="28">40</text>
    <text x="180" y="28">50</text>
  </g>
</svg>
```

### 6.5 Decorative corner pieces

Real maps often have hand-drawn **corner pieces** that echo the cartouche. SVG `<symbol>` + `<use>` makes them reusable.

---

## 7. Texture overlays — aged linen & vellum in CSS

### 7.1 Paper grain via SVG turbulence

```css
.vellum-bg {
  background-color: #f3e7c8;
  background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>\
  <filter id='n'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>\
    <feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 0 0.06  0 0 0 0.10 0'/>\
  </filter>\
  <rect width='100%25' height='100%25' filter='url(%23n)'/>\
</svg>");
  background-blend-mode: multiply;
}
```

### 7.2 Linen weave

```css
.linen-bg {
  background:
    repeating-linear-gradient( 0deg,
      rgba(120, 90, 50, 0.08) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg,
      rgba(120, 90, 50, 0.06) 0 1px, transparent 1px 3px),
    #d8c397;
  background-blend-mode: multiply;
}
```

### 7.3 Foxing spots

```css
.foxed::after {
  content: "";
  position: absolute; inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>\
  <filter id='r'>\
    <feTurbulence type='turbulence' baseFrequency='0.018' numOctaves='2' seed='4'/>\
    <feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.35  0 0 0 0 0.10  0 0 0 1.4 -0.9'/>\
  </filter>\
  <rect width='100%25' height='100%25' filter='url(%23r)' opacity='0.55'/>\
</svg>");
  mix-blend-mode: multiply;
  opacity: 0.6;
}
```

### 7.4 Deckle edge via mask

```css
.deckle {
  --img: url("images/deckle-edge.png");
  -webkit-mask-image: var(--img);
          mask-image: var(--img);
  -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
}
```

(Generate the mask PNG once: a feathery translucent rectangle against a black background. ~20 KB.)

### 7.5 Ink-bleed / aged-letter filter

Pairs well with the [`ink-bleed-effects.md`](./ink-bleed-effects.md) notes already in the repo:

```css
.aged-text {
  filter: url(#inkbleed);
  color: var(--ink);
  text-shadow: 0 0 0.4px rgba(43,29,16,0.6);
}

<svg width="0" height="0">
  <filter id="inkbleed">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
    <feDisplacementMap in="SourceGraphic" scale="0.7"/>
  </filter>
</svg>
```

---

## 8. CSS / SVG recipes that suggest the look

A few patterns we can drop straight into the SAC site without ever drawing a map.

### 8.1 Compass-rose nav bullet

Use the SVG from §3.1 as a list-style:

```css
nav.compass-nav li::before {
  content: "";
  display: inline-block;
  width: 14px; height: 14px;
  margin-right: 0.6em;
  background: url("img/compass-rose.svg") center/contain no-repeat;
  vertical-align: middle;
}
```

### 8.2 Section divider — fleuron + thin rule

```html
<hr class="fleuron-rule">
```

```css
.fleuron-rule {
  border: 0;
  height: 22px;
  background:
    linear-gradient(to right,
      transparent 0, var(--ink) 18%, var(--ink) 82%, transparent 100%)
    center/100% 1px no-repeat,
    radial-gradient(circle at center, var(--ink) 1.5px, transparent 2.5px)
    center/6px 6px no-repeat;
  margin: 3rem auto;
  max-width: 320px;
}
```

### 8.3 Card with deckle frame

```css
.card-cartouche {
  position: relative;
  background: var(--vellum);
  padding: 2rem 1.6rem;
  border: 1.5px solid var(--ink-soft);
  border-radius: 2px;
  box-shadow:
    inset 0 0 30px rgba(43, 29, 16, 0.10),
    0 1px 0 var(--vellum-edge);
}
.card-cartouche::before,
.card-cartouche::after {
  content: "";
  position: absolute; left: 8px; right: 8px;
  height: 1px; background: var(--ink-soft); opacity: 0.6;
}
.card-cartouche::before { top: 6px; }
.card-cartouche::after  { bottom: 6px; }
```

### 8.4 Caption in italic small-caps

```html
<figcaption class="map-caption">
  Fig. III — <em>Terra Australis</em> nondum cognita, after Mercator
  (1569).
</figcaption>
```

```css
.map-caption {
  font-family: "IM Fell English", "EB Garamond", serif;
  font-style: italic;
  font-feature-settings: "smcp" 1;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
```

### 8.5 Aged hyperlink underline

```css
a.aged {
  color: var(--ink);
  text-decoration: underline wavy var(--carmine);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}
a.aged:hover { color: var(--carmine); }
```

---

## 9. Useful cartographic vocabulary for class names and IDs

Borrowing these as semantic names keeps the code self-documenting and aligned with the theme.

| Term | Meaning | Suggested use |
|---|---|---|
| `cartouche` | Decorative title frame | `.cartouche`, `<section id="cartouche-hero">` |
| `rhumb` | Direction line | `.rhumb-divider` |
| `compass-rose` | 8/16/32-point star | `.compass-rose`, nav marker |
| `fleuron` | Typographic ornament | `.fleuron::before` |
| `hachure` | Slope stroke | `.hachure-band` |
| `fleur-de-lis` | North marker | `.north-mark` |
| `meridian` | Longitude line | `.meridian-divider` |
| `parallels` | Latitude line | `.parallel` |
| `vignette` | Corner illustration | `.vignette-portrait` |
| `strapwork` | Ribbon border | `.strapwork-frame` |
| `vellum` | Paper substrate | `.vellum-bg` |
| `palimpsest` | Reused/aged paper | `.palimpsest-section` |
| `terra-incognita` | Unexplored | "coming soon" placeholder |
| `mappa-mundi` | World map | site-wide wrapper class |

---

## 10. Modern sites that capture the old-map look

Real-world references (study these — they pull off variations of this aesthetic):

- **David Rumsey Map Collection** — https://www.davidrumsey.com/
  The canonical reference. ~149,000 maps. Their Luna viewer and georeferencer are themselves period-inspired. The ["Cartouches"](https://www.davidrumsey.com/blog/2010/2/25/cartouches-decorative-map-titles) blog post is the gold standard for title-frame inspiration.

- **Library of Congress — Map Collections** — https://www.loc.gov/collections/
  Especially the *Sanborn*, *Railroad*, and *Old World Maps* collections. Browse the high-resolution JPEGs to lift authentic color.

- **Old Maps Online** — https://www.oldmapsonline.org/
  A federated search engine over many collections, including Rumsey, the British Library's *Georeferencer*, the National Library of Scotland, and Moravian Library. Excellent for sampling palettes.

- **British Library — *Mapping the World* exhibit** — https://www.bl.uk/events/mapping-the-world
  Ptolemy, Hereford, Beatus, Mercator — the canonical mappae mundi are here.

- **Atlas Obscura** — https://www.atlasobscura.com/
  Editorial design that borrows cartographic language (drop-caps, hand-inked illustrations, mini-cartouches for section heads) without literally being a map site. Excellent for "modern site using cartographic typography" reference.

- **Nautilus magazine** (older issues) — https://nautil.us/
  Old-map-styled section ornaments; sepia illustrations; deckle-edge section dividers.

- **Satoshi Quest / Pirate crypto projects** — a small, recurring genre of site that uses the "X marks the spot" / treasure-map vocabulary. Worth a glance for what's *too* much.

- **The Old World — Fantasy Cartography blog** — https://oldworldfantasy.com/
  A modern illustrator working exclusively in the antique-map idiom.

If we want a recent **pure CSS** old-paper demo: search `cartography css` on CodePen — there are dozens, ranging from clean (paper + compass-rose nav) to cluttered (full-bleed Piri-Reis backgrounds). Useful as "what to avoid" reference.

---

## 11. Source list

Primary references used in this document:

- **Wikipedia — Early world maps**: <https://en.wikipedia.org/wiki/Early_world_maps>
- **Wikipedia — Compass rose**: <https://en.wikipedia.org/wiki/Compass_rose>
- **Wikipedia — Cartouche (cartography)**: <https://en.wikipedia.org/wiki/Cartouche_(cartography)>
- **Wikipedia — Portolan chart**: <https://en.wikipedia.org/wiki/Portolan_chart>
- **Wikipedia — Hachure map**: <https://en.wikipedia.org/wiki/Hachure_map>
- **Wikipedia — Strapwork**: <https://en.wikipedia.org/wiki/Strapwork>
- **Wikipedia — Sea monster**: <https://en.wikipedia.org/wiki/Sea_monster>
- **Wikipedia — Vellum**: <https://en.wikipedia.org/wiki/Vellum>
- **Wikipedia — Iron gall ink**: <https://en.wikipedia.org/wiki/Iron_gall_ink>
- **Wikipedia — Fleur-de-lis**: <https://en.wikipedia.org/wiki/Fleur-de-lis>
- **Wikipedia — History of cartography**: <https://en.wikipedia.org/wiki/History_of_cartography>

Cartographic collections:

- **David Rumsey Map Collection** (Stanford): <https://www.davidrumsey.com/>
- **David Rumsey — "Cartouches, or Decorative Map Titles"**: <https://www.davidrumsey.com/blog/2010/2/25/cartouches-decorative-map-titles>
- **Library of Congress — Map Collections**: <https://www.loc.gov/collections/>
- **Old Maps Online**: <https://www.oldmapsonline.org/>
- **British Library — Mapping the World**: <https://www.bl.uk/events/mapping-the-world>
- **Wikimedia Commons — Category: Compass roses**: <https://commons.wikimedia.org/wiki/Category:Compass_roses>
- **Wikimedia Commons — Category: Cartouche (cartography)**: <https://commons.wikimedia.org/wiki/Category:Cartouche_(cartography)>
- **Wikimedia Commons — Category: Portolan charts**: <https://commons.wikimedia.org/wiki/Category:Portolan_charts>

Further reading:

- Bagrow, L. — *History of Cartography* (Transaction Publishers, 2010).
- Van Duzer, C. — *Frames that Speak: Cartouches on Early Modern Maps* (Brill, 2023).
- Woodward, D. (ed.) — *The History of Cartography* (multi-volume, University of Chicago Press).
- Besse, J.-M. & Verdier, N. — "Cartouche" entry in *Cartography in the European Enlightenment*, vol. 4.
- Lynam, E. — *The Mapmaker's Art* (Batchworth Press, 1953). PDF mirrored on the Rumsey site at <https://rumsey3.s3.amazonaws.com/images/cartouche/Lynam.pdf>.

---

## 12. Quick implementation checklist for the SAC site

A short list to act on, ordered roughly by impact-per-effort.

- [ ] Adopt the **primary portolan palette** as CSS custom properties (`--vellum`, `--ink`, `--sea`, `--ochre`, `--carmine`, `--verdigris`).
- [ ] Set body type to an **old-style serif** (EB Garamond or Cormorant) with `onum` and `liga` features on.
- [ ] Use a **cartouche display face** (IM Fell English) for H1/H2.
- [ ] Apply the **vellum-grain background** to `<body>` or a `.vellum` wrapper class.
- [ ] Add a **compass-rose nav bullet** to the primary nav.
- [ ] Replace default `<hr>` with the **fleuron-rule** divider.
- [ ] For section headers, surround with a **strapwork-style border** (SVG).
- [ ] For images, use **deckle-edge mask** and a soft **foxing overlay**.
- [ ] For accents, use **wavy underline** in carmine.
- [ ] Add at least one **compass-rose SVG** and one **scale-bar SVG** to the design kit.
- [ ] Use **Latin/italic place names** in `<em>` for anything astronomy-themed (constellations, etc.).

---

*Document compiled for the SAC Website project. Hex values are sampled from authentic antique maps at David Rumsey, Library of Congress, British Library, and Wikimedia Commons. All SVG and CSS snippets are original to this document and freely usable in the SAC codebase.*
