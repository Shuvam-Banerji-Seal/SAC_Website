/**
 * utils/calendar-model.js — everything about calendar events that is not DOM.
 *
 * Kept pure (no fetch, no document) so it can be tested exhaustively and so the
 * component stays a thin renderer. Three jobs:
 *
 *   1. normalise a raw Google Calendar API item into one event shape;
 *   2. clean the list — collapse true duplicates, merge overlapping "busy"
 *      blocks, spot weekly series — so the calendar is not cluttered;
 *   3. lay out a month grid.
 *
 * Every date is reasoned about in IST. The Council is one campus in one
 * timezone, and bucketing by the *viewer's* zone would put a 7pm meeting on a
 * different day for a visitor in another country — and would make the tests
 * depend on the machine they run on.
 */

export const TZ = "Asia/Kolkata";
const TZ_OFFSET = "+05:30"; // IST has no DST, so a fixed offset is exact
const DAY_MS = 86_400_000;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" });

/** "YYYY-MM-DD" of an instant, in IST. A date-only string passes through. */
export function dayKey(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return dayFormat.format(input instanceof Date ? input : new Date(input));
}

/** Calendar arithmetic on day keys, done in UTC so no zone can shift a day. */
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "7:00 pm" in IST. */
export function formatTime(date) {
  return timeFormat.format(date).replace(/\s?([ap])m$/i, (_, p) => ` ${p.toLowerCase()}m`);
}

export function weekdayName(date) {
  return weekdayFormat.format(date);
}

