/**
 * components/campus-board.js — "The Campus Board".
 *
 * A notice-board / travel-map wall on the front page: the best Campus_Places
 * photographs pinned up as postcards with wax-seal pins and determined tilts,
 * over a CSS kraft-board backdrop with a paper map legend. Every card opens
 * the shared viewer; thumbnails serve the grid (gridSrc) so the board costs
 * a few hundred KB, not megabytes.
 *
 * A shuffle control deals a fresh set of postcards: the day-of-month offset
 * guarantees a new wall each morning, and each press advances through the
 * pool deterministically — no Math.random, so the wall is reproducible.
 */
import { el, assetUrl } from "../utils/dom.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";

const BOARD_COUNT = 8;

/** Deterministic scatter: fixed per-index rotation/offsets, no Math.random
 *  (stable across reloads, no layout jank between visits). */
const TILTS = [-1.8, 1.4, -0.9, 2.1, -1.3, 0.8, -2.2, 1.7, -0.6, 1.1];

/** Landscape Campus_Places shots, in archive order. */
function boardPool(assets) {
  return assets.filter(
    (a) =>
      a.club === "Campus_Archive" &&
      a.category === "Campus_Places" &&
      a.file_type === "image" &&
      (Number(a.aspect_ratio) || 1) >= 1.25
  );
}

function isReducedMotion() {
  return (
    document.documentElement.getAttribute("data-reduce-motion") === "on" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** One pinned postcard. `seed` rotates the tilt so a reshuffle reads as a
 *  re-pin, not a re-print of the same wall. */
function boardCard(asset, index, seed) {
  const cap = captionFor(asset) || "Campus Places";
  return el(
    "li",
    {
      class: "board-card",
      style: `--tilt: ${TILTS[(index + seed * 3) % TILTS.length]}deg;`,
    },
    el(
      "a",
      {
        href: assetUrl(asset.public_url),
        "data-viewer": "campus-board",
        "data-title": cap,
        "data-context": "The Campus Board · " + (asset.category_label || "Campus Places"),
        title: cap,
        "aria-label": `View ${cap} full-screen`,
      },
      el("img", {
        src: assetUrl(gridSrc(asset)),
        alt: altTextFor(asset, "Campus photograph"),
        loading: index < 2 ? "eager" : "lazy",
        decoding: "async",
        width: asset.width || 1200,
        height: asset.height || 800,
      })
    ),
    el("span", { class: "board-card__pin", "aria-hidden": "true" }),
    el("span", { class: "board-card__cap" }, cap)
  );
}

export function initCampusBoard(assets) {
  const mount = document.getElementById("campus-board");
  if (!mount || mount.dataset.bound === "true") return;
  const pool = boardPool(assets);
  if (pool.length < 4) return;
  mount.dataset.bound = "true";

  // Day-of-month offset keeps the board fresh without randomness; the shuffle
  // counter advances it a full wall at a time.
  const day = new Date().getDate();
  let shuffle = 0;
  const grid = el("ul", { class: "board__grid" });

  const paint = () => {
    const offset = (day + shuffle * BOARD_COUNT) % pool.length;
    const ordered = [...pool.slice(offset), ...pool.slice(0, offset)];
    grid.replaceChildren(
      ...ordered.slice(0, BOARD_COUNT).map((asset, index) => boardCard(asset, index, shuffle))
    );
  };

  const shuffleBtn = el(
    "button",
    {
      class: "board__shuffle",
      type: "button",
      title: "Deal a new set of postcards",
    },
    "✦ Shuffle the board"
  );
  shuffleBtn.addEventListener("click", () => {
    shuffle += 1;
    if (isReducedMotion()) {
      paint();
      return;
    }
    // Dip the wall, deal the new set at the bottom of the fade.
    grid.classList.add("is-refreshing");
    window.setTimeout(() => {
      paint();
      grid.classList.remove("is-refreshing");
    }, 170);
  });

  paint();

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
      grid,
      el(
        "div",
        { class: "board__actions" },
        shuffleBtn,
        el(
          "a",
          { class: "board__more", href: "pages/campus-life.html#cat-Campus_Places" },
          "See all Campus Places on the archive wall →"
        )
      )
    )
  );
}
