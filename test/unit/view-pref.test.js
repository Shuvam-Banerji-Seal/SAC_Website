/**
 * The shared thumb-wall reading preference (pinned cards vs contact sheet).
 * It applies site-wide, so a bug here changes how every photo wall renders.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { loadThumbView, applyThumbView, wireThumbViewToggle } from "../../js/utils/view-pref.js";

describe("thumb view preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-thumb-view");
    document.body.innerHTML = "";
  });

  it("defaults to pinned", () => {
    expect(loadThumbView()).toBe("pinned");
  });

  it("stores and applies sheet on the document", () => {
    expect(applyThumbView("sheet")).toBe("sheet");
    expect(document.documentElement.getAttribute("data-thumb-view")).toBe("sheet");
    expect(loadThumbView()).toBe("sheet");
  });

  it("falls back to the legacy gallery key and migrates it", () => {
    localStorage.setItem("sac-gallery-view", "sheet");
    expect(loadThumbView()).toBe("sheet");
    applyThumbView("sheet");
    expect(localStorage.getItem("sac-gallery-view")).toBe(null);
    expect(localStorage.getItem("sac-thumb-view")).toBe("sheet");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem("sac-thumb-view", "wallpaper");
    expect(loadThumbView()).toBe("pinned");
  });

  it("wires a button row and syncs aria-pressed", () => {
    document.body.innerHTML = `
      <div id="v" role="group">
        <button data-view="pinned" aria-pressed="true">Pinned</button>
        <button data-view="sheet" aria-pressed="false">Sheet</button>
      </div>`;
    const wrap = document.getElementById("v");
    wireThumbViewToggle(wrap);
    expect(document.documentElement.getAttribute("data-thumb-view")).toBe("pinned");

    wrap.querySelector('[data-view="sheet"]').click();
    expect(document.documentElement.getAttribute("data-thumb-view")).toBe("sheet");
    expect(wrap.querySelector('[data-view="sheet"]').getAttribute("aria-pressed")).toBe("true");
    expect(wrap.querySelector('[data-view="pinned"]').getAttribute("aria-pressed")).toBe("false");
    expect(wrap.querySelector('[data-view="sheet"]').classList.contains("is-selected")).toBe(true);
  });

  it("applies the stored preference as soon as a toggle is wired", () => {
    localStorage.setItem("sac-thumb-view", "sheet");
    document.body.innerHTML = `
      <div id="v"><button data-view="pinned"></button><button data-view="sheet"></button></div>`;
    wireThumbViewToggle(document.getElementById("v"));
    expect(document.documentElement.getAttribute("data-thumb-view")).toBe("sheet");
  });
});
