/**
 * Deployment hygiene contracts.
 *
 * The site ships to two GitHub Pages mirrors with different path casings:
 *   /SAC_website/  (slashdot-iiserk — primary)
 *   /SAC_Website/  (Shuvam-Banerji-Seal — secondary)
 * Every absolute path used to break on one of them, so these tests pin the
 * mirror-agnostic wiring: service-worker registration, cache-scope guard,
 * and the SW/data cache-version parity the deploy process relies on.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, "../.." + rel), "utf-8");

describe("service worker registration is mirror-agnostic", () => {
  const mainJs = read("/js/main.js");

  it("main.js resolves sw.js relative to its own module URL", () => {
    expect(mainJs).toContain("import.meta.url");
    expect(mainJs).toContain("../sw.js");
  });

  it("main.js does not hard-code the /SAC_Website/ prefix", () => {
    expect(mainJs).not.toContain('"/SAC_Website/sw.js"');
    expect(mainJs).not.toContain("'/SAC_Website/sw.js'");
  });

  it("sw.js derives its cache prefix from registration scope, not a fixed casing", () => {
    const sw = read("/sw.js");
    expect(sw).toContain("self.registration.scope");
    expect(sw).toContain("SCOPE_PATH");
    expect(sw).not.toContain('startsWith("/SAC_Website/")');
    expect(sw).not.toContain("startsWith('/SAC_Website/')");
  });
});

describe("cache version parity", () => {
  it("sw.js CACHE_NAME matches data.js CACHE_VERSION", () => {
    const swVersion = read("/sw.js").match(/const CACHE_NAME = "([^"]+)"/)?.[1];
    const dataVersion = read("/js/data.js").match(/const CACHE_VERSION = "([^"]+)"/)?.[1];
    expect(swVersion).toBeTruthy();
    expect(dataVersion).toBeTruthy();
    expect(swVersion).toBe(dataVersion);
  });
});

describe("campus book auto-flip efficiency", () => {
  const book = read("/js/components/campus-book.js");

  it("pauses when the tab is hidden", () => {
    expect(book).toContain("document.hidden");
    expect(book).toContain("visibilitychange");
  });

  it("pauses when the book is off screen", () => {
    expect(book).toContain("IntersectionObserver");
    expect(book).toContain("inView");
  });

  it("pauses while the reader is interacting (pointer/focus)", () => {
    expect(book).toContain("pointerenter");
    expect(book).toContain("focusin");
    expect(book).toContain("paused");
  });
});

describe("image pipeline honours EXIF orientation", () => {
  // WebP has no orientation metadata, so a conversion that skips
  // exif_transpose bakes the camera's rotation INTO the pixels sideways.
  // 13 archive images shipped rotated this way (fixed 2026-09-21).
  it("image_converter.py transposes before saving", () => {
    const conv = read("/public/assets/tools/image_converter.py");
    expect(conv).toContain("ImageOps.exif_transpose");
  });

  it("rebuild_assets.py transposes and auto-orients HEIC", () => {
    const rebuild = read("/public/assets/tools/rebuild_assets.py");
    expect(rebuild).toContain("ImageOps.exif_transpose");
    expect(rebuild).toContain('"-auto-orient"');
  });
});

describe("gallery toolbar", () => {
  it("gallery.html ships search + count mounts", () => {
    const html = read("/pages/gallery.html");
    expect(html).toContain('id="gallery-search"');
    expect(html).toContain('id="gallery-count"');
    expect(html).toContain("gallery-toolbar");
  });

  it("gallery.js filters on caption + club and reports live counts", () => {
    const js = read("/js/pages/gallery.js");
    expect(js).toContain("data-gallery-search");
    expect(js).toContain("applyFilters");
    expect(js).toContain("photographs match");
  });

  it("gallery.css makes the toolbar sticky and mirror-safe", () => {
    const css = read("/css/pages/gallery.css");
    expect(css).toContain(".gallery-toolbar");
    expect(css).toContain("position: sticky");
    expect(css).toContain("gallery-search__input");
  });

  it("gallery offers a pinned/sheet layout toggle and a surprise jump", () => {
    const html = read("/pages/gallery.html");
    expect(html).toContain('data-view="pinned"');
    expect(html).toContain('data-view="sheet"');
    expect(html).toContain('id="gallery-surprise"');

    const js = read("/js/pages/gallery.js");
    expect(js).toContain("sac-gallery-view");
    expect(js).toContain("dataset.galleryView");
    expect(js).toContain("gallery-surprise");

    const css = read("/css/pages/gallery.css");
    expect(css).toContain('[data-gallery-view="sheet"]');
  });
});
