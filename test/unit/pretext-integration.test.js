/**
 * test/unit/pretext-integration.test.js — real integration test for pretext.
 *
 * Unlike text-measure.test.js which mocks the pretext library, this test
 * imports the REAL js/pretext/layout.js and calls prepare() + layout()
 * with actual text. This catches regressions if the built files are
 * updated or the submodule is bumped.
 *
 * jsdom does not provide a canvas context, so we mock OffscreenCanvas
 * with a minimal 2d context that returns approximate text widths.
 * The widths are based on character count × font size × 0.5 — not
 * pixel-perfect, but sufficient to exercise the full prepare→layout
 * pipeline and verify it produces sensible line counts and heights.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ── Mock OffscreenCanvas with a minimal 2d context ──────────────────
// pretext's measurement.js tries OffscreenCanvas first, then DOM canvas.
// jsdom provides neither, so we inject a mock before importing pretext.
let _font = "16px Georgia";
const _mockCtx = {
  set font(f) {
    _font = f;
  },
  get font() {
    return _font;
  },
  measureText(text) {
    // Approximate: each character is ~0.5 × fontSize wide.
    // This is rough but exercises the full pipeline.
    const sizeMatch = _font.match(/(\d+(?:\.\d+)?)\s*px/);
    const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 16;
    const width = text.length * fontSize * 0.5;
    return { width };
  },
};

class MockOffscreenCanvas {
  constructor() {
    this.width = 1;
    this.height = 1;
  }
  getContext() {
    return _mockCtx;
  }
}

const _origOffscreenCanvas = globalThis.OffscreenCanvas;
beforeAll(() => {
  globalThis.OffscreenCanvas = MockOffscreenCanvas;
});

afterAll(() => {
  if (_origOffscreenCanvas) {
    globalThis.OffscreenCanvas = _origOffscreenCanvas;
  } else {
    delete globalThis.OffscreenCanvas;
  }
});

// ── Tests ───────────────────────────────────────────────────────────
describe("pretext integration (real library)", () => {
  it("prepare and layout are exported as functions", async () => {
    const mod = await import("../../js/pretext/layout.js");
    expect(typeof mod.prepare).toBe("function");
    expect(typeof mod.layout).toBe("function");
  });

  it("prepare returns a prepared text object", async () => {
    const { prepare } = await import("../../js/pretext/layout.js");
    const prepared = prepare("The quick brown fox jumps over the lazy dog", "16px Georgia");
    expect(prepared).toBeTruthy();
    expect(typeof prepared).toBe("object");
  });

  it("layout returns height and lineCount for wrapping text", async () => {
    const { prepare, layout } = await import("../../js/pretext/layout.js");
    const text = "The quick brown fox jumps over the lazy dog and keeps running";
    const prepared = prepare(text, "16px Georgia");
    const result = layout(prepared, 100, 24);
    expect(result).toBeTruthy();
    expect(result.height).toBeGreaterThan(0);
    expect(result.lineCount).toBeGreaterThan(1);
  });

  it("layout returns 1 line for text that fits in one line", async () => {
    const { prepare, layout } = await import("../../js/pretext/layout.js");
    const text = "Short text";
    const prepared = prepare(text, "16px Georgia");
    // Very wide max width — should fit in one line
    const result = layout(prepared, 10000, 24);
    expect(result.lineCount).toBe(1);
    expect(result.height).toBe(24);
  });

  it("layout height scales with line count", async () => {
    const { prepare, layout } = await import("../../js/pretext/layout.js");
    const text = "word ".repeat(50);
    const prepared = prepare(text, "16px Georgia");
    const result = layout(prepared, 80, 24);
    expect(result.lineCount).toBeGreaterThan(5);
    expect(result.height).toBe(result.lineCount * 24);
  });

  it("prepare handles empty text gracefully", async () => {
    const { prepare, layout } = await import("../../js/pretext/layout.js");
    const prepared = prepare("", "16px Georgia");
    const result = layout(prepared, 100, 24);
    expect(result.lineCount).toBe(0);
    expect(result.height).toBe(0);
  });

  it("prepare handles CJK text (no spaces)", async () => {
    const { prepare, layout } = await import("../../js/pretext/layout.js");
    const text = "这是一个中文测试文本用于验证自动换行功能";
    const prepared = prepare(text, "16px Georgia");
    const result = layout(prepared, 100, 24);
    expect(result.lineCount).toBeGreaterThan(1);
    expect(result.height).toBeGreaterThan(24);
  });

  it("clearCache is exported and callable", async () => {
    const mod = await import("../../js/pretext/layout.js");
    expect(typeof mod.clearCache).toBe("function");
    expect(() => mod.clearCache()).not.toThrow();
  });

  it("text-measure.js wrapper works with real pretext", async () => {
    // This is the real integration: the wrapper calls the real library
    const { measureText } = await import("../../js/utils/text-measure.js");
    const result = measureText(
      "The quick brown fox jumps over the lazy dog",
      "16px Georgia",
      100,
      24
    );
    expect(result.height).toBeGreaterThan(0);
    expect(result.lineCount).toBeGreaterThan(0);
  });
});
