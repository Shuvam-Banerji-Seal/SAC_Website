/**
 * test/unit/calendar-component.test.js — the month calendar, rendered in jsdom.
 *
 * The API is replaced by an injected fetchRange, and "now" is pinned to
 * Saturday 3 Oct 2026 (IST) so the grid is the same on every machine.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initCalendar } from "../../js/components/calendar.js";
import { normalizeEvent, prepareEvents } from "../../js/utils/calendar-model.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const NOW = new Date("2026-10-03T10:00:00+05:30");

const raw = (id, start, end, extra = {}) => ({
  id,
  status: "confirmed",
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});
const flush = async (n = 6) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

/** fetchRange stub shaped like utils/calendar.js: normalised, cleaned events + a mode. */
function source(items, mode = "busy") {
  const calls = [];
  const fetchRange = vi.fn(async (min, max) => {
    calls.push([min, max]);
    const events = prepareEvents(items.map(normalizeEvent).filter(Boolean));
    return { events, mode: events.length ? mode : "empty" };
  });
  return { fetchRange, calls };
}

let mount;
beforeEach(() => {
  document.body.innerHTML = '<div id="m"></div>';
  mount = document.getElementById("m");
});
afterEach(() => {
  document.body.innerHTML = "";
});

const start = async (items, mode, options = {}) => {
  const { fetchRange, calls } = source(items, mode);
  const cal = initCalendar(mount, {
    fetchRange,
    now: NOW,
    loadStyles: () => Promise.resolve(),
    ...options,
  });
  await flush();
  return { cal, calls, fetchRange };
};

describe("grid", () => {
  it("draws October 2026 as six weeks with today marked and selected", async () => {
    await start([]);
    expect(mount.querySelector(".cal__title").textContent.replace(/\s+/g, " ")).toBe(
      "October 2026"
    );
    expect(mount.querySelectorAll(".cal__cell")).toHaveLength(42);
    const today = mount.querySelector(".cal__cell.is-today .cal__day");
    expect(today.dataset.day).toBe("2026-10-03");
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-10-03");
  });

  it("is a real grid: column headers, gridcells, one tab stop", async () => {
    await start([]);
    expect(mount.querySelector("table").getAttribute("role")).toBe("grid");
    expect(mount.querySelectorAll("thead th")).toHaveLength(7);
    expect(mount.querySelectorAll('td[role="gridcell"]')).toHaveLength(42);
    expect(mount.querySelectorAll('.cal__day[tabindex="0"]')).toHaveLength(1);
  });

  it("labels each day for screen readers, including today and the count", async () => {
    await start([raw("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")]);
    const label = (d) => mount.querySelector(`[data-day="${d}"]`).getAttribute("aria-label");
    expect(label("2026-10-03")).toContain("today");
    expect(label("2026-10-03")).toContain("nothing scheduled");
    expect(label("2026-10-07")).toContain("Wednesday 7 October 2026");
    expect(label("2026-10-07")).toContain("1 booked slot");
  });

  it("asks the API for the whole visible grid, plus the next ten weeks", async () => {
    const { calls } = await start([]);
    expect(
      calls.some(([min, max]) => min.startsWith("2026-09-27") && max.startsWith("2026-11-08"))
    ).toBe(true);
    expect(calls.some(([min]) => min.startsWith("2026-10-03"))).toBe(true);
  });
});

describe("free/busy mode", () => {
  const items = [
    raw("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30"),
    raw("b", "2026-10-14T19:00:00+05:30", "2026-10-14T20:00:00+05:30"),
    raw("c", "2026-10-21T19:00:00+05:30", "2026-10-21T20:00:00+05:30"),
    // overlapping blocks the same day, and an exact duplicate
    raw("d", "2026-10-09T19:00:00+05:30", "2026-10-09T20:00:00+05:30"),
    raw("e", "2026-10-09T19:30:00+05:30", "2026-10-09T20:30:00+05:30"),
    raw("f", "2026-10-15T10:00:00+05:30", "2026-10-15T11:00:00+05:30"),
    raw("g", "2026-10-15T10:00:00+05:30", "2026-10-15T11:00:00+05:30"),
  ];

  it("shows hatched bars, never invented event titles, and says what it is showing", async () => {
    await start(items);
    expect(mount.querySelector(".cal").dataset.mode).toBe("busy");
    expect(mount.querySelectorAll(".cal__bar").length).toBeGreaterThan(0);
    expect(mount.querySelector(".cal__chip")).toBeNull();
    expect(mount.querySelector(".cal__note").textContent).toContain("Booked slots only");
    // visitors are never told to go and change settings
    expect(mount.textContent).not.toMatch(/SAC team/i);
  });

  it("merges overlapping blocks and collapses an exact duplicate to one per day", async () => {
    await start(items);
    expect(mount.querySelectorAll('[data-day="2026-10-09"] .cal__bar')).toHaveLength(1);
    expect(mount.querySelectorAll('[data-day="2026-10-15"] .cal__bar')).toHaveLength(1);
  });

  it("collapses the standing weekly slot to one 'coming up' entry", async () => {
    await start(items);
    const go = [...mount.querySelectorAll(".cal__go")].map((b) =>
      b.textContent.replace(/\s+/g, " ")
    );
    const weekly = go.filter((t) => t.includes("Every Wednesday"));
    expect(weekly).toHaveLength(1);
    expect(weekly[0]).toContain("7:00 pm");
  });

  it("clicking a 'coming up' entry jumps to that day", async () => {
    await start(items);
    mount.querySelector('.cal__go[data-day="2026-10-09"]').click();
    await flush();
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-10-09");
    expect(mount.querySelector(".cal__selected").textContent).toContain("Friday 9 October");
  });
});

