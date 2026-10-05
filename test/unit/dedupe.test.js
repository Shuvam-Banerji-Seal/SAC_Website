/**
 * test/unit/dedupe.test.js — the duplicate manifest must never quietly eat
 * something the site needs.
 *
 * The manifest is generated (tools/dedupe/), so these assertions guard the
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
const people = manifest.same_person || [];
const dropped = new Set([
  ...manifest.suppress,
  ...manifest.degenerate,
  ...curated,
  ...people.flatMap((g) => g.drop.map((d) => d.id)),
]);
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

  // Same noise test the generator uses (tools/dedupe/build_manifest.py) and
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

  it("data.js applies the manifest and fails open without it", async () => {
    const src = readFileSync(resolve(root, "js/data.js"), "utf-8");
    expect(src).toContain("public/duplicates.json");
    expect(src).toContain("suppressed.has(entry.id)");
    // one reading of the manifest, shared with the page generator (tools/sync-pages.mjs)
    expect(src).toMatch(/\.then\(\(manifest\) => suppressedIds\(manifest\)\)/);
    // a missing/broken manifest must resolve to an empty Set, not throw
    expect(src).toMatch(/catch\(\(\) => new Set\(\)\)/);
    const { suppressedIds } = await import("../../js/utils/hero-picks.js");
    expect(suppressedIds(null).size).toBe(0);
    // the hand-curated list is merged alongside the generated ones
    const ids = suppressedIds({ suppress: [1], degenerate: [2], curated: [3] });
    expect([...ids].sort()).toEqual([1, 2, 3]);
  });

  // Regression: the manifest was never staged by CI, so it 404'd live and the
  // site showed every duplicate while localhost (which serves it) looked fine.
  it("the deploy workflow stages duplicates.json", () => {
    const deploy = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf-8");
    expect(deploy).toContain("cp public/duplicates.json _site/public/duplicates.json");
    expect(deploy).toMatch(/test -f public\/duplicates\.json/);
  });

  it("data.js hides the extra frames recorded in same_person", async () => {
    const { suppressedIds } = await import("../../js/utils/hero-picks.js");
    const ids = suppressedIds({ same_person: [{ keep: { id: 7 }, drop: [{ id: 8 }, { id: 9 }] }] });
    expect(ids.has(8) && ids.has(9)).toBe(true);
    expect(ids.has(7)).toBe(false);
  });

  it("the manifest builder preserves curation across regenerations", () => {
    const builder = readFileSync(resolve(root, "tools/dedupe/build_manifest.py"), "utf-8");
    expect(builder).toContain('previous.get("curated")');
    expect(builder).toContain("curated_note");
  });
});

describe("same-person curation (Dean's office staff portraits)", () => {
  const source = JSON.parse(
    readFileSync(resolve(root, "tools/dedupe/same_person.json"), "utf-8")
  ).groups;
  const byPath = new Map(images.map((r) => [r.path, r]));
  const visible = new Set(surviving.map((r) => r.id));

  it("shows exactly one frame per person", () => {
    expect(people.length).toBe(source.length);
    for (const g of source) {
      const members = [g.keep, ...g.drop].map((f) => byPath.get(`${g.folder}/${f}`));
      for (const m of members) expect(m, `${g.label}: file missing from the map`).toBeDefined();
      const shown = members.filter((m) => visible.has(m.id));
      expect(
        shown.map((m) => m.filename),
        g.label
      ).toEqual([g.keep]);
    }
  });

  it("the Dean's-office page shows one portrait per staff member", () => {
    const inFolder = surviving.filter((r) => r.category === "Administrative_Staffs_Doaa");
    expect(inFolder.length).toBe(source.length);
    expect(inFolder.length).toBeGreaterThanOrEqual(1);
  });

  it("the compiled manifest matches its path-keyed source (re-run build_manifest.py --people-only)", () => {
    expect(people.map((g) => g.label)).toEqual(source.map((g) => g.label));
    for (const [i, g] of source.entries()) {
      expect(people[i].keep_path).toBe(`${g.folder}/${g.keep}`);
      expect(people[i].drop.map((d) => d.path)).toEqual(g.drop.map((f) => `${g.folder}/${f}`));
    }
  });

  it("no file is claimed by two people", () => {
    const all = source.flatMap((g) => [g.keep, ...g.drop].map((f) => `${g.folder}/${f}`));
    expect(all.length).toBe(new Set(all).size);
  });
});

describe("manifest ids still point at the files they were built for", () => {
  // Ids are a generation-time counter. If `sac-assets-map` is re-run after files
  // are added, ids shift and an id-keyed manifest would silently hide the wrong
  // photographs while showing the real duplicates. Every entry carries its path
  // for exactly this reason, so a regenerate that breaks the mapping fails here.
  it("every group entry resolves to the same path", () => {
    for (const g of manifest.groups) {
      expect(byId.get(g.keep)?.path, `keep ${g.keep}`).toBe(g.keep_path);
      for (const d of g.drop) expect(byId.get(d.id)?.path, `drop ${d.id}`).toBe(d.path);
    }
    for (const g of people) {
      expect(byId.get(g.keep)?.path, `keep ${g.keep}`).toBe(g.keep_path);
      for (const d of g.drop) expect(byId.get(d.id)?.path, `drop ${d.id}`).toBe(d.path);
    }
  });
});
