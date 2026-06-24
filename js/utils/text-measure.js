/**
 * utils/text-measure.js — pretext wrapper for text measurement.
 *
 * Wraps chenglou/pretext (via utils/pretext/dist/layout.js) with a
 * simple API for the SAC website. Provides text height measurement
 * without DOM reflow, used for dynamic card-height equalization and
 * responsive column calculation.
 *
 * Usage:
 *   import { measureText } from './utils/text-measure.js';
 *   const { height, lineCount } = measureText('Hello world', '16px Georgia');
 */
import { prepare, layout } from "../../utils/pretext/dist/layout.js";

/* -------------------------------------------------------------------------
 * Cache — stores PreparedText objects keyed by (text, font).
 * Avoids re-running prepare() for the same text block.
 * ------------------------------------------------------------------------- */

const cache = new Map();

function getPrepared(text, font) {
  const key = text + "|" + font;
  if (cache.has(key)) return cache.get(key);
  const prepared = prepare(text, font);
  cache.set(key, prepared);
  return prepared;
}

/* -------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

/**
 * Measure text height and line count.
 * @param {string} text - The text to measure
 * @param {string} font - CSS font string (e.g. "16px Georgia")
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} lineHeight - Line height in pixels
 * @returns {{ height: number, lineCount: number }}
 */
export function measureText(text, font, maxWidth, lineHeight) {
  if (!text || !font || !maxWidth || !lineHeight) {
    return { height: 0, lineCount: 0 };
  }
  try {
    const prepared = getPrepared(text, font);
    return layout(prepared, maxWidth, lineHeight);
  } catch {
    return { height: 0, lineCount: 0 };
  }
}

/**
 * Measure multiple text blocks and return their heights.
 * Useful for equalizing card heights in a grid.
 * @param {Array<{text: string, font: string, maxWidth: number, lineHeight: number}>} blocks
 * @returns {Array<{height: number, lineCount: number}>}
 */
export function measureBlocks(blocks) {
  return blocks.map((b) => measureText(b.text, b.font, b.maxWidth, b.lineHeight));
}

/**
 * Get the maximum height across multiple blocks.
 * Useful for setting a fixed card height in a grid.
 * @param {Array<{text: string, font: string, maxWidth: number, lineHeight: number}>} blocks
 * @returns {number} The maximum height
 */
export function getMaxHeight(blocks) {
  const results = measureBlocks(blocks);
  return Math.max(...results.map((r) => r.height), 0);
}

/**
 * Clear the measurement cache.
 * Call this when fonts have loaded or the page layout has changed.
 */
export function clearMeasureCache() {
  cache.clear();
}
