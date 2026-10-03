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

  it("is not swapped by date, in the page or in home.js", () => {
    const home = readFileSync(resolve(root, "js/pages/home.js"), "utf-8");
    expect(html).not.toContain("getMonth()");
    expect(home).not.toContain("getMonth()");
    expect(home).not.toContain("HERO_POOL");
    expect(home).not.toContain("rotateHero");
  });
});
