/**
 * test/unit/campus-carousel.test.js — the Campus-in-Print 3D flipping book.
 *
 * Contract: a strictly-bounded book (never overlaps surrounding text),
 * uniform photo frames, rich backfaces, full tooling, viewer integration,
 * and no leftover code from the retired rotating-card stack.
 */
import { describe, it, expect, existsSync as _e } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("campus book", () => {
  const js = readFileSync(resolve(root, "js/components/campus-book.js"), "utf-8");
  const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
  const map = readFileSync(resolve(root, "public/assets/processed/assets_map.jsonl"), "utf-8");

  it("submodule ships a 269-image Campus_Archive", () => {
    const entries = map
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const campus = entries.filter((a) => a.club === "Campus_Archive");
    expect(campus.length).toBeGreaterThanOrEqual(269);
    expect(campus.every((a) => a.file_type === "image")).toBe(true);
  });

  it("pages come from landscape Campus_Archive shots with folder-context labels", () => {
    expect(js).toContain('a.club === "Campus_Archive"');
    expect(js).toContain("aspect_ratio");
    expect(js).toContain("captionFor");
  });

  it("tools: arrows, counter, pause/play, keyboard", () => {
    expect(js).toContain("book__flip--prev");
    expect(js).toContain("book__flip--next");
    expect(js).toContain("book__counter");
    expect(js).toContain("book__play");
    expect(js).toContain("playBtn");
    expect(js).toContain('e.key === "ArrowRight"');
  });

  it("respects reduced-motion (no autoplay, no transitions)", () => {
    expect(js).toContain("isReducedMotion");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition: none");
  });

  it("book is strictly bounded: fixed stage, unclipped 3D leaves, uniform photo frames", () => {
    expect(css).toContain("perspective: 1600px");
    expect(css).toContain("max-width: 600px");
    expect(js).not.toContain("width: calc(50%");
    // REGRESSION (mirrored leaves): overflow:hidden AND clip-path on .book__leaf
    // both force transform-style:flat, breaking backface-visibility so flipped
    // leaves render mirrored. The leaf must carry neither; bounds come from
    // inset:0 faces with their own overflow:hidden + fixed aspect-ratio photos.
    // (Strip comments first — the rule documents this very constraint.)
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const leafBlock = cssNoComments.match(/\.book__leaf\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(leafBlock).not.toMatch(/overflow\s*:/);
    expect(leafBlock).not.toMatch(/clip-path\s*:/);
    expect(leafBlock).toMatch(/transform-origin:\s*left center/);
    // faces keep their own clipping (safe: faces are not 3D containers)
    expect(css).toMatch(/\.book__face\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/\.book__face\s*\{[^}]*backface-visibility:\s*hidden/s);
    // photos render at one uniform size regardless of source dimensions
    expect(css).toMatch(/\.book__photo img\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
    // backfaces carry a framed plate thumbnail, never a bare caption
    expect(js).toContain("book__plate-thumb");
  });

  it("facing photo opens the shared viewer lightbox", () => {
    expect(js).toContain('"data-viewer": "campus-book"');
  });

  it("the retired rotating stack is fully gone", () => {
    expect(existsSync(resolve(root, "js/components/campus-carousel.js"))).toBe(false);
    expect(css).not.toContain(".campus-3d");
    expect(css).not.toContain(".campus-card");
    const sw = readFileSync(resolve(root, "sw.js"), "utf-8");
    expect(sw).not.toContain("campus-carousel.js");
  });

  it("clubs directory stays clean of the archive pseudo-club", () => {
    const clubs = readFileSync(resolve(root, "js/pages/clubs.js"), "utf-8");
    expect(clubs).toContain('a.club !== "Campus_Archive"');
  });
});
