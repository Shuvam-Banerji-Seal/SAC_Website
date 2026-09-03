/**
 * test/unit/caption.test.js — no "img 001" anywhere, ever.
 */
import { describe, it, expect } from "vitest";
import { captionFor, altTextFor, isGenericTitle } from "../../js/utils/caption.js";

const base = {
  title: "img 001",
  filename: "img_001.webp",
  club_name: "AARSHI - Drama Club",
  category_label: "Images extracted from AARSHI THE DRAMA CLUB",
  description: "Image extracted from a source document (DOCX/PDF), converted to WebP.",
  is_ob_portrait: false,
  is_event: false,
  is_iicm: false,
  is_logo: false,
  role: "extracted-image",
};

describe("caption util — kills untitled images", () => {
  it("detects pipeline-noise titles", () => {
    expect(isGenericTitle("img 001")).toBe(true);
    expect(isGenericTitle("img_010")).toBe(true);
    expect(isGenericTitle("page2 img1")).toBe(true);
    expect(isGenericTitle("DSC0718")).toBe(true);
    expect(isGenericTitle("ONA00621")).toBe(true);
    expect(isGenericTitle(null)).toBe(true);
    expect(isGenericTitle("Garba Night")).toBe(false);
    expect(isGenericTitle("IICM 25 Street Play")).toBe(false);
  });

  it("derives parent-doc plate for extracted images", () => {
    expect(captionFor(base)).toMatch(/AARSHI THE DRAMA CLUB · plate 1/i);
  });

  it("derives numbered plates from img_00N", () => {
    expect(captionFor({ ...base, filename: "img_029.webp" })).toMatch(/plate 29/);
  });

  it("prefers a real title when present", () => {
    expect(captionFor({ ...base, title: "Garba Mood" })).toBe("Garba Mood");
  });

  it("OB portrait leads with person + role", () => {
    const cap = captionFor({
      ...base,
      title: "img 002",
      is_ob_portrait: true,
      person: "Ankita Behera",
      ob_role: "Convenor",
    });
    expect(cap).toBe("Ankita Behera — Convenor");
  });

  it("role fallbacks for event / iicm / equipment", () => {
    expect(captionFor({ ...base, is_event: true })).toMatch(/Event photograph/i);
    expect(captionFor({ ...base, is_iicm: true })).toMatch(/IICM moment/i);
    expect(captionFor({ ...base, role: "equipment" })).toMatch(/Club equipment/i);
  });

  it("venue and competition context beat bare roles", () => {
    expect(captionFor({ ...base, is_event: true, venue: "Main Auditorium" })).toMatch(
      /Main Auditorium/
    );
    expect(captionFor({ ...base, is_event: true, competition: "Interbatch 2026" })).toMatch(
      /Interbatch 2026/
    );
  });

  it("cleaned filename is the last resort, never an extension", () => {
    const cap = captionFor({
      title: null,
      filename: "Rehersals_of_Annual_Drama_Production.webp",
      category_label: "Event photograph",
      club_name: "AARSHI",
    });
    expect(cap).not.toMatch(/\.webp/i);
    expect(cap.length).toBeGreaterThan(3);
  });

  it("never returns empty or generic for any known shape", () => {
    const shapes = [
      base,
      { ...base, title: null, category_label: null },
      { ...base, title: "photo" },
      null,
    ];
    for (const s of shapes) {
      const cap = captionFor(s);
      expect(cap).toBeTruthy();
      expect(cap).not.toMatch(/^img ?_?\d*$/i);
    }
  });

  it("altText skips doc-extraction boilerplate", () => {
    const alt = altTextFor(base);
    expect(alt).not.toMatch(/extracted from a source document/i);
    expect(alt.length).toBeGreaterThan(3);
  });
});

describe("caption util — camera stamps fall back to event folder names", () => {
  it("IMG2025… titles become the folder's event name", () => {
    const cap = captionFor({
      ...base,
      title: "IMG20251008202532",
      filename: "IMG20251008202532.webp",
      category_label: "Jhankaar — Classical Music event",
    });
    expect(cap).toBe("Jhankaar — Classical Music event");
  });

  it("DSC/ONA camera stamps also resolve to folder context", () => {
    const cap = captionFor({
      ...base,
      title: "ONA00621",
      category_label: "Rampage — Battle of Bands",
    });
    expect(cap).toBe("Rampage — Battle of Bands");
  });
});
