/**
 * utils/hero-picks.js — which photographs stand under a club's title, decided in one place.
 *
 * The page (pages/club-page.js) draws the strip once the archive has loaded. The generator
 * (tools/sync-pages.mjs) runs the same choice at build time and writes `data-strip="<n>"` on the
 * club page's <body>, so the loading placeholder can hold the strip's space from the first paint.
 * The strip used to arrive with the archive and push the page down by its own height — CLS 0.10
 * landing on Singularity with a slow archive, 0.28 once scrolled, 0.21 on Chess (2026-10-05).
 * Pure: no DOM, no fetch, so both can import it.
 */

/** A strip needs this many photographs; with fewer the club has none. */
export const HERO_MIN = 2;
const HERO_MAX = 3;

/** The best landscape event photographs, widest first. */
export function heroPicks(entries) {
  return entries
    .filter(
      (e) =>
        e.file_type === "image" &&
        (e.is_event || e.is_iicm || e.role === "event") &&
        !e.is_extracted_from_doc &&
        !e.is_ob_portrait &&
        (Number(e.aspect_ratio) || 1) >= 1.2
    )
    .sort((a, b) => (Number(b.width) || 0) - (Number(a.width) || 0))
    .slice(0, HERO_MAX);
}

/** How many photographs the strip will show: 0 when the club has none. */
export function heroCount(entries) {
  const n = heroPicks(entries).length;
  return n >= HERO_MIN ? n : 0;
}

/** The ids public/duplicates.json hides from the site (see data.js). */
export function suppressedIds(manifest) {
  if (!manifest) return new Set();
  return new Set([
    ...(manifest.suppress || []),
    ...(manifest.degenerate || []),
    ...(manifest.curated || []),
    ...(manifest.same_person || []).flatMap((group) => group.drop.map((d) => d.id)),
  ]);
}
