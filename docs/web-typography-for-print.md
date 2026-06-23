# Web Typography for Print

*A research brief on bringing the look and feel of newspapers, books, and old documents to the web — covering authentic typefaces, typographic conventions, drop-cap techniques, and OpenType features. Compiled from Google Fonts, Wikipedia, MDN, and CSS-Tricks.*

---

## 1. Overview & TL;DR

**TL;DR.** Print typography is the art of arranging type so written language is *legible*, *readable*, and *appealing* when displayed (Wikipedia, *Typography*). On the web we now have the tools to recreate that craft — historical revivals, OpenType features, CSS pseudo-elements, and a robust font-loading module — but the conventions of metal type (leading, kerning, small caps, old-style figures, ligatures, drop caps, justified columns) still apply. Use a serif **display** face for mastheads/headlines, a serif **text** face for body copy, and a **monospace** face for bylines, datelines, captions, or typewritten ephemera. Always end your `font-family` stack with a generic family (`serif`, `sans-serif`, `monospace`) so the browser has a fallback (MDN, *font-family*). Open the file with a `font-display: swap` `@font-face` and turn on the OpenType features that print designers expect — `liga`, `kern`, `onum`, `smcp`, `lnum`/`tnum`, `frac`, `dlig`.

### The three foundational concepts (from the sources)

- **Legibility** — how easily individual characters can be distinguished from one another. (Wikipedia, *Typography*, citing Walter Tracy.)
- **Readability** — how easy it is to read the text *as a whole*, as opposed to single-character recognition. Driven by margins, line length, line spacing, color contrast, and structure.
- **Type color** — the overall density of ink on a page, determined by the typeface, word spacing, leading, and margin depth. (Wikipedia, *Typography*.)

> "The typeface chosen should be legible. That is, it should be read without effort." — Craig & Scala 2006, quoted in Wikipedia.

### Why the *typeface* term matters

The Wikipedia *Typography* article notes that the confusion between "typeface" and "font" became widespread in 1984 when Steve Jobs mislabeled typefaces as fonts for Apple. The proper terms are: a **typeface** is the design (Garamond, Caslon, Bodoni); a **font** is one member of that design at a particular size and weight. This matters for newspaper-style work because the *typeface* family determines the page's voice — display vs. text, oldstyle vs. modern, roman vs. italic vs. small caps.

### Anatomy of a CSS font stack (the rule that ties everything together)

```css
/* Always: family list (comma-separated, left-to-right priority) */
font-family: "Playfair Display", "Bodoni Moda", Georgia, serif;
/* Always: one generic family at the END of the list */
```

CSS-Tricks' `font` shorthand notes that `font-size` and `font-family` are **mandatory** in the shorthand; if either is missing the whole declaration is ignored. `font-family` must be declared **last** among the values.

---

## 2. Authentic newspaper display faces

For mastheads, kickers, and front-page headlines. These are high-contrast, optically large, and often call for **Modern** (Didone) or **Old Style** letterforms depending on the era you're evoking. The Google Fonts link in each entry points to that specific family.

| Family | Google Fonts URL | Historical lineage / use |
|---|---|---|
| **Playfair Display** | https://fonts.google.com/specimen/Playfair+Display | Transitional/Modern hybrid by Claus Eggers Sørensen, inspired by 18th-c. English engraver William Playfair. Popular for editorial display. |
| **Bodoni Moda** (formerly Bodoni 72) | https://fonts.google.com/specimen/Bodoni+Moda | Giambattista Bodoni's 1798 Modern (Didone) design. Hairline serifs, extreme stroke contrast. *The very image of an 1880s broadsheet masthead.* |
| **Caslon** (via Caslon Egyptian / fallback to Libre Caslon) | https://fonts.google.com/specimen/Libre+Caslon+Text | Revival of William Caslon's 1725 letterforms — the workhorse of the American colonies. Used in the *Declaration of Independence.* |
| **Old Standard TT** | https://fonts.google.com/specimen/Old+Standard+TT | Revival of late-19th-century Modern faces by Alexey Kryukov. Wide use in academic reprints. |
| **UnifrakturCook** | https://fonts.google.com/specimen/UnifrakturCook | A Fraktur blackletter revival for the heaviest old-document feel (German incunabula, 15th–16th c.). |
| **Libre Caslon Text** | https://fonts.google.com/specimen/Libre+Caslon+Text | The Caslon revival most often used in modern web body type. |
| **Libre Bodoni** | https://fonts.google.com/specimen/Libre+Bodoni | Open-source revival of Bodoni by Pablo Impallari. Updated 21st-century inktraps. |
| **IBM Plex Serif** | https://fonts.google.com/specimen/IBM+Plex+Serif | Part of IBM's corporate Plex family. Slab-influenced serif for tech-forward editorial. |
| **Spectral** | https://fonts.google.com/specimen/Spectral | Production First's versatile workhorse by Production Type. Excellent for long-form. |
| **Source Serif Pro** (now Source Serif 4) | https://fonts.google.com/specimen/Source+Serif+4 | Adobe's open-source serif, designed for screens, with full Latin/Ext. Latin. |

