/**
 * utils/calendar.js — Fetch upcoming public Google Calendar events.
 * No backend needed — API key is restricted by HTTP referrer.
 * The calendar must have its visibility set to "public".
 */
import { CALENDAR } from "../config.js";

function stripMarkup(value) {
  if (!value) return "";
  const text = String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function firstUsefulLine(value) {
  return (
    stripMarkup(value)
      .split(/\s*[|—–:-]\s*|\n/)
      .map((part) => part.trim())
      .find(Boolean) || ""
  );
}

function eventTitle(item) {
  // Google Calendar calls this field `summary`, but shared/imported calendars
  // occasionally expose a useful title under one of these aliases instead.
  return (
    stripMarkup(item.summary) ||
    stripMarkup(item.title) ||
    stripMarkup(item.name) ||
    firstUsefulLine(item.description) ||
    "Untitled event"
  );
}

function isPrivatePlaceholder(title) {
  return /^(busy|working elsewhere|out of office|free|tentative)$/i.test(title.trim());
}

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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const reason = detail.match(/"message"\s*:\s*"([^"]+)/)?.[1];
      throw new Error(`Calendar API: ${res.status}${reason ? ` — ${reason}` : ""}`);
    }
    const data = await res.json();

    return (data?.items || [])
      .map((item) => {
        const start = item.start?.dateTime || item.start?.date || "";
        const isAllDay = !item.start?.dateTime;
        const d = start ? new Date(start) : null;
        const validDate = d && !Number.isNaN(d.getTime());
        const dateLabel = isAllDay
          ? validDate
            ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "Date to be announced"
          : validDate
            ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
              " · " +
              d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "Time to be announced";
        const title = eventTitle(item);
        return {
          title,
          dateTime: start,
          dateLabel,
          location: item.location || "",
          description: stripMarkup(item.description),
          link: item.htmlLink || "",
          status: item.status || "confirmed",
          calendarId: item.id || "",
        };
      })
      .filter((event) => !isPrivatePlaceholder(event.title));
  } catch (err) {
    console.warn("[calendar] Failed to fetch events:", err);
    return [];
  }
}
