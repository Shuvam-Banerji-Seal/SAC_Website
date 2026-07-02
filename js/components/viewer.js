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
let frameEl = null;
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
    <div class="viewer-info">
      <div class="viewer-info__context"></div>
      <div class="viewer-info__title"></div>
      <div class="viewer-info__desc"></div>
      <div class="viewer-info__credit"></div>
    </div>
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
  currentGroup = Array.from(document.querySelectorAll(`[data-viewer="${groupName}"]`)).filter(
    (img) => img.tagName === "IMG" || img.querySelector("img")
  );
  if (!currentGroup.length) return;

  currentIndex = startIndex || 0;
  isOpen = true;

  // Promote the frame to its own compositor layer while the viewer is open
  frameEl = overlay.querySelector(".viewer-frame");
  if (frameEl) frameEl.style.willChange = "transform";

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
  // Remove compositor layer promotion — viewer is closed
  if (frameEl) {
    frameEl.style.willChange = "auto";
    frameEl = null;
  }
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

  // The clickable element is the <a data-viewer> wrapper (or sometimes a bare <img>)
  const anchor = el.tagName === "A" ? el : el.closest("a[data-viewer]");
  const img = el.tagName === "IMG" ? el : el.querySelector("img");
  if (!img) return;

  const viewerImg = overlay.querySelector(".viewer-img");
  const viewerCounter = overlay.querySelector(".viewer-counter");

  // Caption fields: rich metadata from data-* attributes set by
  // gallery.js / club-images.js / events.js.
  const infoContext = overlay.querySelector(".viewer-info__context");
  const infoTitle = overlay.querySelector(".viewer-info__title");
  const infoDesc = overlay.querySelector(".viewer-info__desc");
  const infoCredit = overlay.querySelector(".viewer-info__credit");

  viewerImg.src = img.src;
  viewerImg.alt = img.alt || "";

  // Context (e.g., "AARSHI · Event Photos" or "Gallery · All")
  const context = anchor?.dataset.context || "";
  // Title of the image
  const title =
    anchor?.dataset.title ||
    img.title ||
    img.alt ||
    el.closest("figure")?.querySelector("figcaption")?.textContent ||
    "";
  // Longer description
  const desc = anchor?.dataset.desc || "";
  // Credit / photographer
  const credit = anchor?.dataset.credit || "";

  infoContext.textContent = context;
  infoTitle.textContent = title;
  infoDesc.textContent = desc;
  infoCredit.textContent = credit;

  // Hide empty caption sub-blocks gracefully
  infoContext.style.display = context ? "" : "none";
  infoTitle.style.display = title ? "" : "none";
  infoDesc.style.display = desc ? "" : "none";
  infoCredit.style.display = credit ? "" : "none";

  // Counter
  viewerCounter.textContent =
    currentGroup.length > 1 ? `${currentIndex + 1} / ${currentGroup.length}` : "";

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
    const group = Array.from(document.querySelectorAll(`[data-viewer="${groupName}"]`)).filter(
      (i) => i.tagName === "IMG" || i.querySelector("img")
    );
    const index = group.indexOf(el);

    open(groupName, index >= 0 ? index : 0);
  });
}

export function initViewer() {
  setupViewer();
}
