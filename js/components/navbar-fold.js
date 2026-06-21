/**
 * components/navbar-fold.js — paper-fold navigation behaviour.
 *
 * Two distinct patterns, picked by viewport:
 *
 *   Mobile / tablet (< 1024px) — "curtain pull-down".
 *     The .navbar starts translated above the viewport
 *     (translateY(-100%), set in CSS). On load (after the loader
 *     exits on the home page, or on DOMContentLoaded elsewhere),
 *     we add .is-revealed which lands it at top: 0 with an
 *     overshoot easing — a sheet of paper being dropped into
 *     place.
 *
 *   Desktop (>= 1024px) — "peel-back corner".
 *     The top-of-page sticky navbar is replaced by a 64×64
 *     triangular button (.navbar-corner) fixed in the top-right
 *     corner of the viewport. Clicking it (or hovering on a
 *     pointer that supports hover) toggles .is-open on both
 *     the corner and the .navbar, which slides the navbar
 *     in from the right as a side drawer. Click outside or
 *     press Escape to close.
 *
 * Honours prefers-reduced-motion (CSS disables the transforms
 * entirely; this module just skips the JS reveal trigger).
 */
import { $ } from "../utils/dom.js";

const BREAKPOINT_PX = 1024; // matches the CSS @media (max-width: 1023.98px) split

function isDesktop() {
  return window.matchMedia(`(min-width: ${BREAKPOINT_PX}px)`).matches;
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* -------------------------------------------------------------------------
 * Mobile / tablet: curtain pull-down
 * ------------------------------------------------------------------------- */

function setupMobileReveal(navbar) {
  if (!navbar) return;
  if (isReducedMotion()) {
    navbar.classList.add("is-revealed");
    return;
  }
  const loader = $("#loader");
  const reveal = () => navbar.classList.add("is-revealed");

  if (!loader) {
    // No loader on this page (e.g. /pages/clubs.html) — reveal now.
    requestAnimationFrame(reveal);
    return;
  }
  if (loader.classList.contains("hidden")) {
    // Loader already done — reveal after a frame so the transition
    // has a chance to run from -100%.
    requestAnimationFrame(() => setTimeout(reveal, 60));
    return;
  }
  // Watch for the loader's .hidden class to flip.
  const obs = new MutationObserver(() => {
    if (loader.classList.contains("hidden")) {
      obs.disconnect();
      // The loader has a 0.9s opacity transition; wait it out so the
      // navbar doesn't fight the loader for the viewport mid-fade.
      setTimeout(reveal, 950);
    }
  });
  obs.observe(loader, { attributes: true, attributeFilter: ["class"] });
}

/* -------------------------------------------------------------------------
 * Desktop: peel-back corner + side drawer
 * ------------------------------------------------------------------------- */

function setupDesktopCorner(navbar, corner) {
  if (!navbar || !corner) return;
  if (isReducedMotion()) {
    // Reduced-motion CSS already hides the corner and sticks the
    // navbar at top: 0; nothing to wire here.
    return;
  }
  // Avoid double-binding on resize.
  if (corner.__sacFoldBound) return;
  corner.__sacFoldBound = true;

  const setOpen = (open) => {
    navbar.classList.toggle("is-open", open);
    corner.classList.toggle("is-open", open);
    corner.setAttribute("aria-expanded", String(open));
    corner.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  };

  // Click on the corner toggles.
  corner.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!corner.classList.contains("is-open"));
  });

  // Click anywhere outside the corner or drawer closes it.
  document.addEventListener("click", (e) => {
    if (!corner.classList.contains("is-open")) return;
    if (corner.contains(e.target) || navbar.contains(e.target)) return;
    setOpen(false);
  });

  // Escape closes.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && corner.classList.contains("is-open")) {
      setOpen(false);
      corner.focus();
    }
  });
}

/* -------------------------------------------------------------------------
 * Mode switching on resize
 *
 * If the user resizes the window across the 1024px breakpoint we
 * clear both .is-revealed and .is-open, then re-apply the right
 * one for the new mode. Without this, a desktop user who resizes
 * down would see the drawer slide out (it shouldn't on mobile) and
 * vice versa.
 * ------------------------------------------------------------------------- */

function clearNavbarState(navbar, corner) {
  if (navbar) {
    navbar.classList.remove("is-revealed");
    navbar.classList.remove("is-open");
  }
  if (corner) {
    corner.classList.remove("is-open");
    corner.setAttribute("aria-expanded", "false");
    corner.setAttribute("aria-label", "Open navigation");
  }
}

function setupResizeWatcher(navbar, corner) {
  if (isReducedMotion()) return;
  let wasDesktop = window.innerWidth >= BREAKPOINT_PX;
  window.addEventListener("resize", () => {
    const isDesk = window.innerWidth >= BREAKPOINT_PX;
    if (isDesk === wasDesktop) return;
    wasDesktop = isDesk;
    clearNavbarState(navbar, corner);
    if (isDesk) {
      // The previous desktop setup's click handler is still on the
      // corner element (it persists across resizes because the corner
      // is a static HTML element), but if the user resized from mobile
      // → desktop in the same session, our initial run() never
      // attached a desktop handler. Detect that case and attach now.
      const hasHandler = corner && corner.__sacFoldBound;
      if (!hasHandler) {
        setupDesktopCorner(navbar, corner);
        if (corner) corner.__sacFoldBound = true;
      }
    } else {
      setupMobileReveal(navbar);
    }
  });
}

/* -------------------------------------------------------------------------
 * Entry point
 * ------------------------------------------------------------------------- */

function waitForNavbar(callback) {
  // navbar.js renders the .navbar after onReady; it may not be in the
  // DOM yet when this module first runs.
  const tick = () => {
    const n = $(".navbar");
    const c = $("#navbarCorner");
    if (n) callback(n, c);
    else requestAnimationFrame(tick);
  };
  tick();
}

export function setupNavbarFold() {
  if (isReducedMotion()) {
    // CSS already collapses the navbar to its base sticky state on
    // reduced-motion. Nothing for JS to do.
    waitForNavbar((navbar) => navbar && navbar.classList.remove("is-revealed", "is-open"));
    return;
  }
  waitForNavbar((navbar, corner) => {
    if (isDesktop()) {
      setupDesktopCorner(navbar, corner);
    } else {
      setupMobileReveal(navbar);
    }
    setupResizeWatcher(navbar, corner);
  });
}
