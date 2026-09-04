/**
 * Home page editorial composition.
 *
 * The front page is intentionally a magazine cover, not a second directory:
 * the complete SAC index lives on Clubs, while this page carries the lead
 * story, a living picture desk, campus statistics, and current notices.
 */
import { el, assetUrl, showError } from "../utils/dom.js";
import { loadAssetsMap } from "../data.js";
import { initScrollSounds } from "../utils/calligraphy.js";
import { fetchLatestVideos } from "../utils/youtube.js";
import { fetchUpcomingEvents } from "../utils/calendar.js";
import { measureText } from "../utils/text-measure.js";
import { captionFor, altTextFor } from "../utils/caption.js";
import { gridSrc } from "../utils/thumb.js";

const EXCERPT_MAX = 240;
const EXCERPT_MIN = 30;

function isHeadingLike(line) {
  if (!line) return true;
  if (line.startsWith("#")) return true;
  if (line.startsWith("!")) return true;
  if (line.startsWith("|")) return true;
  if (line.startsWith("---")) return true;
  if (line.startsWith("```")) return true;
  if (line.length < 40 && /^[A-Z0-9 ,.&'()\-:]+$/.test(line)) return true;
  if (/^[\d\W]+$/.test(line)) return true;
  return false;
}

function trimToSentence(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > EXCERPT_MIN) return cut.slice(0, lastDot + 1).trim();
  return cut.replace(/\s+\S*$/, "").trim() + "…";
}

/** Kept as a small public utility for editorial tests and future cards. */
export function extractExcerpt(markdown) {
  if (!markdown) return "";
  for (const raw of String(markdown).split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (isHeadingLike(line) || line.length < EXCERPT_MIN) continue;
    return trimToSentence(line, EXCERPT_MAX);
  }
  return "";
}

function editorialScore(asset) {
  const ratio = Number(asset.aspect_ratio) || 1;
  let score = 0;
  if (asset.is_event || asset.is_iicm || asset.role === "event") score += 5;
  if (ratio >= 1.35) score += 4;
  if (ratio >= 1.8) score += 2;
  if (!asset.is_extracted_from_doc) score += 3;
  if (!asset.is_logo && !asset.is_ob_portrait) score += 2;
  return score;
}

function selectEditorialImages(assets, limit = 6) {
  const candidates = assets
    .filter(
      (asset) =>
        asset.file_type === "image" &&
        !asset.is_logo &&
        !asset.is_ob_portrait &&
        !asset.is_extracted_from_doc
    )
    .sort((a, b) => editorialScore(b) - editorialScore(a));
  const chosen = [];
  const clubs = new Set();

  for (const asset of candidates) {
    if (clubs.has(asset.club)) continue;
    chosen.push(asset);
    clubs.add(asset.club);
    if (chosen.length === limit) return chosen;
  }

  for (const asset of candidates) {
    if (chosen.includes(asset)) continue;
    chosen.push(asset);
    if (chosen.length === limit) break;
  }
  return chosen;
}

function renderStats(assets, mountId = "home-stats") {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const stats = [
    ["clubs", new Set(assets.map((asset) => asset.club)).size, "indexed groups"],
    ["images", assets.filter((asset) => asset.file_type === "image").length, "photographs"],
    ["documents", assets.filter((asset) => asset.file_type === "markdown").length, "records"],
    [
      "media",
      assets.filter((asset) => asset.file_type === "video" || asset.file_type === "audio").length,
      "audio / video files",
    ],
  ];
  mount.replaceChildren(
    ...stats.map(([id, value, label]) =>
      el(
        "div",
        { class: "home-stat", "data-stat": id },
        el("strong", {}, value.toLocaleString("en-IN")),
        el("span", {}, label)
      )
    )
  );
}

function renderCampusGallery(assets) {
  const mount = document.getElementById("campus-gallery-grid");
  if (!mount) return;
  const images = selectEditorialImages(assets);
  if (!images.length) {
    mount.replaceChildren(
      el("p", { class: "muted" }, "The picture desk is preparing its first edition.")
    );
    return;
  }

  mount.replaceChildren(
    ...images.map((asset, index) => {
      const title = captionFor(asset);
      const context = asset.club_name || "SAC archive";
      return el(
        "figure",
        { class: `campus-gallery__item campus-gallery__item--${index + 1}` },
        el(
          "a",
          {
            href: assetUrl(asset.public_url),
            "data-viewer": "home-campus",
            "data-title": title,
            "data-desc": asset.description || context,
            "data-context": context,
            title,
          },
          el("img", {
            src: assetUrl(gridSrc(asset)),
            alt: altTextFor(asset, title),
            loading: index < 2 ? "eager" : "lazy",
            decoding: "async",
            width: asset.width || undefined,
            height: asset.height || undefined,
          })
        ),
        el("figcaption", {}, el("strong", {}, title), el("span", {}, context))
      );
    })
  );
}

export async function adjustLeadLayout() {
  const body = document.querySelector(".lead-article__body");
  if (!body || window.innerWidth <= 720) return;
  const text = body.innerText;
  if (!text) return;

  const computed = getComputedStyle(body);
  const lineHeight = Number.parseFloat(computed.lineHeight) || 24;
  const fontSize = Number.parseFloat(computed.fontSize) || 16;
  const maxWidth = Math.max(280, body.clientWidth / 2 - 16);
  try {
    const metrics = measureText(text, `${fontSize}px ${computed.fontFamily}`, maxWidth, lineHeight);
    body.style.columnCount = metrics.lineCount < 8 || metrics.height < lineHeight * 7 ? "1" : "";
  } catch {
    body.style.columnCount = "";
  }
}

function equalizeGalleryCaptions() {
  const caps = Array.from(document.querySelectorAll(".campus-gallery__item figcaption span"));
  if (!caps.length) return;
  // Use Pretext to measure each caption's height at its rendered width
  const widths = caps.map((c) => c.clientWidth || 220);
  const computed = getComputedStyle(caps[0]);
  const font = `${computed.fontSize} ${computed.fontFamily}`;
  const lineHeight = Number.parseFloat(computed.lineHeight) || 18;
  try {
    const heights = widths.map(
      (w, i) => measureText(caps[i].textContent || "", font, w, lineHeight).height
    );
    const max = Math.max(...heights, 0);
    caps.forEach((c) => {
      c.style.minHeight = max ? `${Math.ceil(max)}px` : "";
    });
  } catch {}
}

/* Seasonal hero rotation — deterministic by month so the front page
 * changes with the academic year while staying cache-friendly per SW.
 * Photos contributed by Abhinav Dhingra (TheHumanHunter). */
const HERO_POOL = [
  {
    src: "assets/hero.webp",
    caption:
      "A farewell gathering on the SAC calendar — one of 1,181 photographs in the Chronicle archive. Every club, every season, printed in code.",
  },
  {
    src: "assets/hero-auditorium.webp",
    caption:
      "The campus auditorium — where IICM contingents, productions, and convocations take the stage.",
  },
  {
    src: "assets/hero-people.webp",
    caption:
      "The people of SAC — thirty-two clubs' worth of organisers, performers, athletes, and committees.",
  },
];

function rotateHero() {
  // The inline <script> in index.html already picked this month's hero
  // pre-paint (kills the swap-flash). This confirms the choice and only
  // rewrites when a stale paint survived (e.g. noscript fallback restored).
  const img = document.getElementById("heroImg");
  const cap = document.getElementById("heroCaptionText");
  if (!img || !cap) return;
  const pick = HERO_POOL[new Date().getMonth() % HERO_POOL.length];
  if (img.currentSrc && !img.currentSrc.includes(pick.src)) return; // already right
  img.src = pick.src;
  cap.textContent = pick.caption;
}

export async function renderArchiveStats(mountId) {
  try {
    const assets = await loadAssetsMap();
    renderStats(assets, mountId);
  } catch {
    /* stats are decorative — silent */
  }
}

export async function initHome() {
  let assets;
  try {
    assets = await loadAssetsMap();
  } catch {
    showError(
      document.getElementById("campus-gallery") || document.querySelector("main"),
      "Could not load the front page",
      "The Chronicle archive failed to load. Check your connection and try again."
    );
    return;
  }

  rotateHero();
  renderStats(assets);
  const { initCampusBook } = await import("../components/campus-book.js");
  initCampusBook(assets);

  // The Campus Board: pinned Campus_Places postcards (map-desk wall)
  const { initCampusBoard } = await import("../components/campus-board.js");
  initCampusBoard(assets);

  // Warm the remaining hero variants after first paint (rotation day swap)
  window.addEventListener(
    "load",
    () => {
      for (const h of HERO_POOL) {
        const warm = new Image();
        warm.decoding = "async";
        warm.src = h.src;
      }
    },
    { once: true }
  );
  renderCampusGallery(assets);

  let loaded = false;
  const onReadyForMeasure = () => {
    if (loaded) return;
    loaded = true;
    adjustLeadLayout();
    equalizeGalleryCaptions();
  };
  window.addEventListener("load", onReadyForMeasure);
  document.fonts?.ready?.then(onReadyForMeasure);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(() => {
      adjustLeadLayout();
      equalizeGalleryCaptions();
    });
  });

  // Also re-equalize when sidebar collapse changes width
  const ro = window.ResizeObserver
    ? new ResizeObserver(() => {
        adjustLeadLayout();
        equalizeGalleryCaptions();
      })
    : null;
  const main = document.querySelector("main");
  if (ro && main) ro.observe(main);

  loadYouTubeSection();
  loadCalendarSection();
  initScrollSounds();
}

