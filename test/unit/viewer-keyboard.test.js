/**
 * Regression: the viewer's keyboard handler was removed on close() but only
 * ever bound inside the one-time overlay._wired block — so Escape, arrows,
 * and Z worked exactly once per page load. Re-opening the lightbox left it
 * unresponsive to the keyboard. These tests pin the re-arm behaviour.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function mountGroup() {
  document.body.innerHTML = `
    <main>
      <a href="a.jpg" data-viewer="g" data-title="Alpha" data-context="Test · Group">
        <img src="a.jpg" alt="alpha" />
      </a>
      <a href="b.jpg" data-viewer="g" data-title="Beta" data-context="Test · Group">
        <img src="b.jpg" alt="beta" />
      </a>
    </main>`;
}

function clickFirst() {
  document
    .querySelector('[data-viewer="g"]')
    .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function press(key) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("viewer keyboard", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    document.body.className = "";
    // jsdom has no layout engine; the strip scrolls the active thumb into view.
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  });

  afterEach(() => {
    document.getElementById("viewer-overlay")?.remove();
    document.body.innerHTML = "";
    document.body.className = "";
    document.body.style.overflow = "";
  });

  it("opens from a click and closes with Escape", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    mountGroup();

    clickFirst();
    const overlay = document.getElementById("viewer-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains("is-open")).toBe(true);

    press("Escape");
    expect(overlay.classList.contains("is-open")).toBe(false);
  });

  it("still responds to Escape after a close + reopen cycle", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    mountGroup();

    clickFirst();
    const overlay = document.getElementById("viewer-overlay");
    press("Escape");
    expect(overlay.classList.contains("is-open")).toBe(false);

    // The regression: this second open must re-arm the keyboard listener.
    clickFirst();
    expect(overlay.classList.contains("is-open")).toBe(true);
    press("Escape");
    expect(overlay.classList.contains("is-open")).toBe(false);
  });

  it("pages with arrow keys after a reopen", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    mountGroup();

    clickFirst();
    const overlay = document.getElementById("viewer-overlay");
    press("Escape");
    clickFirst();

    press("ArrowRight");
    expect(overlay.querySelector(".viewer-counter").textContent).toBe("2 / 2");
    press("ArrowLeft");
    expect(overlay.querySelector(".viewer-counter").textContent).toBe("1 / 2");
  });

  // Regression: grid tiles serve a 480px thumb_url; the lightbox rendered that
  // thumbnail instead of the full plate (soft at ~920px + 2x zoom).
  it("shows the anchor's full-size href, not the grid thumbnail", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    document.body.innerHTML = `
      <a href="full.jpg" data-viewer="f" data-title="Plate" data-context="Ctx">
        <img src="thumb.jpg" alt="plate" />
      </a>`;

    document
      .querySelector('[data-viewer="f"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const viewerImg = document.getElementById("viewer-overlay").querySelector(".viewer-img");
    expect(viewerImg.getAttribute("src")).toBe("full.jpg");
  });

  it("honours data-full for controls without an href", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    document.body.innerHTML = `
      <button type="button" data-viewer="b" data-context="Book" data-title="Leaf" data-full="big.jpg">
        <img src="thumb-b.jpg" alt="leaf" />
      </button>`;

    document
      .querySelector('[data-viewer="b"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const viewerImg = document.getElementById("viewer-overlay").querySelector(".viewer-img");
    expect(viewerImg.getAttribute("src")).toBe("big.jpg");
  });
});
