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
}