async function loadYouTubeSection() {
  const section = document.getElementById("youtube-section");
  const grid = document.getElementById("youtube-grid");
  if (!section || !grid) return;

  const videos = await fetchLatestVideos();
  if (!videos.length) return;
  section.style.display = "";
  grid.classList.add("notebook-grid");
  grid.classList.toggle("is-sparse", videos.length < 3);

  videos.forEach((video, index) => {
    const title = video.title?.trim() || "SAC video archive";
    const published = video.publishedAt ? new Date(video.publishedAt) : null;
    const publishedLabel =
      published && !Number.isNaN(published.getTime())
        ? published.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "SAC archive";
    const notes = [
      "pressed play while the campus hummed outside",
      "the reel jumped to life — grainy, alive",
      "noted: this one stays with you",
    ];
    grid.append(
      el(
        "li",
        { class: "notebook-card", style: `--card-rotate: ${((index % 3) - 1) * 0.7}deg` },
        el("div", { class: "notebook-card__tape notebook-card__tape--tl" }),
        el("div", { class: "notebook-card__tape notebook-card__tape--tr" }),
        el(
          "div",
          { class: "notebook-card__media" },
          el("iframe", {
            src: `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1`,
            title,
            allow: "fullscreen; encrypted-media; picture-in-picture;",
            loading: "lazy",
            referrerpolicy: "strict-origin-when-cross-origin",
          })
        ),
        el("p", { class: "notebook-card__caption", title }, `“ ${title} ”`),
        el("p", { class: "notebook-card__notes" }, notes[index % notes.length]),
        el(
          "p",
          { class: "notebook-card__meta" },
          publishedLabel,
          " · ",
          el("a", { href: video.url, target: "_blank", rel: "noopener" }, "watch on YouTube →")
        )
      )
    );
  });
}