describe("detailed mode", () => {
  const items = [
    raw("a", "2026-10-09T18:30:00+05:30", "2026-10-09T21:00:00+05:30", {
      summary: "Open Mic Night",
      location: "Amphitheatre",
      description: "Poetry and music.",
      htmlLink: "https://calendar.google.com/event?eid=a",
    }),
    raw("b", "2026-10-09T18:30:00+05:30", "2026-10-09T21:00:00+05:30", {
      summary: "open mic night",
    }),
  ];

  it("shows titled chips and collapses the same event listed twice", async () => {
    await start(items, "detailed");
    expect(mount.querySelector(".cal").dataset.mode).toBe("detailed");
    expect(mount.querySelectorAll('[data-day="2026-10-09"] .cal__chip')).toHaveLength(1);
    expect(mount.querySelector(".cal__bar")).toBeNull();
  });

  it("the day panel carries place, details and a link", async () => {
    const { cal } = await start(items, "detailed");
    await cal.select("2026-10-09");
    await flush();
    const panel = mount.querySelector(".cal__selected");
    expect(panel.textContent).toContain("Open Mic Night");
    expect(panel.textContent).toContain("Amphitheatre");
    expect(panel.textContent).toContain("Poetry and music.");
    expect(panel.querySelector("a.cal__link").getAttribute("rel")).toContain("noopener");
  });

  it("offers to add the calendar once details are public", async () => {
    await start(items, "detailed");
    expect(mount.querySelector(".cal__note a").href).toContain(
      "calendar.google.com/calendar/render"
    );
  });
});

describe("navigation", () => {
  it("steps by month and keeps the same day of the month", async () => {
    await start([]);
    mount.querySelector(".cal__nav--next").click();
    await flush();
    expect(mount.querySelector(".cal__title").textContent.replace(/\s+/g, " ")).toBe(
      "November 2026"
    );
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-11-03");
  });

  it("clamps the day when the next month is shorter", async () => {
    await start([], "busy", { now: new Date("2026-01-31T10:00:00+05:30") });
    mount.querySelector(".cal__nav--next").click();
    await flush();
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-02-28");
  });

  it("'Today' returns from any month", async () => {
    await start([]);
    mount.querySelector(".cal__nav--next").click();
    await flush();
    mount.querySelector(".cal__today").click();
    await flush();
    expect(mount.querySelector(".cal__title").textContent.replace(/\s+/g, " ")).toBe(
      "October 2026"
    );
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-10-03");
  });

  it("does not refetch a month it already has", async () => {
    const { fetchRange } = await start([]);
    const before = fetchRange.mock.calls.length;
    mount.querySelector(".cal__nav--next").click();
    await flush();
    mount.querySelector(".cal__nav--prev").click();
    await flush();
    // November is one new request; October is already cached
    expect(fetchRange.mock.calls.length).toBe(before + 1);
  });

  it("arrow keys move the selection; PageDown pages a month", async () => {
    await start([]);
    const key = async (k) => {
      const focused =
        mount.querySelector(".cal__day:focus") || mount.querySelector('.cal__day[tabindex="0"]');
      focused.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      await flush();
    };
    await key("ArrowRight");
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-10-04");
    await key("ArrowDown");
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-10-11");
    await key("PageDown");
    expect(mount.querySelector(".cal__cell.is-selected .cal__day").dataset.day).toBe("2026-11-11");
    expect(mount.querySelectorAll('.cal__day[tabindex="0"]')).toHaveLength(1);
  });
});

