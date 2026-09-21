/**
 * components/campus-book.js — The Campus in Print, as a flipping book.
 *
 * A real two-page-spread book on the front page: cover, one photo per page,
 * back cover. Each leaf is exactly half the stage wide, hinged on the centre
 * spine; flipping rotates it -180deg so it lands exactly on the left half.
 * Nothing ever leaves the stage bounds. Every leaf has a front face and a
 * paper back face (plate caption), so mid-flip and stacked states both read
 * correctly. Clicking the facing photo opens the shared viewer lightbox.
 */
import { el, assetUrl } from "../utils/dom.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";

const PHOTO_COUNT = 12;
const AUTO_FLIP_MS = 7000;

function isReducedMotion() {
  return (
    document.documentElement.getAttribute("data-reduce-motion") === "on" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Landscape campus shots, round-robin across categories for variety. */
function pickPhotos(assets, count) {
  const pool = assets.filter(
    (a) =>
      a.club === "Campus_Archive" &&
      a.file_type === "image" &&
      (Number(a.aspect_ratio) || 1) >= 1.25
  );
  const byCat = new Map();
  for (const a of pool) {
    const c = a.category || "Campus";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(a);
  }
  const cats = Array.from(byCat.values());
  const picked = [];
  while (picked.length < count && cats.some((c) => c.length)) {
    for (const c of cats) if (c.length && picked.length < count) picked.push(c.shift());
  }
  // rotate the starting offset by day so the front page feels alive
  const offset = new Date().getDate() % Math.max(1, picked.length);
  return [...picked.slice(offset), ...picked.slice(0, offset)];
}

export function initCampusBook(assets) {
  const mount = document.getElementById("campus-book");
  if (!mount || mount.dataset.bound === "true") return;
  const photos = pickPhotos(assets, PHOTO_COUNT);
  if (photos.length < 4) return;
  mount.dataset.bound = "true";

  const label = (a) => captionFor(a) || "Campus photograph";

  // Page model: cover + one photo per page + back cover.
  const pages = [
    { type: "cover" },
    ...photos.map((photo, i) => ({ type: "photo", photo, plate: i + 1 })),
    { type: "back" },
  ];
  const total = pages.length;

  let current = 0; // index of the leaf facing us on the right
  let auto = !isReducedMotion();
  let timer = null;
  let inView = true; // the book is inside the viewport
  let paused = false; // pointer or keyboard focus is on the book

  const counter = el("span", { class: "book__counter", "aria-live": "polite" });
  const flipL = el(
    "button",
    { class: "book__flip book__flip--prev", type: "button", "aria-label": "Flip back a page" },
    "‹"
  );
  const flipR = el(
    "button",
    { class: "book__flip book__flip--next", type: "button", "aria-label": "Flip to the next page" },
    "›"
  );
  const playBtn = el(
    "button",
    { class: "book__play", type: "button", "aria-label": "Pause the book" },
    auto ? "❙❙" : "▶"
  );

  function frontFace(page) {
    if (page.type === "cover") {
      return el(
        "div",
        { class: "book__face book__face--front book__face--cover" },
        el("span", { class: "book__face__kicker" }, "The SAC Chronicle · Extra"),
        el("span", { class: "book__face__title" }, "The Campus in Print"),
        el("span", { class: "book__face__sub" }, "The campus, plate by plate · IISER Kolkata"),
        el("span", { class: "book__face__hint" }, "Flip through →")
      );
    }
    if (page.type === "back") {
      return el(
        "div",
        { class: "book__face book__face--front book__face--back" },
        el("span", { class: "book__face__kicker" }, "End of the album"),
        el(
          "span",
          { class: "book__face__sub" },
          "The whole campus is filed on the Campus Life page →"
        ),
        el("a", { class: "book__face__link", href: "pages/campus-life.html" }, "Open the archive")
      );
    }
    const p = page.photo;
    return el(
      "div",
      { class: "book__face book__face--front book__face--spread" },
      el(
        "figure",
        { class: "book__photo" },
        el(
          "button",
          {
            class: "book__photo-btn",
            type: "button",
            "data-viewer": "campus-book",
            "data-context": "The Campus in Print",
            "data-title": label(p),
            // Buttons carry no href, so name the full-size file explicitly —
            // the img inside serves the 480px grid thumbnail.
            "data-full": assetUrl(p.public_url),
            "aria-label": `View ${label(p)} full-screen`,
          },
          el("img", {
            src: assetUrl(gridSrc(p)),
            alt: altTextFor(p, "Campus photograph"),
            loading: "eager",
            decoding: "async",
            width: p.width || 1200,
            height: p.height || 900,
          })
        ),
        el("figcaption", { class: "book__photo__cap" }, label(p))
      )
    );
  }

  function backFace(page) {
    if (page.type === "photo") {
      // The reverse side of a photo leaf: a small plate thumbnail + caption,
      // so the left pile never reads as a blank page mid-flip or at rest.
      const p = page.photo;
      return el(
        "div",
        { class: "book__face book__face--backface", "aria-hidden": "true" },
        el("img", {
          class: "book__plate-thumb",
          src: assetUrl(gridSrc(p)),
          alt: "",
          loading: "lazy",
          decoding: "async",
          width: 200,
          height: 150,
        }),
        el(
          "span",
          { class: "book__plate-no" },
          `Plate ${page.plate} · ${p.category_label || "Campus"}`
        ),
        el("span", { class: "book__plate-rule", "aria-hidden": "true" }, "✦ ✦ ✦")
      );
    }
    const caption = "The Campus in Print";
    return el(
      "div",
      { class: "book__face book__face--backface", "aria-hidden": "true" },
      el("span", { class: "book__plate-no" }, caption),
      el("span", { class: "book__plate-rule", "aria-hidden": "true" }, "✦ ✦ ✦")
    );
  }

  // Build leaves: later leaves stack above; paint() fixes z-order per state.
  const leaves = pages.map((sp, i) => {
    const leaf = el(
      "div",
      { class: "book__leaf", "data-leaf": String(i) },
      frontFace(sp),
      backFace(sp)
    );
    return leaf;
  });

  function paint() {
    leaves.forEach((leaf, i) => {
      const flipped = i < current;
      leaf.classList.toggle("is-flipped", flipped);
      leaf.classList.toggle("is-active", i === current);
      // Right pile: the current (facing) leaf sits on top.
      // Left pile: later flips sit on top of earlier ones.
      leaf.style.zIndex = String(flipped ? 10 + i : 100 - i);
      // Only the facing page is interactive.
      const btn = leaf.querySelector(".book__photo-btn, .book__face__link");
      if (btn) btn.tabIndex = i === current ? 0 : -1;
      leaf.setAttribute("aria-hidden", i === current ? "false" : "true");
    });
    counter.textContent = `${Math.min(current, total - 1) + 1} / ${total}`;
    const page = pages[Math.min(current, total - 1)];
    counter.setAttribute(
      "aria-label",
      `Page ${Math.min(current, total - 1) + 1} of ${total}${
        page.type === "photo" ? `, ${label(page.photo)}` : ""
      }`
    );
  }

  function flipNext() {
    if (current < total - 1) {
      current++;
    } else {
      // Close the book: snap every leaf back without animating.
      const stage = mount.querySelector(".book__stage");
      stage.classList.add("no-anim");
      current = 0;
      paint();
      void stage.offsetWidth; // force reflow so the snap applies instantly
      stage.classList.remove("no-anim");
    }
    paint();
  }
  function flipPrev() {
    if (current > 0) current--;
    else current = total - 1;
    paint();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  /** The auto-flip runs only while the book is on screen, the tab is
   *  visible, and nobody is reaching for it — a timer turning pages in a
   *  hidden tab or three screens away is pure wasted work. Every manual
   *  action calls restart(), which also gives the reader a full interval
   *  before the book moves again. */
  function restart() {
    stop();
    if (auto && inView && !document.hidden && !paused) {
      timer = setInterval(flipNext, AUTO_FLIP_MS);
    }
  }

  flipL.addEventListener("click", () => {
    flipPrev();
    restart();
  });
  flipR.addEventListener("click", () => {
    flipNext();
    restart();
  });
  playBtn.addEventListener("click", () => {
    auto = !auto;
    playBtn.textContent = auto ? "❙❙" : "▶";
    playBtn.setAttribute("aria-label", auto ? "Pause the book" : "Play the book");
    restart();
  });

  mount.replaceChildren(
    el(
      "div",
      {
        class: "book",
        role: "region",
        "aria-label": "The Campus in Print — a flipping book of campus photographs",
      },
      el(
        "div",
        { class: "book__viewport", "aria-hidden": "false" },
        el(
          "div",
          { class: "book__stage" },
          el("div", { class: "book__base", "aria-hidden": "true" }),
          el("div", { class: "book__spine", "aria-hidden": "true" }),
          ...leaves
        )
      ),
      el("div", { class: "book__tools" }, flipL, counter, flipR, playBtn)
    )
  );

  const keyHandler = (e) => {
    if (!mount.isConnected) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    // The lightbox owns the arrow keys while it is up — clicking a plate
    // opens it over this very book, and both would otherwise page at once.
    if (document.body.classList.contains("viewer-open")) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowRight") {
      flipNext();
      restart();
    } else if (e.key === "ArrowLeft") {
      flipPrev();
      restart();
    }
  };
  document.addEventListener("keydown", keyHandler);

  // Swipe the spread to turn pages — the ‹ › buttons are a 42px target at
  // the bottom of a phone screen, the page itself is the whole thumb reach.
  const stage = mount.querySelector(".book__stage");
  if (stage) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    stage.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
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
        if (Math.abs(t.clientY - startY) > 50 || Math.abs(dx) < 45) return;
        dx < 0 ? flipNext() : flipPrev();
        restart();
      },
      { passive: true }
    );
  }

  // Reader interaction pauses the auto-flip: hover, focus, or touch on the
  // spread means they are looking at a page, not waiting for the next one.
  mount.addEventListener("pointerenter", () => {
    paused = true;
    restart();
  });
  mount.addEventListener("pointerleave", () => {
    paused = false;
    restart();
  });
  mount.addEventListener("focusin", () => {
    paused = true;
    restart();
  });
  mount.addEventListener("focusout", () => {
    paused = false;
    restart();
  });

  // Auto-flip only while the spread is actually on screen.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
          restart();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(mount);
  }

  // …and only while the tab is in the foreground.
  document.addEventListener("visibilitychange", restart);

  paint();
  restart();
}
