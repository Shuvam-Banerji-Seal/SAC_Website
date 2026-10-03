/**
 * utils/club-filter.js — which directory cards a search and an interest leave visible.
 *
 * Pure (no DOM, no network) so the rules are testable. Used by pages/clubs.js, which applies
 * them to the cards; the home page's interest chips arrive there as ?interest=<id>.
 *
 *   text      every word typed must appear somewhere in the club's name, folder name, body or
 *             keywords ("drama club" and "telescope" both work; accents and case are ignored)
 *   interest  the club must list that interest; none selected means all
 */
import { INTERESTS } from "../data/clubs.js";
import { normalize, tokenize } from "./search-index.js";

/** The interest id if it is one we know, else null — a hand-edited ?interest=nonsense is ignored. */
export const validInterest = (id) => (INTERESTS.some((i) => i.id === id) ? id : null);

/** `?interest=sport` → "sport". Takes location.search (or any query string). */
export const interestFromSearch = (search) =>
  validInterest(new URLSearchParams(search).get("interest"));

/**
 * Does a card pass? `card` is the data the page keeps on it: { name, slug, body, keywords, interests }.
 * @param {string[]} tokens  from tokenize(query)
 * @param {string|null} interest
 */
export function cardMatches(card, tokens, interest = null) {
  if (interest && !card.interests.includes(interest)) return false;
  if (!tokens.length) return true;
  const haystack = normalize(`${card.name} ${card.slug} ${card.body} ${card.keywords}`);
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Put the interest in the address bar (or take it out) without adding a history entry, so a
 * filtered view can be shared and the Back button still leaves the page.
 */
export function setInterestParam(id, win = window) {
  const url = new URL(win.location.href);
  if (id) url.searchParams.set("interest", id);
  else url.searchParams.delete("interest");
  win.history.replaceState(win.history.state, "", url);
}

export { tokenize };
