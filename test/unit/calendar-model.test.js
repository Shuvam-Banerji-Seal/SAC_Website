/**
 * test/unit/calendar-model.test.js — the calendar's clean-up rules.
 *
 * The live calendar is shared as free/busy only (accessRole "freeBusyReader"),
 * so the fixtures mirror what the API really returns: items with times and no
 * summary, some overlapping, one exact duplicate, a standing weekly slot.
 */
import { describe, it, expect } from "vitest";
import {
  dayKey,
  addDays,
  normalizeEvent,
  daysOf,
  dedupeEvents,
  mergeBusy,
  prepareEvents,
  eventsByDay,
  collapseSeries,
  buildMonthGrid,
  gridRange,
  formatTime,
} from "../../js/utils/calendar-model.js";

const ghost = (id, start, end, extra = {}) => ({
  id,
  status: "confirmed",
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});
const titled = (id, summary, start, end, extra = {}) =>
  ghost(id, start, end, { summary, ...extra });
const ev = (raw) => normalizeEvent(raw);

describe("IST day bucketing", () => {
  it("buckets by Indian date, not the machine's zone", () => {
    // 22:00 UTC on the 6th is 03:30 IST on the 7th
    expect(dayKey("2026-10-06T22:00:00Z")).toBe("2026-10-07");
    expect(dayKey("2026-10-07T19:00:00+05:30")).toBe("2026-10-07");
    expect(dayKey("2026-10-07")).toBe("2026-10-07");
  });

  it("does calendar arithmetic across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats times in IST", () => {
    expect(formatTime(new Date("2026-10-07T19:00:00+05:30"))).toBe("7:00 pm");
    expect(formatTime(new Date("2026-10-07T07:05:00+05:30"))).toBe("7:05 am");
  });
});

