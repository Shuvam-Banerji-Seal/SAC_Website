/**
 * test/unit/club-filter.test.js — the Clubs directory's text + interest filter, as pure rules.
 */
import { describe, it, expect, vi } from "vitest";
import {
  validInterest,
  interestFromSearch,
  cardMatches,
  setInterestParam,
  tokenize,
} from "../../js/utils/club-filter.js";
import { INTERESTS, LISTED_CLUBS, countForInterest } from "../../js/data/clubs.js";

const card = (over = {}) => ({
  name: "Singularity — The Astronomy Club",
  slug: "singularity_astro_club",
  body: "academics",
  keywords: "astronomy astrophysics stars telescope space observatory",
  interests: ["science"],
  ...over,
});

describe("interest from the address", () => {
  it("accepts every interest the registry defines", () => {
    for (const { id } of INTERESTS) expect(interestFromSearch(`?interest=${id}`)).toBe(id);
  });

  it("ignores an unknown, empty or missing interest instead of filtering everything away", () => {
    expect(interestFromSearch("?interest=nonsense")).toBeNull();
    expect(interestFromSearch("?interest=")).toBeNull();
    expect(interestFromSearch("")).toBeNull();
    expect(interestFromSearch("?other=sport")).toBeNull();
    expect(validInterest(undefined)).toBeNull();
  });

  it("keeps other query parameters out of the way", () => {
    expect(interestFromSearch("?x=1&interest=sport&y=2")).toBe("sport");
  });
});

describe("cardMatches", () => {
  it("passes everything when nothing is asked", () => {
    expect(cardMatches(card(), [], null)).toBe(true);
  });

  it("requires the interest when one is chosen", () => {
    expect(cardMatches(card(), [], "science")).toBe(true);
    expect(cardMatches(card(), [], "sport")).toBe(false);
    expect(cardMatches(card({ interests: [] }), [], "science")).toBe(false);
  });

  it("requires every typed word, in any order, anywhere in the name, body or keywords", () => {
    expect(cardMatches(card(), tokenize("astronomy club"), null)).toBe(true);
    expect(cardMatches(card(), tokenize("club astronomy"), null)).toBe(true);
    expect(cardMatches(card(), tokenize("telescope"), null)).toBe(true); // a keyword, not in the name
    expect(cardMatches(card(), tokenize("academics"), null)).toBe(true);
    expect(cardMatches(card(), tokenize("astronomy football"), null)).toBe(false);
  });

  it("ignores case and accents, and matches the folder name with its underscores", () => {
    expect(cardMatches(card(), tokenize("ASTRONOMY"), null)).toBe(true);
    expect(cardMatches(card({ name: "Café Club" }), tokenize("cafe"), null)).toBe(true);
    expect(cardMatches(card(), tokenize("astro club"), null)).toBe(true);
  });

  it("combines the interest and the text (both must hold)", () => {
    expect(cardMatches(card(), tokenize("telescope"), "science")).toBe(true);
    expect(cardMatches(card(), tokenize("telescope"), "sport")).toBe(false);
    expect(cardMatches(card(), tokenize("football"), "science")).toBe(false);
  });
});

describe("the address bar", () => {
  const fakeWindow = (href) => {
    const win = { location: { href }, history: { state: { s: 1 }, replaceState: vi.fn() } };
    return win;
  };

  it("puts the interest in, without adding a history entry, keeping the rest of the URL", () => {
    const win = fakeWindow("https://x.test/pages/clubs.html?q=1#body-sports");
    setInterestParam("sport", win);
    const [state, , url] = win.history.replaceState.mock.calls[0];
    expect(state).toEqual({ s: 1 });
    expect(String(url)).toBe("https://x.test/pages/clubs.html?q=1&interest=sport#body-sports");
  });

  it("takes it out again", () => {
    const win = fakeWindow("https://x.test/pages/clubs.html?interest=sport");
    setInterestParam(null, win);
    expect(String(win.history.replaceState.mock.calls[0][2])).toBe(
      "https://x.test/pages/clubs.html"
    );
  });
});

describe("the counts on the chips", () => {
  it("count the clubs the directory lists, including those whose records are still to come", () => {
    for (const { id } of INTERESTS) {
      expect(countForInterest(id)).toBe(
        LISTED_CLUBS.filter((c) => c.interests.includes(id)).length
      );
    }
    // SPICMACAY has no page yet but is a card in the directory, so it is counted
    expect(LISTED_CLUBS.length).toBeGreaterThan(32);
    expect(countForInterest("performing")).toBeGreaterThan(
      LISTED_CLUBS.filter((c) => c.page && c.interests.includes("performing")).length
    );
  });

  it("give every interest at least one club", () => {
    for (const { id } of INTERESTS) expect(countForInterest(id), id).toBeGreaterThan(0);
  });
});
