/**
 * test/unit/calligraphy.test.js — tests for the calligraphy animation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock matchMedia to not prefer reduced motion
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

describe("calligraphy", () => {
  it("revealText wraps characters in spans with animation", async () => {
    const { revealText } = await import("../../js/utils/calligraphy.js");
    const el = document.createElement("h1");
    el.textContent = "Hello";
    revealText(el, 500);

    const chars = el.querySelectorAll(".calligraphy-char");
    expect(chars.length).toBe(5);
    expect(el.classList.contains("calligraphy-active")).toBe(true);
  });

  it("revealText handles empty elements gracefully", async () => {
    const { revealText } = await import("../../js/utils/calligraphy.js");
    const el = document.createElement("h1");
    el.textContent = "";
    revealText(el, 500);
    expect(el.innerHTML).toBe("");
  });

  it("revealText handles null elements gracefully", async () => {
    const { revealText } = await import("../../js/utils/calligraphy.js");
    expect(() => revealText(null, 500)).not.toThrow();
  });

  it("revealText skips when prefers-reduced-motion is set", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { revealText } = await import("../../js/utils/calligraphy.js");
    const el = document.createElement("h1");
    el.textContent = "Test";
    revealText(el, 500);
    expect(el.querySelectorAll(".calligraphy-char").length).toBe(0);
  });

  it("revealText escapes HTML characters", async () => {
    const { revealText } = await import("../../js/utils/calligraphy.js");
    const el = document.createElement("h1");
    el.textContent = "<b>Test</b>";
    revealText(el, 500);
    const chars = el.querySelectorAll(".calligraphy-char");
    expect(chars.length).toBe(11); // <b>Test</b> = 11 chars
    // Should not contain raw HTML tags
    expect(el.innerHTML).not.toContain("<b>");
  });

  it("revealParagraphs reveals multiple paragraphs sequentially", async () => {
    const { revealParagraphs } = await import("../../js/utils/calligraphy.js");
    const container = document.createElement("div");
    container.innerHTML = "<p>First</p><p>Second</p>";
    revealParagraphs(container, 10);
    // After a delay, both paragraphs should have calligraphy chars
    await new Promise((resolve) => setTimeout(resolve, 100));
    const allChars = container.querySelectorAll(".calligraphy-char");
    expect(allChars.length).toBeGreaterThan(0);
  });
});
