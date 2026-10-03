/**
 * components/club-extras.js — the parts of a club page that need the browser or the archive.
 *
 * The breadcrumb and the "more clubs" pager are static HTML generated from the club
 * registry (tools/sync-pages.mjs), so they cost no layout shift and work without
 * JavaScript. What lives here is what cannot be static:
 *
 *   actions       copy link · share · print · email the club
 *   mailto guard  a malformed mailto: becomes plain text instead of a dead link
 *                 (AARSHI's office-bearer table once had five of them)
 *   contacts      read the page's own office-bearer table, so a person's card can
 *                 offer Call / Email / Copy without the data being typed twice
 *   pager logos   the crests on the "more from this body" chips
 */
import { el, assetUrl } from "../utils/dom.js";
import { clubBySlug } from "../data/clubs.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A plausible email address — enough to refuse "Chhandak Dutta". */
export const isEmail = (text) => EMAIL.test(String(text ?? "").trim());

/** Letters only, lower-cased: "Ruta  Amol Saptarshi" and "ruta amol saptarshi" match. */
export const normName = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/**
 * An Indian mobile number as a tel: link, or null.
 * "6295076503", "86534 03034", "+91 98765 43210" all work; anything else is left as text.
 */
export function phoneHref(text) {
  const digits = String(text ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `tel:+${digits}`;
  return null;
}

/**
 * Turn every mailto: link that has no real address into plain text.
 * @returns {number} how many it repaired
 */
export function fixBrokenMailtos(root = document) {
  let fixed = 0;
  for (const link of root.querySelectorAll('a[href^="mailto:"]')) {
    let address = link.getAttribute("href").slice("mailto:".length).split("?")[0];
    try {
      address = decodeURIComponent(address);
    } catch {
      /* leave it as written */
    }
    if (isEmail(address)) continue;
    link.replaceWith(el("span", { class: "muted", title: "No address listed" }, link.textContent));
    fixed++;
  }
  return fixed;
}

/**
 * The office-bearer table as a lookup: normalised name → { name, role, phone, email }.
 * Reads the visible table (the club's own words), never invents a value.
 */
export function readContacts(root = document) {
  const contacts = new Map();
  for (const table of root.querySelectorAll(".ob-table")) {
    const columns = [...table.querySelectorAll("thead th")].map((th) =>
      th.textContent.trim().toLowerCase()
    );
    const at = (name) => columns.findIndex((c) => c.includes(name));
    const [iName, iPhone, iEmail, iRole] = [at("name"), at("phone"), at("email"), at("position")];
    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = row.querySelectorAll("td");
      const name = cells[iName]?.textContent.trim();
      if (!name) continue;
      const mail = cells[iEmail]?.querySelector('a[href^="mailto:"]')?.getAttribute("href");
      const address = mail ? decodeURIComponent(mail.slice(7).split("?")[0]) : "";
      contacts.set(normName(name), {
        name,
        role: cells[iRole]?.textContent.trim() || "",
        phone: cells[iPhone]?.textContent.trim() || "",
        email: isEmail(address) ? address : "",
      });
    }
  }
  return contacts;
}

/** Copy text; true if it worked. Falls back for browsers without the async clipboard. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = el("textarea", {
      readonly: "",
      "aria-hidden": "true",
      style: "position:fixed;opacity:0",
    });
    box.value = text;
    document.body.append(box);
    box.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* no luck */
    }
    box.remove();
    return ok;
  }
}

/** A button that copies `text`, says so for a moment, and tells screen readers. */
export function copyButton(text, { label, className = "club-action" } = {}) {
  const status = el("span", { class: "visually-hidden", role: "status", "aria-live": "polite" });
  const text0 = label;
  const button = el(
    "button",
    {
      class: className,
      type: "button",
      onclick: async () => {
        const ok = await copyText(text());
        button.firstChild.textContent = ok ? "Copied ✓" : "Couldn't copy";
        status.textContent = ok ? "Copied to the clipboard" : "Copy failed";
        window.setTimeout(() => {
          button.firstChild.textContent = text0;
          status.textContent = "";
        }, 1800);
      },
    },
    text0
  );
  button.append(status);
  return button;
}

/** Copy link · Share · Print · Email the club. */
export function buildActions(club) {
  const contact = [...document.querySelectorAll('.contact-list a[href^="mailto:"]')].find((a) =>
    isEmail(decodeURIComponent(a.getAttribute("href").slice(7)))
  );
  return el(
    "div",
    { class: "club-detail__actions", role: "group", "aria-label": `Actions for ${club.name}` },
    copyButton(() => location.href.split("#")[0], { label: "Copy link" }),
    navigator.share
      ? el(
          "button",
          {
            class: "club-action",
            type: "button",
            onclick: () =>
              navigator
                .share({
                  title: document.title,
                  text: `${club.name} — SAC club record at IISER Kolkata`,
                  url: location.href.split("#")[0],
                })
                .catch(() => {}),
          },
          "Share"
        )
      : null,
    el("button", { class: "club-action", type: "button", onclick: () => window.print() }, "Print"),
    contact
      ? el(
          "a",
          { class: "club-action club-action--primary", href: contact.getAttribute("href") },
          "Email the club"
        )
      : null
  );
}

/** Fill the crests on the pager's "more from this body" chips. Chips are fixed-size boxes, so nothing moves. */
export function hydratePagerLogos(clubs) {
  const bySlug = new Map(clubs.map((c) => [c.slug, c]));
  for (const link of document.querySelectorAll(".club-pager a[data-logo-for]")) {
    const slug = link.dataset.logoFor;
    // the archive's logo, else the bundled crest from the registry
    const source = bySlug.get(slug)?.logo?.public_url ?? clubBySlug(slug)?.crest;
    const slot = link.querySelector(".club-pager__logo");
    if (!source || !slot) continue;
    slot.replaceChildren(
      el("img", {
        src: assetUrl(source),
        alt: "",
        loading: "lazy",
        decoding: "async",
        width: 44,
        height: 44,
      })
    );
  }
}
