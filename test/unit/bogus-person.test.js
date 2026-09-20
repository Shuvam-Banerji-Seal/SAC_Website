/**
 * Regression: the "bogus person" heuristic is used to badge office-bearer
 * portraits with "verify name". Its camera-prefix pattern was unanchored, so
 * a real name starting with those letters — "Vidhi Bhushan" (VID), a "Sri"
 * first name — was wrongly badged. Prefixes must look like stamps.
 */
import { describe, it, expect } from "vitest";
import { isBogusPerson } from "../../js/pages/club-images.js";

describe("isBogusPerson", () => {
  it("accepts real names that merely start with a camera-prefix letter run", () => {
    expect(isBogusPerson("Vidhi Bhushan")).toBe(false);
    expect(isBogusPerson("Vidya Sagar")).toBe(false);
    expect(isBogusPerson("Sriram Rao")).toBe(false);
    expect(isBogusPerson("Abhinandan Yadav")).toBe(false);
    expect(isBogusPerson("Chhandak Dutta")).toBe(false);
  });

  it("flags camera/library stamps", () => {
    expect(isBogusPerson("IMG 20250101")).toBe(true);
    expect(isBogusPerson("IMG20250101")).toBe(true);
    expect(isBogusPerson("DSC_1234")).toBe(true);
    expect(isBogusPerson("PXL-20250101")).toBe(true);
    expect(isBogusPerson("VID_20250101_123")).toBe(true);
    expect(isBogusPerson("VID0012")).toBe(true);
    expect(isBogusPerson("OBs 25")).toBe(true);
    expect(isBogusPerson("sri")).toBe(true);
  });

  it("flags digit-led, tenure-stamp, and raw filename leftovers", () => {
    expect(isBogusPerson("25_26_OBs_00")).toBe(true);
    expect(isBogusPerson("1000041954 Adarsh Singh Copy")).toBe(true);
    expect(isBogusPerson("WhatsApp_Image_2026_very_long_name")).toBe(true);
  });

  it("treats empty and too-short values as missing, not bogus", () => {
    expect(isBogusPerson("")).toBe(false);
    expect(isBogusPerson(null)).toBe(false);
    expect(isBogusPerson("ab")).toBe(true);
  });
});
