/**
 * utils/calendar.js — fetch events from the public Google Calendar.
 *
 * No backend: the API key is restricted by HTTP referrer, and the calendar's
 * visibility must be "public". What the key can *see* depends on how the
 * calendar is shared:
 *
 *   "See all event details"   → titles, places, descriptions   (mode "detailed")
 *   "See only free/busy"      → start and end times, nothing else (mode "busy")
 *
 * The API reports the second case as `accessRole: "freeBusyReader"` and simply
 * omits summary/description/location. This module never pretends otherwise: it
 * returns the honest mode and lets the calendar render for it.
 */
import { CALENDAR } from "../config.js";
import { normalizeEvent, dedupeEvents, mergeBusy } from "./calendar-model.js";

const FIELDS =
  "items(id,iCalUID,summary,description,location,start,end,htmlLink,status," +
  "attendees(displayName,email),organizer(displayName,email))";

/** Where a visitor can subscribe — only offered once the details are public. */
export function calendarLinks() {
  const id = encodeURIComponent(CALENDAR.CALENDAR_ID || "");
  return {
    add: `https://calendar.google.com/calendar/render?cid=${id}`,
    view: `https://calendar.google.com/calendar/embed?src=${id}&ctz=Asia%2FKolkata`,
  };
}

let warned = false;
function explainOnce(status, reason) {
  if (warned) return;
  warned = true;
  if (status === 403) {
    console.warn(
      "[calendar] 403 — check the Google Cloud referrer restriction and that the calendar is public.",
      reason
    );
  }
}

/**
 * Events overlapping [min, max) — RFC3339 strings.
 * Never throws: failures come back as { mode: "error", error } so the calendar
 * can still draw an (empty, navigable) month and offer a retry.
 *
 * @returns {Promise<{events: object[], mode: "detailed"|"busy"|"empty"|"unconfigured"|"error", error?: {status?: number, message: string}}>}
 */
export async function fetchEventsBetween(min, max) {
  const { API_KEY, CALENDAR_ID } = CALENDAR;
  if (!API_KEY || !CALENDAR_ID) return { events: [], mode: "unconfigured" };

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
    `?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=250` +
    `&timeMin=${encodeURIComponent(min)}&timeMax=${encodeURIComponent(max)}` +
    `&fields=${encodeURIComponent(FIELDS)}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    return { events: [], mode: "error", error: { message: String(err?.message || err) } };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const reason = detail.match(/"message"\s*:\s*"([^"]+)/)?.[1] || detail.slice(0, 180);
    explainOnce(res.status, reason);
    return {
      events: [],
      mode: "error",
      error: { status: res.status, message: reason || `HTTP ${res.status}` },
    };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return {
      events: [],
      mode: "error",
      error: { message: "The calendar sent an unreadable reply." },
    };
  }

  const all = dedupeEvents((data?.items || []).map(normalizeEvent).filter(Boolean));
  if (!all.length) return { events: [], mode: "empty" };

  const titled = all.filter((e) => e.hasTitle);
  if (titled.length) {
    // Titled events are the real programme. Any untitled ghosts alongside them
    // are private entries from the same calendar — dropped, not shown as a wall
    // of "Booked" rows that say nothing.
    return { events: titled, mode: "detailed" };
  }
  // Nothing has a title: free/busy sharing. Overlapping blocks are merged so a
  // day with three back-to-back meetings reads as one busy window.
  return { events: mergeBusy(all), mode: "busy" };
}
