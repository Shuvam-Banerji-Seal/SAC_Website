/**
 * js/preloader.js — asset pre-loader + animation warm-up for the SAC website.
 *
 * This runs BEFORE the main loader (js/loader.js). It does three things:
 *
 *   Phase 1 — DOWNLOAD:  Fetch key assets (CSS, JS, textures, fonts) into
 *                         the browser HTTP cache.  A progress bar shows 0-70%.
 *
 *   Phase 2 — DECODE:    Pre-decode images (img.decode / createImageBitmap),
 *                         wait for document.fonts.ready, and force the browser
 *                         to parse all downloaded CSS by inserting a hidden
 *                         element that references every stylesheet class.
 *                         Progress bar shows 70-90%.
 *
 *   Phase 3 — WARM-UP:   Force a compositor paint cycle with a dummy 3D
 *                         transform so the GPU has created its layer tree
 *                         before the real animation starts.  On low-tier
 *                         devices this also pre-renders a test newspaper
 *                         card to warm up the preserve-3d pipeline.
 *                         Progress bar shows 90-100%.
 *
 * Only after all three phases complete do we dispatch "preloader-done".
 * This ensures the main loader animation plays smoothly even on low-powered
 * mobile devices — every frame's assets are decoded, fonts are shaped, and
 * the compositor is warmed up before the first transform is applied.
 *
 * The pre-loader is ultra-light: no dependencies, no ES module imports,
 * just a plain script that runs immediately.
 */

