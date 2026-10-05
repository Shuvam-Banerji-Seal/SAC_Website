/**
 * Data-driven identity layer for every individual club page.
 *
 * The editorial copy and tables remain hand-written where a club has supplied
 * them, but the identity at the top of every page is always hydrated from the
 * canonical assets map. This prevents stale titles and gives every club the
 * same useful map-backed visual anchor without making the pages boilerplate.
 */
import { $, el, assetUrl } from "../utils/dom.js";
import { heroPicks, HERO_MIN } from "../utils/hero-picks.js";
import { altTextFor } from "../utils/caption.js";
import { srcsetFor } from "../utils/thumb.js";
import { showIdentitySkeleton, clearSkeleton } from "../utils/skeleton.js";
import { isCurrentTenure } from "../utils/tenure.js";
import { getClub, getClubEntries, loadAssetsMap, indexByClub } from "../data.js";
import { buildActions, fixBrokenMailtos, hydratePagerLogos } from "../components/club-extras.js";
import { clubBySlug } from "../data/clubs.js";

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

function buildIdentity(club, entries, theme) {
  const imageCount = entries.filter((entry) => entry.file_type === "image").length;
  const documentCount = entries.filter((entry) => entry.file_type === "markdown").length;
  const portraitCount = entries.filter(
    (entry) => entry.is_ob_portrait && isCurrentTenure(entry)
  ).length;
  const mediaCount = entries.filter(
    (entry) => entry.file_type === "video" || entry.file_type === "audio"
  ).length;
  // What a reader can find on the page, in their words. It used to list every counter, zeros
  // included, in the archive's own terms: "0 portraits · 61 events · 2 medias · map logo".
  const record = [
    [imageCount, "photograph"],
    [portraitCount, "office bearer pictured", "office bearers pictured"],
    [mediaCount, "recording"],
    [documentCount, "document"],
  ].filter(([n]) => n > 0);

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
      // the club's own word (the registry's theme.stamp); a page with no theme keeps "SAC"
      theme?.stamp ?? "SAC",
      el("span", { class: "postmark__lines" }, stampDate),
      "IISER·K"
    ),
    el("div", { class: "club-detail__logo" }, makeLogo(club, entries)),
    el(
      "div",
      { class: "club-detail__identity-copy" },
      // the desk the page runs under ("The Chess Column"), as a newspaper would name its section
      el("p", { class: "club-detail__eyebrow" }, theme?.desk ?? "SAC Chronicle · club record"),
      el("h1", { class: "club-detail__title", id: "clubTitle" }, club.name),
      theme?.tag ? el("p", { class: "club-detail__tag" }, theme.tag) : null,
      record.length
        ? el(
            "div",
            { class: "club-detail__stats", "aria-label": "In the club's record" },
            ...record.map(([n, one, many]) => el("span", {}, formatCount(n, one, many)))
          )
        : null,
      // built with the identity, in the same tick, so it cannot move anything later
      buildActions(club)
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

/** An empty strip of `count` mounts, the size the real one will be; null when there is none. */
function reserveHeroStrip(header, count) {
  if (count < HERO_MIN) return null;
  const slot = el(
    "div",
    {
      class: `club-hero-strip club-hero-strip--reserved club-hero-strip--n${count}`,
      "aria-hidden": "true",
    },
    ...Array.from({ length: count }, (_, i) =>
      el(
        "div",
        { class: "club-hero-strip__item" + (i === 0 ? " is-lead" : "") },
        el("span", { class: "club-hero-strip__photo" })
      )
    )
  );
  header.append(slot);
  return slot;
}

/** How wide a strip's print is (club.css): four even, or a 2.2:1:1 lead; full width on phones.
 *  Measured, not guessed — a four-up print is 236px at 1440 (16vw: the rail and margins take the
 *  rest) and 153px on a 390px phone (40vw); overstating it sent 2x screens the 2400px originals. */
function stripSizes(count, index) {
  if (count === 4) return "(max-width: 720px) 40vw, 16vw";
  const share = index === 0 ? 2.2 : 1;
  const total = 2.2 + (count - 1);
  return `(max-width: 720px) 100vw, ${Math.round((share / total) * 68)}vw`;
}

/** Featured strip: the three best landscape event shots above the intro (utils/hero-picks.js). */
function buildHeroStrip(club, entries) {
  const picks = heroPicks(entries);
  if (picks.length < HERO_MIN) return null;
  return el(
    "div",
    {
      class: `club-hero-strip club-hero-strip--n${picks.length}`,
      "aria-label": "Featured moments",
    },
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
          // The originals are up to 2400px; a print in a four-up strip is ~250px wide. Offer the
          // 480px variant too and let the browser take what the frame needs.
          srcset: srcsetFor(e, assetUrl),
          sizes: stripSizes(picks.length, i),
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
  const canonical = document.querySelector('link[rel="canonical"]')?.href || document.location.href;
  const imageEntry =
    club.logo || entries.find((e) => e.file_type === "image" && !e.is_extracted_from_doc) || null;
  const imageUrl = imageEntry
    ? new URL(assetUrl(imageEntry.public_url), document.location.href).href
    : new URL(assetUrl("assets/hero-people.webp"), document.location.href).href;
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

  showIdentitySkeleton(header);
  // The generator wrote how many photographs the strip will hold (data-strip): hold their space
  // now, in the strip's own layout, so the strip doesn't push the page down when it arrives.
  const stripSlot = reserveHeroStrip(header, Number(document.body.dataset.strip) || 0);
  try {
    const assets = await loadAssetsMap();
    const club = getClub(slug, assets);
    if (!club) {
      clearSkeleton(header);
      stripSlot?.remove();
      return null;
    }
    const entries = getClubEntries(assets, slug);
    clearSkeleton(header);

    const backLink = header.querySelector(".back-link");
    const identity = buildIdentity(club, entries, clubBySlug(slug)?.theme);
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
    // a mailto: with no address is a dead link; show the text instead
    fixBrokenMailtos(document);
    hydratePagerLogos(indexByClub(assets));

    // Keep a small, machine-readable provenance marker for future editors and
    // tests: every hydrated club page is explicitly map-backed.
    header.setAttribute("data-assets-source", "assets_map.jsonl");
    header.setAttribute("data-assets-updated", club.logo?.updated_at || String(CURRENT_YEAR));
    return { club, entries };
  } catch (error) {
    console.warn("[club-page] Could not hydrate club identity:", error);
    stripSlot?.remove();
    return null;
  }
}
