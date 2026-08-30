/**
 * test/unit/og-meta.test.js — social cards for every page.
 * Club pages hydrate meta at runtime; directory pages ship static tags.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

describe("social-share cards", () => {
  it("directory pages ship static OG + Twitter tags", () => {
    for (const p of ["pages/clubs.html", "pages/events.html", "pages/gallery.html", "pages/about.html"]) {
      const html = read(p);
      expect(html, p).toContain('property="og:title"');
      expect(html, p).toContain('property="og:description"');
      expect(html, p).toContain('property="og:image"');
      expect(html, p).toContain('name="twitter:card"');
    }
  });

  it("club pages inject og:title/og:image/twitter:* at runtime", async () => {
    const src = read("js/pages/club-page.js");
    expect(src).toContain('setMeta("property", "og:title"');
    expect(src).toContain('setMeta("property", "og:image"');
    expect(src).toContain('setMeta("name", "twitter:card", "summary_large_image")');
    expect(src).toContain('setMeta("property", "og:url"');
  });

  it("og:image falls back to the shared hero when a club has no images", async () => {
    const src = read("js/pages/club-page.js");
    expect(src).toContain('new URL("assets/hero.webp"');
  });
});

describe("runtime OG injection (jsdom shell)", () => {
  it("adds og:* + twitter:* meta tags for a hydrated club", async () => {
    document.head.innerHTML = '<meta name="description" content="x" />';
    document.body.innerHTML = `
      <div class="club-detail__header"><a class="back-link" href="#">back</a></div>
    `;
    document.body.dataset.clubSlug = "AARSHI_-_Drama_Club";

    // Point data.js at a tiny inline map
    const { loadAssetsMap } = await import("../../js/data.js");
    const orig = global.fetch;
    global.fetch = async (url) => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          club: "AARSHI_-_Drama_Club",
          club_name: "AARSHI - Drama Club",
          file_type: "image",
          is_logo: true,
          public_url: "public/assets/processed/AARSHI/logo.webp",
          title: "crest",
          path: "AARSHI/logo.webp",
        }),
    });

    const { initClubPage } = await import("../../js/pages/club-page.js");
    await initClubPage();
    global.fetch = orig;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    expect(ogTitle?.getAttribute("content")).toContain("AARSHI");
    expect(ogImage?.getAttribute("content")).toContain("logo.webp");
    expect(twitterCard?.getAttribute("content")).toBe("summary_large_image");
    expect(document.title).toContain("AARSHI");
  });
});
