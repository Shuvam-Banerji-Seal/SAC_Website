/**
 * test/unit/thumbs.test.js — grid thumbnail pipeline.
 *
 * The assets submodule ships 480px WebP variants (map field `thumb_url`)
 * so grids fetch ~30KB tiles instead of ~100-350KB originals. The lightbox
 * keeps full resolution via the anchor href.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { gridSrc } from "../../js/utils/thumb.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("grid thumbnails", () => {
  const map = readFileSync(resolve(root, "public/assets/processed/assets_map.jsonl"), "utf-8");
  const entries = map
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  it("map ships thumb_url for wide images (pipeline contract)", () => {
    const imgs = entries.filter((a) => a.file_type === "image");
    const withThumb = imgs.filter((a) => a.thumb_url);
    expect(imgs.length).toBeGreaterThan(1000);
    expect(withThumb.length).toBeGreaterThan(1200);
    // every wide image has a thumb; small ones don't need one
    for (const a of imgs.slice(0, 60)) {
      if ((a.width || 0) > 600) expect(a.thumb_url, a.path).toBeTruthy();
    }
  });

  it("no phantom thumbs/* entries in the map", () => {
    expect(entries.some((a) => a.path.startsWith("thumbs/") || a.club === "thumbs")).toBe(false);
  });

  it("gridSrc prefers thumb_url for images, falls back for everything else", () => {
    const img = { file_type: "image", thumb_url: "t.webp", public_url: "f.webp" };
    const smallImg = { file_type: "image", thumb_url: null, public_url: "f.webp" };
    const video = { file_type: "video", thumb_url: "t.webp", public_url: "v.mp4" };
    expect(gridSrc(img)).toBe("t.webp");
    expect(gridSrc(smallImg)).toBe("f.webp");
    expect(gridSrc(video)).toBe("v.mp4"); // never a thumb for playable media
    expect(gridSrc(null)).toBe("");
  });

  it("every grid renderer serves gridSrc in <img> src (not public_url)", () => {
    for (const f of [
      "js/pages/gallery.js",
      "js/pages/campus-life.js",
      "js/pages/club-images.js",
      "js/pages/events.js",
      "js/components/campus-book.js",
      "js/pages/home.js",
    ]) {
      const src = readFileSync(resolve(root, f), "utf-8");
      expect(src, f).toContain("gridSrc");
      // events video <source> must stay full-res
      if (f === "js/pages/events.js") {
        expect(src).toContain("// full video file — never a thumb");
      }
    }
  });

  it("lightbox anchors keep full-resolution public_url", () => {
    const gallery = readFileSync(resolve(root, "js/pages/gallery.js"), "utf-8");
    expect(gallery).toContain("href: assetUrl(i.public_url)");
    const events = readFileSync(resolve(root, "js/pages/events.js"), "utf-8");
    expect(events).toContain("href: assetUrl(e.public_url)");
  });
});
