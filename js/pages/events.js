/**
 * pages/events.js — events page initialiser.
 *
 * Pulls all is_iicm / is_event entries from the assets map, groups them
 * by year (newest first), and renders a timeline with client-side search.
 */
import { $, el, showError } from "../utils/dom.js";
import { loadAssetsMap } from "../data.js";
import { revealText } from "../utils/calligraphy.js";
import { initImageReveal } from "../utils/reveal.js";

export async function initEvents() {
  const mount = $("#events-list");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const events = assets
      .filter((a) => a.is_iicm || a.is_event)
      .sort((a, b) => (b.year || 0) - (a.year || 0));

    const byYear = new Map();
    for (const e of events) {
      const y = e.year || "Unknown";
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(e);
    }
    const years = Array.from(byYear.keys()).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(b) - Number(a);
    });

    mount.replaceWith(
      el(
        "section",
        { class: "events", id: "events-list" },
        el("h2", { class: "section-title", id: "eventsTitle" }, "Events & competitions"),
        years.length === 0
          ? el("p", { class: "muted" }, "No events indexed yet.")
          : el(
              "div",
              { class: "events__years" },
              ...years.map((y) =>
                el(
                  "section",
                  { class: "events__year reveal-section" },
                  el("h3", { class: "events__year-label" }, String(y)),
                  el(
                    "ul",
                    { class: "thumb-grid pinned-thumbs" },
                    ...byYear.get(y).map((e) =>
                      el(
                        "li",
                        {
                          class: "thumb",
                          "data-event-search": (
                            (e.title || "") +
                            " " +
                            (e.description || "") +
                            " " +
                            (e.club_name || "") +
                            " " +
                            (e.venue || "") +
                            " " +
                            (e.competition || "")
                          ).toLowerCase(),
                          style: "--pin-rotate: " + ((Math.random() - 0.5) * 4).toFixed(1),
                        },
                        el("img", {
                          src: e.public_url,
                          alt: e.description,
                          loading: "lazy",
                          decoding: "async",
                          width: e.width || undefined,
                          height: e.height || undefined,
                        }),
                        el("figcaption", { class: "thumb__cap" }, e.title || e.filename)
                      )
                    )
                  )
                )
              )
            )
      )
    );

    // Calligraphy text reveal for the events title
    const title = document.getElementById("eventsTitle");
    if (title) {
      document.fonts?.ready?.then(() => {
        if (title.offsetParent !== null)
          revealText(title, 1500, undefined, { sound: true, trail: true });
      });
    }

    // Client-side search
    const searchInput = $("#events-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        const items = document.querySelectorAll(".thumb[data-event-search]");
        let visibleCount = 0;
        items.forEach((item) => {
          const haystack = item.dataset.eventSearch || "";
          const match = !q || haystack.includes(q);
          item.style.display = match ? "" : "none";
          if (match) visibleCount++;
        });
        // Hide year sections with no visible items
        document.querySelectorAll(".events__year").forEach((section) => {
          const visibleItems = section.querySelectorAll(".thumb:not([style*='display: none'])");
          section.style.display = visibleItems.length === 0 ? "none" : "";
        });
        // Show/hide no-results message
        const noResults = $(".events-no-results");
        if (!q || visibleCount > 0) {
          if (noResults) noResults.remove();
        } else if (!noResults) {
          mount.appendChild(
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
  } catch {
    showError(
      mount,
      "Could not load events",
      "The events timeline failed to load. Check your connection and try again."
    );
  }
}
