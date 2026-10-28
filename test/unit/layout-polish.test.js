/**
 * test/unit/layout-polish.test.js — the 2026-10-05 design pass, kept honest.
 *
 *   the front page's "Inside this edition" index points at real sections, in page order
 *   the council plate's seal never prints over its kicker line (phone and desktop layouts),
 *   and carries the council's crest inside its ring
 *   the council facts' figures clear their labels ("1 yr" on About)
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

    // 2026-10-28: the seal said "SAC" in type; it carries the council's crest, the tab icon's mark
    it(`${narrow ? "phone" : "desktop"}: the seal holds the crest, its corners inside the ring`, async () => {
      const svg = await plate(narrow);
      const ring = svg.querySelector(".sacmap__seal-ring");
      const logo = svg.querySelector(".sacmap__seal-logo");
      expect(logo.getAttribute("href")).toBe("assets/logos/sac.svg");
      const [cx, cy, r] = ["cx", "cy", "r"].map((a) => Number(ring.getAttribute(a)));
      const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => Number(logo.getAttribute(a)));
      expect(w).toBe(h);
      expect(x + w / 2).toBeCloseTo(cx, 0);
      expect(y + h / 2).toBeCloseTo(cy, 0);
      // sac.svg is a 200-unit square with 18-unit corners: they reach 0.67 of the side from
      // the centre, which must clear the ring's 1.8-unit stroke
      expect(0.67 * w).toBeLessThanOrEqual(r - 0.9);
      expect(w).toBeGreaterThanOrEqual(1.2 * r); // and large enough that "SAC" reads
      expect(svg.querySelector(".sacmap__seal text:not(.sacmap__seal-sub)")).toBeNull();
    });
  }
});

describe("the council facts", () => {
  // 2026-10-28: at line-height 0.9 the "y" of "1 yr" hung into "OFFICE-BEARER TENURE" (About)
  it("give each figure a full line and a gap above its label", () => {
    const rule = read("css/components.css").match(/\n\.home-stat strong \{[^}]*\}/)?.[0] ?? "";
    expect(Number(rule.match(/line-height:\s*([\d.]+)/)?.[1])).toBeGreaterThanOrEqual(1);
    expect(rule).toMatch(/margin-bottom:\s*0\.\d+em/);
  });
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
