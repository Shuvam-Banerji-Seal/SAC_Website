/**
 * test/unit/footer.test.js — tests for js/components/footer.js
 */
import { describe, it, expect, beforeEach } from "vitest";

describe("footer component", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="footer"></div>';
    // Set up minimal CSS variable environment
    document.documentElement.style.setProperty("--space-2", "0.5rem");
    document.documentElement.style.setProperty("--space-4", "1rem");
    document.documentElement.style.setProperty("--space-5", "1.25rem");
    document.documentElement.style.setProperty("--space-7", "2rem");
    document.documentElement.style.setProperty("--space-8", "3rem");
  });

  it("renders footer with 4 columns", async () => {
    // Simulate root location
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const { renderFooter } = await import("../../js/components/footer.js");
    renderFooter();

    const footer = document.querySelector(".site-footer");
    expect(footer).not.toBeNull();
    expect(footer.querySelectorAll(".site-footer__col").length).toBe(4);
  });

  it("renders IISER map embed", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const { renderFooter } = await import("../../js/components/footer.js");
    renderFooter();

    expect(document.querySelector(".site-footer__map iframe")).not.toBeNull();
  });

  it("renders quick links and sports links", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const { renderFooter } = await import("../../js/components/footer.js");
    renderFooter();

    const links = document.querySelectorAll(".site-footer__links a");
    expect(links.length).toBeGreaterThan(5); // QUICK_LINKS + SPORTS_LINKS
    // Check that Athletics is in the links
    const athleticsLink = Array.from(links).find(l => l.textContent.includes("Athletics"));
    expect(athleticsLink).not.toBeUndefined();
  });

  it("uses pageLink to resolve correct paths", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const { renderFooter } = await import("../../js/components/footer.js");
    renderFooter();

    const links = document.querySelectorAll(".site-footer__links a");
    const hrefs = Array.from(links).map(l => l.getAttribute("href"));
    // All links should point to pages/
    expect(hrefs.every(h => h.startsWith("pages/") || h.startsWith("../pages/") || h.startsWith("http"))).toBe(true);
  });
});
