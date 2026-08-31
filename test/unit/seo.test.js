/**
 * test/unit/seo.test.js — sitemap, robots, and search visibility basics.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

describe("search infrastructure", () => {
  it("ships sitemap.xml covering every static page", () => {
    const file = resolve(root, "sitemap.xml");
    expect(existsSync(file)).toBe(true);
    const xml = readFileSync(file, "utf-8");
    expect(xml).toContain("<urlset");
    // every deployed page is listed
    const count = (xml.match(/<loc>/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(38);
    expect(xml).toContain("index.html");
    expect(xml).toContain("pages/food-hygiene.html");
    expect(xml).toContain("404.html");
  });

  it("ships robots.txt pointing at both mirror sitemaps", () => {
    const robots = readFileSync(resolve(root, "robots.txt"), "utf-8");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    // URL case matters: the primary Pages domain is SAC_website (lowercase w)
    expect(robots).toContain("https://slashdot-iiserk.github.io/SAC_website/sitemap.xml");
    expect(robots).not.toContain("SAC_Website/sitemap.xml");
  });

  it("deploy stages sitemap + robots + 404 + hero pool", () => {
    const yml = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf-8");
    expect(yml).toContain("sitemap.xml");
    expect(yml).toContain("robots.txt");
    expect(yml).toContain("404.html");
    // the whole assets/ dir ships — heroes + logos + textures ride along
    expect(yml).toContain("cp -r css js pages assets diagrams _site/");
  });

  it("home declares sitemap link + preconnect hints", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf-8");
    expect(html).toContain('rel="sitemap"');
    expect(html).toContain('rel="preconnect"');
  });

  it("about page copy is 33 clubs (not the stale 29) with a live stats mount", () => {
    const html = readFileSync(resolve(root, "pages/about.html"), "utf-8");
    expect(html).not.toContain("29 clubs");
    expect(html).toContain("33 clubs");
    expect(html).toContain('id="about-stats"');
    // and the dispatcher exists
    const main = readFileSync(resolve(root, "js/main.js"), "utf-8");
    expect(main).toContain('renderArchiveStats("about-stats")');
  });
});

describe("wave 8 — undated chapters + diagram navigation", () => {
  it("clubs sections carry stable anchor ids", () => {
    const src = readFileSync(resolve(root, "js/pages/clubs.js"), "utf-8");
    expect(src).toContain('id: "body-" + body.id');
  });
  it("home diagram links each body box to its clubs section", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf-8");
    for (const body of ["academics", "hostel", "sports", "cultural", "food"]) {
      expect(html).toContain(`pages/clubs.html#body-${body}`);
    }
  });
  it("events Undated renders per-club chapters", () => {
    const src = readFileSync(resolve(root, "js/pages/events.js"), "utf-8");
    expect(src).toContain("renderUndatedByClub");
    expect(src).toContain("events__undated-club");
    const css = readFileSync(resolve(root, "css/pages/events.css"), "utf-8");
    expect(css).toContain(".events__undated-club");
  });
});

describe("wave 9 — mobile & reading features", () => {
  it("theme-color meta follows the active theme", () => {
    const src = readFileSync(resolve(root, "js/components/settings.js"), "utf-8");
    expect(src).toContain("syncThemeColorMeta");
    expect(src).toContain("#f7f2e7"); // light paper
    expect(src).toContain("#1b1713"); // dark paper
  });
  it("reading progress ships and is wired on every page", () => {
    const comp = readFileSync(resolve(root, "js/components/reading-progress.js"), "utf-8");
    expect(comp).toContain("requestAnimationFrame");
    expect(comp).toContain("passive: true");
    const main = readFileSync(resolve(root, "js/main.js"), "utf-8");
    expect(main).toContain("initReadingProgress");
    const css = readFileSync(resolve(root, "css/components.css"), "utf-8");
    expect(css).toContain(".reading-progress");
  });
  it("club pages offer native share where supported", () => {
    const src = readFileSync(resolve(root, "js/pages/club-page.js"), "utf-8");
    expect(src).toContain("navigator.share");
    expect(src).toContain("club-detail__share");
  });
  it("settings becomes a bottom sheet on phones", () => {
    const css = readFileSync(resolve(root, "css/settings.css"), "utf-8");
    expect(css).toContain("translateY(105%)");
    expect(css).toContain("env(safe-area-inset-bottom)");
  });
});
