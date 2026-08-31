/**
 * utils/skeleton.js — instant scaffolding for data-driven mounts.
 *
 * The 1.6MB assets_map.jsonl takes a moment on first visit (or slow mobile
 * networks); until it arrives the JS-rendered grids are blank holes. These
 * helpers stamp paper-dashed skeleton layouts into the mounts immediately,
 * then `clearSkeleton()` removes them once real content paints.
 */

function make(tag, cls, html = "") {
  const el = document.createElement(tag);
  el.className = cls;
  el.setAttribute("aria-hidden", "true");
  if (html) el.innerHTML = html;
  return el;
}

/** Thumb-grid placeholder: N dashed paper cards. */
export function showGridSkeleton(mount, count = 8) {
  if (!mount || mount.querySelector(".skeleton")) return;
  const grid = make("ul", "skeleton--grid");
  for (let i = 0; i < count; i++) grid.appendChild(document.createElement("li"));
  mount.appendChild(grid);
}

/** Club identity placeholder: logo square + three text lines. */
export function showIdentitySkeleton(mount) {
  if (!mount || mount.querySelector(".skeleton")) return;
  const box = make("div", "skeleton skeleton--identity");
  box.appendChild(make("div", "sk-logo"));
  const lines = make("div", "sk-lines");
  for (let i = 0; i < 3; i++) lines.appendChild(make("span", ""));
  box.appendChild(lines);
  mount.appendChild(box);
}

/** Generic dashed bar. */
export function showBarSkeleton(mount, count = 1) {
  if (!mount || mount.querySelector(".skeleton")) return;
  for (let i = 0; i < count; i++) mount.appendChild(make("p", "skeleton", "&nbsp;"));
}

/** Remove every skeleton inside a mount (content is ready to paint). */
export function clearSkeleton(mount) {
  if (!mount) return;
  mount.querySelectorAll(".skeleton").forEach((s) => s.remove());
  mount.querySelectorAll(".skeleton--grid").forEach((s) => s.remove());
}
