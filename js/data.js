/**
 * data.js — loads and indexes the canonical assets_map.jsonl.
 *
 * The map is the single source of truth for the website: 280 entries
 * (265 WebP images + 15 markdown docs) with website-grade metadata
 * (paths, dimensions, orientation, role, tenure, year, person, ob_role,
 * MIME, tags, public URL).
 *
 * It lives inside the public/assets submodule at
 *   public/assets/processed/assets_map.jsonl
 * and is fetched with a path that's relative to the current page
 * (the helper is in js/utils/dom.js).
 */
import { isInPagesDir } from "./utils/dom.js";

const JSONL_PATH = "public/assets/processed/assets_map.jsonl";
const JSONL_URL = isInPagesDir() ? `../${JSONL_PATH}` : JSONL_PATH;

let cache = null;

export async function loadAssetsMap() {
  if (cache) return cache;
  const res = await fetch(JSONL_URL, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load assets_map.jsonl: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  cache = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return cache;
}

/** Group entries by club, return one record per club with counts and a logo. */
export function indexByClub(assets) {
  const byClub = new Map();
  for (const a of assets) {
    if (!byClub.has(a.club)) {
      byClub.set(a.club, {
        slug: a.club,
        name: a.club_name,
        logo: null,
        markdown: null,
        counts: { total: 0, images: 0, markdowns: 0, ob: 0, iicm: 0, event: 0 },
      });
    }
    const c = byClub.get(a.club);
    c.counts.total++;
    if (a.file_type === "image") c.counts.images++;
    if (a.file_type === "markdown") c.counts.markdowns++;
    if (a.is_ob_portrait) c.counts.ob++;
    if (a.is_iicm) c.counts.iicm++;
    if (a.is_event) c.counts.event++;
    if (a.is_logo && !c.logo) c.logo = a;
    if (a.is_markdown_content && !c.markdown) c.markdown = a;
  }
  return Array.from(byClub.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Return all entries for a given club slug. */
export function getClubEntries(assets, slug) {
  return assets.filter((a) => a.club === slug);
}

/** Return a single club summary record by slug (uses the cached map). */
export function getClub(slug) {
  if (!cache) throw new Error("getClub() called before loadAssetsMap()");
  return indexByClub(cache).find((c) => c.slug === slug) ?? null;
}
