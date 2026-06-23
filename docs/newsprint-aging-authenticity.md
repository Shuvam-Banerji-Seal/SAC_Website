# Newsprint Aging Authenticity

A research brief on how real newsprint ages, distilled into hex palettes, design
patterns, and CSS techniques for the SAC home page. The goal: make the page look
like an authentic printed newspaper, with the right amount of time having passed.

---

## Table of Contents

1.  [Why Newsprint Ages So Visibly](#1-why-newsprint-ages-so-visibly)
2.  [The Two Aging Mechanisms](#2-the-two-aging-mechanisms)
3.  [Edge Wear, Foxing, and Other Defects](#3-edge-wear-foxing-and-other-defects)
4.  [UV and Storage Accelerators](#4-uv-and-storage-accelerators)
5.  [Color Palette: Fresh → 100 Years](#5-color-palette-fresh--100-years)
6.  [Reference Images of Authentic Aged Newsprint](#6-reference-images-of-authentic-aged-newsprint)
7.  [CSS Implementation Patterns](#7-css-implementation-patterns)
8.  [Recommended Stack for the SAC Home Page](#8-recommended-stack-for-the-sac-home-page)
9.  [Accessibility Notes](#9-accessibility-notes)
10. [Sources Cited](#10-sources-cited)

---

## 1. Why Newsprint Ages So Visibly

Newsprint is intentionally cheap. It is made by **mechanical (groundwood) pulping**,
which means the wood is ground up rather than chemically dissolved. The result is
a short-fibered, lignin-rich sheet that costs little, prints fast, and yellows
fast.

From the Wikipedia article on [Newsprint](https://en.wikipedia.org/wiki/Newsprint):

> "Newsprint is generally made by a mechanical milling process, without the
> chemical processes that are often used to remove lignin from the pulp. The
> lignin causes the paper to become brittle and yellow when exposed to air or
> sunlight."

From the Wikipedia article on [Lignin](https://en.wikipedia.org/wiki/Lignin):

> "Mechanical, or high-yield pulp, which is used to make newsprint, still
> contains most of the lignin originally present in the wood. This lignin is
> responsible for newsprint's yellowing with age."

From the [Library of Congress preservation leaflet on paper
deterioration](https://www.loc.gov/preservation/care/deterioratebrochure.html):

> "Mechanical pulping produces paper with the shortest fiber length and does
> not remove lignin from the wood, which promotes acid hydrolysis. Newspapers
> are printed on mechanically pulped paper."

And from the [Wikipedia article on
Slow fire](https://en.wikipedia.org/wiki/Slow_fire):

> "Paper made from mechanical pulp contains significant amounts of lignin, a
> major component in wood. In the presence of light and oxygen, lignin reacts
> to give yellow materials, which is why newsprint and other mechanical paper
> yellows with age."

This is the single most important fact for a newsprint-themed site: **the
yellowing of newsprint is overwhelmingly a photochemical oxidation of
lignin, not the acid decay that affects book paper.** That distinction drives
almost every visual decision below.

---

## 2. The Two Aging Mechanisms

Real old newsprint has *two* separate things happening to it, often at the
same time. Visually, they look like one thing, but they have different
causes, different rates, and different distributions across the page.

### 2.1 Lignin photo-oxidation (the warm yellow → brown shift)

- **Cause:** Phenylpropanoid units in residual lignin absorb UV/blue light.
  Radical coupling produces chromophores that absorb in the visible spectrum
  (the "ketyl pathway," described by Fabbri, Bietti & Lanzalunga 2005, cited
  in the [Slow fire](https://en.wikipedia.org/wiki/Slow_fire) article).
- **Distribution:** Even across the sheet, but **stronger near the edges**
  where more air and light reach the fibers. The Library of Congress
  preservation leaflet describes this as "book leaves that are more brown and
  brittle along the edges than in the center clearly illustrate this
  absorption of pollutants from the air."
- **Effect on color:** Off-white → cream → yellow → ochre → warm brown.
- **Effect on texture:** Subtle. The paper itself stays flexible in the
  short term, unlike acid-decayed book paper.

### 2.2 Acid hydrolysis (the embrittlement and edge crumble)

- **Cause:** Alum-rosin sizing (added to all wood-pulp papers from the
  mid-19th century onward) reacts with atmospheric moisture to form sulfuric
  acid. SO₂ and NOₓ pollution accelerate the same reaction. Cellulose chains
  cleave (acid hydrolysis) and the paper embrittles. This is the
  *[slow fire](https://en.wikipedia.org/wiki/Slow_fire)* described in the
  1987 documentary of the same name.
- **Distribution:** Starts at the edges, where pollutants and humidity enter.
  The LoC's paper-deterioration article notes that "acids also form in paper
  by the absorption of pollutants — mainly sulfur and nitrogen oxides. Book
  leaves that are more brown and brittle along the edges than in the center
  clearly illustrate this absorption of pollutants from the air."
- **Effect on color:** Browns the edges first, then progresses inward.
- **Effect on texture:** Severe. The paper becomes brittle, then crumbles.

### 2.3 The "newsprint is different" footnote

Book paper (alkaline or acid-buffered after the 1980s ANSI/NISO Z39.48
standard) degrades by acid hydrolysis first. **Newsprint** degrades by lignin
photo-oxidation first, and only later by acid hydrolysis — and only if it was
made after the mid-19th century when alum-rosin sizing became standard. This
means the color shift on a real 50-year-old newspaper is dominated by
**lignin chromophores** (warm yellow → ochre), not by the grey-brown of pure
acid decay.

For the SAC site, lean into the warm yellow → ochre → brown ramp, not the
cool grey decay of old book paper.

---

## 3. Edge Wear, Foxing, and Other Defects

Beyond color shift, real newsprint accumulates physical defects that sell the
"aged" look. These should be **layered**, not all present at once.

### 3.1 Foxing

The [Wikipedia article on Foxing](https://en.wikipedia.org/wiki/Foxing)
describes the phenomenon:

> "Foxing is an age-related process of deterioration that causes spots and
> browning on paper documents such as books, postage stamps, old paper money
> and certificates, and on textiles like clothing and artists' canvasses. …
> One conjecture is that foxing is caused by a fungal growth on the paper.
> Another is that foxing is caused by the effect on certain papers of the
> oxidation of iron, copper, or other substances in the pulp or rag from
> which the paper was made."

- **Color:** Reddish-brown to rust.
- **Size:** Pinhead (1–2 mm) up to ~1 cm spots.
- **Distribution:** Random clusters, not uniform.
- **Shape:** Irregular, often with a darker rim and a lighter center (the
  classic "fox spot").
- **Heaviest in:** Areas of higher humidity — bottom edges, interior of
  folded papers, near glued spines.

**CSS approach:** small, slightly transparent radial gradients scattered
across the page; use `mix-blend-mode: multiply` so they darken the paper
beneath them instead of just sitting on top. Genuine foxing colors are
roughly `#7a3a1a` to `#a55a2a`.

### 3.2 Edge darkening (the "burnt border")

From the LoC leaflet, this is the absorption of atmospheric SO₂/NOₓ from the
edges inward. The visual signature is a **darker band 5–20 mm wide around the
perimeter**, falling off to the normal paper color in the interior.

**CSS approach:** a vignette-style inset box-shadow, or a radial gradient
`background-image` sized to the box. Multiple stops are more authentic than a
single hard vignette.

### 3.3 Fold and crease creases

Newsprint was sold folded. Old issues have a **center fold**, sometimes
additional quarter-folds. These are the most reliable authenticating
features of a vintage newspaper image. The crease is a thin line of
**compressed, more-browned paper** with a **subtle shadow** on one side where
the paper bulges.

**CSS approach:** a 1–2 px line with a 1-px soft shadow. For maximum effect,
slightly desaturate the line and add a barely-perceptible bump with
`box-shadow` on the parent. A repeating-linear-gradient running the full
height at 50% works as a center fold.

### 3.4 Torn corners and edge losses

Real old newsprint tears at the corners first because that's where handling
stress concentrates. The torn edge is **jagged, not clean** — a 3–8 mm
irregular bite out of the corner.

**CSS approach:** SVG `clip-path` with an irregular polygon, or a
hand-drawn mask image. Avoid straight `clip-path: polygon()` triangles; real
tears are never geometric.

### 3.5 Brown stain transfer

The [Acidic paper](https://en.wikipedia.org/wiki/Acidic_paper) article shows
a document with a brown stain radiating out from where it was in contact
with an acidic cardboard box. For an aged newspaper, this looks like an
**uneven brown patch** with a darker ring around it, typically off-center.

**CSS approach:** a large, very-low-opacity radial gradient in the rust
family, `mix-blend-mode: multiply` so it darkens the paper rather than
covering it.

### 3.6 What you should NOT include

- **No** uniform "old paper" texture. Real aging is non-uniform.
- **No** pure greyscale. The shift is always warm (yellow → brown), never
  cool grey.
- **No** pristine edges. If the page looks too clean, it doesn't look old.

---

## 4. UV and Storage Accelerators

This is the part most "vintage" web designs get wrong. The same paper aged in
different conditions looks **measurably different** at the same age.

| Condition                | Effect on color shift rate | Visual signature                       |
| ------------------------ | -------------------------- | -------------------------------------- |
| Bright daylight, exposed | Very fast (months → years) | Heavy uniform yellow, faded ink        |
| Indirect indoor light    | Moderate (years → decades) | Edge darkening, mild overall yellow    |
| Dark, cool, dry archive  | Very slow (decades → centuries) | Mild edge darkening, mostly white interior |
| High humidity            | Accelerated                | Foxing, mold stains, tide lines        |
| Air pollution (urban)    | Accelerated                | Strong edge browning, embrittlement    |
| Folded vs. flat          | Folded shows crease darkening | Crease lines and fold marks are 2–3× darker than flat paper |

From the [LoC care leaflet](https://www.loc.gov/preservation/care/paper.html):

> "A cool (room temperature or below), relatively dry (about 35% relative
> humidity), clean, and stable environment (avoid attics, basements, and
> other locations with high risk of leaks and environmental extremes) …
> Minimal exposure to all kinds of light; no exposure to direct or intense
> light."

For the SAC site, this means: **pick one storage narrative and commit to it.**
A "fresh newspaper from the press" home page looks nothing like a "50-year-old
back issue from an attic" home page, even though both are technically
"newsprint."

---

## 5. Color Palette: Fresh → 100 Years

The user-supplied anchors (fresh `#f4f0e6`, 40-year `#c9a16b`, 80+ year
`#8b6f3a`) match the chemistry of lignin photo-oxidation very well. The
table below interpolates a continuous progression, plus a few companion colors
that the chemistry actually produces.

### 5.1 Base paper progression

| Age              | Paper hex  | Description                          | Lignin state        |
| ---------------- | ---------- | ------------------------------------ | ------------------- |
| Fresh (day 0)    | `#f4f0e6`  | Off-white, slightly warm             | Native, unoxidized  |
| 1 year           | `#efe7d2`  | Slight cream cast                    | Trace chromophores  |
| 5 years          | `#e6d6ad`  | Noticeable cream / pale wheat        | Mild oxidation      |
| 10 years         | `#dec48a`  | Wheat / manila                       | Moderate oxidation  |
| 20 years         | `#d2b274`  | Manila / dark khaki                  | Significant         |
| 40 years         | `#c9a16b`  | Ochre / dark goldenrod               | Heavy               |
| 60 years         | `#b38950`  | Russet / cinnamon                    | Advanced            |
| 80 years         | `#a07840`  | Light brown                          | Near-complete       |
| 80+ years        | `#8b6f3a`  | Dark khaki / aged-brown              | Long-term archive   |
| 100+ years       | `#6f5530`  | Sepia / dark brown                   | Archival / foxed    |

The user-provided `#c9a16b` (40 years) and `#8b6f3a` (80+ years) sit on this
curve and should be treated as the **mid-points** of the palette, not the
extremes.

### 5.2 Companion colors (use sparingly)

These appear in real newsprint but only in specific regions.

| Role                | Hex        | Where it shows up                          |
| ------------------- | ---------- | ------------------------------------------ |
| Fox spot (rim)      | `#7a3a1a`  | Outer ring of foxing spots                 |
| Fox spot (center)   | `#b87642`  | Lighter interior of foxing spots           |
| Brown stain         | `#5a3a1a`  | Stain transfer, contact damage             |
| Edge darkening      | `#3a2814`  | Outer 5–20 mm of an old sheet              |
| Fold crease         | `#8c6a3e`  | The compressed line of a fold              |
| Fold shadow         | `#d4b988`  | Slight darkening next to a fold            |
| Fresh ink black     | `#1a1a1a`  | Modern press output                       |
| Aged ink black      | `#2a2218`  | Old ink, faded and warm-shifted            |
| Press gray (rule)   | `#3a3a3a`  | Fresh halftone separator rules            |
| Aged gray           | `#4d3a20`  | Halftones in a 50-year-old paper           |
| Background shadow   | `#1a1208`  | Drop shadow under a folded sheet           |
| Subtle off-white    | `#faf6e8`  | Inner margin / column gutter              |

### 5.3 Dark-mode equivalent (for night reading)

Real newsprint at 80+ years, viewed under low warm light, can be
photographed in a way that almost inverts. The paper reads as a warm dark
brown and the ink reads as warm cream. The dark variant of the palette:

| Role                | Light hex  | Dark hex   |
| ------------------- | ---------- | ---------- |
| Paper               | `#8b6f3a`  | `#2a1f10`  |
| Ink                 | `#1a1a1a`  | `#e8d8a8`  |
| Margin              | `#faf6e8`  | `#1a1408`  |
| Edge darkening      | `#3a2814`  | `#0e0904`  |

---

## 6. Reference Images of Authentic Aged Newsprint

These are real archival images of old newsprint. Use them as a visual
reference, not as assets to embed.

- **1944 Belgian wartime front page** — strong yellowing with brown
  foxing spots and creasing. Excellent reference for the 20–40 year look.
  File: `Voorpagina_Vlaams_dagblad_"Gazet_Van_Mechelen"_22_februari_1944.jpg`
  <https://commons.wikimedia.org/wiki/File:Voorpagina_Vlaams_dagblad_%22Gazet_Van_Mechelen%22_22_februari_1944.jpg>

- **"Bird homes" 1903 book printed on cheap wood-pulp paper** — shows the
  typical deep ochre of a ~100-year-old mechanical-pulp sheet, plus
  characteristic brown edge wear.
  <https://commons.wikimedia.org/wiki/File:Bird_homes_-_The_nests,_eggs_and_breeding_habits_of_the_land_birds_breeding_in_the_eastern_United_States_with_hints_on_the_rearing_and_photographing_of_young_birds_(1903)_(14564645130).jpg>

- **Comstock 1832 textbook title page with heavy foxing** — reference for
  fox spot shape, color, and clustering. (Not newsprint — but the foxing
  is the same chemistry.)
  <https://commons.wikimedia.org/wiki/File:Comstock_1832_title_page.jpg>

- **Wikimedia Commons category: Newsprint** — broader gallery of
  newsprint-related archival material, including storage and press photos.
  <https://commons.wikimedia.org/wiki/Category:Newsprint>

- **Wikimedia Commons category: Foxing** — multiple examples of foxing
  patterns at different severities.
  <https://commons.wikimedia.org/wiki/Category:Foxing>

- **Foxing progression scan (Wikipedia)** — a side-by-side scan of the
  same document in 2018 vs 2023, showing measurable yellowing over 5 years.
  <https://commons.wikimedia.org/wiki/File:Foxing_example_-_document_printed_in_1990_-_left_image_scanned_in_2018_-_right_image_scanned_in_2023.jpg>

---

## 7. CSS Implementation Patterns

Aging a page is a multi-layer problem. CSS Backgrounds and Borders Module
Level 3 supports multiple background layers per element, which is exactly
what aging needs. The full spec is at
<https://www.w3.org/TR/css-backgrounds-3/> (specifically §2.1 "Layering
Multiple Background Images" and §2.2 "Base Color: the background-color
property").

### 7.1 The "newspaper at 40 years" CSS recipe

```css
:root {
  --paper:        #c9a16b;  /* 40-year ochre */
  --paper-edge:   #8c6a3e;  /* darker edge */
  --ink:          #1a1408;  /* aged black ink */
  --fox-rim:      #7a3a1a;
  --fox-center:   #b87642;
  --margin:       #d4b988;
}

body {
  background-color: var(--paper);

  /* Multiple background layers, topmost first. */
  background-image:
    /* 1. Foxing spots (multiply blend so they darken the paper) */
    radial-gradient(circle at 12% 18%, var(--fox-rim)  0 1px, transparent 2px),
    radial-gradient(circle at 12% 18%, var(--fox-center) 0 4px, transparent 5px),

    radial-gradient(circle at 78% 32%, var(--fox-rim)  0 1px, transparent 3px),
    radial-gradient(circle at 78% 32%, var(--fox-center) 0 5px, transparent 6px),

    radial-gradient(circle at 44% 71%, var(--fox-rim)  0 1px, transparent 2px),
    radial-gradient(circle at 44% 71%, var(--fox-center) 0 4px, transparent 5px),

    /* 2. Edge darkening (vignette) */
    radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(58, 40, 20, 0.18) 88%,
      rgba(58, 40, 20, 0.45) 100%
    ),

    /* 3. Subtle paper-fiber noise (tiled SVG or PNG) */
    url('data:image/svg+xml;utf8,<svg ...>'),

    /* 4. Brown stain transfer */
    radial-gradient(
      ellipse 30% 40% at 22% 88%,
      rgba(90, 58, 26, 0.22),
      transparent 70%
    );

  background-blend-mode:
    multiply, multiply, multiply, multiply, multiply, multiply,
    normal, normal, normal;

  color: var(--ink);
}
```

### 7.2 The center-fold crease

The most reliable "this is a folded newspaper" signal:

```css
.page {
  position: relative;
}

.page::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(140, 106, 62, 0.35) 8%,
    rgba(140, 106, 62, 0.55) 50%,
    rgba(140, 106, 62, 0.35) 92%,
    transparent 100%
  );
  box-shadow:
    2px 0 3px rgba(0, 0, 0, 0.10),
   -2px 0 3px rgba(0, 0, 0, 0.10);
  pointer-events: none;
  z-index: 1;
}
```

For a more authentic feel, vary the opacity and width along the height so
the fold isn't a perfect line.

### 7.3 Torn corner with SVG clip-path

```css
.torn-corner-tr {
  /* Real tears are never geometric. Use a rough polygon. */
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% 6%,
    96% 4%,
    92% 9%,
    88% 3%,
    83% 7%,
    78% 2%,
    72% 6%,
    66% 1%,
    60% 5%,
    53% 2%,
    47% 8%,
    40% 3%,
    33% 7%,
    26% 2%,
    20% 6%,
    14% 1%,
    8%  5%,
    0%  3%
  );
}
```

If the torn corner should reveal a darker "missing" paper underneath, layer
a `::before` with a slightly inset dark color.

### 7.4 Using `filter` for global aging

CSS [`filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) lets
you push the whole page into a vintage look with a single declaration:

```css
/* Subtle "40 years" filter on the entire content */
.page {
  filter: sepia(0.45) saturate(0.85) contrast(1.05) brightness(0.96);
}

/* Heavier "80 years" filter */
.page-heavy {
  filter: sepia(0.7)  saturate(0.7)  contrast(1.15) brightness(0.90);
}
```

`sepia()` is the most useful single filter here because it shifts the page
toward warm brown — exactly the lignin-oxidation direction. `saturate()` at
< 1 desaturates ink that has lost pigment. `contrast()` at > 1 sharpens the
remaining type.

### 7.5 Variable-based theming

Make the aging level a CSS custom property so it can be tuned from one place:

```css
:root {
  --age-years: 40;

  /* Map age to palette using relative color calc */
  --paper:        color-mix(in oklab,
                            #f4f0e6,
                            #8b6f3a
                            calc(var(--age-years) * 1%));
  --ink:          color-mix(in oklab,
                            #1a1a1a,
                            #2a2218
                            calc(var(--age-years) * 0.5%));
}

:root[data-age="5"]   { --age-years: 5;   }
:root[data-age="40"]  { --age-years: 40;  }
:root[data-age="80"]  { --age-years: 80;  }
:root[data-age="100"] { --age-years: 100; }
```

`color-mix(in oklab, ...)` produces a perceptually-uniform blend, which is
the right way to interpolate between paper colors. (See the CSS Color Module
Level 5 `color-mix` function, supported in all modern browsers as of 2024.)

### 7.6 background-blend-mode tricks

From the [W3C CSS Backgrounds and Borders Module Level
3](https://www.w3.org/TR/css-backgrounds-3/) and the [MDN filter
docs](https://developer.mozilla.org/en-US/docs/Web/CSS/filter), the
following blend modes are useful for aging:

| Blend mode      | Visual effect                                        | Use for                |
| --------------- | ---------------------------------------------------- | ---------------------- |
| `multiply`      | Darkens the paper with the overlay's color           | Foxing, stains, edges  |
| `screen`        | Lightens the paper with the overlay's color          | Highlights, sheen      |
| `overlay`       | Combines multiply and screen based on base luminance | Aged highlights        |
| `soft-light`    | Subtle version of overlay                            | Gentle aging wash      |
| `color-burn`    | Aggressive darken at the overlay's color             | Deep edge darkening    |
| `hue`           | Replaces hue, keeps saturation and lightness         | Color-correction tests |

For most newsprint aging, `multiply` is the workhorse — every "stain" on real
paper is the paper *darkened* by an additive, never the paper *lightened* by
something opaque on top.

---

## 8. Recommended Stack for the SAC Home Page

For a static HTML/CSS/JS site, the cleanest implementation is:

1.  **Base layer:** `background-color` set to the paper hex for the chosen
    age.
2.  **Paper texture layer:** A small repeating SVG noise pattern (or a
    pre-baked PNG) tiled as a `background-image`, with low opacity and
    `background-blend-mode: multiply` so it modulates the base color.
3.  **Edge darkening layer:** A radial gradient as `background-image`, no
    blend mode, sized to the viewport.
4.  **Stains/foxing layers:** Multiple radial gradients as `background-image`,
    with `background-blend-mode: multiply`, scattered across the page.
5.  **Global filter:** A single `filter: sepia() saturate() contrast()` on
    the article container to push the whole content area into the aging
    palette.
6.  **Fold creases:** `::before`/`::after` pseudo-elements, no blend mode
    needed since they sit on top.
7.  **Torn corners:** `clip-path: polygon(...)` on the affected card or
    section.
8.  **Drop shadow:** A warm-toned, low-opacity, large-radius
    `box-shadow` on the page container so the paper appears to be a physical
    sheet resting on a slightly darker surface.

That gives you a single, layered background that an inspector can read top
to bottom — exactly how the [W3C CSS Backgrounds spec][1] describes
multi-layer backgrounds.

[1]: https://www.w3.org/TR/css-backgrounds-3/

---

## 9. Accessibility Notes

A few things to keep in mind when pushing a page into a vintage aesthetic:

- **Contrast:** Aged paper (`#c9a16b`) against aged black ink (`#1a1408`) is
  roughly 7.2:1, which is comfortable for body text. Don't push the paper
  darker than `#a07840` if you're using small body type.
- **`prefers-reduced-motion`:** If you animate the aging (e.g., a
  "fresh → old" transition on scroll), respect this media query. Some users
  find smooth color shifts nausea-inducing.
- **`prefers-contrast: more`:** When a user requests more contrast (a
  Windows accessibility setting), strip the `filter: sepia() saturate() …`
  so they get the underlying high-contrast content.
- **Don't carry meaning in color shifts alone:** A 100-year-old "missing
  article" simulated by darkening should also be marked up with semantic
  HTML (`<del>`, `aria-hidden`, etc.) so screen readers and search engines
  parse it correctly.
- **Print stylesheet:** When the page is printed, drop all the
  `background-image` aging layers. Printers do not need fake fox spots.

```css
@media (prefers-contrast: more) {
  .page { filter: none; }
  body  { background-image: none; }
}

@media print {
  body {
    background: white;
    color: black;
  }
  .page { filter: none; }
}
```

---

## 10. Sources Cited

1.  **Library of Congress — Care, Handling, and Storage of Works on Paper.**
    Preservation, Collections Care.
    <https://www.loc.gov/preservation/care/paper.html>
    — Used for: storage environment (temperature, humidity, light), the
    statement that acids migrate from acidic papers to other works.

2.  **Library of Congress — The Deterioration and Preservation of Paper:
    Some Essential Facts.** Preservation, Collections Care.
    <https://www.loc.gov/preservation/care/deterioratebrochure.html>
    — Used for: the mechanism of acid hydrolysis, the role of mechanical
    pulping in newsprint, the edge-darkening effect of SO₂/NOₓ absorption,
    the cellulose-derived acids (formic, acetic, lactic, oxalic), the
    observation that edges are "more brown and brittle … than in the
    center," the artificial-aging methodology, and the "50 to a hundred
    years" usable-lifetime figure for acidic paper.

3.  **Wikipedia — Newsprint.**
    <https://en.wikipedia.org/wiki/Newsprint>
    — Used for: definition of newsprint, mechanical pulping process, the
    "off white cast" of fresh newsprint, and the explicit statement that
    "the lignin causes the paper to become brittle and yellow when exposed
    to air or sunlight."

4.  **Wikipedia — Foxing.**
    <https://en.wikipedia.org/wiki/Foxing>
    — Used for: definition of foxing, the two competing theories (fungal
    growth vs. iron/copper oxidation), the high-humidity correlation, the
    side-by-side 2018-vs-2023 yellowing comparison image, and the statement
    that other age-related damage includes "destruction of the lignin by
    sunlight and absorbed atmospheric pollution, typically causing the
    paper to become brown and crumble at the edges."

5.  **Wikipedia — Lignin.**
    <https://en.wikipedia.org/wiki/Lignin>
    — Used for: the statement that mechanical-pulp newsprint "still
    contains most of the lignin originally present in the wood. This lignin
    is responsible for newsprint's yellowing with age," and the
    hydrophobic-aromatic structure of lignin relevant to the ketyl
    photoyellowing pathway.

6.  **Wikipedia — Acid-free paper.**
    <https://en.wikipedia.org/wiki/Acid-free_paper>
    — Used for: the ANSI/NISO Z39.48 standard, the fact that
    acidic-wood-pulp paper became commonplace in the late 19th century,
    and the "slow fire" coinage (paper "turns yellow, becomes brittle and
    deteriorates").

7.  **Wikipedia — Acidic paper.**
    <https://en.wikipedia.org/wiki/Acidic_paper>
    — Used for: the resin-alum glue mechanism that introduces aluminum
    sulfate, the acid-hydrolysis chain-cleavage of cellulose, and the
    brown-stain image of paper stored in an acidic cardboard box.

8.  **Wikipedia — Slow fire.**
    <https://en.wikipedia.org/wiki/Slow_fire>
    — Used for: the explicit lignin-oxygen-light reaction that "gives
    yellow materials" in mechanical-pulp paper, the reference to Fabbri,
    Bietti & Lanzalunga (2005) on the ketyl pathway of photoyellowing, and
    the cellulose-self-acidification finding from the LoC preservation
    research.

9.  **Wikipedia — Deinking.**
    <https://en.wikipedia.org/wiki/Deinking>
    — Used for: the observation that wood-pulp fibers degrade after
    4–6 recycling cycles, which explains why even "recycled" newsprint
    still yellows (recycled fibers still carry lignin, and recycled-fiber
    sheets are often *more* yellow than virgin).

10. **W3C — CSS Backgrounds and Borders Module Level 3.**
    <https://www.w3.org/TR/css-backgrounds-3/>
    — Used for: the multi-layer background model (§2.1 "Layering Multiple
    Background Images"), the `background-color` and `background-image`
    properties, and the painting order (first image closest to user,
    background color painted below all image layers).

11. **MDN — `filter` CSS property.**
    <https://developer.mozilla.org/en-US/docs/Web/CSS/filter>
    — Used for: the `sepia()`, `saturate()`, `contrast()`, and
    `brightness()` filter functions used to push content into a vintage
    palette in a single declaration.

12. **Wikimedia Commons — Category: Newsprint.**
    <https://commons.wikimedia.org/wiki/Category:Newsprint>
    — Used for: the 1944 *Gazet Van Mechelen* front page and the 1903
    *Bird Homes* book as reference images of authentic aged newsprint.

13. **Wikimedia Commons — File: Comstock 1832 title page.**
    <https://commons.wikimedia.org/wiki/File:Comstock_1832_title_page.jpg>
    — Used for: a reference image of authentic heavy foxing on an old
    document.

14. **Wikimedia Commons — File: Foxing progression (2018 vs 2023).**
    <https://commons.wikimedia.org/wiki/File:Foxing_example_-_document_printed_in_1990_-_left_image_scanned_in_2018_-_right_image_scanned_in_2023.jpg>
    — Used for: a quantitative reference showing measurable yellowing over
    just five years in normal indoor conditions.

---

*Document prepared for the SAC website. The chemistry of newsprint aging
has not changed since the 19th century, so this brief should remain useful
indefinitely. If the SAC site ever migrates from static HTML to a
component framework, the layered background model in §7.1 maps cleanly to
most framework "card" primitives — only the selector scope changes.*
