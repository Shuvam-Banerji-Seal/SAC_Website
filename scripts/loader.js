/* =========================================================================
   SAC Loader controller
   - Builds the film reel DOM from a logo manifest.
   - Drives the staged timeline: scroll → burst → droplet → ripple → smear → done.
   - Exposes a small global `SACLoader` for the page to await or override.
   - No dependencies, no build step. ES2020.
   ========================================================================= */

(() => {
  "use strict";

  // --- Logo manifest ------------------------------------------------------
  // Order matters: this is the sequence the reels will scroll through.
  // The SAC logo is intentionally last — it is the one that "droplets in".
  // If a logo file fails to load, the reel just shows a thin placeholder,
  // so missing logos don't break the animation.
  const LOGOS = [
    { name: "AARSHI",       src: "assets/logos/aarshi.webp" },
    { name: "Arts Club",    src: "assets/logos/arts.webp" },
    { name: "Campus Radio", src: "assets/logos/campus_radio.webp" },
    { name: "IKQC",         src: "assets/logos/ikqc.webp" },
    { name: "Literary",     src: "assets/logos/literary.webp" },
    { name: "Music Club",   src: "assets/logos/music.svg" },
    { name: "Movie Club",   src: "assets/logos/movie.svg" },
    { name: "Nature Club",  src: "assets/logos/nature.svg" },
    { name: "Nrutya",       src: "assets/logos/nrutya.svg" },
    { name: "PIXEL",        src: "assets/logos/pixel.webp" },
    { name: "SAC",          src: "assets/logos/sac.svg", centerpiece: true },
  ];

  // --- Stage timing (ms) -------------------------------------------------
  // Tuned to feel snappy but not rushed. If you change these, also check
  // the keyframe durations in loader.css so the visuals stay in sync.
  const STAGES = {
    scroll:  2200,   // reels scrolling, user sees the dance
    burst:    450,   // reels start fading, SAC about to fall
    droplet: 1100,   // SAC droplet animation (CSS keyframe duration)
    ripple:   900,   // ripple emanates from center
    smear:    850,   // SAC smears into nothing
    fade:     600,   // whole loader fades
  };

  // --- Reel layout -------------------------------------------------------
  // 7 reels at 45deg, with varied scroll speeds + directions for a
  // parallax effect. top% positions the reel in the rotated stage.
  const REEL_LAYOUT = [
    { y:  "6%", duration: 16, direction: "normal" },
    { y: "20%", duration: 22, direction: "reverse" },
    { y: "34%", duration: 18, direction: "normal" },
    { y: "48%", duration: 26, direction: "reverse" },
    { y: "62%", duration: 20, direction: "normal" },
    { y: "76%", duration: 24, direction: "reverse" },
    { y: "90%", duration: 19, direction: "normal" },
  ];

  // --- Boot --------------------------------------------------------------
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init() {
    const loader = document.getElementById("sac-loader");
    if (!loader) return;

    // Build the stage if not already present (idempotent for HMR / testing).
    if (!loader.querySelector(".loader-stage")) {
      buildStage(loader);
    }

    if (reduceMotion) {
      runReducedMotion(loader);
    } else {
      runTimeline(loader);
    }
  }

  // --- DOM construction --------------------------------------------------
  function buildStage(loader) {
    const stage = document.createElement("div");
    stage.className = "loader-stage";
    stage.setAttribute("aria-hidden", "true");

    // Each reel gets its own track of frames. We duplicate the logo list
    // so the track is exactly 2x as long, then translate -50% for a
    // seamless loop.
    REEL_LAYOUT.forEach((spec) => {
      const reel = document.createElement("div");
      reel.className = "reel";
      reel.style.setProperty("--reel-y", spec.y);
      reel.style.setProperty("--reel-duration", `${spec.duration}s`);
      reel.style.setProperty("--reel-direction", spec.direction);

      const track = document.createElement("div");
      track.className = "reel__track";

      // Two full passes of the logos for a seamless loop.
      [...LOGOS, ...LOGOS].forEach((logo) => {
        track.appendChild(buildFrame(logo));
      });

      reel.appendChild(track);
      stage.appendChild(reel);
    });

    // The "river" — the focal point the droplet lands in.
    const river = document.createElement("div");
    river.className = "sac-river";
    loader.appendChild(river);

    // The SAC centerpiece that droplets in.
    const drop = document.createElement("div");
    drop.className = "sac-drop";
    drop.innerHTML = `<img class="sac-drop__logo" src="assets/logos/sac.svg" alt="Student Affairs Council — IISER Kolkata" />`;
    loader.appendChild(drop);

    // The corner branding + progress bar.
    const cornerL = document.createElement("div");
    cornerL.className = "loader-corner";
    cornerL.innerHTML = `SAC · IISER KOLKATA`;
    loader.appendChild(cornerL);

    const cornerR = document.createElement("div");
    cornerR.className = "loader-corner loader-corner--right";
    cornerR.innerHTML = `<span data-counter>REEL 0001</span>`;
    loader.appendChild(cornerR);

    const progress = document.createElement("div");
    progress.className = "loader-progress";
    progress.innerHTML = `
      <span data-progress-label>LOADING</span>
      <span class="loader-progress__bar"></span>
      <span data-progress-pct>00%</span>
    `;
    loader.appendChild(progress);

    // Insert the stage at the bottom of the loader so it sits behind the
    // SAC drop / river / progress UI.
    loader.insertBefore(stage, loader.firstChild);

    // Start the reel animations after a frame so the CSS variables take.
    requestAnimationFrame(() => {
      loader.querySelectorAll(".reel__track").forEach((t) => {
        t.style.animationPlayState = "running";
      });
    });
  }

  function buildFrame(logo) {
    const frame = document.createElement("div");
    frame.className = "reel__frames";
    frame.dataset.logo = logo.name;
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = logo.name;
    img.src = logo.src;
    img.onerror = () => {
      // Fallback to a tiny inline SVG placeholder so missing logos
      // don't leave a blank hole in the reel.
      frame.innerHTML = makePlaceholderSVG(logo.name);
    };
    frame.appendChild(img);
    return frame;
  }

  function makePlaceholderSVG(name) {
    const initials = name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <rect width="100" height="100" fill="rgba(255,255,255,0.04)"/>
      <text x="50" y="58" text-anchor="middle" font-family="serif" font-size="28" fill="rgba(240,185,74,0.7)">${initials}</text>
    </svg>`;
  }

  // --- Timeline ----------------------------------------------------------
  // The data-stage attribute on #sac-loader drives the CSS. JS just
  // transitions through the stages on a timer and updates the progress %.
  // The data-state attribute drives the final visibility (fading → hidden).
  function runTimeline(loader) {
    setStage(loader, "scroll");
    animateProgress(loader, 0, 1, STAGES.scroll + STAGES.burst);

    const seq = [
      { stage: "scroll",  at: 0 },
      { stage: "burst",   at: STAGES.scroll },
      { stage: "droplet", at: STAGES.scroll + STAGES.burst },
      { stage: "ripple",  at: STAGES.scroll + STAGES.burst + STAGES.droplet },
      { stage: "smear",   at: STAGES.scroll + STAGES.burst + STAGES.droplet + STAGES.ripple },
    ];

    seq.forEach(({ stage, at }) => {
      setTimeout(() => {
        setStage(loader, stage);
        updateReelCounter(loader);
        // Progress roughly mirrors the stage progress
        if (stage === "droplet") animateProgress(loader, 0.6, 0.85, STAGES.droplet);
        if (stage === "ripple")  animateProgress(loader, 0.85, 0.95, STAGES.ripple);
        if (stage === "smear")   animateProgress(loader, 0.95, 1.0, STAGES.smear);
      }, at);
    });

    const total =
      STAGES.scroll + STAGES.burst + STAGES.droplet + STAGES.ripple + STAGES.smear;

    setTimeout(() => {
      // data-stage still holds "smear" (or "droplet"/"ripple" if the
      // timeline differs), but we add data-state="fading" to trigger
      // the opacity transition. After the fade completes we move to
      // data-state="hidden" which sets display: none.
      loader.setAttribute("data-state", "fading");
      setTimeout(() => {
        loader.setAttribute("data-state", "hidden");
        loader.dispatchEvent(new CustomEvent("sac:loader:done", { bubbles: true }));
        // Expose a promise so callers can `await SACLoader.done()`.
        resolveDone();
      }, STAGES.fade);
    }, total);
  }

  function runReducedMotion(loader) {
    // For reduced motion, hold the loader briefly then fade.
    setStage(loader, "droplet");
    setTimeout(() => setStage(loader, "ripple"), 100);
    setTimeout(() => {
      setStage(loader, "smear");
      setTimeout(() => {
        loader.setAttribute("data-state", "fading");
        setTimeout(() => {
          loader.setAttribute("data-state", "hidden");
          loader.dispatchEvent(new CustomEvent("sac:loader:done", { bubbles: true }));
          resolveDone();
        }, STAGES.fade);
      }, 300);
    }, 300);
  }

  // --- Helpers -----------------------------------------------------------
  function setStage(loader, stage) {
    loader.setAttribute("data-stage", stage);
  }

  function animateProgress(loader, fromPct, toPct, duration) {
    const bar = loader.querySelector(".loader-progress__bar");
    const label = loader.querySelector("[data-progress-pct]");
    if (!bar) return;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = fromPct + (toPct - fromPct) * eased;
      bar.style.setProperty("--progress", String(pct));
      if (label) label.textContent = `${String(Math.round(pct * 100)).padStart(2, "0")}%`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  let _resolveDone;
  const _donePromise = new Promise((res) => { _resolveDone = res; });
  function resolveDone() {
    if (_resolveDone) _resolveDone();
  }

  // --- Global handle -----------------------------------------------------
  // Pages can do `await SACLoader.done()` before kicking off heavy work,
  // or call `SACLoader.skip()` to fast-forward (e.g. on a "Skip" button).
  window.SACLoader = {
    done: () => _donePromise,
    skip: () => {
      const loader = document.getElementById("sac-loader");
      if (!loader) return;
      const cur = loader.getAttribute("data-state");
      if (cur === "hidden" || cur === "fading") return;
      // Shortcut: fade out fast, then hide.
      loader.setAttribute("data-state", "fading");
      setTimeout(() => {
        loader.setAttribute("data-state", "hidden");
        loader.dispatchEvent(new CustomEvent("sac:loader:done", { bubbles: true }));
        resolveDone();
      }, 200);
    },
  };

  // --- Reel counter ------------------------------------------------------
  // Cycles the "REEL 0001" label like a film counter for atmosphere.
  let _reelFrame = 0;
  function updateReelCounter(loader) {
    _reelFrame = (_reelFrame + 1) % 9999;
    const el = loader.querySelector("[data-counter]");
    if (el) el.textContent = `REEL ${String(_reelFrame).padStart(4, "0")}`;
  }

  // --- DOM ready --------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
