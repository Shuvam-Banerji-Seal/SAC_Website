/**
 * components/navbar.js — renders the top navigation bar.
 *
 * Replaces the placeholder <header><nav id="navbar"></nav></header>
 * with a real nav. Active link is inferred from body[data-page].
 * Paths are computed via pageUrl() so they resolve correctly from
 * any page depth.
 */
import { $, el } from "../utils/dom.js";
import { NAV_ITEMS, SITE_TITLE } from "../config.js";
import { pageUrl } from "../utils/dom.js";

export function renderNavbar(activePage) {
  const mount = $("#navbar");
  if (!mount) return;

  const links = NAV_ITEMS.map((item) => {
    const isActive = item.id === activePage;
    return el(
      "a",
      {
        href: pageUrl(item.href),
        class: isActive ? "nav-link nav-link--active" : "nav-link",
        "aria-current": isActive ? "page" : null,
      },
      item.label,
    );
  });

  mount.replaceWith(
    el(
      "nav",
      { class: "navbar", "aria-label": "Primary" },
      el(
        "div",
        { class: "navbar__inner" },
        el("a", { href: pageUrl("index.html"), class: "navbar__brand" }, SITE_TITLE),
        el(
          "ul",
          { class: "navbar__list" },
          ...links.map((a) => el("li", { class: "navbar__item" }, a)),
        ),
      ),
    ),
  );
}
