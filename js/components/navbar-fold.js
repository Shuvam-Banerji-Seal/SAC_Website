/**
 * components/navbar-fold.js — the folded navigation's controller.
 *
 * The geometry (concertina panels, the dog-ear flap) is CSS; this module owns the
 * state those rules read from <body> and the things CSS can't do.
 *
 * Design contract:
 *  - Single breakpoint token: 1024px via matchMedia("(min-width:1024px)")
 *  - Mobile (<1024): the sheet is folded away until .sidebar-open unfolds it; scrim + Escape close; body overflow hidden while open
 *  - Desktop (≥1024): the sheet is open by default; the same corner folds it up (.sidebar-collapsed, persisted in localStorage)
 *  - body.fold-ready is added after first paint. Until then nothing transitions, so a
 *    page never animates its own initial state (a collapsed rail must not unfold on load)
 *  - Once per tab session on phones the corner lifts once, so the fold announces itself
 *  - No double-binding (guarded by __sacSidebarBound + __sacNavbarResizeBound)
 *  - Resize across breakpoint clears the opposing state (mobile open → close, desktop collapsed → keep but clear on mobile)
 *  - Respects prefers-reduced-motion for transform duration
 *  - Correct aria-label/title/expanded per mode
 */
import { $ } from "../utils/dom.js";

/** The page-turn sound, for people who switched sound effects on. calligraphy.js is
 *  fetched only then — it is a large module and sound is off by default. */
function paperSound() {
  try {
    if (JSON.parse(localStorage.getItem("sac-site-prefs"))?.sound !== true) return;
  } catch {
    return;
  }
  import("../utils/calligraphy.js").then((m) => m.playPageTurn?.()).catch(() => {});
}

const prefersLessMotion = () =>
  document.documentElement.getAttribute("data-reduce-motion") === "on" ||
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** A time custom property ("450ms" or "0.45s") in milliseconds. */
function cssMs(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

/**
 * Fold or unfold the desktop rail and let the page travel with it.
 *
 * The page's left margin is a function of the rail's width, so it changes the moment the
 * class does — while the rail takes ~0.7s to follow. The page therefore jumped left (or right)
 * at once, and for the first moments of a collapse the headline sat under the still-wide rail.
 * Instead we let layout land where it will, then slide each block from where it was to where
 * it is (FLIP) over the same time and delay the rail's own transition uses (--rail-dur,
 * --rail-lag in components.css). Text re-wraps once, at the start; nothing else jumps.
 */
function glidePage(change, collapsing) {
  const blocks = [...document.querySelectorAll("main, .site-footer")];
  const before = blocks.map((b) => b.getBoundingClientRect().left);
  change();
  const animated = document.body.classList.contains("fold-ready") && !prefersLessMotion();
  if (!animated) return;
  const duration = cssMs("--rail-dur", 450);
  const delay = collapsing ? cssMs("--rail-lag", 280) : 0;
  blocks.forEach((block, i) => {
    const dx = before[i] - block.getBoundingClientRect().left;
    if (typeof block.animate !== "function" || Math.abs(dx) < 1) return;
    block.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], {
      duration,
      delay,
      easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
      fill: "backwards",
    });
  });
}

