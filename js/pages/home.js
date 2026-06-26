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

/* -------------------------------------------------------------------------
 * Bodies — the 4 sections of the SAC, in page order.
 *
 * BODY_INFO carries the editorial copy for each section banner.
 * The bodyId is the same as the [data-body-mount] attribute on the
 * placeholder div in index.html, so render is a single .replaceWith().
 * ------------------------------------------------------------------------- */

const BODY_INFO = {
  academics: {
    kicker: "Section I",
    title: "SAC Academics",
    tagline:
      "Where scholarship meets the wider life of the campus — academic initiatives, talks, and bridges to industry.",
    ornament: "— ✦ ✦ ✦ —",
  },
  hostel: {
    kicker: "Section II",
    title: "SAC Hostel Committee",
    tagline:
      "The standing committee for residence life — community events, welfare, and the everyday essentials.",
    ornament: "— ✦ ✦ ✦ —",
  },
  sports: {
    kicker: "Section III",
    title: "Sports",
    tagline:
      "The playing fields are part of the Chronicle too — a section reserved for the games societies as their records arrive.",
    ornament: "— ✦ ✦ ✦ —",
  },
  cultural: {
    kicker: "Section IV",
    title: "Cultural Clubs",
    tagline:
      "Ten societies — drama, music, dance, film, words, art, and the airwaves — gathered under one editorial roof.",
    ornament: "— ✦ ✦ ✦ —",
  },
};

/* The order bodies are rendered on the page. */
const BODY_ORDER = ["academics", "hostel", "sports", "cultural"];

/* -------------------------------------------------------------------------
 * Body assignment
 *
 * Today the JSONL has 12 clubs: SAC Academics, SAC Hostel Committee,
 * and 10 cultural clubs. Sports has 0 entries — we show the empty
 * placeholder rather than invent material.
 * ------------------------------------------------------------------------- */

function assignBody(clubName) {
  if (clubName === "SAC Academics") return "academics";
  if (clubName === "SAC Hostel Committee") return "hostel";
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
  if (line.startsWith("#")) return true;          // md heading
  if (line.startsWith("!")) return true;          // md image
  if (line.startsWith("|")) return true;          // md table
  if (line.startsWith("---")) return true;        // md hr
  if (line.startsWith("```")) return true;        // md code fence
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

  const excerpt = club.excerpt || "An official club under the Student Activity Council.";

  const card = el(
    "a",
    {
      class: "paper-card",
      href: pageUrl("pages/club.html?id=" + encodeURIComponent(club.slug)),
      "aria-label": "Read more about " + club.name,
    },
    el("div", { class: "paper-card__logo" }, logoContent),
    el("h3", { class: "paper-card__name" }, club.name),
    el("span", { class: "paper-card__rule", "aria-hidden": "true" }),
    el("p", { class: "paper-card__excerpt" }, excerpt),
    el("span", { class: "paper-card__cta" }, "Read More \u2192"),
  );

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
      el("div", { class: "body-banner__ornament", "aria-hidden": "true" }, info.ornament),
    ),
  );

  if (clubs.length === 0) {
    section.classList.add("body-section--empty");
    section.appendChild(
      el(
        "div",
        { class: "body-empty", role: "status" },
        el("strong", {}, info.title + " Desk"),
        "No clubs are listed under this body yet. The Chronicle will print the entries as soon as they reach the editorial desk.",
      ),
    );
  } else {
    section.appendChild(
      el("ul", { class: "paper-card-grid" }, ...clubs.map(renderPaperCard)),
    );
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
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
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
    }),
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
  window.addEventListener("resize", adjustLeadLayout);
}