export async function loadCalendarSection() {
  const section = document.getElementById("calendar-section");
  const grid = document.getElementById("calendar-grid");
  if (!section || !grid) return;

  const events = await fetchUpcomingEvents().catch((err) => {
    // Free/busy-only sharing: the API returns times but no titles.
    // Show actionable guidance instead of an empty grid.
    if (err && err.code === "FREEBUSY_ONLY") {
      section.style.display = "";
      grid.append(
        el(
          "li",
          { class: "pinned-card pinned-card--event" },
          el(
            "div",
            { class: "pinned-card__body" },
            el("p", { class: "pinned-card__title" }, "Calendar titles hidden"),
            el(
              "p",
              { class: "pinned-card__meta" },
              "This calendar is shared as free/busy only, so event names can't be shown. " +
                "SAC team: set the calendar sharing to 'See all event details'."
            )
          )
        )
      );
      return null;
    }
    return [];
  });
  if (events === null) return; // guidance card already rendered
  section.style.display = "";
  grid.classList.toggle("is-sparse", events.length < 3);
  if (!events.length) {
    grid.append(
      el(
        "li",
        { class: "pinned-card pinned-card--event" },
        el(
          "div",
          { class: "pinned-card__body" },
          el("p", { class: "pinned-card__title" }, "No upcoming events"),
          el("p", { class: "pinned-card__meta" }, "Check back soon for the next campus notice.")
        )
      )
    );
    return;
  }

  events.forEach((event, index) => {
    const peopleLabel = event.people?.length
      ? `With: ${event.people.slice(0, 3).join(", ")}${event.people.length > 3 ? " +" + (event.people.length - 3) + " more" : ""}`
      : event.organizer
        ? `Organiser: ${event.organizer}`
        : "";
    const timeLabel = event.dateEndLabel
      ? `${event.dateLabel} – ${event.dateEndLabel}`
      : event.dateLabel;
    const desc = event.description
      ? event.description.slice(0, 240) + (event.description.length > 240 ? "…" : "")
      : "";

    grid.append(
      el(
        "li",
        {
          class: "pinned-card pinned-card--event",
          style: `--tilt: ${((index % 3) - 1) * 0.7}deg`,
        },
        el(
          "div",
          { class: "pinned-card__body" },
          el("span", { class: "pinned-card__date" }, timeLabel),
          el("p", { class: "pinned-card__title", title: event.title }, event.title),
          event.location
            ? el("p", { class: "pinned-card__location" }, `📍 ${event.location}`)
            : null,
          peopleLabel
            ? el("p", { class: "pinned-card__meta pinned-card__people" }, peopleLabel)
            : null,
          desc ? el("p", { class: "pinned-card__meta" }, desc) : null,
          event.link
            ? el(
                "a",
                { class: "pinned-card__link", href: event.link, target: "_blank", rel: "noopener" },
                "Open event →"
              )
            : null
        )
      )
    );
  });
}
