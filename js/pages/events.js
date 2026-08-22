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
import { initImageReveal } from "../utils/reveal.js";
import { initLazyVideos } from "../utils/media.js";

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
  const raw = asset.title || asset.filename || "SAC event";
  return (
    String(raw)
      .replace(/\.[a-z0-9]+$/i, "")
      .trim() || "SAC event"
  );
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

function renderEventMedia(asset) {
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
        src: assetUrl(asset.public_url),
        type: asset.mime_type || "video/mp4",
      })
    );
  }
  return el("img", {
    src: assetUrl(asset.public_url),
    alt: asset.description || asset.title || asset.filename || "SAC event photograph",
    loading: "lazy",
    decoding: "async",
    width: asset.width || undefined,
    height: asset.height || undefined,
    style:
      asset.width && asset.height ? `aspect-ratio: ${asset.width} / ${asset.height}` : undefined,
  });
}

export async function initEvents() {
  const mount = $("#events-list");
  if (!mount) return;
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

    mount.replaceWith(
      el(
        "section",
        { class: "events", id: "events-list", "aria-label": "Event timeline" },
        years.length === 0
          ? el("p", { class: "muted" }, "No events indexed yet.")
          : el(
              "div",
              { class: "events__years" },
              ...years.map((y) =>
                el(
                  "section",
                  { class: "events__year reveal-section" },
                  el("h2", { class: "events__year-label" }, String(y)),
                  el(
                    "ul",
                    { class: "thumb-grid pinned-thumbs" },
                    ...byYear.get(y).map((e, index) => {
                      const groupName = "events-" + y;
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
                            ? renderEventMedia(e)
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
                                renderEventMedia(e)
                              ),
                          el("figcaption", { class: "thumb__cap" }, caption)
                        )
                      );
                    })
                  )
                )
              )
            )
      )
    );

    // Client-side search
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
