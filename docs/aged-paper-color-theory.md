# Aged Paper & Ink Color Theory

> Research notes for the SAC website (newspaper-themed). Goal: make the home page feel
> like authentic newsprint — chemistry, hex palettes, ink behavior, editor's marks,
> contrast, and `mix-blend-mode: multiply` layering.

---

## 1. Why newsprint looks the way it does

### 1.1 Newsprint is *not* archival paper

Modern newsprint is intentionally non-archival. It is made by **mechanical pulping**
(not chemical), so it **retains most of the lignin** that was in the wood (spruce, fir,
balsam fir, or pine) — typically 20–35 % of the dry mass of wood is lignin
([Lignin — Wikipedia](https://en.wikipedia.org/wiki/Lignin)).

> "Mechanical, or high-yield pulp, which is used to make newsprint, still contains most
> of the lignin originally present in the wood. This lignin is responsible for newsprint's
> yellowing with age."
> — [Lignin, Economic significance](https://en.wikipedia.org/wiki/Lignin#Economic_significance)

Higher grades of paper (acid-free, ISO 9706) remove the lignin and use alkaline sizing,
which is why an encyclopedia page from 1970 is still bright white but a 1970 newspaper
is dark tan.

### 1.2 The three degradation pathways

| # | Pathway | What happens | Visual effect |
|---|---|---|---|
| 1 | **Lignin oxidation** | Phenolic groups in lignin react with atmospheric O₂ and UV light, forming chromophores (coniferaldehyde, quinones). | Yellow → tan → brown. Catalysed by light, especially UV. |
| 2 | **Acid hydrolysis** | Alum-rosin sizing (introduced mid-19th c.) leaves aluminium sulphate in the sheet; with moisture it liberates H⁺, which cleaves the β-1,4 glycosidic bonds of cellulose. | Paper goes yellow, stiff, brittle. Conservators call this "**slow fire**." |
| 3 | **Photochemical yellowing** | UV radiation (especially < 380 nm) drives free-radical formation in lignin; moisture and heat accelerate. | Faster yellowing in sunlight; slower in dark, cool archives. |

> "The pages become yellow within years, extremely brittle over decades, and eventually
> unreadable. This process has been called *slow fire*."
> — [Acidic paper — Wikipedia](https://en.wikipedia.org/wiki/Acidic_paper)

Newsprint ages faster than book paper because it has (a) more lignin (no chemical
pulp), and (b) more residual acid from mechanical sizing.

---

## 2. Hex palette for aged newsprint

The palettes below model the **chromatic drift of an off-white sheet of newsprint over
time**, expressed in sRGB hex. Values for fresh stock sit on the "white" axis; values
for the older sheets move toward warmer yellows (CIE b* increases) and slightly lower
lightness (L\* decreases), which is what the eye reads as "old paper."

The values are **stylised targets**, not measurements of any specific newspaper — but
they follow the published trajectory of CIE whiteness/yellowness indices for
mechanical-pulp paper aged under indoor conditions.

### 2.1 Newsprint substrate (background tones)

| Age | Name | Hex | RGB | Notes |
|---|---|---|---|---|
| **0 d** (fresh) | Newsprint fresh | `#F5F2E7` | 245, 242, 231 | Off-white, slight cream. Modern mechanical-pulp paper straight off the press. Compare: [Off-white](https://en.wikipedia.org/wiki/Off-white) family — `#F5F5DC` (beige), `#F1E9D2` (parchment). |
| **1 y** | Aged 1 yr | `#F0E9CC` | 240, 233, 204 | First yellow tint. Lignin chromophores have just begun to form; still reads as "paper." |
| **5 y** | Aged 5 yr | `#E8D9A6` | 232, 217, 166 | Visible yellow. Folded and stacked issues from a back room. |
| **20 y** | Aged 20 yr | `#D9C07C` | 217, 192, 124 | Warm tan / manila. Brown box colour. |
| **50 y** | Aged 50 yr | `#BFA15A` | 191, 161, 90 | Yellow-brown. "Foxed." Edges of the page may brown first from handling and light. |
| **100 y** | Aged 100 yr | `#8C6E3A` | 140, 110, 58 | Deep umber. Equivalent to a sepia-toned photograph, but on the substrate itself. |

### 2.2 Light-side variants (interior vs. sun-exposed)

| Condition | Hex | Note |
|---|---|---|
| Interior, low light, cool/dry storage | `#E5D49B` | Same age as 20 yr above, but slower yellowing |
| Sun-exposed, attic, attic-stack | `#9F7E48` | One season of direct sun ≈ several decades of archive ageing |

### 2.3 Reproduction note

These colours will not perfectly match any real newspaper; they are design tokens.
Always validate final values against a physical reference under D65 illumination.

---

## 3. How ink sits on paper

### 3.1 The mechanics of ink on newsprint

Newsprint is uncoated, porous, and rough. Ink does not sit on top of the fibre — it
**wicked into** the fibre matrix immediately after impression. This produces the
characteristic fuzzy, slightly bleeding letterforms of a daily paper.

- **Spread / dot gain:** ink penetrates laterally into fibres as it wicks down. A 50 µm
  halftone dot on a coated magazine paper prints closer to 60 µm on newsprint.
- **Show-through:** because the ink soaks through the thin sheet, you can read the back
  of the page faintly through the front.
- **Set-off / rub-off:** wet ink on a freshly printed sheet smears onto the back of the
  sheet above it on the reel ("set-off"); readers' fingers come away grey.
  ([Halftone — Wikipedia](https://en.wikipedia.org/wiki/Halftone))

### 3.2 Halftone — the dot pattern of newspaper images

Newspapers print continuous-tone photographs as **halftones**: a regular grid of dots
whose *size* varies to encode tone. On newsprint the screen ruling is about **85 lines
per inch** (lpi), versus 150–200 lpi on coated magazine stock.

| Substrate | Typical halftone ruling |
|---|---|
| Newsprint (offset press) | **85 lpi** |
| Coated magazine stock | 85–185 lpi |
| Laser printer, 300 dpi | 65 lpi |
| Laser printer, 600 dpi | 85–105 lpi |
| Screen printing | 45–65 lpi |

(Source: [Halftone — Wikipedia, Resolution of halftone screens](https://en.wikipedia.org/wiki/Halftone#Resolution_of_halftone_screens))

For colour, **CMYK halftones** are used. The four screens are rotated to different
angles (typically C 15°, M 75°, Y 0°, K 45°) to avoid moiré patterns. Where one ink
sits on another, semi-transparency produces the colour the eye sees — a phenomenon
called *autotypical colour mixing*.

### 3.3 Three families of ink in journalism

| Family | Era | Chemistry | Initial colour | Aged colour (centuries) | Notes |
|---|---|---|---|---|---|
| **Carbon black** (India / China ink; lampblack + gelatin or shellac) | Antiquity → present | Colloidal carbon particles in water with a binder | Deep black | **Stable black** — almost indestructible | Used by scribes, illustrators, comic artists. Han-dynasty ink from 14th c. is still "bright and well preserved as though it had been applied but yesterday." ([India ink — Wikipedia](https://en.wikipedia.org/wiki/India_ink)) |
| **Iron-gall ink** | 5th c. → mid-20th c. (still sold for fountain pens) | Iron(II) sulphate + tannic acid from oak galls → ferrous tannate → ferric tannate on exposure to O₂ | Pale grey, drying to **purple-black / brown-black** | **Brown → sepia → holes eaten through the paper** | Standard European writing ink for ~1,400 years. Acidic; oxidises with age; can destroy its own substrate. Code of authenticity for medieval manuscripts. ([Iron-gall ink — Wikipedia](https://en.wikipedia.org/wiki/Iron_gall_ink)) |
| **Modern oil-based news ink** | 20th c. → | Carbon black pigment in a petroleum/soy-oil vehicle with resins | Deep black | Slow yellowing of *vehicle*, pigment stable | What your morning paper is printed with. Non-archival. |

A working hex for **carbon / India ink on aged paper** is `#1A1A1A`; for **iron-gall
ink aged centuries**, expect `#3B2A18` to `#4A2C0E` (the dark sepia you see in
medieval manuscripts).

### 3.4 Iron-gall ink chemistry, in one paragraph

Tannic acid + iron(II) sulphate → water-soluble ferrous tannate (penetrates paper
fibre, so it can't be washed off). Atmospheric O₂ oxidises Fe²⁺ → Fe³⁺, forming
insoluble ferric tannate — the dark pigment that darkens the writing as it ages. The
same excess acid that kept the ink liquid in the pot is what later eats the cellulose
chains of the paper, producing "ghost writing" and ultimately holes.
([Iron-gall ink — Chemistry](https://en.wikipedia.org/wiki/Iron_gall_ink#Chemistry))

This is why a 600-year-old legal document is a deep, warm, almost photographic brown,
not the cold blue-black it was on the day it was written.

---

## 4. Editor's mark colours (the "fingerprint" colours)

Three colours recur so consistently in newsroom markup that they have become visual
clichés for "this is a working document":

| Colour | Traditional use | Hex (approximate, RGB 0–255) | Notes |
|---|---|---|---|
| **Red** ink / pencil | Stet, deletions, "kill this paragraph" | `#C8102E` (newspaper red, vivid) — also `#9E1B32` (deeper editorial red) | The conventional "no" mark. Universal in proofreading tradition; codified in [List of proofreader's marks](https://en.wikipedia.org/wiki/List_of_proofreader%27s_marks). |
| **Blue** pencil | Editorial queries, suggested inserts, "TK / TBD" placeholders | `#003153` (Prussian blue, traditional) — also `#1E3A8A` (Pantone-like "editor's blue") | Cheaper than red, copies well on a Xerox. The reason it survived is partly economic and partly cultural. |
| **Yellow** highlighter | "Save this for the rewrite / read this twice" | `#FFE600` (Stabilo Boss yellow) — pyranine (`#F4E03B` approx.) is the dye behind most modern fluorescent yellows | [Pyranine — Wikipedia](https://en.wikipedia.org/wiki/Pyranine) — `C₁₆H₇Na₃O₁₀S₃`, Solvent Green 7. The highlighter "looks greenish" because pyranine absorbs in the violet and fluoresces in the green-yellow; your eye reads both. |
| **Sepia** | Photo correction, "burn this" | `#704214` | The colour named after cuttlefish ink. Sepia toning is what makes an old photograph *feel* old. ([Sepia (color) — Wikipedia](https://en.wikipedia.org/wiki/Sepia_(color))) |

Use these as accent tokens on the home page — for example, red for "breaking," yellow
for "highlights," blue for "by the way" / sidebars.

---

## 5. Contrast & accessibility on aged paper

### 5.1 WCAG ratios

WCAG 2.1 Success Criterion [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
requires **4.5 : 1** for body text (AA) and **7 : 1** for AAA. The contrast formula:

> **(L1 + 0.05) / (L2 + 0.05)**, where L is the relative luminance defined by sRGB.

### 5.2 Measured contrast — ink on paper at six ages

Computed foreground `#111111` (newsprint black) against the aged-newsprint palette:

| Background | Hex | Contrast vs. `#111` | WCAG |
|---|---|---|---|
| Fresh | `#F5F2E7` | **18.4 : 1** | AAA ✅ |
| 1 yr | `#F0E9CC` | 17.0 : 1 | AAA ✅ |
| 5 yr | `#E8D9A6` | 14.4 : 1 | AAA ✅ |
| 20 yr | `#D9C07C` | 11.0 : 1 | AAA ✅ |
| 50 yr | `#BFA15A` | 7.3 : 1 | AAA ✅ |
| 100 yr | `#8C6E3A` | **3.9 : 1** | ❌ fails AA |

A 100-year-old sheet with plain `#111` body copy is **no longer AA-compliant**. To
restore AA, darken the ink to `#000000` (4.4 : 1, marginal), or reduce the substrate
warmth by overlaying a white scrim — or accept the look and serve a "younger paper"
mode for accessibility.

### 5.3 Practical rules

1. **Default to fresh-stock substrate** (`#F5F2E7` to `#F0E9CC`) for any text that
   must meet AA.
2. **Reserve the darker, foxed tones** for background textures, mastheads, dividers —
   not for the reading column.
3. **Don't put coloured text on yellowed paper.** A red correction (`#C8102E`) on a
   50-yr background scores only ~3.5 : 1. Darken the red to `#7A0A1F` for any text
   that needs to remain legible.
4. **Use blue and red as decoration, not as the sole conveyor of information.**
   WCAG 1.4.1 (Use of Color) requires that colour not be the only means of conveying
   information — exactly what makes editor's marks robust is that they are also *shape*
   (crossed-out, circled, underlined).

---

## 6. Three full palettes for the home page

### 6.1 Black-and-white daily (most authentic)

```
--paper:    #F5F2E7   /* newsprint, fresh */
--ink:      #111111   /* carbon black body copy */
--ink-soft: #2B2B2B   /* subhead / deck */
--rule:     #111111   /* hairline */
--margin:   #E8D9A6   /* margin / folio tint, ~5 yr aged */
--spot-red: #C8102E   /* stop-press / breaking */
```

### 6.2 Sepia-toned archive (Sunday feature, long-read)

```
--paper:    #E8D9A6   /* aged ~5 yr */
--ink:      #2B1A08   /* deep sepia body */
--ink-soft: #4A2C0E   /* iron-gall ink on aged paper */
--rule:     #4A2C0E
--margin:   #D9C07C   /* 20-yr stack tint */
--spot-red: #7A0A1F   /* darkened editorial red for AA */
```

### 6.3 Full-colour Sunday edition (CMYK + spot)

```
--paper:    #FAFAF5   /* brighter coated-ish stock */
--ink:      #111111
--c-cyan:   #00AEEF   /* process cyan */
--c-mag:    #EC008C   /* process magenta */
--c-yel:    #FFF200   /* process yellow */
--c-key:    #111111   /* process black / K */
--spot-red: #C8102E
--highlight:#FFE600   /* pyranine yellow */
```

`--c-cyan`/`-mag`/`-yel` are the [CMYK process inks](https://en.wikipedia.org/wiki/CMYK_color_model) at full saturation. Note that the process yellow
(`#FFF200`) is *brighter* and more saturated than a highlighter yellow
(`#FFE600` / pyranine), because process inks are opaque and highlighter dye is
translucent.

---

## 7. Layering with `mix-blend-mode: multiply`

`mix-blend-mode: multiply` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode))
is the right tool for ink-on-paper because:

- **Black × any paper colour = ink colour** (you can put a black `<rect>` over a paper
  texture and it will inherit the texture's hue without going grey).
- **Coloured ink × paper colour = darker, warmer version of the colour** (yellow ink
  × cream paper becomes a deeper cream, like a faded highlight that has been on the
  page for a month).
- The result is what the eye would see if you really printed the ink on the paper:
  ink absorbs light, paper reflects it.

### 7.1 Minimal example

```html
<article class="page">
  <div class="paper-texture" aria-hidden="true"></div>
  <h1 class="headline">EXTRA</h1>
  <p class="lede">All the news that fits, we print.</p>
</article>
```

```css
.page {
  position: relative;
  isolation: isolate;
  background: var(--paper);            /* #F5F2E7 */
  padding: 2rem;
}

.paper-texture {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(0,0,0,.04), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(0,0,0,.05), transparent 60%),
    url("/public/paper-fibre.jpg");    /* noise/fibre photo */
  mix-blend-mode: multiply;            /* paper texture * paper colour */
  pointer-events: none;
  z-index: 0;
}

.headline {
  position: relative; z-index: 1;
  color: var(--ink);                   /* #111111 */
  mix-blend-mode: multiply;            /* ink absorbs paper's reflected light */
}

.lede {
  position: relative; z-index: 1;
  color: var(--ink-soft);
  mix-blend-mode: multiply;
}

/* The spot-red uses a slightly transparent multiply so it sits in the paper */
.spot {
  color: var(--spot-red);
  mix-blend-mode: multiply;
  opacity: 0.92;                       /* multiply already darkens; opacity tints it */
}
```

### 7.2 Why `multiply` rather than `normal` or `overlay`

| Mode | Behaviour | Newspaper analogy |
|---|---|---|
| `normal` | Front layer covers back layer completely | Sticker on top of paper — wrong |
| `multiply` | Front × back (clamped to black) | Real ink: absorbs light proportional to pigment density |
| `overlay` | Multiply on darks, screen on lights | Photo printed on rough paper with high-key & low-key both showing |
| `screen` | Front + back − front × back | Wrong: it's an *additive* mode (light, not pigment) |

Use `multiply` for ink and the paper texture; use it on the page itself (with the
paper colour as the base and a noise overlay on top) to embed fibre / foxing into the
background.

### 7.3 Layering recipe for a "morning paper" feel

```
z-index 3:  interactive content (links, headlines)
z-index 2:  ink (mix-blend-mode: multiply on top of paper)
z-index 1:  paper-colour base (--paper variable)
z-index 0:  paper texture / fibre photo (mix-blend-mode: multiply)
```

Use `isolation: isolate` on the parent so the multiply doesn't bleed into elements
outside the page.

---

## 8. Quick-reference: hex tokens for `tokens.css`

```css
:root {
  /* Substrate — pick one */
  --paper-fresh: #F5F2E7;
  --paper-1yr:   #F0E9CC;
  --paper-5yr:   #E8D9A6;
  --paper-20yr:  #D9C07C;
  --paper-50yr:  #BFA15A;
  --paper-100yr: #8C6E3A;

  /* Ink */
  --ink:         #111111;
  --ink-soft:    #2B2B2B;
  --iron-gall:   #2B1A08;     /* deep sepia; aged iron-gall */

  /* Editor's marks */
  --mark-red:    #C8102E;     /* vibrant red pencil / red ink */
  --mark-red-aa: #7A0A1F;     /* darkened red for AA contrast on aged stock */
  --mark-blue:   #003153;     /* Prussian blue pencil */
  --mark-blue-2: #1E3A8A;     /* modern editorial blue */
  --mark-yellow: #FFE600;     /* fluorescent highlighter, pyranine-based */
  --sepia:       #704214;
}
```

---

## 9. Sources

1. **Lignin** — Wikipedia. *Composition, biosynthesis, biodegradation, and the economic
   significance for papermaking.* Particularly "Mechanical, or high-yield pulp, which
   is used to make newsprint, still contains most of the lignin originally present in
   the wood. This lignin is responsible for newsprint's yellowing with age."
   <https://en.wikipedia.org/wiki/Lignin>
2. **Newsprint** — Wikipedia. *Low-cost, non-archival paper made by mechanical pulping.
   Off-white cast, distinctive feel, four-colour web offset printing.*
   <https://en.wikipedia.org/wiki/Newsprint>
3. **Acidic paper** — Wikipedia. *Resin-alum glue sizing → aluminium sulphate → acid
   hydrolysis of cellulose; "slow fire"; lignin oxidation → yellows the paper.*
   <https://en.wikipedia.org/wiki/Acidic_paper>
4. **Iron-gall ink** — Wikipedia. *Iron(II) sulphate + tannic acid; ferrous → ferric
   tannate on oxidation; acidic; can eat through paper; standard European ink 5th–19th c.*
   <https://en.wikipedia.org/wiki/Iron_gall_ink>
5. **India ink** — Wikipedia. *Carbon (lampblack) in colloidal suspension with a binder
   (gelatin, shellac). Deep, rich black; waterproof; archival. Used since Neolithic
   China.*
   <https://en.wikipedia.org/wiki/India_ink>
6. **Halftone** — Wikipedia. *Reprographic technique using dots of varying size or
   spacing to simulate continuous tone. Newsprint offset press typically prints at
   85 lpi; CMYK uses different screen angles (15°, 75°, 0°, 45°) to avoid moiré.*
   <https://en.wikipedia.org/wiki/Halftone>
7. **Highlighter** — Wikipedia. *Felt-tip marker with transparent fluorescent ink.
   Typical yellow uses pyranine; other colours use rhodamines.*
   <https://en.wikipedia.org/wiki/Highlighter>
8. **Pyranine** — Wikipedia. *CAS 6358-69-6, C₁₆H₇Na₃O₁₀S₃, Solvent Green 7 — the
   dye used in most yellow highlighters; absorbs violet, fluoresces yellow-green.*
   <https://en.wikipedia.org/wiki/Pyranine>
9. **Sepia (color)** — Wikipedia. *Reddish-brown pigment from the cuttlefish ink sac;
   hex `#704214`; the colour of antique photographs and aged iron-gall ink.*
   <https://en.wikipedia.org/wiki/Sepia_(color)>
10. **Off-white / Shades of white** — Wikipedia. *Reference hex values for cream,
    ivory, antique white, parchment, eggshell, bone, etc. — useful for picking
    substrate neighbours.*
    <https://en.wikipedia.org/wiki/Shades_of_white>
11. **CMYK color model** — Wikipedia. *Subtractive printing primaries; process yellow
    `#FFF200`, magenta `#EC008C`, cyan `#00AEEF`, key (black) `#111111`.*
    <https://en.wikipedia.org/wiki/CMYK_color_model>
12. **Proofreading** — Wikipedia. *Standard proofreader's marks in margins; blue pencil
    and red ink are the canonical "editor's fingerprint" colours.*
    <https://en.wikipedia.org/wiki/Proofreading>
13. **WCAG 2.1, SC 1.4.3 Contrast (Minimum)** — W3C. *4.5 : 1 for body text (AA),
    7 : 1 (AAA). Luminance formula and relative-luminance definition.*
    <https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html>
14. **WCAG 2.1, Technique G18 (Contrast ratio calculation)** — W3C. *L = 0.2126 R +
    0.7152 G + 0.0722 B with sRGB-linearisation; contrast ratio = (L1 + 0.05) / (L2 + 0.05).*
    <https://www.w3.org/WAI/WCAG21/Techniques/general/G18>
15. **`mix-blend-mode`** — MDN. *CSS property to blend an element's content with its
    backdrop. `multiply` is the ink-on-paper equivalent: front × back, clamped to
    black.*
    <https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode>

---

*Compiled for the SAC website. The "age hex" palette (section 2) is a stylised
target based on the documented chemistry of lignin oxidation and acid hydrolysis —
not measurements of a specific newspaper. Validate final values against a physical
reference under D65 illumination before publishing.*
