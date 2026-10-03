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

  it("unfolds top to bottom and folds bottom to top (staggered)", () => {
    const delay = (sel) =>
      Number(css.match(new RegExp(`${sel} \\{\\s*transition-delay: ([\\d.]+)s`))?.[1]);
    const open = "body\\.fold-ready\\.sidebar-open \\.fold__panel--";
    expect(delay(`${open}2`)).toBeLessThan(delay(`${open}3`));
    expect(delay(`${open}3`)).toBeLessThan(delay(`${open}4`));
    const close = "body\\.fold-ready \\.fold__panel--";
    expect(delay(`${close}4`)).toBeLessThan(delay(`${close}3`));
    expect(delay(`${close}3`)).toBeLessThan(delay(`${close}2`));
  });

  it("hides a folded panel only after it has landed, not while it is still moving", () => {
    expect(css).toMatch(/visibility 0s linear 0\.78s/);
  });

  it("the dog-ear's flap turns through 180deg about the fold line when the nav is open", () => {
    expect(css).toContain("transform: rotate3d(-1, 1, 0, var(--peel))");
    expect(css).toMatch(/body\.sidebar-open \.navbar-corner \{\s*--peel: 180deg/);
    expect(css).toMatch(/body:not\(\.sidebar-collapsed\) \.navbar-corner \{\s*--peel: 180deg/);
    // hover lifts it a little way
    expect(css).toMatch(
      /\.navbar-corner:hover,\s*\.navbar-corner:focus-visible \{\s*--peel: 26deg/
    );
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
