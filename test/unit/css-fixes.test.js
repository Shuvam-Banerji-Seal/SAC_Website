/**
 * test/unit/css-fixes.test.js — tests for CSS bug fixes.
 *
 * Verifies that the CSS files contain the correct fixes for:
 * - BUG 4/5 and the 2026-10-05 quilt: the paper's layers (fixed layer, sizes that can't cycle,
 *   scanned textures at their own size)
 * - BUG 6: backdrop-filter missing -webkit- prefix
 * - BUG 10: --paper-edge-wear defined in :root (not just dark theme)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readCss = (rel) => readFileSync(resolve(__dirname, "../.." + rel), "utf-8");

// Split a CSS value on its top-level commas (not the ones inside gradient(…) / url(…)).
function layers(value) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Every rule in a stylesheet as { selector, decls: Map(property -> value) }, comments removed.
function rules(css) {
  const out = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map();
    for (const d of m[2].split(/;(?![^(]*\))/)) {
      const i = d.indexOf(":");
      if (i > 0) decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
    out.push({ selector: m[1].trim(), decls });
  }
  return out;
}

describe("the paper: ageing layers are one fixed layer, not background-attachment: fixed", () => {
  const mainCss = readCss("/css/main.css");
  const homeCss = readCss("/css/pages/home.css");

  // iOS ignores background-attachment: fixed and Chrome repaints it on every scroll; the touch
  // overrides that worked around it are gone with it.
  it("main.css never uses background-attachment: fixed", () => {
    expect(mainCss.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/background-attachment:\s*fixed/);
  });

  it("the ageing layer is a fixed, viewport-tall, click-through layer under the page", () => {
    const layer = rules(mainCss).find((r) => r.selector === "html::before");
    expect(layer).toBeTruthy();
    expect(layer.decls.get("position")).toBe("fixed");
    expect(layer.decls.get("z-index")).toBe("-1");
    expect(layer.decls.get("pointer-events")).toBe("none");
    // 100vh, not inset: 0 — it must not resize as a phone's toolbar slides away
    expect(layer.decls.get("height")).toBe("100vh");
  });

  it("home.css still lets the photo masthead scroll on touch devices", () => {
    expect(homeCss).toContain("@media (hover: none) and (pointer: coarse)");
    expect(homeCss).toContain(".masthead");
    expect(homeCss).toContain("background-attachment: scroll");
  });
});

// 2026-10-05: <body> painted six paper variables with a six-entry background-size list, but
// foxing and stains are several gradients each — 15 images in all — so the browser cycled the
// sizes across them: the sun-faded centre was tiled every 320px and a red tint every 180px, a
// quilt of squares behind every page. A rule that paints a multi-gradient variable must give
// every image the same size and repeat; a rule with a size list may only use single images.
describe("paper layers can't be cycled into each other's sizes", () => {
  const MULTI = ["--paper-edge-wear", "--paper-foxing", "--paper-stains", "--paper-grain"];
  const SINGLE = ["--paper-fiber", "--paper-texture-image"];
  const sheets = [
    "/css/main.css",
    "/css/components.css",
    "/css/enhancements.css",
    "/css/pages/home.css",
    "/css/pages/calendar.css",
  ];

  for (const sheet of sheets) {
    it(`${sheet}: a multi-gradient paper layer gets one background-size and one repeat`, () => {
      for (const { selector, decls } of rules(readCss(sheet))) {
        const image = decls.get("background-image") || "";
        if (!MULTI.some((v) => image.includes(`var(${v})`))) continue;
        for (const prop of ["background-size", "background-repeat"]) {
          const value = decls.get(prop);
          expect(value, `${selector} needs one ${prop}`).toBeTruthy();
          expect(layers(value), `${selector} ${prop}: ${value}`).toHaveLength(1);
        }
      }
    });
  }

  it("the variables a size list relies on are one image in every theme", () => {
    const vars = readCss("/css/variables.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const name of SINGLE) {
      const defs = [...vars.matchAll(new RegExp(`${name}:([^;]+);`, "g"))].map((m) => m[1]);
      expect(defs.length, name).toBeGreaterThan(0);
      for (const def of defs) expect(layers(def), `${name}: ${def}`).toHaveLength(1);
    }
  });

  it("<html> gives each of its images its own size", () => {
    const html = rules(readCss("/css/main.css")).find((r) => r.selector === "html");
    const images = layers(html.decls.get("background-image"));
    const sizes = layers(html.decls.get("background-size"));
    expect(images).toEqual(["var(--paper-texture-image)", "var(--paper-fiber)"]);
    expect(sizes).toHaveLength(images.length);
    // BUG 5: the scanned textures are seamless tiles; stretching one to the window distorted it
    expect(sizes[0]).toBe("auto");
  });
});

describe("BUG 6: backdrop-filter -webkit- prefix", () => {
  const viewerCss = readCss("/css/viewer.css");

  it("every backdrop-filter has a -webkit- companion", () => {
    const backdropCount = (viewerCss.match(/backdrop-filter:/g) || []).length;
    const webkitCount = (viewerCss.match(/-webkit-backdrop-filter:/g) || []).length;
    // Every backdrop-filter should have a -webkit- prefix
    // (the count includes both -webkit-backdrop-filter and backdrop-filter)
    expect(webkitCount).toBeGreaterThan(0);
    // Total backdrop-filter occurrences = 2× the number of declarations
    // (each declaration has both -webkit- and standard)
    expect(backdropCount).toBe(webkitCount * 2);
  });

  it("viewer-overlay has -webkit-backdrop-filter", () => {
    expect(viewerCss).toContain("-webkit-backdrop-filter: blur(4px)");
  });
});

describe("BUG 10: --paper-edge-wear defined in :root", () => {
  const variablesCss = readCss("/css/variables.css");

  it("--paper-edge-wear is defined in :root (light theme)", () => {
    // The :root block contains SVG data URIs with nested }, so simple
    // /:root\{([^}]*)\}/ fails. Instead, search the entire file for
    // the property after :root but before [data-theme="dark"].
    const rootStart = variablesCss.indexOf(":root");
    const darkStart = variablesCss.indexOf('[data-theme="dark"]');
    expect(rootStart).toBeGreaterThan(-1);
    expect(darkStart).toBeGreaterThan(rootStart);
    const rootBlock = variablesCss.slice(rootStart, darkStart);
    expect(rootBlock).toContain("--paper-edge-wear");
  });

  it("--paper-edge-wear is also defined in dark theme", () => {
    const darkMatch = variablesCss.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
    expect(darkMatch).toBeTruthy();
    expect(darkMatch[1]).toContain("--paper-edge-wear");
  });
});

describe("BUG 8: build:pretext script uses && not ;", () => {
  const pkg = JSON.parse(readCss("/package.json"));

  it("build:pretext chains with && not ;", () => {
    expect(pkg.scripts["build:pretext"]).toContain("&&");
    // The old script used ; after tsc which continued on failure
    expect(pkg.scripts["build:pretext"]).not.toMatch(/tsc.*;\s*cp/);
  });

  it("build:pretext does not swallow cp errors with 2>/dev/null", () => {
    expect(pkg.scripts["build:pretext"]).not.toContain("2>/dev/null");
  });
});

describe("Campus Life toolbar on phones", () => {
  it("clubs-search-wrap wraps — search + view toggle + sort overflowed 390px", () => {
    const block = readCss("/css/pages/clubs.css").match(/\.clubs-search-wrap\s*\{[^}]*\}/s)?.[0];
    expect(block).toMatch(/flex-wrap:\s*wrap/);
  });

  it("defines .visually-hidden, which campus-life.html uses for the sort label", () => {
    expect(readCss("/pages/campus-life.html")).toContain('class="visually-hidden"');
    const block = readCss("/css/components.css").match(/\.visually-hidden\s*\{[^}]*\}/s)?.[0];
    expect(block).toMatch(/position:\s*absolute/);
    expect(block).toMatch(/clip:\s*rect\(0 0 0 0\)/);
  });
});
