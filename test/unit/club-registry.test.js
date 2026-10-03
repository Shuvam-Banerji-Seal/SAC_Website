/**
 * test/unit/club-registry.test.js — a club exists in four places; they must agree.
 *
 *   js/data/clubs.js           the registry (slug, page, body, name, interests …)
 *   pages/<club>.html          the page (carries data-club-slug)
 *   js/pages/clubs.js          the directory, built from the registry
 *   js/components/footer.js    the footer's Sports teaser, built from the registry
 *   assets_map.jsonl           the archive's slug (the folder the photos live in)
 *
 * Adding a club means adding a registry row and a page; these tests are the
 * checklist and fail with the name of whatever was missed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BODIES,
  INTERESTS,
  CLUBS,
  PENDING_CLUBS,
  clubBySlug,
  clubByPage,
  clubPageUrl,
  bodyById,
  clubsInBody,
} from "../../js/data/clubs.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

const pages = readdirSync(resolve(root, "pages")).filter((f) => f.endsWith(".html"));
const clubPages = pages
  .map((f) => ({
    file: `pages/${f}`,
    slug: read(`pages/${f}`).match(/data-club-slug="([^"]+)"/)?.[1],
  }))
  .filter((p) => p.slug);

describe("registry ↔ pages", () => {
  it("every club page is in the registry, pointing back at itself", () => {
    expect(clubPages).toHaveLength(32);
    for (const { file, slug } of clubPages) {
      expect(clubBySlug(slug), `${file} (${slug}) is missing from js/data/clubs.js`).toBeDefined();
      expect(clubPageUrl(slug)).toBe(file);
      expect(clubByPage(file)?.slug).toBe(slug);
    }
  });

  it("every registry row has a page that exists and declares that slug", () => {
    expect(CLUBS).toHaveLength(clubPages.length);
    for (const c of CLUBS) {
      expect(existsSync(resolve(root, c.page)), `${c.slug} → ${c.page} does not exist`).toBe(true);
      expect(read(c.page), `${c.page} should declare data-club-slug="${c.slug}"`).toContain(
        `data-club-slug="${c.slug}"`
      );
    }
  });

  it("slugs and pages are unique", () => {
    expect(new Set(CLUBS.map((c) => c.slug)).size).toBe(CLUBS.length);
    expect(new Set(CLUBS.map((c) => c.page)).size).toBe(CLUBS.length);
  });
});

describe("registry rows are complete", () => {
  const bodyIds = new Set(BODIES.map((b) => b.id));
  const interestIds = new Set(INTERESTS.map((i) => i.id));

  it("every club has a body, a name, a short name and at least one real interest", () => {
    for (const c of [...CLUBS, ...PENDING_CLUBS]) {
      expect(bodyIds.has(c.body), `${c.slug}: unknown body "${c.body}"`).toBe(true);
      expect(c.name.length, `${c.slug} name`).toBeGreaterThan(2);
      expect(c.short.length, `${c.slug} short`).toBeGreaterThan(1);
      expect(c.interests.length, `${c.slug} needs an interest`).toBeGreaterThan(0);
      for (const i of c.interests)
        expect(interestIds.has(i), `${c.slug}: unknown interest "${i}"`).toBe(true);
    }
  });

  it("every body and every interest has at least one club, so no filter is ever empty", () => {
    for (const b of BODIES) expect(clubsInBody(b.id).length, b.id).toBeGreaterThan(0);
    for (const i of INTERESTS) {
      const n = [...CLUBS, ...PENDING_CLUBS].filter((c) => c.interests.includes(i.id)).length;
      expect(n, `interest "${i.id}" matches no club`).toBeGreaterThan(0);
    }
  });

  it("the five bodies are the five the Council has", () => {
    expect(BODIES.map((b) => b.id)).toEqual(["academics", "cultural", "food", "hostel", "sports"]);
    expect(bodyById("sports")?.label).toBe("SAC Sports");
  });

  it("a pending club has no page — and so cannot be linked to a 404", () => {
    for (const p of PENDING_CLUBS) {
      expect(clubPageUrl(p.slug)).toBeNull();
      expect(p.note).toBeTruthy();
    }
  });
});

describe("the footer's Sports column", () => {
  const featured = CLUBS.filter((c) => c.featured);

  it("shows a handful of featured sports, and only sports", () => {
    expect(featured.length).toBeGreaterThanOrEqual(4);
    expect(featured.length).toBeLessThanOrEqual(8);
    for (const c of featured)
      expect(c.body, `${c.slug} is featured but not a sport`).toBe("sports");
  });

  it("is built from the registry, with a link on to the whole directory", () => {
    const footer = read("js/components/footer.js");
    expect(footer).toContain('from "../data/clubs.js"');
    expect(footer).toContain("CLUBS.filter((c) => c.featured)");
    expect(footer).toContain('{ label: "View All", href: "clubs.html" }');
  });
});

describe("the directory", () => {
  it("reads the registry rather than keeping private tables", () => {
    const clubs = read("js/pages/clubs.js");
    expect(clubs).toContain('from "../data/clubs.js"');
    expect(clubs).not.toContain("SLUG_BODIES");
    expect(clubs).not.toContain("const PENDING_CLUBS");
    expect(clubs).not.toMatch(/"pages\/[a-z-]+\.html"/);
  });
});

describe("registry ↔ the archive", () => {
  const archive = new Set(
    read("public/assets/processed/assets_map.jsonl")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l).club)
  );

  it("every club's slug names a folder that exists in the archive", () => {
    for (const c of CLUBS)
      expect(archive.has(c.slug), `${c.slug} is not in assets_map.jsonl`).toBe(true);
  });
});