### How to use them in a stack

```css
/* A newsroom masthead */
.masthead {
  font-family: "Playfair Display", "Bodoni Moda", "Didot", "Bodoni 72", serif;
  font-weight: 900;
  font-stretch: 90%;
  letter-spacing: -0.02em;     /* tight optical tracking, very print-like */
  font-feature-settings: "kern" 1, "liga" 1, "dlig" 1;
}
```

`letter-spacing` in `em` is preferred to a unitless number for print fidelity because it scales with size.

---

## 3. Authentic body faces

For long-form reading, columns, articles. Wikipedia's *Typography* article on text typefaces notes that "newspapers and magazines rely on compact, tightly fitted styles of text typefaces with serifs specially designed for the task, which offer maximum flexibility, readability, legibility, and efficient use of page space." The following faces meet that brief:

| Family | Google Fonts URL | Notes |
|---|---|---|
| **Georgia** | https://fonts.google.com/specimen/Georgia (or system stack) | Matthew Carter's 1993 design for screen reading at small sizes. The web's default "warm" serif. |
| **Charter** | https://fonts.google.com/specimen/Charter | Bitstream's Matthew Carter revival — used by *The Economist* (digitally), Apple iBooks. |
| **Iowan Old Style** | https://fonts.google.com/specimen/Iowan+Old+Style | Originally for Apple by John Downer. Bracketed serifs, generous x-height. |
| **Lyon Text** | https://commercialtype.com/catalog/lyon (not on Google Fonts) | Commercial Type, drawn by Kai Bernau. Editorial darling of long-form web magazines. |
| **Tiempos Text** | https://commercialtype.com/catalog/tiempos (not on Google Fonts) | Also by Commercial Type (Klim/Porter). The default body of *The New York Times* "Snowfall" era sites. |

> Some production-grade body faces (Lyon, Tiempos, **Tiempos Headline**, **Graphik**, **Söhne**) are not on Google Fonts and must be self-hosted under commercial license. This document sticks to free / OFL faces where the brief allows, and notes commercial alternatives.

### Body-type stack

```css
body {
  font-family: "Charter", "Iowan Old Style", "Source Serif Pro", Georgia, serif;
  font-size: 1rem;          /* 16px by default */
  line-height: 1.4;         /* ~22px — newspaper-column territory */
  font-feature-settings: "kern" 1, "liga" 1, "onum" 1, "pnum" 1;
  text-rendering: optimizeLegibility;
}
```

`text-rendering: optimizeLegibility` is a strong hint to browsers to apply kerning and ligatures; for print-like text, prefer it over `auto` or `geometricPrecision`.

---

## 4. Authentic monospace / typewriter faces

For datelines, bylines, captions, telegrams, "REDACTED" stamps, and old-document marginalia. The browser default for `monospace` is usually Courier New; a true print-feel needs a proper typewriter-design face.

| Family | Google Fonts URL | Notes |
|---|---|---|
| **Courier Prime** | https://fonts.google.com/specimen/Courier+Prime | Re-drawing of the original Courier by Alan Dague-Greene, sized for screen writing. |
| **IBM Plex Mono** | https://fonts.google.com/specimen/IBM+Plex+Mono | Companion to Plex Serif — pairs perfectly with IBM Plex Serif body. |
| **JetBrains Mono** | https://fonts.google.com/specimen/JetBrains+Mono | Code-focused, but its tall x-height works well for telegrams / manifestos. |
| **Source Code Pro** | https://fonts.google.com/specimen/Source+Code+Pro | Adobe's flagship monospace, designed for source code but also lovely in display. |

