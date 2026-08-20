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
 * The endpoint returns attendees, start/end, location, summary, description
 * but only if the calendar is public and the API key referrer allows the
 * current domain. We request explicit fields to avoid partial responses.
 * @returns {Promise<Array<{title,date,dateTime,dateLabel,dateEndLabel,location,description,people,attendees,htmlLink}>>}
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
      `&maxResults=${MAX_RESULTS}` +
      `&fields=items(id,summary,description,location,start,end,htmlLink,status,attendees(displayName,email),creator(displayName,email),organizer(displayName,email))`;

    const res = await fetch(url);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const reason = detail.match(/"message"\s*:\s*"([^"]+)/)?.[1] || detail.slice(0, 180);
      // Common failure: referrer not whitelisted or calendar not public — surface a helpful warning
      if (res.status === 403) {
        console.warn(
          "[calendar] 403 — check Google Cloud referrer restriction and calendar visibility (must be public).",
          reason
        );
      }
      throw new Error(`Calendar API: ${res.status}${reason ? ` — ${reason}` : ""}`);
    }
    const data = await res.json();

    return (data?.items || [])
      .map((item) => {
        const startRaw = item.start?.dateTime || item.start?.date || "";
        const endRaw = item.end?.dateTime || item.end?.date || "";
        const isAllDay = !item.start?.dateTime;
        const startDate = startRaw ? new Date(startRaw) : null;
        const endDate = endRaw ? new Date(endRaw) : null;
        const validStart = startDate && !Number.isNaN(startDate.getTime());
        const validEnd = endDate && !Number.isNaN(endDate.getTime());
        const fmtDate = (d) =>
          d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const fmtTime = (d) =>
          d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const dateLabel = isAllDay
          ? validStart
            ? fmtDate(startDate)
            : "Date to be announced"
          : validStart
            ? fmtDate(startDate) + " · " + fmtTime(startDate)
            : "Time to be announced";
        const dateEndLabel = isAllDay
          ? validEnd
            ? fmtDate(endDate)
            : ""
          : validEnd
            ? fmtTime(endDate)
            : "";
        const attendees = (item.attendees || [])
          .map((a) => stripMarkup(a.displayName || a.email || ""))
          .filter(Boolean);
        // Fallback: try to extract people from description lines like "Speakers: X, Y" when no attendees array
        const descText = stripMarkup(item.description);
        const descPeople = (() => {
          const m = descText.match(
            /(?:speakers?|guests?|attendees?|participants?|organised by|organized by|by)\s*[:–—]\s*([^.\n]+)/i
          );
          return m
            ? m[1]
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        })();
        const people = attendees.length ? attendees : descPeople;
        const title = eventTitle(item);
        return {
          title,
          date: startRaw,
          dateTime: startRaw,
          dateLabel,
          dateEndLabel,
          dateEnd: endRaw,
          location: stripMarkup(item.location || ""),
          description: descText,
          attendees,
          people,
          organizer: stripMarkup(item.organizer?.displayName || item.organizer?.email || ""),
          creator: stripMarkup(item.creator?.displayName || item.creator?.email || ""),
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
