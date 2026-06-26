/**
 * test/unit/home-excerpt.test.js — tests for the excerpt extraction
 * logic in js/pages/home.js.
 *
 * The extractExcerpt function pulls the first decent prose paragraph
 * from a markdown document, trimming to a sentence boundary.
 */
import { describe, it, expect } from "vitest";

// We import only the extractExcerpt function. Since home.js has
// side-effecty imports (data.js does a fetch), we mock those.
vi.mock("../../js/data.js", () => ({
  loadAssetsMap: () => Promise.resolve([]),
  indexByClub: () => [],
}));
vi.mock("../../js/utils/dom.js", () => ({
  el: (tag, attrs, ...children) => {
    const node = document.createElement(tag);
    if (attrs)
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else node.setAttribute(k, v);
      }
    for (const c of children) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    }
    return node;
  },
  pageUrl: (p) => p,
}));

import { vi } from "vitest";
const { extractExcerpt } = await import("../../js/pages/home.js");

describe("extractExcerpt", () => {
  it("returns empty string for null/undefined input", () => {
    expect(extractExcerpt(null)).toBe("");
    expect(extractExcerpt(undefined)).toBe("");
    expect(extractExcerpt("")).toBe("");
  });

  it("skips markdown headings and returns first prose paragraph", () => {
    const md = `# Club Title\n\n## Introduction\n\nThis is the first paragraph about the club. It has enough text to pass the minimum length check.`;
    const result = extractExcerpt(md);
    expect(result).toContain("This is the first paragraph");
    expect(result.length).toBeLessThanOrEqual(240);
  });

  it("skips image references", () => {
    const md = `![](image.png)\n\nThis is a real paragraph with enough text to pass the minimum threshold for extraction.`;
    expect(extractExcerpt(md)).toContain("This is a real paragraph");
  });

  it("skips table rows", () => {
    const md = `| Name | Role |\n|---|---|\n| John | President |\n\nThis is a real paragraph with enough text to pass the minimum threshold for extraction.`;
    expect(extractExcerpt(md)).toContain("This is a real paragraph");
  });

  it("skips ALL-CAPS section labels", () => {
    const md = `INTRODUCTION :\n\nThis is a real paragraph with enough text to pass the minimum threshold for extraction.`;
    expect(extractExcerpt(md)).toContain("This is a real paragraph");
  });

  it("trims to sentence boundary at 240 chars", () => {
    const long = "This is a sentence. " + "This is more text. ".repeat(30);
    const result = extractExcerpt(long);
    expect(result.length).toBeLessThanOrEqual(240);
    expect(result.endsWith(".") || result.endsWith("…")).toBe(true);
  });

  it("skips lines shorter than 30 chars", () => {
    const md = `Short.\n\nThis is a real paragraph with enough text to pass the minimum threshold for extraction.`;
    expect(extractExcerpt(md)).toContain("This is a real paragraph");
  });

  it("returns empty string when no valid paragraph found", () => {
    const md = `# Only a heading\n\n![](image.png)\n\n| table | row |`;
    expect(extractExcerpt(md)).toBe("");
  });
});
