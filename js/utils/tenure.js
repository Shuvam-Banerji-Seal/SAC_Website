/**
 * utils/tenure.js — "is this the present office-bearer tenure?"
 *
 * Club pages carry only the current committee: historical OB tables were
 * retired from the pages in Sep 2026, and the portrait grids must agree with
 * that. The asset map dates OB portraits with `year` (2026) and/or `tenure`
 * ("26-27"); anything explicitly dated before the present year is past.
 * Undated entries are presumed present — the archive cannot prove otherwise,
 * and dropping them would hide current office bearers whose records were
 * filed without a date.
 */

/** @param {object} asset — one assets_map.jsonl entry
 *  @returns {boolean} true when the portrait belongs on the current page */
export function isCurrentTenure(asset) {
  const year = Number(asset?.year);
  if (Number.isFinite(year) && year > 0) return year >= 2026;

  const match = String(asset?.tenure || "").match(/(\d{2})\s*[-–]\s*(\d{2})/);
  if (match) return Number(match[1]) >= 26; // "26-27" current, "25-26" past

  return true;
}
