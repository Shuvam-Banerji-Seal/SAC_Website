/**
 * pages/gallery.js — newspaper-themed photo album.
 *
 * Renders a masonry-ish grid of all image assets, grouped by club.
 * Each image opens in the viewer lightbox with old album framing.
 * Includes club filter tabs for quick navigation.
 */
import { $, el, showError } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";
import { revealText } from "../utils/calligraphy.js";

export async function initGallery() {
  const mount = $("#gallery-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);

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
            ...images.map((i) =>
              el(
                "li",
                {
                  class: "thumb",
                  style: "--pin-rotate: " + ((Math.random() - 0.5) * 4).toFixed(1),
                },
                el(
                  "a",
                  { href: i.public_url, "data-viewer": groupName, title: i.title || i.filename },
                  el("img", {
                    src: i.public_url,
                    alt: i.description,
                    loading: "lazy",
                    decoding: "async",
                    width: i.width || undefined,
                    height: i.height || undefined,
                  })
                ),
                el("figcaption", { class: "thumb__cap" }, i.title || i.filename)
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
        ...clubSections
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

    // IntersectionObserver for section reveals
    if (
      !(
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ||
        document.documentElement.getAttribute("data-reduce-motion") === "on"
      ) &&
      "IntersectionObserver" in window
    ) {
      const sections = document.querySelectorAll(".reveal-section");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      sections.forEach((s) => observer.observe(s));
    }
  } catch {
    showError(
      mount,
      "Could not load gallery",
      "The photo gallery failed to load. Check your connection and try again."
    );
  }
}
