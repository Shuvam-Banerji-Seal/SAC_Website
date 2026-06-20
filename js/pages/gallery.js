/**
 * pages/gallery.js — photo gallery initialiser.
 *
 * Renders a masonry-ish grid of all image assets, grouped by club.
 * Each image is a clickable thumb that opens the underlying file in a
 * new tab (no lightbox dependency — pure HTML for the scaffold).
 */
import { $, el } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";

export async function initGallery() {
  const mount = $("#gallery-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    mount.replaceWith(
      el(
        "section",
        { class: "gallery", id: "gallery-grid" },
        el("h2", { class: "section-title" }, "Gallery"),
        ...clubs.map((c) => {
          const images = assets.filter(
            (a) => a.club === c.slug && a.file_type === "image" && !a.is_ob_portrait,
          );
          if (!images.length) return null;
          return el(
            "section",
            { class: "gallery__club" },
            el("h3", { class: "gallery__club-name" }, c.name),
            el(
              "ul",
              { class: "thumb-grid" },
              ...images.map((i) =>
                el(
                  "li",
                  { class: "thumb" },
                  el(
                    "a",
                    { href: i.public_url, target: "_blank", rel: "noopener" },
                    el("img", {
                      src: i.public_url,
                      alt: i.description,
                      loading: "lazy",
                      width: i.width || undefined,
                      height: i.height || undefined,
                    }),
                  ),
                  el("figcaption", { class: "thumb__cap" }, i.title || i.filename),
                ),
              ),
            ),
          );
        }),
      ),
    );
  } catch (err) {
    console.error("initGallery failed:", err);
  }
}
