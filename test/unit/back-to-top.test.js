import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("back-to-top", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Reset scroll
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    // Clear module cache to allow re-import
    vi.resetModules();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    const btn = document.querySelector(".back-to-top");
    if (btn) btn.remove();
  });

  it("creates a hidden button with correct a11y", async () => {
    const { initBackToTop } = await import("../../js/components/back-to-top.js");
    initBackToTop();
    const btn = document.querySelector(".back-to-top");
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toBe("Back to top");
    expect(btn.type).toBe("button");
    expect(btn.hidden).toBe(true);
  });

  it("is idempotent (no duplicate buttons)", async () => {
    const { initBackToTop } = await import("../../js/components/back-to-top.js");
    initBackToTop();
    initBackToTop();
    expect(document.querySelectorAll(".back-to-top").length).toBe(1);
  });

  it("shows after scrolling past 300px and hides when back at top", async () => {
    const { initBackToTop } = await import("../../js/components/back-to-top.js");
    initBackToTop();
    const btn = document.querySelector(".back-to-top");
    // Simulate scroll past threshold
    window.scrollY = 400;
    window.dispatchEvent(new Event("scroll"));
    expect(btn.hidden).toBe(false);
    expect(btn.style.opacity).toBe("1");
    // Back to top
    window.scrollY = 0;
    window.dispatchEvent(new Event("scroll"));
    expect(btn.hidden).toBe(true);
  });

  it("scrolls to top on click (smooth unless reduce-motion)", async () => {
    const scrollSpy = vi.fn();
    window.scrollTo = scrollSpy;
    const { initBackToTop } = await import("../../js/components/back-to-top.js");
    initBackToTop();
    const btn = document.querySelector(".back-to-top");
    btn.hidden = false;
    btn.click();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});
