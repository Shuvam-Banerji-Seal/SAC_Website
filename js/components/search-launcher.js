/**
 * components/search-launcher.js — the few bytes of search that live in the shell.
 *
 * Listens for "/" and Ctrl/⌘ + K, and for any element marked `data-open-search`
 * (the sidebar's button; the home page's interest chips pass the interest as the
 * attribute's value), and only then imports the palette (components/search.js, with its
 * own stylesheet). Registered at start-up rather than at idle, so a press in the first
 * second is not lost.
 */

/** Is the key press aimed at something you type into? Then "/" is just a slash. */
export function isTypingTarget(node) {
  if (!node || !node.tagName) return false;
  return node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName);
}

let palette = null;
/** Fetch the palette once; a failed fetch (offline, first visit) is retried on the next press. */
const load = () =>
  (palette ??= import("./search.js").catch((err) => {
    palette = null;
    console.error("[search] could not load the search palette:", err);
    return null;
  }));

/**
 * @returns {() => void} a function that removes the listeners again
 */
export function initSearchLauncher() {
  const onKey = (e) => {
    const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey;
    const chord = e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey);
    if (!slash && !chord) return;
    if (document.body.classList.contains("search-open")) {
      // already open: ⌘K must not reach the browser's own address-bar search
      if (chord) e.preventDefault();
      return;
    }
    if (slash && isTypingTarget(e.target)) return;
    e.preventDefault();
    load().then((m) => m?.openSearch());
  };
  const onClick = (e) => {
    const trigger = e.target.closest?.("[data-open-search]");
    if (!trigger) return;
    e.preventDefault();
    load().then((m) => m?.openSearch({ interest: trigger.dataset.openSearch || null }));
  };
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onClick);
  };
}
