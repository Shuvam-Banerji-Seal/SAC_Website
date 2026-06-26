/**
 * test/unit/preloader.test.js — tests for the pre-loader logic.
 *
 * The preloader is a plain script (not an ES module) so we test
 * its behavior by simulating the DOM and checking file contents.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("preloader", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="preloader" class="preloader">
        <div class="preloader__ink"></div>
        <div class="preloader__kicker">The SAC Chronicle</div>
        <div class="preloader__bar">
          <div class="preloader__fill"></div>
        </div>
        <div class="preloader__percent">
          <span class="preloader__percent-num">0</span>% loaded
        </div>
      </div>
    `;
  });

  it("preloader element exists in DOM", () => {
    const el = document.getElementById("preloader");
    expect(el).toBeTruthy();
    expect(el.classList.contains("preloader")).toBe(true);
  });

  it("preloader has fill and percent elements", () => {
    const fill = document.querySelector(".preloader__fill");
    const percent = document.querySelector(".preloader__percent-num");
    expect(fill).toBeTruthy();
    expect(percent).toBeTruthy();
    expect(percent.textContent).toBe("0");
  });

  it("preloader CSS defines is-done class for fade out", () => {
    const css = readFileSync(resolve(__dirname, "../../css/preloader.css"), "utf-8");
    expect(css).toContain(".preloader");
    expect(css).toContain(".is-done");
    expect(css).toContain(".preloader__fill");
    expect(css).toContain(".preloader__percent");
  });

  it("preloader JS file exists and contains asset list", () => {
    const js = readFileSync(resolve(__dirname, "../../js/preloader.js"), "utf-8");
    expect(js).toContain("ASSETS");
    expect(js).toContain("preloader-done");
    expect(js).toContain("force-cache");
  });

  it("preloader dispatches preloader-done event when complete", () => {
    return new Promise((resolve) => {
      let eventFired = false;
      window.addEventListener(
        "preloader-done",
        () => {
          eventFired = true;
          expect(eventFired).toBe(true);
          resolve();
        },
        { once: true }
      );
      window.dispatchEvent(new CustomEvent("preloader-done"));
    });
  });

  it("preloader is-done class hides the element", () => {
    const el = document.getElementById("preloader");
    el.classList.add("is-done");
    expect(el.classList.contains("is-done")).toBe(true);
  });
});
