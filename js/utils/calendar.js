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
 * True when the API returned a free/busy ghost: start/end times but no
 * human details at all. Happens when the calendar is shared as
 * "See only free/busy" instead of "See all event details" — the API then
 * withholds summary, description and location for every event.
 */
function isTimeOnlyGhost(item) {
  return (
    !stripMarkup(item.summary) &&
    !stripMarkup(item.title) &&
    !stripMarkup(item.name) &&
    !stripMarkup(item.description) &&
    !stripMarkup(item.location)
  );
}

/**
 * Fetch upcoming events from a public Google Calendar.
 * The endpoint returns attendees, start/end, location, summary, description
 * but only if the calendar is public and the API key referrer allows the
 * current domain. We request explicit fields to avoid partial responses.
 * @returns {Promise<Array<{title,date,dateTime,dateLabel,dateEndLabel,location,description,people,attendees,htmlLink,timeOnly}>>}
 * @throws {Error} with code "FREEBUSY_ONLY" when the calendar shares times
 *   but no details — callers should render sharing guidance in that case.
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

    const items = data?.items || [];
    // Free/busy-only sharing: every item is a ghost (times but no details).
    // Render nothing and let the caller show the sharing guidance instead of
    // a wall of "Untitled event" cards that carry zero information.
    if (items.length > 0 && items.every(isTimeOnlyGhost)) {
      const err = new Error(
        "Calendar is shared as free/busy only — no titles, descriptions or locations are visible. " +
          "Ask the calendar owner to set sharing to 'See all event details' (make public)."
      );
      err.code = "FREEBUSY_ONLY";
      throw err;
    }

    return items
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
          timeOnly: isTimeOnlyGhost(item),
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
      .filter((event) => !event.timeOnly && !isPrivatePlaceholder(event.title));
  } catch (err) {
    // Free/busy-only sharing is actionable (fix the calendar settings), so
    // let it propagate — the caller renders guidance instead of an empty grid.
    if (err && err.code === "FREEBUSY_ONLY") throw err;
    console.warn("[calendar] Failed to fetch events:", err);
    return [];
  }
}
