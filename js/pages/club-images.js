/**
 * Map-backed media renderer for individual club pages.
 *
 * Every image comes from assets_map.jsonl. The map supplies the public URL,
 * intrinsic dimensions, orientation, role, title, and provenance used here
 * for both accessible markup and responsive placement.
 */
import { el, assetUrl } from "../utils/dom.js";
import { loadAssetsMap, getClubEntries } from "../data.js";
import { initScrollSounds } from "../utils/calligraphy.js";
import { initImageReveal, eagerFirst } from "../utils/reveal.js";
import { measureText } from "../utils/text-measure.js";
import { initLazyVideos, videoPlayerAttrs } from "../utils/media.js";
import { gridSrc } from "../utils/thumb.js";
import { showGridSkeleton, clearSkeleton } from "../utils/skeleton.js";
import { captionFor, altTextFor, isGenericTitle } from "../utils/caption.js";

function assetCaption(asset) {
  return captionFor(asset);
}

function isBogusPerson(name) {
  if (!name) return false;
  const n = String(name).trim();
  if (n.length < 3) return true;
  if (/^(IMG|DSC|PXL|VID|OBs?|sri|sleeveless|tank\s*top)/i.test(n)) return true;
  if (/^\d/.test(n)) return true;
  if (/^(25|26)\s*26/.test(n)) return true;
  if (n.split(/\s+/).length === 1 && n.length < 6 && /^[a-z]+$/.test(n)) return true; // single lowercase word like "sri"
  if (n.includes("_") && n.length > 20) return true; // fallback filename still with underscores
  return false;
}

function mediaLabel(asset) {
  const cap = captionFor(asset);
  if (!isGenericTitle(cap)) return cap;
  return asset.file_type === "audio" ? "Audio clip" : "Video clip";
}

function assetRatio(asset) {
  const ratio =
    Number(asset.aspect_ratio) ||
    (asset.width && asset.height ? asset.width / asset.height : 4 / 3);
  return Math.min(3, Math.max(0.55, ratio));
}

function assetMatchesRole(asset, role) {
  if (asset.file_type !== "image") return false;
  if (!role) return true;
  if (role === "ob_portrait") return asset.is_ob_portrait;
  if (role === "logo") return asset.is_logo;
  if (role === "event") return asset.is_event;
  if (role === "iicm") return asset.is_iicm;
  if (role === "equipment") return asset.role === "equipment";
  if (role === "portfolio") return asset.role === "portfolio";
  if (role === "outer-fest") return asset.role === "outer-fest";
  if (role === "all-non-ob") return !asset.is_ob_portrait;
  if (role === "other") {
    return (
      !asset.is_ob_portrait &&
      !asset.is_logo &&
      !asset.is_iicm &&
      !asset.is_event &&
      !["equipment", "portfolio", "outer-fest"].includes(asset.role)
    );
  }
  return true;
}

