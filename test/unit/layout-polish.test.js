/**
 * test/unit/layout-polish.test.js — the 2026-10-05 design pass, kept honest.
 *
 *   the front page's "Inside this edition" index points at real sections, in page order
 *   the council plate's seal never prints over its kicker line (phone and desktop layouts)
 *   the Picture Desk offers the full image to the frames that need it
 *   the gallery's count keeps its hint in its own span (phones hide it)
 *   a club masthead lists what the reader can find — no zeros, no archive jargon
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

describe("Inside this edition", () => {
  const doc = new DOMParser().parseFromString(read("index.html"), "text/html");
  const links = [...doc.querySelectorAll(".lead-index a")];

  it("is a labelled nav inside the lead story", () => {
    const nav = doc.querySelector(".lead-article > nav.lead-index");
    expect(nav).not.toBeNull();
    expect(doc.getElementById(nav.getAttribute("aria-labelledby"))).not.toBeNull();
    expect(links.length).toBeGreaterThanOrEqual(5);
  });

  it("links every entry to a heading that exists, in the order the page prints them", () => {
    const all = [...doc.querySelectorAll("[id]")];
    const positions = links.map((a) => {
      const id = a.getAttribute("href").slice(1);
      const target = doc.getElementById(id);
      expect(target, id).not.toBeNull();
      expect(target.matches("h2"), id).toBe(true);
      return all.indexOf(target);
    });
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
  });

  it("names each section as its heading does", () => {
    for (const a of links) {
      const heading = doc.getElementById(a.getAttribute("href").slice(1)).textContent.trim();
      expect(a.querySelector(".lead-index__name").textContent.trim()).toBe(heading);
    }
  });
});

describe("the council plate", () => {
  let restore;
  const plate = async (narrow) => {
    document.body.innerHTML = '<div id="sac-diagram"></div>';
    restore = window.matchMedia;
    window.matchMedia = () => ({ matches: narrow, addEventListener() {} });
    // jsdom has no SVG geometry; the plate measures its connectors to draw them in
    window.SVGElement.prototype.getTotalLength ??= () => 100;
    vi.resetModules();
    const { initSacDiagram } = await import("../../js/components/sac-diagram.js");
    initSacDiagram();
    return document.querySelector("#sac-diagram svg");
  };
  afterEach(() => {
    window.matchMedia = restore;
  });

  for (const narrow of [true, false]) {
    it(`${narrow ? "phone" : "desktop"}: the seal's ring clears the kicker line`, async () => {
      const svg = await plate(narrow);
      const kicker = Number(svg.querySelector(".sacmap__kicker").getAttribute("y"));
      const ring = svg.querySelector(".sacmap__seal-ring");
      const top = Number(ring.getAttribute("cy")) - Number(ring.getAttribute("r"));
      // the kicker is ~7 units of small caps sitting on its baseline; the ring starts below it
      expect(top - kicker).toBeGreaterThanOrEqual(4);
    });
  }
});

describe("the Picture Desk", () => {
  it("offers the 480px variant and the full image, and nothing when there is no variant", async () => {
    const { pictureSrcset } = await import("../../js/pages/home.js");
    const asset = {
      file_type: "image",
      width: 1600,
      public_url: "public/assets/processed/X/a.webp",
      thumb_url: "public/assets/processed/thumbs/X/a.webp",
    };
    expect(pictureSrcset(asset)).toMatch(/thumbs\/X\/a\.webp 480w, .*processed\/X\/a\.webp 1600w$/);
    expect(pictureSrcset({ ...asset, thumb_url: null })).toBeUndefined();
    expect(pictureSrcset({ ...asset, width: null })).toBeUndefined();
  });

  it("is a page of equal 4:3 mounts with a lead across two columns and two rows", () => {
    const css = read("css/pages/home.css");
    expect(css).toMatch(/\.campus-gallery__item a \{[^}]*aspect-ratio: 4 \/ 3/);
    expect(css).toMatch(
      /\.campus-gallery__item--1 \{[^}]*grid-column: span 2;[^}]*grid-row: span 2/
    );
  });
});

describe("the gallery count", () => {
  it("keeps the hint in a span phones can drop", () => {
    expect(read("js/pages/gallery.js")).toMatch(/class: "gallery-count__hint"/);
    expect(read("css/pages/gallery.css")).toMatch(
      /@media \(max-width: 640px\) \{[\s\S]*\.gallery-count__hint \{\s*display: none;/
    );
  });
});

describe("a club masthead's record line", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="x" />';
    document.body.innerHTML =
      '<div class="club-detail__header"><a class="back-link" href="#">back</a></div>';
    document.body.dataset.clubSlug = "AARSHI_-_Drama_Club";
  });

  it("lists only what there is, in plain words", async () => {
    const rows = [
      { file_type: "image", is_logo: true, public_url: "p/logo.webp", path: "A/logo.webp" },
      { file_type: "image", is_event: true, public_url: "p/e1.webp", path: "A/e1.webp" },
      { file_type: "video", public_url: "p/v.mp4", path: "A/v.mp4" },
    ].map((r) => ({ club: "AARSHI_-_Drama_Club", club_name: "AARSHI - Drama Club", ...r }));
    const orig = global.fetch;
    global.fetch = async () => ({
      ok: true,
      text: async () => rows.map((r) => JSON.stringify(r)).join("\n"),
    });
    vi.resetModules();
    sessionStorage.clear();
    const { initClubPage } = await import("../../js/pages/club-page.js");
    await initClubPage();
    global.fetch = orig;

    const parts = [...document.querySelectorAll(".club-detail__stats span")].map(
      (s) => s.textContent
    );
    expect(parts).toEqual(["2 photographs", "1 recording"]);
    const line = document.querySelector(".club-detail__stats").textContent;
    expect(line).not.toMatch(/\b0 |medias|map logo|map mark/i);
  });
});

// 2026-10-05, measured on the live site: the strip under a club's title arrived with the archive
// and pushed the page down — CLS 0.10 landing on Singularity with a slow archive, 0.28 once
// scrolled, 0.21 on Chess. The generator now marks the pages that get one, and the page holds
// that many mounts open from the first paint.
describe("the photo strip under a club's title", () => {
  it("is chosen in one place: landscape event photographs, widest first, two at least", async () => {
    const { heroPicks, heroCount } = await import("../../js/utils/hero-picks.js");
    const photo = (id, w, ratio, extra = {}) => ({
      id,
      file_type: "image",
      is_event: true,
      width: w,
      aspect_ratio: ratio,
      ...extra,
    });
    const entries = [
      photo(1, 900, 1.5),
      photo(2, 2400, 1.6),
      photo(3, 2000, 0.75), // portrait-shaped: never in the strip
      photo(4, 1800, 1.33, { is_extracted_from_doc: true }),
      photo(5, 1600, 1.4),
      photo(6, 1200, 1.5, { is_event: false }),
    ];
    expect(heroPicks(entries).map((e) => e.id)).toEqual([2, 5, 1]);
    expect(heroCount(entries)).toBe(3);
    expect(heroCount([photo(1, 900, 1.5)])).toBe(0);
  });

  it("is marked on every club page that will have one, with its size, and on no other", async () => {
    const { stripCounts } = await import("../../tools/sync-pages.mjs");
    const counts = stripCounts(root);
    const { CLUBS } = await import("../../js/data/clubs.js");
    let marked = 0;
    for (const club of CLUBS) {
      const body = read(club.page).match(/<body[^>]*>/)[0];
      const want = counts.get(club.slug) || 0;
      const got = Number((body.match(/data-strip="(\d)"/) || [])[1] || 0);
      expect(got, club.page).toBe(want);
      if (want) marked++;
    }
    expect(marked).toBeGreaterThan(0);
  });

  it("holds the strip open while the archive loads, in the strip's own layout", async () => {
    document.head.innerHTML = '<meta name="description" content="x" />';
    document.body.innerHTML =
      '<div class="club-detail__header"><a class="back-link" href="#">back</a></div>';
    document.body.dataset.clubSlug = "SAC_Sports_Chess";
    document.body.dataset.strip = "3";
    const orig = global.fetch;
    let release;
    const gate = new Promise((r) => (release = r));
    const row = (id, w) =>
      JSON.stringify({
        id,
        club: "SAC_Sports_Chess",
        club_name: "Chess Club",
        file_type: "image",
        is_event: true,
        width: w,
        aspect_ratio: 1.5,
        public_url: `p/${id}.webp`,
        path: `C/${id}.webp`,
      });
    global.fetch = async () => {
      await gate;
      return { ok: true, text: async () => [row(1, 2400), row(2, 2000), row(3, 1800)].join("\n") };
    };
    vi.resetModules();
    sessionStorage.clear();
    const { initClubPage } = await import("../../js/pages/club-page.js");
    const done = initClubPage();
    await new Promise((r) => setTimeout(r, 0));

    const reserved = document.querySelector(".club-hero-strip--reserved");
    expect(reserved).not.toBeNull();
    expect(reserved.getAttribute("aria-hidden")).toBe("true");
    const items = [...reserved.querySelectorAll(".club-hero-strip__item")];
    expect(items).toHaveLength(3);
    expect(items[0].classList.contains("is-lead")).toBe(true);
    expect(items.every((i) => i.querySelector(".club-hero-strip__photo"))).toBe(true);

    release();
    await done;
    global.fetch = orig;
    expect(document.querySelector(".club-hero-strip--reserved")).toBeNull();
    expect(document.querySelectorAll(".club-hero-strip .club-hero-strip__item")).toHaveLength(3);
    delete document.body.dataset.strip;
  });

  it("gives an empty mount's photo exactly the space a photograph takes", () => {
    const css = read("css/pages/club.css");
    expect(css).toMatch(
      /\.club-hero-strip__item img,\s*\.club-hero-strip__photo \{\s*aspect-ratio: 16 \/ 10/
    );
    expect(css).toMatch(
      /\.club-hero-strip__item:not\(\.is-lead\) img,\s*\.club-hero-strip__item:not\(\.is-lead\) \.club-hero-strip__photo \{/
    );
  });
});
