/**
 * test/unit/contrast.test.js — text must stay readable on every paper.
 *
 * The paper is deliberately aged, and each ageing step darkens it. These tests
 * read the real palette out of css/variables.css (so a future tweak cannot
 * quietly slide below WCAG AA) and check the ink colours against every paper
 * tone of every light texture preset.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "css/variables.css"), "utf-8");

/** Custom properties declared in the first block that opens with `selector`. */
function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) vars[m[1]] = m[2];
  return vars;
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const base = block(":root");
// light presets that restyle the paper (dark/slate etc. set their own ink)
const PRESETS = ["fresh", "aged", "rustic", "notice", "parchment"];
const palettes = {
  default: base,
  ...Object.fromEntries(
    PRESETS.map((p) => [p, { ...base, ...block(`[data-theme="light"][data-texture="${p}"]`) }])
  ),
};

describe("ink on paper (WCAG AA)", () => {
  for (const [name, p] of Object.entries(palettes)) {
    for (const surface of ["paper", "paper-soft", "paper-deep"]) {
      it(`${name}: body ink, soft ink and muted ink read on ${surface}`, () => {
        expect(p[surface], `${surface} missing for ${name}`).toBeTruthy();
        expect(ratio(p.ink, p[surface])).toBeGreaterThanOrEqual(7); // AAA for body
        expect(ratio(p["ink-soft"], p[surface])).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p["ink-muted"], p[surface])).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${name}: the accent (links, labels) reads on the page and on cards`, () => {
      expect(ratio(p.accent, p.paper)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.accent, p["paper-soft"])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.accent, p["paper-deep"])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("the default sheet is the aged one, not the clean stock", () => {
    expect(base.paper.toLowerCase()).toBe("#eee2cb");
  });

  it("ageing is one number, and the presets move it", () => {
    expect(css).toMatch(/--age:\s*1;/);
    expect(css).toMatch(/\[data-texture="fresh"\][^}]*--age:\s*0\.3/);
    expect(css).toMatch(/\[data-texture="rustic"\][^}]*--age:\s*1\.5/);
  });
});
