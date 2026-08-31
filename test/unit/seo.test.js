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
