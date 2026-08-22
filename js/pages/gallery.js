/**
 * pages/gallery.js — newspaper-themed photo album.
 *
 * Renders a masonry-ish grid of all image assets, grouped by club.
 * Each image opens in the viewer lightbox with old album framing.
 * Includes club filter tabs for quick navigation.
 */
import { $, el, showError, assetUrl } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";
import { initImageReveal } from "../utils/reveal.js";
import { initLazyVideos, videoPlayerAttrs } from "../utils/media.js";

function renderMediaCard(asset, index) {
  const title = asset.title || asset.filename || "SAC media";
  const source = el("source", {
    src: assetUrl(asset.public_url),
    type: asset.mime_type || undefined,
  });
  const media =
    asset.file_type === "audio"
      ? el("audio", { controls: true, preload: "metadata" }, source)
      : el("video", videoPlayerAttrs(asset, title), source);
  return el(
    "li",
    { class: "media-card", style: `--pin-rotate: ${((index % 5) - 2) * 0.45}deg` },
    el("div", { class: "media-card__player" }, media),
    el("p", { class: "media-card__title" }, title),
    el("p", { class: "media-card__meta" }, asset.club_name || "SAC archive")
  );
}

export async function initGallery() {
  const mount = $("#gallery-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    const media = assets.filter((a) => a.file_type === "video" || a.file_type === "audio");

    // Build club sections with data attributes for filtering
    const clubSections = clubs
      .map((c) => {
        const images = assets.filter(
          (a) => a.club === c.slug && a.file_type === "image" && !a.is_ob_portrait
        );
        if (!images.length) return null;
        const groupName = `gallery-${c.slug}`;
        return el(
          "section",
          { class: "gallery__club reveal-section", "data-gallery-club": c.slug },
          el("h3", { class: "gallery__club-name" }, c.name),
          el(
            "ul",
            { class: "thumb-grid pinned-thumbs" },
            ...images.map((i, index) =>
              el(
                "li",
                {
                  class: "thumb thumb--reveal",
                  style:
                    `--pin-rotate: ${(((index % 7) - 3) * 0.6).toFixed(2)};` +
                    (i.width && i.height
                      ? ` --thumb-aspect: ${(i.width / i.height).toFixed(3)};`
                      : ""),
                },
                el(
                  "figure",
                  { class: "thumb__figure" },
                  el(
                    "a",
                    {
                      href: assetUrl(i.public_url),
                      "data-viewer": groupName,
                      "data-title": String(i.title || i.filename || "SAC image").replace(
                        /\.[a-z0-9]+$/i,
                        ""
                      ),
                      "data-desc": i.description && !i.is_extracted_from_doc ? i.description : "",
                      "data-context": c.name,
                      title: i.title || i.filename,
                    },
                    el("img", {
                      src: assetUrl(i.public_url),
                      alt: i.description || i.title || i.filename || "Gallery image",
                      loading: "lazy",
                      decoding: "async",
                      width: i.width || undefined,
                      height: i.height || undefined,
                      style:
                        i.width && i.height ? `aspect-ratio: ${i.width} / ${i.height}` : undefined,
                    })
                  ),
                  el(
                    "figcaption",
                    { class: "thumb__cap" },
                    String(i.title || i.filename || "SAC image").replace(/\.[a-z0-9]+$/i, "")
                  )
                )
              )
            )
          )
        );
      })
      .filter(Boolean);

    mount.replaceWith(
      el(
        "section",
        { class: "gallery", id: "gallery-grid" },
        el("h3", { class: "gallery__section-title reveal-section" }, "Photo Album"),
        ...clubSections,
        media.length
          ? el(
              "section",
              { class: "gallery__media reveal-section" },
              el("h3", { class: "gallery__section-title" }, "Audio & video archive"),
              el("ul", { class: "media-grid" }, ...media.map(renderMediaCard))
            )
          : null
      )
    );

    // Build filter tabs
    const filterWrap = $("#gallery-filter-wrap");
    if (filterWrap && clubs.length > 0) {
      const tabs = [
        el(
          "button",
          { class: "gallery-filter-tab is-selected", "data-filter": "all", type: "button" },
          "All"
        ),
        ...clubSections.map((section) =>
          el(
            "button",
            {
              class: "gallery-filter-tab",
              "data-filter": section.dataset.galleryClub,
              type: "button",
            },
            section.querySelector(".gallery__club-name")?.textContent || ""
          )
        ),
      ];
      filterWrap.appendChild(el("div", { class: "gallery-filter-bar" }, ...tabs));

      // Wire filter logic
      filterWrap.addEventListener("click", (e) => {
        const tab = e.target.closest(".gallery-filter-tab");
        if (!tab) return;
        const filter = tab.dataset.filter;
        filterWrap
          .querySelectorAll(".gallery-filter-tab")
          .forEach((t) => t.classList.remove("is-selected"));
        tab.classList.add("is-selected");
        document.querySelectorAll(".gallery__club").forEach((section) => {
          section.style.display =
            filter === "all" || section.dataset.galleryClub === filter ? "" : "none";
        });
      });
    }

    // IntersectionObserver for section reveals + staggered image entrance.
    // Reduced-motion (prefers-reduced-motion or data-reduce-motion override)
    // is handled inside initImageReveal so we don't duplicate checks here.
    initImageReveal(document);
    initLazyVideos(document);
  } catch {
    showError(
      mount,
      "Could not load gallery",
      "The photo gallery failed to load. Check your connection and try again."
    );
  }
}