### Using monospace for dateline

```css
.dateline {
  font-family: "Courier Prime", "IBM Plex Mono", "Source Code Pro", monospace;
  font-variant-caps: all-small-caps;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.78rem;
  color: #2b2b2b;
}
```

MDN's `font-variant-caps` reference includes `all-small-caps` (every glyph small-cap), `small-caps` (mixed cap + lower become small caps), and `titling-caps` (designed-for-titles caps) — handy for newspaper bylines.

---

## 5. Display / drop-cap faces

For ornaments, chapter openers, masthead embellishments, and oversized first letters. These faces exaggerate the historical reference — they are *not* for body type.

| Family | Google Fonts URL | Notes |
|---|---|---|
| **Cormorant** (Garamond / Cormorant Garamond) | https://fonts.google.com/specimen/Cormorant+Garamond | Christian Thalmann's Garamond revival. Very high contrast, very display. |
| **Italiana** | https://fonts.google.com/specimen/Italiana | Modern (Didone) by Santiago Orozco. Ultra-thin. Beautiful for big initials. |
| **IM Fell English** | https://fonts.google.com/specimen/IM+Fell+English | A digital revival of types cut by John Fell at Oxford, c. 1670. Rough inktrap aesthetic — perfect for "old document" simulations. |
| **IM Fell DW Pica** | https://fonts.google.com/specimen/IM+Fell+DW+Pica | The other side of the Fell foundry. Slightly heavier, more readable. |

### Pairs beautifully with

- IM Fell English + Georgia (the "old letter" look)
- Cormorant Garamond + Spectral (refined 18th-century editorial)
- Italiana + Source Sans Pro (fashion-magazine display)

---

## 6. Free / open-license faces (Google Fonts, OFL)

All faces in §2–§5 with a Google Fonts URL are licensed under the **SIL Open Font License** (OFL) — free for commercial use, embeddable, redistributable. A few more open-license staples worth knowing for print-feel work:

| Family | Category | URL |
|---|---|---|
| EB Garamond | Old-style body | https://fonts.google.com/specimen/EB+Garamond |
| Crimson Pro | Old-style body | https://fonts.google.com/specimen/Crimson+Pro |
| Cormorant Infant | Old-style display | https://fonts.google.com/specimen/Cormorant+Infant |
| Frank Ruhl Libre | Modern display | https://fonts.google.com/specimen/Frank+Ruhl+Libre |
| Cardo | Old-style body w/ blackletter variant | https://fonts.google.com/specimen/Cardo |
| Lora | Transitional body | https://fonts.google.com/specimen/Lora |
| Merriweather | Screen-first body | https://fonts.google.com/specimen/Merriweather |
| Noto Serif | Pan-language body | https://fonts.google.com/specimen/Noto+Serif |
| Old Standard TT | Late 19th-c. revival | https://fonts.google.com/specimen/Old+Standard+TT |
| UnifrakturCook / UnifrakturMaguntia | Fraktur blackletter | https://fonts.google.com/specimen/UnifrakturCook |

> A note on Google Fonts and `font-display`. If you self-host, set `@font-face { font-display: swap; }` so the browser shows fallback text immediately. CSS-Tricks' almanac and the MDN `@font-face` reference both document `font-display` values: `auto`, `block`, `swap`, `fallback`, `optional`. For news-print sites, **`swap`** gives the best perceived performance.

---

## 7. Typographic conventions for newspapers

The conventions below are drawn from Wikipedia's *Typography* and *Type design* articles and from the working practices of news-design desks.

### 7.1 Leading (line-height)

**Definition.** *Leading* is the vertical distance between baselines of consecutive lines. The term survives from the days of metal type, when thin strips of lead separated lines. (Wikipedia, *Typography*.)