(function () {
  "use strict";

  // ── Path resolution ──────────────────────────────────────────────
  const BASE = (function () {
    const path = window.location.pathname;
    if (path.indexOf("/pages/") !== -1) return "../";
    return "";
  })();

  // ── Device capability detection ──────────────────────────────────
  // Returns "low", "medium", or "high" based on hardware signals.
  function detectDeviceTier() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4; // GB, Chrome only
    const conn = navigator.connection;
    const effType = conn ? conn.effectiveType : "4g";
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const saveData = conn ? conn.saveData : false;

    /* Low tier: very limited hardware (≤2 cores or ≤2 GB RAM),
       slow network (2g/slow-2g), or save-data request.
       Note: ≤4 cores alone is NOT low — many capable phones and tablets
       report 4 logical cores but have decent GPUs. The old threshold
       (cores <= 4 → low) was too aggressive and misclassified tablets. */
    if (cores <= 2 || memory <= 2 || effType === "2g" || effType === "slow-2g" || saveData) {
      return "low";
    }
    /* Medium tier: mobile/tablet UA with decent hardware, or 3g network,
       or limited desktop (≤4 cores / ≤4 GB RAM).
       The old threshold (cores <= 8 → medium) misclassified 8-core
       desktops as medium. Now only mobile UA or genuinely limited
       hardware gets medium. */
    if (isMobileUA || cores <= 4 || memory <= 4 || effType === "3g") {
      return "medium";
    }
    return "high";
  }

  const TIER = detectDeviceTier();

  // Expose for loader.js to read
  window.__sacDeviceTier = TIER;

  // ── Assets to pre-fetch ──────────────────────────────────────────
  // Image assets get decoded in Phase 2; CSS/JS get parsed via hidden
  // element in Phase 2; fonts are waited on via document.fonts.ready.

  const IMAGE_ASSETS = [
    "assets/natural-paper.png",
    "assets/newspaper-bg.jpg",
    "assets/old-paper.jpg",
  ];

  const CSS_ASSETS = [
    "css/reset.css",
    "css/variables.css",
    "css/main.css",
    "css/components.css",
    "css/loader.css",
    "css/settings.css",
    "css/viewer.css",
    "css/preloader.css",
  ];

  // Page-specific CSS — try to fetch but don't fail if missing
  const PAGE_CSS = (function () {
    const path = window.location.pathname;
    if (path.indexOf("/pages/") !== -1) {
      return ["css/pages/club.css"];
    }
    return ["css/pages/home.css"];
  })();

  const JS_ASSETS = ["js/main.js", "js/config.js", "js/data.js", "js/loader.js", "js/utils/dom.js"];

  const ALL_ASSETS = CSS_ASSETS.concat(PAGE_CSS).concat(JS_ASSETS).concat(IMAGE_ASSETS);

  // ── DOM elements ──────────────────────────────────────────────────
  const preloader = document.getElementById("preloader");
  if (!preloader) return; // No pre-loader element — skip silently

  const fillEl = preloader.querySelector(".preloader__fill");
  const percentNumEl = preloader.querySelector(".preloader__percent-num");
  const kickerEl = preloader.querySelector(".preloader__kicker");

  // ── State ─────────────────────────────────────────────────────────
  let loaded = 0;
  const total = ALL_ASSETS.length;

  function updateProgress(pct) {
    if (fillEl) fillEl.style.width = pct + "%";
    if (percentNumEl) percentNumEl.textContent = pct;
  }

  function setKicker(text) {
    if (kickerEl) kickerEl.textContent = text;
  }

  // ── Phase 1: Download assets into HTTP cache ─────────────────────
  // Progress: 0% → 70%

  function fetchAsset(url) {
    return fetch(BASE + url, { cache: "force-cache" })
      .then(function () {
        loaded++;
        const pct = Math.round((loaded / total) * 70);
        updateProgress(pct);
      })
      .catch(function () {
        loaded++;
        const pct = Math.round((loaded / total) * 70);
        updateProgress(pct);
      });
  }

  function phaseDownload() {
    setKicker("Loading The SAC Chronicle");
    const promises = ALL_ASSETS.map(function (url) {
      return fetchAsset(url);
    });
    return Promise.all(promises);
  }

  // ── Phase 2: Decode images + wait for fonts + parse CSS ──────────
  // Progress: 70% → 90%

  function decodeImage(url) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        // Force decode if supported (moves image from download → decoded)
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        } else if (window.createImageBitmap) {
          window.createImageBitmap(img).then(resolve).catch(resolve);
        } else {
          resolve();
        }
      };
      img.onerror = resolve; // Don't block on missing images
      img.src = BASE + url;
    });
  }

  function phaseDecode() {
    setKicker("Preparing Pages");
    updateProgress(75);

    const tasks = [];

    // 2a. Decode all images
    IMAGE_ASSETS.forEach(function (url) {
      tasks.push(
        decodeImage(url).then(function () {
          updateProgress(Math.min(85, 75 + Math.round((loaded / total) * 10)));
        })
      );
    });

    // 2b. Wait for fonts to be ready (critical for text measurement)
    if (document.fonts && document.fonts.ready) {
      tasks.push(
        document.fonts.ready.then(function () {
          updateProgress(87);
        })
      );
    }

    // 2c. Force CSS parsing by creating a hidden element that references
    //     key classes from each stylesheet. This forces the browser to
    //     parse the CSS rules and build the style tree.
    tasks.push(
      new Promise(function (resolve) {
        const probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText =
          "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
        // Reference classes from each CSS file so the browser must parse them
        probe.innerHTML =
          '<div class="newspaper stage-shell paper-stage ink-finale splash-dot drop3d ripple ink-spread sac-logo-print sac-crest"></div>' +
          '<div class="club-card club-card__inner club-card__nail club-card__stamp"></div>' +
          '<div class="navbar navbar__link navbar-corner"></div>' +
          '<div class="lead-article__headline masthead calligraphy-char calligraphy-active"></div>' +
          '<div class="club-header club-postmark ob-table role-badge"></div>';
        document.body.appendChild(probe);
        // Force layout by reading offsetHeight
        void probe.offsetHeight;
        // Remove after a frame
        requestAnimationFrame(function () {
          if (probe.parentNode) probe.parentNode.removeChild(probe);
          updateProgress(89);
          resolve();
        });
      })
    );

    return Promise.all(tasks);
  }

  // ── Phase 3: Compositor warm-up ──────────────────────────────────
  // Progress: 90% → 100%
  // Force the GPU to create compositor layers for 3D transforms before
  // the real animation starts. This prevents jank on the first frame.

  function phaseWarmup() {
    setKicker("Warming Up The Press");
    updateProgress(92);

    return new Promise(function (resolve) {
      // Create a hidden 3D-transformed element to force the compositor
      // to create a layer for preserve-3d + perspective transforms.
      const warmupEl = document.createElement("div");
      warmupEl.setAttribute("aria-hidden", "true");
      warmupEl.style.cssText = [
        "position:fixed",
        "left:-9999px",
        "top:-9999px",
        "width:100px",
        "height:100px",
        "perspective:1400px",
        "transform-style:preserve-3d",
        "will-change:transform",
        "pointer-events:none",
        "z-index:-1",
      ].join(";");

      const inner = document.createElement("div");
      inner.style.cssText = [
        "width:100%",
        "height:100%",
        "transform-style:preserve-3d",
        "will-change:transform",
        "opacity:0.01",
      ].join(";");
      warmupEl.appendChild(inner);
      document.body.appendChild(warmupEl);

      // Force the compositor to create layers by applying a 3D transform
      // and reading back the result. Two rAF cycles ensure the compositor
      // has actually processed the layer creation.
      requestAnimationFrame(function () {
        inner.style.transform =
          "translate3d(50px, 50px, 100px) rotateX(15deg) rotateY(25deg) rotateZ(5deg) scale(0.8)";
        // Force layout
        void inner.offsetHeight;

        requestAnimationFrame(function () {
          // Apply a second transform to flush the compositor pipeline
          inner.style.transform =
            "translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";
          void inner.offsetHeight;

          // For low-tier devices: do an extra warm-up cycle with a
          // more complex transform (simulating the newspaper animation)
          if (TIER === "low") {
            requestAnimationFrame(function () {
              for (let i = 0; i < 3; i++) {
                inner.style.transform =
                  "translate3d(" +
                  (Math.random() * 200 - 100) +
                  "px, " +
                  (Math.random() * 200 - 100) +
                  "px, " +
                  Math.random() * 300 +
                  "px) rotateX(" +
                  Math.random() * 90 +
                  "deg) rotateY(" +
                  Math.random() * 130 +
                  "deg) rotateZ(" +
                  Math.random() * 90 +
                  "deg)";
                void inner.offsetHeight;
              }

              requestAnimationFrame(function () {
                if (warmupEl.parentNode) warmupEl.parentNode.removeChild(warmupEl);
                updateProgress(100);
                resolve();
              });
            });
          } else {
            if (warmupEl.parentNode) warmupEl.parentNode.removeChild(warmupEl);
            updateProgress(100);
            resolve();
          }
        });
      });
    });
  }

  // ── Done: dispatch event ─────────────────────────────────────────

  function done() {
    if (fillEl) fillEl.style.width = "100%";
    if (percentNumEl) percentNumEl.textContent = "100";

    setTimeout(function () {
      preloader.classList.add("is-done");
      // Mark this session so subsequent navigations skip the full preloader.
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* sessionStorage may be unavailable (private mode) — ignore */
      }
      window.dispatchEvent(new CustomEvent("preloader-done", { detail: { tier: TIER } }));
      setTimeout(function () {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 700);
    }, 200);
  }

  // ── Revisit fast-path ────────────────────────────────────────────
  // After the first load in a session we never show the full progress-bar
  // preloader again. We just dispatch "preloader-done" immediately and let
  // loader.js / main.js proceed, while assets warm the HTTP cache in the
  // background (non-blocking). This is the biggest UX win for in-site nav.

  const SESSION_FLAG = "sac-loader-seen";
  const SKIP_QUERY = new URLSearchParams(window.location.search).has("skiploader");
  const REDUCED_MOTION = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function alreadyLoadedThisSession() {
    try {
      return sessionStorage.getItem(SESSION_FLAG) === "1";
    } catch {
      return false;
    }
  }

  function skipPreloader() {
    // Still warm the HTTP cache quietly so sub-page assets are ready soon,
    // but don't block first paint or show any progress UI.
    backgroundWarmCache();
    if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
    window.dispatchEvent(new CustomEvent("preloader-done", { detail: { tier: TIER } }));
  }

  // Non-blocking cache warm: fire-and-forget fetches, ignore results.
  function backgroundWarmCache() {
    ALL_ASSETS.forEach(function (url) {
      fetch(BASE + url, { cache: "force-cache" }).catch(function () {});
    });
  }

  // ── Run all phases sequentially (first visit) ────────────────────

  if (SKIP_QUERY || alreadyLoadedThisSession() || REDUCED_MOTION) {
    skipPreloader();
  } else {
    updateProgress(0);
    phaseDownload()
      .then(function () {
        return phaseDecode();
      })
      .then(function () {
        return phaseWarmup();
      })
      .then(function () {
        done();
      })
      .catch(function () {
        done();
      });
  }

  // ── Safety timeout: if anything takes too long, just proceed ─────
  // Low-tier devices get more time for decode/warmup
  const safetyMs = TIER === "low" ? 8000 : TIER === "medium" ? 6000 : 4000;
  setTimeout(done, safetyMs);
})();
