/**
 * components/navbar-fold.js — sidebar toggle (mobile off-canvas / desktop collapse).
 *
 * Design contract (fixed in this revision):
 *  - Single breakpoint token: 1024px via matchMedia("(min-width:1024px)")
 *  - Mobile (<1024): #navbar is off-canvas with transform; .sidebar-open toggles it; scrim + Escape close; body overflow hidden while open
 *  - Desktop (≥1024): #navbar is always visible; same button toggles .sidebar-collapsed (rail width) persisted in localStorage
 *  - No double-binding (guarded by __sacSidebarBound + __sacNavbarResizeBound)
 *  - Resize across breakpoint clears the opposing state (mobile open → close, desktop collapsed → keep but clear on mobile)
 *  - Respects prefers-reduced-motion for transform duration
 *  - Correct aria-label/title/expanded per mode
 */
import { $ } from "../utils/dom.js";

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
    // Only lock on mobile; desktop collapsed must not lock
    if (isDesktop()) return;
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    document.body.style.touchAction = lock ? "none" : "";
  };

  const open = () => {
    document.body.classList.add("sidebar-open");
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
  };
  const setCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
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
  });
}