**Newsprint convention.** Body copy in newsprint is set at roughly 120–140% leading — so a 9pt body sits on 11pt leading. On the web this maps to `line-height: 1.2–1.4`. Books traditionally use 1.4–1.6; newspapers go tighter because of narrow columns and small body sizes.

```css
.article p {
  font-size: 1.0625rem;       /* 17px */
  line-height: 1.35;          /* ~23px */
}
```

Wikipedia's *Typography* image caption notes "Iowan old style roman, italics, and small caps, optimized at approximately ten words per line, typeface sized at 14 points on 1.4 × leading" — a canonical book setting. Newspapers go a notch tighter.

### 7.2 Kerning

**Definition.** *Kerning* is the adjustment of space between specific letter pairs (e.g., A-V, T-o). (Wikipedia, *Typography*.)

CSS provides `font-kerning: normal | none | auto`. For print-feel, set `font-kerning: normal` (or rely on the default) so that OpenType kerning is applied. The MDN `font-feature-settings` property exposes the underlying `kern` feature.

```css
h1, h2, h3, p { font-kerning: normal; }
```

For tight display, negative `letter-spacing` of -0.01em to -0.03em is a newspaper masthead trick.

### 7.3 Small caps

**Definition.** *Small capitals* are uppercase forms designed at the height and weight of lowercase letters, used to emphasize headings, bylines, and abbreviations without shouting. (Wikipedia, *Type design* — "Typefaces may also include a set of small capitals.")

In CSS:

```css
.byline {
  font-variant-caps: small-caps;
  letter-spacing: 0.05em;     /* small caps want a touch more air */
}
```

The MDN reference lists the full set: `normal`, `small-caps`, `all-small-caps`, `petite-caps`, `all-petite-caps`, `unicase`, `titling-caps`.

For three-century-name look in newspaper bylines, the CSS `::first-letter` selector often works better than manually uppercasing.

### 7.4 Old-style figures (text figures vs. lining figures)

**Definition.** *Lining figures* sit on the cap line, uniform height with capitals — typical in spreadsheets. *Old-style (text) figures* have varying heights, with some (3, 4, 5, 7, 9) descending below the baseline. Old-style figures blend into running text; lining figures are right for tables and headlines.

```css
p  { font-variant-numeric: oldstyle-nums proportional-nums; }
table.amounts td { font-variant-numeric: lining-nums tabular-nums; }
```

`tabular-nums` (`tnum`) makes all digits the same width — essential for newspaper tables and stock listings.

### 7.5 Ligatures

**Definition.** A *ligature* is a single glyph that replaces a sequence of characters (fi, fl, ffi, Th, etc.). (Wikipedia, *Type design* — "Ligature" entry under *Character*.)

```css
.legacy-text  { font-variant-ligatures: common-ligatures discretionary-ligatures historical-ligatures; }
.code-snippet { font-variant-ligatures: none; }   /* code: never ligate */
```

The MDN `font-variant-ligatures` reference specifies the four values: `common-ligatures` (default-on ligatures like fi, fl, ffi, ffl), `discretionary-ligatures` (dlig — display ligatures), `historical-ligatures` (hlig — older forms), and `contextual` (calt — context-sensitive substitutions).

For an old-book look, `historical-ligatures` is the secret sauce: the long-s, the ct, the st.

### 7.6 Drop caps

Wikipedia's *Typography* article classifies a *drop cap* (or *initial*) under the *Capitalization* family of concepts. They are oversized first letters that drop into the first 2–4 lines of body copy — a hallmark of chapter openings in books and feature-article lead-ins in magazines.

Modern CSS offers two paths:

1. **`::first-letter` pseudo-element** — see §8 below.
2. **`initial-letter` property** — a longhand that aligns the first letter across multiple lines. Limited browser support but the *right* solution when it lands.

### 7.7 Hyphenation

**Justification in newspapers.** Newspapers almost always set justified copy — a constraint that, on the web, demands proper hyphenation to avoid "rivers" of white space. CSS 3 hyphenation:

```css
.article {
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
  hyphenate-limit-chars: 6 3 2;     /* minimum 6 chars, 3 before break, 2 after */
  language: en;                     /* helps the hyphenation dictionary */
}
```

`hyphenate-limit-chars` is an MDN-documented property that prevents the over-fragmentation of small words.

