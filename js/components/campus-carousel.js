/**
 * components/campus-carousel.js — the Campus in Print.
 *
 * A 3D paper stack on the front page: the centre photograph faces the reader,
 * neighbours sit angled in perspective with torn paper edges and tape framing.
 * Tools: arrows, dots, counter, pause/play, keyboard arrows, click opens the
 * shared viewer lightbox. Autoplay (6s) is disabled under reduced-motion.
 */
import { el, assetUrl } from "../utils/dom.js";
import { captionFor, altTextFor } from "../utils/caption.js";

const AUTOPLAY_MS = 6000;
const SLIDE_PICKS = 12;

function isReducedMotion() {
  return (
    document.documentElement.getAttribute("data-reduce-motion") === "on" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Pick the most striking landscape campus shots for the stack. */
function pickSlides(assets) {
  const campus = assets.filter(
    (a) =>
      a.club === "Campus_Archive" &&
      a.file_type === "image" &&
      (Number(a.aspect_ratio) || 1) >= 1.3
  );
  // rotate the starting offset by day so the front page feels alive
  const dayOffset = new Date().getDate() % Math.max(1, campus.length);
  const ordered = [...campus.slice(dayOffset), ...campus.slice(0, dayOffset)];
  // interleave categories round-robin for variety
  const byCat = new Map();
  for (const a of ordered) {
    const c = a.category || "Campus";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(a);
  }
  const cats = Array.from(byCat.values());
  const picked = [];
  while (picked.length < SLIDE_PICKS && cats.some((c) => c.length)) {
    for (const c of cats) {
      if (c.length && picked.length < SLIDE_PICKS) picked.push(c.shift());
    }
  }
  return picked;
}

export function initCampusCarousel(assets) {
  const mount = document.getElementById("campus-carousel");
  if (!mount || mount.dataset.bound === "true") return;
  const slides = pickSlides(assets);
  if (slides.length < 3) return;
  mount.dataset.bound = "true";

  let index = 0;
  let playing = !isReducedMotion();
  let timer = null;

  const labelFor = (a) => captionFor(a) || "Campus photograph";

  const cards = slides.map((a, i) =>
    el(
      "button",
      {
        class: "campus-card",
        type: "button",
        "data-idx": String(i),
        "aria-label": `View ${labelFor(a)}`,
        "data-viewer": "campus-3d",
        "data-title": labelFor(a),
        "data-desc":
          a.description &&
          !/extracted from a source document/i.test(a.description) &&
          !/^club photograph\s*—/i.test(a.description)
            ? a.description
            : "",
        "data-context": "The Campus in Print · " + (a.category_label || "Campus"),
      },
      el("span", { class: "campus-card__tape", "aria-hidden": "true" }),
      el("img", {
        src: assetUrl(a.public_url),
        alt: altTextFor(a, "Campus photograph"),
        loading: i < 3 ? "eager" : "lazy",
        decoding: "async",
        width: a.width || 1600,
        height: a.height || 1000,
      }),
      el("span", { class: "campus-card__label" }, labelFor(a))
    )
  );

  const counter = el("span", { class: "campus-3d__counter", "aria-live": "polite" });
  const dots = el(
    "div",
    { class: "campus-3d__dots", role: "tablist", "aria-label": "Slide position" },
    ...slides.map((_, i) =>
      el("button", {
        class: "campus-3d__dot",
        type: "button",
        role: "tab",
        "aria-label": `Go to slide ${i + 1}`,
        "data-dot": String(i),
        onclick: () => {
          go(i);
          restart();
        },
      })
    )
  );
  const playBtn = el(
    "button",
    { class: "campus-3d__play", type: "button", "aria-label": "Pause slideshow" },
    playing ? "❙❙" : "▶"
  );
  const prevBtn = el(
    "button",
    { class: "campus-3d__nav campus-3d__nav--prev", type: "button", "aria-label": "Previous photograph" },
    "‹"
  );
  const nextBtn = el(
    "button",
    { class: "campus-3d__nav campus-3d__nav--next", type: "button", "aria-label": "Next photograph" },
    "›"
  );

  function paint() {
    const n = slides.length;
    cards.forEach((card, i) => {
      let rel = i - index;
      if (rel > n / 2) rel -= n;
      if (rel < -n / 2) rel += n;
      const abs = Math.abs(rel);
      card.classList.toggle("is-active", rel === 0);
      card.classList.toggle("is-near", abs === 1);
      card.classList.toggle("is-far", abs > 1);
      card.style.setProperty("--rel", String(rel));
      card.tabIndex = rel === 0 ? 0 : -1;
      card.setAttribute("aria-hidden", abs > 2 ? "true" : "false");
    });
    counter.textContent = `${index + 1} / ${n}`;
    mount.querySelectorAll(".campus-3d__dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === index);
      d.setAttribute("aria-selected", i === index ? "true" : "false");
    });
  }

  function go(i) {
    index = (i + slides.length) % slides.length;
    paint();
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  function restart() {
    stop();
    if (playing) timer = setInterval(next, AUTOPLAY_MS);
  }

  prevBtn.addEventListener("click", () => {
    prev();
    restart();
  });
  nextBtn.addEventListener("click", () => {
    next();
    restart();
  });
  playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "❙❙" : "▶";
    playBtn.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow");
    restart();
  });

  // side cards jump to position; the active card opens the shared lightbox
  // (viewer is globally wired on [data-viewer] clicks)
  cards.forEach((card) =>
    card.addEventListener("click", () => {
      if (card.classList.contains("is-active")) return;
      go(Number(card.dataset.idx));
      restart();
    })
  );

  mount.replaceChildren(
    el(
      "div",
      { class: "campus-3d" },
      prevBtn,
      el("div", { class: "campus-3d__stage" }, ...cards),
      nextBtn,
      el(
        "div",
        { class: "campus-3d__tools" },
        counter,
        dots,
        playBtn
      )
    )
  );

  const keyHandler = (e) => {
    if (!mount.isConnected) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    if (e.key === "ArrowRight") {
      next();
      restart();
    } else if (e.key === "ArrowLeft") {
      prev();
      restart();
    }
  };
  document.addEventListener("keydown", keyHandler);

  paint();
  restart();
}
