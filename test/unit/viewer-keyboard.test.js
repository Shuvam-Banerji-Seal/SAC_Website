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
});
