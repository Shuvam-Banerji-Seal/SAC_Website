/**
 * utils/thumb.js — grid thumbnail resolution.
 *
 * The assets pipeline ships a 480px WebP variant for every image wider
 * than 600px (assets_map `thumb_url`). Grids render at ~220–435px CSS, so
 * they should pull the tiny variant; the lightbox keeps the full-size
 * `public_url` via the anchor's href/data attributes.
 *
 * Logs nothing, falls back silently: entries without thumb_url (small
 * images, older maps) keep serving public_url.
 */

/**
 * Pick the best src for a grid tile.
 * @param {object} asset — one assets_map.jsonl entry
 * @returns {string} thumb_url when present and the entry is an image,
 *                   else public_url
 */
export function gridSrc(asset) {
  if (!asset) return "";
  if (asset.file_type === "image" && asset.thumb_url) return asset.thumb_url;
  return asset.public_url || "";
}
