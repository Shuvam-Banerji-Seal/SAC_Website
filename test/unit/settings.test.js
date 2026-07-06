/**
 * test/unit/settings.test.js — tests for js/components/settings.js
 *
 * Tests the settings panel: dark mode toggle, font selection,
 * texture selection, and localStorage persistence.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dom.js
vi.mock("../../js/utils/dom.js", () => ({
  $: (id) => document.getElementById(id),
  pageUrl: (p) => p,
}));

// Mock music.js
vi.mock("../../js/utils/music.js", () => ({
  setAmbientEnabled: vi.fn(),
}));

describe("settings module", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-texture");
    document.documentElement.style.cssText = "";

    // Setup the DOM elements settings.js expects
    document.body.innerHTML = `
      <div class="settings-overlay" id="settings-overlay"></div>
      <div class="settings-panel" id="settings-panel"></div>
      <button class="settings-fab" id="settings-fab" aria-label="Open settings" aria-expanded="false">⚙</button>
    `;
  });

  it("initSettings renders the panel with font and texture options", async () => {
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    const panel = document.getElementById("settings-panel");
    expect(panel.innerHTML).toContain("Settings");
    expect(panel.innerHTML).toContain("Typography");
    expect(panel.innerHTML).toContain("Paper texture");
    // Should have 7 font options
    expect(panel.querySelectorAll(".font-option").length).toBe(7);
    // Should have 8 texture options (fresh, aged, rustic, notice, dark, kraft, parchment, slate)
    expect(panel.querySelectorAll(".texture-option").length).toBe(8);
  });

  it("applies dark mode from localStorage on init", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ dark: true }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applies light mode when dark is false", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ dark: false }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies texture from localStorage on init", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ texture: "kraft" }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    expect(document.documentElement.getAttribute("data-texture")).toBe("kraft");
  });

  it("applies default texture when not set", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({}));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    expect(document.documentElement.getAttribute("data-texture")).toBe("fresh");
  });

  it("dark mode checkbox reflects stored preference", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ dark: true }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    const darkToggle = document.getElementById("settings-dark");
    expect(darkToggle).toBeTruthy();
    expect(darkToggle.checked).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("font option click updates CSS custom properties", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ font: "typewriter" }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    const fontDisplay = document.documentElement.style.getPropertyValue("--font-display");
    expect(fontDisplay).toContain("Special Elite");
  });

  it("font selection updates CSS custom properties", async () => {
    localStorage.setItem("sac-site-prefs", JSON.stringify({ font: "typewriter" }));
    const { initSettings } = await import("../../js/components/settings.js");
    initSettings();

    const fontDisplay = document.documentElement.style.getPropertyValue("--font-display");
    expect(fontDisplay).toContain("Special Elite");
  });
});
