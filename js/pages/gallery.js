/**
 * pages/gallery.js — newspaper-themed photo album.
 *
 * Renders a masonry-ish grid of all image assets, grouped by club.
 * Each image opens in the viewer lightbox with old album framing.
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
        ...clubs.map((c) => {
          const images = assets.filter(
            (a) => a.club === c.slug && a.file_type === "image" && !a.is_ob_portrait,
          );
          if (!images.length) return null;
          const groupName = `gallery-${c.slug}`;
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
                    { href: i.public_url, "data-viewer": groupName, title: i.title || i.filename },
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
