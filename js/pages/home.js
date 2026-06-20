/**
 * pages/home.js — landing-page initialiser.
 *
 * Pulls the canonical assets map and renders a brief club teaser grid
 * (logos + names) into the home page's <section id="home-clubs">.
 */
import { $, el, pageUrl } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";

export async function initHome() {
  const mount = $("#home-clubs");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    mount.replaceWith(
      el(
        "section",
        { class: "home-clubs", id: "home-clubs" },
        el("h2", { class: "section-title" }, "Our clubs"),
        el("p", { class: "section-sub" }, "Ten cultural clubs under the SAC umbrella."),
        el(
          "ul",
          { class: "club-grid" },
          ...clubs.map((c) =>
            el(
              "li",
              { class: "club-card" },
              el(
                "a",
                { href: pageUrl(`pages/club.html?id=${encodeURIComponent(c.slug)}`) },
                el(
                  "div",
                  { class: "club-card__logo" },
                  c.logo
                    ? el("img", {
                        src: c.logo.public_url,
                        alt: `${c.name} logo`,
                        loading: "lazy",
                        width: c.logo.width || 96,
                        height: c.logo.height || 96,
                      })
                    : el("div", { class: "club-card__logo-fallback" }, c.name.charAt(0)),
                ),
                el("h3", { class: "club-card__name" }, c.name),
                el(
                  "p",
                  { class: "club-card__count" },
                  `${c.counts.images} images · ${c.counts.markdowns} doc${c.counts.markdowns === 1 ? "" : "s"}`,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  } catch (err) {
    console.error("initHome failed:", err);
  }
}
