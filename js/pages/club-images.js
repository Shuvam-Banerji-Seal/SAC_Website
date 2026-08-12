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
import { initImageReveal } from "../utils/reveal.js";
import { measureText } from "../utils/text-measure.js";

function assetCaption(asset) {
  return asset.person || asset.title || asset.filename || "SAC image";
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

function renderThumb(asset, group, context, index) {
  const caption = assetCaption(asset);
  const metrics = measureText(caption, '12px "Courier New", monospace', 220, 17);
  const lines = Math.min(metrics.lineCount || 1, 3);
  return el(
    "li",
    {
      class: "thumb thumb--reveal",
      "data-orientation": asset.orientation || "unknown",
      "data-asset-role": asset.role || "image",
      style: `--pin-rotate: ${((index % 5) - 2) * 0.45}deg; --asset-ratio: ${assetRatio(asset)}; --caption-lines: ${lines}`,
    },
    el(
      "a",
      {
        href: assetUrl(asset.public_url),
        "data-viewer": group,
        "data-title": asset.title || asset.filename || "",
        "data-desc": asset.description || asset.person || asset.filename || "",
        "data-credit": asset.credit || "",
        "data-context": context || "",
        title: asset.title || asset.filename || "",
      },
      el(
        "span",
        { class: "thumb__media" },
        el("img", {
          src: assetUrl(asset.public_url),
          alt: asset.description || asset.title || asset.filename || "Club image",
          loading: "lazy",
          decoding: "async",
          width: asset.width || undefined,
          height: asset.height || undefined,
        })
      )
    ),
    el("figcaption", { class: "thumb__cap" }, caption)
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

  const slug = document.body.dataset.clubSlug;
  const group = `club-${slug}`;
  const block = el(
    "div",
    { class: "club-detail__image-block", "data-map-role": role || "all-images" },
    title ? el("h2", { class: "club-detail__section-title" }, title) : null,
    el(
      "ul",
      { class: "thumb-grid pinned-thumbs", "data-asset-count": filtered.length },
      ...filtered.map((asset, index) => renderThumb(asset, group, title, index))
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
        renderThumb(asset, `club-${document.body.dataset.clubSlug}`, "Club archive", index)
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

  try {
    const assets = await loadAssetsMap();
    const entries = getClubEntries(assets, slug);
    const placeholders = Array.from(document.querySelectorAll("[data-club-images]"));
    const rendered = placeholders.map((placeholder) => renderPlaceholder(placeholder, entries));
    if (!rendered.some(Boolean)) renderFallback(entries, placeholders);
  } catch (error) {
    console.error("[club-images] Failed to load images:", error);
  }

  initImageReveal(document);
  addTableDataLabels();
  wrapTables();

  initScrollSounds();
}
