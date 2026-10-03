/**
 * components/navbar.js — the navigation, as a sheet of folded paper.
 *
 * The toggle is a dog-eared page corner; opening it peels the flap flat while
 * the nav unfolds below as a concertina. The geometry lives in CSS (components.css,
 * "Navigation — a folded sheet"); this file builds the structure it needs.
 *
 * Desktop (>=1024px): the sheet is the page's left margin/index, open by default.
 *                     Folding it up leaves a narrow brand tab.
 * Mobile  (<1024px):  the sheet hangs from a sticky masthead strip that also
 *                     names the section you are in.
 *
 * Structure (panels nest, each hinged to the bottom edge of the one above, which
 * is what lets one rotation carry everything below it — a real concertina):
 *   <nav id="navbar" class="sidebar">
 *     <div class="fold">
 *       <div class="fold__panel fold__panel--1">   brand
 *         <div class="fold__sheet">…</div> <div class="fold__back"/> <div class="fold__shade"/>
 *         <div class="fold__panel fold__panel--2">   first half of the links
 *           <div class="fold__panel fold__panel--3">   second half
 *             <div class="fold__panel fold__panel--4">   reader settings + footer line
 *   </nav>
 *   <button id="navbarCorner" class="navbar-corner">   the dog-ear (layers built here)
 */
import { el, clear, pageUrl } from "../utils/dom.js";
import { NAV_ITEMS } from "../config.js";

/**
 * The dog-ear. Three layers, all decorative (the <button> carries the label):
 *   under  the table showing through where the corner is folded away
 *   flap   the folded-over triangle; it rotates about the fold line (the diagonal)
 *          — flat at rest, lifted on hover, 180deg (unfolded) when the nav is open
 *   faces  the flap's two sides: the paper's back with the menu mark, and — once it
 *          has turned over — the page's front with a close mark
 * Built here, not in 38 HTML files; before this runs the static hamburger <svg>
 * is shown on a CSS stand-in for the folded corner, so nothing jumps.
 */
function buildCorner(toggle) {
  if (!toggle || toggle.querySelector(".corner__flap")) return;
  clear(toggle);
  toggle.append(
    el("span", { class: "corner__under", "aria-hidden": "true" }),
    el(
      "span",
      { class: "corner__flap", "aria-hidden": "true" },
      el(
        "span",
        { class: "corner__face corner__face--back" },
        el("span", { class: "corner__glyph corner__glyph--menu" }, el("i"), el("i"), el("i"))
      ),
      el(
        "span",
        { class: "corner__face corner__face--front" },
        el("span", { class: "corner__glyph corner__glyph--close" })
      )
    )
  );
  toggle.classList.add("is-folded");
}

/** Sticky masthead strip for phones: wordmark on the left (clear of the
 *  toggle), current section on the right. */
function renderMobileTopbar(activePage) {
  let bar = document.querySelector(".mobile-topbar");
  if (!bar) {
    bar = el("div", { class: "mobile-topbar", "aria-hidden": "true" });
    document.body.appendChild(bar);
  }
  clear(bar);
  // Only a page that actually carries the strip reserves height for it —
  // a standalone page (404) must not gain a phantom gap.
  document.body.classList.add("has-topbar");

  const section = NAV_ITEMS.find((i) => i.id === activePage)?.label || "";
  bar.append(
    el("span", { class: "mobile-topbar__brand" }, "The SAC ", el("em", {}, "Chronicle")),
    el("span", { class: "mobile-topbar__section" }, section)
  );
  return bar;
}

/** One panel of the concertina: its face, its back, its shade, then the next panel. */
function foldPanel(index, content, nested = null) {
  return el(
    "div",
    { class: `fold__panel fold__panel--${index}` },
    el("div", { class: "fold__sheet" }, content),
    el("div", { class: "fold__back", "aria-hidden": "true" }),
    el("div", { class: "fold__shade", "aria-hidden": "true" }),
    nested
  );
}

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

  // Links, in two groups of three — one per panel, so the sheet unfolds in steps
  const links = NAV_ITEMS.map((item) => {
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
    return link;
  });
  const half = Math.ceil(links.length / 2);
  const groupA = el("div", { class: "sidebar__nav" }, ...links.slice(0, half));
  const groupB = el("div", { class: "sidebar__nav" }, ...links.slice(half));

  // Reader controls, reachable without hunting for the floating cog.
  // Mobile-only: on desktop the cog is never far from the pointer.
  const settingsBtn = el(
    "button",
    {
      class: "sidebar__action",
      type: "button",
      "data-open-settings": "",
      "aria-label": "Open reader settings",
    },
    el("span", { class: "sidebar__action-icon", "aria-hidden": "true" }, "⚙"),
    el("span", {}, "Reader settings")
  );
  // Get out of the way first — the settings sheet slides in from the same
  // side of the screen. settings.js picks the click up on the document.
  settingsBtn.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      document.getElementById("navbarCorner")?.click();
    }
  });

  // Search is on every screen size (unlike the settings button): on a phone it is the
  // quickest way to a club, and on desktop it advertises the "/" shortcut. The launcher
  // (search-launcher.js) picks the click up from the document via data-open-search.
  const searchBtn = el(
    "button",
    {
      class: "sidebar__action sidebar__action--search",
      type: "button",
      "data-open-search": "",
      "aria-keyshortcuts": "/ Control+K Meta+K",
    },
    el("span", { class: "sidebar__action-icon", "aria-hidden": "true" }, "⌕"),
    el("span", {}, "Search"),
    el("kbd", { class: "sidebar__kbd", "aria-hidden": "true" }, "/")
  );
  // same courtesy as the settings button: fold the sheet away before the palette opens
  searchBtn.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      document.getElementById("navbarCorner")?.click();
    }
  });

  const foot = el(
    "div",
    { class: "sidebar__foot" },
    searchBtn,
    settingsBtn,
    el("p", { class: "sidebar__foot-line" }, "Student Activity Council · Empowering Voices")
  );

  mount.append(
    el(
      "div",
      { class: "fold" },
      foldPanel(1, brand, foldPanel(2, groupA, foldPanel(3, groupB, foldPanel(4, foot))))
    )
  );

  const toggle = document.getElementById("navbarCorner");
  buildCorner(toggle);
  if (toggle) {
    toggle.setAttribute("aria-label", "Collapse navigation");
    toggle.setAttribute("title", "Collapse navigation");
  }

  renderMobileTopbar(activePage);

  // Scrim for mobile (added once)
  if (!document.querySelector(".sidebar-scrim")) {
    document.body.appendChild(el("div", { class: "sidebar-scrim", "aria-hidden": "true" }));
  }
}
