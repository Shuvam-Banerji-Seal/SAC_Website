/**
 * test/unit/campus-life.test.js — the Campus Life archive page.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("campus life page", () => {
  it("ships the page with skeleton-ready mount + preload", () => {
    const html = readFileSync(resolve(root, "pages/campus-life.html"), "utf-8");
    expect(html).toContain('data-page="campus-life"');
    expect(html).toContain('id="campus-grid"');
    expect(html).toContain('id="campus-search"');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="fetch"');
    expect(html).toContain('property="og:title"');
  });

  it("renders all 269 Campus_Archive photographs grouped by category", () => {
    const js = readFileSync(resolve(root, "js/pages/campus-life.js"), "utf-8");
    expect(js).toContain('a.club === "Campus_Archive"');
    expect(js).toContain("byCat");
    expect(js).toContain("thumb--reveal");
    expect(js).toContain('"data-viewer"');
    expect(js).toContain("initLazyVideos");
  });

  it("is dispatched from main.js and in the navbar", () => {
    expect(existsSync(resolve(root, "js/pages/campus-life.js"))).toBe(true);
    const main = readFileSync(resolve(root, "js/main.js"), "utf-8");
    expect(main).toContain('"campus-life": initCampusLife');
    const nav = readFileSync(resolve(root, "js/config.js"), "utf-8");
    expect(nav).toContain('id: "campus-life"');
    const footer = readFileSync(resolve(root, "js/components/footer.js"), "utf-8");
    expect(footer).toContain("campus-life.html");
  });

  it("is in the sitemap, SW cache, and linked from the home carousel", () => {
    expect(readFileSync(resolve(root, "sitemap.xml"), "utf-8")).toContain("campus-life.html");
    expect(readFileSync(resolve(root, "sw.js"), "utf-8")).toContain('"pages/campus-life.html"');
    const home = readFileSync(resolve(root, "index.html"), "utf-8");
    expect(home).toContain("pages/campus-life.html");
    expect(home).toContain("269 campus photographs");
  });

  it("skeleton scaffolding ships for the slow JSONL mounts", () => {
    const sk = readFileSync(resolve(root, "js/utils/skeleton.js"), "utf-8");
    expect(sk).toContain("showGridSkeleton");
    expect(sk).toContain("clearSkeleton");
    for (const f of ["events.js", "clubs.js", "gallery.js", "club-page.js", "club-images.js"]) {
      const src = readFileSync(resolve(root, "js/pages/" + f), "utf-8");
      expect(src, f).toMatch(/showGridSkeleton|showIdentitySkeleton/);
    }
    const css = readFileSync(resolve(root, "css/components.css"), "utf-8");
    expect(css).toContain(".skeleton--grid");
    expect(css).toContain("sac-skeleton-pulse");
  });
});

describe("campus-life blank-grid regression + campus book", () => {
  it("campus sections carry reveal-section so thumbs can never stay invisible", () => {
    const js = readFileSync(resolve(root, "js/pages/campus-life.js"), "utf-8");
    expect(js).toContain("reveal-section");
  });
  it("reveal.js ships an orphan-thumbs safety net", () => {
    const js = readFileSync(resolve(root, "js/utils/reveal.js"), "utf-8");
    expect(js).toContain("orphans");
    expect(js).toContain("is-revealed");
  });
  it("home uses the 3D flipping book (cover + spreads + back), not the card stack", () => {
    const book = readFileSync(resolve(root, "js/components/campus-book.js"), "utf-8");
    expect(book).toContain("book__leaf");
    expect(book).toContain("book__flip--prev");
    expect(book).toContain("book__flip--next");
    expect(book).toContain("AUTO_FLIP_MS");
    // the -180deg leaf flip lives in CSS (half-width leaves hinged on the spine)
    const cssBook = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
    expect(cssBook).toContain("rotateY(-180deg)");
    expect(cssBook).toContain("width: calc(50% - 5px)");
    expect(readFileSync(resolve(root, "js/pages/home.js"), "utf-8")).toContain("initCampusBook");
    expect(readFileSync(resolve(root, "index.html"), "utf-8")).toContain('id="campus-book"');
    const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
    expect(css).toContain("transform-origin: left center");
    expect(css).toContain("perspective: 2600px");
  });
  it("masthead ships the campus photo with the title overlaid on a scrim", () => {
    const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
    expect(css).toContain("masthead--photo");
    expect(css).toContain("masthead-campus.webp");
    // legacy newspaper texture excludes the photo masthead
    expect(css).toContain(".masthead:not(.masthead--photo)");
  });
});