const stripMarkup = (value) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const normText = (value) =>
  stripMarkup(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Titles Google substitutes when the owner hides the real one. */
const PLACEHOLDER_TITLE = /^(busy|working elsewhere|out of office|free|tentative)$/i;

/**
 * Raw API item → the one event shape the calendar uses.
 * `hasTitle` is false for free/busy ghosts: the API returns times but withholds
 * summary, description and location when the calendar is shared as "free/busy".
 * Returns null for something that is not placeable (no usable start).
 */
export function normalizeEvent(item) {
  if (!item || !item.start) return null;
  const allDay = !item.start.dateTime;
  const startRaw = item.start.dateTime || item.start.date;
  const endRaw = item.end?.dateTime || item.end?.date || startRaw;
  const start = new Date(allDay ? `${startRaw}T00:00:00${TZ_OFFSET}` : startRaw);
  let end = new Date(allDay ? `${endRaw}T00:00:00${TZ_OFFSET}` : endRaw);
  if (Number.isNaN(start.getTime())) return null;
  if (Number.isNaN(end.getTime()) || end < start) end = new Date(start);

  const summary = stripMarkup(item.summary || item.title || item.name);
  const hasTitle = Boolean(summary) && !PLACEHOLDER_TITLE.test(summary);
  const attendees = (item.attendees || [])
    .map((a) => stripMarkup(a.displayName || a.email))
    .filter(Boolean);

  // An all-day event's end date is exclusive; a timed one ends *at* its end, so
  // an event finishing exactly at midnight does not leak into the next day.
  const lastMs = allDay ? end.getTime() - 1 : Math.max(start.getTime(), end.getTime() - 1);
  return {
    id: item.id || "",
    uid: item.iCalUID || "",
    title: hasTitle ? summary : "Booked",
    hasTitle,
    start,
    end,
    allDay,
    startKey: dayKey(start),
    lastKey: dayKey(new Date(Math.max(start.getTime(), lastMs))),
    location: stripMarkup(item.location),
    description: stripMarkup(item.description),
    people: attendees,
    organizer: stripMarkup(item.organizer?.displayName || item.organizer?.email || ""),
    link: item.htmlLink || "",
    status: item.status || "confirmed",
  };
}

/** Every day key an event touches (capped, so a malformed year-long block can't hang the UI). */
export function daysOf(event, cap = 62) {
  const keys = [];
  for (let k = event.startKey; k <= event.lastKey && keys.length < cap; k = addDays(k, 1)) {
    keys.push(k);
  }
  return keys;
}

const richness = (e) =>
  (e.description ? 2 : 0) + (e.location ? 2 : 0) + (e.people.length ? 1 : 0) + (e.link ? 1 : 0);

/**
 * Collapse true duplicates.
 *
 * The same meeting reaches a calendar more than once whenever it is invited
 * from two sources, imported, or copied: identical title, start and end, but a
 * different event id. Those are one event to a reader. Cancelled events are
 * dropped. Of a duplicate pair the entry with more detail wins.
 */
export function dedupeEvents(events) {
  const kept = new Map();
  for (const e of events) {
    if (!e || e.status === "cancelled") continue;
    const key = [
      e.hasTitle ? normText(e.title) : "",
      e.start.getTime(),
      e.end.getTime(),
      e.allDay ? 1 : 0,
    ].join("|");
    const prior = kept.get(key);
    if (!prior || richness(e) > richness(prior)) kept.set(key, e);
  }
  return [...kept.values()].sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Merge overlapping or touching free/busy blocks into one.
 *
 * With titles hidden, three meetings that overlap read as three identical
 * "Booked" rows saying nothing the first one didn't. Union them. Detailed
 * events pass through untouched — a titled event is never merged away.
 */
export function mergeBusy(events) {
  const detailed = events.filter((e) => e.hasTitle);
  const ghosts = events.filter((e) => !e.hasTitle).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const g of ghosts) {
    const last = merged[merged.length - 1];
    if (last && g.start <= last.end && !g.allDay && !last.allDay) {
      if (g.end > last.end) {
        last.end = g.end;
        last.lastKey = g.lastKey;
      }
      last.merged += 1;
    } else {
      merged.push({ ...g, merged: 1 });
    }
  }
  return [...detailed, ...merged].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The full clean-up the calendar shows: dedupe, then merge busy blocks. */
export function prepareEvents(events) {
  return mergeBusy(dedupeEvents(events));
}

/** Group events by every day they touch. */
export function eventsByDay(events) {
  const map = new Map();
  for (const e of events) {
    for (const key of daysOf(e)) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
  }
  return map;
}

/**
 * Spot weekly series for the agenda.
 *
 * A standing Wednesday-7pm slot would otherwise fill the "coming up" list with
 * the same row every week. Three or more occurrences at the same weekday, start
 * time and length, a week (or a fortnight) apart, collapse to one entry that
 * says so. The grid still marks every real day.
 */
export function collapseSeries(events, minCount = 3) {
  const slot = (e) =>
    [
      e.hasTitle ? normText(e.title) : "booked",
      weekdayName(e.start),
      formatTime(e.start),
      Math.round((e.end - e.start) / 60_000),
    ].join("|");
  const groups = new Map();
  for (const e of events) {
    if (e.allDay) continue;
    const k = slot(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const seriesIds = new Map(); // event -> series info (only the first of each is shown)
  for (const members of groups.values()) {
    if (members.length < minCount) continue;
    const gaps = members.slice(1).map((m, i) => Math.round((m.start - members[i].start) / DAY_MS));
    if (!gaps.every((g) => g === 7 || g === 14)) continue;
    const every = gaps.every((g) => g === 14) ? "fortnight" : "week";
    const info = { count: members.length, every, weekday: weekdayName(members[0].start) };
    members.forEach((m, i) => seriesIds.set(m, i === 0 ? info : null));
  }
  return events
    .filter((e) => !seriesIds.has(e) || seriesIds.get(e))
    .map((e) => (seriesIds.get(e) ? { ...e, series: seriesIds.get(e) } : e));
}

/** 42 cells (six weeks) for a month, weeks starting on `weekStart` (0 = Sunday). */
export function buildMonthGrid(year, monthIndex, weekStart = 0) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const lead = (first.getUTCDay() - weekStart + 7) % 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - lead));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getTime() + i * DAY_MS);
    cells.push({
      key: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex,
      weekday: d.getUTCDay(),
    });
  }
  return cells;
}

/** API time window that covers a month grid, as RFC3339 strings in IST. */
export function gridRange(cells) {
  return {
    min: `${cells[0].key}T00:00:00${TZ_OFFSET}`,
    max: `${addDays(cells[cells.length - 1].key, 1)}T00:00:00${TZ_OFFSET}`,
  };
}
