# Free Texture Resources for Paper / Newsprint / Old Documents

> **Audience.** This brief is for the **SAC Website** (`/store/shuvam/SAC_Website`) — a pure-static HTML/CSS/JS newspaper-themed site. It catalogs free, license-clear texture resources so we can move past the limits of SVG-generated paper effects (see `docs/svg-filters-for-paper.md`, `docs/newsprint-aging-authenticity.md`) to photographic, license-clean paper textures.
>
> **Scope.** Photographic paper / parchment / newsprint / kraft / cardstock / aged-document textures only. SVG pattern libraries (already covered by `transparenttextures.com`) are included for completeness and easy migration, but the focus is on raster sources that beat SVG filters on tactile realism.

---

## Table of contents

1. [TL;DR — what to actually use](#1-tldr--what-to-actually-use)
2. [Master comparison table](#2-master-comparison-table)
3. [Source-by-source notes](#3-source-by-source-notes)
   - 3.1 [transparenttextures.com (SVG patterns)](#31-transparenttexturescom-svg-patterns)
   - 3.2 [Unsplash](#32-unsplash)
   - 3.3 [Pexels](#33-pexels)
   - 3.4 [ambientCG](#34-ambientcg)
   - 3.5 [cc0textures.com (legacy)](#35-cc0texturescom-legacy)
   - 3.6 [Wikimedia Commons — `Category:Paper_textures`](#36-wikimedia-commons--categorypaper_textures)
   - 3.7 [Texturelabs.org](#37-texturelabsorg)
   - 3.8 [OpenGameArt.org (OGA)](#38-opengameartorg-oga)
   - 3.9 [rawpixel — CC0 paper textures](#39-rawpixel--cc0-paper-textures)
   - 3.10 [Pixabay](#310-pixabay)
   - 3.11 [StockSnap](#311-stocksnap)
   - 3.12 [textures.com (free section + premium)](#312-texturescom-free-section--premium)
   - 3.13 [Poly Haven](#313-poly-haven)
   - 3.14 [GitHub repos that bundle free paper textures](#314-github-repos-that-bundle-free-paper-textures)
   - 3.15 [npm packages](#315-npm-packages)
4. [Texture aesthetic taxonomy for the SAC site](#4-texture-aesthetic-taxonomy-for-the-sac-site)
5. [Integration patterns](#5-integration-patterns)
6. [Recommended drop-in file inventory for SAC](#6-recommended-drop-in-file-inventory-for-sac)
7. [Sources cited](#7-sources-cited)

---

## 1. TL;DR — what to actually use

For a static, no-build newspaper-themed site that wants photographic paper quality without licensing pain, the **best free sources by use case** are:

| Use case | Best free source | License | Format | Avg size |
|---|---|---|---|---|
| **Hero/landing full-page paper background** | [Unsplash](https://unsplash.com/s/photos/paper-texture) (hotlink via API) | Unsplash License (no attribution required, attribution appreciated) | JPEG | 200 KB – 2 MB |
| **Tiled texture for repeating paper grain** | [ambientCG `Paper00x`](https://ambientcg.com/list?type=PhotoTexture&category=Paper) | CC0 | PNG / JPG / WebP | 1K JPG zip ≈ 5–8 MB; single tile PNG ≈ 0.5–1.5 MB |
| **Vintage newsprint / kraft paper authenticity** | [Texturelabs Paper 366–378](https://texturelabs.org/?ct=666) (Newspaper front page, Antique newspaper, Vintage newspaper, Vintage white cardboard) | Custom free-use (no attribution required, redistribution forbidden) | JPEG | 0.5–4 MB at `large` size |
| **Public-domain hero images** (museum scans) | [Wikimedia Commons `Category:Paper_textures`](https://commons.wikimedia.org/wiki/Category:Paper_textures) | Mixed: CC0, CC-BY, CC-BY-SA, public domain | JPEG / PNG / TIFF | 0.1–20 MB |
| **Drop-in SVG patterns (no JS, tiny files)** | [transparenttextures.com](https://www.transparenttextures.com/) | MIT-style free use (artist credit in tool UI) | PNG | 6–140 KB |
| **Small in-repo asset bundle** (CC0) | [`Null-MC/Oversized`](https://github.com/Null-MC/Oversized) or [`Calinou/seamless-textures`](https://github.com/Calinou/seamless-textures) | CC0 | PNG / JPG | 1–3 MB |

**Three-line integration recommendation:**

1. **Background grain / noise:** transparenttextures.com pattern as a small tiled PNG (≤ 50 KB) — zero cost, instant.
2. **Hero full-bleed paper:** one ambientCG `Paper00x` 1K PNG, served from `/public/assets/textures/`, applied as `background-image` with `background-blend-mode: multiply` over an off-white base color.
3. **Specialty aging (foxing, torn edges, halftone):** 2–3 Texturelabs Paper 300-series or Wikimedia Commons scans for overlays, served as separate `<img>` with `mix-blend-mode` and low opacity (15–25%).

---

## 2. Master comparison table

| # | Source | Type | License | Attribution required? | Best format(s) for SAC | Avg file size (one paper texture) | CDN / hosting | Direct paper texture page |
|---|---|---|---|---|---|---|---|---|
| 1 | [transparenttextures.com](https://www.transparenttextures.com/) | SVG-pattern (raster PNG, used as `background-image`) | Free to use, no formal license page; pattern authors credited in the picker UI | No (credit appreciated) | PNG, 100–500 px tiles | 6–140 KB | Hosted at `transparenttextures.com/patterns/<name>.png`; CC0 / public CDN-friendly | https://www.transparenttextures.com/ |
| 2 | [Unsplash](https://unsplash.com/s/photos/paper-texture) | Photographic stock | [Unsplash License](https://unsplash.com/license) — free use, no permission needed | **No** (appreciated) | JPEG | 200 KB – 2 MB | `images.unsplash.com/photo-<id>?w=1920` | https://unsplash.com/s/photos/paper-texture |
| 3 | [Pexels](https://www.pexels.com/search/paper-texture/) | Photographic stock | [Pexels License](https://www.pexels.com/license/) | **No** (appreciated) | JPEG | 150 KB – 1.5 MB | `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg` | https://www.pexels.com/search/paper-texture/ |
| 4 | [ambientCG](https://ambientcg.com/list?type=PhotoTexture&category=Paper) | PBR-grade flat textures, tileable | **CC0 1.0** (full commercial use, no attribution) | **No** | JPG / PNG / WebP | 1K JPG ≈ 5–8 MB; individual files inside the zip ≈ 0.5–1.5 MB | Hosted at `ambientcg.com/get?file=...`; jsDelivr/CDN-able via backblaze mirror | https://ambientcg.com/list?type=PhotoTexture&category=Paper |
| 5 | [cc0textures.com](https://cc0textures.com/list.php?category=paper) | PBR-grade (older sibling site to ambientCG; largely superseded) | CC0 | **No** | JPG / PNG | ~5–15 MB per asset | Direct download | https://cc0textures.com/list.php?category=paper |
| 6 | [Wikimedia Commons — `Category:Paper_textures`](https://commons.wikimedia.org/wiki/Category:Paper_textures) | Scans of real paper, parchment, kraft | Mixed: CC0 / public domain / CC-BY / CC-BY-SA (each file page lists the exact license) | Depends — most are CC0/PD; CC-BY files need attribution | JPEG / PNG / TIFF | 100 KB – 20 MB | `upload.wikimedia.org/wikipedia/commons/<hash>/<file>` | https://commons.wikimedia.org/wiki/Category:Paper_textures |
| 7 | [Texturelabs.org](https://texturelabs.org/?ct=666) | Photographic + illustrated overlays | [Custom free-use EULA](https://texturelabs.org/terms/) — commercial OK, no attribution, no redistribution | **No** (appreciated) | JPEG / PNG | 0.5–4 MB at `large` | Direct download from `texturelabs.org/wp-content/uploads/` | https://texturelabs.org/?ct=666 |
| 8 | [OpenGameArt.org](https://opengameart.org/art-search-advanced?keys=paper+texture&field_art_type_tid%5B%5D=9) | Hand-drawn / photographic paper textures | Mostly **CC0** or **CC-BY** (per item) | Varies | PNG / JPEG | 90 KB – 2 MB | Direct download from `opengameart.org/sites/default/files/` | https://opengameart.org/art-search-advanced?keys=paper+texture&field_art_type_tid%5B%5D=9 |
| 9 | [rawpixel — Paper Texture](https://www.rawpixel.com/category/53/paper-texture) | Scanned vintage paper, often from museum collections | Public Domain / CC0 | **No** | JPEG / PNG | 1–10 MB | Direct download (signup sometimes required) | https://www.rawpixel.com/category/53/paper-texture |
| 10 | [Pixabay](https://pixabay.com/images/search/paper%20texture/) | Photographic stock + vectors | [Pixabay Content License](https://pixabay.com/service/license-summary/) — no attribution required; no standalone resale | **No** | JPEG / PNG | 200 KB – 3 MB | `cdn.pixabay.com/photo/...` | https://pixabay.com/images/search/paper%20texture/ |
| 11 | [StockSnap](https://stocksnap.io/) | Photographic stock | **CC0** | **No** | JPEG | 300 KB – 5 MB | Direct download | https://stocksnap.io/ (search "paper texture") |
| 12 | [textures.com](https://www.textures.com/) | Photographic, scanned materials | Proprietary — free tier is **watermarked low-res preview**; full-resolution requires subscription; per their FAQ redistribution is restricted even for free assets | **No**, but **redistribution is forbidden** | JPEG (low-res preview) | ~0.5 MB for free preview; premium ~15–30 MB | Direct from `textures.com/download/<asset>/<id>` | https://www.textures.com/texstyles/paper |
| 13 | [Poly Haven](https://polyhaven.com/textures) | PBR-grade scans | **CC0** | **No** | JPEG / EXR | 5–30 MB per asset | Hosted on polyhaven CDN; hotlink-friendly | https://polyhaven.com/textures (no paper category — see notes) |
| 14 | GitHub: [`Null-MC/Oversized`](https://github.com/Null-MC/Oversized) | Bundled free textures | CC0 | **No** | PNG | varies | GitHub raw / release zip | https://github.com/Null-MC/Oversized |
| 15 | GitHub: [`Calinou/seamless-textures`](https://github.com/Calinou/seamless-textures) | Seamless PBR-style photo textures | CC0 | **No** | JPG | 1–2 MB per map; no paper-specific textures | GitHub raw | https://github.com/Calinou/seamless-textures |
| 16 | GitHub: [`ModsByMorgue/PUBLIC_DOMAIN_TEXTURES`](https://github.com/ModsByMorgue/PUBLIC_DOMAIN_TEXTURES) | 100 seamless 750×750 public-domain textures | Public Domain | **No** | PNG (single 15 MB zip) | ~150 KB per tile | GitHub release | https://github.com/ModsByMorgue/PUBLIC_DOMAIN_TEXTURES |
| 17 | GitHub: [`malcolmriley/unused-textures`](https://github.com/malcolmriley/unused-textures) | 16×16 RGBA Minecraft-style sprites | **CC-BY 4.0** | **Yes** | PNG | 5–50 KB | GitHub raw | https://github.com/malcolmriley/unused-textures |
| 18 | GitHub: [`MerlinDog1/free-texture-library`](https://github.com/MerlinDog1/free-texture-library) | Seamless design textures | None declared in repo metadata | Treat as "ask first" | PNG | varies | GitHub raw | https://github.com/MerlinDog1/free-texture-library |
| 19 | npm: [`riccardoscalco/textures`](https://github.com/riccardoscalco/textures) | **SVG pattern generator library**, not raster textures | MIT | **No** | generated SVG | N/A (code library) | npm install | https://www.npmjs.com/package/textures |
| 20 | npm: [`@paper-design/shaders`](https://www.npmjs.com/package/@paper-design/shaders) | Shader effects (not paper-specific) | Custom "SEE LICENSE IN LICENSE" (free, but check) | **No** for SAC use | WebGL | N/A | npm install | https://www.npmjs.com/package/@paper-design/shaders |

---

## 3. Source-by-source notes

### 3.1 transparenttextures.com (SVG patterns)

- **URL:** https://www.transparenttextures.com/
- **License:** Free to use, no formal license page. Each pattern credits its author in the picker UI. The site is the maintained successor to the now-defunct "Subtle Patterns". Patterns are licensed by their original authors; attribution is appreciated but not enforced.
- **Format:** PNG (small tiles, typically 100×100 to 500×500 px), designed for `background-image` use with `background-blend-mode` over a chosen tint color.
- **File size:** Verified via curl during this audit:
  - `handmade-paper.png` — 6.5 KB
  - `cream-paper.png` — 11.8 KB
  - `lined-paper.png` — 15 KB
  - `beige-paper.png` — 22 KB
  - `white-paperboard.png` — 30 KB
  - `groovepaper.png` — 36 KB
  - `crisp-paper-ruffles.png` — 47 KB
  - `paper.png` — 75 KB
  - `paper-fibers.png` — 73 KB
  - `textured-paper.png` — 140 KB
  - `natural-paper.png` — 101 KB
- **Integration:** Reference by full URL in CSS:
  ```css
  body {
    background-color: #f3ead7;
    background-image: url("https://www.transparenttextures.com/patterns/natural-paper.png");
    background-blend-mode: multiply;
  }
  ```
- **Newspaper / aged-paper matches:**
  - `natural-paper`, `paper-2`, `paper-3`, `rice-paper`, `rice-paper-2`, `rice-paper-3` — warm off-white fiber paper.
  - `handmade-paper`, `groovepaper`, `embossed-paper`, `textured-paper`, `paper-fibers`, `light-paper-fibers` — more tactile, pulp-y grain.
  - `cream-paper`, `beige-paper`, `clean-gray-paper` — flat tints for muted backgrounds.
  - `notebook`, `notebook-dark`, `lined-paper`, `lined-paper-2` — ruled-paper grid (good for "letter to the editor" feel).
  - `cardboard`, `cardboard-flat`, `crisp-paper-ruffles` — cardstock / cover-paper weight.
- **Caveats:**
  - The site has no `/pages/license` or `/pages/terms-of-use` — the patterns are published under "free to use" but the site doesn't carry a single canonical license text. Treat as "use freely, attribution optional" similar to Subtle Patterns.
  - The author credit is **not** legally required but is the polite norm.
  - CDN host: `transparenttextures.com/patterns/<name>.png`. There is no first-party JS SDK; you grab the file path.

### 3.2 Unsplash

- **URL:** https://unsplash.com/s/photos/paper-texture
- **License:** [Unsplash License](https://unsplash.com/license) — "do anything you want, except sell unaltered photos". **No attribution required** for use, though it is appreciated.
- **Format:** JPEG (also WebP via CDN). Sizes: `raw`, `full`, `regular`, `small`, `thumb`.
- **File size:** 200 KB – 2 MB per image at 1920 px wide.
- **API:** Hotlinking is the **officially-supported** integration ([Hotlinking guideline](https://help.unsplash.com/en/articles/2511271-unsplash-source-guidelines)). Use the `urls.regular` or `urls.custom` field from the Unsplash API; do not re-host on your own CDN without contacting partnerships@unsplash.com.
- **Sample matches for the SAC aesthetic:**
  - Search "paper texture" → 4.7K results.
  - Search "old paper texture" → 642K results.
  - Search "parchment" → 4K results.
  - Search "newsprint" → returns printed-page scans.
- **Caveats:**
  - Photos are editorial-quality and beautifully lit — but they are also **busy** with shadows, creases, and uneven lighting. For a flat grain they may be **too dramatic** and need `mix-blend-mode: multiply` over a neutral background to feel like printed newsprint.
  - Unsplash content is not CC0; redistribution rules apply (don't re-sell an Unsplash photo as-is, don't compile them into a stock photo library).
  - The API is free for low-volume sites (50 requests/hour demo key); for SAC's static site the recommended path is hand-picked URLs from the browser, then pasted into CSS.

### 3.3 Pexels

- **URL:** https://www.pexels.com/search/paper-texture/
- **License:** [Pexels License](https://www.pexels.com/license/) — free for personal and commercial use, no attribution required. Cannot be sold standalone or redistributed as a competing stock library.
- **Format:** JPEG (and WebP via `?auto=compress&cs=tinysrgb&dpr=1&w=...`).
- **File size:** 150 KB – 1.5 MB at 1920 px.
- **CDN:** `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1920`.
- **Sample matches:**
  - "paper-texture" → 4.7K photos.
  - "old-paper-texture" → 642K photos.
  - "vintage-paper" → 351K photos.
  - "parchment" → 4K photos.
  - "kraft-paper" → dedicated collection of 58 photos.
- **Caveats:**
  - Same caveat as Unsplash: photos are editorial, not flat tiles. Often **portrait-oriented** or shot under a directional light that won't tile cleanly.
  - Pexels content has a "collections" feature — search for ["Paper Textures" collection](https://www.pexels.com/collections/paper-textures-fq8vbmm/) (58 photos) for a curated set.
  - For tiled use, the right Pexels images are the top-down flat-lay scans like `pexels-photo-7598248.jpeg` and `pexels-photo-5506216.jpeg`.

### 3.4 ambientCG

- **URL:** https://ambientcg.com/list?type=PhotoTexture&category=Paper
- **License:** [CC0 1.0 Universal](https://docs.ambientcg.com/license/) — no attribution required, commercial use OK, can be included in any project (including games, generative art, AI training data).
- **Format:** JPG / PNG / WebP. **PBR map sets** (Color, Normal, Displacement, Roughness, AO) inside one ZIP per resolution tier (1K / 2K / 4K / 8K).
- **File size:** 1K JPG zip ≈ 5 MB; individual color PNG ≈ 1.5 MB at 1K, ≈ 35 MB at 4K; the 8K PNG zip can hit 941 MB.
- **Paper assets confirmed live on the site (as of June 2026):**

  | Asset | Tags | Released | Approx color map size (1K JPG) |
  |---|---|---|---|
  | [`Paper001`](https://ambientcg.com/a/Paper001) | Paper, White | 2018-01-20 | 5 MB |
  | [`Paper002`](https://ambientcg.com/a/Paper002) | Brown, Cartonage, Paper | 2018-01-20 | 5 MB |
  | [`Paper003`](https://ambientcg.com/a/Paper003) | Creased, Paper, White | 2018-08-30 | — |
  | [`Paper004`](https://ambientcg.com/a/Paper004) | Brown, Package, Packing, Paper | 2021-06-27 | 8 MB |
  | [`Paper005`](https://ambientcg.com/a/Paper005) | Brown, Cardboard, Packaging, Paper | 2022-09-25 | — |
  | [`Paper006`](https://ambientcg.com/a/Paper006) | Beige, Brown, Paper | 2023-03-03 | — |

  - `Paper001` is the canonical clean white newsprint-ish surface — the most "SAC landing page" option.
  - `Paper002` and `Paper005` are kraft-brown cardstock; `Paper004` is packing paper.
  - For ages-old parchment / newsprint feel, apply color filters in CSS (`filter: sepia(0.4) contrast(1.1)`) — pure photographic white doesn't look "aged" by itself.

- **Integration:**
  - The `Paper00x_1K-PNG.zip` file contains `Paper00x_Color.png`, `Paper00x_NormalDX.png`, `Paper00x_Displacement.png`, `Paper00x_Roughness.png`. Only the **Color** map is needed for a 2D web background; the others are for 3D engines.
  - Place the color PNG at `/public/assets/textures/paper-001.png` and reference it from CSS.
- **Caveats:**
  - Resolution is **per-tile**; these are seamless tiles intended for 3D UV unwrapping, so they work perfectly as `background-repeat` patterns.
  - There is no "newsprint" or "old document" category — only generic "Paper", "Cardboard", "Chipboard". For aging effects, use the white Paper001 and tint it.
  - Download URL pattern: `https://ambientcg.com/get?file=Paper001_1K-JPG.zip` (requires no auth).

### 3.5 cc0textures.com (legacy)

- **URL:** https://cc0textures.com/list.php?category=paper
- **License:** [CC0 1.0](https://cc0textures.com/license.php) — identical to ambientCG. Same author (ambientcg / Lennart Demes). cc0textures.com is the older domain and is **largely superseded by ambientCG**; the asset catalog there is smaller.
- **Format:** JPG / PNG, PBR map sets, ZIP archives by resolution tier.
- **Caveats:**
  - The site still serves assets and licenses itself as CC0; safe to use. For new work, prefer ambientCG since it has fresher uploads.
  - HTTPS mixed-content warnings are common on legacy cc0textures.com URLs.

### 3.6 Wikimedia Commons — `Category:Paper_textures`

- **URL:** https://commons.wikimedia.org/wiki/Category:Paper_textures (101 files in the category as of June 2026)
- **License:** **Mixed — always check the individual file page.** The category contains:
  - Public domain (museum scans, 19th-century documents)
  - CC0 dedications by individual photographers
  - CC-BY 2.0 (Flickr imports, attribution required)
  - CC-BY-SA (share-alike — restricts derivative works)
- **Format:** Mostly JPEG, some PNG, a few TIFF scans up to 90 MB.
- **File size:** 100 KB (low-res scans) to 90 MB (multi-frame TIFFs of charcoal sketches).
- **Best-matched file URLs (sampled during this audit):**
  - [Old paper1–7, Oldpapertexture01–02](https://commons.wikimedia.org/wiki/File:Old_paper1.jpg) — 2,448 × 3,264, public-domain old-paper scans (CC0/public-domain release by Digital Yard Sale).
  - [Free-paper-texture-27](https://commons.wikimedia.org/wiki/File:Free-paper-texture-27.jpg) — 610 × 507, CC-BY-SA by Emayra.
  - [Vintage Paper Texture](https://commons.wikimedia.org/wiki/File:Vintage_Paper_Texture_(9789792113).jpg) — 2,194 × 2,794, CC-BY (Flickr import).
  - [Free dark vintage paper page texture for layers](https://commons.wikimedia.org/wiki/File:Free_dark_vintage_paper_page_texture_for_layers_(2982207584).jpg) — 2,848 × 4,272, CC-BY (Flickr import).
  - [Wrinkled Paper Texture Free Creative Commons](https://commons.wikimedia.org/wiki/File:Wrinkled_Paper_Texture_Free_Creative_Commons_(6816216700).jpg) — 5,616 × 3,744, CC-BY (Flickr import).
  - [News3.jpg](https://commons.wikimedia.org/wiki/File:News3.jpg) — 2,400 × 3,324, CC-BY-SA — actual newsprint scan.
  - [Kraft tileable 1024×1024.png](https://commons.wikimedia.org/wiki/File:Kraft_tileable_1024x1024.png) — 1,024 × 1,024, public-domain kraft sample.
- **Integration:**
  - Direct CDN URL pattern: `https://upload.wikimedia.org/wikipedia/commons/<hash>/<file>`.
  - Example: `https://upload.wikimedia.org/wikipedia/commons/4/4f/Old_paper1.jpg`.
  - Use the thumb URLs for hero (`?w=1920`) so you don't ship multi-MB files.
- **Caveats:**
  - **Always verify the per-file license** on its `File:` page. Several "free" textures there are CC-BY or CC-BY-SA, which require attribution and (for BY-SA) propagate share-alike terms to your CSS asset pipeline.
  - The CC-BY-SA items are **not safe** for SAC if the texture is going to be edited/composited and the SAC site is itself proprietary — the share-alike clause could require the entire work to be relicensed.
  - The cleanest pick from this category for CC0/public-domain use is the **Old paper 1–7** series (released into the public domain by Digital Yard Sale).

### 3.7 Texturelabs.org

- **URL:** https://texturelabs.org/?ct=666 (Paper category, 245 textures)
- **License:** [Custom EULA](https://texturelabs.org/terms/) — commercial use OK, no attribution required, **no redistribution** (cannot re-host the textures themselves, cannot bundle them in a texture pack or sell them as stock). Cannot be used to train AI image generators.
- **Format:** JPEG / PNG (alpha-channel PNGs for overlays).
- **File size:** 0.5 – 4 MB at `large` (4240 × 2828 px); original x-large scans go to ~17,000 × 16,000 px.
- **Newspaper / aged-paper highlights:**

  | Asset | Description | x-large resolution |
  |---|---|---|
  | [Paper 366](https://texturelabs.org/textures/paper_366) | **Newspaper front page** — folded vintage newspaper with creases and subtle print texture | 6036 × 4781 |
  | [Paper 377](https://texturelabs.org/textures/paper_377) | **Antique newspaper** — yellowed vintage newspaper with visible print layout | 7132 × 5103 |
  | [Paper 378](https://texturelabs.org/textures/paper_378) | **Vintage newspaper** — aged paper with faded headlines | 7089 × 4639 |
  | [Paper 372](https://texturelabs.org/textures/paper_372) | Heavy weathered poster overlay | 5304 × 7286 |
  | [Paper 363](https://texturelabs.org/textures/paper_363) | Vintage white cardboard with creases, staining | 6257 × 5225 |
  | [Paper 364](https://texturelabs.org/textures/paper_364) | Folded black paper with distress | 7551 × 5139 |
  | Paper 359 / 360 / 361 / 374 / 375 | Solid black paper / pulpy book covers | ~7952 × 5304 |
  | Paper 380 / 381 | Antique blueprint with wrinkles, torn edges | ~7952 × 5835 |
  | Paper 348 / 349 | Macro detail paper, clean vintage overlay | 7952 × 5304 |
  | Paper 367 / 368 / 369 / 370 / 371 | Torn sheets and frames with rough edges | 6000–17000 px wide |

- **Caveats:**
  - The **distribution restriction** means SAC must NOT serve Texturelabs textures from `/public/assets/textures/` as if we were a stock site — but linking to them on `texturelabs.org` from a `<link>` is fine, or downloading and using them internally is fine.
  - The "antique newspaper" and "vintage newspaper" assets here are the closest thing in the free-texture ecosystem to authentic 1940s newsprint.
  - The PNG overlays (Paper 367–371) are great for `mix-blend-mode: multiply` over an off-white base.

### 3.8 OpenGameArt.org (OGA)

- **URL:** https://opengameart.org/art-search-advanced?keys=paper+texture&field_art_type_tid%5B%5D=9
- **License:** Mostly **CC0** or **CC-BY** (each item declares its own license).
- **Format:** PNG / JPEG / XCF (GIMP source).
- **File size:** 90 KB – 2 MB.
- **Confirmed paper / parchment assets:**
  - [`/content/parchment`](https://opengameart.org/content/parchment) — "A parchment on black background in iPhone size" by Mattias Lejbrink, **CC0**. File: `Parchment.png` 215.8 KB.
  - [`/content/parchment-background`](https://opengameart.org/content/parchment-background) — by Felis Chaus, **CC0**. File: `FelisChaus_ParchmentBackground.jpg` 90.4 KB, 1123 downloads.
  - [`/content/old-parchment-paper`](https://opengameart.org/content/old-parchment-paper) — "An old piece of paper", license not shown in initial fetch, file: `parchment.jpg`.
- **Caveats:**
  - Game-asset-focused — items are typically small (1,000 × 1,500 px or smaller) and may include motifs from game art (cards, dialog boxes) rather than pure paper.
  - Worth a deeper browse but not a primary source.

### 3.9 rawpixel — Paper Texture

- **URL:** https://www.rawpixel.com/category/53/paper-texture (264 CC0 results)
- **License:** Public Domain / CC0 (rawpixel brands itself as "Public Domain Vintage Design Resources").
- **Format:** JPEG / PNG / PSD / TIFF.
- **File size:** 1–10 MB.
- **Caveats:**
  - rawpixel requires a free account for full-resolution downloads.
  - Many of the textures are scans from real 19th-century books and ephemera — exactly the "aged newsprint / old document" aesthetic SAC wants.
  - Bulk download is limited; for one-off hero images this is excellent.

### 3.10 Pixabay

- **URL:** https://pixabay.com/images/search/paper%20texture/
- **License:** [Pixabay Content License](https://pixabay.com/service/license-summary/) — free for commercial use, no attribution required, **cannot be resold standalone**.
- **Format:** JPEG / PNG.
- **File size:** 200 KB – 3 MB.
- **CDN:** `https://cdn.pixabay.com/photo/<yyyy>/<mm>/<dd>/<hh>/<mm>/<name>-<id>_1280.jpg`.
- **Sample matches:**
  - "Paper Scrapbook" (`photo-1914901`) — clean beige paper with subtle texture.
  - "Paper Wallpaper 4K" (`photo-1074131`) — old parchment-style background.
  - "Old Texture" (`illustration-2012064`) — crumpled paper illustration.
  - "Papertexture Texture" (`illustration-2061710`, `2061711`) — flat paper illustrations.
  - "Sütterlin Handwriting" (`photo-1362879`) — German handwriting on paper.
  - "Old Pages Literature" (`photo-10225493`) — historical printed pages.
- **Caveats:**
  - Pixabay contains both **photographs** and **vector illustrations**. The "paper texture" search includes both — filter by photo for our use case.
  - Same editorial-busy caveat as Unsplash/Pexels.

### 3.11 StockSnap

- **URL:** https://stocksnap.io/ (search "paper texture")
- **License:** **CC0** (every image, all the time).
- **Format:** JPEG.
- **File size:** 300 KB – 5 MB.
- **Caveats:**
  - Smaller catalog than Unsplash/Pexels (typically ~50–200 results for "paper texture" vs 4.7K on Pexels).
  - CC0 is cleaner for redistribution, so StockSnap is a better pick if SAC ever wants to bundle textures into a `/public/assets/textures/` directory for self-hosting.

### 3.12 textures.com (free section + premium)

- **URL:** https://www.textures.com/texstyles/paper
- **License:** Proprietary. Free tier delivers a **watermarked, low-resolution preview**; the **full-resolution download requires a paid subscription**. Per the FAQ, redistribution is forbidden even for free tier assets — they are not CC0.
- **Format:** JPEG.
- **File size:** Free preview ≈ 0.5 MB; full-resolution ≈ 15–30 MB.
- **Sample matches:**
  - "Old Newspaper 001" → category page exists but requires login/download to access.
- **Caveats:**
  - **Not recommended** for SAC. The free tier is watermarked (visual watermark on the image), and the license forbids redistribution even for the free preview. The site is also JavaScript-rendered so direct hotlinking is impossible.
  - If you want premium-quality commercial textures from a paid library, look at [Poliigon](https://www.poliigon.com/textures/free) or [Substance](https://substance3d.adobe.com/assets/) instead.

### 3.13 Poly Haven

- **URL:** https://polyhaven.com/textures
- **License:** **CC0** for all assets.
- **Caveats:**
  - Poly Haven does **not have a Paper category**. The categories are: Tiles, Bricks, Concrete, Wood, Metal, Marble, etc. — architectural / 3D art focus.
  - For SAC's newspaper / paper needs, Poly Haven is **not directly useful**, but their PBR-photography pipeline (clean flat top-down scans, perfect tile-ability, 8K resolution) is the gold standard. If they ever add a Paper category, ambientCG would become secondary.

### 3.14 GitHub repos that bundle free paper textures

| Repo | Stars | License | Paper-specific? | Notes |
|---|---|---|---|---|
| [`Null-MC/Oversized`](https://github.com/Null-MC/Oversized) | 11 | CC0 | No (general PBR pack — no paper items as of audit) | Small collection of public-domain textures. Useful as a reference for CC0 PBR organization. |
| [`Calinou/seamless-textures`](https://github.com/Calinou/seamless-textures) | 6 | CC0 (per `LICENSE.txt`) | No (grass, gravel, wood — no paper at the time of audit) | Single-author CC0 PBR set. Photo-derived. Files named `*_c.jpg` (color), `*_n.jpg` (normal), `*_s.jpg` (specular), `*_z.jpg` (parallax). |
| [`ModsByMorgue/PUBLIC_DOMAIN_TEXTURES`](https://github.com/ModsByMorgue/PUBLIC_DOMAIN_TEXTURES) | 0 | Public Domain | No (generic 100 seamless 750×750 textures; "could include paper-like noise") | Single 15 MB zip: `pdtextures.zip`. |
| [`malcolmriley/unused-textures`](https://github.com/malcolmriley/unused-textures) | 500 | **CC-BY 4.0** | No (16×16 RGBA sprites; mostly Minecraft pixel art) | Requires attribution. Not paper-themed but a clean CC-BY attribution template. |
| [`MerlinDog1/free-texture-library`](https://github.com/MerlinDog1/free-texture-library) | 0 | None declared | Possibly — described as "seamless textures for sign industry & design" | Unverified; treat as "no license, ask first". |
| [`Poly-Haven/polyhavenassets`](https://github.com/Poly-Haven/polyhavenassets) | 493 | GPL-3.0 | No (Blender add-on code, not the textures) | Add-on to integrate Poly Haven assets into Blender. |
| [`VenitStudios/AmbientCG`](https://github.com/VenitStudios/AmbientCG) | 118 | CC0 | No (mirror/unrelated) | — |

**For a self-hosted CC0 paper texture bundle, the GitHub ecosystem is currently thin.** The best option is to download the `Paper00x` assets from ambientCG directly and commit them to `/public/assets/textures/` (CC0 permits this).

### 3.15 npm packages

| Package | What it is | License | Useful for SAC? |
|---|---|---|---|
| [`textures`](https://github.com/riccardoscalco/textures) (riccardoscalco) | **JavaScript library** that generates SVG patterns (no raster textures). 6,087 stars, MIT. | MIT | **Yes** — but for SVG pattern generation, not paper photos. Useful as a JS-based alternative to transparenttextures.com if you want dynamic color/rotation. Not a paper-source. |
| [`@paper-design/shaders`](https://www.npmjs.com/package/@paper-design/shaders) | WebGL shaders for paper-like effects (mesh gradients, dot orbit, etc.). 1.6M weekly downloads. | "SEE LICENSE IN LICENSE" | Borderline — these are **shader effects**, not paper textures. Could provide an animated paper grain if WebGL is acceptable. |
| `paper` (npm) | Multi-purpose vector graphics framework for HTML5 Canvas. ~750K weekly downloads. | MIT | **No** for our use — it's an animation/canvas library. |
| `paper-css` | Deprecated paper-effect CSS-only library. | MIT | **No** — abandoned; not relevant. |
| `paperize` | Not a real package; occasionally appears as a typo for `paperjs`. | N/A | N/A |

**The honest answer:** there is **no npm package** that bundles free paper textures. The npm ecosystem is for code, not asset bundles. For pre-bundled assets, look at the GitHub repos above or just `npm install --save-dev` a build script that downloads from ambientCG at install time.

---

## 4. Texture aesthetic taxonomy for the SAC site

Mapping the free sources to the "newspaper / old paper" aesthetic targets the rest of the `docs/` folder establishes:

| Target | Description | Best source(s) | Specific texture name(s) |
|---|---|---|---|
| **Fresh newsprint, white-ish** | Slightly off-white, smooth, faint fiber grain — like a paper just off the press. | ambientCG | `Paper001`, `Paper003` (creased white) |
| **Aged 10-year newsprint** | Warm yellow tint, still readable. | Wikimedia Commons | `Vintage_Paper_Texture_(9789792113).jpg` + `filter: sepia(0.3)` |
| **Aged 50-year newsprint** | More yellow/brown, slightly mottled. | Texturelabs | `Paper 377 — Antique newspaper` |
| **Aged 100-year newsprint** | Heavy yellowing, brittle, edge-wear, foxing. | Wikimedia Commons | `Brown_paper_bag_texture.jpg`, plus overlay from `texture325-14` |
| **Kraft / cardboard** | Brown packing paper. | ambientCG | `Paper002`, `Paper004`, `Paper005` |
| **Parchment / vellum** | Creamy, translucent, formal. | OGA | `parchment-background` by Felis Chaus |
| **Torn / fragmented edges** | Ripped paper for "missing section" or "classified" effects. | Texturelabs | `Paper 367–371` (torn sheets & frames) |
| **Halftone print dots** | Visible newsprint dot pattern. | transparenttextures | `groovepaper`, `paper-fibers` |
| **Noise / paper grain only** | Subtle non-repeating grain that adds tactile feel. | transparenttextures | `handmade-paper`, `cream-dust`, `light-paper-fibers` |
| **Ruled paper / letter writing** | Horizontal lines for "letter to the editor". | transparenttextures | `lined-paper`, `lined-paper-2`, `notebook` |
| **Book cover / hardcover** | Solid color paper with embossed title area. | Texturelabs | `Paper 359 — Vintage book cover`, `Paper 364 — Distress folds` |

---

## 5. Integration patterns

### 5.1 SVG-pattern (transparenttextures.com) — instant, zero build

```css
body {
  background-color: #f3ead7;
  background-image:
    url("https://www.transparenttextures.com/patterns/natural-paper.png");
  background-repeat: repeat;
  background-blend-mode: multiply;
}
```

**Cost:** ~100 KB total transfer on first page load; cached thereafter. **License risk:** very low (free use, attribution optional).

### 5.2 Self-hosted ambientCG PNG tile — best balance of quality and control

```
public/assets/textures/
├── paper-grain-1k.png       ← ambientCG Paper001 1K color PNG (~1.5 MB)
├── paper-grain-1k@2x.png    ← optional 2K version
└── README.md                ← credit: ambientCG.com, CC0
```

```css
:root {
  --paper-grain: url("/assets/textures/paper-grain-1k.png");
}
body {
  background-color: #efe6d2;
  background-image: var(--paper-grain);
  background-repeat: repeat;
  background-size: 1024px 1024px;
}
```

**Cost:** 1.5 MB transfer first load, then cached. **License risk:** zero (CC0).

### 5.3 Hero image (Unsplash / Pexels / Wikimedia) — single, dramatic

```html
<header class="hero" style="--hero-bg: url('/assets/hero-paper.jpg');">
  <h1>The Student Activity Council</h1>
</header>
```

```css
.hero {
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center;
  background-blend-mode: multiply;
  /* If the source photo has harsh shadows, darken for contrast: */
  background-color: rgba(0,0,0,0.15);
}
```

**Recommendation:** for hero, use a **Wikimedia Commons public-domain scan** (Old paper1.jpg etc.) so there is **zero licensing risk** even for redistribution into a git submodule.

### 5.4 Aged-overlay pattern (multi-layer with blend modes)

```css
body::before {
  /* Foxing / dust speckle */
  content: "";
  position: fixed; inset: 0;
  background-image: url("/assets/textures/foxing-overlay.png");
  background-repeat: repeat;
  mix-blend-mode: multiply;
  opacity: 0.18;
  pointer-events: none;
}
body::after {
  /* Vignette */
  content: "";
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at center,
    transparent 50%, rgba(40, 25, 10, 0.35) 100%);
  pointer-events: none;
}
```

This combines a single photographic paper background with a transparent foxing/dust overlay (also from ambientCG or Texturelabs) for an aged effect that **doesn't require editing the base paper image**.

### 5.5 Data-URI for tiny SVG-style noise (self-contained, zero external request)

```css
body {
  background-color: #f3ead7;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0 0.2 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
```

This is the **most SAC-friendly** approach for a "drop-in" upgrade: SVG `<feTurbulence>` noise generated inline, no external request, fully self-contained, no licensing at all. Already explored in `docs/svg-filters-for-paper.md`.

---

## 6. Recommended drop-in file inventory for SAC

Concretely, if we add a `/public/assets/textures/` directory, here is the minimal drop-in set:

| File | Source | License | Size | Purpose |
|---|---|---|---|---|
| `paper-grain-natural.png` | transparenttextures.com `/patterns/natural-paper.png` | Free use | ~101 KB | Repeating warm off-white paper grain |
| `paper-grain-cream.png` | transparenttextures.com `/patterns/cream-paper.png` | Free use | ~12 KB | Lighter cream tint variant |
| `paper-grain-fibers.png` | transparenttextures.com `/patterns/paper-fibers.png` | Free use | ~73 KB | Visible pulp fiber detail |
| `paper-grain-rice.png` | transparenttextures.com `/patterns/rice-paper-2.png` | Free use | ~132 KB | Heavier rice paper texture |
| `paper-newsprint-1k.jpg` | ambientCG Paper001 1K JPG color map | CC0 | ~5 MB | Clean white flat paper, tileable |
| `paper-kraft-1k.jpg` | ambientCG Paper002 1K JPG color map | CC0 | ~5 MB | Kraft brown paper, tileable |
| `paper-newsprint-hero.jpg` | Wikimedia Commons Old paper1 (or Vintage_Paper_Texture) | Public domain / CC-BY | ~2 MB | Hero image — full bleed |
| `paper-aged-overlay.png` | Texturelabs Paper 361 (old paper overlay) | Texturelabs EULA | ~2 MB | Aged foxing/dust overlay |
| `paper-torn-frame.png` | Texturelabs Paper 368 (torn article frame) | Texturelabs EULA | ~2 MB | Ripped-edge overlay for "classified" sections |

**Total transfer (uncached):** ~17 MB. **Cached transfer on repeat visits:** ~0 KB (HTTP cache). For a static HTML site this is well within the budget of a single small JS bundle.

**License attribution block** (for `public/assets/textures/README.md`):

```
Paper textures used in this site:

- paper-newsprint-1k.jpg — ambientCG Paper001, CC0 1.0.
- paper-kraft-1k.jpg    — ambientCG Paper002, CC0 1.0.
- paper-newsprint-hero.jpg — "Old paper1.jpg" from Wikimedia Commons,
   released into the public domain by Digital Yard Sale
   (https://commons.wikimedia.org/wiki/File:Old_paper1.jpg).
- paper-aged-overlay.png — Texturelabs Paper 361
   (https://texturelabs.org/textures/paper_361),
   used under the Texturelabs.org Terms of Use
   (https://texturelabs.org/terms/) — no redistribution.
- transparenttextures.com PNG patterns — free use, attribution optional.

All other textures are generated procedurally via SVG <feTurbulence>
and have no third-party license.
```

---

## 7. Sources cited

| # | Source | URL |
|---|---|---|
| 1 | transparenttextures.com — pattern library | https://www.transparenttextures.com/ |
| 2 | Unsplash — paper texture search | https://unsplash.com/s/photos/paper-texture |
| 3 | Unsplash License | https://unsplash.com/license |
| 4 | Unsplash Hotlinking API Guidelines | https://help.unsplash.com/en/articles/2511271-unsplash-source-guidelines |
| 5 | Pexels — paper texture search | https://www.pexels.com/search/paper-texture/ |
| 6 | Pexels License | https://www.pexels.com/license/ |
| 7 | Pixabay — paper texture search | https://pixabay.com/images/search/paper%20texture/ |
| 8 | Pixabay Content License Summary | https://pixabay.com/service/license-summary/ |
| 9 | ambientCG — Paper category | https://ambientcg.com/list?type=PhotoTexture&category=Paper |
| 10 | ambientCG License (CC0) | https://docs.ambientcg.com/license/ |
| 11 | ambientCG Asset Types (Photo Texture explained) | https://docs.ambientcg.com/asset-types/ |
| 12 | cc0textures.com — Paper category (legacy) | https://cc0textures.com/list.php?category=paper |
| 13 | cc0textures.com License (CC0) | https://cc0textures.com/license.php |
| 14 | Wikimedia Commons — Category:Paper textures (101 files) | https://commons.wikimedia.org/wiki/Category:Paper_textures |
| 15 | Wikimedia Commons — File:Old paper1.jpg (public domain) | https://commons.wikimedia.org/wiki/File:Old_paper1.jpg |
| 16 | Wikimedia Commons — File:Kraft_tileable_1024x1024.png (CC BY-SA) | https://commons.wikimedia.org/wiki/File:Kraft_tileable_1024x1024.png |
| 17 | Wikimedia Commons — File:News3.jpg (CC-BY-SA) | https://commons.wikimedia.org/wiki/File:News3.jpg |
| 18 | Wikimedia Commons — File:Vintage Paper Texture (CC-BY) | https://commons.wikimedia.org/wiki/File:Vintage_Paper_Texture_(9789792113).jpg |
| 19 | Wikimedia Commons — File:Free dark vintage paper page texture (CC-BY) | https://commons.wikimedia.org/wiki/File:Free_dark_vintage_paper_page_texture_for_layers_(2982207584).jpg |
| 20 | Wikimedia Commons — File:Wrinkled Paper Texture (CC-BY) | https://commons.wikimedia.org/wiki/File:Wrinkled_Paper_Texture_Free_Creative_Commons_(6816216700).jpg |
| 21 | Wikimedia Commons — File:Free-paper-texture-27.jpg (CC-BY-SA) | https://commons.wikimedia.org/wiki/File:Free-paper-texture-27.jpg |
| 22 | Texturelabs — Paper category (245 textures) | https://texturelabs.org/?ct=666 |
| 23 | Texturelabs — Paper 366 (Newspaper front page) | https://texturelabs.org/textures/paper_366 |
| 24 | Texturelabs — Paper 377 (Antique newspaper) | https://texturelabs.org/textures/paper_377 |
| 25 | Texturelabs — Paper 378 (Vintage newspaper) | https://texturelabs.org/textures/paper_378 |
| 26 | Texturelabs Terms of Use (custom EULA) | https://texturelabs.org/terms/ |
| 27 | Texturelabs FAQ | https://texturelabs.org/faq/ |
| 28 | OpenGameArt — Paper texture search | https://opengameart.org/art-search-advanced?keys=paper+texture&field_art_type_tid%5B%5D=9 |
| 29 | OpenGameArt — Parchment (CC0, 215 KB) | https://opengameart.org/content/parchment |
| 30 | OpenGameArt — Parchment Background (CC0, 90 KB) | https://opengameart.org/content/parchment-background |
| 31 | OpenGameArt — Old Parchment Paper | https://opengameart.org/content/old-parchment-paper |
| 32 | rawpixel — Paper Texture (264 CC0 results) | https://www.rawpixel.com/category/53/paper-texture |
| 33 | StockSnap — CC0 photography | https://stocksnap.io/ |
| 34 | textures.com — Paper category | https://www.textures.com/texstyles/paper |
| 35 | Poly Haven — Textures (no paper category) | https://polyhaven.com/textures |
| 36 | GitHub — Null-MC/Oversized (CC0 PBR pack) | https://github.com/Null-MC/Oversized |
| 37 | GitHub — Calinou/seamless-textures (CC0) | https://github.com/Calinou/seamless-textures |
| 38 | GitHub — ModsByMorgue/PUBLIC_DOMAIN_TEXTURES (PD, 100 textures) | https://github.com/ModsByMorgue/PUBLIC_DOMAIN_TEXTURES |
| 39 | GitHub — malcolmriley/unused-textures (CC-BY 4.0) | https://github.com/malcolmriley/unused-textures |
| 40 | GitHub — MerlinDog1/free-texture-library | https://github.com/MerlinDog1/free-texture-library |
| 41 | npm — textures (riccardoscalco, MIT, 6K★) | https://www.npmjs.com/package/textures |
| 42 | npm — @paper-design/shaders (WebGL effects) | https://www.npmjs.com/package/@paper-design/shaders |
| 43 | AGENTS.md (SAC Website operating manual; mentions transparenttextures) | /store/shuvam/design.md_gen/AGENTS.md |
| 44 | SAC Website — SVG filters for paper research | /store/shuvam/SAC_Website/docs/svg-filters-for-paper.md |
| 45 | SAC Website — Newsprint aging authenticity | /store/shuvam/SAC_Website/docs/newsprint-aging-authenticity.md |
