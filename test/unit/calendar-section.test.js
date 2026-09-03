/**
 * test/unit/calendar-section.test.js — home page calendar wiring.
 *
 * Verifies loadCalendarSection renders event cards AND the free/busy
 * guidance card (not an empty grid) when the API withholds titles.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadCalendarSection } from "../../js/pages/home.js";

const ghost = (id, start) => ({ id, start: { dateTime: start }, end: { dateTime: start } });

function shell() {
  document.body.innerHTML = `
    <section id="calendar-section" style="display:none">
      <div id="calendar-grid"></div>
    </section>`;
}

function mockApi(payload) {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes("googleapis")) {
      return { ok: true, status: 200, json: async () => payload, text: async () => "" };
    }
    throw new Error("unexpected fetch: " + url);
  });
}

beforeEach(() => {
  shell();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("calendar section rendering", () => {
  it("renders the free/busy guidance card when titles are withheld", async () => {
    mockApi({
      items: [ghost("a", "2026-10-01T10:00:00+05:30"), ghost("b", "2026-10-02T10:00:00+05:30")],
    });
    await loadCalendarSection();
    const section = document.getElementById("calendar-section");
    expect(section.style.display).toBe("");
    const title = section.querySelector(".pinned-card__title");
    expect(title?.textContent).toBe("Calendar titles hidden");
    expect(section.textContent).toContain("free/busy only");
  });

  it("renders event cards with titles when details exist", async () => {
    mockApi({
      items: [
        {
          id: "b",
          summary: "Inauguration Night",
          description: "details",
          location: "Main Hall",
          start: { dateTime: "2026-10-03T18:00:00+05:30" },
          end: { dateTime: "2026-10-03T20:00:00+05:30" },
        },
      ],
    });
    await loadCalendarSection();
    const title = document.querySelector(".pinned-card__title");
    expect(title?.textContent).toBe("Inauguration Night");
    expect(document.body.textContent).toContain("Main Hall");
  });

  it("renders the empty-state card on network failure", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("down");
    });
    await loadCalendarSection();
    expect(document.querySelector(".pinned-card__title")?.textContent).toBe("No upcoming events");
  });
});
