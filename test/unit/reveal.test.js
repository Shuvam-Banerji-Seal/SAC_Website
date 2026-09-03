/**
 * test/unit/reveal.test.js — reveal hardening: stagger cap, delay cleanup,
 * global backstop, revealAll export, eagerFirst helper.
 *
 * Regression: gallery sections with 269 thumbs produced ~19s fade-in waits
 * (70ms × index), and any thumb missed by the observer stuck at opacity 0.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initImageReveal, revealAll, eagerFirst } from "../../js/utils/reveal.js";

let callbacks = [];

class FakeIO {
  constructor(cb) {
    this.cb = cb;
    callbacks.push(this);
    this.targets = [];
  }
  observe(t) {
    this.targets.push(t);
  }
  unobserve(t) {
    this.targets = this.targets.filter((x) => x !== t);
  }
  disconnect() {}
  fire(isIntersecting = true) {
    this.cb(
      this.targets.map((target) => ({ isIntersecting, target })),
      this
    );
  }
}

function buildSection(nThumbs) {
  const section = document.createElement("section");
  section.className = "reveal-section";
  for (let i = 0; i < nThumbs; i++) {
    const li = document.createElement("li");
    li.className = "thumb thumb--reveal";
    const img = document.createElement("img");
    img.loading = "lazy";
    li.appendChild(img);
    section.appendChild(li);
  }
  document.body.appendChild(section);
  return section;
}

beforeEach(() => {
  document.body.innerHTML = "";
  callbacks = [];
  vi.stubGlobal("IntersectionObserver", FakeIO);
  // rAF that runs callbacks synchronously-ish (macrotask) for determinism
  vi.stubGlobal("requestAnimationFrame", (cb) => setTimeout(cb, 0));
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("reveal hardening", () => {
  it("caps stagger delay so huge sections never wait ~19s", async () => {
    buildSection(269);
    initImageReveal(document, { staggerMs: 70 });
    callbacks[0].fire(true);
    const delays = Array.from(document.querySelectorAll(".thumb--reveal")).map((t) =>
      parseFloat(t.style.transitionDelay || "0")
    );
    expect(Math.max(...delays)).toBeLessThanOrEqual(14 * 0.07 + 1e-9);
  });

  it("clears inline transition-delay after reveal (no lagged hover/filter)", async () => {
    vi.useFakeTimers();
    buildSection(3);
    initImageReveal(document, { staggerMs: 70 });
    callbacks[0].fire(true);
    await vi.runAllTimersAsync();
    // rAF stub uses setTimeout; flush those too
    await vi.runAllTimersAsync();
    const delays = Array.from(document.querySelectorAll(".thumb--reveal")).map(
      (t) => t.style.transitionDelay
    );
    expect(delays.every((d) => d === "")).toBe(true);
    vi.useRealTimers();
  });

  it("global backstop reveals anything still hidden after 4s", async () => {
    vi.useFakeTimers();
    const section = buildSection(2);
    // never fire the observer — backstop must still reveal
    initImageReveal(document);
    expect(document.querySelectorAll(".thumb--reveal.is-revealed").length).toBe(0);
    await vi.advanceTimersByTimeAsync(4100);
    expect(document.querySelectorAll(".thumb--reveal.is-revealed").length).toBe(2);
    expect(section).toBeTruthy();
    vi.useRealTimers();
  });

  it("revealAll() reveals hidden thumbs on demand (post-render safety)", () => {
    buildSection(3);
    expect(document.querySelectorAll(".is-revealed").length).toBe(0);
    revealAll(document);
    expect(document.querySelectorAll(".thumb--reveal.is-revealed").length).toBe(3);
  });

  it("eagerFirst() marks the first N thumb images eager + high priority", () => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-grid";
    for (let i = 0; i < 10; i++) {
      const li = document.createElement("li");
      li.className = "thumb";
      const img = document.createElement("img");
      img.loading = "lazy";
      li.appendChild(img);
      wrap.appendChild(li);
    }
    // a non-thumb image must stay untouched
    const logo = document.createElement("img");
    logo.loading = "lazy";
    logo.id = "untouched-logo";
    document.body.appendChild(logo);
    document.body.appendChild(wrap);
    eagerFirst(document, 6);
    const imgs = Array.from(wrap.querySelectorAll("img"));
    expect(imgs.slice(0, 6).every((img) => img.loading === "eager")).toBe(true);
    expect(imgs.slice(0, 6).every((img) => img.getAttribute("fetchpriority") === "high")).toBe(
      true
    );
    expect(imgs.slice(6).every((img) => img.loading === "lazy")).toBe(true);
    expect(document.getElementById("untouched-logo").loading).toBe("lazy");
  });
});
