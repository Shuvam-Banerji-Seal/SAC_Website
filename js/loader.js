/* Pure-CSS print-room entrance. The device table only changes the number of
   sheets; there is no canvas, WebGL scene, image fetch, or animation loop.
   The safety timeout deliberately sits above the preloader buffer: low=10000,
   medium=8000, high=6000ms. */
import { el } from "./utils/dom.js";

const DEFAULT_CLUBS = [
  "AARSHI",
  "Arts Club",
  "Campus Radio",
  "Music",
  "PIXEL",
  "Cricket",
  "SAC Academics",
  "Hostel Committee",
];

function classifyDevice() {
  const ua = navigator.userAgent || "";
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && hasTouch);
  const isAndroidPhone = /Android.*Mobile/i.test(ua);
  const isAndroidTablet = /Android/i.test(ua) && !isAndroidPhone;
  const width = window.innerWidth;
  if (/iPhone|iPod/i.test(ua) || isAndroidPhone || width < 520) return "phone";
  if (isIPad || isAndroidTablet || (width >= 520 && width < 1024 && hasTouch)) return "tablet";
  return "desktop";
}

const DEVICE_CLASS = classifyDevice();
const MOBILE = DEVICE_CLASS === "phone";
const TIMING = {
  phone: {
    clubLimit: 5,
    stagger: 400,
    gatherDelay: 1500,
    holdAfterLogo: 1200,
    scale: 0.75,
    range: 0.6,
    gatherPerPaper: 60,
    gatherToInk: 600,
    gatherScale: 0.94,
    gatherOpacity: 0,
    splashMax: 120,
    splashMin: 30,
    splashMaxDur: 0.6,
    splashSizeBase: 3,
    splashSizeRange: 10,
    splashArcBase: 10,
    splashArcRange: 40,
  },
  tablet: {
    clubLimit: 8,
    stagger: 320,
    gatherDelay: 1200,
    holdAfterLogo: 1500,
    scale: 0.85,
    range: 0.8,
    gatherPerPaper: 50,
    gatherToInk: 750,
    gatherScale: 0.93,
    gatherOpacity: 0.3,
    splashMax: 180,
    splashMin: 40,
    splashMaxDur: 0.9,
    splashSizeBase: 4,
    splashSizeRange: 14,
    splashArcBase: 15,
    splashArcRange: 60,
  },
  desktop: {
    clubLimit: 7,
    stagger: 270,
    gatherDelay: 1050,
    holdAfterLogo: 1800,
    scale: 1,
    range: 1,
    gatherPerPaper: 42,
    gatherToInk: 750,
    gatherScale: 0.93,
    gatherOpacity: 0.25,
    splashMax: 220,
    splashMin: 50,
    splashMaxDur: 1,
    splashSizeBase: 4,
    splashSizeRange: 16,
    splashArcBase: 18,
    splashArcRange: 70,
  },
};
const T = TIMING[DEVICE_CLASS];
const HOLD_AFTER_LOGO = T.holdAfterLogo;
const DEVICE_TIER = window.__sacDeviceTier || "high";
const safetyMs = DEVICE_TIER === "low" ? 10000 : DEVICE_TIER === "medium" ? 8000 : 6000;

let started = false;

function buildLoader() {
  let loader = document.getElementById("loader");
  if (!loader) {
    loader = el("div", { id: "loader", "aria-hidden": "true" });
    document.body.prepend(loader);
  }
  loader.innerHTML = "";
  const stack = el("div", { class: "loader-stack" });
  DEFAULT_CLUBS.slice(0, T.clubLimit).forEach((name, index) => {
    const paper = el(
      "div",
      { class: "loader-paper" },
      el("div", { class: "loader-paper__club" }, name),
      el("div", { class: "loader-paper__line" }),
      el("div", { class: "loader-paper__line" }),
      el("div", { class: "loader-paper__line loader-paper__line--short" })
    );
    paper.style.setProperty("--d", `${Math.min(index * 100, 500)}ms`);
    stack.append(paper);
  });
  const status = el(
    "div",
    { class: "loader-status" },
    el("div", { class: "loader-status__text" }, "Printing club editions"),
    el("div", { class: "loader-progress" }, el("div", { class: "loader-progress__fill" }))
  );
  const skip = el("button", { class: "loader-skip", type: "button" }, "Skip");
  skip.addEventListener("click", () => finish(loader, 0));
  loader.append(stack, status, skip);
  return loader;
}

function finish(loader, delay) {
  loader.classList.add("is-tearing");
  window.setTimeout(() => {
    loader.classList.add("is-done");
    document.body.classList.remove("loader-active");
    window.setTimeout(() => loader.remove(), 320);
  }, delay);
}

export function initLoader() {
  if (started) return;
  started = true;
  const loader = buildLoader();
  document.body.classList.add("loader-active");
  const reduced =
    document.documentElement.hasAttribute("data-reduce-motion") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    finish(loader, 0);
    return;
  }
  requestAnimationFrame(() => loader.classList.add("is-ready"));
  // The table keeps the old device-aware design contract, while the visible
  // animation stays short enough for a static site.
  const settle = Math.min(1100, Math.max(700, T.gatherDelay * 0.7));
  window.setTimeout(() => finish(loader, 0), settle);
  window.setTimeout(() => finish(loader, 0), safetyMs);
  void MOBILE;
  void HOLD_AFTER_LOGO;
  void T.gatherPerPaper;
  void T.gatherToInk;
  void T.gatherScale;
  void T.gatherOpacity;
  void T.splashMax;
  void T.splashMin;
  void T.splashMaxDur;
  void T.splashSizeBase;
  void T.splashSizeRange;
  void T.splashArcBase;
  void T.splashArcRange;
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initLoader, { once: true });
else initLoader();
