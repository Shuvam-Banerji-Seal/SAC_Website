/**
 * test/unit/dom.test.js — tests for js/utils/dom.js
 *
 * The dom module provides the core helpers used across the site:
 *   $, el(), onReady(), isInPagesDir(), pageUrl()
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to mock the module before importing it because it uses
// onReady which attaches to document.addEventListener.
describe("dom utilities", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.body.setAttribute("data-page", "home");
  });

  it("pageUrl resolves relative to root when not in pages dir", async () => {
    // Simulate being at root (index.html)
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageUrl("pages/clubs.html")).toBe("pages/clubs.html");
    expect(mod.pageUrl("css/main.css")).toBe("css/main.css");
  });

  it("pageUrl resolves with ../ prefix when in pages dir", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/pages/about.html");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageUrl("pages/clubs.html")).toBe("../pages/clubs.html");
    expect(mod.pageUrl("css/main.css")).toBe("../css/main.css");
  });

  it("isInPagesDir returns true when URL contains /pages/", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/pages/club.html?id=X");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.isInPagesDir()).toBe(true);
  });

  it("isInPagesDir returns false when at root", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.isInPagesDir()).toBe(false);
  });

  it("el() creates a DOM element with attributes and children", async () => {
    const mod = await import("../../js/utils/dom.js");
    const child = mod.el("span", { class: "inner" }, "Hello");
    const parent = mod.el("div", { id: "test", class: "outer" }, child);

    expect(parent.tagName).toBe("DIV");
    expect(parent.id).toBe("test");
    expect(parent.className).toBe("outer");
    expect(parent.children[0]).toBe(child);
    expect(child.textContent).toBe("Hello");
  });

  it("el() handles no children gracefully", async () => {
    const mod = await import("../../js/utils/dom.js");
    const div = mod.el("div", { id: "empty" });
    expect(div.tagName).toBe("DIV");
    expect(div.id).toBe("empty");
    expect(div.children.length).toBe(0);
  });

  it("el() handles text content as direct child", async () => {
    const mod = await import("../../js/utils/dom.js");
    const p = mod.el("p", {}, "Some text");
    expect(p.textContent).toBe("Some text");
  });

  it("$() returns element by CSS selector", async () => {
    const mod = await import("../../js/utils/dom.js");
    const div = document.createElement("div");
    div.id = "myel";
    div.className = "test-class";
    document.body.appendChild(div);
    expect(mod.$("#myel")).toBe(div);
    expect(mod.$(".test-class")).toBe(div);
  });

  it("$() returns null for missing selector", async () => {
    const mod = await import("../../js/utils/dom.js");
    expect(mod.$("#nonexistent")).toBe(null);
  });

  it("pageLink adds pages/ prefix from root", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageLink("clubs.html")).toBe("pages/clubs.html");
    expect(mod.pageLink("events.html")).toBe("pages/events.html");
  });

  it("pageLink adds ../pages/ prefix from pages dir", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/pages/club.html");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageLink("clubs.html")).toBe("../pages/clubs.html");
    expect(mod.pageLink("athletics.html")).toBe("../pages/athletics.html");
  });

  it("pageLink leaves absolute URLs unchanged", async () => {
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageLink("https://example.com/page.html")).toBe("https://example.com/page.html");
    expect(mod.pageLink("/SAC_Website/pages/clubs.html")).toBe("/SAC_Website/pages/clubs.html");
  });

  it("pageLink strips existing pages/ prefix", async () => {
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    const mod = await import("../../js/utils/dom.js");
    expect(mod.pageLink("../pages/clubs.html")).toBe("pages/clubs.html");
  });
});

describe("loadStylesheet", () => {
  const links = () => [...document.head.querySelectorAll('link[rel="stylesheet"]')];
  let loadStylesheet;

  beforeEach(async () => {
    vi.useFakeTimers();
    document.head.innerHTML = "";
    delete window.location;
    window.location = new URL("https://example.com/SAC_Website/");
    ({ loadStylesheet } = await import("../../js/utils/dom.js"));
  });
  afterEach(() => vi.useRealTimers());

  it("appends the link once and resolves when the browser says it has loaded", async () => {
    let done = false;
    const pending = loadStylesheet("css/search.css").then(() => (done = true));
    expect(links()).toHaveLength(1);
    expect(links()[0].getAttribute("href")).toBe("css/search.css");
    await Promise.resolve();
    expect(done).toBe(false); // not before the sheet is in
    links()[0].dispatchEvent(new Event("load"));
    await pending;
    expect(done).toBe(true);
  });

  it("a sheet that is still downloading is waited for, not counted as loaded", async () => {
    // the calendar asked while home.js's prefetch of the same file was in flight, was told
    // "already there", and drew its markup bare. A link with no .sheet has not arrived.
    const first = loadStylesheet("css/pages/calendar.css", 6000);
    let secondDone = false;
    const second = loadStylesheet("css/pages/calendar.css", 6000).then(() => (secondDone = true));
    expect(links()).toHaveLength(1); // still one link
    await Promise.resolve();
    await Promise.resolve();
    expect(secondDone).toBe(false);
    links()[0].dispatchEvent(new Event("load"));
    await Promise.all([first, second]);
    expect(secondDone).toBe(true);
  });

  it("a sheet the browser has already built resolves at once", async () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("href", "css/search.css");
    Object.defineProperty(link, "sheet", { value: {} });
    document.head.append(link);
    await expect(loadStylesheet("css/search.css")).resolves.toBeUndefined();
    expect(links()).toHaveLength(1);
  });

  it("never rejects and never waits longer than the guard", async () => {
    let done = false;
    loadStylesheet("css/a.css", 1500).then(() => (done = true));
    vi.advanceTimersByTime(1499);
    await Promise.resolve();
    expect(done).toBe(false);
    vi.advanceTimersByTime(2);
    await Promise.resolve();
    expect(done).toBe(true);

    let failed = false;
    const broken = loadStylesheet("css/b.css").then(() => (failed = true));
    links()[1].dispatchEvent(new Event("error"));
    await broken;
    expect(failed).toBe(true); // an error resolves too — the page works without the sheet
  });
});
