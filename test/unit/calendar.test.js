/**
 * test/unit/calendar.test.js — free/busy-only detection + graceful fallbacks.
 *
 * Regression: the SAC calendar shared as "see only free/busy" returns items
 * with times but no summary/description/location, which used to render as a
 * wall of "Untitled event" cards carrying only a time.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchUpcomingEvents } from "../../js/utils/calendar.js";

const ghost = (id, start) => ({ id, start: { dateTime: start }, end: { dateTime: start } });
const detailed = (id, summary, start) => ({
  id,
  summary,
  description: `${summary} details here`,
  location: "Main Hall",
  start: { dateTime: start },
  end: { dateTime: start },
});

function mockFetchOnce(payload, ok = true, status = 200) {
  global.fetch = vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }));
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("calendar free/busy handling", () => {
  it("throws FREEBUSY_ONLY when every item is a time-only ghost", async () => {
    mockFetchOnce({
      items: [ghost("a", "2026-10-01T10:00:00+05:30"), ghost("b", "2026-10-02T10:00:00+05:30")],
    });
    await expect(fetchUpcomingEvents()).rejects.toMatchObject({ code: "FREEBUSY_ONLY" });
  });

  it("drops individual ghosts but keeps detailed events in mixed responses", async () => {
    mockFetchOnce({
      items: [
        ghost("a", "2026-10-01T10:00:00+05:30"),
        detailed("b", "Inauguration Night", "2026-10-03T18:00:00+05:30"),
      ],
    });
    const events = await fetchUpcomingEvents();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Inauguration Night");
    expect(events[0].location).toBe("Main Hall");
  });

  it("still renders fully detailed calendars unchanged", async () => {
    mockFetchOnce({
      items: [
        detailed("b", "Inauguration Night", "2026-10-03T18:00:00+05:30"),
        detailed("c", "Quiz Finals", "2026-10-04T18:00:00+05:30"),
      ],
    });
    const events = await fetchUpcomingEvents();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.title)).toEqual(["Inauguration Night", "Quiz Finals"]);
  });

  it("returns [] (not a throw) on network failure", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(fetchUpcomingEvents()).resolves.toEqual([]);
  });

  it("filters private placeholders as before", async () => {
    mockFetchOnce({
      items: [
        {
          id: "x",
          summary: "Busy",
          start: { dateTime: "2026-10-05T10:00:00+05:30" },
          end: { dateTime: "2026-10-05T11:00:00+05:30" },
        },
      ],
    });
    // "Busy" has a summary so it is not a ghost; the placeholder filter drops it
    await expect(fetchUpcomingEvents()).resolves.toEqual([]);
  });
});
