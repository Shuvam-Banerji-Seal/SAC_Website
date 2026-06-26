/**
 * test/unit/config.test.js — tests for js/config.js
 *
 * Tests site configuration constants.
 */
import { describe, it, expect } from "vitest";

describe("config", () => {
  it("exports SITE_TITLE and NAV_ITEMS", async () => {
    const config = await import("../../js/config.js");
    expect(config.SITE_TITLE).toBeTruthy();
    expect(typeof config.SITE_TITLE).toBe("string");
    expect(config.NAV_ITEMS).toBeTruthy();
    expect(Array.isArray(config.NAV_ITEMS)).toBe(true);
  });

  it("NAV_ITEMS contains Home, About, Clubs, Events, Gallery", async () => {
    const { NAV_ITEMS } = await import("../../js/config.js");
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("About");
    expect(labels).toContain("Clubs");
    expect(labels).toContain("Events");
    expect(labels).toContain("Gallery");
  });

  it("NAV_ITEMS entries have label and href", async () => {
    const { NAV_ITEMS } = await import("../../js/config.js");
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.href).toBeTruthy();
    }
  });
});
