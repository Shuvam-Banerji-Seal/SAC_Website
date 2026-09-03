/**
 * test/unit/hero-rotation.test.js — seasonal front-page hero pool.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("seasonal hero rotation", () => {
  it("ships the full pool as tiny WebP assets", () => {
    for (const f of [
      "assets/hero.webp",
      "assets/hero-auditorium.webp",
      "assets/hero-people.webp",
    ]) {
      const stat = readFileSync(resolve(root, f));
      expect(stat.length, f).toBeGreaterThan(1000);
      expect(stat.length / 1024, f + " should stay extreme (<300KB)").toBeLessThan(300);
    }
  });

  it("index mounts carry rotation hooks", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf-8");
    expect(html).toContain('id="heroImg"');
    expect(html).toContain('id="heroCaptionText"');
    expect(html).toContain('src="assets/hero.webp"'); // instant first paint
  });

  it("home.js defines a ≥3-image deterministic pool + month rotation", () => {
    const src = readFileSync(resolve(root, "js/pages/home.js"), "utf-8");
    expect(src).toContain("const HERO_POOL = [");
    expect(src).toContain("getMonth() % HERO_POOL.length");
    expect(src).toContain("rotateHero();");
    // warm-after-load so the swap never shows a blank frame
    expect(src).toContain('addEventListener("load"');
  });
});
