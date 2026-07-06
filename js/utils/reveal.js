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
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");

          // Stagger each thumb with paper-slide reveal
          const thumbs = entry.target.querySelectorAll(".thumb--reveal");
          thumbs.forEach((thumb, i) => {
            thumb.style.transitionDelay = i * (staggerMs / 1000) + "s";
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                thumb.classList.add("is-revealed");
              });
            });
          });

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold },
  );

  sections.forEach((s) => observer.observe(s));
}
