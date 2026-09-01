/**
 * components/campus-book.js — The Campus in Print, as a flipping book.
 *
 * A real 3D book on the front page: a cover and page spreads on a spine;
 * pages physically flip (rotateY around the spine) revealing 2 photographs
 * per spread plus an inside-cover. Click a page corner or use the arrows /
 * keyboard to flip. The spread sits in its own bounded stage — never
 * overlapping surrounding text.
 */
import { el, assetUrl } from "../utils/dom.js";
import { captionFor, altTextFor } from "../utils/caption.js";

const SPREADS = 6; // cover + 5 photo spreads (12 photos + back cover)
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
  return picked;
}

export function initCampusBook(assets) {
  const mount = document.getElementById("campus-book");
  if (!mount || mount.dataset.bound === "true") return;
  const photos = pickPhotos(assets, 12);
  if (photos.length < 4) return;
  mount.dataset.bound = "true";

  // Build spreads: [cover, 2-photo spreads..., back cover]
  const label = (a) => captionFor(a) || "Campus photograph";
  const spreads = [];
  spreads.push({ type: "cover" });
  for (let i = 0; i < photos.length; i += 2) {
    spreads.push({ type: "spread", photos: photos.slice(i, i + 2) });
  }
  spreads.push({ type: "back" });
  const total = spreads.length;

  let current = 0; // spread index; flipping advances one leaf
  let auto = !isReducedMotion();
  let timer = null;

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

  // Build leaves: each spread is a leaf stacked with 3D translateZ;
  // flip = rotateY(-180deg) once we pass it, with a spine gradient.
  const leaves = spreads.map((sp, i) => {
    const leaf = el(
      "div",
      { class: "book__leaf", "data-leaf": String(i) },
      buildFace(sp, i, i === 0)
    );
    return leaf;
  });

  function buildFace(sp, i, isCover) {
    if (sp.type === "cover") {
      return el(
        "div",
        { class: "book__face book__face--cover" },
        el("span", { class: "book__face__kicker" }, "The SAC Chronicle · Extra"),
        el("span", { class: "book__face__title" }, "The Campus in Print"),
        el("span", { class: "book__face__sub" }, `${photos.length} photographs · IISER Kolkata`),
        el("span", { class: "book__face__hint" }, "Flip through →")
      );
    }
    if (sp.type === "back") {
      return el(
        "div",
        { class: "book__face book__face--back" },
        el("span", { class: "book__face__kicker" }, "End of the album"),
        el("span", { class: "book__face__sub" }, "Browse all 269 prints on the Campus Life page →"),
        el("a", { class: "book__face__link", href: "pages/campus-life.html" }, "Open the archive")
      );
    }
    return el(
      "div",
      { class: "book__face book__face--spread" },
      ...sp.photos.map((p, j) =>
        el(
          "figure",
          { class: "book__photo" },
          el("img", {
            src: assetUrl(p.public_url),
            alt: altTextFor(p, "Campus photograph"),
            loading: i <= 2 && j === 0 ? "eager" : "lazy",
            decoding: "async",
            width: p.width || 1200,
            height: p.height || 900,
          }),
          el("figcaption", { class: "book__photo__cap" }, label(p))
        )
      )
    );
  }

  function paint() {
    leaves.forEach((leaf, i) => {
      // leaves before `current` have flipped past; the current one faces us
      const flipped = i < current;
      leaf.classList.toggle("is-flipped", flipped);
      leaf.classList.toggle("is-active", i === current);
    });
    counter.textContent = `${Math.min(current, total - 1) + 1} / ${total}`;
    const spread = spreads[Math.min(current, total - 1)];
    const photoCount = spread.type === "spread" ? spread.photos.length : 0;
    counter.setAttribute(
      "aria-label",
      `Page ${Math.min(current, total - 1) + 1} of ${total}${photoCount ? `, ${photoCount} photographs` : ""}`
    );
  }

  function flipNext() {
    if (current < total - 1) {
      current++;
    } else {
      current = 0; // wrap to cover
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
  function restart() {
    stop();
    if (auto) timer = setInterval(flipNext, AUTO_FLIP_MS);
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
        { class: "book__stage" },
        el("div", { class: "book__base", "aria-hidden": "true" }),
        el("div", { class: "book__spine", "aria-hidden": "true" }),
        ...leaves
      ),
      el("div", { class: "book__tools" }, flipL, counter, flipR, playBtn)
    )
  );

  const keyHandler = (e) => {
    if (!mount.isConnected) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    if (e.key === "ArrowRight") {
      flipNext();
      restart();
    } else if (e.key === "ArrowLeft") {
      flipPrev();
      restart();
    }
  };
  document.addEventListener("keydown", keyHandler);

  paint();
  restart();
}
