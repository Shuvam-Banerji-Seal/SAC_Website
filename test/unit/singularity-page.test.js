/**
 * test/unit/singularity-page.test.js — the changes Singularity asked for (2026-10-05), kept.
 *
 *   1  the four photographs the club chose, under its title (and the page holds their space)
 *   2  every office bearer in the table, each with a phone and an institute address
 *   3  a portrait for each of them in the archive, under the same name (so the card gets Call/Email)
 *   4  the ISAAC paragraph in the club's words, with its two links, wholly right of the divider
 *   5  Events & Activities from the club's document, one heading per kind of event
 *   6  the event photographs, labelled with their file names
 *   7  no Achievements section
 *   8  no "Club archive" wall — it only appears when a club has no portraits and no events
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { normName, phoneHref, isEmail } from "../../js/components/club-extras.js";
import { isCurrentTenure } from "../../js/utils/tenure.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");
const SLUG = "Singularity_Astro_Club";

const page = new DOMParser().parseFromString(read("pages/singularity.html"), "text/html");
const map = read("public/assets/processed/assets_map.jsonl")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((a) => a.club === SLUG);

const rows = [...page.querySelectorAll(".ob-table tbody tr")].map((tr) => {
  const [name, phone, email, role] = [...tr.cells].map((td) => td.textContent.trim());
  return { name, phone, email, role };
});

describe("under the title (change 1)", () => {
  it("shows the four photographs from the club's folder, in its order", async () => {
    const { heroPicks } = await import("../../js/utils/hero-picks.js");
    const picks = heroPicks(map);
    expect(picks.map((a) => a.title)).toEqual([
      "Freshers' 2026",
      "Singularity, 1 September 2026",
      "Parallelization",
      "Singularity Freshers' 2025",
    ]);
    for (const a of picks) {
      expect(a.role).toBe("featured");
      expect(existsSync(resolve(root, a.public_url)), a.public_url).toBe(true);
      expect(existsSync(resolve(root, a.thumb_url)), a.thumb_url).toBe(true);
    }
    // the club's choice stands under the title, not again among the event photographs
    expect(picks.some((a) => a.is_event)).toBe(false);
  });

  it("holds four mounts open from the first paint", () => {
    expect(page.body.dataset.strip).toBe("4");
    expect(read("css/pages/club.css")).toMatch(
      /\.club-hero-strip--n4 \{\s*display: grid;\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/
    );
  });
});

describe("office bearers (changes 2 and 3)", () => {
  it("lists all five, each with a callable number and an institute address", () => {
    expect(rows.map((r) => r.name)).toEqual([
      "Aditya Das",
      "Devanathan Venugopal",
      "Fazil M Inamdar",
      "H. D. Rinsangzela",
      "Riyah Mohan",
    ]);
    for (const r of rows) {
      expect(phoneHref(r.phone), r.name).toMatch(/^tel:\+91\d{10}$/);
      expect(isEmail(r.email), r.name).toBe(true);
      expect(r.email, r.name).toMatch(/@iiserkol\.ac\.in$/);
    }
  });

  it("gives the details the club sent", () => {
    const by = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(phoneHref(by["Aditya Das"].phone)).toBe("tel:+918447892924");
    expect(by["Aditya Das"].email).toBe("ad24ms073@iiserkol.ac.in");
    expect(phoneHref(by["Riyah Mohan"].phone)).toBe("tel:+919113997989");
    expect(by["Riyah Mohan"].email).toBe("rm25ms309@iiserkol.ac.in");
    expect(phoneHref(by["H. D. Rinsangzela"].phone)).toBe("tel:+919612604266");
    expect(by["H. D. Rinsangzela"].email).toBe("hdr25ms231@iiserkol.ac.in");
  });

  it("has one current portrait per row, filed under the table's name", () => {
    const portraits = map.filter((a) => a.is_ob_portrait && isCurrentTenure(a));
    expect(portraits.map((a) => normName(a.person)).sort()).toEqual(
      rows.map((r) => normName(r.name)).sort()
    );
    for (const a of portraits) {
      expect(existsSync(resolve(root, a.public_url)), a.public_url).toBe(true);
      expect(a.ob_role).toBe("Office Bearer");
    }
    expect(page.querySelector('[data-club-images][data-role="ob_portrait"]')).not.toBeNull();
  });
});

describe("the introduction (change 4)", () => {
  const intro = page.querySelector(".club-detail__body--pair");
  const parts = [...(intro?.children || [])];
  const isaac = parts[1];
  const ANI = /^https:\/\/www\.aninews\.in\/news\/.*astronomy-clubs\d+\/$/;

  it("is two parts, set either side of the rule on wide screens", () => {
    expect(parts.map((n) => n.tagName)).toEqual(["P", "DIV"]);
    expect(read("css/pages/club.css")).toMatch(
      /\.club-detail__body--pair > :nth-child\(2\) \{[^}]*border-left/
    );
  });

  it("tells ISAAC's story with the club's facts and links to ISAAC", () => {
    const text = isaac.querySelector(":scope > p").textContent.replace(/\s+/g, " ").trim();
    expect(text).toMatch(/^We are one of the founding clubs of ISAAC/);
    for (const fact of [
      "Indian Synergy of Astronomy and Astrophysics Clubs",
      "June 2025",
      "Mann Ki Baat",
    ])
      expect(text).toContain(fact);
    const link = isaac.querySelector(":scope > p a");
    expect(link.getAttribute("href")).toBe("https://www.instagram.com/isaac.astro.india/");
    expect(page.body.textContent).not.toContain("Singularity has also founded ISAAC");
  });

  // ANI, 31 May 2026: "I would also like to mention ISAAC. It is a student-led nationwide
  // network that connects astronomy and astrophysics clubs," said PM Modi.
  it("quotes the Prime Minister verbatim, and says where it was said", () => {
    const quote = isaac.querySelector("blockquote.club-detail__quote");
    expect(quote.getAttribute("cite")).toMatch(ANI);
    expect(quote.querySelector("p").textContent.replace(/\s+/g, " ").trim()).toBe(
      "\u201cI would also like to mention ISAAC. It is a student-led nationwide network that connects astronomy and astrophysics clubs.\u201d"
    );
    const source = quote.querySelector("footer");
    expect(source.textContent).toContain("Prime Minister Narendra Modi");
    expect(source.querySelector("a").getAttribute("href")).toMatch(ANI);
    expect(source.textContent).toContain("31 May 2026");
    for (const a of isaac.querySelectorAll("a")) expect(a.rel).toContain("noopener");
  });

  it("gives the drop cap to the introduction's first paragraph only", () => {
    expect(read("css/pages/club.css")).toContain(
      ".club-detail__body > p:first-child::first-letter"
    );
  });
});

describe("events (changes 5 and 6)", () => {
  it("describes each kind of event under its own heading, from the club's document", () => {
    const section = [...page.querySelectorAll(".club-detail__body")].find(
      (s) => s.querySelector("h2")?.textContent.trim() === "Events & Activities"
    );
    expect([...section.querySelectorAll("h3")].map((h) => h.textContent.trim())).toEqual([
      "Student, Faculty, Alumni, and Guest Talks",
      "Workshops",
      "Stargazing",
      "Interviews",
      "Radio Astronomy",
      "Discussion Sessions and Quizzes",
    ]);
    expect(section.textContent).toContain("The Celestial Quest");
  });

  it("has the event photographs in the archive, labelled with their file names", () => {
    const events = map.filter((a) => a.is_event && a.file_type === "image");
    expect(events.length).toBeGreaterThanOrEqual(30);
    const titles = events.map((a) => a.title);
    for (const t of [
      "Interview with Prof. Scott Hughes",
      "Water Rocketry Workshop",
      "Orion Nebula",
    ])
      expect(titles).toContain(t);
    for (const a of events) {
      expect(a.title, a.path).not.toMatch(/\.(jpe?g|png|webp)$/i);
      expect(existsSync(resolve(root, a.public_url)), a.public_url).toBe(true);
      if (a.thumb_url) expect(existsSync(resolve(root, a.thumb_url)), a.thumb_url).toBe(true);
      // only images too small to need one go without a grid variant
      else expect(a.width).toBeLessThanOrEqual(600);
    }
    expect(page.querySelector('[data-club-images][data-role="event"]')).not.toBeNull();
  });
});

describe("what the club asked to remove (changes 7 and 8)", () => {
  it("has no Achievements section and no IICM wall under it", () => {
    const headings = [...page.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings.join("|")).not.toMatch(/Achievements/);
    expect(page.querySelector('[data-role="iicm"]')).toBeNull();
  });

  // club-images.js draws "Club archive" (every remaining image) only when no wall rendered
  it("has portraits and events, so the catch-all Club archive is never drawn", () => {
    expect(map.some((a) => a.is_ob_portrait && isCurrentTenure(a))).toBe(true);
    expect(map.some((a) => a.is_event && a.file_type === "image")).toBe(true);
    expect(read("js/pages/club-images.js")).toMatch(
      /if \(!rendered\.some\(Boolean\)\) renderFallback/
    );
  });
});
