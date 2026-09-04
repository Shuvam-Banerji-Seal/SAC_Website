/**
 * components/campus-board.js — "The Campus Board".
 *
 * A notice-board / travel-map wall on the front page: the best Campus_Places
 * photographs pinned up as postcards with wax-seal pins and determined tilts,
 * over a CSS kraft-board backdrop with a paper map legend. Every card opens
 * the shared viewer; thumbnails serve the grid (gridSrc) so the board costs
 * a few hundred KB, not megabytes.
 */
import { el, assetUrl } from "../utils/dom.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";

const BOARD_COUNT = 8;

/** Deterministic scatter: fixed per-index rotation/offsets, no Math.random
 *  (stable across reloads, no layout jank between visits). */
const TILTS = [-1.8, 1.4, -0.9, 2.1, -1.3, 0.8, -2.2, 1.7, -0.6, 1.1];

/** Landscape Campus_Places shots, best-res first, rotated by day for life. */
function pickBoardShots(assets) {
  const places = assets.filter(
    (a) =>
      a.club === "Campus_Archive" &&
      a.category === "Campus_Places" &&
      a.file_type === "image" &&
      (Number(a.aspect_ratio) || 1) >= 1.25
  );
  // Day-of-month offset keeps the board fresh without randomness.
  const day = new Date().getDate();
  const start = places.length ? day % places.length : 0;
  const ordered = [...places.slice(start), ...places.slice(0, start)];
  return ordered.slice(0, BOARD_COUNT);
}

export function initCampusBoard(assets) {
  const mount = document.getElementById("campus-board");
  if (!mount || mount.dataset.bound === "true") return;
  const shots = pickBoardShots(assets);
  if (shots.length < 4) return;
  mount.dataset.bound = "true";

  const cards = shots.map((a, i) => {
    const cap = captionFor(a) || "Campus Places";
    return el(
      "li",
      {
        class: "board-card",
        style: `--tilt: ${TILTS[i % TILTS.length]}deg;`,
      },
      el(
        "a",
        {
          href: assetUrl(a.public_url),
          "data-viewer": "campus-board",
          "data-title": cap,
          "data-context": "The Campus Board · " + (a.category_label || "Campus Places"),
          title: cap,
          "aria-label": `View ${cap} full-screen`,
        },
        el("img", {
          src: assetUrl(gridSrc(a)),
          alt: altTextFor(a, "Campus photograph"),
          loading: i < 2 ? "eager" : "lazy",
          decoding: "async",
          width: a.width || 1200,
          height: a.height || 800,
        })
      ),
      el("span", { class: "board-card__pin", "aria-hidden": "true" }),
      el("span", { class: "board-card__cap" }, cap)
    );
  });

  mount.replaceChildren(
    el(
      "div",
      {
        class: "board",
        role: "region",
        "aria-label": "The Campus Board — pinned photographs of IISER Kolkata",
      },
      el(
        "div",
        { class: "board__legend", "aria-hidden": "true" },
        "✦ Pinned at the Chronicle map desk · Mohanpur, WB · 22.96°N 88.51°E ✦"
      ),
      el("ul", { class: "board__grid" }, ...cards),
      el(
        "a",
        { class: "board__more", href: "pages/campus-life.html#cat-Campus_Places" },
        "See all Campus Places on the archive wall →"
      )
    )
  );
}
