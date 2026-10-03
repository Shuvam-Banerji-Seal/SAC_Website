/**
 * test/unit/search-index.test.js — the site search ranks predictably and covers every club.
 *
 * The index is built from the club registry, so the most important test here is the
 * last group: every club in the registry can be found by its own name and its own
 * short name. Add a club and forget its keywords, and this tells you.
 */
import { describe, it, expect } from "vitest";
import {
  normalize,
  tokenize,
  withinOneEdit,
  buildIndex,
  scoreEntry,
  search,
  clubsForInterest,
  highlight,
} from "../../js/utils/search-index.js";
import { CLUBS, BODIES, INTERESTS } from "../../js/data/clubs.js";

describe("normalize / tokenize", () => {
  it("lower-cases, folds accents and turns punctuation into spaces", () => {
    expect(normalize("Rubik's  Cube")).toBe("rubik s cube");
    expect(normalize("Café — Zürich")).toBe("cafe zurich");
    expect(normalize(null)).toBe("");
  });

  it("splits a query into words", () => {
    expect(tokenize("  Dance,  club! ")).toEqual(["dance", "club"]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("withinOneEdit", () => {
  it("allows one insertion, deletion, substitution or swap", () => {
    expect(withinOneEdit("chess", "chess")).toBe(true);
    expect(withinOneEdit("chesss", "chess")).toBe(true);
    expect(withinOneEdit("chss", "chess")).toBe(true);
    expect(withinOneEdit("chass", "chess")).toBe(true);
    expect(withinOneEdit("chses", "chess")).toBe(true);
  });

  it("refuses two edits and big length gaps", () => {
    expect(withinOneEdit("chaas", "chess")).toBe(false);
    expect(withinOneEdit("ches", "chessboard")).toBe(false);
    expect(withinOneEdit("abc", "abcde")).toBe(false);
  });
});

describe("ranking", () => {
  const index = buildIndex();
  const top = (q) => search(q, { index })[0];

  it("returns nothing for an empty query", () => {
    expect(search("", { index })).toEqual([]);
    expect(search("   ", { index })).toEqual([]);
  });

  it("puts the club whose name starts with the word first", () => {
    expect(top("chess").title).toMatch(/chess/i);
    expect(top("drama").href).toBe("pages/aarshi.html");
  });

  it("finds a club through its keywords, not only its name", () => {
    // the Astronomy club is called Singularity; nobody types that to find it
    expect(top("telescope").title).toMatch(/singularity/i);
    expect(top("coding").title).toMatch(/slashdot/i);
  });

  it("every word has to match (AND), so more words narrow the list", () => {
    const one = search("club", { index, limit: 100 }).length;
    const two = search("club dance", { index, limit: 100 }).length;
    expect(two).toBeGreaterThan(0);
    expect(two).toBeLessThan(one);
    expect(search("chess xyzzyplugh", { index })).toEqual([]);
  });

  it("forgives one slip in a word of four letters or more", () => {
    expect(top("chees")?.title ?? "").toMatch(/chess/i);
    expect(search("athlatics", { index }).some((e) => /athletics/i.test(e.title))).toBe(true);
  });

  it("does not guess at very short words", () => {
    expect(search("zq", { index })).toEqual([]);
  });

  it("is accent- and case-insensitive", () => {
    expect(search("CHÉSS", { index })[0]?.title).toMatch(/chess/i);
  });

  it("honours the limit", () => {
    expect(search("club", { index, limit: 3 })).toHaveLength(3);
  });

  it("lets a club beat a section on an equal match", () => {
    const club = { kind: "club", fields: { title: "x", short: "", keywords: "", labels: "" } };
    const section = {
      kind: "section",
      fields: { title: "x", short: "", keywords: "", labels: "" },
    };
    expect(scoreEntry(club, ["x"])).toBeGreaterThan(scoreEntry(section, ["x"]));
  });

  it("ranks a club that is about the word above one that merely sits in that body", () => {
    // "sport": Badminton is Sport & fitness inside SAC Sports; Chess is Mind games inside SAC Sports
    const clubs = search("sport", { index, limit: 40 }).filter((e) => e.kind === "club");
    const sport = new Set(clubsForInterest("sport").map((c) => c.page));
    const firstOther = clubs.findIndex((e) => !sport.has(e.href));
    const lastSport = clubs.findLastIndex((e) => sport.has(e.href));
    expect(firstOther === -1 || lastSport < firstOther).toBe(true);
  });

  it("finds the site's own pages", () => {
    expect(top("gallery").href).toBe("pages/gallery.html");
    expect(top("photos").href).toBe("pages/gallery.html");
  });
});

describe("interests", () => {
  it("lists clubs for every interest the registry defines", () => {
    for (const interest of INTERESTS) {
      expect(clubsForInterest(interest.id).length, interest.id).toBeGreaterThan(0);
    }
  });
});

describe("highlight", () => {
  it("marks the start of each matched word", () => {
    const parts = highlight("Chess Club", ["che"]);
    expect(parts).toEqual([
      { text: "Che", hit: true },
      { text: "ss Club", hit: false },
    ]);
  });

  it("marks several words and merges overlaps", () => {
    const parts = highlight("Dance Club", ["da", "dance"]);
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["Dance"]);
  });

  it("leaves text alone when nothing matches or there is no query", () => {
    expect(highlight("Chess Club", ["zzz"])).toEqual([{ text: "Chess Club", hit: false }]);
    expect(highlight("Chess Club", [])).toEqual([{ text: "Chess Club", hit: false }]);
  });

  it("never alters the text it was given", () => {
    const text = "AARSHI — Drama Club";
    expect(
      highlight(text, ["dra"])
        .map((p) => p.text)
        .join("")
    ).toBe(text);
  });

  it("escapes characters that mean something in a regular expression", () => {
    expect(() => highlight("C++ Club", ["c+"])).not.toThrow();
  });
});

describe("coverage of the registry", () => {
  const index = buildIndex();

  it("indexes every club, body and top-level page", () => {
    expect(index.filter((e) => e.kind === "club")).toHaveLength(CLUBS.length);
    expect(index.filter((e) => e.kind === "section")).toHaveLength(BODIES.length);
    expect(index.filter((e) => e.kind === "page").length).toBeGreaterThanOrEqual(6);
  });

  it("finds each club by its full name", () => {
    for (const club of CLUBS) {
      const hit = search(club.name, { index, limit: 3 }).find((e) => e.href === club.page);
      expect(hit, `${club.name} is not in the top 3 for its own name`).toBeTruthy();
    }
  });

  it("finds each club by what people call it", () => {
    for (const club of CLUBS) {
      const hit = search(club.short, { index, limit: 5 }).find((e) => e.href === club.page);
      expect(
        hit,
        `${club.short} (${club.slug}) is not in the top 5 for its short name`
      ).toBeTruthy();
    }
  });

  it("gives every result a destination", () => {
    for (const entry of index) {
      expect(entry.href, entry.title).toMatch(/\.html(#.+)?$/);
    }
  });
});