export function setupNavbarFold() {
  const toggle = $("#navbarCorner");
  const navbar = document.getElementById("navbar");
  if (!toggle || !navbar || toggle.__sacSidebarBound) return;
  toggle.__sacSidebarBound = true;

  const MQ_DESKTOP = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : null;
  const isDesktop = () => (MQ_DESKTOP ? MQ_DESKTOP.matches : window.innerWidth >= 1024);
  const isOpen = () => document.body.classList.contains("sidebar-open");
  const isCollapsed = () => document.body.classList.contains("sidebar-collapsed");

  const setToggleLabel = () => {
    const desktop = isDesktop();
    const label = desktop
      ? isCollapsed()
        ? "Expand navigation"
        : "Collapse navigation"
      : isOpen()
        ? "Close navigation"
        : "Open navigation";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    toggle.setAttribute("aria-expanded", desktop ? String(!isCollapsed()) : String(isOpen()));
    // Keep aria-controls pointing at navbar for a11y
    if (!toggle.hasAttribute("aria-controls")) toggle.setAttribute("aria-controls", "navbar");
  };

  const lockBodyScroll = (lock) => {
    // Only ever LOCK on mobile — but always allow an unlock. The early return used to
    // cover both, so opening the nav on a phone and then widening past 1024px (a
    // tablet rotating to landscape) left the page unable to scroll on desktop.
    if (lock && isDesktop()) return;
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    document.body.style.touchAction = lock ? "none" : "";
  };

  // Off-canvas links must not be tab-reachable, or keyboard users land in
  // a menu they cannot see (WCAG 2.4.3 Focus Order). Desktop keeps the
  // rail live at all times.
  const syncInert = () => {
    navbar.inert = !isDesktop() && !isOpen();
  };

  const open = () => {
    document.body.classList.add("sidebar-open");
    navbar.inert = false;
    lockBodyScroll(true);
    // Move focus into nav for keyboard users
    const firstLink = navbar.querySelector("a, button");
    if (firstLink) firstLink.focus({ preventScroll: true });
    setToggleLabel();
  };
  const close = () => {
    document.body.classList.remove("sidebar-open");
    lockBodyScroll(false);
    setToggleLabel();
    // Return focus to toggle for continuity
    if (document.activeElement && navbar.contains(document.activeElement))
      toggle.focus({ preventScroll: true });
    syncInert();
  };
  const setCollapsed = (collapsed) => {
    glidePage(() => document.body.classList.toggle("sidebar-collapsed", collapsed), collapsed);
    try {
      localStorage.setItem("sac-sidebar-collapsed", collapsed ? "1" : "0");
    } catch {}
    setToggleLabel();
  };

  // Restore collapsed state on desktop only
  try {
    if (localStorage.getItem("sac-sidebar-collapsed") === "1" && isDesktop()) {
      document.body.classList.add("sidebar-collapsed");
    }
  } catch {}
  setToggleLabel();

  // Toggle button
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    paperSound();
    if (isDesktop()) setCollapsed(!isCollapsed());
    else isOpen() ? close() : open();
  });

  // Scrim tap closes (mobile only — scrim hidden on desktop)
  document.addEventListener("click", (e) => {
    if (!isOpen() || isDesktop()) return;
    const scrim = e.target.closest?.(".sidebar-scrim");
    if (scrim) close();
  });

  // Escape closes mobile drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen() && !isDesktop()) {
      e.preventDefault();
      close();
    }
  });

  // Click outside navbar closes on mobile (when not using scrim)
  document.addEventListener("click", (e) => {
    if (!isOpen() || isDesktop()) return;
    const insideNav = e.target.closest?.("#navbar");
    const isToggle = e.target.closest?.("#navbarCorner");
    if (!insideNav && !isToggle) {
      // Let scrim handler handle most cases, but also close if user taps content
      // Only if the click is not on navbar nor toggle — acts as lightweight focus loss
      // Check if click target is inside main — then close
      if (e.target.closest?.("main, .site-footer")) close();
    }
  });

  // Breakpoint crossing: clear opposing state
  const onBreakpointChange = () => {
    if (isDesktop()) {
      // Entering desktop: close mobile drawer, keep collapsed as persisted
      if (isOpen()) {
        document.body.classList.remove("sidebar-open");
        lockBodyScroll(false);
      }
    } else {
      // Entering mobile: clear collapsed (desktop-only concept)
      document.body.classList.remove("sidebar-collapsed");
      lockBodyScroll(isOpen());
    }
    setToggleLabel();
    syncInert();
  };

  if (!window.__sacNavbarResizeBound) {
    window.__sacNavbarResizeBound = true;
    if (MQ_DESKTOP && MQ_DESKTOP.addEventListener) {
      MQ_DESKTOP.addEventListener("change", onBreakpointChange);
    } else if (MQ_DESKTOP && MQ_DESKTOP.addListener) {
      MQ_DESKTOP.addListener(onBreakpointChange);
    }
    // Fallback resize listener for browsers without MQ events
    window.addEventListener("resize", () => {
      // Debounce via rAF
      if (window.__sacNavbarResizeRaf) cancelAnimationFrame(window.__sacNavbarResizeRaf);
      window.__sacNavbarResizeRaf = requestAnimationFrame(onBreakpointChange);
    });
  }

  // Ensure correct initial transform state after JS loads (prevents FOUC)
  // On desktop, navbar must be visible even if JS loads late
  requestAnimationFrame(() => {
    if (isDesktop()) {
      document.body.classList.remove("sidebar-open");
      lockBodyScroll(false);
    }
    setToggleLabel();
    syncInert();
    // Enable the transitions only now that the initial state has painted.
    requestAnimationFrame(() => document.body.classList.add("fold-ready"));
  });

  peekHint(toggle, isDesktop);
  setupDrawerSwipe(navbar, close, isDesktop, isOpen);
  setupTopbarAutoHide();
}

/* -------------------------------------------------------------------------
 * First-visit hint: on a phone the nav starts folded away and the corner looks
 * like a decoration. Lifting it once per tab session shows it is a fold you can
 * open. Never on desktop (the nav is already open) and never under reduced motion.
 * ------------------------------------------------------------------------- */
function peekHint(toggle, isDesktop) {
  if (isDesktop() || prefersLessMotion()) return;
  try {
    if (sessionStorage.getItem("sac-nav-peek")) return;
    sessionStorage.setItem("sac-nav-peek", "1");
  } catch {
    return;
  }
  toggle.classList.add("is-peeking");
  toggle.addEventListener("animationend", () => toggle.classList.remove("is-peeking"), {
    once: true,
  });
}

/* -------------------------------------------------------------------------
 * Swipe-left to dismiss the drawer — the gesture phone users already
 * expect from every other off-canvas menu.
 * ------------------------------------------------------------------------- */

const SWIPE_CLOSE_X = 55; // px of leftward travel before the drawer goes
const SWIPE_SLOP_Y = 45; // vertical slop; past this it's a scroll, not a flick

function setupDrawerSwipe(navbar, close, isDesktop, isOpen) {
  if (navbar.__sacSwipeBound) return;
  navbar.__sacSwipeBound = true;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  navbar.addEventListener(
    "touchstart",
    (e) => {
      if (isDesktop() || !isOpen() || e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  navbar.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (Math.abs(t.clientY - startY) > SWIPE_SLOP_Y) return;
      if (t.clientX - startX < -SWIPE_CLOSE_X) close();
    },
    { passive: true }
  );
}

/* -------------------------------------------------------------------------
 * Mobile masthead strip: retract on scroll-down, return on scroll-up.
 * Gives back 54px of reading height without costing discoverability.
 * ------------------------------------------------------------------------- */

const TOPBAR_HIDE_AFTER = 140; // px scrolled before the strip may retract
const TOPBAR_DELTA = 8; // ignore jitter below this

function setupTopbarAutoHide() {
  if (window.__sacTopbarBound) return;
  if (!document.querySelector(".mobile-topbar")) return;
  window.__sacTopbarBound = true;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < TOPBAR_DELTA) return;
    // Never retract while the drawer is open — the toggle rides with it.
    const hide = delta > 0 && y > TOPBAR_HIDE_AFTER;
    document.body.classList.toggle("topbar-hidden", hide);
    lastY = y;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
}
