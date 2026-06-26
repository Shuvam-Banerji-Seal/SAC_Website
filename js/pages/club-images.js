/**
 * js/pages/club-images.js — simplified image renderer for individual club pages.
 *
 * On pages with body[data-club-slug], loads the JSONL and renders
 * image grids into placeholder divs. Each placeholder has:
 *   data-club-images="<slug>"
 *   data-role="<role>" (optional: ob_portrait, event, iicm, equipment, portfolio, etc.)
 *   data-title="<section-title>" (optional: displayed above the grid)
 */
import { el } from "../utils/dom.js";
import { loadAssetsMap, getClubEntries } from "../data.js";

export async function initClubImages() {
  const slug = document.body.dataset.clubSlug;
  if (!slug) return;

  try {
    const assets = await loadAssetsMap();
    const entries = getClubEntries(assets, slug);
    const placeholders = document.querySelectorAll("[data-club-images]");

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
        ph.style.display = "none";
        return;
      }

      // Section header
      if (title) {
        ph.parentElement?.insertBefore(
          el("h2", { class: "club-detail__section-title" }, title),
          ph
        );
      }

      // Build the image grid
      const grid = el("ul", { class: "thumb-grid pinned-thumbs" });
      filtered.forEach((asset) => {
        const group = `club-${slug}`;
        const li = el(
          "li",
          {
            class: "thumb",
            style: "--pin-rotate: " + ((Math.random() - 0.5) * 3).toFixed(1) + "deg",
          },
          el(
            "a",
            {
              href: asset.public_url,
              "data-viewer": group,
              title: asset.title || asset.filename || "",
            },
            el("img", {
              src: asset.public_url,
              alt: asset.description || asset.filename || "",
              loading: "lazy",
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

      ph.appendChild(grid);
    });
  } catch (err) {
    console.error("[club-images] Failed to load images:", err);
  }

  // Setup IntersectionObserver for section reveals
  setupSectionReveal();
}

function setupSectionReveal() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    // Immediately reveal all sections for reduced motion
    document.querySelectorAll(".reveal-section").forEach((s) => s.classList.add("is-revealed"));
    return;
  }
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal-section").forEach((s) => s.classList.add("is-revealed"));
    return;
  }
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
