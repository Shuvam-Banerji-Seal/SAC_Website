/**
 * components/viewer.js — image viewer / lightbox with old album framing.
 *
 * Opens a full-screen modal when an image with data-viewer is clicked.
 * Shows the image in a paper-backed frame with corner decorations,
 * navigation arrows, keyboard support, and click-outside to close.
 *
 * Usage: add data-viewer="gallery" to images that should open in the viewer.
 * All images with the same data-viewer value form a group for prev/next navigation.
 */
import { $ } from "../utils/dom.js";

/* -------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

let overlay = null;
let frameImg = null;
let frameCaption = null;
let currentGroup = [];
let currentIndex = 0;
let isOpen = false;

/* -------------------------------------------------------------------------
 * HTML structure (built once on first open)
 * ------------------------------------------------------------------------- */

function buildOverlay() {
  const el = document.createElement("div");
  el.className = "viewer-overlay";
  el.id = "viewer-overlay";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Image viewer");
  el.innerHTML = `
    <button class="viewer-close" aria-label="Close viewer">&times;</button>
    <button class="viewer-nav viewer-nav--prev" aria-label="Previous image">&#8249;</button>
    <button class="viewer-nav viewer-nav--next" aria-label="Next image">&#8250;</button>
    <div class="viewer-frame">
      <div class="viewer-frame__backing"></div>
      <div class="viewer-frame__corner viewer-frame__corner--tl"></div>
      <div class="viewer-frame__corner viewer-frame__corner--tr"></div>
      <div class="viewer-frame__corner viewer-frame__corner--bl"></div>
      <div class="viewer-frame__corner viewer-frame__corner--br"></div>
      <img class="viewer-img" src="" alt="" />
    </div>
    <div class="viewer-caption"></div>
    <div class="viewer-counter"></div>
  `;
  document.body.appendChild(el);
  return el;
}

/* -------------------------------------------------------------------------
 * Open / close
 * ------------------------------------------------------------------------- */

function open(groupName, startIndex) {
  if (!overlay) overlay = buildOverlay();

  // Collect all images with matching data-viewer
  currentGroup = Array.from(
    document.querySelectorAll(`[data-viewer="${groupName}"]`)
  ).filter((img) => img.tagName === "IMG" || img.querySelector("img"));
  if (!currentGroup.length) return;

  currentIndex = startIndex || 0;
  isOpen = true;

  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";

  updateImage();

  // Wire events (only once)
  if (!overlay._wired) {
    overlay._wired = true;

    overlay.querySelector(".viewer-close").addEventListener("click", close);
    overlay.querySelector(".viewer-nav--prev").addEventListener("click", prev);
    overlay.querySelector(".viewer-nav--next").addEventListener("click", next);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    // Keyboard
    document.addEventListener("keydown", handleKey);
  }
}

function close() {
  if (!overlay) return;
  isOpen = false;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKey);
}

function prev() {
  if (currentGroup.length < 2) return;
  currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
  updateImage();
}

function next() {
  if (currentGroup.length < 2) return;
  currentIndex = (currentIndex + 1) % currentGroup.length;
  updateImage();
}

function handleKey(e) {
  if (!isOpen) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
}

/* -------------------------------------------------------------------------
 * Update displayed image
 * ------------------------------------------------------------------------- */

function updateImage() {
  const el = currentGroup[currentIndex];
  if (!el) return;

  const img = el.tagName === "IMG" ? el : el.querySelector("img");
  if (!img) return;

  const viewerImg = overlay.querySelector(".viewer-img");
  const viewerCaption = overlay.querySelector(".viewer-caption");
  const viewerCounter = overlay.querySelector(".viewer-counter");

  viewerImg.src = img.src;
  viewerImg.alt = img.alt || "";

  // Caption: use title, alt, or figcaption text
  const caption =
    img.title ||
    img.alt ||
    el.closest("figure")?.querySelector("figcaption")?.textContent ||
    "";
  viewerCaption.textContent = caption;

  // Counter
  viewerCounter.textContent =
    currentGroup.length > 1
      ? `${currentIndex + 1} / ${currentGroup.length}`
      : "";

  // Show/hide nav buttons
  overlay.querySelector(".viewer-nav--prev").style.display =
    currentGroup.length > 1 ? "grid" : "none";
  overlay.querySelector(".viewer-nav--next").style.display =
    currentGroup.length > 1 ? "grid" : "none";
}

/* -------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

export function setupViewer() {
  // Wire up all images with data-viewer attribute
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-viewer]");
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const groupName = el.dataset.viewer;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return;

    // Find index in group
    const group = Array.from(
      document.querySelectorAll(`[data-viewer="${groupName}"]`)
    ).filter((i) => i.tagName === "IMG" || i.querySelector("img"));
    const index = group.indexOf(el);

    open(groupName, index >= 0 ? index : 0);
  });
}

export function initViewer() {
  setupViewer();
}
