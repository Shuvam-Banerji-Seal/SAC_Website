/**
 * pages/events.js — events timeline.
 *
 * Pulls all is_iicm / is_event entries from the assets map (images AND
 * event-flagged videos), groups them by year (newest first, undated last),
 * and renders a timeline with client-side search. Thumbs use the shared
 * paper-reveal animation and valid figure/figcaption semantics.
 */
import { $, el, showError, assetUrl } from "../utils/dom.js";
import { loadAssetsMap } from "../data.js";
import { initImageReveal, eagerFirst } from "../utils/reveal.js";
import { initLazyVideos } from "../utils/media.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";
import { showGridSkeleton, clearSkeleton } from "../utils/skeleton.js";

function dedupe(assets) {
  const seen = new Set();
  return assets.filter((a) => {
    const key = a.public_url || a.path || a.filename;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanCaption(asset) {
  return captionFor(asset);
}

function assetRatio(asset) {
  const ratio =
    Number(asset.aspect_ratio) ||
    (asset.width && asset.height ? asset.width / asset.height : 4 / 3);
  return Math.min(3, Math.max(0.55, ratio));
}

/** Deterministic pin tilt — same layout every visit (no Math.random jitter). */
function pinTilt(index) {
  return (((index % 7) - 3) * 0.6).toFixed(2);
}

function renderEventMedia(asset, eager = false) {
  if (asset.file_type === "video") {
    // preload="none" until the thumb nears the viewport (lazy-video observer
    // below flips it to "metadata") — avoids 100+ metadata requests on load.
    return el(
      "video",
      {
        controls: true,
        preload: "none",
        "data-preload-lazy": "",
        playsinline: true,
        "aria-label": cleanCaption(asset),
      },
      el("source", {
        src: assetUrl(asset.public_url), // full video file — never a thumb
        type: asset.mime_type || "video/mp4",
      })
    );
  }
  return el("img", {
    src: assetUrl(gridSrc(asset)),
    alt: altTextFor(asset, "SAC event photograph"),
    loading: eager ? "eager" : "lazy",
    fetchpriority: eager ? "high" : undefined,
    decoding: "async",
    width: asset.width || undefined,
    height: asset.height || undefined,
    style:
      asset.width && asset.height ? `aspect-ratio: ${asset.width} / ${asset.height}` : undefined,
  });
}

/** The Undated bucket can hold hundreds of items — sub-group by club so it
 *  reads as club chapters instead of one monolithic dump. */
function renderUndatedByClub(items) {
  const byClub = new Map();
  for (const e of items) {
    const key = e.club_name || "SAC archive";
    if (!byClub.has(key)) byClub.set(key, []);
    byClub.get(key).push(e);
  }
  return Array.from(byClub.entries()).map(([clubName, entries]) =>
    el(
      "div",
      { class: "events__undated-club" },
      el(
        "h3",
        { class: "events__undated-club-label" },
        clubName,
        el("span", { class: "events__undated-club-count" }, String(entries.length))
      ),
      renderEventGrid(
        entries,
        "events-undated-" + (entries[0]?.club || "archive"),
        "Undated · " + clubName
      )
    )
  );
}

/** One dated year's grid of pinned thumbs. */
function renderEventGrid(yearEvents, groupName, y) {
  return el(
    "ul",
    { class: "thumb-grid pinned-thumbs" },
    ...yearEvents.map((e, index) => {
      const caption = cleanCaption(e);
      return el(
        "li",
        {
          class: "thumb thumb--reveal",
          "data-event-search": (
            caption +
            " " +
            (e.description || "") +
            " " +
            (e.club_name || "") +
            " " +
            (e.venue || "") +
            " " +
            (e.competition || "")
          ).toLowerCase(),
          style: `--pin-rotate: ${pinTilt(index)}; --thumb-aspect: ${assetRatio(e)};`,
        },
        el(
          "figure",
          { class: "thumb__figure" },
          e.file_type === "video"
            ? renderEventMedia(e, index < 3)
            : el(
                "a",
                {
                  href: assetUrl(e.public_url),
                  "data-viewer": groupName,
                  "data-title": caption,
                  "data-desc": e.description || e.club_name || "",
                  "data-credit": e.credit || "",
                  "data-context": "Events · " + y,
                  title: caption,
                },
                renderEventMedia(e, index < 3)
              ),
          el("figcaption", { class: "thumb__cap" }, caption)
        )
      );
    })
  );
}

export async function initEvents() {
  const mount = $("#events-list");
  if (!mount) return;
  showGridSkeleton(mount, 9);
  try {
    const assets = await loadAssetsMap();
    // Event provenance only — images and videos flagged by the asset pipeline.
    // (No blanket file_type === "video" catch-all: club practice clips stay out.)
    const events = dedupe(assets.filter((a) => a.is_iicm || a.is_event)).sort(
      (a, b) => (b.year || 0) - (a.year || 0)
    );

    const byYear = new Map();
    for (const e of events) {
      const y = e.year || "Undated";
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(e);
    }
    const years = Array.from(byYear.keys()).sort((a, b) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return Number(b) - Number(a);
    });

    const campusMap = el(
      "div",
      { class: "map-card", "aria-label": "Campus venue map" },
      el(
        "div",
        { class: "map-card__frame" },
        el("iframe", {
          src: "https://www.google.com/maps?q=IISER+Kolkata+Mohanpur&output=embed",
          title: "IISER Kolkata campus map — event venues",
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
        })
      ),
      el("p", { class: "map-card__label" }, "Venues · IISER Kolkata, Mohanpur campus")
    );

    // Dynamic header chip: total moments + clips straight from the map
    const pageTitle = document.querySelector("h1.page-title");
    if (pageTitle && !pageTitle.querySelector(".count-chip")) {
      const clips = events.filter((e) => e.file_type === "video").length;
      pageTitle.append(
        el(
          "span",
          { class: "count-chip", "aria-label": `${events.length} indexed moments` },
          `${events.length} moments${clips ? ` · ${clips} clips` : ""}`
        )
      );
    }

    clearSkeleton(mount);
    mount.replaceWith(
      el(
        "section",
        { class: "events", id: "events-list", "aria-label": "Event timeline" },
        campusMap,
        years.length === 0
          ? el("p", { class: "muted" }, "No events indexed yet.")
          : el(
              "div",
              { class: "events__years" },
              ...years.map((y) => {
                const yearEvents = byYear.get(y);
                return el(
                  "section",
                  { class: "events__year reveal-section" },
                  el("h2", { class: "events__year-label" }, String(y)),
                  ...(y === "Undated"
                    ? renderUndatedByClub(yearEvents)
                    : [renderEventGrid(yearEvents, "events-" + y, y)])
                );
              })
            )
      )
    );

    // Client-side search// Client-side search
    const searchInput = $("#events-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        document.querySelectorAll(".events__year").forEach((section) => {
          let sectionVisible = 0;
          section.querySelectorAll(".thumb[data-event-search]").forEach((item) => {
            const haystack = item.dataset.eventSearch || "";
            const match = !q || haystack.includes(q);
            item.classList.toggle("is-hidden", !match);
            if (match) {
              sectionVisible++;
              visibleCount++;
            }
          });
          section.classList.toggle("is-hidden", sectionVisible === 0);
        });
        // Live result-count chip
        let counter = searchInput.parentElement.querySelector(".events-search-count");
        if (!counter) {
          counter = el("span", {
            class: "clubs-search-count events-search-count",
            role: "status",
            "aria-live": "polite",
          });
          searchInput.parentElement.append(counter);
        }
        counter.textContent = q
          ? `${visibleCount} of ${document.querySelectorAll(".thumb[data-event-search]").length} moments`
          : "";

        const noResults = $(".events-no-results");
        if (!q || visibleCount > 0) {
          noResults?.remove();
        } else if (!noResults) {
          document
            .getElementById("events-list")
            ?.appendChild(
              el(
                "p",
                { class: "clubs-no-results events-no-results", role: "status" },
                "No events match that search."
              )
            );
        }
      });
    }

    // IntersectionObserver for section reveals + staggered image entrance.
    // Reduced-motion (prefers-reduced-motion or data-reduce-motion override)
    // is handled inside initImageReveal so we don't duplicate checks here.
    eagerFirst(document);
    initImageReveal(document);
    initLazyVideos(document);
  } catch {
    showError(
      mount,
      "Could not load events",
      "The events timeline failed to load. Check your connection and try again."
    );
  }
}
