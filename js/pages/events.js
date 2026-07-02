/**
 * pages/events.js — events page initialiser.
 *
 * Pulls all is_iicm / is_event entries from the assets map, groups them
 * by year (newest first), and renders a timeline.
 */
import { $, el } from "../utils/dom.js";
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
                          class: "thumb thumb--reveal",
                          style: "--pin-rotate: " + ((Math.random() - 0.5) * 4).toFixed(1),
                        },
                        el(
                          "a",
                          {
                            href: e.public_url,
                            "data-viewer": "events-" + y,
                            "data-title": e.title || e.filename || "",
                            "data-desc": e.description || "",
                            "data-credit": e.credit || "",
                            "data-context": "Events · " + y,
                            title: e.title || e.filename || "",
                          },
                          el("img", {
                            src: e.public_url,
                            alt: e.description || "",
                            loading: "lazy",
                            decoding: "async",
                            width: e.width || undefined,
                            height: e.height || undefined,
                          })
                        ),
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

    // Calligraphy reveal on year labels
    const yearLabels = document.querySelectorAll(".events__year-label");
    if (yearLabels.length && "IntersectionObserver" in window) {
      const yearObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              revealText(entry.target, 800, undefined, { sound: false, trail: false });
              yearObs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      yearLabels.forEach((l) => yearObs.observe(l));
    }

    // IntersectionObserver for section reveals + per-thumb staggered entrance
    initImageReveal(document);
  } catch (err) {
    console.error("initEvents failed:", err);
  }
}
