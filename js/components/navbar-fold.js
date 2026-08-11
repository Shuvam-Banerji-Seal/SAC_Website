/**
 * components/navbar-fold.js — sidebar toggle.
 *
 * Mobile (<1024px): the sidebar is off-canvas; #navbarCorner (hamburger)
 * toggles body.sidebar-open with a single transform transition, and the
 * scrim / Escape closes it. Desktop: sidebar always visible, no-op.
 *
 * No Three.js, no curtain animation — intentionally tiny.
 */
import { $ } from "../utils/dom.js";

export function setupNavbarFold() {
  const toggle = $("#navbarCorner");
  if (!toggle || toggle.__sacSidebarBound) return;
  toggle.__sacSidebarBound = true;

  const open = () => {
    document.body.classList.add("sidebar-open");
    toggle.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    document.body.classList.remove("sidebar-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const isOpen = () => document.body.classList.contains("sidebar-open");

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));

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
    });
  }
}
