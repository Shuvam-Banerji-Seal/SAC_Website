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

  it("has a zoom button that mirrors the click-to-zoom state", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    mountGroup();
    clickFirst();

    const overlay = document.getElementById("viewer-overlay");
    const zoom = overlay.querySelector(".viewer-zoom");
    const viewerImg = overlay.querySelector(".viewer-img");
    expect(zoom.getAttribute("aria-pressed")).toBe("false");

    zoom.click();
    expect(zoom.getAttribute("aria-pressed")).toBe("true");
    expect(viewerImg.classList.contains("is-zoomed")).toBe(true);

    zoom.click();
    expect(zoom.getAttribute("aria-pressed")).toBe("false");
    expect(viewerImg.classList.contains("is-zoomed")).toBe(false);
  });

  it("resets zoom when paging to the next image", async () => {
    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    mountGroup();
    clickFirst();

    const overlay = document.getElementById("viewer-overlay");
    overlay.querySelector(".viewer-zoom").click();
    expect(overlay.querySelector(".viewer-img").classList.contains("is-zoomed")).toBe(true);

    press("ArrowRight");
    expect(overlay.querySelector(".viewer-img").classList.contains("is-zoomed")).toBe(false);
    expect(overlay.querySelector(".viewer-zoom").getAttribute("aria-pressed")).toBe("false");
  });

  it("copies the full-size URL when no native share sheet exists", async () => {
    const written = [];
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text) => {
          written.push(text);
          return Promise.resolve();
        },
      },
      configurable: true,
    });

    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    document.body.innerHTML = `
      <a href="full-share.jpg" data-viewer="s" data-title="Share Plate" data-context="Ctx">
        <img src="thumb-share.jpg" alt="plate" />
      </a>`;
    document
      .querySelector('[data-viewer="s"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    document.getElementById("viewer-overlay").querySelector(".viewer-share").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(written.length).toBe(1);
    expect(written[0]).toContain("full-share.jpg");
  });

  it("prefers the native share sheet when available", async () => {
    const shared = [];
    Object.defineProperty(navigator, "share", {
      value: (data) => {
        shared.push(data);
        return Promise.resolve();
      },
      configurable: true,
    });

    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    document.body.innerHTML = `
      <a href="native.jpg" data-viewer="n" data-title="Native Plate" data-context="Ctx">
        <img src="thumb-n.jpg" alt="plate" />
      </a>`;
    document
      .querySelector('[data-viewer="n"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    document.getElementById("viewer-overlay").querySelector(".viewer-share").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(shared.length).toBe(1);
    expect(shared[0].url).toContain("native.jpg");
    expect(shared[0].title).toBe("Native Plate");
  });

  it("falls back to selection copy when the clipboard API is denied", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
    const calls = [];
    document.execCommand = (command) => {
      calls.push(command);
      return true;
    };

    const { initViewer } = await import("../../js/components/viewer.js");
    initViewer();
    document.body.innerHTML = `
      <a href="fallback.jpg" data-viewer="x" data-title="Fallback" data-context="Ctx">
        <img src="thumb-x.jpg" alt="x" />
      </a>`;
    document
      .querySelector('[data-viewer="x"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const share = document.getElementById("viewer-overlay").querySelector(".viewer-share");
    share.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual(["copy"]);
    expect(share.textContent).toBe("✓");
  });
});