describe("normalizeEvent", () => {
  it("marks a title-less item as a free/busy ghost", () => {
    const e = ev(ghost("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30"));
    expect(e.hasTitle).toBe(false);
    expect(e.title).toBe("Booked");
  });

  it("treats Google's own placeholder titles as hidden", () => {
    const e = ev(titled("a", "Busy", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30"));
    expect(e.hasTitle).toBe(false);
  });

  it("keeps a real title and strips markup from details", () => {
    const e = ev(
      titled("a", "Quiz Finals", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30", {
        description: "<b>Bring</b> a pen&nbsp;&amp; paper",
        location: "Main Hall",
      })
    );
    expect(e.hasTitle).toBe(true);
    expect(e.title).toBe("Quiz Finals");
    expect(e.description).toBe("Bring a pen & paper");
    expect(e.location).toBe("Main Hall");
  });

  it("an all-day event's end date is exclusive", () => {
    const e = ev({
      id: "x",
      summary: "Fest",
      start: { date: "2026-10-10" },
      end: { date: "2026-10-12" },
    });
    expect(e.allDay).toBe(true);
    expect(daysOf(e)).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("a timed event ending exactly at midnight stays on its own day", () => {
    const e = ev(titled("m", "Late", "2026-10-07T22:00:00+05:30", "2026-10-08T00:00:00+05:30"));
    expect(daysOf(e)).toEqual(["2026-10-07"]);
  });

  it("a timed event crossing midnight touches both days", () => {
    const e = ev(
      titled("m", "Overnight", "2026-10-07T22:00:00+05:30", "2026-10-08T02:00:00+05:30")
    );
    expect(daysOf(e)).toEqual(["2026-10-07", "2026-10-08"]);
  });

  it("rejects items it cannot place", () => {
    expect(normalizeEvent(null)).toBeNull();
    expect(normalizeEvent({ id: "z" })).toBeNull();
    expect(normalizeEvent({ id: "z", start: { dateTime: "not a date" } })).toBeNull();
  });

  it("caps a malformed multi-year block", () => {
    const e = ev({
      id: "y",
      summary: "Forever",
      start: { date: "2026-01-01" },
      end: { date: "2031-01-01" },
    });
    expect(daysOf(e).length).toBeLessThanOrEqual(62);
  });
});

describe("dedupeEvents", () => {
  it("collapses the identical block the live calendar really has (2026-08-10 10:00–11:00 ×2)", () => {
    const list = [
      ev(ghost("a", "2026-08-10T10:00:00+05:30", "2026-08-10T11:00:00+05:30")),
      ev(ghost("b", "2026-08-10T10:00:00+05:30", "2026-08-10T11:00:00+05:30")),
    ];
    expect(dedupeEvents(list)).toHaveLength(1);
  });

  it("collapses a titled duplicate and keeps the one with the most detail", () => {
    const list = [
      ev(titled("a", "Open Mic", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
      ev(
        titled("b", "open  mic!", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30", {
          location: "Amphitheatre",
          description: "All welcome",
        })
      ),
    ];
    const out = dedupeEvents(list);
    expect(out).toHaveLength(1);
    expect(out[0].location).toBe("Amphitheatre");
  });

  it("does not merge different events that merely share a title", () => {
    const list = [
      ev(titled("a", "Quiz", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
      ev(titled("b", "Quiz", "2026-10-08T19:00:00+05:30", "2026-10-08T20:00:00+05:30")),
    ];
    expect(dedupeEvents(list)).toHaveLength(2);
  });

  it("does not merge different events at the same time", () => {
    const list = [
      ev(titled("a", "Quiz", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
      ev(titled("b", "Movie night", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
    ];
    expect(dedupeEvents(list)).toHaveLength(2);
  });

  it("drops cancelled events", () => {
    const list = [
      ev(
        titled("a", "Quiz", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30", {
          status: "cancelled",
        })
      ),
    ];
    expect(dedupeEvents(list)).toHaveLength(0);
  });

  it("returns events in time order", () => {
    const list = [
      ev(titled("b", "B", "2026-10-09T10:00:00+05:30", "2026-10-09T11:00:00+05:30")),
      ev(titled("a", "A", "2026-10-07T10:00:00+05:30", "2026-10-07T11:00:00+05:30")),
    ];
    expect(dedupeEvents(list).map((e) => e.title)).toEqual(["A", "B"]);
  });
});

describe("mergeBusy", () => {
  it("unions the overlapping blocks of 2026-05-13 into two windows", () => {
    // 18:00–18:30, 19:00–20:00, 19:30–20:30 — straight from the live calendar
    const list = [
      ev(ghost("a", "2026-05-13T18:00:00+05:30", "2026-05-13T18:30:00+05:30")),
      ev(ghost("b", "2026-05-13T19:00:00+05:30", "2026-05-13T20:00:00+05:30")),
      ev(ghost("c", "2026-05-13T19:30:00+05:30", "2026-05-13T20:30:00+05:30")),
    ];
    const out = mergeBusy(list);
    expect(out).toHaveLength(2);
    expect(formatTime(out[1].start)).toBe("7:00 pm");
    expect(formatTime(out[1].end)).toBe("8:30 pm");
    expect(out[1].merged).toBe(2);
  });

  it("merges blocks that touch end-to-start", () => {
    const list = [
      ev(ghost("a", "2026-05-13T10:00:00+05:30", "2026-05-13T11:00:00+05:30")),
      ev(ghost("b", "2026-05-13T11:00:00+05:30", "2026-05-13T12:00:00+05:30")),
    ];
    expect(mergeBusy(list)).toHaveLength(1);
  });

  it("keeps separated blocks separate", () => {
    const list = [
      ev(ghost("a", "2026-04-03T10:30:00+05:30", "2026-04-03T11:30:00+05:30")),
      ev(ghost("b", "2026-04-03T12:30:00+05:30", "2026-04-03T13:00:00+05:30")),
    ];
    expect(mergeBusy(list)).toHaveLength(2);
  });

  it("never merges a titled event away", () => {
    const list = [
      ev(ghost("a", "2026-05-13T19:00:00+05:30", "2026-05-13T20:00:00+05:30")),
      ev(titled("b", "Quiz", "2026-05-13T19:30:00+05:30", "2026-05-13T20:30:00+05:30")),
    ];
    const out = mergeBusy(list);
    expect(out).toHaveLength(2);
    expect(out.some((e) => e.title === "Quiz")).toBe(true);
  });

  it("prepareEvents = dedupe then merge", () => {
    const list = [
      ev(ghost("a", "2026-08-10T10:00:00+05:30", "2026-08-10T11:00:00+05:30")),
      ev(ghost("b", "2026-08-10T10:00:00+05:30", "2026-08-10T11:00:00+05:30")),
      ev(ghost("c", "2026-08-10T10:30:00+05:30", "2026-08-10T11:30:00+05:30")),
    ];
    const out = prepareEvents(list);
    expect(out).toHaveLength(1);
    expect(formatTime(out[0].end)).toBe("11:30 am");
  });
});

describe("eventsByDay", () => {
  it("lists a multi-day event on every day it spans", () => {
    const e = ev({
      id: "x",
      summary: "Fest",
      start: { date: "2026-10-10" },
      end: { date: "2026-10-13" },
    });
    const map = eventsByDay([e]);
    expect([...map.keys()]).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
  });
});

describe("collapseSeries", () => {
  const weekly = (n, extra) =>
    Array.from({ length: n }, (_, i) =>
      ev(
        ghost(
          `w${i}`,
          `2026-10-${String(7 + 7 * i).padStart(2, "0")}T19:00:00+05:30`,
          `2026-10-${String(7 + 7 * i).padStart(2, "0")}T20:00:00+05:30`,
          extra
        )
      )
    );

  it("collapses a standing Wednesday 7pm slot (7, 14, 21 Oct) to one entry", () => {
    const out = collapseSeries(weekly(3));
    expect(out).toHaveLength(1);
    expect(out[0].series).toMatchObject({ count: 3, every: "week", weekday: "Wednesday" });
    expect(out[0].startKey).toBe("2026-10-07"); // the next one
  });

  it("leaves two occurrences alone — not yet a pattern", () => {
    expect(collapseSeries(weekly(2))).toHaveLength(2);
  });

  it("leaves irregular repeats alone", () => {
    const list = [
      ev(ghost("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
      ev(ghost("b", "2026-10-09T19:00:00+05:30", "2026-10-09T20:00:00+05:30")),
      ev(ghost("c", "2026-10-21T19:00:00+05:30", "2026-10-21T20:00:00+05:30")),
    ];
    expect(collapseSeries(list)).toHaveLength(3);
  });

  it("a different start time is a different slot", () => {
    const list = [
      ...weekly(2),
      ev(ghost("z", "2026-10-28T20:00:00+05:30", "2026-10-28T21:00:00+05:30")),
    ];
    expect(collapseSeries(list)).toHaveLength(3);
  });

  it("detects a fortnightly rhythm", () => {
    const list = [
      ev(ghost("a", "2026-10-07T19:00:00+05:30", "2026-10-07T20:00:00+05:30")),
      ev(ghost("b", "2026-10-21T19:00:00+05:30", "2026-10-21T20:00:00+05:30")),
      ev(ghost("c", "2026-11-04T19:00:00+05:30", "2026-11-04T20:00:00+05:30")),
    ];
    expect(collapseSeries(list)[0].series.every).toBe("fortnight");
  });
});

describe("buildMonthGrid", () => {
  it("always returns six weeks", () => {
    expect(buildMonthGrid(2026, 9)).toHaveLength(42);
    expect(buildMonthGrid(2026, 1)).toHaveLength(42); // Feb 2026 fits in four
  });

  it("October 2026 starts on a Thursday, so a Sunday-first grid opens on 27 Sep", () => {
    const grid = buildMonthGrid(2026, 9, 0);
    expect(grid[0]).toMatchObject({ key: "2026-09-27", inMonth: false, weekday: 0 });
    expect(grid[4]).toMatchObject({ key: "2026-10-01", inMonth: true, day: 1 });
  });

  it("honours a Monday week start", () => {
    expect(buildMonthGrid(2026, 9, 1)[0].key).toBe("2026-09-28");
  });

  it("flags only the target month's days as inMonth", () => {
    const inMonth = buildMonthGrid(2026, 9).filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
  });

  it("builds an API window that covers the whole grid", () => {
    const grid = buildMonthGrid(2026, 9);
    const { min, max } = gridRange(grid);
    expect(min).toBe("2026-09-27T00:00:00+05:30");
    expect(max).toBe("2026-11-08T00:00:00+05:30");
  });
});
