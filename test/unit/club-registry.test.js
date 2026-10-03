/**
 * test/unit/club-registry.test.js — a club exists in four places; they must agree.
 *
 *   pages/<club>.html          the page (carries data-club-slug)
 *   js/pages/clubs.js          slug → page URL, and slug → body (the directory)
 *   js/components/footer.js    the Sports column's links
 *   public/.../assets_map      the archive's slug (the folder the photos live in)
 *
 * Adding a club means touching all of them; nothing else noticed when one was
 * forgotten. These tests are the checklist, and fail with the name of the gap.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

const clubsJs = read("js/pages/clubs.js");
const footerJs = read("js/components/footer.js");

/** `key: "value"` pairs inside the object literal that follows `marker`. */
function literal(source, marker, end = "\n  };") {
  const start = source.indexOf(marker);
  const body = source.slice(source.indexOf("{", start) + 1, source.indexOf(end, start));
  const out = {};
  for (const m of body.matchAll(/(?:"([^"]+)"|([A-Za-z0-9_]+)):\s*"([^"]+)"/g))
    out[m[1] || m[2]] = m[3];
  return out;
}

const urlMap = literal(clubsJs, "const urlMap = {");
// SLUG_BODIES is a top-level table (closes at column 0), getClubPageUrl's map is indented
const bodyMap = literal(clubsJs, "const SLUG_BODIES = {", "\n};");

const pages = readdirSync(resolve(root, "pages")).filter((f) => f.endsWith(".html"));
const clubPages = pages
  .map((f) => ({
    file: `pages/${f}`,
    slug: read(`pages/${f}`).match(/data-club-slug="([^"]+)"/)?.[1],
  }))
  .filter((p) => p.slug);

describe("club pages ↔ the directory's URL map", () => {
  it("every club page is in the map, pointing back at itself", () => {
    expect(clubPages).toHaveLength(32);
    for (const { file, slug } of clubPages) {
      expect(
        urlMap[slug],
        `${file} (${slug}) is missing from getClubPageUrl in js/pages/clubs.js`
      ).toBe(file);
    }
  });

  it("every URL in the map is a page that exists and declares that slug", () => {
    for (const [slug, file] of Object.entries(urlMap)) {
      expect(existsSync(resolve(root, file)), `${slug} → ${file} does not exist`).toBe(true);
      expect(read(file), `${file} should declare data-club-slug="${slug}"`).toContain(
        `data-club-slug="${slug}"`
      );
    }
  });

  it("every club page has a body, so it lands under a heading in the directory", () => {
    for (const { file, slug } of clubPages) {
      expect(bodyMap[slug], `${file} (${slug}) has no entry in SLUG_BODIES`).toMatch(
        /^(academics|cultural|food|hostel|sports)$/
      );
    }
  });
});

describe("footer Sports column ↔ the sports pages", () => {
  // The footer shows a handful of featured sports plus "View All" — a teaser,
  // not the full list — so the invariant is that every link is real.
  const block = footerJs.slice(
    footerJs.indexOf("const SPORTS_LINKS"),
    footerJs.indexOf("];", footerJs.indexOf("const SPORTS_LINKS"))
  );
  const footerHrefs = [...block.matchAll(/href:\s*"([^"]+)"/g)].map((m) => `pages/${m[1]}`);
  const sportsPages = new Set(
    clubPages.filter((p) => bodyMap[p.slug] === "sports").map((p) => p.file)
  );

  it("links only to pages that exist", () => {
    expect(footerHrefs.length).toBeGreaterThan(3);
    for (const href of footerHrefs) expect(existsSync(resolve(root, href)), href).toBe(true);
  });

  it("every featured link is a sports club, apart from the 'View All' link to the directory", () => {
    for (const href of footerHrefs) {
      if (href === "pages/clubs.html") continue;
      expect(
        sportsPages.has(href),
        `${href} is in the footer's Sports column but is not a sports club`
      ).toBe(true);
    }
    expect(footerHrefs).toContain("pages/clubs.html");
  });
});

describe("pages ↔ the archive", () => {
  const map = read("public/assets/processed/assets_map.jsonl")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const archiveSlugs = new Set(map.map((r) => r.club));

  it("every club page's slug names a folder that exists in the archive (or is a known pending club)", () => {
    for (const { file, slug } of clubPages) {
      expect(archiveSlugs.has(slug), `${file}: slug "${slug}" is not in assets_map.jsonl`).toBe(
        true
      );
    }
  });
});
