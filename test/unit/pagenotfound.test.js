/**
 * test/unit/pagenotfound.test.js — custom 404 page (Improvement Phase §19).
 *
 * GitHub Pages serves /404.html content at ANY broken URL while keeping the
 * requested path — so relative asset paths would break at depth. The page is
 * therefore fully self-contained: inline styles only, and links built from a
 * computed base (/SAC_Website on Pages deployments, "" on localhost).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("custom 404 page", () => {
  const file = resolve(root, "404.html");

  it("exists at the repository root (GitHub Pages convention)", () => {
    expect(existsSync(file)).toBe(true);
  });

  const html = existsSync(file) ? readFileSync(file, "utf-8") : "";

  it("is depth-proof: no static relative asset references", () => {
    // GitHub serves 404 content at the broken path — '../css/x' or 'css/x'
    // would resolve against e.g. /SAC_Website/pages/ and 404 again.
    expect(html).not.toMatch(/href="\.\.?\/(css|js)\//);
    expect(html).not.toMatch(/<link[^>]+href="(css|js)\//);
    expect(html).not.toMatch(/src="(js|css)\//);
  });

  it("computes the deployment base (__SAC_BASE)", () => {
    expect(html).toContain("__SAC_BASE");
    expect(html).toContain("/SAC_Website"); // project-pages prefix
    expect(html).toContain("localhost"); // dev override
  });

  it("builds its links through the base, covering the four primary pages", () => {
    expect(html).toContain('__SAC_BASE + "/index.html"');
    expect(html).toContain('__SAC_BASE + "/pages/clubs.html"');
    expect(html).toContain('__SAC_BASE + "/pages/events.html"');
    expect(html).toContain('__SAC_BASE + "/pages/gallery.html"');
  });

  it("keeps the newspaper voice and accessibility basics", () => {
    expect(html).toMatch(/<html lang="en"/i);
    expect(html).toContain('name="viewport"');
    expect(html).toContain("404");
    expect(html).toContain("The SAC Chronicle");
    expect(html).toMatch(/aria-label="?(Primary|Breadcrumb)/);
    expect(html).toContain("<noscript");
  });

  it("styles itself inline (paper theme survives offline / no network)", () => {
    expect(html).toMatch(/<style[\s\S]+<\/style>/);
    expect(html).toContain("#f7f2e7"); // --paper token
    expect(html).toContain("#830d0d"); // --accent token
  });
});

describe("viewer zoom (source contract)", () => {
  it("viewer.js ships click-zoom, drag-pan, and keyboard toggle", () => {
    const src = readFileSync(resolve(root, "js/components/viewer.js"), "utf-8");
    expect(src).toContain("wireZoom");
    expect(src).toContain("is-zoomed");
    expect(src).toContain("pointerdown");
    expect(src).toContain("setPointerCapture");
    expect(src).toContain('e.key === "z"');
    // prev/next reset zoom so images never inherit stale pan
    expect(src).toContain("resetZoom()");
  });
  it("viewer.css styles the zoomed state", () => {
    const css = readFileSync(resolve(root, "css/viewer.css"), "utf-8");
    expect(css).toContain(".viewer-img.is-zoomed");
  });
});
