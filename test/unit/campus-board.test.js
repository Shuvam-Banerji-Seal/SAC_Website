/**
 * test/unit/campus-board.test.js — the Campus Board (map-desk wall).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("campus board", () => {
  const js = readFileSync(resolve(root, "js/components/campus-board.js"), "utf-8");
  const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
  const home = readFileSync(resolve(root, "js/pages/home.js"), "utf-8");
  const html = readFileSync(resolve(root, "index.html"), "utf-8");
  const map = readFileSync(resolve(root, "public/assets/processed/assets_map.jsonl"), "utf-8");
  const entries = map
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  it("submodule has landscape Campus_Places shots to pin", () => {
    const places = entries.filter(
      (a) =>
        a.club === "Campus_Archive" && a.category === "Campus_Places" && a.file_type === "image"
    );
    expect(places.length).toBeGreaterThanOrEqual(20);
  });

  it("board picks Campus_Places only, serves thumbs, opens shared viewer", () => {
    expect(js).toContain('a.category === "Campus_Places"');
    expect(js).toContain("gridSrc"); // thumbnails, not originals
    expect(js).toContain('"data-viewer": "campus-board"');
    expect(js).toContain("TILTS"); // deterministic scatter
    // no runtime randomness (comment mentions are fine)
    expect(js.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("Math.random");
  });

  it("home wires the board; index ships the mount; css pins it", () => {
    expect(home).toContain("initCampusBoard(assets)");
    expect(html).toContain('id="campus-board"');
    expect(html).toContain("The Campus Board");
    expect(css).toContain(".board-card__pin");
    expect(css).toContain("repeat(auto-fill, minmax(min(100%, 200px), 1fr))");
  });

  it("deep link lands on the Campus_Places chapter", () => {
    expect(js).toContain("campus-life.html#cat-Campus_Places");
    const life = readFileSync(resolve(root, "js/pages/campus-life.js"), "utf-8");
    expect(life).toContain('id: "cat-" + cat');
  });

  it("hero flash regression: month pick is made pre-paint inline", () => {
    expect(html).toContain("Seasonal hero must be chosen BEFORE first paint");
    expect(html).toContain("getMonth() % pool.length");
    // home.js no longer unconditionally rewrites (no double-swap)
    expect(home).toContain("already right");
  });
});

describe("board aspect + about page", () => {
  it("board imgs declare height:auto — attribute hints can't stretch cards", () => {
    // REGRESSION: with width/height attributes present and no CSS height,
    // Chrome fell back to the attr height (1200px tall cards). aspect-ratio
    // only applies when height is auto in used value.
    const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
    const block = css.match(/\.board-card img\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(block).toMatch(/height:\s*auto/);
    expect(block).toMatch(/aspect-ratio:\s*5\s*\/\s*4/);
  });

  it("about page ships the five-bodies quick navigation", () => {
    const html = readFileSync(resolve(root, "pages/about.html"), "utf-8");
    for (const body of [
      "body-academics",
      "body-cultural",
      "body-sports",
      "body-hostel",
      "body-food",
    ]) {
      expect(html).toContain(`clubs.html#${body}`);
    }
    expect(html).toContain("How the Council works");
    const css = readFileSync(resolve(root, "css/pages/about.css"), "utf-8");
    expect(css).toContain(".about-bodies__link");
  });
});
