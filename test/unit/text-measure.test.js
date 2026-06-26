/**
 * test/unit/text-measure.test.js — tests for js/utils/text-measure.js
 *
 * Tests the pretext wrapper: measureText, measureBlocks, getMaxHeight,
 * clearMeasureCache.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the pretext layout module to avoid loading the full library
vi.mock("../../js/pretext/layout.js", () => ({
  prepare: vi.fn((text) => ({ text, words: text.split(" ") })),
  layout: vi.fn((prepared, maxWidth, lineHeight) => {
    // Simulate: each word takes ~50px, so lines = ceil(words * 50 / maxWidth)
    const wordCount = prepared.words.length;
    const wordsPerLine = Math.max(1, Math.floor(maxWidth / 50));
    const lineCount = Math.ceil(wordCount / wordsPerLine);
    return { height: lineCount * lineHeight, lineCount };
  }),
}));

describe("text-measure (pretext wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("measureText returns height and lineCount", async () => {
    const { measureText } = await import("../../js/utils/text-measure.js");
    const result = measureText("one two three four five", "16px Georgia", 100, 24);
    expect(result.height).toBeGreaterThan(0);
    expect(result.lineCount).toBeGreaterThan(0);
  });

  it("measureText returns zeros for invalid input", async () => {
    const { measureText } = await import("../../js/utils/text-measure.js");
    expect(measureText("", "16px", 100, 24)).toEqual({ height: 0, lineCount: 0 });
    expect(measureText("text", "", 100, 24)).toEqual({ height: 0, lineCount: 0 });
    expect(measureText("text", "16px", 0, 24)).toEqual({ height: 0, lineCount: 0 });
    expect(measureText("text", "16px", 100, 0)).toEqual({ height: 0, lineCount: 0 });
  });

  it("measureBlocks measures multiple text blocks", async () => {
    const { measureBlocks } = await import("../../js/utils/text-measure.js");
    const blocks = [
      { text: "short", font: "16px Georgia", maxWidth: 200, lineHeight: 24 },
      {
        text: "a much longer text that will wrap to multiple lines for sure",
        font: "16px Georgia",
        maxWidth: 100,
        lineHeight: 24,
      },
    ];
    const results = measureBlocks(blocks);
    expect(results).toHaveLength(2);
    expect(results[0].height).toBeGreaterThan(0);
    expect(results[1].height).toBeGreaterThan(results[0].height);
  });

  it("getMaxHeight returns the maximum height", async () => {
    const { getMaxHeight } = await import("../../js/utils/text-measure.js");
    const blocks = [
      { text: "short", font: "16px Georgia", maxWidth: 200, lineHeight: 24 },
      {
        text: "very long text " + "word ".repeat(20),
        font: "16px Georgia",
        maxWidth: 100,
        lineHeight: 24,
      },
    ];
    const max = getMaxHeight(blocks);
    expect(max).toBeGreaterThan(0);
  });

  it("clearMeasureCache resets the cache", async () => {
    const { measureText, clearMeasureCache } = await import("../../js/utils/text-measure.js");
    // First call populates cache
    measureText("test text here", "16px Georgia", 100, 24);
    // Clear cache
    clearMeasureCache();
    // Second call should re-prepare (mock will be called again)
    const { prepare } = await import("../../js/pretext/layout.js");
    const callsBefore = prepare.mock.calls.length;
    measureText("test text here", "16px Georgia", 100, 24);
    expect(prepare.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("caches prepared text for the same text+font combination", async () => {
    const { measureText } = await import("../../js/utils/text-measure.js");
    const { prepare } = await import("../../js/pretext/layout.js");
    prepare.mockClear();

    // Call twice with same args
    measureText("cached text", "16px Georgia", 100, 24);
    measureText("cached text", "16px Georgia", 100, 24);

    // prepare should only have been called once (cached on second)
    expect(prepare).toHaveBeenCalledTimes(1);
  });
});
