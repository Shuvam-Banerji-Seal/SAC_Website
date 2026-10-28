/**
 * test/unit/slashdot-page.test.js — the Slashdot page as redesigned (2026-10-28), kept.
 *
 *   1  every office bearer in the table has a current portrait in the archive, under the same
 *      name — the portraits were filed as plain "other" photographs and never showed
 *   2  the archive lists no Slashdot file that is gone (PR #5 deleted the previous OBs' page)
 *   3  each workshop, poster and project card names a picture the archive has, and every such
 *      picture is on the page exactly once (the old page showed eight of them twice)
 *   4  fillAssetSlots fills a slot with a picture that opens in the viewer, and leaves a card
 *      whose picture is missing as words alone
 *   5  the slot has its shape before the picture arrives, so filling it moves nothing
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { normName } from "../../js/components/club-extras.js";
import { isCurrentTenure } from "../../js/utils/tenure.js";
import { fillAssetSlots } from "../../js/pages/club-images.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");
const SLUG = "Slashdot_Programming_Club";

const html = read("pages/slashdot.html");
const page = new DOMParser().parseFromString(html, "text/html");
const map = read("public/assets/processed/assets_map.jsonl")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((a) => a.club === SLUG);

const slots = [...page.querySelectorAll("[data-club-asset]")].map((n) => n.dataset.clubAsset);

describe("office bearers (1)", () => {
  const names = [...page.querySelectorAll(".ob-table tbody tr")].map((tr) =>
    tr.cells[0].textContent.trim()
  );

  it("has one current portrait per row, filed under the table's name", () => {
    expect(names).toEqual(["Afreen Chowdhury", "Shayan Bari", "Alok Jha"]);
    const portraits = map.filter((a) => a.is_ob_portrait && isCurrentTenure(a));
    expect(portraits.map((a) => normName(a.person)).sort()).toEqual(names.map(normName).sort());
    for (const a of portraits) {
      expect(a.ob_role, a.path).toBe("Office Bearer");
      expect(existsSync(resolve(root, a.public_url)), a.public_url).toBe(true);
    }
    expect(page.querySelector('[data-club-images][data-role="ob_portrait"]')).not.toBeNull();
  });
});

describe("the archive (2)", () => {
  it("lists only files that exist", () => {
    for (const a of map) {
      expect(existsSync(resolve(root, a.public_url)), a.public_url).toBe(true);
      if (a.thumb_url) expect(existsSync(resolve(root, a.thumb_url)), a.thumb_url).toBe(true);
    }
  });
});

describe("the cards (3)", () => {
  it("name pictures the archive has", () => {
    expect(slots.length).toBe(13);
    const paths = new Set(map.filter((a) => a.file_type === "image").map((a) => a.path));
    for (const slot of slots) expect(paths.has(`${SLUG}/${slot}`), slot).toBe(true);
  });

  it("show every event and project picture once, and no other wall repeats them", () => {
    const pictured = map
      .filter((a) => a.file_type === "image" && !a.is_logo && !a.is_ob_portrait)
      .map((a) => a.path.slice(SLUG.length + 1));
    expect([...slots].sort()).toEqual(pictured.sort());
    expect(new Set(slots).size).toBe(slots.length);
    // the old "Past Events" wall drew every event photo again beside the workshop list
    expect(page.querySelector('[data-club-images][data-role="event"]')).toBeNull();
  });

  it("keep each card's words in the page, so they stand without the picture", () => {
    for (const card of page.querySelectorAll(".showcase__item")) {
      expect(card.querySelector(".showcase__title")?.textContent.trim()).toBeTruthy();
      expect(card.querySelector(".showcase__body > p:last-child")?.textContent.trim()).toBeTruthy();
    }
  });
});

describe("fillAssetSlots (4)", () => {
  const entry = map.find((a) => a.path.endsWith("workshops/julia-workshop.webp"));
  const build = () => {
    const section = document.createElement("section");
    section.innerHTML = `
      <h2>Workshops</h2>
      <ul class="showcase">
        <li class="showcase__item">
          <div class="showcase__media" data-club-asset="images/workshops/julia-workshop.webp"></div>
          <div class="showcase__body"><h3 class="showcase__title">Julia</h3><p>An introduction.</p></div>
        </li>
        <li class="showcase__item">
          <div class="showcase__media" data-club-asset="images/workshops/not-in-the-map.webp"></div>
          <div class="showcase__body"><h3 class="showcase__title">Gone</h3><p>Words only.</p></div>
        </li>
      </ul>`;
    return section;
  };

  it("fills a listed picture with a link the viewer opens, the thumbnail in the grid", () => {
    const section = build();
    expect(fillAssetSlots(map, SLUG, section)).toBe(1);
    const link = section.querySelector(".showcase__link");
    expect(link.getAttribute("href")).toBe(entry.public_url);
    expect(link.dataset.viewer).toBe(`club-${SLUG}`);
    expect(link.dataset.title).toBe("Julia");
    expect(link.dataset.desc).toBe("An introduction.");
    expect(link.dataset.context).toBe("Workshops");
    expect(link.getAttribute("aria-label")).toBe("View the photograph: Julia");
    const img = link.querySelector("img");
    expect(img.getAttribute("src")).toBe(entry.thumb_url);
    expect(img.getAttribute("width")).toBe(String(entry.width));
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("leaves a card whose picture is missing as words, with no empty frame", () => {
    const section = build();
    fillAssetSlots(map, SLUG, section);
    const [, missing] = section.querySelectorAll(".showcase__item");
    expect(missing.classList.contains("showcase__item--text")).toBe(true);
    expect(missing.querySelector(".showcase__media")).toBeNull();
    expect(missing.querySelector(".showcase__title").textContent).toBe("Gone");
  });

  it("counts as a rendered wall, so the catch-all Club archive is not drawn under the cards", () => {
    expect(read("js/pages/club-images.js")).toMatch(
      /rendered\.push\(fillAssetSlots\(entries, slug\) > 0\);\s*\n\s*if \(!rendered\.some\(Boolean\)\) renderFallback/
    );
  });
});

describe("no layout shift (5)", () => {
  it("gives the slot its ratio on the content box, inside the club's mount", () => {
    const css = read("css/pages/club.css");
    const rule = css.match(/\n\.showcase__media \{[^}]*\}/)?.[0] || "";
    expect(rule).toMatch(/aspect-ratio: var\(--showcase-ratio/);
    expect(rule).toMatch(/box-sizing: content-box/);
    expect(rule).toMatch(/padding: var\(--fp-t, 0\)/);
  });
});
