/**
 * pages/events.js — events page initialiser.
 *
 * Pulls all is_iicm / is_event entries from the assets map, groups them
 * by year (newest first), and renders a timeline.
 */
import { $, el } from "../utils/dom.js";
import { loadAssetsMap } from "../data.js";
import { revealText } from "../utils/calligraphy.js";

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
                          style: "--pin-rotate: " + ((Math.random() - 0.5) * 4).toFixed(1),
                        },
                        el("img", {
                          src: e.public_url,
                          alt: e.description,
                          loading: "lazy",
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
        if (title.offsetParent !== null) revealText(title, 1500);
      });
    }

    // IntersectionObserver for section reveals
    if (
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches &&
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
  } catch (err) {
    console.error("initEvents failed:", err);
  }
}
