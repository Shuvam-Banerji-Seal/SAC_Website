/**
 * pages/club.js — single template for any individual club.
 *
 * Reads the ?id=<slug> query param, loads that club's data from the
 * assets map, and renders: name, markdown body, OB portraits, event
 * photos, IICM achievements, and a back link to the clubs index.
 */
import { $, el, getQueryParam, pageUrl } from "../utils/dom.js";
import { loadAssetsMap, getClubEntries, getClub } from "../data.js";

/** Tiny markdown subset: headings, paragraphs, images, bullet lists.
 *  All text is HTML-escaped. */
function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let buf = [];
  let listOpen = false;
  const flushPara = () => {
    if (buf.length) {
      out.push(`<p>${escapeHtml(buf.join(" "))}</p>`);
      buf = [];
    }
  };
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("# ")) {
      flushPara();
      if (listOpen) { out.push("</ul>"); listOpen = false; }
      out.push(`<h2>${escapeHtml(t.slice(2))}</h2>`);
    } else if (t.startsWith("## ")) {
      flushPara();
      if (listOpen) { out.push("</ul>"); listOpen = false; }
      out.push(`<h3>${escapeHtml(t.slice(3))}</h3>`);
    } else if (t.startsWith("### ")) {
      flushPara();
      if (listOpen) { out.push("</ul>"); listOpen = false; }
      out.push(`<h4>${escapeHtml(t.slice(4))}</h4>`);
    } else if (t.startsWith("![")) {
      flushPara();
      if (listOpen) { out.push("</ul>"); listOpen = false; }
      const m = t.match(/!\[(.*?)\]\((.*?)\)/);
      if (m) out.push(`<img alt="${escapeHtml(m[1])}" src="${escapeAttr(safeUrl(m[2]))}">`);
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      flushPara();
      if (!listOpen) { out.push("<ul>"); listOpen = true; }
      out.push(`<li>${escapeHtml(t.slice(2))}</li>`);
    } else if (t === "") {
      flushPara();
      if (listOpen) { out.push("</ul>"); listOpen = false; }
    } else {
      buf.push(t);
    }
  }
  flushPara();
  if (listOpen) out.push("</ul>");
  return out.join("\n");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

/** Validate that a URL is safe (not javascript: or data: URIs). */
function safeUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url, window.location.href);
    if (u.protocol === "javascript:" || u.protocol === "data:") return "";
    return url;
  } catch {
    // Relative path — treat as safe
    return url;
  }
}

function imageCard(asset) {
  return el(
    "figure",
    { class: "thumb" },
    el("img", {
      src: asset.public_url,
      alt: asset.description,
      loading: "lazy",
      width: asset.width || undefined,
      height: asset.height || undefined,
    }),
    el("figcaption", { class: "thumb__cap" }, asset.title || asset.filename),
  );
}

export async function initClub() {
  const mount = $("#club-detail");
  if (!mount) return;
  const slug = getQueryParam("id");
  if (!slug) {
    mount.replaceWith(errorBlock("No club id given. Use ?id=<slug> in the URL."));
    return;
  }
  try {
    const assets = await loadAssetsMap();
    const club = getClub(slug, assets);
    if (!club) {
      mount.replaceWith(errorBlock(`Unknown club: ${slug}`));
      return;
    }
    const entries = getClubEntries(assets, slug);
    const md = entries.find((e) => e.is_markdown_content);
    const obs = entries.filter((e) => e.is_ob_portrait);
    const events = entries.filter((e) => e.is_event);
    const iicm = entries.filter((e) => e.is_iicm);
    const logos = entries.filter((e) => e.is_logo);

    // Fetch the markdown body separately (the jsonl has only metadata).
    // public_url in the jsonl is already an absolute deploy-prefixed path.
    let mdHtml = null;
    if (md) {
      try {
        const mdText = await fetch(md.public_url).then((r) => r.text());
        mdHtml = renderMarkdown(mdText);
      } catch (e) {
        console.warn(`Failed to load markdown for ${slug}:`, e);
      }
    }

    mount.replaceWith(
      el(
        "article",
        { class: "club-detail", id: "club-detail" },
        // Header
        el(
          "header",
          { class: "club-detail__header" },
          el("a", { href: pageUrl("pages/clubs.html"), class: "back-link" }, "← All clubs"),
          el("h1", { class: "club-detail__title" }, club.name),
          logos[0]
            ? el("img", {
                src: logos[0].public_url,
                alt: `${club.name} logo`,
                class: "club-detail__logo",
                width: logos[0].width || 160,
                height: logos[0].height || 160,
              })
            : null,
        ),
        // Markdown body (only if fetched successfully)
        mdHtml
          ? el("section", { class: "club-detail__body", innerHTML: mdHtml })
          : null,
        // Counts summary
        el(
          "section",
          { class: "club-detail__counts" },
          el("h2", {}, "By the numbers"),
          el(
            "ul",
            { class: "stat-grid" },
            el("li", {}, el("strong", {}, club.counts.total), " total assets"),
            el("li", {}, el("strong", {}, club.counts.images), " images"),
            el("li", {}, el("strong", {}, club.counts.markdowns), " doc files"),
            el("li", {}, el("strong", {}, club.counts.ob), " OB portraits"),
            el("li", {}, el("strong", {}, club.counts.iicm), " IICM photos"),
            el("li", {}, el("strong", {}, club.counts.event), " event photos"),
          ),
        ),
        // OB portraits
        obs.length
          ? el(
              "section",
              { class: "club-detail__section" },
              el("h2", {}, "Office bearers"),
              el("ul", { class: "thumb-grid" }, ...obs.map((o) => el("li", {}, imageCard(o)))),
            )
          : null,
        // IICM
        iicm.length
          ? el(
              "section",
              { class: "club-detail__section" },
              el("h2", {}, "IICM achievements"),
              el("ul", { class: "thumb-grid" }, ...iicm.map(imageCard)),
            )
          : null,
        // Events
        events.length
          ? el(
              "section",
              { class: "club-detail__section" },
              el("h2", {}, "Events"),
              el("ul", { class: "thumb-grid" }, ...events.map(imageCard)),
            )
          : null,
      ),
    );
  } catch (err) {
    console.error("initClub failed:", err);
    mount.replaceWith(errorBlock(`Failed to load club: ${err.message}`));
  }
}

function errorBlock(msg) {
  return el("section", { class: "error-block", id: "club-detail" }, el("p", {}, msg));
}
