/**
 * components/navbar.js — renders the top navigation bar.
 *
 * Replaces the placeholder <header><nav id="navbar"></nav></header>
 * with a real nav. Active link is inferred from body[data-page].
 * Paths are computed via pageUrl() so they resolve correctly from
 * any page depth.
 */
import { $, el, pageUrl, pageLink } from "../utils/dom.js";
import { NAV_ITEMS, SITE_TITLE } from "../config.js";

export function renderNavbar(activePage) {
  const mount = $("#navbar");
  if (!mount) return;

  const links = NAV_ITEMS.map((item) => {
    const isActive = item.id === activePage;
    // Items already prefixed with pages/ use pageLink; root items use pageUrl
    const href = item.href.startsWith("pages/") ? pageLink(item.href) : pageUrl(item.href);
    return el(
      "a",
      { href, class: isActive ? "nav-link nav-link--active" : "nav-link", "aria-current": isActive ? "page" : null },
      item.label
    );
  });

  mount.replaceWith(
    el(
      "nav",
      { class: "navbar", "aria-label": "Primary" },
      el(
        "div",
        { class: "navbar__inner" },
        el(
          "a",
          { href: pageUrl("index.html"), class: "navbar__brand" },
          el("span", { class: "navbar__brand-full" }, SITE_TITLE),
          el("span", { class: "navbar__brand-short" }, "SAC")
        ),
        el(
          "ul",
          { class: "navbar__list" },
          ...links.map((a) => el("li", { class: "navbar__item" }, a))
        )
      )
    )
  );
}
