/**
 * js/preloader.js — asset pre-loader for the SAC website.
 *
 * This runs BEFORE the main loader (js/loader.js). It fetches key
 * assets (CSS, JS, textures, fonts) into the browser cache so the
 * main loader animation and page render smoothly on both desktop
 * and mobile.
 *
 * Flow:
 *   1. Show pre-loader UI (percentage bar 0-100%)
 *   2. Fetch each asset in parallel, update percentage as they complete
 *   3. When all assets are cached, fade out pre-loader
 *   4. Dispatch a "preloader-done" event so the main loader can start
 *
 * The pre-loader is designed to be ultra-light: no dependencies,
 * no ES module imports, just a plain script that runs immediately.
 */

(function () {
  "use strict";

  // ── Assets to pre-fetch into browser cache ──────────────────────
  // These are the critical assets the main loader and page need.
  // We fetch them with `fetch(url, { cache: "force-cache" })` so
  // the browser stores them in its HTTP cache for instant retrieval.

  var BASE = (function () {
    var path = window.location.pathname;
    // If we're in /pages/, assets are one level up
    if (path.indexOf("/pages/") !== -1) return "../";
    return "";
  })();

  var ASSETS = [
    // Core CSS
    "css/reset.css",
    "css/variables.css",
    "css/main.css",
    "css/components.css",
    "css/loader.css",
    "css/settings.css",
    "css/viewer.css",
    "css/preloader.css",
    "css/pages/home.css",
    // Core JS
    "js/main.js",
    "js/config.js",
    "js/data.js",
    "js/loader.js",
    "js/utils/dom.js",
    // Textures (the most impactful for visual smoothness)
    "assets/natural-paper.png",
    "assets/newspaper-bg.jpg",
    "assets/old-paper.jpg",
  ];

  // ── DOM elements ────────────────────────────────────────────────
  var preloader = document.getElementById("preloader");
  if (!preloader) {
    // No pre-loader element — skip silently
    return;
  }

  var fillEl = preloader.querySelector(".preloader__fill");
  var percentNumEl = preloader.querySelector(".preloader__percent-num");

  // ── State ───────────────────────────────────────────────────────
  var loaded = 0;
  var total = ASSETS.length;

  function updateProgress() {
    var pct = Math.round((loaded / total) * 100);
    if (fillEl) fillEl.style.width = pct + "%";
    if (percentNumEl) percentNumEl.textContent = pct;
  }

  function fetchAsset(url) {
    return fetch(BASE + url, { cache: "force-cache" })
      .then(function () {
        loaded++;
        updateProgress();
      })
      .catch(function () {
        // Asset might not exist (e.g., page-specific CSS on wrong page)
        // Count it as loaded anyway so the bar completes
        loaded++;
        updateProgress();
      });
  }

  function done() {
    // Ensure we show 100% briefly before fading
    if (fillEl) fillEl.style.width = "100%";
    if (percentNumEl) percentNumEl.textContent = "100";

    setTimeout(function () {
      preloader.classList.add("is-done");
      // Dispatch event so the main loader knows it can start
      window.dispatchEvent(new CustomEvent("preloader-done"));
      // Remove from DOM after fade
      setTimeout(function () {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 700);
    }, 200);
  }

  // ── Start pre-loading ───────────────────────────────────────────
  updateProgress();

  // Fetch all assets in parallel
  var promises = ASSETS.map(function (url) {
    return fetchAsset(url);
  });

  Promise.all(promises).then(done).catch(done);

  // ── Safety timeout: if assets take too long, just proceed ───────
  setTimeout(done, 4000);
})();
