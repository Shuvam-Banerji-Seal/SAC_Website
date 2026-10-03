/**
 * test/unit/calendar.test.js — what the API returns, and what the calendar is told.
 *
 * Regression history: the SAC calendar is shared as "see only free/busy"
 * (accessRole "freeBusyReader"), so every item has times and no summary,
 * description or location. That used to render as a wall of "Untitled event"
 * cards. fetchEventsBetween now names the situation (`mode: "busy"`) instead.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchEventsBetween, calendarLinks } from "../../js/utils/calendar.js";

const ghost = (id, start, end = start) => ({
  id,
  status: "confirmed",
  start: { dateTime: start },
  end: { dateTime: end },
});
const detailed = (id, summary, start, end = start) => ({
  id,
  summary,
  status: "confirmed",
  description: `${summary} details here`,
  location: "Main Hall",
  start: { dateTime: start },
  end: { dateTime: end },
});

const RANGE = ["2026-09-27T00:00:00+05:30", "2026-11-08T00:00:00+05:30"];

function mockFetch(payload, { ok = true, status = 200 } = {}) {
  global.fetch = vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }));
  return global.fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchEventsBetween — modes", () => {
  it("reports mode 'busy' when every item is a time-only ghost", async () => {
    mockFetch({
      items: [
        ghost("a", "2026-10-01T10:00:00+05:30", "2026-10-01T11:00:00+05:30"),
        ghost("b", "2026-10-02T10:00:00+05:30", "2026-10-02T11:00:00+05:30"),
      ],
    });
    const { mode, events } = await fetchEventsBetween(...RANGE);
    expect(mode).toBe("busy");
    expect(events).toHaveLength(2);
    expect(events.every((e) => !e.hasTitle)).toBe(true);
  });

  it("merges overlapping busy blocks and collapses exact duplicates", async () => {
    mockFetch({
      items: [
        ghost("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30"),
        ghost("b", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30"), // exact twin
        ghost("c", "2026-10-07T19:30:00+05:30", "2026-10-07T20:30:00+05:30"), // overlaps
      ],
    });
    const { events } = await fetchEventsBetween(...RANGE);
    expect(events).toHaveLength(1);
  });

  it("reports mode 'detailed' and keeps only titled events in a mixed response", async () => {
    mockFetch({
      items: [
        ghost("a", "2026-10-01T10:00:00+05:30"),
        detailed(
          "b",
          "Inauguration Night",
          "2026-10-03T18:00:00+05:30",
          "2026-10-03T20:00:00+05:30"
        ),
      ],
    });
    const { mode, events } = await fetchEventsBetween(...RANGE);
    expect(mode).toBe("detailed");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: "Inauguration Night", location: "Main Hall" });
  });

  it("returns fully detailed calendars in time order", async () => {
    mockFetch({
      items: [
        detailed("c", "Quiz Finals", "2026-10-04T18:00:00+05:30", "2026-10-04T19:00:00+05:30"),
        detailed(
          "b",
          "Inauguration Night",
          "2026-10-03T18:00:00+05:30",
          "2026-10-03T19:00:00+05:30"
        ),
      ],
    });
    const { events } = await fetchEventsBetween(...RANGE);
    expect(events.map((e) => e.title)).toEqual(["Inauguration Night", "Quiz Finals"]);
  });

  it("treats Google's own 'Busy' placeholder as a hidden title", async () => {
    mockFetch({
      items: [
        {
          id: "x",
          summary: "Busy",
          start: { dateTime: "2026-10-05T10:00:00+05:30" },
          end: { dateTime: "2026-10-05T11:00:00+05:30" },
        },
      ],
    });
    const { mode } = await fetchEventsBetween(...RANGE);
    expect(mode).toBe("busy");
  });

  it("reports 'empty' for a month with nothing in it", async () => {
    mockFetch({ items: [] });
    expect((await fetchEventsBetween(...RANGE)).mode).toBe("empty");
  });

  it("drops cancelled events", async () => {
    mockFetch({
      items: [{ ...detailed("a", "Quiz", "2026-10-04T18:00:00+05:30"), status: "cancelled" }],
    });
    expect((await fetchEventsBetween(...RANGE)).mode).toBe("empty");
  });
});

describe("fetchEventsBetween — failures never throw", () => {
  it("returns mode 'error' with the status on a 403", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch(
      { error: { message: "Requests from referer are blocked." } },
      { ok: false, status: 403 }
    );
    const result = await fetchEventsBetween(...RANGE);
    expect(result.mode).toBe("error");
    expect(result.error.status).toBe(403);
    expect(result.events).toEqual([]);
    warn.mockRestore();
  });

  it("returns mode 'error' on a network failure", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await fetchEventsBetween(...RANGE);
    expect(result.mode).toBe("error");
    expect(result.error.message).toContain("network down");
  });

  it("returns mode 'error' on an unreadable reply", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
      text: async () => "",
    }));
    expect((await fetchEventsBetween(...RANGE)).mode).toBe("error");
  });
});

describe("request shape", () => {
  it("asks for exactly the window it was given, single events, time-ordered", async () => {
    const f = mockFetch({ items: [] });
    await fetchEventsBetween(...RANGE);
    const url = decodeURIComponent(String(f.mock.calls[0][0]));
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
    expect(url).toContain(`timeMin=${RANGE[0]}`);
    expect(url).toContain(`timeMax=${RANGE[1]}`);
  });

  it("links to Google Calendar for subscribing", () => {
    const links = calendarLinks();
    expect(links.add).toContain("calendar.google.com/calendar/render?cid=");
    expect(links.view).toContain("calendar.google.com/calendar/embed");
  });
});
