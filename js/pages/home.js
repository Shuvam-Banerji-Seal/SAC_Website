/**
 * pages/home.js — newspaper-themed landing-page initialiser.
 *
 * Layout produced by this module
 * ------------------------------
 *   <section class="body-section" id="body-{id}">
 *     <div class="body-banner">…kicker, title, tagline, ornament…</div>
 *     <ul class="paper-card-grid">
 *       <li><a class="paper-card">…logo, name, excerpt, cta…</a></li>
 *       …
 *     </ul>
 *   </section>
 *
 * Data flow
 * ---------
 *   1. Load the canonical assets_map.jsonl via loadAssetsMap().
 *   2. Index by club (indexByClub). Each club record carries its logo
 *      and the canonical `is_markdown_content` markdown file (club
 *      introduction document, parsed from DOCX/PDF by the assets
 *      pipeline).
 *   3. For every club, fetch the markdown and pull the first
 *      descriptive paragraph as the card excerpt. Falls back to a
 *      graceful placeholder if the fetch fails.
 *   4. Bucket clubs into the 4 SAC bodies (academics / hostel /
 *      sports / cultural) and render each into its mount point.
 *   5. Wire an IntersectionObserver to add `.is-visible` to each
 *      body section as it scrolls into view — that's the
 *      "paper-folding" reveal (CSS in pages/home.css).
 */
import { el, pageUrl } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";
import { revealText, initScrollSounds } from "../utils/calligraphy.js";

/* -------------------------------------------------------------------------
 * Club slug → individual page URL mapping
 * ------------------------------------------------------------------------- */

function getClubPageUrl(slug) {
  const urlMap = {
    "AARSHI_-_Drama_Club": "pages/aarshi.html",
    Arts_Club_of_IISER_Kolkata: "pages/arts.html",
    Campus_Radio_IISER_KOLKATA: "pages/radio.html",
    "IKQC_-_Quiz_Club_of_IISER_Kolkata": "pages/ikqc.html",
    Literary_Club_of_IISER_Kolkata: "pages/literary.html",
    Movie_Club_of_IISER_K: "pages/movie.html",
    Music_Club_of_IISER_K: "pages/music.html",
    Nature_Club_Of_IISER_Kolkata: "pages/nature.html",
    "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": "pages/nrutya.html",
    "PIXEL-Photography_Club": "pages/pixel.html",
    SAC_Academics: "pages/academics.html",
    SAC_Hostel: "pages/hostel.html",
  };
  return urlMap[slug] || "pages/clubs.html";
}

/* -------------------------------------------------------------------------
 * Bodies — the 4 sections of the SAC, in page order.
 *
 * BODY_INFO carries the editorial copy for each section banner.
 * The bodyId is the same as the [data-body-mount] attribute on the
 * placeholder div in index.html, so render is a single .replaceWith().
 * ------------------------------------------------------------------------- */

const BODY_INFO = {
  council: {
    kicker: "Preface",
    title: "SAC Council",
    tagline:
      "The elected student body — General Secretary, Joint Secretary, and the officers who coordinate the year's calendar across every club and committee.",
    ornament: "— ✦ ✦ ✦ —",
  },
  academics: {
    kicker: "Section I",
    title: "SAC Academics",
    tagline:
      "Where scholarly life meets the wider campus — academic initiatives, guest lectures, industry bridges, and the pursuit of ideas beyond the classroom.",
    ornament: "— ✦ ✦ ✦ —",
  },
  hostel: {
    kicker: "Section II",
    title: "SAC Hostel Committee",
    tagline:
      "The standing committee for residence life — community events, student welfare, and the everyday essentials that make campus a home.",
    ornament: "— ✦ ✦ ✦ —",
  },
  sports: {
    kicker: "Section III",
    title: "Sports",
    tagline:
      "The playing fields have their place in the Chronicle too — this section is reserved for the games societies and will carry their records as soon as they arrive.",
    ornament: "— ✦ ✦ ✦ —",
  },
  cultural: {
    kicker: "Section IV",
    title: "Cultural Clubs",
    tagline:
      "Ten societies spanning drama, music, dance, film, literature, visual art, radio, and the quizzing circuit — the creative pulse of the institute, gathered in one section.",
    ornament: "— ✦ ✦ ✦ —",
  },
};

/* The order bodies are rendered on the page. */
const BODY_ORDER = ["council", "academics", "hostel", "sports", "cultural"];

/* -------------------------------------------------------------------------
 * Body assignment
 *
 * The JSONL carries clubs grouped by their SAC body. Today we have:
 *   - SAC Academics, SAC Hostel Committee → academics, hostel
 *   - 10 cultural clubs → cultural
 *   - Sports clubs → sports (empty today, ready for when data arrives)
 *   - SAC Council (General Secretary, etc.) → council
 *
 * The detection is flexible: it checks for known club names AND
 * pattern-matches on club names that contain "sports", "council",
 * "secretary", etc. so new clubs are automatically bucketed correctly.
 * ------------------------------------------------------------------------- */

