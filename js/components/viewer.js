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
/* unused: import { $ } from "../utils/dom.js"; */

/* -------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

let overlay = null;
let frameEl = null;
let currentGroup = [];
let currentIndex = 0;
let isOpen = false;
let lastFocus = null;

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
    <div class="viewer-bar">
      <div class="viewer-info__context"></div>
      <button class="viewer-close" type="button" aria-label="Close viewer">&times;</button>
    </div>
    <div class="viewer-stage">
      <div class="viewer-frame">
        <img class="viewer-img" src="" alt="" />
      </div>
    </div>
    <div class="viewer-foot">
      <div class="viewer-info">
        <div class="viewer-info__title"></div>
        <div class="viewer-info__desc"></div>
        <div class="viewer-info__credit"></div>
      </div>
      <div class="viewer-strip" aria-label="Image thumbnails"></div>
      <div class="viewer-controls">
        <button class="viewer-nav viewer-nav--prev" type="button" aria-label="Previous image">&#8249;</button>
        <div class="viewer-counter" aria-live="polite"></div>
        <button class="viewer-nav viewer-nav--next" type="button" aria-label="Next image">&#8250;</button>
      </div>
    </div>
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
  lastFocus = document.activeElement;

  // Promote the frame to its own compositor layer while the viewer is open
  frameEl = overlay.querySelector(".viewer-frame");
  if (frameEl) frameEl.style.willChange = "transform";

  overlay.classList.add("is-open");
  document.body.classList.add("viewer-open");
  document.body.style.overflow = "hidden";

  updateImage();

  // Zoom wiring + reset between images
  wireZoom();
  wireSwipe();
  resetZoom();

  // Wire events (only once)
  if (!overlay._wired) {
    overlay._wired = true;

    overlay.querySelector(".viewer-close").addEventListener("click", close);
    overlay.querySelector(".viewer-nav--prev").addEventListener("click", prev);
    overlay.querySelector(".viewer-nav--next").addEventListener("click", next);
    // Tapping the dark space around the plate closes, as does the overlay
    // itself — but never a tap that lands on the picture or the chrome.
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("viewer-stage")) close();
    });
  }

  // Keyboard: re-armed on EVERY open. close() removes this listener (or the
  // page behind would keep paging while the dialog is down), so binding it
  // inside the one-time _wired block meant Esc/arrows/Z worked exactly once
  // per page load. addEventListener dedupes identical listeners, so calling
  // it again while the viewer is already open is harmless.
  document.addEventListener("keydown", handleKey);

  // Focus the close button so Escape/Tab land inside the dialog
  overlay.querySelector(".viewer-close")?.focus({ preventScroll: true });
}

function close() {
  if (!overlay) return;
  isOpen = false;
  overlay.classList.remove("is-open");
  document.body.classList.remove("viewer-open");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKey);
  lastStripGroup = ""; // Reset so strip rebuilds for next group
  // Remove compositor layer promotion — viewer is closed
  if (frameEl) {
    frameEl.style.willChange = "auto";
    frameEl = null;
  }
  // Hand focus back to whatever opened the viewer
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
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
  if (e.key === "z" || e.key === "Z") {
    zoomed = !zoomed;
    applyZoom();
  }
  // Keep Tab inside the dialog (WCAG 2.1 SC 2.1.2, No Keyboard Trap's
  // modal counterpart) — the page behind is inert while the plate is up.
  if (e.key === "Tab") {
    const focusables = Array.from(
      overlay.querySelectorAll("button:not([style*='display: none'])")
    ).filter((b) => b.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/* -------------------------------------------------------------------------
 * Swipe — flick left/right on touch to page through the group
 * ------------------------------------------------------------------------- */

const SWIPE_MIN_X = 45; // px of horizontal travel before it counts
const SWIPE_MAX_Y = 60; // vertical slop allowed — beyond this it's a scroll

function wireSwipe() {
  const stage = overlay.querySelector(".viewer-stage");
  if (!stage || stage.__sacSwipeBound) return;
  stage.__sacSwipeBound = true;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  stage.addEventListener(
    "touchstart",
    (e) => {
      // Panning a zoomed plate must not also page to the next one
      if (zoomed || e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dy) > SWIPE_MAX_Y || Math.abs(dx) < SWIPE_MIN_X) return;
      // A flick that ends on the plate would otherwise also fire the
      // tap-to-zoom click — swallow the next one.
      swipeConsumedClick = true;
      setTimeout(() => (swipeConsumedClick = false), 350);
      dx < 0 ? next() : prev();
    },
    { passive: true }
  );
}

/* -------------------------------------------------------------------------
 * Zoom — click the image to toggle 100% pixel view, drag to pan
 * ------------------------------------------------------------------------- */

let zoomed = false;
let panX = 0;
let panY = 0;
let dragStart = null;
let swipeConsumedClick = false;

function applyZoom() {
  const img = overlay?.querySelector(".viewer-img");
  if (!img) return;
  img.classList.toggle("is-zoomed", zoomed);
  img.style.transform = zoomed ? `translate(${panX}px, ${panY}px) scale(2)` : "";
  img.style.cursor = zoomed ? "grab" : "zoom-in";
  if (!zoomed) {
    panX = 0;
    panY = 0;
  }
}

