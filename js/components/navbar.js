/**
 * components/navbar.js — renders the new lightweight SIDEBAR navigation
 * into the existing <nav id="navbar"> mount on every page.
 *
 * Structure:
 *   <nav id="navbar" class="sidebar">
 *     <div class="sidebar__brand">The SAC <em>Chronicle</em>
 *       <p class="sidebar__tagline">IISER Kolkata</p>
 *     </div>
 *     <div class="sidebar__nav"> …links… </div>
 *     <div class="sidebar__foot">Vol. 01 · Empowering Voices</div>
 *   </nav>
 */
import { el, clear, pageUrl } from "../utils/dom.js";
import { NAV_ITEMS } from "../config.js";

export function renderNavbar(activePage) {
  const mount = document.getElementById("navbar");
  if (!mount) return;

  clear(mount);
  mount.classList.add("sidebar");
  mount.setAttribute("aria-label", "Primary");

  // Brand
  const brand = el(
    "div",
    { class: "sidebar__brand" },
    "The SAC ",
    el("em", {}, "Chronicle"),
    el("p", { class: "sidebar__tagline" }, "IISER Kolkata · Vol. 01")
  );

  // Links
  const nav = el("div", { class: "sidebar__nav" });
  for (const item of NAV_ITEMS) {
    const link = el(
      "a",
      {
        class: "sidebar__link" + (item.id === activePage ? " is-active" : ""),
        href: pageUrl(item.href),
        "aria-label": item.label,
      },
      el("span", { class: "sidebar__link-label" }, item.label)
    );
    if (item.id === activePage) link.setAttribute("aria-current", "page");
    nav.appendChild(link);
  }

  // Footer of the rail
  const foot = el(
    "div",
    { class: "sidebar__foot" },
    "Student Activity Council · Empowering Voices"
  );

  mount.append(brand, nav, foot);

  const toggle = document.getElementById("navbarCorner");
  if (toggle) {
    toggle.setAttribute("aria-label", "Collapse navigation");
    toggle.setAttribute("title", "Collapse navigation");
  }

  // Scrim for mobile (added once)
  if (!document.querySelector(".sidebar-scrim")) {
    document.body.appendChild(el("div", { class: "sidebar-scrim", "aria-hidden": "true" }));
  }
}
