/**
 * test/unit/club-themes.test.js — every club page has a look of its own, and it all holds together.
 *
 *   js/data/clubs.js            THEMES: motif, band, bullet, frame, type, desk, tag, stamp
 *   assets/motifs/<motif>.svg   the drawing (used as a CSS mask, so it takes the club's ink)
 *   css/pages/club-themes.css   the ink per motif, and each band / bullet / frame / type defined once
 *   pages/<club>.html           <body data-motif data-band …>, written by tools/sync-pages.mjs
 *
 * These are the checklist for adding a club (or a new kind of band): they name what is missing.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  CLUBS,
  THEMES,
  MOTIFS,
  BANDS,
  BULLETS,
  FRAMES,
  TITLES,
  clubBySlug,
} from "../../js/data/clubs.js";
import { setBodyTheme, ensureThemeLink, THEME_ATTRS } from "../../tools/sync-pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");
const themes = read("css/pages/club-themes.css");
const clubCss = read("css/pages/club.css");
const variables = read("css/variables.css");

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css, selector) {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return null;
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("\n}", at));
}
const decl = (body, name) => body?.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const paper = (selector, name) => decl(rule(variables, selector), name);

describe("the registry's themes", () => {
  it("every club has one, and every theme belongs to a club", () => {
    for (const c of CLUBS) expect(c.theme, `${c.slug} has no theme`).toBeDefined();
    for (const slug of Object.keys(THEMES)) {
      expect(clubBySlug(slug), `THEMES has "${slug}", which is not a club`).toBeDefined();
    }
  });

  it("draws every field from the vocabulary", () => {
    for (const [slug, t] of Object.entries(THEMES)) {
      expect(BANDS, `${slug}.band "${t.band}"`).toContain(t.band);
      expect(BULLETS, `${slug}.bullet "${t.bullet}"`).toContain(t.bullet);
      expect(FRAMES, `${slug}.frame "${t.frame}"`).toContain(t.frame);
      expect(TITLES, `${slug}.type "${t.type}"`).toContain(t.type);
    }
  });

  it("gives each club its own drawing", () => {
    expect(MOTIFS).toHaveLength(CLUBS.length);
  });

  it("writes copy a masthead can hold: a short postmark word, a desk, one line of spirit", () => {
    for (const [slug, t] of Object.entries(THEMES)) {
      expect(t.stamp, `${slug}.stamp`).toMatch(/^[A-Z0-9 !]{2,7}$/);
      expect(t.desk.trim().length, `${slug}.desk`).toBeGreaterThan(5);
      expect(t.tag, `${slug}.tag`).toMatch(/[.!?]$/);
      expect(t.tag.length, `${slug}.tag is a line, not a paragraph`).toBeLessThanOrEqual(60);
    }
  });
});

describe("the drawings", () => {
  for (const motif of MOTIFS) {
    it(`assets/motifs/${motif}.svg is a self-contained, light drawing`, () => {
      const file = `assets/motifs/${motif}.svg`;
      expect(existsSync(resolve(root, file)), `${file} is missing`).toBe(true);
      const svg = read(file);
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 240 240"/);
      // a mask is read as an image: nothing may reach out, run, or load
      expect(svg).not.toMatch(/<script|<image|<foreignObject|xlink:href="http|href="http/i);
      // a page loads one of these; they are line drawings and should stay small
      expect(statSync(resolve(root, file)).size, `${file} size`).toBeLessThan(6 * 1024);
    });
  }
});

describe("css/pages/club-themes.css", () => {
  it("is linked after club.css and before enhancements.css on every club page, and only there", () => {
    const pages = CLUBS.map((c) => c.page);
    for (const page of pages) {
      const html = read(page);
      const club = html.indexOf('href="../css/pages/club.css"');
      const theme = html.indexOf('href="../css/pages/club-themes.css"');
      const last = html.indexOf('href="../css/enhancements.css"');
      expect(theme, `${page} does not link club-themes.css`).toBeGreaterThan(club);
      expect(theme).toBeLessThan(last);
    }
    for (const other of [
      "index.html",
      "pages/clubs.html",
      "pages/about.html",
      "pages/events.html",
    ]) {
      expect(read(other)).not.toContain("club-themes.css");
    }
  });

  it("gives every motif its ink (light and dark) and its drawing", () => {
    for (const motif of MOTIFS) {
      const body = rule(themes, `body[data-motif="${motif}"]`);
      expect(body, `no block for ${motif}`).not.toBeNull();
      expect(decl(body, "club-ink"), motif).toMatch(/^#[0-9a-f]{6}$/);
      expect(decl(body, "club-ink-dark"), motif).toMatch(/^#[0-9a-f]{6}$/);
      expect(decl(body, "club-art"), motif).toBe(`url("../../assets/motifs/${motif}.svg")`);
    }
  });

  it("defines each band, bullet, frame and title type once — and every one is used", () => {
    const used = (key) => new Set(Object.values(THEMES).map((t) => t[key]));
    const kinds = [
      ["band", BANDS],
      ["bullet", BULLETS],
      ["frame", FRAMES],
      ["type", TITLES],
    ];
    for (const [key, names] of kinds) {
      for (const name of names) {
        const count = themes.split(`body[data-${key}="${name}"] {`).length - 1;
        expect(count, `body[data-${key}="${name}"] must be defined exactly once`).toBe(1);
        expect(used(key).has(name), `${key} "${name}" is defined but no club uses it`).toBe(true);
      }
    }
    // every band says how tall it is, or the heading under it has no room for it
    for (const name of BANDS) {
      expect(decl(rule(themes, `body[data-band="${name}"]`), "band-h"), name).toMatch(/^\d+px$/);
    }
  });

  it("follows the dark theme by swapping in the club's dark ink on <body>", () => {
    expect(themes).toMatch(
      /\[data-theme="dark"\] body\[data-motif\] \{\s*--club-ink: var\(--club-ink-dark\)/
    );
  });

  it("every ink reads on the papers it can sit on (WCAG AA, 4.5:1)", () => {
    // the light textures' papers — the darkest, "rustic deep", included — and the dark theme's
    const light = [
      paper(":root", "paper"),
      paper(":root", "paper-soft"),
      paper(":root", "paper-deep"),
      paper('[data-theme="light"][data-texture="rustic"]', "paper"),
      paper('[data-theme="light"][data-texture="rustic"]', "paper-soft"),
      paper('[data-theme="light"][data-texture="rustic"]', "paper-deep"),
    ];
    const dark = ["paper", "paper-soft", "paper-deep"].map((n) => paper('[data-theme="dark"]', n));
    expect([...light, ...dark].every((h) => /^#[0-9a-f]{6}$/i.test(h))).toBe(true);
    for (const motif of MOTIFS) {
      const body = rule(themes, `body[data-motif="${motif}"]`);
      for (const surface of light) {
        expect(
          ratio(decl(body, "club-ink"), surface),
          `${motif} ink on ${surface}`
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const surface of dark) {
        expect(
          ratio(decl(body, "club-ink-dark"), surface),
          `${motif} dark ink on ${surface}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("the film mount is dark film in either theme: its colours are fixed, not tokens", () => {
    expect(decl(rule(themes, 'body[data-frame="film"]'), "frame-bg")).toBe("#2a2118");
  });
});

describe("pages are dressed from the first paint", () => {
  it("every club's <body> carries its theme, exactly as the registry has it", () => {
    for (const c of CLUBS) {
      const html = read(c.page);
      const tag = html.match(/<body[^>]*>/)[0];
      for (const name of THEME_ATTRS) {
        expect(tag, `${c.page} data-${name}`).toContain(` data-${name}="${c.theme[name]}"`);
      }
    }
  });

  it("setBodyTheme replaces what was there instead of piling up attributes", () => {
    const once = setBodyTheme('<body class="x" data-club-slug="a">', THEMES.SAC_Sports_Chess);
    const twice = setBodyTheme(once, THEMES.SAC_Sports_Cricket);
    expect(twice.match(/data-motif=/g)).toHaveLength(1);
    expect(twice).toContain('data-motif="cricket"');
    expect(twice).toContain('class="x" data-club-slug="a"');
  });

  it("ensureThemeLink is idempotent and sits right after club.css", () => {
    const html = '  <link rel="stylesheet" href="../css/pages/club.css" />\n  <link href="b">';
    const once = ensureThemeLink(html);
    expect(once).toMatch(
      /club\.css" \/>\n {2}<link rel="stylesheet" href="\.\.\/css\/pages\/club-themes\.css" \/>/
    );
    expect(ensureThemeLink(once)).toBe(once);
  });
});

describe("club.css wears the theme without needing it", () => {
  it("reads every variable with a fallback where an unthemed page would lack it", () => {
    // :root supplies --club-ink; the rest are optional and default to the plain look
    expect(themes).toMatch(/:root \{\s*--club-ink: var\(--accent\)/);
    for (const v of [
      "band",
      "band-h",
      "club-art",
      "bullet-clip",
      "title-size",
      "frame-bg",
      "fp-t",
    ]) {
      expect(clubCss, `--${v}`).toMatch(new RegExp(`var\\(--${v},`));
    }
  });

  it("does not split a heading from its list: the text sections are no longer newspaper columns", () => {
    expect(clubCss).not.toMatch(/column-count/);
    expect(clubCss).toMatch(/\.club-detail__body \{[^}]*display: grid/);
    expect(clubCss).toMatch(/position: sticky/);
  });

  it("counts only the page's own headings, so a gallery arriving late renumbers nothing", () => {
    expect(clubCss).toMatch(
      /\.club-detail__body > h2::before,\s*\.club-detail__section > h2::before \{[^}]*counter-increment: club-section/
    );
    expect(clubCss).not.toMatch(/image-block h2::before/);
  });

  it("shows the drawing only with motion allowed, and drifts it with scroll only where supported", () => {
    expect(clubCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*html:not\(\[data-reduce-motion="on"\]\) \.club-detail__header::before/
    );
    expect(clubCss).toMatch(/@supports \(animation-timeline: scroll\(\)\)/);
  });

  it("does not print the ornaments", () => {
    expect(clubCss).toMatch(/@media print \{[^}]*\.club-detail__header::before/);
  });
});

describe("the masthead (hydrated)", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="x" />';
    document.body.innerHTML =
      '<div class="club-detail__header"><a class="back-link" href="#">back</a></div>';
    document.body.dataset.clubSlug = "AARSHI_-_Drama_Club";
  });

  it("runs under the club's desk, with its line of spirit and its own postmark word", async () => {
    await import("../../js/data.js");
    const orig = global.fetch;
    global.fetch = async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          club: "AARSHI_-_Drama_Club",
          club_name: "AARSHI - Drama Club",
          file_type: "image",
          is_logo: true,
          public_url: "public/assets/processed/AARSHI/logo.webp",
          title: "crest",
          path: "AARSHI/logo.webp",
        }),
    });
    const { initClubPage } = await import("../../js/pages/club-page.js");
    await initClubPage();
    global.fetch = orig;

    const t = THEMES["AARSHI_-_Drama_Club"];
    expect(document.querySelector(".club-detail__eyebrow").textContent).toBe(t.desk);
    expect(document.querySelector(".club-detail__tag").textContent).toBe(t.tag);
    const stamp = document.querySelector(".postmark");
    expect(stamp.textContent.startsWith(t.stamp)).toBe(true);
    expect(stamp.getAttribute("aria-hidden")).toBe("true");
    // the tagline sits between the title and the figures, inside the same block
    const copy = document.querySelector(".club-detail__identity-copy");
    const order = [...copy.children].map((n) => n.className.split(" ")[0]);
    expect(order.indexOf("club-detail__tag")).toBe(order.indexOf("club-detail__title") + 1);
  });
});
