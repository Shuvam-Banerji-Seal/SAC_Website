/**
 * test/unit/search-palette.test.js — the search palette and the launcher that opens it.
 *
 * Behaviour, not looks: how it opens (button, "/", Ctrl/⌘ K), the combobox/listbox
 * semantics a screen reader depends on, keyboard movement, focus return, the empty state,
 * and that the shell only carries the small launcher — the palette and its stylesheet
 * arrive on first use. How it looks is checked in a browser.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// jsdom never fires a <link>'s load event; without this every open would wait out the 1.5 s guard.
vi.mock("../../js/utils/dom.js", async (importOriginal) => ({
  ...(await importOriginal()),
  loadStylesheet: vi.fn(() => Promise.resolve()),
}));

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

const key = (target, k, init = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init })
  );
const type = (input, value) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await vi.advanceTimersByTimeAsync(20);
};
const options = () => [...document.querySelectorAll('#search-results [role="option"]')];

let stop;
let mod;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  document.body.className = "";
  document.body.innerHTML = `
    <button id="opener" data-open-search type="button">Search</button>
    <button id="performing" data-open-search="performing" type="button">Performing</button>
    <input id="elsewhere" type="text" />
    <main><a id="first" href="#">first</a></main>`;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  const { initSearchLauncher } = await import("../../js/components/search-launcher.js");
  stop = initSearchLauncher();
  mod = await import("../../js/components/search.js");
});

afterEach(() => {
  stop?.();
  document.querySelector(".search")?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("opening", () => {
  it("opens from a data-open-search button and focuses the field", async () => {
    document.getElementById("opener").focus();
    document.getElementById("opener").click();
    await flush();
    const dialog = document.querySelector(".search");
    expect(dialog.hidden).toBe(false);
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement.id).toBe("search-input");
    expect(document.body.classList.contains("search-open")).toBe(true);
  });

  it('opens on "/" outside a field', async () => {
    key(document.body, "/");
    await flush();
    expect(document.querySelector(".search")?.hidden).toBe(false);
  });

  it('leaves "/" alone while someone is typing', async () => {
    const field = document.getElementById("elsewhere");
    field.focus();
    key(field, "/");
    await flush();
    expect(document.querySelector(".search")).toBeNull();
  });

  it("opens on Ctrl+K and ⌘K even from a field, and claims the shortcut", async () => {
    const field = document.getElementById("elsewhere");
    field.focus();
    expect(key(field, "k", { ctrlKey: true })).toBe(false); // preventDefault was called
    await flush();
    expect(document.querySelector(".search")?.hidden).toBe(false);
    mod.closeSearch();
    key(field, "k", { metaKey: true });
    await flush();
    expect(document.querySelector(".search")?.hidden).toBe(false);
  });

  it("ignores a plain k and a modified slash", async () => {
    key(document.body, "k");
    key(document.body, "/", { ctrlKey: true });
    await flush();
    expect(document.querySelector(".search")).toBeNull();
  });

  it("opens with an interest pre-selected when the trigger names one", async () => {
    document.getElementById("performing").click();
    await flush();
    const on = document.querySelector(".search__chip.is-on");
    expect(on?.textContent).toBe("Performing arts");
    expect(on.getAttribute("aria-pressed")).toBe("true");
    expect(options().length).toBeGreaterThan(0);
    expect(document.querySelector(".search__heading").textContent).toMatch(
      /Performing arts — \d+ clubs?/
    );
  });

  it("is built once and reused", async () => {
    document.getElementById("opener").click();
    await flush();
    mod.closeSearch();
    document.getElementById("opener").click();
    await flush();
    expect(document.querySelectorAll(".search")).toHaveLength(1);
  });
});

describe("closing", () => {
  it("closes on Escape and gives focus back", async () => {
    const opener = document.getElementById("opener");
    opener.focus();
    opener.click();
    await flush();
    key(document.getElementById("search-input"), "Escape");
    expect(document.querySelector(".search").hidden).toBe(true);
    expect(document.body.classList.contains("search-open")).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it("closes on the close button and on the scrim", async () => {
    document.getElementById("opener").click();
    await flush();
    document.querySelector(".search__close").click();
    expect(document.querySelector(".search").hidden).toBe(true);
    document.getElementById("opener").click();
    await flush();
    document.querySelector(".search__scrim").click();
    expect(document.querySelector(".search").hidden).toBe(true);
  });
});

describe("combobox semantics", () => {
  it("wires the input to the listbox", async () => {
    document.getElementById("opener").click();
    await flush();
    const input = document.getElementById("search-input");
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-controls")).toBe("search-results");
    expect(document.getElementById("search-results").getAttribute("role")).toBe("listbox");
    expect(input.getAttribute("aria-expanded")).toBe("false"); // nothing typed, no list
  });

  it("lists results as options and points aria-activedescendant at the first", async () => {
    document.getElementById("opener").click();
    await flush();
    const input = document.getElementById("search-input");
    type(input, "chess");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const rows = options();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].textContent).toMatch(/chess/i);
    expect(rows[0].getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(rows[0].id);
    expect(rows[0].querySelector("mark")?.textContent.toLowerCase()).toBe("chess");
  });

  it("announces the result count politely", async () => {
    document.getElementById("opener").click();
    await flush();
    type(document.getElementById("search-input"), "chess");
    expect(document.querySelector('.search [role="status"]').textContent).toMatch(/\d+ results?/);
  });
});

describe("keyboard", () => {
  it("moves the highlight with the arrows and wraps", async () => {
    document.getElementById("opener").click();
    await flush();
    const input = document.getElementById("search-input");
    type(input, "club");
    const rows = options();
    expect(rows.length).toBeGreaterThan(2);
    key(input, "ArrowDown");
    expect(rows[1].getAttribute("aria-selected")).toBe("true");
    expect(rows[0].getAttribute("aria-selected")).toBe("false");
    expect(input.getAttribute("aria-activedescendant")).toBe(rows[1].id);
    key(input, "ArrowUp");
    key(input, "ArrowUp");
    expect(rows.at(-1).getAttribute("aria-selected")).toBe("true"); // wrapped to the end
  });

  it("Enter opens the highlighted result and closes the palette", async () => {
    document.getElementById("opener").click();
    await flush();
    const input = document.getElementById("search-input");
    type(input, "drama");
    const link = options()[0].querySelector("a");
    const clicked = vi.fn((e) => e.preventDefault()); // jsdom can't navigate
    link.addEventListener("click", clicked);
    key(input, "Enter");
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(link.getAttribute("href")).toMatch(/aarshi\.html$/);
    expect(document.querySelector(".search").hidden).toBe(true);
  });

  it("Enter with no results does nothing", async () => {
    document.getElementById("opener").click();
    await flush();
    const input = document.getElementById("search-input");
    type(input, "zzzzqqq");
    expect(key(input, "Enter")).toBe(true); // not prevented, nothing to open
    expect(document.querySelector(".search").hidden).toBe(false);
  });

  it("keeps Tab inside the dialog", async () => {
    document.getElementById("opener").click();
    await flush();
    const stops = [...document.querySelectorAll(".search__sheet input, .search__sheet button")];
    const last = stops.at(-1);
    last.focus();
    key(last, "Tab");
    expect(document.activeElement.id).toBe("search-input");
    key(document.activeElement, "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});

describe("the empty states", () => {
  it("offers interests, a surprise and a few words to try before anything is typed", async () => {
    document.getElementById("opener").click();
    await flush();
    const chips = [...document.querySelectorAll(".search__chip")].map((c) => c.textContent);
    expect(chips).toContain("Performing arts");
    expect(chips).toContain("Sport & fitness");
    expect(chips.some((c) => /surprise/i.test(c))).toBe(true);
    expect(document.querySelectorAll(".search__try-word").length).toBeGreaterThan(2);
  });

  it('never prints a stray "null" or "undefined" into the empty state', async () => {
    // append(null) writes the word "null" — it showed above "What are you into?" once
    document.getElementById("opener").click();
    await flush();
    const text = () => document.querySelector(".search__sheet").textContent;
    expect(text()).not.toMatch(/null|undefined/);
    document.querySelector(".search__chip").click(); // an interest is chosen: the heading branch
    expect(text()).not.toMatch(/null|undefined/);
    type(document.getElementById("search-input"), "zzzzqqq");
    expect(text()).not.toMatch(/null|undefined/);
  });

  it("an interest chip lists its clubs, and pressing it again clears the filter", async () => {
    document.getElementById("opener").click();
    await flush();
    const chip = () =>
      [...document.querySelectorAll(".search__chip")].find((c) => /Sport/.test(c.textContent));
    chip().click();
    expect(options().length).toBeGreaterThan(3);
    expect(chip().getAttribute("aria-pressed")).toBe("true");
    chip().click();
    expect(options()).toHaveLength(0);
  });

  it("a word to try fills the box and searches", async () => {
    document.getElementById("opener").click();
    await flush();
    document.querySelector(".search__try-word").click();
    expect(document.getElementById("search-input").value).not.toBe("");
    expect(options().length).toBeGreaterThan(0);
  });

  it("says so, and offers the directory, when nothing matches", async () => {
    document.getElementById("opener").click();
    await flush();
    type(document.getElementById("search-input"), "zzzzqqq");
    expect(document.querySelector(".search__empty").textContent).toMatch(
      /Nothing in the Chronicle/
    );
    expect(document.querySelector('.search__suggest a[href$="clubs.html"]')).not.toBeNull();
    expect(document.querySelector('.search [role="status"]').textContent).toBe("No results");
  });

  it("escapes what was typed instead of parsing it as HTML", async () => {
    document.getElementById("opener").click();
    await flush();
    type(document.getElementById("search-input"), "<img src=x onerror=alert(1)>");
    expect(document.querySelector(".search img")).toBeNull();
    expect(document.querySelector(".search__empty").textContent).toContain("<img");
  });
});

describe("what ships with the shell", () => {
  it("keeps the palette and its stylesheet out of the shell", () => {
    const main = read("js/main.js");
    expect(main).toContain("search-launcher.js");
    expect(main).not.toMatch(/from "\.\/components\/search\.js"/);
    const launcher = read("js/components/search-launcher.js");
    expect(launcher).not.toMatch(/^import /m); // only a dynamic import()
    expect(launcher).toContain('import("./search.js")');
    // the stylesheet is loaded by the palette, never linked from a page
    expect(read("index.html")).not.toContain("search.css");
    expect(read("js/components/search.js")).toContain('loadStylesheet("css/search.css")');
  });

  it("styles every class the palette uses", () => {
    const css = read("css/search.css");
    const used = new Set(read("js/components/search.js").match(/\bsearch__[a-z-]+\b/g));
    expect(used.size).toBeGreaterThan(10);
    for (const name of used) {
      // modifier-only classes (is-on / is-active) are styled through their block
      expect(css, `.${name} has no rule in search.css`).toContain(name);
    }
  });

  it("overrides the two global rules that spoilt it (72ch paragraphs and lists, the input's outline)", () => {
    const css = read("css/search.css");
    expect(css).toMatch(/\.search p,\s*\.search ul\s*{[^}]*max-width:\s*none/);
    expect(css).toMatch(/\.search__input:focus-visible\s*{[^}]*outline:\s*none/);
    // …and the underline that stands in for the outline must exist
    expect(css).toMatch(/\.search__form:focus-within\s*{[^}]*box-shadow/);
  });

  it("puts a Search button in the sidebar on every page", async () => {
    document.body.innerHTML = `<nav id="navbar"></nav><button id="navbarCorner" type="button"></button>`;
    const { renderNavbar } = await import("../../js/components/navbar.js");
    renderNavbar("home");
    const button = document.querySelector("#navbar [data-open-search]");
    expect(button).not.toBeNull();
    expect(button.textContent).toMatch(/Search/);
    expect(button.getAttribute("aria-keyshortcuts")).toContain("Control+K");
  });
});
