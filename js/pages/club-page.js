/**
 * Data-driven identity layer for every individual club page.
 *
 * The editorial copy and tables remain hand-written where a club has supplied
 * them, but the identity at the top of every page is always hydrated from the
 * canonical assets map. This prevents stale titles and gives every club the
 * same useful map-backed visual anchor without making the pages boilerplate.
 */
import { $, el, assetUrl } from "../utils/dom.js";
import { altTextFor, captionFor } from "../utils/caption.js";
import { getClub, getClubEntries, loadAssetsMap } from "../data.js";

const CURRENT_YEAR = new Date().getFullYear();

function formatCount(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function makeLogo(club, entries) {
  const logo = club.logo;
  if (logo) {
    return el("img", {
      src: assetUrl(logo.public_url),
      alt: `${club.name} logo`,
      loading: "eager",
      decoding: "async",
      width: logo.width || 180,
      height: logo.height || 180,
    });
  }

  // Committees without a logo in assets_map.jsonl still receive a stable,
  // accessible mark derived from their canonical club name.
  const initials = club.name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return el(
    "span",
    {
      class: "club-detail__logo-fallback",
      role: "img",
      "aria-label": `${club.name} mark`,
    },
    initials || club.name.charAt(0).toUpperCase(),
    entries.length ? el("small", {}, "MAP") : null
  );
}

function buildIdentity(club, entries) {
  const imageCount = entries.filter((entry) => entry.file_type === "image").length;
  const documentCount = entries.filter((entry) => entry.file_type === "markdown").length;
  const portraitCount = entries.filter((entry) => entry.is_ob_portrait).length;
  const eventCount = entries.filter((entry) => entry.is_event || entry.is_iicm).length;
  const mediaCount = entries.filter(
    (entry) => entry.file_type === "video" || entry.file_type === "audio"
  ).length;
  const logoSource = club.logo ? "Map logo" : "Map mark";

  const stampDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return el(
    "div",
    { class: "club-detail__identity" },
    el(
      "div",
      { class: "postmark", "aria-hidden": "true" },
      "SAC",
      el("span", { class: "postmark__lines" }, stampDate),
      "IISER·K"
    ),
    el("div", { class: "club-detail__logo" }, makeLogo(club, entries)),
    el(
      "div",
      { class: "club-detail__identity-copy" },
      el("p", { class: "club-detail__eyebrow" }, "SAC Chronicle · club record"),
      el("h1", { class: "club-detail__title", id: "clubTitle" }, club.name),
      el(
        "div",
        { class: "club-detail__stats", "aria-label": "Club record summary" },
        el("span", {}, formatCount(imageCount, "image")),
        el("span", {}, formatCount(portraitCount, "portrait")),
        el("span", {}, formatCount(eventCount, "event")),
        el("span", {}, formatCount(mediaCount, "media")),
        el("span", {}, formatCount(documentCount, "document")),
        el("span", { class: "club-detail__source" }, logoSource)
      )
    )
  );
}

function setMeta(attr, key, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/** Featured strip: the three best landscape event shots above the intro. */
function buildHeroStrip(club, entries) {
  const picks = entries
    .filter(
      (e) =>
        e.file_type === "image" &&
        (e.is_event || e.is_iicm || e.role === "event") &&
        !e.is_extracted_from_doc &&
        !e.is_ob_portrait &&
        (Number(e.aspect_ratio) || 1) >= 1.2
    )
    .sort((a, b) => (Number(b.width) || 0) - (Number(a.width) || 0))
    .slice(0, 3);
  if (picks.length < 2) return null;
  return el(
    "div",
    { class: "club-hero-strip", "aria-label": "Featured moments" },
    ...picks.map((e, i) =>
      el(
        "button",
        {
          class: "club-hero-strip__item" + (i === 0 ? " is-lead" : ""),
          type: "button",
          "aria-label": `Open ${e.title || "featured photograph"}`,
          onclick: () => {
            const target = document.querySelector(
              `#club-${e.club} a[data-viewer], a[href$="${e.public_url.split("/").pop()}"]`
            );
            target?.click();
          },
        },
        el("img", {
          src: assetUrl(e.public_url),
          alt: altTextFor(e, "Featured club photograph"),
          loading: i === 0 ? "eager" : "lazy",
          decoding: "async",
          width: e.width || undefined,
          height: e.height || undefined,
        })
      )
    )
  );
}

function updateDescription(club, entries) {
  const summary = `${club.name} — official SAC club record at IISER Kolkata, with people, events, images, and achievements.`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", summary);
  document.title = `${club.name} · SAC IISER Kolkata`;

  // Social-share cards: og/twitter tags so club links unfurl in WhatsApp,
  // Telegram, Slack, X. og:image prefers the club crest, absolute-URLed so
  // crawlers can fetch it regardless of the deployment mirror.
  const canonical =
    document.querySelector('link[rel="canonical"]')?.href || document.location.href;
  const imageEntry =
    club.logo ||
    entries.find((e) => e.file_type === "image" && !e.is_extracted_from_doc) ||
    null;
  const imageUrl = imageEntry
    ? new URL(assetUrl(imageEntry.public_url), document.location.href).href
    : new URL("assets/hero.webp", document.location.href).href;
  setMeta("property", "og:title", club.name);
  setMeta("property", "og:description", summary);
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:image", imageUrl);
  setMeta("property", "og:type", "profile");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", club.name);
  setMeta("name", "twitter:description", summary);
  setMeta("name", "twitter:image", imageUrl);
}

function wrapTables() {
  document.querySelectorAll(".ob-table").forEach((table) => {
    if (table.parentElement?.classList.contains("club-detail__table-scroll")) return;
    const wrapper = el("div", { class: "club-detail__table-scroll", tabindex: "0" });
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

/** Hydrate one club page from assets_map.jsonl. */
export async function initClubPage() {
  const slug = document.body.dataset.clubSlug;
  const header = $(".club-detail__header");
  if (!slug || !header) return null;

  try {
    const assets = await loadAssetsMap();
    const club = getClub(slug, assets);
    if (!club) return null;
    const entries = getClubEntries(assets, slug);

    const backLink = header.querySelector(".back-link");
    const identity = buildIdentity(club, entries);
    const strip = buildHeroStrip(club, entries);
    const tear = el("div", { class: "paper-tear", "aria-hidden": "true" });
    header.replaceChildren(
      ...(backLink ? [backLink] : []),
      identity,
      ...(strip ? [strip] : []),
      tear
    );
    header.dataset.clubName = club.name;
    header.dataset.clubSlug = slug;
    document.body.dataset.clubName = club.name;
    updateDescription(club, entries);
    wrapTables();

    // Keep a small, machine-readable provenance marker for future editors and
    // tests: every hydrated club page is explicitly map-backed.
    header.setAttribute("data-assets-source", "assets_map.jsonl");
    header.setAttribute("data-assets-updated", club.logo?.updated_at || String(CURRENT_YEAR));
    return { club, entries };
  } catch (error) {
    console.warn("[club-page] Could not hydrate club identity:", error);
    return null;
  }
}