function resetZoom() {
  zoomed = false;
  dragStart = null;
  applyZoom();
}

function wireZoom() {
  const img = overlay.querySelector(".viewer-img");
  if (img.__sacZoomBound) return;
  img.__sacZoomBound = true;

  img.addEventListener("click", (e) => {
    if (e.detail > 1) return; // let double-click be native where supported
    if (swipeConsumedClick) return; // the tap was the tail of a swipe
    zoomed = !zoomed;
    applyZoom();
  });

  img.addEventListener("pointerdown", (e) => {
    if (!zoomed) return;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
    img.setPointerCapture(e.pointerId);
    img.style.cursor = "grabbing";
    e.preventDefault();
  });
  img.addEventListener("pointermove", (e) => {
    if (!dragStart) return;
    panX = e.clientX - dragStart.x;
    panY = e.clientY - dragStart.y;
    applyZoom();
  });
  const endDrag = () => {
    dragStart = null;
    if (zoomed) img.style.cursor = "grab";
  };
  img.addEventListener("pointerup", endDrag);
  img.addEventListener("pointercancel", endDrag);
}

/* -------------------------------------------------------------------------
 * Thumbnail strip
 * ------------------------------------------------------------------------- */

let lastStripGroup = "";

/* Groups can hold 1,000+ images (the whole gallery). Rendering that many
 * strip buttons on open is wasted memory — render a sliding window around
 * the current index instead, and slide it as the user navigates. */
const STRIP_WINDOW = 41;

function buildThumbnailStrip() {
  const strip = overlay.querySelector(".viewer-strip");
  if (!strip) return;

  const total = currentGroup.length;
  if (total < 2) {
    strip.style.display = "none";
    return;
  }
  strip.style.display = "";

  // Window start: keep currentIndex centred, clamped to [0, total-WINDOW]
  const half = Math.floor(STRIP_WINDOW / 2);
  const start =
    total <= STRIP_WINDOW ? 0 : Math.max(0, Math.min(currentIndex - half, total - STRIP_WINDOW));
  const end = Math.min(total, start + STRIP_WINDOW);

  const imgAt = (i) => {
    const el = currentGroup[i];
    return el.tagName === "IMG" ? el : el.querySelector("img");
  };
  const groupKey =
    currentGroup
      .map(() => imgAt(start)?.src || "")
      .join("|")
      .slice(0, 80) || "";
  const key = `${groupKey}#${start}#${end}`;

  if (key !== lastStripGroup) {
    lastStripGroup = key;
    strip.innerHTML = "";
    for (let i = start; i < end; i++) {
      const img = imgAt(i);
      if (!img) continue;
      const thumb = document.createElement("button");
      thumb.className = "viewer-strip__thumb";
      thumb.dataset.index = String(i);
      thumb.setAttribute("aria-label", `Go to image ${i + 1}`);
      const thumbImg = document.createElement("img");
      thumbImg.src = img.src;
      thumbImg.alt = img.alt || "";
      thumbImg.loading = "lazy";
      thumbImg.decoding = "async";
      thumb.appendChild(thumbImg);
      thumb.addEventListener("click", () => {
        currentIndex = i;
        updateImage();
      });
      strip.appendChild(thumb);
    }
  }

  // Highlight active thumbnail by its group index (window offset aware)
  const thumbs = strip.querySelectorAll(".viewer-strip__thumb");
  thumbs.forEach((t) => {
    t.classList.toggle("is-active", Number(t.dataset.index) === currentIndex);
  });

  // Scroll active thumbnail into view
  const active = strip.querySelector(".is-active");
  if (active) {
    const reduced =
      document.documentElement.getAttribute("data-reduce-motion") === "on" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

/* -------------------------------------------------------------------------
 * Update displayed image
 * ------------------------------------------------------------------------- */

function updateImage(_unused) {
  const el = currentGroup[currentIndex];
  if (!el) return;

  // Clickable element: <a data-viewer> wrapper, a bare <img>, or a button
  // (campus carousel cards) — any element carrying the viewer group.
  const anchor =
    el.hasAttribute?.("data-context") && el.hasAttribute?.("data-viewer")
      ? el
      : el.tagName === "A"
        ? el
        : el.closest("a[data-viewer], [data-viewer][data-context]");
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

  // Full-resolution plate, never the grid thumbnail. Grid tiles deliberately
  // ship a 480px `thumb_url` (js/utils/thumb.js); the lightbox renders up to
  // ~920px wide and zooms 2x, so a thumbnail is visibly soft there. The
  // anchor's href (or the control's data-full) is the full-size file.
  const fullSrc =
    anchor?.dataset?.full || anchor?.getAttribute?.("href") || el.getAttribute?.("href") || img.src;
  viewerImg.src = fullSrc;
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

  // Thumbnail strip: build once per group, then highlight active
  buildThumbnailStrip();
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