function assignBody(clubName) {
  const name = clubName.toLowerCase();
  // SAC Council (general secretary, joint secretary, etc.)
  if (
    name === "sac council" ||
    name.includes("general secretary") ||
    name.includes("sac council")
  ) {
    return "council";
  }
  // SAC Academics
  if (clubName === "SAC Academics" || name.includes("academics") || name.includes("placement")) {
    return "academics";
  }
  // SAC Hostel Committee
  if (clubName === "SAC Hostel Committee" || name.includes("hostel") || name.includes("shc")) {
    return "hostel";
  }
  // Sports clubs
  if (
    name.includes("sports") ||
    name.includes("cricket") ||
    name.includes("football") ||
    name.includes("badminton") ||
    name.includes("athletics") ||
    name.includes("table tennis") ||
    name.includes("basketball") ||
    name.includes("volleyball") ||
    name.includes("chess")
  ) {
    return "sports";
  }
  // Default: cultural clubs
  return "cultural";
}

/* -------------------------------------------------------------------------
 * Excerpt extraction
 *
 * The processed markdown files are messy: H1/H2 headings, image refs,
 * table rows, mixed whitespace, ALL-CAPS section labels like
 * "INTRODUCTION :". We want the first decent prose paragraph (30–240
 * chars), trimmed to a sentence boundary when possible.
 * ------------------------------------------------------------------------- */

const EXCERPT_MAX = 240;
const EXCERPT_MIN = 30;

function isHeadingLike(line) {
  if (!line) return true;
  if (line.startsWith("#")) return true; // md heading
  if (line.startsWith("!")) return true; // md image
  if (line.startsWith("|")) return true; // md table
  if (line.startsWith("---")) return true; // md hr
  if (line.startsWith("```")) return true; // md code fence
  // ALL-CAPS section labels common to club docs (e.g. "INTRODUCTION :")
  if (line.length < 40 && /^[A-Z0-9 ,.&'()\-:]+$/.test(line)) return true;
  // Bare numeric lists / phone numbers
  if (/^[\d\W]+$/.test(line)) return true;
  return false;
}

function trimToSentence(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > EXCERPT_MIN) return cut.slice(0, lastDot + 1).trim();
  // No sentence boundary — trim at last word and add an ellipsis
  return cut.replace(/\s+\S*$/, "").trim() + "…";
}

export function extractExcerpt(markdown) {
  if (!markdown) return "";
  const lines = String(markdown).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (isHeadingLike(line)) continue;
    if (line.length < EXCERPT_MIN) continue;
    return trimToSentence(line, EXCERPT_MAX);
  }
  return "";
}

async function fetchExcerpt(markdownEntry) {
  if (!markdownEntry || !markdownEntry.path) return "";
  // entry.path is relative to public/assets/processed/. pageUrl()
  // adapts the prefix for pages/* subdirs the same way data.js does.
  const url = pageUrl("public/assets/processed/" + markdownEntry.path);
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    return extractExcerpt(text);
  } catch (err) {
    console.warn("[home] excerpt fetch failed for", markdownEntry.path, err);
    return "";
  }
}

/* -------------------------------------------------------------------------
 * Card / section renderers
 * ------------------------------------------------------------------------- */

function renderPaperCard(club) {
  const logoContent = club.logo
    ? el("img", {
        src: club.logo.public_url,
        alt: club.name + " logo",
        loading: "lazy",
        decoding: "async",
        width: 88,
        height: 88,
      })
    : el("span", { class: "paper-card__logo-fallback" }, club.name.charAt(0));

  const excerpt =
    club.excerpt || "An active society under the Student Activity Council, IISER Kolkata.";

  // Random slight rotation for the notice board look (-2deg to +2deg)
  const rotate = (Math.random() - 0.5) * 4;

  // Map club slug to individual page URL
  const pageUrl = getClubPageUrl(club.slug);

  const card = el(
    "a",
    {
      class: "paper-card",
      href: pageUrl,
      "aria-label": "Read more about " + club.name,
      style: "--card-rotate: " + rotate.toFixed(2) + "deg",
    },
    el("div", { class: "paper-card__logo" }, logoContent),
    el("h3", { class: "paper-card__name" }, club.name),
    el("span", { class: "paper-card__rule", "aria-hidden": "true" }),
    el("p", { class: "paper-card__excerpt" }, excerpt),
    el("span", { class: "paper-card__cta" }, "Read More \u2192")
  );

  // Navigation is handled by the native <a href> — no custom click handler.
  // The fold animation was removed because it caused transform interpolation
  // glitches between the hover and folding states.
  // Hover effect (3D lift + shadow) is purely CSS and works correctly.

  return el("li", { class: "paper-card-wrap" }, card);
}

