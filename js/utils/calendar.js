/**
 * utils/calendar.js — Fetch upcoming public Google Calendar events.
 * No backend needed — API key is restricted by HTTP referrer.
 * The calendar must have its visibility set to "public".
 */
import { CALENDAR } from "../config.js";

/**
 * Fetch upcoming events from a public Google Calendar.
 * @returns {Promise<Array<{title, date, dateTime, dateLabel, location, description}>>}
 */
export async function fetchUpcomingEvents() {
  const { API_KEY, CALENDAR_ID, MAX_RESULTS } = CALENDAR;
  if (!API_KEY || !CALENDAR_ID) return [];

  try {
    const now = new Date().toISOString();
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?key=${API_KEY}` +
      `&orderBy=startTime` +
      `&singleEvents=true` +
      `&timeMin=${now}` +
      `&maxResults=${MAX_RESULTS}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Calendar API: ${res.status}`);
    const data = await res.json();

    return (data?.items || []).map((item) => {
      const start = item.start?.dateTime || item.start?.date || "";
      const isAllDay = !item.start?.dateTime;
      const d = new Date(start);
      const dateLabel = isAllDay
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
          " · " +
          d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      return {
        title: item.summary || "Untitled event",
        dateTime: start,
        dateLabel,
        location: item.location || "",
        description: item.description || "",
        link: item.htmlLink || "",
      };
    });
  } catch (err) {
    console.warn("[calendar] Failed to fetch events:", err);
    return [];
  }
}
