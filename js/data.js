/**
 * data.js — loads and indexes the canonical assets_map.jsonl.
 *
 * The map is the single source of truth for the website: 429 entries
 * (345 WebP images + 84 markdown docs) with website-grade metadata
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

/* -------------------------------------------------------------------------
 * Eager, cached fetch
 *
 * We kick off the fetch the moment this module is imported, and every
 * subsequent caller (loader.js, pages/*.js) shares the same Promise.
 * Net effect: the browser's <link rel=preload> in index.html, the
 * loader, and the page initialisers all observe the same in-flight
 * response — the network is hit once, not three times.
 * ------------------------------------------------------------------------- */

let cachePromise = null;

function fetchJsonl() {
  if (!cachePromise) {
    // Check sessionStorage cache first (valid for 10 minutes)
    try {
      const cached = sessionStorage.getItem("sac-map-cache");
      const cachedTime = sessionStorage.getItem("sac-map-cache-time");
      if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime);
        if (age < 600_000) {
          cachePromise = Promise.resolve(JSON.parse(cached));
          return cachePromise;
        }
      }
    } catch {
      // sessionStorage unavailable or corrupted — ignore
    }

    cachePromise = fetch(JSONL_URL, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `assets_map.jsonl: HTTP ${res.status} ${res.statusText}`,
          );
        }
        return res.text();
      })
      .then((text) => {
        const entries = text
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        // Store in sessionStorage for subsequent loads within 10 minutes
        try {
          sessionStorage.setItem("sac-map-cache", JSON.stringify(entries));
          sessionStorage.setItem("sac-map-cache-time", String(Date.now()));
        } catch {
          /* quota exceeded, ignore */
        }
        return entries;
      })
      .catch((err) => {
        // Reset so a later retry (after a network blip) can succeed.
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}

export function loadAssetsMap() {
  return fetchJsonl();
}

/* -------------------------------------------------------------------------
 * Logo detection (defense in depth)
 *
 * The JSONL's is_logo flag is the canonical signal, but we layer two
 * extra fallbacks underneath so the website still finds a reasonable
 * logo even if a future regenerate ever misses one.
 * ------------------------------------------------------------------------- */

const LOGO_PATH_RE = /(logo|crest|seal|brand|mark)/i;

function pickLogo(images) {
  // 1. Canonical: the JSONL explicitly marks this entry as a logo
  for (const e of images) {
    if (e.is_logo) return e;
  }
  // 2. Image extracted from a document with "logo" in its filename
  for (const e of images) {
    if (e.is_extracted_from_doc && LOGO_PATH_RE.test(e.filename)) return e;
  }
  // 3. Any image with logo/crest/seal/brand/mark anywhere in its path
  for (const e of images) {
    if (LOGO_PATH_RE.test(e.path)) return e;
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Indexing helpers
 * ------------------------------------------------------------------------- */

/** Group entries by club, return one record per club with counts + a logo. */
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
    if (a.is_markdown_content && !c.markdown) c.markdown = a;
  }
  // One pass over each club's images to pick the best logo candidate
  for (const c of byClub.values()) {
    const clubImages = assets.filter(
      (a) => a.club === c.slug && a.file_type === "image",
    );
    c.logo = pickLogo(clubImages);
  }
  return Array.from(byClub.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Return all entries for a given club slug. */
export function getClubEntries(assets, slug) {
  return assets.filter((a) => a.club === slug);
}

/**
 * Return a single club summary record by slug.
 * Takes the pre-loaded assets array (so callers can stay synchronous
 * once they have the data).
 */
export function getClub(slug, assets) {
  if (!assets) {
    throw new Error("getClub(slug, assets) requires the assets array");
  }
  return indexByClub(assets).find((c) => c.slug === slug) ?? null;
}
