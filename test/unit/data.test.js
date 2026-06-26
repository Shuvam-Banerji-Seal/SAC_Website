/**
 * test/unit/data.test.js — tests for js/data.js
 *
 * Tests the assets_map.jsonl loading, indexing by club, and
 * logo detection logic.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the dom.js isInPagesDir function
vi.mock("../../js/utils/dom.js", () => ({
  isInPagesDir: () => false,
}));

describe("data module", () => {
  beforeEach(() => {
    // Reset the module cache so fetchJsonl creates a fresh promise
    vi.resetModules();
  });

  it("indexByClub groups entries by club and returns sorted array", async () => {
    const mockAssets = [
      {
        club: "Nrutya",
        club_name: "Nrutya - Dance Club",
        file_type: "image",
        is_markdown_content: false,
      },
      {
        club: "AARSHI",
        club_name: "AARSHI - Drama Club",
        file_type: "image",
        is_markdown_content: false,
      },
      {
        club: "AARSHI",
        club_name: "AARSHI - Drama Club",
        file_type: "markdown",
        is_markdown_content: true,
      },
    ];

    const { indexByClub } = await import("../../js/data.js");
    const clubs = indexByClub(mockAssets);

    expect(clubs).toHaveLength(2);
    // Should be sorted alphabetically by name
    expect(clubs[0].name).toBe("AARSHI - Drama Club");
    expect(clubs[1].name).toBe("Nrutya - Dance Club");
    // AARSHI should have 2 total, 1 image, 1 markdown
    expect(clubs[0].counts.total).toBe(2);
    expect(clubs[0].counts.images).toBe(1);
    expect(clubs[0].counts.markdowns).toBe(1);
    expect(clubs[0].markdown).toBeTruthy();
  });

  it("pickLogo prefers is_logo flag", async () => {
    const mockAssets = [
      {
        club: "X",
        club_name: "X Club",
        file_type: "image",
        filename: "random.webp",
        path: "X/random.webp",
        is_logo: false,
      },
      {
        club: "X",
        club_name: "X Club",
        file_type: "image",
        filename: "logo.webp",
        path: "X/Logo/logo.webp",
        is_logo: true,
      },
    ];

    const { indexByClub } = await import("../../js/data.js");
    const clubs = indexByClub(mockAssets);
    expect(clubs[0].logo).toBeTruthy();
    expect(clubs[0].logo.is_logo).toBe(true);
  });

  it("pickLogo falls back to path matching when no is_logo flag", async () => {
    const mockAssets = [
      {
        club: "X",
        club_name: "X Club",
        file_type: "image",
        filename: "photo.webp",
        path: "X/Photos/photo.webp",
        is_logo: false,
      },
      {
        club: "X",
        club_name: "X Club",
        file_type: "image",
        filename: "crest.webp",
        path: "X/Logo/crest.webp",
        is_logo: false,
      },
    ];

    const { indexByClub } = await import("../../js/data.js");
    const clubs = indexByClub(mockAssets);
    expect(clubs[0].logo).toBeTruthy();
    expect(clubs[0].logo.path).toContain("Logo");
  });

  it("getClubEntries filters by club slug", async () => {
    const mockAssets = [
      { club: "A", club_name: "A Club", file_type: "image" },
      { club: "B", club_name: "B Club", file_type: "image" },
      { club: "A", club_name: "A Club", file_type: "markdown" },
    ];

    const { getClubEntries } = await import("../../js/data.js");
    const aEntries = getClubEntries(mockAssets, "A");
    expect(aEntries).toHaveLength(2);
    expect(aEntries.every((e) => e.club === "A")).toBe(true);
  });

  it("getClub returns the matching club record", async () => {
    const mockAssets = [
      {
        club: "AARSHI",
        club_name: "AARSHI - Drama Club",
        file_type: "image",
        is_markdown_content: false,
      },
    ];

    const { getClub } = await import("../../js/data.js");
    const club = getClub("AARSHI", mockAssets);
    expect(club).toBeTruthy();
    expect(club.name).toBe("AARSHI - Drama Club");
  });

  it("getClub returns null for non-existent slug", async () => {
    const { getClub } = await import("../../js/data.js");
    const club = getClub("nonexistent", []);
    expect(club).toBeNull();
  });
});
