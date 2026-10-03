/**
 * test/unit/page-shell.test.js — every page shares one stylesheet shell.
 *
 * Five directory pages once shipped without enhancements.css, so hover, press
 * and entrance polish silently applied to the home and club pages only. The
 * shell (the shared stylesheets and their order) is checked for all 38 pages.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pages = [
  "index.html",
  ...readdirSync(resolve(root, "pages"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `pages/${f}`),
];
const styles = (html) =>
  [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) =>
    m[1].replace(/^(\.\.\/)?/, "")
  );

const CORE = [
  "css/preloader.css",
  "css/reset.css",
  "css/variables.css",
  "css/main.css",
  "css/components.css",
  "css/loader.css",
  "css/settings.css",
  "css/viewer.css",
  "css/enhancements.css",
];

describe("stylesheet shell", () => {
  it("covers every page of the site", () => {
    expect(pages.length).toBeGreaterThanOrEqual(38);
  });

  for (const page of pages) {
    it(`${page} links the shared stylesheets exactly once`, () => {
      const links = styles(readFileSync(resolve(root, page), "utf-8"));
      for (const core of CORE) {
        expect(
          links.filter((l) => l === core),
          `${core} on ${page}`
        ).toHaveLength(1);
      }
    });

    it(`${page}: tokens first, components before the page's own CSS, enhancements last`, () => {
      const links = styles(readFileSync(resolve(root, page), "utf-8"));
      const at = (f) => links.indexOf(f);
      expect(at("css/reset.css")).toBeLessThan(at("css/variables.css"));
      expect(at("css/variables.css")).toBeLessThan(at("css/main.css"));
      expect(at("css/main.css")).toBeLessThan(at("css/components.css"));
      for (const own of links.filter((l) => l.startsWith("css/pages/"))) {
        expect(at("css/components.css"), `${own} must follow components.css`).toBeLessThan(at(own));
        // enhancements refine whatever the page defines, so they come after it
        expect(at(own), `${own} must precede enhancements.css`).toBeLessThan(
          at("css/enhancements.css")
        );
      }
    });
  }
});

describe("layout stability (Lighthouse CLS)", () => {
  const css = readFileSync(resolve(root, "css/components.css"), "utf-8");
  const clubsJs = readFileSync(resolve(root, "js/pages/clubs.js"), "utf-8");

  it("every page reserves the mobile masthead strip from first paint", () => {
    // has-topbar used to be added by JS after load, so the whole page jumped
    // 54px down on every phone (0.06 CLS on each page).
    for (const page of pages) {
      expect(readFileSync(resolve(root, page), "utf-8"), page).toMatch(
        /<body class="has-topbar" data-page=/
      );
    }
  });

  it("directory mounts hold a screen from first paint, so the footer starts below the fold", () => {
    // static CSS on the mount itself — a JS-made skeleton arrives after first paint
    for (const mount of ["#clubs-grid", "#events-list", "#gallery-grid", "#campus-grid"]) {
      expect(css).toMatch(new RegExp(`${mount}[,\\s{][^}]*min-height: 90svh`));
    }
  });

  it("club cards are named by their own text, not an override that omits part of it", () => {
    expect(clubsJs).not.toContain("open club page");
  });
});
