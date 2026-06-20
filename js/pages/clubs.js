/**
 * pages/clubs.js — all-clubs overview page.
 *
 * Renders a full grid of all 10 clubs with logos, names, and quick stats.
 * Each card links to the single template at club.html?id=<slug>.
 */
import { $, el, pageUrl } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";

export async function initClubs() {
  const mount = $("#clubs-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    mount.replaceWith(
      el(
        "section",
        { class: "clubs-grid-wrap", id: "clubs-grid" },
        el(
          "ul",
          { class: "club-grid club-grid--full" },
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
    console.error("initClubs failed:", err);
  }
}
