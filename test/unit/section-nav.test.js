/**
 * test/unit/section-nav.test.js — the sticky "jump to" bar.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  slugify,
  buildSectionNav,
  trackSections,
  initClubSectionNav,
} from "../../js/components/section-nav.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("slugify", () => {
  it("makes stable, readable ids", () => {
    expect(slugify("Events & Activities")).toBe("events-and-activities");
    expect(slugify("  Office Bearers — 2026-27 ")).toBe("office-bearers-2026-27");
    expect(slugify("Rules & Regulations")).toBe("rules-and-regulations");
    expect(slugify("???")).toBe("");
  });
});

describe("buildSectionNav", () => {
  it("is a labelled landmark with one chip per section and optional counts", () => {
    const nav = buildSectionNav(
      [
        { id: "a", label: "Alpha", count: 3 },
        { id: "b", label: "Beta" },
      ],
      { label: "Jump to a body" }
    );
    expect(nav.tagName).toBe("NAV");
    expect(nav.getAttribute("aria-label")).toBe("Jump to a body");
    const chips = nav.querySelectorAll("a.section-nav__chip");
    expect([...chips].map((c) => c.getAttribute("href"))).toEqual(["#a", "#b"]);
    expect(chips[0].querySelector(".section-nav__count").textContent).toBe("3");
    expect(chips[1].querySelector(".section-nav__count")).toBeNull();
  });
});

describe("initClubSectionNav", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <section class="club-detail__body"><h2>About</h2></section>
        <section class="club-detail__section"><h2>Office Bearers — 2026-27</h2></section>
        <section class="club-detail__body"><h2>Events &amp; Activities</h2></section>
        <section class="club-detail__body"><h2>Get in Touch</h2></section>
      </main>`;
  });

  it("builds a bar from the page's own headings, giving each an id", () => {
    const nav = initClubSectionNav();
    expect(nav).not.toBeNull();
    const labels = [...nav.querySelectorAll("a")].map((a) => a.textContent);
    expect(labels).toEqual([
      "About",
      "Office Bearers — 2026-27",
      "Events & Activities",
      "Get in Touch",
    ]);
    for (const a of nav.querySelectorAll("a")) {
      expect(document.getElementById(a.dataset.target), a.textContent).not.toBeNull();
    }
    // placed before the first section
    expect(document.querySelector("main").firstElementChild).toBe(nav);
  });

  it("keeps an id the author already wrote, and never duplicates one", () => {
    document.querySelector("h2").id = "overview";
    document.querySelectorAll("h2")[3].textContent = "About";
    const nav = initClubSectionNav();
    const ids = [...nav.querySelectorAll("a")].map((a) => a.dataset.target);
    expect(ids[0]).toBe("overview");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is not worth showing for a page with fewer than three sections", () => {
    document.querySelectorAll("section")[3].remove();
    document.querySelectorAll("section")[2].remove();
    expect(initClubSectionNav()).toBeNull();
    expect(document.querySelector(".section-nav")).toBeNull();
  });

  it("builds only once", () => {
    initClubSectionNav();
    expect(initClubSectionNav()).toBeNull();
    expect(document.querySelectorAll(".section-nav")).toHaveLength(1);
  });

  it("skips headings inside hidden sections", () => {
    document.querySelectorAll("section")[1].setAttribute("hidden", "");
    const nav = initClubSectionNav();
    expect([...nav.querySelectorAll("a")].map((a) => a.textContent)).not.toContain(
      "Office Bearers — 2026-27"
    );
  });
});

describe("trackSections", () => {
  const entry = (id, { intersecting = false, top = 100 } = {}) => ({
    target: document.getElementById(id),
    isIntersecting: intersecting,
    boundingClientRect: { top },
    rootBounds: { top: 0 },
  });

  const setup = () => {
    document.body.innerHTML = '<h2 id="a">A</h2><h2 id="b">B</h2><h2 id="c">C</h2>';
    const nav = buildSectionNav([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ]);
    document.body.prepend(nav);
    let callback;
    const observe = vi.fn();
    const Original = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(cb) {
        callback = cb;
        this.observe = observe;
        this.disconnect = vi.fn();
      }
    };
    trackSections(nav);
    const active = () => [...nav.querySelectorAll(".is-active")].map((a) => a.dataset.target);
    return {
      nav,
      observe,
      fire: (...e) => callback(e),
      active,
      restore: () => (window.IntersectionObserver = Original),
    };
  };

  it("watches every section", () => {
    const t = setup();
    expect(t.observe).toHaveBeenCalledTimes(3);
    t.restore();
  });

  it("lights the section whose heading is in the band", () => {
    const t = setup();
    t.fire(entry("a", { intersecting: true, top: 120 }));
    expect(t.active()).toEqual(["a"]);
    expect(t.nav.querySelector("[aria-current]").dataset.target).toBe("a");
    t.restore();
  });

  it("keeps a chip lit all the way through a long section", () => {
    // a's heading has scrolled above the screen; b's is still below the band —
    // we are in the middle of section a, and its chip must stay on.
    const t = setup();
    t.fire(entry("a", { top: -400 }), entry("b", { top: 900 }), entry("c", { top: 1800 }));
    expect(t.active()).toEqual(["a"]);
    t.restore();
  });

  it("the last section reached wins as you scroll on", () => {
    const t = setup();
    t.fire(
      entry("a", { top: -900 }),
      entry("b", { intersecting: true, top: 100 }),
      entry("c", { top: 1200 })
    );
    expect(t.active()).toEqual(["b"]);
    t.fire(entry("b", { top: -50 }), entry("c", { intersecting: true, top: 150 }));
    expect(t.active()).toEqual(["c"]);
    t.restore();
  });

  it("scrolling back up un-lights the later section", () => {
    const t = setup();
    t.fire(entry("a", { top: -900 }), entry("b", { top: -300 }), entry("c", { top: -10 }));
    expect(t.active()).toEqual(["c"]);
    t.fire(entry("c", { top: 700 }));
    expect(t.active()).toEqual(["b"]);
    t.restore();
  });

  it("lights nothing above the first section", () => {
    const t = setup();
    t.fire(entry("a", { top: 600 }), entry("b", { top: 1500 }), entry("c", { top: 2400 }));
    expect(t.active()).toEqual([]);
    t.restore();
  });
});

describe("wiring", () => {
  const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

  it("the clubs directory builds a jump bar and drops a chip when a body has no matches", () => {
    const clubs = read("js/pages/clubs.js");
    expect(clubs).toContain("buildSectionNav(");
    expect(clubs).toContain("trackSections(jump)");
    expect(clubs).toContain('toggleAttribute("hidden"');
  });

  it("every club page builds its bar last, after the dynamic sections exist", () => {
    const main = read("js/main.js");
    expect(main).toMatch(/initClubImages\(\)[\s\S]*section-nav\.js[\s\S]*initClubSectionNav/);
  });

  it("sits under the mobile masthead and follows it when it retracts", () => {
    const css = read("css/components.css");
    expect(css).toContain("body.has-topbar .section-nav");
    expect(css).toContain("body.has-topbar.topbar-hidden .section-nav");
    expect(css).toMatch(/\.section-nav__list \{[^}]*overflow-x: auto/);
  });
});
