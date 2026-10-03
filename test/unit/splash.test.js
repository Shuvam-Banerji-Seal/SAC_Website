/**
 * test/unit/splash.test.js — the letterpress entrance plays once per tab session.
 *
 * It used to replay on all 38 pages, so every click on a link opened with the
 * same ~1s animation. The first page you open still gets it; after that,
 * navigation is instant.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const preloaderSrc = readFileSync(resolve(root, "js/preloader.js"), "utf-8");

const shell = () => {
  document.body.innerHTML = `
    <div id="preloader" class="preloader">
      <div class="preloader__fill"></div>
      <span class="preloader__percent-num">0</span>
    </div>`;
};
// the preloader is a classic script, so run it the way the browser does
const runPreloader = () => (0, eval)(preloaderSrc);

beforeEach(() => {
  // The preloader and loader both schedule timers (progress ticks, the safety
  // budget, the settle delay); fake them so none outlives the test.
  vi.useFakeTimers();
  vi.resetModules();
  sessionStorage.clear();
  delete window.__sacSplashSeen;
  document.body.className = "";
  shell();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("preloader (classic script)", () => {
  it("first page of the session: keeps the overlay and reports it was not seen", () => {
    runPreloader();
    expect(window.__sacSplashSeen).toBe(false);
    expect(document.getElementById("preloader")).not.toBeNull();
  });

  it("later pages: removes the overlay before it can paint, and still announces itself", () => {
    sessionStorage.setItem("sac-splash", "1");
    const done = vi.fn();
    window.addEventListener("preloader-done", done, { once: true });
    runPreloader();
    expect(window.__sacSplashSeen).toBe(true);
    expect(document.getElementById("preloader")).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
    // the device tier is still computed for everything that reads it
    expect(["low", "medium", "high"]).toContain(window.__sacDeviceTier);
  });

  it("treats blocked storage as a first visit rather than breaking the page", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => runPreloader()).not.toThrow();
    expect(window.__sacSplashSeen).toBe(false);
    expect(document.getElementById("preloader")).not.toBeNull();
  });
});

describe("loader (module)", () => {
  it("first page: builds the entrance and marks the session", async () => {
    window.__sacSplashSeen = false;
    const { initLoader } = await import("../../js/loader.js");
    initLoader();
    expect(document.getElementById("loader")).not.toBeNull();
    expect(sessionStorage.getItem("sac-splash")).toBe("1");
  });

  it("later pages: builds nothing at all", async () => {
    window.__sacSplashSeen = true;
    const { initLoader } = await import("../../js/loader.js");
    initLoader();
    expect(document.getElementById("loader")).toBeNull();
    expect(document.body.classList.contains("loader-active")).toBe(false);
  });

  it("is idempotent within a page", async () => {
    window.__sacSplashSeen = false;
    const { initLoader } = await import("../../js/loader.js");
    initLoader();
    const first = document.getElementById("loader");
    initLoader();
    expect(document.querySelectorAll("#loader")).toHaveLength(1);
    expect(document.getElementById("loader")).toBe(first);
  });
});