describe("loading order", () => {
  it("keeps the mount's placeholder until the stylesheet is in, then shows the sheet", async () => {
    // markup first, stylesheet after, was a bare table and bare buttons on the page for the
    // length of a stylesheet download, followed by a jump when the CSS landed
    let styled;
    const loadStyles = () => new Promise((resolve) => (styled = resolve));
    const { fetchRange } = source([]);
    initCalendar(mount, { fetchRange, now: NOW, loadStyles });
    await flush();
    expect(mount.childElementCount).toBe(0); // :empty — home.css paints "Unfolding the calendar…"
    expect(mount.querySelector(".cal")).toBeNull();

    styled();
    await flush();
    expect(mount.querySelector(".cal")).not.toBeNull();
    expect(mount.querySelectorAll(".cal__cell")).toHaveLength(42);
  });

  it("still shows the calendar if the stylesheet loader fails", async () => {
    const { fetchRange } = source([]);
    initCalendar(mount, {
      fetchRange,
      now: NOW,
      loadStyles: () => Promise.reject(new Error("offline")),
    });
    await flush();
    expect(mount.querySelectorAll(".cal__cell")).toHaveLength(42);
  });

  it("is not shown at all if it was destroyed while the stylesheet was loading", async () => {
    let styled;
    const { fetchRange } = source([]);
    const cal = initCalendar(mount, {
      fetchRange,
      now: NOW,
      loadStyles: () => new Promise((resolve) => (styled = resolve)),
    });
    await flush(); // the loader has been asked
    cal.destroy();
    styled();
    await flush();
    expect(mount.querySelector(".cal")).toBeNull();
  });
});

describe("failure", () => {
  it("shows a banner, still draws the month, and Try again recovers", async () => {
    let fail = true;
    const fetchRange = vi.fn(async () =>
      fail
        ? { events: [], mode: "error", error: { status: 403, message: "blocked" } }
        : { events: [], mode: "empty" }
    );
    initCalendar(mount, { fetchRange, now: NOW, loadStyles: () => Promise.resolve() });
    await flush();
    expect(mount.querySelector(".cal__banner").hidden).toBe(false);
    expect(mount.querySelectorAll(".cal__cell")).toHaveLength(42);
    fail = false;
    mount.querySelector(".cal__retry").click();
    await flush();
    expect(mount.querySelector(".cal__banner").hidden).toBe(true);
  });

  it("survives a fetcher that throws", async () => {
    const fetchRange = vi.fn(async () => {
      throw new Error("boom");
    });
    initCalendar(mount, { fetchRange, now: NOW, loadStyles: () => Promise.resolve() });
    await flush();
    expect(mount.querySelectorAll(".cal__cell")).toHaveLength(42);
    expect(mount.querySelector(".cal__banner").hidden).toBe(false);
  });

  it("binds once per mount", async () => {
    const { cal } = await start([]);
    expect(cal).not.toBeNull();
    expect(initCalendar(mount, { fetchRange: vi.fn(), now: NOW })).toBeNull();
  });
});

describe("home page wiring", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf-8");
  const home = readFileSync(resolve(root, "js/pages/home.js"), "utf-8");
  const css = readFileSync(resolve(root, "css/pages/calendar.css"), "utf-8");

  it("reserves the calendar's own height, so it replaces its placeholder without a jump", () => {
    const homeCss = readFileSync(resolve(root, "css/pages/home.css"), "utf-8");
    const rem = (query) => {
      const block = query
        ? homeCss.match(
            new RegExp(`@media \\(${query}\\) \\{\\s*\\.cal-mount \\{\\s*min-height: ([\\d.]+)rem`)
          )
        : homeCss.match(/\n\.cal-mount \{\s*min-height: ([\d.]+)rem/);
      return Number(block?.[1]);
    };
    // measured on the drawn calendar with no events: 710px, 964px, 811px (at 16px to the rem)
    expect(rem(null)).toBeGreaterThanOrEqual(44);
    expect(rem("max-width: 900px")).toBeGreaterThanOrEqual(60);
    expect(rem("max-width: 640px")).toBeGreaterThanOrEqual(50);
    // and the placeholder is the mount itself, so it is exactly that tall
    expect(homeCss).toMatch(/\.cal-mount:empty \{[^}]*display: flex/);
  });

  it("starts watching for the reader before the archive loads, and loads script + sheet together", () => {
    expect(home.indexOf("loadCalendarSection();")).toBeLessThan(home.indexOf("loadAssetsMap()"));
    expect(home).toMatch(
      /Promise\.all\(\[\s*import\("\.\.\/components\/calendar\.js"\),\s*loadStylesheet\("css\/pages\/calendar\.css"/
    );
  });

  it("ships a visible mount, not a hidden section waiting for cards", () => {
    expect(html).toContain('id="calendar-mount"');
    expect(html).toMatch(/id="calendar-section" class="notebook-section">/);
    expect(html).not.toContain("calendar-grid");
  });

  it("loads the calendar lazily — script, style and API wait for the scroll", () => {
    expect(home).toContain('import("../components/calendar.js")');
    expect(home).toContain("IntersectionObserver");
    // not render-blocking: no <link> in the page head
    expect(html).not.toContain("css/pages/calendar.css");
    expect(readFileSync(resolve(root, "js/components/calendar.js"), "utf-8")).toContain(
      "css/pages/calendar.css"
    );
  });

  it("honours reduced motion, from the OS and from the site's own toggle", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain('[data-reduce-motion="on"] .cal');
  });
});
