/**
 * utils/caption.js — human titles for every asset, no "img 001" anywhere.
 *
 * The asset pipeline gives extracted-from-doc images generic names
 * (img_001.webp -> "img 001", page2_img1 -> "page2 img1") — 400 of the 1,181
 * images in the map. This module derives a readable caption at render time
 * from what we DO know: the club, the parent document (category_label),
 * the event folder, the person, or the role. Shared by club-images, gallery,
 * events, and home so every thumb, lightbox, and strip reads like print.
 */

const GENERIC_TITLE_RE =
  /^(img ?_?\d*|img\d+|img[ _]?\d+[ _]?\d*|page\d* ?img\d*|dsc ?_?\d*|dsc\d+|ona\d+|pxl ?_?\d*|vid ?_?\d+|mg ?_?\d+([ _]?\d+)?|photo|image|untitled|new file|\d{3,4} ?_?[a-z]?|\d{8,}[ _-].*|\d+)\s*$/i;

/** True when the map title is pipeline noise rather than a real name. */
export function isGenericTitle(title) {
  if (!title) return true;
  return GENERIC_TITLE_RE.test(String(title).trim());
}

/** Short, human name of the parent document for extracted plates. */
/** Trim camera-stamp noise from a title: leading digit runs ("1000041954 -"),
 *  trailing "Copy N", bare "Copy". Returns "" when nothing human remains. */
function humanizedTitle(title) {
  if (!title) return "";
  const t = String(title)
    .replace(/^(\d{4,}[-_ ]*)+/g, "") // leading numeric stamps
    .replace(/([-_ ]*copy( of)?( \d+)?)+$/i, "") // trailing Copy/Copy 2/Copy of (repeated)
    .replace(/_+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  // what's left must be a real phrase: letters present AND not itself generic
  if (!t || !/[a-z]/i.test(t)) return "";
  return isGenericTitle(t) ? "" : t;
}

function parentDocName(asset) {
  const label = String(asset.category_label || "");
  const m = label.match(/extracted from (.+)$/i);
  if (m) return m[1].trim();
  return "";
}

/** Folder context: the event/category label ("Jhankaar — Classical Music event"). */
function folderContext(asset) {
  const label = String(asset.category_label || "").trim();
  if (!label || label === "(root)") return "";
  if (/^images extracted from/i.test(label)) return "";
  return label;
}

function roleLabel(asset) {
  if (asset.is_ob_portrait) return asset.person ? null : "Office bearer";
  if (asset.is_iicm) return "IICM moment";
  if (asset.is_event) return "Event photograph";
  if (asset.is_logo) return "Club crest";
  switch (asset.role) {
    case "equipment":
      return "Club equipment";
    case "portfolio":
      return "Member portfolio";
    case "outer-fest":
      return "Outer-fest moment";
    default:
      return null;
  }
}

/**
 * Derive the best display caption for an asset.
 * Priority: real title -> person (+role) -> role/venue/competition/year
 * -> parent-doc plate -> cleaned filename. Never returns "img 001".
 */
export function captionFor(asset) {
  if (!asset) return "SAC archive";

  const human = humanizedTitle(asset.title);
  if (human) return human; // numeric-stamp titles whose tail is a real name/phrase

  if (!isGenericTitle(asset.title) && asset.title) {
    return String(asset.title).trim();
  }

  if (asset.is_ob_portrait && asset.person) {
    return asset.ob_role ? `${asset.person} — ${asset.ob_role}` : String(asset.person);
  }

  const folder = folderContext(asset);
  if (folder) return folder;

  const bits = [];
  const role = roleLabel(asset);
  if (role) bits.push(role);
  if (asset.venue) bits.push(String(asset.venue).trim());
  else if (asset.competition) bits.push(String(asset.competition).trim());
  else if (asset.year) bits.push(String(asset.year));

  const doc = parentDocName(asset);
  if (doc) {
    const stem = String(asset.filename || "").replace(/\.[a-z0-9]+$/i, "");
    const plate = stem.match(/(\d+)$/);
    bits.push(`${doc} · plate ${plate ? Number(plate[1]) : 1}`);
  }

  if (bits.length) return bits.join(" · ");

  const base = String(asset.filename || "SAC image")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!isGenericTitle(base) && base) return base;
  if (asset.club === "Campus_Archive") return "Campus photograph";
  return `${asset.club_name || "SAC"} archive photograph`;
}

/** Alt text for accessibility: real description, else caption, else fallback. */
export function altTextFor(asset, fallback = "SAC archive photograph") {
  if (!asset) return fallback;
  const noisy =
    !asset.description ||
    /extracted from a source document/i.test(asset.description) ||
    /^club photograph\s*—/i.test(asset.description);
  return noisy ? captionFor(asset) || fallback : asset.description;
}
