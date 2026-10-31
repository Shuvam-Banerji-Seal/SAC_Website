/**
 * test/unit/gym-page.test.js — what the Gym Club asked for (2026-10-31), kept.
 *
 *   - the new office bearers replace the ones stepping down (names, roles and numbers as sent;
 *     the club sent no email addresses, so the page shows none rather than inventing one)
 *   - the club is "Gym Club", not "GYM Club", everywhere a reader sees its name: the clubs
 *     directory card and the Gallery heading read `club_name` from the archive map, while
 *     search, the footer and the pager read the registry
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { phoneHref } from "../../js/components/club-extras.js";
import { clubBySlug } from "../../js/data/clubs.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");
const SLUG = "SAC_Sports_GYM";

const html = read("pages/gym.html");
const page = new DOMParser().parseFromString(html, "text/html");
const rows = [...page.querySelectorAll(".ob-table tbody tr")].map((tr) => {
  const [name, phone, email, role] = [...tr.cells].map((td) => td.textContent.trim());
  return { name, phone, email, role };
});

describe("Gym Club office bearers", () => {
  it("lists the three new office bearers with the roles the club gave", () => {
    expect(rows.map(({ name, role }) => [name, role])).toEqual([
      ["Akhil Singh", "Secretary"],
      ["Utkarsh Singh", "Convener"],
      ["Indrashis Gangopadhyay", "Treasurer"],
    ]);
  });

  it("gives each the number the club sent, as a callable link", () => {
    const sent = {
      "Akhil Singh": "918837638405",
      "Utkarsh Singh": "919956742922",
      "Indrashis Gangopadhyay": "916290512169",
    };
    for (const { name, phone } of rows) {
      expect(phone.replace(/\D/g, ""), name).toBe(sent[name]);
      expect(phoneHref(phone), name).toBe(`tel:+${sent[name]}`);
    }
  });

  it("invents no email address", () => {
    for (const { name, email } of rows) expect(email, name).toBe("—");
    expect(page.querySelector('.ob-table a[href^="mailto:"]')).toBeNull();
  });

  it("no longer names the office bearers who stepped down", () => {
    for (const gone of ["Sandeep Kanekal", "Mahfooz Alam", "Subhradip Mondal", "Iishaan Pyne"]) {
      expect(html).not.toContain(gone);
    }
  });
});

describe('the name is "Gym Club"', () => {
  it("on the club's own page: title, description and heading", () => {
    expect(page.title).toBe("Gym Club · SAC IISER Kolkata");
    expect(page.querySelector('meta[name="description"]').content).toMatch(/^Gym Club of /);
    expect(page.querySelector("#clubTitle").textContent).toBe("Gym Club");
  });

  it("in the registry (search, footer, pager)", () => {
    expect(clubBySlug(SLUG).name).toBe("Gym Club");
  });

  it("in the archive map the directory and Gallery read", () => {
    const names = new Set(
      read("public/assets/processed/assets_map.jsonl")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((a) => a.club === SLUG)
        .map((a) => a.club_name)
    );
    expect([...names]).toEqual(["Gym Club"]);
  });

  it("and nowhere as GYM Club", () => {
    expect(html).not.toContain("GYM Club");
    expect(read("js/data/clubs.js")).not.toContain("GYM Club");
  });
});
