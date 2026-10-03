/**
 * test/unit/hero.test.js — the front-page photograph.
 *
 * The hero is pinned to the auditorium-stage group photo. It used to rotate by
 * calendar month, which silently swapped it for an unrelated photo on 1 October.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const HERO = "assets/hero-people.webp";

/** Width/height of a lossy (VP8) WebP, read straight from its header. */
function webpSize(buf) {
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  expect(buf.toString("ascii", 12, 16)).toBe("VP8 ");
  return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
}

describe("front-page hero", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf-8");
  const img = html.match(/<img\s[^>]*id="heroImg"[^>]*>/)?.[0] ?? "";

  it("is the auditorium-stage photo, served as a small WebP", () => {
    const file = readFileSync(resolve(root, HERO));
    expect(file.length / 1024, HERO + " should stay extreme (<300KB)").toBeLessThan(300);
    expect(img).toContain(`src="${HERO}"`);
  });

  it("declares the file's real dimensions so the page doesn't reflow", () => {
    const { width, height } = webpSize(readFileSync(resolve(root, HERO)));
    expect(img).toContain(`width="${width}"`);
    expect(img).toContain(`height="${height}"`);
  });

  it("offers phone-sized copies, each exactly as wide as it says, in the same shape", () => {
    // A phone used to download the 1400px original (119 KB) for a ~390px frame.
    const srcset = img.match(/srcset="([^"]+)"/)?.[1] ?? "";
    const entries = srcset
      .split(",")
      .map((e) => e.trim().split(/\s+/))
      .filter((e) => e.length === 2);
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(img).toMatch(/sizes="[^"]+"/);
    const full = webpSize(readFileSync(resolve(root, HERO)));
    let prevBytes = 0;
    for (const [path, descriptor] of entries) {
      const file = readFileSync(resolve(root, path));
      const { width, height } = webpSize(file);
      expect(`${width}w`, `${path} must be as wide as its descriptor`).toBe(descriptor);
      // same crop as the original, so the picture does not jump between sizes
      expect(Math.abs(height - (full.height * width) / full.width)).toBeLessThanOrEqual(1);
      expect(file.length, `${path} should be heavier than the next size down`).toBeGreaterThan(
        prevBytes
      );
      prevBytes = file.length;
    }
    // the smallest is what a phone fetches
    expect(readFileSync(resolve(root, entries[0][0])).length / 1024).toBeLessThan(40);
  });

  it("is not swapped by date, in the page or in home.js", () => {
    const home = readFileSync(resolve(root, "js/pages/home.js"), "utf-8");
    expect(html).not.toContain("getMonth()");
    expect(home).not.toContain("getMonth()");
    expect(home).not.toContain("HERO_POOL");
    expect(home).not.toContain("rotateHero");
  });
});

describe("masthead photograph", () => {
  const css = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
  const kb = (f) => readFileSync(resolve(root, f)).length / 1024;

  it("is served at the size the screen can use", () => {
    expect(css).toContain("--masthead-img");
    expect(css).toContain("masthead-campus-760.webp");
    expect(css).toContain("masthead-campus-1200.webp");
    expect(css).toContain("masthead-campus.webp");
    // phone < laptop < large display — and a phone never pays for the 1600px original
    expect(kb("assets/masthead-campus-760.webp")).toBeLessThan(80);
    expect(kb("assets/masthead-campus-760.webp")).toBeLessThan(
      kb("assets/masthead-campus-1200.webp")
    );
    expect(kb("assets/masthead-campus-1200.webp")).toBeLessThan(kb("assets/masthead-campus.webp"));
  });

  it("the light and dark scrims share one image variable, so they cannot drift apart", () => {
    const uses = css.match(/var\(--masthead-img\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    expect(css).not.toMatch(/image-set\(\s*url\("\.\.\/\.\.\/assets\/masthead-campus/);
  });
});
