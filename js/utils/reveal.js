/**
 * utils/reveal.js — Shared paper-slide image reveal animation.
 *
 * Uses IntersectionObserver to stagger-animate .thumb--reveal elements
 * with a clip-path reveal (left-to-right) when their container enters
 * the viewport. This avoids duplicating the same ~25-line observer
 * pattern across events.js, gallery.js, club-images.js, and home.js.
 */

/**
 * Observe all `.reveal-section` containers within `root` and stagger-reveal
 * any `.thumb--reveal` children when each section enters the viewport.
 *
 * Respects `prefers-reduced-motion` and falls back to showing everything
 * immediately if IntersectionObserver is unavailable.
 *
 * @param {Element|Document} [root=document] — container to search within
 * @param {object} [opts]
 * @param {number} [opts.staggerMs=70] — ms between each thumb's reveal
 * @param {number} [opts.threshold=0.1] — intersection ratio to trigger
 */
export function initImageReveal(root = document, opts = {}) {
  const { staggerMs = 70, threshold = 0.1 } = opts;

  // No-op for reduced motion: CSS already handles .thumb--reveal → clip-path: none
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ||
    document.documentElement.getAttribute("data-reduce-motion") === "on";
  if (reducedMotion) {
    root.querySelectorAll(".thumb--reveal").forEach((el) => {
      el.classList.add("is-revealed");
    });
    return;
  }

  if (!("IntersectionObserver" in window)) {
    root.querySelectorAll(".thumb--reveal").forEach((el) => {
      el.classList.add("is-revealed");
    });
    return;
  }

  const sections = root.querySelectorAll(".reveal-section");

  // Safety net: if a caller passes thumbs WITHOUT a .reveal-section wrapper
  // (or every section is skipped by content-visibility), reveal after a short
  // delay so images can never stay invisible. Blank-grid bug seen on
  // campus-life — clicks opened the viewer but thumbs never appeared.
  const orphanThumbs = root.querySelectorAll(".thumb--reveal");
  const orphans = [];
  sections.forEach((s) => {
    const inSection = new Set(Array.from(s.querySelectorAll(".thumb--reveal")));
    orphans.push(...Array.from(orphanThumbs).filter((t) => !inSection.has(t)));
  });
  if (orphans.length) {
    window.setTimeout(() => {
      orphans.forEach((t) => t.classList.add("is-revealed"));
    }, 1200);
  }

  const MAX_STAGGER_INDEX = 14; // cap ≈1s: no thumb ever waits 19s to fade in

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");

          // Stagger each thumb with paper-slide reveal
          const thumbs = entry.target.querySelectorAll(".thumb--reveal");
          thumbs.forEach((thumb, i) => {
            thumb.style.transitionDelay = Math.min(i, MAX_STAGGER_INDEX) * (staggerMs / 1000) + "s";
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                thumb.classList.add("is-revealed");
                // Clear the inline delay once revealed so later state
                // changes (hover, filter) are never lagged by a stale delay.
                window.setTimeout(
                  () => {
                    thumb.style.transitionDelay = "";
                  },
                  Math.min(i, MAX_STAGGER_INDEX) * staggerMs + 450
                );
              });
            });
          });

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );

  sections.forEach((s) => observer.observe(s));

  // Global backstop: any thumb still hidden 4s after bind gets revealed.
  // Covers late-appended nodes, IO flakiness, and content-visibility races
  // that the 1200ms orphan net can miss on slow mobile loads.
  window.setTimeout(() => {
    root.querySelectorAll(".thumb--reveal:not(.is-revealed)").forEach((t) => {
      t.style.transitionDelay = "";
      t.classList.add("is-revealed");
    });
  }, 4000);
}

/**
 * Reveal every hidden thumb under root immediately. Pages call this after
 * any dynamic re-render that adds nodes post-init (so content can never
 * stick at opacity 0).
 */
export function revealAll(root = document) {
  root.querySelectorAll(".thumb--reveal:not(.is-revealed)").forEach((t) => {
    t.style.transitionDelay = "";
    t.classList.add("is-revealed");
  });
}

/**
 * Mark the first N images under root as eager + high priority so the
 * above-fold viewport paints immediately instead of waiting on the
 * lazy-load queue. Call after render, before/after initImageReveal.
 */
export function eagerFirst(root = document, n = 6) {
  Array.from(root.querySelectorAll(".thumb-grid img, .thumb img"))
    .slice(0, n)
    .forEach((img) => {
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
    });
}
