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
import { initImageReveal, eagerFirst } from "../utils/reveal.js";
import { initLazyVideos } from "../utils/media.js";
import { gridSrc } from "../utils/thumb.js";

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
          src: assetUrl(gridSrc(asset)),
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
        { class: "clubs-body campus-cat reveal-section", id: "cat-" + cat, "data-campus-cat": cat },
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

    // --- Campus options: search + category chips + sort + live count ---
    const searchInput = $("#campus-search");
    const sortSelect = $("#campus-sort");
    const chipsWrap = $("#campus-chips");
    const countLine = $("#campus-count");
    let activeCat = "all";

    const updateCount = (visibleCount, visibleCats) => {
      if (!countLine) return;
      const q = searchInput?.value.trim();
      if (!q && activeCat === "all") {
        countLine.textContent = `Showing all ${campus.length} photographs · ${cats.length} places`;
      } else {
        countLine.textContent = `Showing ${visibleCount} of ${campus.length} photographs · ${visibleCats} places`;
      }
    };

    const applyFilters = () => {
      const q = (searchInput?.value || "").toLowerCase().trim();
      let visibleCount = 0;
      let visibleCats = 0;
      document.querySelectorAll(".campus-cat").forEach((section) => {
        const cat = section.dataset.campusCat || "";
        const catLabel = (
          section.querySelector(".clubs-body__title")?.textContent || ""
        ).toLowerCase();
        let sectionVisible = 0;
        section.querySelectorAll(".thumb[data-campus-search]").forEach((item) => {
          const match =
            (activeCat === "all" || cat === activeCat) &&
            (!q || (item.dataset.campusSearch || "").includes(q) || catLabel.includes(q));
          item.classList.toggle("is-hidden", !match);
          if (match) {
            sectionVisible++;
            visibleCount++;
          }
        });
        const showSection = sectionVisible > 0;
        section.classList.toggle("is-hidden", !showSection);
        if (showSection) visibleCats++;
      });
      updateCount(visibleCount, visibleCats);
      const noResults = $(".campus-no-results");
      if (!q && activeCat === "all") {
        noResults?.remove();
      } else if (visibleCount > 0) {
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
    };

    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }

    // Category chips: All + one per category (tap-friendly on mobile)
    if (chipsWrap) {
      const mkChip = (value, label) =>
        el(
          "button",
          {
            class: "campus-chip" + (value === "all" ? " is-selected" : ""),
            type: "button",
            "data-cat": value,
            "aria-pressed": value === "all" ? "true" : "false",
          },
          label
        );
      chipsWrap.append(
        mkChip("all", `All · ${cats.length}`),
        ...cats.map(([cat, entries]) =>
          mkChip(cat, `${cat.replace(/_/g, " ")} · ${entries.length}`)
        )
      );
      chipsWrap.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-cat]");
        if (!chip) return;
        activeCat = chip.dataset.cat;
        chipsWrap.querySelectorAll("[data-cat]").forEach((c) => {
          const on = c === chip;
          c.classList.toggle("is-selected", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        if (searchInput) searchInput.value = "";
        applyFilters();
      });
    }

    // Sort: reorder existing sections in place (keeps reveal state + images)
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        const grid = document.getElementById("campus-grid");
        const sections = Array.from(grid?.querySelectorAll(".campus-cat") || []);
        const countOf = (sec) => sec.querySelectorAll(".thumb").length;
        const nameOf = (sec) => sec.dataset.campusCat || "";
        const mode = sortSelect.value;
        if (mode === "az") sections.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
        else if (mode === "count-asc") sections.sort((a, b) => countOf(a) - countOf(b));
        else if (mode === "shuffle") sections.sort(() => Math.random() - 0.5);
        else sections.sort((a, b) => countOf(b) - countOf(a)); // count-desc
        sections.forEach((sec) => grid.appendChild(sec));
        const first = grid.querySelector(".campus-cat:not(.is-hidden)");
        first?.scrollIntoView({ block: "nearest" });
      });
    }

    applyFilters();
    eagerFirst(document);
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
