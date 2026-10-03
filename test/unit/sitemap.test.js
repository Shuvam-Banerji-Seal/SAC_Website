/**
 * test/unit/sitemap.test.js — the sitemap must be right for the host serving it.
 *
 * The repo deploys from two Pages hosts (shuvam-banerji-seal.github.io/SAC_Website
 * and slashdot-iiserk.github.io/SAC_website). Pages paths are case-sensitive, and
 * the hand-written sitemap listed /SAC_Website/ URLs on the host whose path is
 * /SAC_website/ — all 39 of them 404ed. The sitemap is now generated per host.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildSitemap,
  buildRobots,
  normalizeBase,
  urlFor,
  pageList,
  DEFAULT_BASE,
} from "../../tools/gen-sitemap.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const fixedDate = () => "2026-01-02";

describe("generator", () => {
  const pages = pageList(root);

  it("lists every page, and nothing that is not a page", () => {
    expect(pages[0]).toBe("index.html");
    expect(pages.length).toBeGreaterThanOrEqual(38);
    for (const p of pages) expect(existsSync(resolve(root, p)), p).toBe(true);
    expect(pages).not.toContain("404.html");
  });

  it("builds one URL per page under the base it is given", () => {
    const xml = buildSitemap("https://example.github.io/Site", pages, fixedDate);
    const urls = locs(xml);
    expect(urls).toHaveLength(pages.length);
    expect(urls[0]).toBe("https://example.github.io/Site/");
    expect(urls).toContain("https://example.github.io/Site/pages/aarshi.html");
    expect(xml).toContain("<lastmod>2026-01-02</lastmod>");
  });

  it("keeps the path's case exactly — Pages paths are case-sensitive", () => {
    const lower = locs(
      buildSitemap("https://slashdot-iiserk.github.io/SAC_website", pages, fixedDate)
    );
    expect(lower.every((u) => u.startsWith("https://slashdot-iiserk.github.io/SAC_website/"))).toBe(
      true
    );
    expect(lower.some((u) => u.includes("/SAC_Website/"))).toBe(false);
  });

  it("tolerates a trailing slash on the base", () => {
    expect(normalizeBase("https://h.github.io/Site/")).toBe("https://h.github.io/Site");
    expect(urlFor("https://h.github.io/Site/", "pages/x.html")).toBe(
      "https://h.github.io/Site/pages/x.html"
    );
    expect(urlFor("https://h.github.io/Site//", "index.html")).toBe("https://h.github.io/Site/");
  });

  it("points robots.txt at the same host's sitemap", () => {
    expect(buildRobots("https://h.github.io/Site/")).toContain(
      "Sitemap: https://h.github.io/Site/sitemap.xml"
    );
    expect(buildRobots("https://h.github.io/Site")).toMatch(/^User-agent: \*\nAllow: \//);
  });

  it("gives the home page top priority and club pages the least", () => {
    const xml = buildSitemap("https://h.github.io/S", pages, fixedDate);
    const block = (path) =>
      xml.split("<url>").find((b) => b.includes(`<loc>https://h.github.io/S${path}</loc>`));
    expect(block("/")).toContain("<priority>1.0</priority>");
    expect(block("/pages/clubs.html")).toContain("<priority>0.8</priority>");
    expect(block("/pages/aarshi.html")).toContain("<priority>0.6</priority>");
  });
});

describe("the checked-in copies", () => {
  const xml = read("sitemap.xml");
  const robots = read("robots.txt");

  it("use one host and one path, and every URL is a page that exists", () => {
    const urls = locs(xml);
    expect(urls.length).toBeGreaterThanOrEqual(38);
    const base = normalizeBase(DEFAULT_BASE);
    for (const u of urls) {
      expect(u.startsWith(`${base}/`), u).toBe(true);
      const rel = u === `${base}/` ? "index.html" : u.slice(base.length + 1);
      expect(existsSync(resolve(root, rel)), `${u} → ${rel}`).toBe(true);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("robots.txt names the sitemap on the same host", () => {
    expect(robots).toContain(`Sitemap: ${normalizeBase(DEFAULT_BASE)}/sitemap.xml`);
  });

  it("covers every page file (a new page must reach the sitemap)", () => {
    const base = normalizeBase(DEFAULT_BASE);
    const listed = new Set(locs(xml));
    for (const p of pageList(root)) expect(listed.has(urlFor(base, p)), p).toBe(true);
  });
});

describe("deployment", () => {
  const deploy = read(".github/workflows/deploy.yml");

  it("builds the published sitemap from the base URL of the host being deployed to", () => {
    expect(deploy).toMatch(/id: pages\s+uses: actions\/configure-pages/);
    expect(deploy).toContain(
      'node tools/gen-sitemap.mjs --base "${{ steps.pages.outputs.base_url }}" --out _site'
    );
  });

  it("generates it after the site is staged, so the generated files are the ones published", () => {
    expect(deploy.indexOf("Stage site files")).toBeLessThan(deploy.indexOf("gen-sitemap.mjs"));
    expect(deploy.indexOf("gen-sitemap.mjs")).toBeLessThan(deploy.indexOf("Upload artifact"));
  });
});

describe("assets directory", () => {
  it("has no orphan files — everything in assets/ is referenced by the site", () => {
    // retired heroes and an unused logo sat here for weeks; git history keeps them
    const files = execFileSync("git", ["ls-files", "assets"], { cwd: root, encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);
    const corpus = [
      "index.html",
      "404.html",
      "sw.js",
      "sitemap.xml",
      ...pageList(root).filter((p) => p !== "index.html"),
    ].map(read);
    const walk = (dir) =>
      execFileSync("git", ["ls-files", dir], { cwd: root, encoding: "utf-8" })
        .split("\n")
        .filter((f) => /\.(css|js|json)$/.test(f));
    for (const f of [...walk("css"), ...walk("js"), "js/config.js"]) corpus.push(read(f));
    const text = corpus.join("\n");
    const orphans = files.filter((f) => !text.includes(f.split("/").pop()));
    expect(orphans).toEqual([]);
  });
});
