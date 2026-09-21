/**
 * pages/gallery.js — newspaper-themed photo album.
 *
 * Renders a masonry-ish grid of all image assets, grouped by club.
 * Each image opens in the viewer lightbox with old album framing.
 * Includes club filter tabs for quick navigation.
 */
import { $, el, showError, assetUrl } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";
import { initImageReveal, eagerFirst } from "../utils/reveal.js";
import { initLazyVideos, videoPlayerAttrs } from "../utils/media.js";
import { showGridSkeleton, clearSkeleton } from "../utils/skeleton.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";

function renderMediaCard(asset, index) {
  const title = captionFor(asset);
  const source = el("source", {
    src: assetUrl(asset.public_url),
    type: asset.mime_type || undefined,
  });
  const media =
    asset.file_type === "audio"
      ? el("audio", { controls: true, preload: "none", "data-preload-lazy": "" }, source)
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
  showGridSkeleton(mount, 12);
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
            ...images.map((i, index) => {
              const thumbCaption = captionFor(i);
              return el(
                "li",
                {
                  class: "thumb thumb--reveal",
                  "data-gallery-search": [thumbCaption, i.title, i.filename, c.name]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase(),
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
                      "data-title": thumbCaption,
                      "data-desc": i.description && !i.is_extracted_from_doc ? i.description : "",
                      "data-context": c.name,
                      title: i.title || i.filename,
                    },
                    el("img", {
                      src: assetUrl(gridSrc(i)),
                      alt: altTextFor(i, "Gallery image"),
                      loading: "lazy",
                      decoding: "async",
                      width: i.width || undefined,
                      height: i.height || undefined,
                      style:
                        i.width && i.height ? `aspect-ratio: ${i.width} / ${i.height}` : undefined,
                    })
                  ),
                  el("figcaption", { class: "thumb__cap" }, thumbCaption)
                )
              );
            })
          )
        );
      })
      .filter(Boolean);

    clearSkeleton(mount);
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

    // ── Toolbar: search, live count, and club filter tabs ───────────
    const filterWrap = $("#gallery-filter-wrap");
    const searchInput = $("#gallery-search");
    const countLine = $("#gallery-count");
    const gridMount = document.getElementById("gallery-grid");
    const totalPhotos = clubSections.reduce(
      (n, section) => n + section.querySelectorAll(".thumb").length,
      0
    );
    const fmt = (n) => n.toLocaleString("en-IN");
    let activeClub = "all";

    const updateCount = (visiblePhotos) => {
      if (!countLine) return;
      const q = searchInput?.value.trim();
      if (!q && activeClub === "all") {
        countLine.textContent = `${fmt(totalPhotos)} photographs · ${clubSections.length} clubs · tap a plate to view it full-screen`;
      } else {
        countLine.textContent = `${fmt(visiblePhotos)} of ${fmt(totalPhotos)} photographs match`;
      }
    };

    const applyFilters = () => {
      const q = (searchInput?.value || "").toLowerCase().trim();
      let visiblePhotos = 0;
      clubSections.forEach((section) => {
        const inClub = activeClub === "all" || section.dataset.galleryClub === activeClub;
        const clubName = (
          section.querySelector(".gallery__club-name")?.textContent || ""
        ).toLowerCase();
        let sectionVisible = 0;
        section.querySelectorAll(".thumb").forEach((thumb) => {
          const match =
            inClub && (!q || `${thumb.dataset.gallerySearch || ""} ${clubName}`.includes(q));
          thumb.classList.toggle("is-hidden", !match);
          if (match) sectionVisible++;
        });
        section.style.display = sectionVisible ? "" : "none";
        visiblePhotos += sectionVisible;
      });
      updateCount(visiblePhotos);

      const noResults = $(".gallery-no-results");
      const isFiltered = Boolean(q) || activeClub !== "all";
      if (!isFiltered || visiblePhotos > 0) noResults?.remove();
      else if (!noResults) {
        gridMount?.appendChild(
          el(
            "p",
            { class: "gallery-no-results muted", role: "status" },
            "No photographs match that search."
          )
        );
      }
    };

    if (filterWrap && clubSections.length) {
      const tabs = [
        el(
          "button",
          {
            class: "gallery-filter-tab is-selected",
            "data-filter": "all",
            type: "button",
            "aria-pressed": "true",
          },
          `All · ${totalPhotos}`
        ),
        ...clubSections.map((section) => {
          const name = section.querySelector(".gallery__club-name")?.textContent || "";
          const count = section.querySelectorAll(".thumb").length;
          return el(
            "button",
            {
              class: "gallery-filter-tab",
              "data-filter": section.dataset.galleryClub,
              type: "button",
              "aria-pressed": "false",
            },
            `${name} · ${count}`
          );
        }),
      ];
      filterWrap.appendChild(el("div", { class: "gallery-filter-bar" }, ...tabs));

      // Deep link from elsewhere on the site: #club-<slug> opens one club.
      const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (hash.startsWith("club-")) {
        const slug = hash.slice(5);
        const target = tabs.find((t) => t.dataset.filter === slug);
        target?.click();
      }

      filterWrap.addEventListener("click", (e) => {
        const tab = e.target.closest(".gallery-filter-tab");
        if (!tab) return;
        activeClub = tab.dataset.filter;
        filterWrap.querySelectorAll(".gallery-filter-tab").forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-selected", on);
          t.setAttribute("aria-pressed", on ? "true" : "false");
        });
        if (searchInput) searchInput.value = "";
        applyFilters();
      });
    }

    searchInput?.addEventListener("input", applyFilters);
    updateCount(totalPhotos);

    // ── Layout: Pinned (tilted cards) vs Sheet (dense contact sheet) ──
    // Persisted per reader — someone cataloguing wants the wall of paper,
    // someone hunting one photo wants 150px tiles and no captions.
    const VIEW_KEY = "sac-gallery-view";
    const viewWrap = $("#gallery-view");
    const viewButtons = viewWrap ? Array.from(viewWrap.querySelectorAll("[data-view]")) : [];
    const applyView = (view) => {
      const next = view === "sheet" ? "sheet" : "pinned";
      document.documentElement.dataset.galleryView = next;
      viewButtons.forEach((button) => {
        const on = button.dataset.view === next;
        button.classList.toggle("is-selected", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      try {
        localStorage.setItem(VIEW_KEY, next);
      } catch {
        /* storage can be blocked */
      }
    };
    let savedView = "pinned";
    try {
      savedView = localStorage.getItem(VIEW_KEY) || "pinned";
    } catch {
      /* storage can be blocked */
    }
    applyView(savedView);
    viewWrap?.addEventListener("click", (e) => {
      const button = e.target.closest("[data-view]");
      if (button) applyView(button.dataset.view);
    });

    // ── Surprise me: open a random photo from the current filter ─────
    // With 1,000+ plates, browsing by search is efficient but joyless; this
    // is the "flip to any page" button. It respects the active club filter
    // and search so it never opens something the reader filtered away.
    $("#gallery-surprise")?.addEventListener("click", () => {
      const visible = Array.from(
        document.querySelectorAll(".gallery__club .thumb:not(.is-hidden) a[data-viewer]")
      ).filter((a) => a.closest("section")?.style.display !== "none");
      if (!visible.length) return;
      visible[Math.floor(Math.random() * visible.length)].click();
    });

    // IntersectionObserver for section reveals + staggered image entrance.
    // Reduced-motion (prefers-reduced-motion or data-reduce-motion override)
    // is handled inside initImageReveal so we don't duplicate checks here.
    eagerFirst(document);
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