### 7.8 Column width and line length

The classic rule: **45–75 characters per line** for body text. The Wikipedia *Typography* article references the Royal College of Art's *Readability of Print Unit* finding that the eye reads best when it can take in ~3 words at a time; longer lines cause strain and re-tracking errors.

```css
.article {
  max-width: 65ch;     /* ch unit = width of "0" in the current font */
  margin-inline: auto;
}
```

The `ch` unit is ideal for column width because it scales with the *typeface*, not the viewport.

### 7.9 Other conventions worth knowing

- **All-caps body text is hard to read** — Wikipedia's *Typography* article: "the use of all-caps renders words indistinguishable as groups, all letters presenting a uniform line to the eye, requiring special effort for separation and understanding." Use small caps or sentence case instead.
- **Tracking** (overall letter-spacing) — extra +0.02em for small-caps lines, −0.02em for display headlines.
- **Rivers** — vertical white columns formed by bad justification. CSS `word-spacing` and `letter-spacing` tuning (and hyphenation) help.
- **Widows and orphans** — single words on a line by themselves. The CSS `widows` and `orphans` properties (MDN) request minimum line counts at the start/end of a paragraph. CSS `text-wrap: pretty` (modern browsers) handles this automatically.

---

## 8. Drop-cap CSS techniques (`::first-letter`)

The `::first-letter` pseudo-element targets the first letter of a block-level element — exactly what you need for a drop cap. The MDN `font-family` reference notes that `font-family` (and other font properties) apply to `::first-letter` and `::first-line`. The CSS-Tricks almanac on `::first-letter` lists the rules and gotchas.

### 8.1 The classic 3-line drop cap

```css
.article p:first-of-type::first-letter {
  font-family: "Cormorant Garamond", "Playfair Display", Georgia, serif;
  font-weight: 700;
  font-size: 5.4em;            /* ~3 lines of body type */
  line-height: 0.85;
  float: left;
  margin: 0.05em 0.08em 0 -0.04em;
  padding: 0;
  color: #1a1a1a;
  font-feature-settings: "kern" 1, "dlig" 1, "swsh" 1;
}
```

### 8.2 The "raised" (shoulder) cap

A small capital that sits within the line, not dropped:

```css
.raised-cap::first-letter {
  font-family: "IM Fell English", "Iowan Old Style", Georgia, serif;
  font-weight: 700;
  font-size: 1.6em;
  vertical-align: 0.15em;
  line-height: 1;
  margin-right: 0.08em;
}
```

### 8.3 Color initial (red capital — illuminated manuscript feel)

```css
.illuminated::first-letter {
  font-family: "Cormorant Garamond", "IM Fell DW Pica", serif;
  font-size: 4.8em;
  float: left;
  line-height: 0.85;
  margin: 0.05em 0.1em 0 -0.02em;
  color: #8b1e1e;            /* iron-gall red, very print */
  text-shadow: 0 0 1px rgba(0,0,0,0.25);
}
```

### 8.4 The `initial-letter` property (modern, less supported)

The CSS Fonts spec (and `initial-letter` per MDN) defines:

```css
.modern-drop {
  initial-letter: 3 2;       /* drop 3 lines, sink 2 lines */
}
```

This is a clean solution that auto-wraps the cap. Browser support is improving (Safari, recent Chrome), so prefer `::first-letter` today and add `initial-letter` as a progressive enhancement.

### 8.5 Drop-cap gotchas

- `::first-letter` only applies to **block-level** elements and to a few inline-block elements — wrap your first letter in a `<p>`, not a `<span>`.
- Punctuation *before* the letter can be included in the initial (e.g., `"Hello…` — the quote and H are both the initial). Use a regular `&quot;` or `“` *outside* the block, or use `<span class="firstletter">H</span>` if you need surgical control.
- `float: left` is still the most reliable way to make the cap sit at the start of multiple lines. CSS `shape-outside` is an option for fancy effects.

---

## 9. OpenType features to enable

OpenType features are the *secret sauce* of print-feel web type. They are exposed in CSS through `font-feature-settings` (low-level) and through the high-level `font-variant-*` family of properties. The MDN *OpenType font features* guide is the canonical reference.

