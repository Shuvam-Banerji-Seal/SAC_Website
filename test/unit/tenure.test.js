/**
 * Current-office-bearer policy (Sep 2026): club pages carry only the present
 * committee. Historical "Previous/Past Office Bearers" sections were removed,
 * and portrait grids filter out explicitly past tenures via isCurrentTenure().
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { isCurrentTenure } from "../../js/utils/tenure.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const read = (rel) => readFileSync(resolve(root, "." + rel), "utf-8");

describe("isCurrentTenure", () => {
  it("keeps portraits dated 2026 or the 26-27 tenure", () => {
    expect(isCurrentTenure({ year: 2026, tenure: "26-27" })).toBe(true);
    expect(isCurrentTenure({ year: 2026, tenure: null })).toBe(true);
    expect(isCurrentTenure({ tenure: "26-27", year: null })).toBe(true);
  });

  it("drops portraits from earlier tenures", () => {
    expect(isCurrentTenure({ year: 2025, tenure: "25-26" })).toBe(false);
    expect(isCurrentTenure({ tenure: "25-26", year: null })).toBe(false);
    expect(isCurrentTenure({ tenure: "20-21", year: null })).toBe(false);
    expect(isCurrentTenure({ year: 2024 })).toBe(false);
  });

  it("presumes undated portraits are current", () => {
    expect(isCurrentTenure({ year: null, tenure: null })).toBe(true);
    expect(isCurrentTenure({})).toBe(true);
    expect(isCurrentTenure(null)).toBe(true);
  });
});

describe("club pages carry no historical OB sections", () => {
  const pages = readdirSync(resolve(root, "pages")).filter((f) => f.endsWith(".html"));

  it("no page has a Previous/Past Office Bearers heading", () => {
    const offenders = pages.filter((f) => {
      const html = read(`/pages/${f}`);
      return /<h2[^>]*>[^<]*(Previous|Past) Office Bearers/i.test(html);
    });
    expect(offenders).toEqual([]);
  });

  it("pages that once carried history still show their present OB table", () => {
    const stripped = [
      "aarshi.html",
      "arts.html",
      "ikqc.html",
      "literary.html",
      "movie.html",
      "music.html",
      "nature.html",
      "nrutya.html",
      "pixel.html",
      "radio.html",
      "kho-kho.html",
      "slashdot.html",
    ];
    for (const file of stripped) {
      expect(read(`/pages/${file}`), `${file} lost its current OB section`).toContain(
        "Office Bearers"
      );
    }
  });
});
