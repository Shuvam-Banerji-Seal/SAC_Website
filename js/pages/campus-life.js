/**
 * pages/campus-life.js — the Campus in Print archive page.
 *
 * All 269 Campus_Archive photographs, grouped by their source category
 * (Administrative Building, Central Library, Hostels, …) as paper sections
 * with pinned thumbs, client-side search across labels, and shared-viewer
 * lightbox integration. Structure mirrors the clubs directory.
 */
import { $, el, showError, assetUrl } from "../utils/dom.js";
import { loadAssetsMap } from "../data.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { showGridSkeleton, clearSkeleton } from "../utils/skeleton.js";
import { initImageReveal } from "../utils/reveal.js";
import { initLazyVideos } from "../utils/media.js";

const CATEGORY_BLURBS = {
  Administrative_Building: "The institute's front offices and administration block.",
  Administrative_Staffs_Doaa: "The people who keep the campus running — administrative staff.",
  AJC_Bose: "The AJC Bose academic complex.",
  Basement_Shop: "The campus basement shop — late-night essentials.",
  Central_Library: "The central library — the quiet heart of campus.",
  Computer_Center: "The computer center and computational labs.",
  Food_Court_Canteen: "The food court and canteen — every campus's true parliament.",
  Hostels: "The student hostels, block by block.",
  IICM_Photos_Group: "Inter-IISER Cultural Meet group frames.",
  Campus_Places: "Places and corners of IISER Kolkata.",
  LHC: "The Lecture Hall Complex.",
  Medical_Unit: "The campus medical unit.",
  Open_Gymnasium: "The open gymnasium and courts.",
  RNT: "The RNT building.",
  SAC_Building: "The SAC building — where this council keeps office.",
  Swimming_Pool: "The swimming pool.",
  Visitors_Hostel: "The visitors' hostel.",
  Whole_Campus: "The campus at large — aerials and wide frames.",
};

function pinTilt(index) {
  return (((index % 7) - 3) * 0.6).toFixed(2);
}

function renderThumb(asset, group, index) {
  const caption = captionFor(asset);
  return el(
    "li",
    {
      class: "thumb thumb--reveal",
      "data-campus-search": (
        caption +
        " " +
        (asset.category_label || "") +
        " " +
        (asset.club_name || "")
      ).toLowerCase(),
      style: `--pin-rotate: ${pinTilt(index)}deg; --thumb-aspect: ${
        Number(asset.aspect_ratio) || 1.25
      };`,
    },
    el(
      "figure",
      { class: "thumb__figure" },
      el(
        "a",
        {
          href: assetUrl(asset.public_url),
          "data-viewer": group,
          "data-title": caption,
          "data-context": "Campus Life · " + (asset.category_label || "Campus"),
          title: caption,
        },
        el("img", {
          src: assetUrl(asset.public_url),
          alt: altTextFor(asset, "Campus photograph"),
          loading: index < 3 ? "eager" : "lazy",
          fetchpriority: index < 3 ? "high" : undefined,
          decoding: "async",
          width: asset.width || 1200,
          height: asset.height || 900,
        })
      ),
      el("figcaption", { class: "thumb__cap" }, caption)
    )
  );
}

export async function initCampusLife() {
  const mount = $("#campus-grid");
  if (!mount) return;
  showGridSkeleton(mount, 12);
  try {
    const assets = await loadAssetsMap();
    const campus = assets.filter((a) => a.club === "Campus_Archive");
    if (!campus.length) {
      clearSkeleton(mount);
      mount.replaceChildren(el("p", { class: "muted" }, "No campus photographs indexed yet."));
      return;
    }

    // Group by category
    const byCat = new Map();
    for (const a of campus) {
      const c = a.category || "Campus";
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c).push(a);
    }
    const cats = Array.from(byCat.entries()).sort((a, b) => b[1].length - a[1].length);

    // Header chip with live count
    const pageTitle = document.querySelector("h1.page-title");
    if (pageTitle && !pageTitle.querySelector(".count-chip")) {
      pageTitle.append(
        el(
          "span",
          { class: "count-chip", "aria-label": `${campus.length} campus photographs` },
          `${campus.length} photographs`
        )
      );
    }

    const sections = cats.map(([cat, entries]) =>
      el(
        "section",
        { class: "clubs-body campus-cat", id: "cat-" + cat, "data-campus-cat": cat },
        el(
          "h2",
          { class: "clubs-body__title" },
          cat.replace(/_/g, " "),
          el("span", { class: "clubs-body__count" }, String(entries.length))
        ),
        CATEGORY_BLURBS[cat]
          ? el("p", { class: "clubs-body__blurb muted" }, CATEGORY_BLURBS[cat])
          : null,
        el(
          "ul",
          { class: "thumb-grid pinned-thumbs" },
          ...entries.map((a, i) => renderThumb(a, "campus-life-" + cat, i))
        )
      )
    );

    clearSkeleton(mount);
    mount.replaceWith(
      el(
        "section",
        { class: "clubs-grid-wrap", id: "campus-grid", "aria-label": "Campus photograph archive" },
        ...sections
      )
    );

    // Search across labels + categories
    const searchInput = $("#campus-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        document.querySelectorAll(".campus-cat").forEach((section) => {
          const catLabel = (
            section.querySelector(".clubs-body__title")?.textContent || ""
          ).toLowerCase();
          let sectionVisible = 0;
          section.querySelectorAll(".thumb[data-campus-search]").forEach((item) => {
            const match =
              !q || (item.dataset.campusSearch || "").includes(q) || catLabel.includes(q);
            item.classList.toggle("is-hidden", !match);
            if (match) {
              sectionVisible++;
              visibleCount++;
            }
          });
          section.classList.toggle("is-hidden", sectionVisible === 0);
        });
        let counter = searchInput.parentElement.querySelector(".clubs-search-count");
        if (!counter) {
          counter = el("span", {
            class: "clubs-search-count",
            role: "status",
            "aria-live": "polite",
          });
          searchInput.parentElement.append(counter);
        }
        counter.textContent = q ? `${visibleCount} of ${campus.length} photographs` : "";
        const noResults = $(".campus-no-results");
        if (!q || visibleCount > 0) {
          noResults?.remove();
        } else if (!noResults) {
          document
            .getElementById("campus-grid")
            ?.appendChild(
              el(
                "p",
                { class: "clubs-no-results muted", role: "status" },
                "No campus places match that search."
              )
            );
        }
      });
    }

    initImageReveal(document);
    initLazyVideos(document);
  } catch {
    clearSkeleton(mount);
    showError(
      mount,
      "Could not load campus archive",
      "The campus photograph archive failed to load. Check your connection and try again."
    );
  }
}
