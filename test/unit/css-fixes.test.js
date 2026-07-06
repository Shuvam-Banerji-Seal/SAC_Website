/**
 * test/unit/css-fixes.test.js — tests for CSS bug fixes.
 *
 * Verifies that the CSS files contain the correct fixes for:
 * - BUG 4: background-attachment: fixed on touch devices
 * - BUG 5: natural-paper.png aspect ratio distortion
 * - BUG 6: backdrop-filter missing -webkit- prefix
 * - BUG 10: --paper-edge-wear defined in :root (not just dark theme)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readCss = (rel) => readFileSync(resolve(__dirname, "../.." + rel), "utf-8");

describe("BUG 4: background-attachment: fixed on touch devices", () => {
  const mainCss = readCss("/css/main.css");
  const homeCss = readCss("/css/pages/home.css");

  it("main.css has touch device media query for body", () => {
    expect(mainCss).toContain("@media (hover: none) and (pointer: coarse)");
    expect(mainCss).toContain("background-attachment: scroll");
  });

  it("main.css touch override covers body and body[data-page=home]", () => {
    const match = mainCss.match(/@media[^{]*\{[^}]*body[^}]*\}/);
    expect(match).toBeTruthy();
    // The override should cover both body and body[data-page="home"]
    expect(mainCss).toContain('body[data-page="home"]');
  });

  it("home.css has touch device media query for .masthead", () => {
    expect(homeCss).toContain("@media (hover: none) and (pointer: coarse)");
    expect(homeCss).toContain(".masthead");
    expect(homeCss).toContain("background-attachment: scroll");
  });
});

describe("BUG 5: natural-paper.png aspect ratio", () => {
  const mainCss = readCss("/css/main.css");

  it("uses 'auto' for natural-paper.png height, not '400px'", () => {
    // The old code had "400px 400px" which distorted the 523×384 image
    expect(mainCss).not.toContain("400px 400px");
    expect(mainCss).toContain("400px auto");
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
