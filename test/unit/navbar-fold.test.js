/**
 * test/unit/navbar-fold.test.js — the navigation is a folded sheet of paper.
 *
 * Three layers are checked: the structure navbar.js builds (a concertina of nested
 * panels and a layered dog-ear), the CSS contract that animates it (state comes from
 * <body> classes; nothing transitions until body.fold-ready), and the controller.
 * The 3D geometry itself is verified in a real browser; these tests keep its
 * ingredients from being quietly removed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "css/components.css"), "utf-8");

function shell() {
  document.body.className = "";
  document.body.innerHTML = `
    <header>
      <nav id="navbar" aria-label="Primary"></nav>
      <button class="navbar-corner" id="navbarCorner" type="button"
        aria-label="Open navigation" aria-expanded="false" aria-controls="navbar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14"/></svg>
      </button>
    </header>
    <main></main>`;
}

function setViewport(desktop) {
  window.matchMedia = vi.fn((query) => ({
    matches: /min-width:\s*1024px/.test(query) ? desktop : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  delete window.__sacSidebarBound;
  delete window.__sacNavbarResizeBound;
  delete window.__sacTopbarBound;
  document.documentElement.removeAttribute("data-reduce-motion");
  shell();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.className = "";
  document.body.innerHTML = "";
});

describe("the sheet navbar.js builds", () => {
  async function render(active = "clubs") {
    const { renderNavbar } = await import("../../js/components/navbar.js");
    renderNavbar(active);
  }

  it("is four nested panels, each hanging from the one above", async () => {
    await render();
    const p1 = document.querySelector("#navbar .fold > .fold__panel--1");
    expect(p1).not.toBeNull();
    const p2 = p1.querySelector(":scope > .fold__panel--2");
    const p3 = p2?.querySelector(":scope > .fold__panel--3");
    const p4 = p3?.querySelector(":scope > .fold__panel--4");
    expect(p2 && p3 && p4).toBeTruthy();
    // nesting is what makes one rotation carry everything below it
    expect(document.querySelectorAll(".fold__panel")).toHaveLength(4);
  });

  it("gives every panel a face, a back and a shade", async () => {
    await render();
    for (const panel of document.querySelectorAll(".fold__panel")) {
      expect(panel.querySelector(":scope > .fold__sheet")).not.toBeNull();
      expect(panel.querySelector(":scope > .fold__back")).not.toBeNull();
      expect(panel.querySelector(":scope > .fold__shade")).not.toBeNull();
    }
  });

  it("puts the brand first, the links in two even groups, and the reader controls last", async () => {
    await render();
    const text = (sel) => document.querySelector(sel);
    expect(text(".fold__panel--1 > .fold__sheet .sidebar__brand")).not.toBeNull();
    const a = text(".fold__panel--2 > .fold__sheet").querySelectorAll(".sidebar__link");
    const b = text(".fold__panel--3 > .fold__sheet").querySelectorAll(".sidebar__link");
    expect(a.length + b.length).toBe(6);
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(1);
    expect(text(".fold__panel--4 > .fold__sheet .sidebar__foot")).not.toBeNull();
    expect(text(".fold__panel--4 .sidebar__action")).not.toBeNull();
  });

  it("marks the current page", async () => {
    await render("gallery");
    const current = document.querySelectorAll('.sidebar__link[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("aria-label")).toBe("Gallery");
  });

  it("builds the dog-ear: under, flap, and the flap's two faces — and removes the static icon", async () => {
    await render();
    const corner = document.getElementById("navbarCorner");
    expect(corner.querySelector("svg")).toBeNull();
    expect(corner.querySelector(".corner__under")).not.toBeNull();
    expect(
      corner.querySelector(".corner__flap .corner__face--back .corner__glyph--menu")
    ).not.toBeNull();
    expect(
      corner.querySelector(".corner__flap .corner__face--front .corner__glyph--close")
    ).not.toBeNull();
    // purely decorative: the <button> keeps its accessible name
    expect(corner.querySelector(".corner__flap").getAttribute("aria-hidden")).toBe("true");
    expect(corner.getAttribute("aria-label")).toBeTruthy();
    expect(corner.classList.contains("is-folded")).toBe(true);
  });

  it("is safe to render twice", async () => {
    await render();
    await render();
    expect(document.querySelectorAll(".fold")).toHaveLength(1);
    expect(document.querySelectorAll(".corner__flap")).toHaveLength(1);
    expect(document.querySelectorAll(".sidebar-scrim")).toHaveLength(1);
  });
});

describe("controller — phones", () => {
  async function start() {
    setViewport(false);
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    vi.advanceTimersByTime(100);
  }
  const toggle = () => document.getElementById("navbarCorner");

  it("starts folded away: inert, not expanded", async () => {
    await start();
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("navbar").inert).toBe(true);
  });

  it("the corner unfolds it and folds it again, keeping aria and inert in step", async () => {
    await start();
    toggle().click();
    expect(document.body.classList.contains("sidebar-open")).toBe(true);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Close navigation");
    expect(document.getElementById("navbar").inert).toBe(false);
    toggle().click();
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
    expect(document.getElementById("navbar").inert).toBe(true);
  });

  it("Escape folds it away", async () => {
    await start();
    toggle().click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
  });

  it("locks page scroll while unfolded", async () => {
    await start();
    toggle().click();
    expect(document.body.style.overflow).toBe("hidden");
    toggle().click();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("crossing the 1024px breakpoint", () => {
  it("never leaves the page unable to scroll: open on a phone, then widen to desktop", async () => {
    // regression: lockBodyScroll() returned early on desktop, skipping the UNLOCK too
    let desktop = false;
    let onChange;
    window.matchMedia = vi.fn((query) => ({
      get matches() {
        return /min-width:\s*1024px/.test(query) ? desktop : false;
      },
      media: query,
      addEventListener: (_, cb) => (onChange = cb),
      removeEventListener: vi.fn(),
    }));
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    vi.advanceTimersByTime(100);

    document.getElementById("navbarCorner").click();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    desktop = true;
    onChange();
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.touchAction).toBe("");
  });

  it("clears the desktop-only folded state when it narrows to a phone", async () => {
    localStorage.setItem("sac-sidebar-collapsed", "1");
    let desktop = true;
    let onChange;
    window.matchMedia = vi.fn((query) => ({
      get matches() {
        return /min-width:\s*1024px/.test(query) ? desktop : false;
      },
      media: query,
      addEventListener: (_, cb) => (onChange = cb),
      removeEventListener: vi.fn(),
    }));
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    desktop = false;
    onChange();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
    expect(document.getElementById("navbar").inert).toBe(true);
  });
});

describe("controller — desktop", () => {
  async function start() {
    setViewport(true);
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    vi.advanceTimersByTime(100);
  }
  const toggle = () => document.getElementById("navbarCorner");

  it("is open by default and the corner folds it up, remembering the choice", async () => {
    await start();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    toggle().click();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem("sac-sidebar-collapsed")).toBe("1");
    toggle().click();
    expect(localStorage.getItem("sac-sidebar-collapsed")).toBe("0");
  });

  it("restores a folded rail on the next page without animating it", async () => {
    localStorage.setItem("sac-sidebar-collapsed", "1");
    await start();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    // transitions are gated on fold-ready, which arrives only after first paint
    // (applied in a nested rAF; the fake clock is advanced past both frames)
    expect(document.body.classList.contains("fold-ready")).toBe(true);
  });
});

describe("the page glides with the rail", () => {
  // jsdom has no layout: report the page's left edge as a function of the rail's state
  function stubLayout(main) {
    main.getBoundingClientRect = () => ({
      left: document.body.classList.contains("sidebar-collapsed") ? 134 : 250,
    });
    main.animate = vi.fn();
  }
  async function start({ ready = true } = {}) {
    setViewport(true);
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    if (ready) vi.advanceTimersByTime(100);
    const main = document.querySelector("main");
    stubLayout(main);
    return main;
  }
  const toggle = () => document.getElementById("navbarCorner");

  it("on collapse, starts the page where it was and slides it to where it is, after the fold", async () => {
    const main = await start();
    toggle().click();
    expect(main.animate).toHaveBeenCalledTimes(1);
    const [frames, options] = main.animate.mock.calls[0];
    expect(frames).toEqual([{ transform: "translateX(116px)" }, { transform: "none" }]);
    expect(options.delay).toBe(280); // --rail-lag: the rail waits for the sheet to fold
    expect(options.duration).toBe(450); // --rail-dur: the same time the rail itself takes
    expect(options.fill).toBe("backwards"); // holds the old position through the delay
  });

  it("on expand, goes the other way and starts at once", async () => {
    localStorage.setItem("sac-sidebar-collapsed", "1");
    const main = await start();
    toggle().click();
    const [frames, options] = main.animate.mock.calls[0];
    expect(frames[0].transform).toBe("translateX(-116px)");
    expect(options.delay).toBe(0);
  });

  it("does not move the page for reduced motion, or before the first paint", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "on");
    const calm = await start();
    toggle().click();
    expect(calm.animate).not.toHaveBeenCalled();

    vi.resetModules();
    delete window.__sacSidebarBound;
    shell();
    document.documentElement.removeAttribute("data-reduce-motion");
    const early = await start({ ready: false });
    toggle().click();
    expect(early.animate).not.toHaveBeenCalled();
  });

  it("restores a folded rail before first paint: preloader.js adds the class on a wide screen", () => {
    const run = () => {
      document.body.className = "";
      new Function(readFileSync(resolve(root, "js/preloader.js"), "utf-8"))();
    };
    localStorage.setItem("sac-sidebar-collapsed", "1");
    setViewport(true);
    run();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    // a phone has no folded rail, so a stored choice must not touch it
    setViewport(false);
    run();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
    // nor does a rail that was left open
    setViewport(true);
    localStorage.setItem("sac-sidebar-collapsed", "0");
    run();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
  });

  it("carries two names for the brand, so the folded rail can cross-fade to SAC", async () => {
    await start();
    const brand = document.querySelector(".sidebar__brand");
    expect(brand.querySelector(".sidebar__brand-full").textContent).toMatch(/SAC\s*Chronicle/);
    const short = brand.querySelector(".sidebar__brand-short");
    expect(short.textContent).toBe("SAC");
    expect(short.getAttribute("aria-hidden")).toBe("true"); // the full name is what is read out
  });
});

describe("transitions wait for first paint", () => {
  it("fold-ready is not present until the controller has run, and every transition is behind it", async () => {
    expect(document.body.classList.contains("fold-ready")).toBe(false);
    // every rule that moves a panel or the flap is scoped to body.fold-ready
    const motion = css.match(/transition:[\s\S]*?;/g) || [];
    expect(motion.length).toBeGreaterThan(0);
    for (const selector of [
      "body.fold-ready .fold__panel--2",
      "body.fold-ready .corner__flap",
      "body.fold-ready .fold__panel > .fold__shade",
    ]) {
      expect(css, selector).toContain(selector);
    }
    // …and the base rules for those parts declare no transition of their own
    const base =
      css.match(/\.fold__panel--2,\s*\.fold__panel--3,\s*\.fold__panel--4 \{[^}]*\}/)?.[0] ?? "";
    expect(base).not.toContain("transition");
    const flap = css.match(/\.corner__flap \{[^}]*\}/)?.[0] ?? "";
    expect(flap).not.toContain("transition");
  });

  it("adds fold-ready after the first frame", async () => {
    setViewport(false);
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
    expect(document.body.classList.contains("fold-ready")).toBe(false);
    vi.advanceTimersByTime(100);
    expect(document.body.classList.contains("fold-ready")).toBe(true);
  });
});

describe("first-visit hint", () => {
  async function start(desktop) {
    setViewport(desktop);
    const { renderNavbar } = await import("../../js/components/navbar.js");
    const { setupNavbarFold } = await import("../../js/components/navbar-fold.js");
    renderNavbar("home");
    setupNavbarFold();
  }
  const peeking = () => document.getElementById("navbarCorner").classList.contains("is-peeking");

  it("lifts the corner once per tab session on a phone", async () => {
    await start(false);
    expect(peeking()).toBe(true);
    expect(sessionStorage.getItem("sac-nav-peek")).toBe("1");
    // a second page of the same session does not repeat it
    document.getElementById("navbarCorner").classList.remove("is-peeking");
    shell();
    vi.resetModules();
    delete window.__sacSidebarBound;
    await start(false);
    expect(peeking()).toBe(false);
  });

  it("never on desktop, where the nav is already open", async () => {
    await start(true);
    expect(peeking()).toBe(false);
  });

  it("never under reduced motion, from the OS or the site's own toggle", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "on");
    await start(false);
    expect(peeking()).toBe(false);
  });
});

describe("the CSS contract", () => {
  it("the folded state hides every panel after the first, so it is not tab-reachable", () => {
    const folded =
      css.match(/\.fold__panel--2,\s*\.fold__panel--3,\s*\.fold__panel--4 \{[^}]*\}/)?.[0] ?? "";
    expect(folded).toContain("visibility: hidden");
  });

  it("neighbouring panels fold in opposite directions, so the sheet zig-zags like a fan", () => {
    const angle = (n) =>
      css.match(new RegExp(`\\.fold__panel--${n} \\{\\s*transform: rotateX\\((-?\\d+)deg\\)`))?.[1];
    expect(Number(angle(2))).toBe(-180);
    expect(Number(angle(3))).toBe(180);
    expect(Number(angle(4))).toBe(-180);
  });

  it("opens on phones from body.sidebar-open and on desktop unless body.sidebar-collapsed", () => {
    expect(css).toMatch(/@media \(max-width: 1023px\) \{[^@]*body\.sidebar-open \.fold__panel--2/);
    expect(css).toMatch(
      /@media \(min-width: 1024px\) \{[^@]*body:not\(\.sidebar-collapsed\) \.fold__panel--2/
    );
  });

  // seconds, from the rule that sets `prop` on `selector` ("0.34s" -> 0.34)
  const seconds = (selector, prop) => {
    const rule = css.match(new RegExp(`${selector} \\{[^}]*?${prop}: ([\\d.]+)s`));
    return rule ? Number(rule[1]) : NaN;
  };
  const closeLag = (n) => seconds(`body\\.fold-ready \\.fold__panel--${n}`, "--fold-lag");
  const openLag = (n) =>
    seconds(`body\\.fold-ready\\.sidebar-open \\.fold__panel--${n}`, "--fold-lag");
  const foldDuration = seconds(":root", "--fold-dur");

  it("unfolds top to bottom and folds bottom to top (staggered)", () => {
    expect(openLag(2)).toBeLessThan(openLag(3));
    expect(openLag(3)).toBeLessThan(openLag(4));
    expect(closeLag(4)).toBeLessThan(closeLag(3));
    expect(closeLag(3)).toBeLessThan(closeLag(2));
  });

  it("hides a folded panel at the instant it lands: visibility waits for lag + duration", () => {
    // spelled once, from the same two variables the transform uses, so they cannot drift
    expect(css).toMatch(
      /transform var\(--fold-dur\) var\(--fold-ease\) var\(--fold-lag\),\s*visibility 0s linear calc\(var\(--fold-lag\) \+ var\(--fold-dur\)\)/
    );
    // and opening shows it at once
    expect(css).toMatch(
      /body\.fold-ready\.sidebar-open \.fold__panel--2,[^{]*\{[^}]*visibility 0s;/
    );
  });

  it("on a phone the sheet leaves last, and nothing nested in it outlives it", () => {
    const rule = css.match(
      /body\.fold-ready \.fold__panel--1 \{\s*transition:\s*transform ([\d.]+)s var\(--fold-ease\) ([\d.]+)s,\s*visibility 0s linear ([\d.]+)s/
    );
    expect(rule, "closing transition of panel 1").not.toBeNull();
    const [dur, delay, hideAt] = rule.slice(1).map(Number);
    expect(hideAt).toBeCloseTo(delay + dur, 5); // gone exactly when its swing ends
    for (const n of [2, 3, 4]) {
      // every folded panel has landed (and been hidden) before the sheet itself goes
      expect(closeLag(n) + foldDuration).toBeLessThan(hideAt);
    }
  });

  it("the closed sheet is turned exactly edge-on, so it is a line and not a paper tongue", () => {
    expect(css).toMatch(/\.fold__panel--1 \{\s*transform: rotateX\(-90deg\);\s*visibility: hidden/);
  });

  it("nothing of the folded stack shows above the hinge line (the masthead's edge)", () => {
    expect(css).toMatch(/\.fold \{[^}]*clip-path: inset\(0 /);
  });

  it("the dog-ear's flap turns through 180deg about the fold line when the nav is open", () => {
    expect(css).toContain("transform: rotate3d(-1, 1, 0, var(--peel))");
    expect(css).toMatch(/body\.sidebar-open \.navbar-corner \{\s*--peel: 180deg/);
    expect(css).toMatch(/body:not\(\.sidebar-collapsed\) \.navbar-corner \{\s*--peel: 180deg/);
    // keyboard focus lifts it a little way, and so does hover — where hovering exists
    expect(css).toMatch(/\.navbar-corner:focus-visible \{\s*--peel: 26deg/);
    expect(css).toMatch(/\(hover: hover\) \{\s*\.navbar-corner:hover \{\s*--peel: 26deg/);
  });

  it("lifts the corner on hover only where hovering exists (a tap must not leave it peeled)", () => {
    // take out every (hover: hover) block; no .navbar-corner:hover may remain outside them
    let rest = css;
    for (;;) {
      const at = rest.search(/@media[^{]*\(hover: hover\)[^{]*\{/);
      if (at < 0) break;
      let depth = 0;
      let end = rest.indexOf("{", at);
      for (let i = end; i < rest.length; i++) {
        if (rest[i] === "{") depth++;
        if (rest[i] === "}" && --depth === 0) {
          end = i;
          break;
        }
      }
      rest = rest.slice(0, at) + rest.slice(end + 1);
    }
    expect(css).toContain(".navbar-corner:hover");
    expect(rest).not.toContain(".navbar-corner:hover");
  });

  it("the desktop rail does not animate until fold-ready, and narrows after the fold", () => {
    expect(css).toMatch(/body\.fold-ready #navbar \{\s*transition: width var\(--rail-dur\)/);
    expect(css).toMatch(
      /body\.fold-ready\.sidebar-collapsed #navbar \{\s*transition-delay: var\(--rail-lag\)/
    );
    const ms = (name) => Number(css.match(new RegExp(`${name}: (\\d+)ms`))?.[1]);
    // the rail starts to narrow only once the stack is mostly folded up…
    expect(ms("--rail-lag")).toBeGreaterThan(closeLag(2) * 1000 - 200);
    // …and the base #navbar rule carries no transition of its own (that ran on page load)
    const base = css.match(/\n#navbar \{[^}]*\}/)?.[0] ?? "";
    expect(base).not.toContain("transition");
  });

  it("lays the brand out at one width in both states, so the hinge never moves", () => {
    expect(css).toMatch(/\.sidebar__brand \{\s*width: calc\(var\(--sidebar-w\) - 4\.6rem\)/);
    // the old text swap (font-size: 0 plus ::before) snapped the block's height by 37px
    expect(css).not.toMatch(/sidebar__brand::before/);
    expect(css).not.toMatch(/body\.sidebar-collapsed \.sidebar__brand \{[^}]*font-size: 0/);
  });

  it("mirrors the corner on desktop, where it sits at the rail's top-right", () => {
    expect(css).toMatch(/@media \(min-width: 1024px\) \{[^@]*--mirror: -1/);
  });

  it("keeps the 44px-or-better touch target: the corner is 56px", () => {
    expect(css).toContain("--corner: 56px");
  });

  it("reduced motion removes the movement (the global rule zeroes every duration)", () => {
    const vars = readFileSync(resolve(root, "css/variables.css"), "utf-8");
    expect(vars).toContain("@media (prefers-reduced-motion: reduce)");
    expect(vars).toContain('[data-reduce-motion="on"] *');
    expect(vars).toContain("transition-duration: 0.001ms !important");
  });

  it("the viewer hides the corner while a photograph is open, and print never shows it", () => {
    expect(readFileSync(resolve(root, "css/viewer.css"), "utf-8")).toContain(
      "body.viewer-open .navbar-corner"
    );
    expect(readFileSync(resolve(root, "css/print.css"), "utf-8")).toContain(".navbar-corner");
  });
});
