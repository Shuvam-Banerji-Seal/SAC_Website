/**
 * utils/search-index.js — what the site search knows, and how it ranks.
 *
 * Pure: no DOM, no network. The index is built from the club registry
 * (js/data/clubs.js), the Council's five bodies, and the site's pages, so a new
 * club is searchable the moment it is in the registry.
 *
 * Ranking is deliberately simple and predictable:
 *   - every word you type must match something (AND), so adding a word narrows;
 *   - a match at the start of a word in the title beats a match inside it, which
 *     beats a match in keywords, which beats the body/interest labels;
 *   - one slip is forgiven ("athlatics", "quizz") for words of 4+ letters;
 *   - clubs and pages outrank sections on a tie, and shorter titles win last.
 */
import { CLUBS, BODIES, INTERESTS, bodyById } from "../data/clubs.js";
import { NAV_ITEMS } from "../config.js";

/** What people type for each top-level page, beyond its name. */
const PAGE_KEYWORDS = {
  home: "front page chronicle landing calendar",
  about: "council who we are structure elected",
  clubs: "directory societies committees all clubs",
  events: "timeline past events fests competitions",
  gallery: "photos pictures photographs images videos",
  "campus-life": "campus places buildings library hostel canteen staff archive",
};

const interestLabel = (id) => INTERESTS.find((i) => i.id === id)?.label ?? id;

/** lower-case, accents folded, punctuation to spaces: "Rubik's Cube" → "rubik s cube" */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const tokenize = (query) => normalize(query).split(" ").filter(Boolean);

/** One edit (insert, delete, substitute or swap) apart? Cheap bounded check. */
export function withinOneEdit(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (i === la || i === lb) return Math.abs(la - lb) <= 1; // one is a prefix of the other
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // swap
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * How well one query word matches one field (already normalised), 0 = no match.
 * `weight` is the field's importance; the match kind scales it.
 */
function matchWord(token, field, weight, { repeats = false } = {}) {
  if (!field) return 0;
  const words = field.split(" ");
  const starts = words.filter((w) => w.startsWith(token)).length;
  if (starts) {
    // `repeats`: a label that matches twice ("SAC Sports" body AND "Sport & fitness" interest)
    // is a better answer to "sport" than one that matches once (a mind-games club in that body)
    return repeats ? weight * (1 + 0.5 * Math.min(starts - 1, 2)) : weight; // start of a word
  }
  if (token.length >= 3 && field.includes(token)) return weight * 0.55; // inside a word
  if (token.length >= 4 && words.some((w) => w.length >= 4 && withinOneEdit(token, w))) {
    return weight * 0.4; // a slip
  }
  return 0;
}

/** @typedef {{kind: "club"|"page"|"section", title: string, href: string, meta: string, fields: {title: string, short: string, keywords: string, labels: string}}} Entry */

/** The whole searchable set. Cheap (~45 rows) — built once per call site. */
export function buildIndex() {
  const clubs = CLUBS.map((c) => ({
    kind: "club",
    title: c.name,
    href: c.page,
    meta: [bodyById(c.body).label, ...c.interests.map(interestLabel)].join(" · "),
    fields: {
      title: normalize(c.name),
      short: normalize(c.short),
      keywords: normalize(c.keywords),
      labels: normalize([bodyById(c.body).label, ...c.interests.map(interestLabel)].join(" ")),
    },
  }));
  const sections = BODIES.map((b) => ({
    kind: "section",
    title: b.label,
    href: `pages/clubs.html#body-${b.id}`,
    meta: "A body of the Council",
    fields: {
      title: normalize(b.label),
      short: normalize(b.label.replace(/^SAC /, "")),
      keywords: normalize(b.blurb),
      labels: "",
    },
  }));
  const pages = NAV_ITEMS.map((p) => ({
    kind: "page",
    title: p.label,
    href: p.href,
    meta: "Page",
    fields: {
      title: normalize(p.label),
      // aliases are what people call the page, so they weigh like a club's short name;
      // as plain keywords "photos" ranked the Pixel club above the Gallery
      short: normalize(PAGE_KEYWORDS[p.id] ?? ""),
      keywords: "",
      labels: "",
    },
  }));
  return [...clubs, ...pages, ...sections];
}

const KIND_BIAS = { club: 3, page: 2, section: 0 };

/**
 * Score one entry for a list of query words; 0 means "does not match".
 * Every word has to match something, or the entry is out.
 */
export function scoreEntry(entry, tokens) {
  let total = 0;
  for (const token of tokens) {
    const best = Math.max(
      matchWord(token, entry.fields.title, 100),
      matchWord(token, entry.fields.short, 90),
      matchWord(token, entry.fields.keywords, 55),
      matchWord(token, entry.fields.labels, 25, { repeats: true })
    );
    if (!best) return 0;
    total += best;
  }
  return total + KIND_BIAS[entry.kind];
}

/**
 * Ranked results for a query. An empty query returns [] (the caller shows suggestions).
 * @returns {Entry[]}
 */
export function search(query, { limit = 12, index = buildIndex() } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
    .slice(0, limit)
    .map((r) => r.entry);
}

/** Clubs for an interest — what the empty-state chips return. */
export function clubsForInterest(id) {
  return CLUBS.filter((c) => c.interests.includes(id));
}

/**
 * Split `text` around the query words, for highlighting: returns [{text, hit}].
 * Matches whole-prefix occurrences case- and accent-insensitively without altering the text.
 */
export function highlight(text, tokens) {
  if (!tokens.length) return [{ text, hit: false }];
  const lower = normalize(text);
  // normalisation can change length (accents, punctuation); only highlight when it maps 1:1
  if (
    lower.replace(/ /g, "").length !==
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "").length
  ) {
    return [{ text, hit: false }];
  }
  const spans = [];
  const plain = String(text);
  for (const token of tokens) {
    const re = new RegExp(`(^|[^a-z0-9])(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    let m;
    while ((m = re.exec(plain)) !== null)
      spans.push([m.index + m[1].length, m.index + m[1].length + m[2].length]);
  }
  if (!spans.length) return [{ text, hit: false }];
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of spans) {
    const last = merged.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const parts = [];
  let at = 0;
  for (const [s, e] of merged) {
    if (s > at) parts.push({ text: plain.slice(at, s), hit: false });
    parts.push({ text: plain.slice(s, e), hit: true });
    at = e;
  }
  if (at < plain.length) parts.push({ text: plain.slice(at), hit: false });
  return parts;
}