function uniqueAssets(assets) {
  const seen = new Set();
  return assets.filter((asset) => {
    const key = asset.public_url || asset.path || asset.filename;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderThumb(asset, group, context, index, opts = {}) {
  const caption = assetCaption(asset);
  const metrics = measureText(caption, '12px "Courier New", monospace', 220, 17);
  const lines = Math.min(metrics.lineCount || 1, 3);
  const ratio = assetRatio(asset);
  const isMissingName = asset.is_ob_portrait && !asset.person;
  const isBogusName = asset.is_ob_portrait && isBogusPerson(asset.person);
  const isDuplicatePerson = !!opts.duplicatePersons?.has(asset.person);
  const needsVerify = isMissingName || isBogusName;
  const thumbClass = [
    "thumb",
    "thumb--reveal",
    needsVerify ? "thumb--missing-name" : "",
    isDuplicatePerson ? "thumb--duplicate" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return el(
    "li",
    {
      class: thumbClass,
      "data-orientation": asset.orientation || "unknown",
      "data-asset-role": asset.role || "image",
      "data-person": asset.person || "",
      "data-missing-name": needsVerify ? "true" : "false",
      "data-bogus-name": isBogusName ? "true" : "false",
      style: `--pin-rotate: ${((index % 5) - 2) * 0.45}deg; --asset-ratio: ${ratio}; --thumb-aspect: ${ratio}; --caption-lines: ${lines}`,
    },
    el(
      "figure",
      { class: "thumb__figure" },
      el(
        "a",
        {
          href: assetUrl(asset.public_url),
          "data-viewer": group,
          "data-title": assetCaption(asset),
          "data-desc": asset.description || asset.person || asset.filename || "",
          "data-credit": asset.credit || "",
          "data-context": context || "",
          "data-width": asset.width || "",
          "data-height": asset.height || "",
          title: asset.title || asset.filename || "",
        },
        el(
          "span",
          { class: "thumb__media" },
          el("img", {
            src: assetUrl(gridSrc(asset)),
            alt: altTextFor(asset, "Club image"),
            loading: "lazy",
            decoding: "async",
            width: asset.width || undefined,
            height: asset.height || undefined,
            style:
              asset.width && asset.height
                ? `aspect-ratio: ${asset.width} / ${asset.height}`
                : undefined,
          })
        ),
        index % 3 === 0 ? el("span", { class: "thumb__tape", "aria-hidden": "true" }) : null,
        needsVerify
          ? el(
              "span",
              {
                class: "thumb__badge",
                title: isBogusName
                  ? `Person name "${asset.person}" looks bogus — needs team follow-up`
                  : "Person name missing — needs team follow-up",
              },
              "verify name"
            )
          : null,
        isDuplicatePerson
          ? el(
              "span",
              {
                class: "thumb__badge thumb__badge--dup",
                title: `Duplicate portrait for ${asset.person}`,
              },
              "duplicate"
            )
          : null
      ),
      el("figcaption", { class: "thumb__cap" }, caption)
    )
  );
}

function renderMediaCard(asset, context, index) {
  const caption = mediaLabel(asset);
  const source = el("source", {
    src: assetUrl(asset.public_url),
    type: asset.mime_type || undefined,
  });
  const media =
    asset.file_type === "audio"
      ? el("audio", { controls: true, preload: "none", "data-preload-lazy": "" }, source)
      : el("video", videoPlayerAttrs(asset, caption), source);
  return el(
    "li",
    {
      class: "media-card",
      style: `--pin-rotate: ${((index % 5) - 2) * 0.45}deg`,
    },
    el("div", { class: "media-card__player" }, media),
    el("p", { class: "media-card__title" }, caption),
    el("p", { class: "media-card__meta" }, context || asset.club_name || "SAC archive")
  );
}

function renderMediaArchive(entries) {
  const media = uniqueAssets(
    entries.filter((asset) => asset.file_type === "video" || asset.file_type === "audio")
  );
  if (!media.length) return;
  const mount = document.querySelector(".club-detail");
  if (!mount) return;
  mount.append(
    el(
      "section",
      {
        class: "club-detail__section club-detail__media-archive reveal-section",
        "data-media-count": media.length,
      },
      el("h2", { class: "club-detail__section-title" }, "Audio & video archive"),
      el("p", { class: "muted" }, "Playable media supplied with this club record."),
      el(
        "ul",
        { class: "media-grid" },
        ...media.map((asset, index) => renderMediaCard(asset, "Club archive", index))
      )
    )
  );
}

function collapseEmptySection(placeholder) {
  placeholder.style.display = "none";
  const section = placeholder.closest(".reveal-section") || placeholder.closest("section");
  if (!section) return;
  const otherVisible = Array.from(section.querySelectorAll("[data-club-images]")).some(
    (node) => node !== placeholder && node.style.display !== "none"
  );
  if (!otherVisible) section.style.display = "none";
}

function renderPlaceholder(placeholder, entries) {
  const role = placeholder.dataset.role;
  const title = placeholder.dataset.title;
  const filtered = uniqueAssets(entries.filter((asset) => assetMatchesRole(asset, role)));
  if (!filtered.length) {
    collapseEmptySection(placeholder);
    return false;
  }

  // Flag duplicate OB persons (same name with multiple distinct files) for UI badge + console warn
  const personCounts = new Map();
  filtered.forEach((a) => {
    if (a.person) personCounts.set(a.person, (personCounts.get(a.person) || 0) + 1);
  });
  const duplicatePersons = new Set(
    Array.from(personCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([p]) => p)
  );
  if (duplicatePersons.size) {
    console.warn(
      "[club-images] duplicate person portraits:",
      Array.from(duplicatePersons).join(", "),
      "in role",
      role
    );
  }
  const missingNames = filtered.filter((a) => a.is_ob_portrait && !a.person);
  const bogusNames = filtered.filter((a) => a.is_ob_portrait && isBogusPerson(a.person));
  if (missingNames.length || bogusNames.length) {
    // One summary line — the affected filenames are visible as page badges
    console.warn(
      `[club-images] ${role}: ${missingNames.length} missing + ${bogusNames.length} unverified person name(s) — flagged with "verify name" badges on the page`
    );
  }

  const slug = document.body.dataset.clubSlug;
  const group = `club-${slug}`;
  const block = el(
    "div",
    { class: "club-detail__image-block", "data-map-role": role || "all-images" },
    title ? el("h2", { class: "club-detail__section-title" }, title) : null,
    el(
      "ul",
      { class: "thumb-grid pinned-thumbs", "data-asset-count": filtered.length },
      ...filtered.map((asset, index) =>
        renderThumb(asset, group, title, index, { duplicatePersons })
      )
    )
  );
  placeholder.replaceChildren(block);
  placeholder.style.display = "";
  return true;
}

function renderFallback(entries, placeholders) {
  const allImages = uniqueAssets(entries.filter((asset) => asset.file_type === "image"));
  if (!allImages.length || !placeholders.length) return;
  const last = placeholders[placeholders.length - 1];
  const section = last.closest(".reveal-section") || last.closest("section");
  // Also compute duplicates for fallback
  const personCounts = new Map();
  allImages.forEach((a) => {
    if (a.person) personCounts.set(a.person, (personCounts.get(a.person) || 0) + 1);
  });
  const duplicatePersons = new Set(
    Array.from(personCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([p]) => p)
  );
  const block = el(
    "section",
    {
      class: "club-detail__section club-detail__section--map-fallback",
      "data-assets-source": "assets_map.jsonl",
    },
    el("h2", { class: "club-detail__section-title" }, "Club archive"),
    el(
      "ul",
      { class: "thumb-grid pinned-thumbs", "data-asset-count": allImages.length },
      ...allImages.map((asset, index) =>
        renderThumb(asset, `club-${document.body.dataset.clubSlug}`, "Club archive", index, {
          duplicatePersons,
        })
      )
    )
  );
  section?.after(block);
}

function addTableDataLabels() {
  document.querySelectorAll(".ob-table").forEach((table) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );
    table.querySelectorAll("tbody tr").forEach((row) => {
      row.querySelectorAll("td").forEach((cell, index) => {
        if (headers[index]) cell.setAttribute("data-label", headers[index]);
      });
    });
  });
}

function wrapTables() {
  document.querySelectorAll(".ob-table").forEach((table) => {
    if (table.parentElement?.classList.contains("club-detail__table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "club-detail__table-scroll";
    wrapper.tabIndex = 0;
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

export async function initClubImages() {
  const slug = document.body.dataset.clubSlug;
  if (!slug) return;

  const mounts = Array.from(document.querySelectorAll("[data-club-images]"));
  mounts.forEach((m) => showGridSkeleton(m, 6));
  try {
    const assets = await loadAssetsMap();
    const entries = getClubEntries(assets, slug);
    const placeholders = Array.from(document.querySelectorAll("[data-club-images]"));
    placeholders.forEach((m) => clearSkeleton(m));
    const rendered = placeholders.map((placeholder) => renderPlaceholder(placeholder, entries));
    if (!rendered.some(Boolean)) renderFallback(entries, placeholders);
    renderMediaArchive(entries);
  } catch (error) {
    console.error("[club-images] Failed to load images:", error);
  }

  initLazyVideos(document);
  eagerFirst(document);
  initImageReveal(document);
  addTableDataLabels();
  wrapTables();

  initScrollSounds();
}
