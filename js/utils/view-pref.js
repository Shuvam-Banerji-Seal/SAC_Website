/**
 * utils/view-pref.js — the shared thumb-wall reading preference.
 *
 * One preference applies to every wall of photographs on the site: the
 * Gallery, Campus Life, Events, and club pages all honour it. "pinned" is
 * the newspaper pinboard (tilted cards, pins, captions); "sheet" is a dense
 * uniform contact sheet for hunting a specific plate. The choice is stored
 * under `sac-thumb-view` and mirrored onto <html data-thumb-view> so CSS can
 * switch without a re-render. The original Gallery key is read as a fallback
 * so early adopters keep their choice.
 */

const KEY = "sac-thumb-view";
const LEGACY_KEY = "sac-gallery-view";

/** Read the stored preference ("pinned" | "sheet"). Never throws. */
export function loadThumbView() {
  try {
    const stored = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    return stored === "sheet" ? "sheet" : "pinned";
  } catch {
    return "pinned";
  }
}

/** Apply a preference to the document and persist it. Returns the applied
 *  value (invalid input falls back to "pinned"). */
export function applyThumbView(view) {
  const next = view === "sheet" ? "sheet" : "pinned";
  document.documentElement.setAttribute("data-thumb-view", next);
  try {
    localStorage.setItem(KEY, next);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage can be blocked */
  }
  return next;
}

/** Wire a [data-view] button row to the preference. Applies the stored value
 *  immediately (so the wall paints right) and returns the apply() function. */
export function wireThumbViewToggle(wrap) {
  const buttons = wrap ? Array.from(wrap.querySelectorAll("[data-view]")) : [];
  const sync = (view) => {
    buttons.forEach((button) => {
      const on = button.dataset.view === view;
      button.classList.toggle("is-selected", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };
  const apply = (view) => {
    const next = applyThumbView(view);
    sync(next);
    return next;
  };
  apply(loadThumbView());
  wrap?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) apply(button.dataset.view);
  });
  return apply;
}
