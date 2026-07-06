/**
 * js/pages/club-images.js — simplified image renderer for individual club pages.
 *
 * On pages with body[data-club-slug], loads the JSONL and renders
 * image grids into placeholder divs. Each placeholder has:
 *   data-club-images="<slug>"
 *   data-role="<role>" (optional: ob_portrait, event, iicm, equipment, portfolio, etc.)
 *   data-title="<section-title>" (optional: displayed above the grid)
 */
import { el, assetUrl } from "../utils/dom.js";
import { loadAssetsMap, getClubEntries } from "../data.js";
import { revealText, initScrollSounds } from "../utils/calligraphy.js";
import { initImageReveal } from "../utils/reveal.js";

export async function initClubImages() {
  const slug = document.body.dataset.clubSlug;
  if (!slug) return;

  try {
    const assets = await loadAssetsMap();
    const entries = getClubEntries(assets, slug);
    const placeholders = document.querySelectorAll("[data-club-images]");
    let anyPlaceholderHadContent = false;

    placeholders.forEach((ph) => {
      const role = ph.dataset.role; // filter by role, or null for all images
      const title = ph.dataset.title;

      let filtered = entries.filter((e) => e.file_type === "image");
      if (role === "ob_portrait") filtered = entries.filter((e) => e.is_ob_portrait);
      else if (role === "logo") filtered = entries.filter((e) => e.is_logo);
      else if (role === "event") filtered = entries.filter((e) => e.is_event);
      else if (role === "iicm") filtered = entries.filter((e) => e.is_iicm);
      else if (role === "equipment") filtered = entries.filter((e) => e.role === "equipment");
      else if (role === "portfolio") filtered = entries.filter((e) => e.role === "portfolio");
      else if (role === "outer-fest") filtered = entries.filter((e) => e.role === "outer-fest");
      else if (role === "other")
        filtered = entries.filter(
          (e) =>
            e.file_type === "image" &&
            !e.is_ob_portrait &&
            !e.is_logo &&
            !e.is_iicm &&
            e.role !== "equipment" &&
            e.role !== "portfolio" &&
            e.role !== "outer-fest"
        );
      else if (role === "all-non-ob")
        filtered = entries.filter((e) => e.file_type === "image" && !e.is_ob_portrait);

      if (!filtered.length) {
        // Hide the placeholder AND its parent <section> so we don't leave
        // a 4rem empty gap from the section's margin-bottom.
        ph.style.display = "none";
        const section = ph.closest(".reveal-section") || ph.closest("section");
        if (section && !section.querySelector("[data-club-images]:not([style*='display: none'])")) {
          // Only collapse the section if no sibling image blocks remain.
          let anyOtherVisible = false;
          section.querySelectorAll("[data-club-images]").forEach((sib) => {
            if (sib !== ph && sib.style.display !== "none") anyOtherVisible = true;
          });
          if (!anyOtherVisible) section.style.display = "none";
        }
        return;
      }
      anyPlaceholderHadContent = true;

      // Wrap the section title + grid in a single <div> so the title stays
      // attached to its grid (the old code inserted the <h2> as a sibling
      // of the placeholder, which mis-positioned it relative to the grid).
      const wrap = el("div", { class: "club-detail__image-block" });
      if (title) {
        wrap.appendChild(
          el("h2", { class: "club-detail__section-title" }, title)
        );
      }

      // Build the image grid
      const grid = el("ul", { class: "thumb-grid pinned-thumbs" });
      filtered.forEach((asset) => {
        const group = `club-${slug}`;
        const li = el(
          "li",
          {
            class: "thumb thumb--reveal",
            style: "--pin-rotate: " + ((Math.random() - 0.5) * 3).toFixed(1) + "deg",
          },
          el(
            "a",
            {
              href: assetUrl(asset.public_url),
              "data-viewer": group,
              "data-title": asset.title || asset.filename || "",
              "data-desc":
                asset.description || asset.person || asset.filename || "",
              "data-credit": asset.credit || "",
              "data-context": title || "",
              title: asset.title || asset.filename || "",
            },
            el("img", {
              src: assetUrl(asset.public_url),
              alt: asset.description || asset.filename || "",
              loading: "lazy",
              decoding: "async",
              width: asset.width || undefined,
              height: asset.height || undefined,
            })
          ),
          el(
            "figcaption",
            { class: "thumb__cap" },
            asset.person || asset.title || asset.filename || ""
          )
        );
        grid.appendChild(li);
      });

      wrap.appendChild(grid);
      ph.appendChild(wrap);
    });

    // If none of the role-specific placeholders matched any entries, create a
    // fallback "Club Photos" section that shows ALL images for this club.
    // The placeholders are siblings of .club-detail__body, not children.
    if (!anyPlaceholderHadContent) {
      const allImages = entries.filter((e) => e.file_type === "image");
      if (allImages.length) {
        const lastPlaceholder = placeholders[placeholders.length - 1];
        if (lastPlaceholder) {
          const parentSection = lastPlaceholder.closest(".reveal-section") || lastPlaceholder.closest("section");
          const group = `club-${slug}`;
          const wrap = el("div", { class: "club-detail__image-block" });
          wrap.appendChild(el("h2", { class: "club-detail__section-title" }, "Club Photos"));
          const grid = el("ul", { class: "thumb-grid pinned-thumbs" });
          allImages.forEach((asset) => {
            grid.appendChild(el("li", { class: "thumb thumb--reveal", style: "--pin-rotate: " + ((Math.random() - 0.5) * 3).toFixed(1) + "deg" },
              el("a", { href: assetUrl(asset.public_url), "data-viewer": group, "data-title": asset.title || asset.filename || "", "data-desc": asset.description || asset.person || asset.filename || "", "data-context": "Club Photos", title: asset.title || asset.filename || "" },
                el("img", { src: assetUrl(asset.public_url), alt: asset.description || asset.filename || "", loading: "lazy", decoding: "async", width: asset.width || undefined, height: asset.height || undefined })
              ),
              el("figcaption", { class: "thumb__cap" }, asset.person || asset.title || asset.filename || "")
            ));
          });
          wrap.appendChild(grid);
          parentSection.after(wrap);
          // Immediately reveal all fallback images — they bypass the
          // IntersectionObserver because they're not inside .reveal-section
          grid.querySelectorAll(".thumb--reveal").forEach((thumb) => {
            thumb.classList.add("is-revealed");
          });
        }
      }
    }
  } catch (err) {
    console.error("[club-images] Failed to load images:", err);
  }

  // Setup IntersectionObserver for section reveals
  setupSectionReveal();

  // Add data-label attributes to OB table cells for responsive card layout
  addTableDataLabels();

  // Calligraphy text reveal for the club title
  const title = document.getElementById("clubTitle");
  if (title && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    document.fonts?.ready?.then(() => {
      if (title.offsetParent !== null)
        revealText(title, 1800, undefined, { sound: true, trail: true });
    });
  }

  // Initialize scroll-based paper scratch sounds
  initScrollSounds();
}

function setupSectionReveal() {
  initImageReveal(document);
}

/**
 * Add data-label attributes to OB table cells for responsive card layout.
 * On screens < 480px, the CSS converts the table to a stacked card layout
 * and uses data-label to show the column header above each cell value.
 */
function addTableDataLabels() {
  document.querySelectorAll(".ob-table").forEach((table) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );
    table.querySelectorAll("tbody tr").forEach((row) => {
      row.querySelectorAll("td").forEach((td, i) => {
        if (headers[i]) td.setAttribute("data-label", headers[i]);
      });
    });
  });
}