function renderBodySection(bodyId, info, clubs, mountEl) {
  const section = el(
    "section",
    {
      class: "body-section",
      id: "body-" + bodyId,
      "data-body": bodyId,
      "aria-labelledby": "body-" + bodyId + "-title",
    },
    el(
      "header",
      { class: "body-banner" },
      el("p", { class: "body-banner__kicker" }, info.kicker),
      el("h2", { class: "body-banner__title", id: "body-" + bodyId + "-title" }, info.title),
      el("p", { class: "body-banner__tagline" }, info.tagline),
      el("div", { class: "body-banner__ornament", "aria-hidden": "true" }, info.ornament)
    )
  );

  if (clubs.length === 0) {
    section.classList.add("body-section--empty");
    section.appendChild(
      el(
        "div",
        { class: "body-empty", role: "status" },
        el("strong", {}, info.title + " Desk"),
        "No clubs are listed under this body yet. The Chronicle will carry their entries as soon as the editorial desk receives them."
      )
    );
  } else {
    section.appendChild(el("ul", { class: "paper-card-grid" }, ...clubs.map(renderPaperCard)));
  }

  mountEl.replaceWith(section);
  return section;
}

/* -------------------------------------------------------------------------
 * Paper-folding animation
 *
 * Each .body-section starts rotated -90deg on the X axis (folded shut).
 * When 15% enters the viewport we add .is-visible, which animates it
 * flat. The observer fires once per section and then unobserves so the
 * reveal never replays.
 * ------------------------------------------------------------------------- */

function setupFolding() {
  const sections = Array.from(document.querySelectorAll(".body-section"));
  if (!sections.length) return;

  // Honour the user's OS-level motion preference.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    sections.forEach((s) => s.classList.add("is-visible"));
    return;
  }

  if (!("IntersectionObserver" in window)) {
    sections.forEach((s) => s.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  sections.forEach((s) => observer.observe(s));
}

/* -------------------------------------------------------------------------
 * Lead-article column calculation (pretext)
 *
 * Uses canvas-based text measurement to decide whether the lead article
 * is long enough for a 2-column grid. Short text gets 1 column even on
 * wide viewports, avoiding sparse-looking columns.
 * ------------------------------------------------------------------------- */

const LEAD_MIN_2COL_HEIGHT = 350; // px — below this, collapse to 1 column

export async function adjustLeadLayout() {
  const body = document.querySelector(".lead-article__body");
  if (!body) return;
  if (window.innerWidth <= 720) return; // CSS already handles this

  const text = body.innerText;
  if (!text) return;

  const style = window.getComputedStyle(body);
  const font = style.font;
  const lineHeight = parseFloat(style.lineHeight) || 26.4;
  const gap = parseFloat(style.columnGap) || 24;
  const fullWidth = body.offsetWidth;
  const colWidth = Math.max((fullWidth - gap) / 2, 100);

  try {
    // Dynamic import so a pretext failure doesn't kill the whole page
    const { measureText } = await import("../utils/text-measure.js");
    const { height } = measureText(text, font, colWidth, lineHeight);
    if (height > 0 && height < LEAD_MIN_2COL_HEIGHT) {
      body.style.columnCount = "1";
    }
  } catch {
    // fallback: keep CSS default (2 columns)
  }
}

/* -------------------------------------------------------------------------
 * Entry point
 * ------------------------------------------------------------------------- */

export async function initHome() {
  const bodies = document.getElementById("bodies");
  if (!bodies) return;

  let assets;
  try {
    assets = await loadAssetsMap();
  } catch (err) {
    console.error("[home] failed to load assets_map.jsonl:", err);
    return;
  }

  const clubs = indexByClub(assets);

  // Fetch all club markdown excerpts in parallel. This is the
  // "newspaper excerpt" copy on each card. Failures degrade to a
  // generic placeholder rather than throwing the whole render.
  await Promise.all(
    clubs.map(async (c) => {
      if (c.markdown) c.excerpt = await fetchExcerpt(c.markdown);
    })
  );

  // Bucket clubs into the 4 bodies, alphabetically within each bucket.
  const buckets = Object.fromEntries(BODY_ORDER.map((id) => [id, []]));
  for (const c of clubs) {
    buckets[assignBody(c.name)].push(c);
  }
  for (const id of BODY_ORDER) {
    buckets[id].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Replace each mount point with the rendered section.
  for (const bodyId of BODY_ORDER) {
    const mountEl = bodies.querySelector('[data-body-mount="' + bodyId + '"]');
    if (!mountEl) continue;
    renderBodySection(bodyId, BODY_INFO[bodyId], buckets[bodyId], mountEl);
  }

  setupFolding();

  // Measure lead-article text and adjust column layout.
  // Also re-measure on font load since canvas metrics depend on it.
  adjustLeadLayout();
  document.fonts?.ready?.then(adjustLeadLayout);
  // Debounced resize: canvas text measurement is expensive, don't run on every event
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(adjustLeadLayout);
  });

  // Calligraphy text reveal: headline appears as if being written.
  // Only on first visit (not on resize or re-init).
  if (!window.__sacCalligraphyDone) {
    window.__sacCalligraphyDone = true;
    const headline = document.querySelector(".lead-article__headline");
    if (headline) {
      // Wait for fonts to load before revealing
      document.fonts?.ready?.then(() => {
        revealText(headline, 2000, undefined, { sound: true, trail: true });
      });
    }
  }

  // Initialize scroll-based paper scratch sounds
  initScrollSounds();
}
