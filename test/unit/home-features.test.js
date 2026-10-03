/**
 * test/unit/home-features.test.js — what makes the front page livelier, and what keeps it stable.
 *
 *   club of the day   pure date → club function, and the card it fills
 *   "what are you into"  the generated block in index.html (static, so no layout shift)
 *   count-up facts    figures that count up on view, never misreport, and respect reduced motion
 *
 * Layout itself (heights, shift) is measured in a real browser; the tests here pin the
 * contracts that measurement relies on, so a refactor can't quietly drop them.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  strideFor,
  istDay,
  clubOfTheDay,
  knownFor,
  dayLabel,
  initClubSpotlight,
} from "../../js/components/club-spotlight.js";
import { animateFacts, renderCouncilFacts } from "../../js/components/council-facts.js";
import { CLUBS, INTERESTS } from "../../js/data/clubs.js";
import { buildFinder } from "../../tools/sync-pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

describe("club of the day", () => {
  it("picks a stride that visits every club before repeating", () => {
    for (const n of [1, 2, 7, 12, 32, 33, 34, 36, 48]) {
      const stride = strideFor(n);
      const seen = new Set();
      for (let day = 0; day < n; day++) seen.add((day * stride) % n);
      expect(seen.size, `n=${n} stride=${stride}`).toBe(n);
    }
  });

  it("is the same club all day, for everyone, and changes at midnight in India", () => {
    // 2026-10-04 00:30 IST and 23:30 IST are the same day; 00:30 the next day is the next
    const early = new Date("2026-10-03T19:00:00Z"); // 00:30 IST on the 4th
    const late = new Date("2026-10-04T18:00:00Z"); // 23:30 IST on the 4th
    const next = new Date("2026-10-04T19:00:00Z"); // 00:30 IST on the 5th
    expect(istDay(early)).toBe(istDay(late));
    expect(istDay(next)).toBe(istDay(early) + 1);
    expect(clubOfTheDay(early)).toBe(clubOfTheDay(late));
    expect(clubOfTheDay(next)).not.toBe(clubOfTheDay(early));
  });

  it("does not walk the directory in order, and covers every club in one cycle", () => {
    const start = new Date("2026-01-01T06:00:00Z");
    const picks = Array.from({ length: CLUBS.length }, (_, i) =>
      clubOfTheDay(new Date(start.getTime() + i * 86_400_000))
    );
    expect(new Set(picks).size).toBe(CLUBS.length);
    const inOrder = picks.filter(
      (c, i) => i && CLUBS.indexOf(c) === CLUBS.indexOf(picks[i - 1]) + 1
    );
    expect(inOrder.length).toBeLessThan(CLUBS.length / 2);
  });

  it("lists what to ask about, skipping words the name already says", () => {
    const words = knownFor({
      name: "Singularity — The Astronomy Club",
      short: "Singularity",
      keywords: "astronomy astrophysics stars telescope space observatory",
    });
    expect(words).toEqual(["astrophysics", "stars", "telescope", "space"]);
    expect(knownFor({ name: "X", short: "X", keywords: "a a a b" }, 4)).toEqual(["a", "b"]);
    expect(knownFor({ name: "X", short: "X", keywords: "" })).toEqual([]);
  });

  it("writes the date the way a reader says it, in India time", () => {
    expect(dayLabel(new Date("2026-10-03T19:00:00Z"))).toBe("4 October");
  });
});

describe("the spotlight card", () => {
  let mount;
  beforeEach(() => {
    document.body.innerHTML = '<div id="club-spotlight" class="spotlight"></div>';
    mount = document.getElementById("club-spotlight");
  });

  it("does nothing without a mount", () => {
    expect(initClubSpotlight(null)).toBeNull();
  });

  it("fills the card with the day's club and links to its page", () => {
    const date = new Date("2026-10-04T06:00:00Z");
    initClubSpotlight(mount, { date });
    const club = clubOfTheDay(date);
    expect(mount.querySelector(".spotlight__kicker").textContent).toBe(
      "Club of the day · 4 October"
    );
    expect(mount.querySelector(".spotlight__name").textContent).toBe(club.name);
    const link = mount.querySelector(".spotlight__name a");
    expect(link.getAttribute("href")).toMatch(new RegExp(`${club.page.replace("pages/", "")}$`));
    expect(link.getAttribute("title")).toBe(club.name); // the name is clamped to two lines
    expect(mount.querySelector(".spotlight__open").getAttribute("aria-label")).toBe(
      `Visit ${club.name}`
    );
  });

  it("shows a monogram when a club has no crest, and the archive logo once it arrives", () => {
    const clubs = [
      {
        slug: "No_Logo",
        page: "pages/x.html",
        body: "cultural",
        name: "Zed Club",
        short: "Zed",
        interests: ["words"],
        keywords: "",
        crest: null,
      },
    ];
    const api = initClubSpotlight(mount, { clubs });
    expect(mount.querySelector(".spotlight__initial").textContent).toBe("Z");
    api.useArchive([{ slug: "No_Logo", logo: { public_url: "public/assets/zed.webp" } }]);
    const img = mount.querySelector(".spotlight__crest img");
    expect(img.getAttribute("src")).toContain("public/assets/zed.webp");
    expect(img.getAttribute("width")).toBe("64"); // a fixed box: swapping it in moves nothing
    expect(mount.querySelector(".spotlight__initial")).toBeNull();
  });

  it("prefers the bundled crest over a monogram while the archive is still loading", () => {
    const clubs = [{ ...CLUBS[0], crest: "assets/logos/sac.svg" }];
    initClubSpotlight(mount, { clubs });
    expect(mount.querySelector(".spotlight__crest img").getAttribute("src")).toContain("sac.svg");
  });

  it('"Another" deals a different club, announces it, and re-runs the deal animation', () => {
    initClubSpotlight(mount, { date: new Date("2026-10-04T06:00:00Z") });
    const before = mount.querySelector(".spotlight__name").textContent;
    expect(mount.hasAttribute("aria-live")).toBe(false); // silent until someone asks
    for (let i = 0; i < 12; i++) {
      mount.querySelector(".spotlight__shuffle").click();
      expect(mount.querySelector(".spotlight__name").textContent).not.toBe(
        i === 0 ? before : undefined
      );
    }
    expect(mount.getAttribute("aria-live")).toBe("polite");
    expect(mount.querySelector(".spotlight__kicker").textContent).toBe("A club at random");
    expect(mount.querySelector(".spotlight__body").classList.contains("is-new")).toBe(true);
  });

  it('"Another" never repeats the club on screen', () => {
    initClubSpotlight(mount);
    let previous = mount.querySelector(".spotlight__name").textContent;
    for (let i = 0; i < 40; i++) {
      mount.querySelector(".spotlight__shuffle").click();
      const now = mount.querySelector(".spotlight__name").textContent;
      expect(now).not.toBe(previous);
      previous = now;
    }
  });
});

describe('the generated "What are you into?" block', () => {
  const html = read("index.html");
  const block = html.match(/<!-- home-finder:start[\s\S]*?<!-- home-finder:end -->/)?.[0] ?? "";

  it("is in index.html and is exactly what the generator writes", () => {
    expect(block).not.toBe("");
    expect(block).toBe(buildFinder().trim());
  });

  it("has one plain link per interest, with the club count, to the filtered Clubs page", () => {
    const links = [...block.matchAll(/<a class="finder__chip" href="([^"]+)">/g)].map((m) => m[1]);
    expect(links).toEqual(INTERESTS.map((i) => `pages/clubs.html?interest=${i.id}`));
    for (const interest of INTERESTS) {
      const count = CLUBS.filter((c) => c.interests.includes(interest.id)).length;
      expect(block).toContain(`${count}<span class="visually-hidden"> clubs</span>`);
    }
  });

  it("opens the search palette from its search field", () => {
    expect(block).toMatch(/<button class="finder__search"[^>]*data-open-search/);
  });

  it("carries the spotlight's mount, labelled", () => {
    expect(block).toContain('id="club-spotlight"');
    // a name needs a role to hang on: aria-label on a bare <div> is prohibited by ARIA 1.2
    expect(block).toMatch(/id="club-spotlight"[^>]*role="group"[^>]*aria-label="Club of the day"/);
  });

  it("sits between the lead article and the Council diagram", () => {
    const at = (s) => html.indexOf(s);
    expect(at("</article>")).toBeLessThan(at("home-finder:start"));
    expect(at("home-finder:end")).toBeLessThan(at('id="structure-title"'));
  });
});

describe("what the layout depends on", () => {
  const css = read("css/pages/home.css");

  it("reserves the spotlight's height at three widths, so filling it in moves nothing", () => {
    const base = css.match(/\.spotlight\s*{[^}]*min-height:\s*([\d.]+)rem/)?.[1];
    const phone = css.match(
      /@media \(max-width: 640px\)\s*{\s*\.spotlight\s*{[^}]*min-height:\s*([\d.]+)rem/
    )?.[1];
    const narrow = css.match(
      /@media \(max-width: 359px\)\s*{\s*\.spotlight\s*{[^}]*min-height:\s*([\d.]+)rem/
    )?.[1];
    expect(Number(base)).toBeGreaterThanOrEqual(12.3); // tallest measured at ≥641px: 196.5px
    expect(Number(phone)).toBeGreaterThan(Number(base));
    expect(Number(narrow)).toBeGreaterThan(Number(phone));
  });

  it("bounds the card's own height: the name and meta are clamped, known-for is one line", () => {
    expect(css).toMatch(/\.spotlight__name\s*{[^}]*line-clamp:\s*2/);
    expect(css).toMatch(/\.spotlight__meta\s*{[^}]*line-clamp:\s*2/);
    expect(css).toMatch(/\.spotlight__known\s*{[^}]*white-space:\s*nowrap/);
  });

  it("gives the cards' hard shadows room inside the section's paint containment", () => {
    // .reveal-section is contain: paint — it clips a shadow that leaves its box
    expect(css).toMatch(/\.finder\s*{[^}]*padding:\s*0 6px 8px 0/);
    expect(css).toMatch(/\.finder\s*{[^}]*margin-right:\s*-6px/);
  });

  it("keeps touch targets at 44px", () => {
    expect(css).toMatch(/\.finder__chip\s*{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.spotlight__open,\s*\.spotlight__shuffle\s*{[^}]*min-height:\s*44px/);
  });

  it("gates the scroll-driven touches behind motion preferences and feature support", () => {
    const enh = read("css/enhancements.css");
    for (const name of ["hero-drift", "stamp-slam", "rule-draw"]) {
      expect(enh, name).toContain(`@keyframes ${name}`);
    }
    // the three animations sit inside the same two gates the existing section rises use
    const gated = enh.slice(enh.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const supports = gated.slice(gated.indexOf("@supports (animation-timeline: view())"));
    for (const name of ["hero-drift", "stamp-slam", "rule-draw"]) {
      expect(supports.indexOf(`animation: ${name}`), name).toBeGreaterThan(-1);
    }
    expect(gated).toContain('html:not([data-reduce-motion="on"]) .hero__frame img');
    // transform / opacity only
    for (const frames of enh.match(
      /@keyframes (?:hero-drift|stamp-slam|rule-draw)\s*{[\s\S]*?\n}\n/g
    )) {
      expect(frames).not.toMatch(/\b(?:width|height|top|left|margin|padding)\s*:/);
    }
  });
});

describe("count-up figures", () => {
  let observers;
  const RealObserver = global.IntersectionObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    global.IntersectionObserver = class extends RealObserver {
      constructor(cb, opts) {
        super(cb, opts);
        observers.push(this);
      }
    };
    document.documentElement.removeAttribute("data-reduce-motion");
    document.body.innerHTML = '<section id="home-stats"></section>';
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    // one clock for everything: the fake timers' Date drives both performance.now() and rAF,
    // so three counters running at once do not each advance time
    const t0 = Date.now();
    vi.spyOn(performance, "now").mockImplementation(() => Date.now() - t0);
    window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  });

  afterEach(() => {
    global.IntersectionObserver = RealObserver;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const drawn = () =>
    [...document.querySelectorAll(".home-stat__figure")].map((n) => n.textContent);
  const spoken = () =>
    [...document.querySelectorAll(".home-stat strong")].map(
      (n) => n.querySelector(".visually-hidden")?.textContent ?? n.textContent
    );

  it("starts at 0, keeps the real figure readable throughout, and leaves non-counts alone", () => {
    renderCouncilFacts();
    expect(drawn()).toEqual(["0", "0", "0"]);
    expect(spoken()).toEqual(["5", "33", "5", "1 yr"]); // finished values are always in the DOM
    expect(document.querySelectorAll('.home-stat__figure[aria-hidden="true"]')).toHaveLength(3);
  });

  it("counts up when the figures come into view, and lands exactly on the real numbers", async () => {
    renderCouncilFacts();
    expect(observers).toHaveLength(1);
    observers[0].trigger(true);
    await vi.advanceTimersByTimeAsync(300);
    const mid = drawn().map(Number);
    expect(mid[1]).toBeGreaterThan(0);
    expect(mid[1]).toBeLessThan(33);
    await vi.advanceTimersByTimeAsync(2000);
    expect(drawn()).toEqual(["5", "33", "5"]);
  });

  it("waits for the figures to be seen — nothing moves while they are off screen", async () => {
    renderCouncilFacts();
    await vi.advanceTimersByTimeAsync(1500);
    expect(drawn()).toEqual(["0", "0", "0"]);
  });

  it("does not animate under reduced motion (OS or the site's own toggle)", () => {
    window.matchMedia = vi.fn((q) => ({
      matches: /reduce/.test(q),
      addEventListener() {},
      removeEventListener() {},
    }));
    renderCouncilFacts();
    expect(document.querySelector(".home-stat__figure")).toBeNull();
    expect(document.querySelector(".home-stat strong").textContent).toBe("5");

    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    document.documentElement.dataset.reduceMotion = "on";
    renderCouncilFacts();
    expect(document.querySelector(".home-stat__figure")).toBeNull();
  });

  it("does nothing without IntersectionObserver", () => {
    delete global.IntersectionObserver;
    const mount = document.getElementById("home-stats");
    renderCouncilFacts();
    expect(mount.querySelector(".home-stat__figure")).toBeNull();
    animateFacts(mount); // and is safe to call again
  });

  it("styles the figure so the `.home-stat span` label rule does not shrink it", () => {
    const css = read("css/pages/home.css");
    expect(css).toMatch(/\.home-stat strong \.home-stat__figure\s*{[^}]*font:\s*inherit/);
    expect(css).toMatch(/\.home-stat strong \.home-stat__figure\s*{[^}]*tabular-nums/);
  });
});
