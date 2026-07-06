/**
 * utils/dom.js — tiny DOM helpers. No deps.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function onReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

export function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/** True when the current page is at /pages/<file>.html. */
export function isInPagesDir() {
  return /\/pages\/[^/]+\.html$/.test(location.pathname);
}

/**
 * Build a path that's correct relative to the current page.
 *
 * `pageUrl("pages/clubs.html")`:
 *   - from /index.html            -> "pages/clubs.html"
 *   - from /pages/about.html      -> "../pages/clubs.html"
 *
 * Absolute paths (starting with "/" or a scheme) are returned as-is.
 */
export function pageUrl(path) {
  if (/^([a-z]+:|\/)/i.test(path)) return path;
  return isInPagesDir() ? `../${path}` : path;
}

/**
 * Replace a mount element with a styled error state.
 * @param {HTMLElement} mount - the element to replace
 * @param {string} title - short error title
 * @param {string} detail - longer explanation
 */
export function showError(mount, title, detail) {
  if (!mount) return;
  mount.replaceWith(
    el(
      "div",
      { class: "error-state", role: "alert" },
      el("p", { class: "error-state__title" }, title),
      el("p", { class: "error-state__detail" }, detail),
      el(
        "p",
        { class: "error-state__retry" },
        el(
          "button",
          {
            type: "button",
            class: "error-state__btn",
            onClick: () => location.reload(),
          },
          "Try again"
        )
      )
    )
  );
}