### 9.1 The four most important features for print-feel

| Tag | Longhand property | What it does |
|---|---|---|
| `kern` | `font-kerning: normal` | Applies OpenType kerning tables (essential for display). |
| `liga` | `font-variant-ligatures: common-ligatures` | fi, fl, ffi, ffl — the default ligatures. |
| `onum` | `font-variant-numeric: oldstyle-nums` | Old-style figures (descending 3, 4, 5, 7, 9). |
| `smcp` | `font-variant-caps: small-caps` | True small-cap glyphs (not just lowercased). |

### 9.2 Full cheat-sheet for newspaper / book work

```css
:root {
  /* default feature settings for all body type */
  --print-features: "kern" 1, "liga" 1, "calt" 1, "onum" 1, "pnum" 1, "tnum" 0;
}

body {
  font-feature-settings: var(--print-features);
}

/* Switch to lining tabular figures in tables */
.amounts { font-variant-numeric: lining-nums tabular-nums; }

/* Display headlines: tight tracking, discretionary ligatures */
h1, h2, .masthead {
  font-feature-settings: "kern" 1, "liga" 1, "dlig" 1, "swsh" 1;
  font-variant-ligatures: common-ligatures discretionary-ligatures;
  font-variant-caps: titling-caps;
}

/* Disable ligatures in code (legibility > beauty) */
code, pre, .mono { font-variant-ligatures: none; }

/* Use small caps for bylines */
.byline, .dateline {
  font-variant-caps: small-caps;
  font-feature-settings: "kern" 1, "liga" 1, "smcp" 1, "onum" 1;
  letter-spacing: 0.05em;
}
```

### 9.3 The MDN `font-variant-numeric` values

| Value | Tag | What it does |
|---|---|---|
| `lining-nums` | `lnum` | All numerals align to the cap line. |
| `oldstyle-nums` | `onum` | Descending numerals (default for text). |
| `proportional-nums` | `pnum` | Variable-width numerals. |
| `tabular-nums` | `tnum` | Fixed-width numerals. |
| `diagonal-fractions` | `frac` | Stacked fractions `1/2` → ½. |
| `stacked-fractions` | `afrc` | Vertical-stacked fractions. |
| `ordinal` | `ordn` | 1st, 2nd, 3rd (superscript endings). |
| `slashed-zero` | `zero` | Ø for the zero. |

### 9.4 `font-variant-ligatures` values (from MDN)

| Value | Tag | What it does |
|---|---|---|
| `common-ligatures` | `liga` | Standard ligatures (fi, fl). |
| `no-common-ligatures` | — | Disable them. |
| `discretionary-ligatures` | `dlig` | Display ligatures (e.g., Th, ct). |
| `historical-ligatures` | `hlig` | Older forms (long-s). |
| `contextual` | `calt` | Context-sensitive substitutions. |

### 9.5 Variable fonts (a 2020s note)

The MDN *Variable fonts* guide explains that a single file can contain a continuous range of weight, width, and slant axes. For newspaper-style work, a variable serif like **Recoleta**, **Source Serif 4 Variable**, or **IBM Plex Serif Variable** lets you fine-tune weight and optical size at the element level. Specify axes with `font-variation-settings`:

```css
.headline {
  font-family: "Recoleta", "Source Serif 4 Variable", serif;
  font-variation-settings: "wght" 700, "opsz" 96, "slnt" 0;
  font-optical-sizing: auto;       /* honor opsz axis automatically */
}
```

`font-optical-sizing: auto` lets the browser pick the right optical-size glyphs for the current size — the digital equivalent of a punchcutter drawing a different version of each letter for caption use.

### 9.6 `@font-face` template for self-hosting

```css
@font-face {
  font-family: "Playfair Display";
  font-weight: 400 900;        /* variable range */
  font-style: normal;
  font-display: swap;          /* don't block paint */
  src: url("/fonts/PlayfairDisplay-VariableFont.woff2") format("woff2-variations");
}

@font-face {
  font-family: "Playfair Display";
  font-weight: 400 900;
  font-style: italic;
  font-display: swap;
  src: url("/fonts/PlayfairDisplay-Italic-VariableFont.woff2") format("woff2-variations");
}
```

