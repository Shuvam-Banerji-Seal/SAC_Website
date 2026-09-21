/**
 * test/unit/dedupe.test.js — the duplicate manifest must never quietly eat
 * something the site needs.
 *
 * The manifest is generated (utils/dedupe/), so these assertions guard the
 * output of that pipeline rather than hand-written data: a regenerate that
 * starts suppressing every logo, or a whole club, fails here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "public/duplicates.json"), "utf-8"));
const images = readFileSync(resolve(root, "public/assets/processed/assets_map.jsonl"), "utf-8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((r) => r.file_type === "image");

const byId = new Map(images.map((r) => [r.id, r]));
const curated = manifest.curated || [];
const dropped = new Set([...manifest.suppress, ...manifest.degenerate, ...curated]);
const surviving = images.filter((r) => !dropped.has(r.id));

describe("duplicate manifest", () => {
  it("is internally consistent", () => {
    expect(manifest.suppress.length).toBe(new Set(manifest.suppress).size);
    expect(curated.length).toBe(new Set(curated).size);
    const keepers = new Set(manifest.groups.map((g) => g.keep));
    // nothing may be both kept and suppressed
    expect(manifest.suppress.some((id) => keepers.has(id))).toBe(false);
    // every suppressed id is a real image
    for (const id of manifest.suppress) expect(byId.has(id)).toBe(true);
  });

  it("curated ids are real images, listed only once", () => {
    // A curated id may be a dedupe group's keeper (all its near-identical
    // siblings were already dropped) — curating it removes the last copy of
    // an artefact, which is the point.
    for (const id of curated) {
      expect(byId.has(id), `curated id ${id} is not an image`).toBe(true);
      expect(manifest.suppress).not.toContain(id);
      expect(manifest.degenerate).not.toContain(id);
    }
  });

  it("every group keeps exactly one member and names what it dropped", () => {
    for (const g of manifest.groups) {
      expect(byId.has(g.keep)).toBe(true);
      expect(g.drop.length).toBeGreaterThan(0);
      for (const d of g.drop) expect(manifest.suppress).toContain(d.id);
    }
  });

  // Same noise test the generator uses (utils/dedupe/build_manifest.py) and
  // that js/utils/caption.js applies at render time.
  // Trailing " 1" is how the pipeline disambiguated a re-ingest, so
  // "DSC 0081 1" is the same class of noise as "DSC 0081".
  const GENERIC =
    /^(img ?_?\d*|page\d* ?img\d*|dsc ?_?\d*|ona\d+|pxl ?_?\d*|vid ?_?\d+|mg ?_?\d+|photo|image|untitled|new file|\d{3,4} ?_?[a-z]?|\d+)([ _]?\d+)?\s*$/i;
  // Titles are compared as the reader will see them, i.e. after the same
  // scrubbing js/utils/caption.js applies: a leading device stamp and a
  // trailing "Copy N" are not part of the name.
  const clean = (t) =>
    (t || "")
      .replace(/^(?:whats\s?app|screenshot|img|image|dsc|pxl|vid)\b(?:[ _.-]*\d+)+/i, "")
      .replace(/([-_ ]*copy( of)?( \d+)?)+$/i, "")
      .trim();
  const letters = (t) => clean(t).replace(/[^a-z]/gi, "").length;
  const isNoise = (t) => !t || GENERIC.test(t.trim()) || letters(t) < 3;

  it("never keeps a pipeline-noise title over a real one", () => {
    for (const g of manifest.groups) {
      if (!isNoise(g.keep_title)) continue;
      // If the keeper's title is noise, every dropped title must be too —
      // otherwise we threw away the only entry that named the subject.
      for (const d of g.drop) expect(isNoise(d.title)).toBe(true);
    }
  });

  it("among real titles, keeps the most descriptive one", () => {
    for (const g of manifest.groups) {
      if (isNoise(g.keep_title) || byId.get(g.keep)?.is_logo) continue;
      for (const d of g.drop) {
        if (isNoise(d.title)) continue; // noise loses on the earlier rule
        expect(letters(g.keep_title)).toBeGreaterThanOrEqual(letters(d.title));
      }
    }
  });

  it("keeps the named office-bearer portrait, not the batch filename", () => {
    const group = manifest.groups.find((g) => g.drop.some((d) => d.title === "25 26 OBs 00"));
    expect(group?.keep_title).toBe("Sukanya Chowdhury Event Coordinator 2025 26");
  });

  it("never removes a club's only logo", () => {
    const clubsWithLogo = new Set(images.filter((r) => r.is_logo).map((r) => r.club));
    const clubsKeepingLogo = new Set(surviving.filter((r) => r.is_logo).map((r) => r.club));
    for (const club of clubsWithLogo) expect(clubsKeepingLogo.has(club)).toBe(true);
  });

  it("never empties a club", () => {
    const before = new Set(images.map((r) => r.club));
    const after = new Set(surviving.map((r) => r.club));
    for (const club of before) expect(after.has(club)).toBe(true);
  });

  it("drops only degenerate images as degenerate", () => {
    for (const id of manifest.degenerate) {
      const r = byId.get(id);
      expect((r.width || 0) * (r.height || 0)).toBeLessThan(64 * 64);
    }
  });

  it("data.js applies the manifest and fails open without it", () => {
    const src = readFileSync(resolve(root, "js/data.js"), "utf-8");
    expect(src).toContain("public/duplicates.json");
    expect(src).toContain("suppressed.has(entry.id)");
    // the hand-curated list must be merged alongside the generated ones
    expect(src).toContain("manifest.curated");
    // a missing/broken manifest must resolve to an empty Set, not throw
    expect(src).toMatch(/catch\(\(\) => new Set\(\)\)/);
  });

  // Regression: the manifest was never staged by CI, so it 404'd live and the
  // site showed every duplicate while localhost (which serves it) looked fine.
  it("the deploy workflow stages duplicates.json", () => {
    const deploy = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf-8");
    expect(deploy).toContain("cp public/duplicates.json _site/public/duplicates.json");
    expect(deploy).toMatch(/test -f public\/duplicates\.json/);
  });

  it("the manifest builder preserves curation across regenerations", () => {
    const builder = readFileSync(resolve(root, "utils/dedupe/build_manifest.py"), "utf-8");
    expect(builder).toContain('previous.get("curated")');
    expect(builder).toContain("curated_note");
  });
});
