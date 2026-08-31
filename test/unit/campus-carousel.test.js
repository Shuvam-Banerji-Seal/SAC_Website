/**
 * test/unit/campus-carousel.test.js — the Campus-in-Print 3D stack.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("campus carousel", () => {
  const js = readFileSync(resolve(root, "js/components/campus-carousel.js"), "utf-8");
  const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
  const map = readFileSync(resolve(root, "public/assets/processed/assets_map.jsonl"), "utf-8");

  it("submodule ships a 269-image Campus_Archive", () => {
    const entries = map.split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const campus = entries.filter((a) => a.club === "Campus_Archive");
    expect(campus.length).toBeGreaterThanOrEqual(269);
    expect(campus.every((a) => a.file_type === "image")).toBe(true);
  });

  it("slides come from landscape Campus_Archive shots with folder-context labels", () => {
    expect(js).toContain('a.club === "Campus_Archive"');
    expect(js).toContain("aspect_ratio");
    expect(js).toContain("captionFor");
  });

  it("tools: arrows, dots, counter, pause/play, keyboard", () => {
    expect(js).toContain("campus-3d__nav--prev");
    expect(js).toContain("campus-3d__nav--next");
    expect(js).toContain("campus-3d__dot");
    expect(js).toContain("campus-3d__counter");
    expect(js).toContain("playBtn");
    expect(js).toContain('e.key === "ArrowRight"');
  });

  it("respects reduced-motion (no autoplay, no transitions)", () => {
    expect(js).toContain("isReducedMotion");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition: none");
  });

  it("3D paper architecture: perspective, torn clip-path, tape, z-depth", () => {
    expect(css).toContain("perspective: 1400px");
    expect(css).toContain("clip-path: polygon");
    expect(css).toContain("campus-card__tape");
    expect(css).toContain("rotateY(calc(var(--rel");
    expect(css).toContain("translateZ");
  });

  it("active card opens the shared viewer lightbox", () => {
    expect(js).toContain('"data-viewer": "campus-3d"');
  });

  it("clubs directory stays clean of the archive pseudo-club", () => {
    const clubs = readFileSync(resolve(root, "js/pages/clubs.js"), "utf-8");
    expect(clubs).toContain('a.club !== "Campus_Archive"');
  });
});
