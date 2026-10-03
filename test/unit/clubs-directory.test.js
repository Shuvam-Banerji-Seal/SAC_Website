/**
 * test/unit/clubs-directory.test.js — the Clubs page with its interest filter, end to end.
 *
 * Runs the real initClubs() against the real <main> of pages/clubs.html (so the generated
 * filter row is the one that ships), with only the archive's data stubbed.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

vi.mock("../../js/data.js", async () => {
  const { CLUBS } = await import("../../js/data/clubs.js");
  return {
    loadAssetsMap: async () => [],
    // one archive record per registry club: name + folder, no logo, no counts that matter
    indexByClub: () =>
      CLUBS.map((c) => ({
        slug: c.slug,
        name: c.name,
        logo: null,
        counts: { images: 0, markdowns: 0, media: 0 },
      })),
  };
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(root, "pages/clubs.html"), "utf-8");
const main = html.match(/<main>[\s\S]*<\/main>/)[0];

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};
const visible = () =>
  [...document.querySelectorAll(".club-card:not(.is-hidden)")].map((c) => c.dataset.clubName);
const chip = (id) => document.querySelector(`.interest-filter [data-interest="${id}"]`);
const type = (value) => {
  const input = document.getElementById("clubs-search");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

async function open(query = "") {
  window.history.replaceState(null, "", `/pages/clubs.html${query}`);
  document.body.innerHTML = main;
  vi.resetModules();
  const { initClubs } = await import("../../js/pages/clubs.js");
  await initClubs();
  await flush();
}

beforeEach(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("the directory without a filter", () => {
  it("lists every club, plus the one whose records are still to come", async () => {
    await open();
    const { CLUBS, PENDING_CLUBS } = await import("../../js/data/clubs.js");
    expect(document.querySelectorAll(".club-card")).toHaveLength(
      CLUBS.length + PENDING_CLUBS.length
    );
    expect(document.querySelectorAll(".club-card.is-hidden")).toHaveLength(0);
  });

  it("starts with nothing pressed and no 'Show all' button", async () => {
    await open();
    for (const b of document.querySelectorAll(".interest-filter [data-interest]")) {
      expect(b.getAttribute("aria-pressed")).toBe("false");
    }
    expect(document.querySelector(".interest-filter__clear").hidden).toBe(true);
    expect(document.querySelector(".clubs-search-count")).toBeNull();
  });

  it("gives every card its interests and keywords from the registry (pending club included)", async () => {
    await open();
    const spic = document.querySelector('[data-club-slug="spicmacay"]');
    expect(spic.dataset.clubInterests).toBe("performing");
    expect(spic.dataset.clubKeywords).toContain("classical");
    for (const card of document.querySelectorAll(".club-card")) {
      expect(card.dataset.clubInterests, card.dataset.clubName).not.toBe("");
    }
  });
});

describe("arriving from a home-page chip (?interest=…)", () => {
  it("shows only that interest's clubs and presses its chip", async () => {
    await open("?interest=sport");
    const { LISTED_CLUBS } = await import("../../js/data/clubs.js");
    const expected = LISTED_CLUBS.filter((c) => c.interests.includes("sport")).length;
    expect(visible()).toHaveLength(expected);
    expect(chip("sport").getAttribute("aria-pressed")).toBe("true");
    expect(chip("games").getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector(".interest-filter__clear").hidden).toBe(false);
  });

  it("hides the bodies with nothing to show, and counts what is showing", async () => {
    await open("?interest=sport");
    expect(document.getElementById("body-sports").classList.contains("is-hidden")).toBe(false);
    expect(document.getElementById("body-food").classList.contains("is-hidden")).toBe(true);
    const shown = document.querySelectorAll("#body-sports .club-card:not(.is-hidden)").length;
    expect(document.querySelector("#body-sports .clubs-body__count").textContent).toBe(
      String(shown)
    );
    // the jump bar follows: no chip for a body that is not showing
    expect(document.querySelector('[data-target="body-food"]').parentElement.hidden).toBe(true);
    expect(
      document.querySelector('[data-target="body-sports"] .section-nav__count').textContent
    ).toBe(String(shown));
  });

  it("reports how many are showing, politely", async () => {
    await open("?interest=sport");
    const counter = document.querySelector(".clubs-search-count");
    expect(counter.getAttribute("aria-live")).toBe("polite");
    expect(counter.textContent).toMatch(/^\d+ of \d+ clubs$/);
  });

  it("shows the pending club under the interest it declares", async () => {
    await open("?interest=performing");
    expect(visible().some((n) => /spicmacay/.test(n))).toBe(true);
  });

  it("ignores a made-up interest and shows everything", async () => {
    await open("?interest=nonsense");
    expect(document.querySelectorAll(".club-card.is-hidden")).toHaveLength(0);
    expect(document.querySelector(".interest-filter__clear").hidden).toBe(true);
  });
});

describe("pressing the chips", () => {
  it("filters, puts the interest in the address, and un-filters on a second press", async () => {
    await open();
    chip("games").click();
    expect(window.location.search).toBe("?interest=games");
    expect(chip("games").getAttribute("aria-pressed")).toBe("true");
    const n = visible().length;
    expect(n).toBeLessThan(document.querySelectorAll(".club-card").length);
    expect(n).toBeGreaterThan(0);

    chip("games").click();
    expect(window.location.search).toBe("");
    expect(visible()).toHaveLength(document.querySelectorAll(".club-card").length);
    expect(chip("games").getAttribute("aria-pressed")).toBe("false");
  });

  it("switches from one interest straight to another", async () => {
    await open("?interest=sport");
    chip("words").click();
    expect(window.location.search).toBe("?interest=words");
    expect(chip("sport").getAttribute("aria-pressed")).toBe("false");
    expect(chip("words").getAttribute("aria-pressed")).toBe("true");
  });

  it("'Show all' clears it", async () => {
    await open("?interest=sport");
    document.querySelector(".interest-filter__clear").click();
    expect(window.location.search).toBe("");
    expect(document.querySelectorAll(".club-card.is-hidden")).toHaveLength(0);
    expect(document.querySelector(".interest-filter__clear").hidden).toBe(true);
  });
});

describe("together with the text search", () => {
  it("narrows the chosen interest further", async () => {
    await open("?interest=games");
    const before = visible().length;
    type("chess");
    expect(visible()).toHaveLength(1);
    expect(before).toBeGreaterThan(1);
  });

  it("finds nothing when they disagree, and says so", async () => {
    await open("?interest=sport");
    type("astronomy");
    expect(visible()).toHaveLength(0);
    expect(document.querySelector(".clubs-no-results")).not.toBeNull();
    type("");
    expect(document.querySelector(".clubs-no-results")).toBeNull();
  });

  it("now finds a club by what it does, not only its name", async () => {
    await open();
    type("telescope");
    expect(visible()).toEqual([expect.stringMatching(/singularity/)]);
  });

  it("matches several words in any order", async () => {
    await open();
    type("club drama");
    expect(visible()).toEqual([expect.stringMatching(/aarshi/)]);
  });

  it("clearing the box leaves the interest in force", async () => {
    await open("?interest=sport");
    const n = visible().length;
    type("cricket");
    expect(visible()).toHaveLength(1);
    type("");
    expect(visible()).toHaveLength(n);
  });
});

describe("the generated filter row", () => {
  it("is in the shipped page, before the grid it filters, so it costs no layout shift", () => {
    expect(html.indexOf("clubs-filter:start")).toBeLessThan(html.indexOf('id="clubs-grid"'));
    expect(html.indexOf("clubs-search-wrap")).toBeLessThan(html.indexOf("clubs-filter:start"));
  });

  it("is exactly what the generator writes", async () => {
    const { buildInterestFilter } = await import("../../tools/sync-pages.mjs");
    const block = html.match(/<!-- clubs-filter:start[\s\S]*?<!-- clubs-filter:end -->/)[0];
    expect(block).toBe(buildInterestFilter().trim());
  });

  it("is styled for touch: chips and the clear button are at least 44px tall", () => {
    const css = readFileSync(resolve(root, "css/pages/clubs.css"), "utf-8");
    expect(css).toMatch(/\.interest-filter__chip\s*{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.interest-filter__clear\s*{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.interest-filter__chip\[aria-pressed="true"\]/);
  });
});
