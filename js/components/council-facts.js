/**
 * components/council-facts.js — "the Council at a glance".
 *
 * What the Council is, not how many files describe it. A visitor wants to
 * know its shape and reach; a media tally answers a question nobody asked.
 * Every figure below is the constitutional structure, which is fixed — so it
 * is stated here rather than counted out of the asset map. That also means
 * this needs no data: the About page used to download and parse the whole
 * 2 MB archive just to print these four lines.
 */
import { el } from "../utils/dom.js";

export const COUNCIL_FACTS = [
  ["bodies", "5", "elected bodies", "Academics, Cultural, Food & Hygiene, Hostel, Sports"],
  ["clubs", "33", "clubs & committees", "each with its own office bearers and budget"],
  ["halls", "5", "halls of residence", "wing representatives on every floor"],
  ["tenure", "1 yr", "office-bearer tenure", "elected annually, club by club"],
];

/** True when the visitor (OS setting or the site's own toggle) asked for less motion. */
const prefersLessMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.reduceMotion === "on";

const easeOut = (t) => 1 - (1 - t) ** 3;

/**
 * Count each plain number up from 0 the first time it scrolls into view.
 *
 * The finished figure is in the DOM from the start (visually-hidden, so no-JS, search
 * engines and screen readers read the real value, never a half-counted one); only the
 * drawn digits move. They are tabular-width and the card's width comes from the grid, so
 * nothing shifts. Skipped entirely under reduced motion or without IntersectionObserver.
 */
export function animateFacts(mount, { duration = 1100 } = {}) {
  if (!("IntersectionObserver" in window) || prefersLessMotion()) return;
  const targets = [];
  for (const strong of mount.querySelectorAll(".home-stat strong")) {
    const final = strong.textContent.trim();
    if (!/^\d+$/.test(final)) continue; // "1 yr" is not a count
    const drawn = el("span", { class: "home-stat__figure", "aria-hidden": "true" }, "0");
    strong.replaceChildren(drawn, el("span", { class: "visually-hidden" }, final));
    targets.push([drawn, Number(final), final]);
  }
  if (!targets.length) return;

  const run = ([drawn, to, final]) => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      drawn.textContent = t < 1 ? String(Math.round(to * easeOut(t))) : final;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const byNode = new Map(targets.map((t) => [t[0].parentElement, t]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        observer.unobserve(e.target);
        run(byNode.get(e.target));
      }
    },
    { threshold: 0.6 }
  );
  byNode.forEach((_, node) => observer.observe(node));
}

/** Fill `#mountId` with the four facts. Safe to call when the mount is absent. */
export function renderCouncilFacts(mountId = "home-stats") {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.replaceChildren(
    ...COUNCIL_FACTS.map(([id, value, label, note]) =>
      el(
        "div",
        { class: "home-stat", "data-stat": id },
        el("strong", {}, value),
        el("span", {}, label),
        el("span", { class: "home-stat__note" }, note)
      )
    )
  );
  animateFacts(mount);
}
