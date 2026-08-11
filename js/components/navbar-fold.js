/**
 * components/navbar-fold.js — sidebar toggle.
 *
 * Mobile (<1024px): the sidebar is off-canvas; #navbarCorner (hamburger)
 * toggles body.sidebar-open with a single transform transition, and the
 * scrim / Escape closes it. Desktop: the same control collapses the rail.
 *
 * No Three.js, no curtain animation — intentionally tiny.
 */
import { $ } from "../utils/dom.js";

export function setupNavbarFold() {
  const toggle = $("#navbarCorner");
  if (!toggle || toggle.__sacSidebarBound) return;
  toggle.__sacSidebarBound = true;

  const isDesktop = () => window.matchMedia?.("(min-width: 1024px)").matches;
  const setToggleLabel = () => {
    const label = isDesktop()
      ? document.body.classList.contains("sidebar-collapsed")
        ? "Expand navigation"
        : "Collapse navigation"
      : isOpen()
        ? "Close navigation"
        : "Open navigation";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  };
  const open = () => {
    document.body.classList.add("sidebar-open");
    toggle.setAttribute("aria-expanded", "true");
    setToggleLabel();
  };
  const close = () => {
    document.body.classList.remove("sidebar-open");
    toggle.setAttribute("aria-expanded", "false");
    setToggleLabel();
  };
  const setCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    try {
      localStorage.setItem("sac-sidebar-collapsed", collapsed ? "1" : "0");
    } catch {
      /* storage can be blocked */
    }
    setToggleLabel();
  };
  const isOpen = () => document.body.classList.contains("sidebar-open");

  try {
    if (localStorage.getItem("sac-sidebar-collapsed") === "1" && isDesktop()) {
      document.body.classList.add("sidebar-collapsed");
    }
  } catch {
    /* storage can be blocked */
  }
  setToggleLabel();

  toggle.addEventListener("click", () => {
    if (isDesktop()) setCollapsed(!document.body.classList.contains("sidebar-collapsed"));
    else isOpen() ? close() : open();
  });

  // Scrim tap closes
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (e.target.closest && e.target.closest(".sidebar-scrim")) close();
  });

  // Escape closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });

  // Crossing the breakpoint to desktop: clear the mobile state
  if (!window.__sacNavbarResizeBound) {
    window.__sacNavbarResizeBound = true;
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) close();
      if (window.innerWidth < 1024) document.body.classList.remove("sidebar-collapsed");
      setToggleLabel();
    });
  }
}
