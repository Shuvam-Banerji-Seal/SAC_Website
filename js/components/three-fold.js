/* Compatibility surface for older integrations. The Three.js paper scene
   was intentionally removed; the shared CSS paper stack replaces it. */
export function initPaperFold() {
  if (document.documentElement.getAttribute("data-reduce-motion")) return;
  return null;
}

export function destroy() {}