The MDN `CSS fonts` module lists every `@font-face` descriptor, including `ascent-override`, `descent-override`, `line-gap-override`, and `size-adjust` — useful for matching fallback metrics to a primary font to avoid layout shift.

---

## 10. Putting it all together — a print-feel article

```html
<article class="newspaper">
  <h1 class="masthead">The Daily Ledger</h1>
  <p class="dateline">Vol. XII — No. 304  ·  Tuesday, 22 June 2026  ·  Price: One Penny</p>
  <h2 class="kicker">A Treatise on Modern Serifs</h2>
  <h3 class="headline">Why Old Faces Are the New Web Faces</h3>
  <p class="byline">By the Editorial Staff</p>
  <p class="lede"><span class="dropcap">T</span>he art of arranging type ...</p>
  <p>The rest of the article body ...</p>
</article>
```

```css
.newspaper {
  font-family: "Charter", "Iowan Old Style", "Source Serif Pro", Georgia, serif;
  font-size: 1.0625rem;
  line-height: 1.4;
  max-width: 65ch;
  margin: 2rem auto;
  color: #1a1a1a;
  font-feature-settings: "kern" 1, "liga" 1, "onum" 1, "pnum" 1;
  text-rendering: optimizeLegibility;
  hyphens: auto;
  text-align: justify;
}

.masthead {
  font-family: "Playfair Display", "Bodoni Moda", "Didot", serif;
  font-weight: 900;
  font-stretch: 90%;
  font-size: 3.2rem;
  letter-spacing: -0.025em;
  line-height: 1;
  text-align: center;
  margin: 0 0 0.25em;
  font-feature-settings: "kern" 1, "dlig" 1, "swsh" 1;
}

.dateline {
  font-family: "Courier Prime", "IBM Plex Mono", monospace;
  text-align: center;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
  border-top: 1px solid #c0b8a8;
  border-bottom: 1px solid #c0b8a8;
  padding: 0.4em 0;
  margin: 0 0 2rem;
}

.kicker {
  font-family: "IBM Plex Sans", "Helvetica Neue", sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8b1e1e;
  margin: 1.5rem 0 0.4rem;
}

.headline {
  font-family: "Playfair Display", "Bodoni Moda", serif;
  font-weight: 700;
  font-size: 2.1rem;
  line-height: 1.1;
  margin: 0 0 0.6rem;
}

.byline {
  font-variant-caps: small-caps;
  font-feature-settings: "kern" 1, "smcp" 1;
  letter-spacing: 0.06em;
  margin: 0 0 1.4rem;
  color: #444;
}

.dropcap {
  font-family: "Cormorant Garamond", "IM Fell DW Pica", serif;
  font-weight: 700;
  font-size: 4.6em;
  float: left;
  line-height: 0.82;
  margin: 0.06em 0.1em 0 -0.03em;
  color: #1a1a1a;
}
```

---

## 11. Source bibliography

This brief was compiled from the following primary sources (no more than six, per the research brief):

1. **Google Fonts — Serif category** — https://fonts.google.com/?category=Serif — for the font URLs and licensing of every face in §2–§6.
2. **Wikipedia, *Typography*** — https://en.wikipedia.org/wiki/Typography — for the definitions of legibility, readability, type color, and the historical conventions cited in §1 and §7.
3. **Wikipedia, *Type design*** — https://en.wikipedia.org/wiki/Type_design — for the typographic anatomy terms (stroke, counter, body, structural groups) and design-variable vocabulary (style, weight, contrast, width, posture, case).
4. **MDN, *font-family* CSS property** — https://developer.mozilla.org/en-US/docs/Web/CSS/font-family — for the `font-family` syntax, generic family keywords, and the rule that `font-family` applies to `::first-letter` and `::first-line`.
5. **MDN, *CSS fonts* module** — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts — for the complete property list, `@font-face` descriptors, and the `font-variant-*` family of properties used throughout §9.
6. **CSS-Tricks, *font* almanac** — https://css-tricks.com/almanac/properties/f/font/ — for the `font` shorthand gotchas (mandatory `font-size`/`font-family`, ordering rules, inheritance behavior of optionals).

---

*End of brief. ~430 lines.*
