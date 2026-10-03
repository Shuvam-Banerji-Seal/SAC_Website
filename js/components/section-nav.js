/**
 * components/section-nav.js — a sticky "jump to" bar for long pages.
 *
 * The clubs directory is ~3,600px tall and a club page up to ~6,400px; on a
 * phone that is a lot of thumb. This builds a bar of chips (one per section)
 * that stays under the header, scrolls sideways when it must, and marks the
 * section you are reading. Used by the clubs directory (the five SAC bodies)
 * and by every club page (built from the page's own <h2> headings).
 */
import { el } from "../utils/dom.js";

/** "Events & Activities" → "events-and-activities" */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {Array<{id: string, label: string, count?: number}>} items
 * @param {{label?: string}} [options] accessible name of the landmark
 * @returns {HTMLElement}
 */
export function buildSectionNav(items, { label = "Jump to a section" } = {}) {
  return el(
    "nav",
    { class: "section-nav", "aria-label": label },
    el(
      "ul",
      { class: "section-nav__list" },
      ...items.map((item) =>
        el(
          "li",
          {},
          el(
            "a",
            { class: "section-nav__chip", href: `#${item.id}`, "data-target": item.id },
            item.label,
            item.count != null
              ? el("span", { class: "section-nav__count" }, String(item.count))
              : null
          )
        )
      )
    )
  );
}

/**
 * Mark the chip of the section currently under the header. Returns a function
 * that stops watching. Falls back to "no highlight" where IntersectionObserver
 * is missing — the links still work.
 */
export function trackSections(nav) {
  if (!("IntersectionObserver" in window)) return () => {};
  const chips = new Map(
    [...nav.querySelectorAll("[data-target]")].map((a) => [a.dataset.target, a])
  );
  const targets = [...chips.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  // A section is "reached" once its heading is inside the top band of the
  // screen or has scrolled above it. The current section is the last one
  // reached, so a chip stays lit through a long section instead of going dark
  // whenever no heading happens to sit in the band.
  const reached = new Set();
  const paint = () => {
    const current = [...targets].reverse().find((t) => reached.has(t.id))?.id;
    chips.forEach((chip, id) => {
      const on = id === current;
      chip.classList.toggle("is-active", on);
      if (on) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    });
    // keep the active chip in view when the bar scrolls sideways
    const active = nav.querySelector(".is-active");
    if (active && nav.scrollWidth > nav.clientWidth) {
      const list = nav.querySelector(".section-nav__list");
      const target = active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2;
      list.scrollTo?.({ left: target, behavior: "smooth" });
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const above = e.boundingClientRect.top < (e.rootBounds?.top ?? 0);
        if (e.isIntersecting || above) reached.add(e.target.id);
        else reached.delete(e.target.id);
      }
      paint();
    },
    // the band is the top 30% of the screen
    { rootMargin: "0px 0px -70% 0px" }
  );
  targets.forEach((t) => observer.observe(t));
  return () => observer.disconnect();
}

/**
 * Club pages: build the bar from the page's own <h2> headings, giving each an
 * id where it has none. Needs three or more sections to be worth the space.
 * Call it after the page's dynamic sections have rendered.
 */
export function initClubSectionNav(root = document.querySelector("main")) {
  if (!root || root.querySelector(".section-nav")) return null;
  const used = new Set([...document.querySelectorAll("[id]")].map((n) => n.id));
  const items = [];
  for (const h of root.querySelectorAll("h2")) {
    if (h.closest(".is-hidden, [hidden]") || !h.textContent.trim()) continue;
    if (!h.id) {
      let id = slugify(h.textContent);
      if (!id) continue;
      for (let n = 2; used.has(id); n++) id = `${slugify(h.textContent)}-${n}`;
      h.id = id;
      used.add(id);
    }
    items.push({ id: h.id, label: h.textContent.replace(/\s+/g, " ").trim() });
  }
  if (items.length < 3) return null;
  const nav = buildSectionNav(items, { label: "Sections on this page" });
  const anchor = root.querySelector(".club-detail__body, .club-detail__section, section");
  (anchor || root.firstElementChild)?.before(nav);
  trackSections(nav);
  return nav;
}
