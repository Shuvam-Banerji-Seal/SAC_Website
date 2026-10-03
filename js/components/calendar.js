/**
 * components/calendar.js — "The SAC Calendar": a desk-calendar month view.
 *
 * A month grid you can step through, an agenda for the day you pick, and a
 * short "coming up" list. Data comes from the public Google Calendar through
 * utils/calendar.js; every clean-up rule (duplicates, overlapping busy blocks,
 * weekly series) lives in utils/calendar-model.js so this file only draws.
 *
 * It works in two modes and says which it is in:
 *   detailed — titles, places, descriptions.
 *   busy     — the calendar is shared as free/busy, so only booked time slots
 *              exist. Drawn as hatched bars, never as invented "events".
 *
 * Accessibility: a real <table role="grid"> with a roving tabindex. Arrow keys
 * move by day/week, PageUp/PageDown by month, Home/End to the week's ends.
 * Motion: the page-turn is skipped under reduced motion (OS or the site's own
 * toggle) and wherever the Web Animations API is missing.
 */
import { el, loadStylesheet } from "../utils/dom.js";
import { fetchEventsBetween, calendarLinks } from "../utils/calendar.js";
import {
  buildMonthGrid,
  gridRange,
  dayKey,
  addDays,
  eventsByDay,
  collapseSeries,
  formatTime,
} from "../utils/calendar-model.js";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const WEEKDAY_LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const utc = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const longDate = (key) =>
  `${WEEKDAY_LONG.format(utc(key))} ${utc(key).getUTCDate()} ${MONTH.format(utc(key))} ${utc(key).getUTCFullYear()}`;

function isReducedMotion() {
  return (
    document.documentElement.getAttribute("data-reduce-motion") === "on" ||
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

/** "7p", "10:30a" — what fits in a month cell; the full range lives in the tooltip. */
function compactTime(event) {
  if (event.allDay) return "all day";
  return formatTime(event.start).replace(":00", "").replace(" am", "a").replace(" pm", "p");
}

/** "7:00 – 8:00 pm" — the am/pm is said once when both ends share it. */
function formatRange(event) {
  if (event.allDay) return "All day";
  const a = formatTime(event.start);
  const b = formatTime(event.end);
  if (event.start.getTime() === event.end.getTime()) return a;
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${sameHalf ? a.slice(0, -3) : a} – ${b}`;
}

function spanLabel(event) {
  const a = utc(event.startKey);
  const b = utc(event.lastKey);
  const part = (d) => `${d.getUTCDate()} ${MONTH_SHORT.format(d)}`;
  return `${part(a)} – ${part(b)}`;
}

let explained = false;
/** Maintainer-facing hint, logged once per page when the calendar only shares busy times.
 *  Visitors see a plain note; the how-to-fix instructions belong in the console. */
function explainBusyMode() {
  if (explained) return;
  explained = true;
  console.warn(
    "[calendar] The Google Calendar is shared as free/busy only (accessRole: freeBusyReader), " +
      "so titles and places cannot be shown. In Google Calendar → Settings → Access permissions, " +
      "make it public and choose 'See all event details'."
  );
}

const ensureStyles = () => loadStylesheet("css/pages/calendar.css");

/**
 * @param {HTMLElement} mount
 * @param {object} [options]
 * @param {(min: string, max: string) => Promise<{events: object[], mode: string, error?: object}>} [options.fetchRange]
 * @param {Date} [options.now]
 * @param {number} [options.weekStart] 0 = Sunday (Google's default in India), 1 = Monday
 * @param {() => Promise<void>} [options.loadStyles] stylesheet loader (injectable so tests need not wait on one)
 */
export function initCalendar(mount, options = {}) {
  if (!mount || mount.dataset.bound === "true") return null;
  mount.dataset.bound = "true";

  const fetchRange = options.fetchRange || fetchEventsBetween;
  const now = options.now || new Date();
  const weekStart = options.weekStart ?? 0;
  const loadStyles = options.loadStyles || ensureStyles;
  const today = dayKey(now);
  const todayDate = utc(today);

  let year = todayDate.getUTCFullYear();
  let month = todayDate.getUTCMonth();
  let selected = today;
  const months = new Map(); // "YYYY-MM" -> { events, byDay, mode, error }
  let upcoming = null; // { events, mode } for the forward window
  let sawMode = "empty";
  let destroyed = false;
  let busy = false;

  /* ------------------------------------------------------------------ DOM */
  const uid = `cal-${Math.random().toString(36).slice(2, 7)}`;
  const monthEl = el("span", { class: "cal__month" });
  const yearEl = el("span", { class: "cal__year" });
  const title = el(
    "h3",
    { class: "cal__title", id: `${uid}-title`, "aria-live": "polite" },
    monthEl,
    " ",
    yearEl
  );
  const prev = el(
    "button",
    { class: "cal__nav cal__nav--prev", type: "button", "aria-label": "Previous month" },
    "‹"
  );
  const next = el(
    "button",
    { class: "cal__nav cal__nav--next", type: "button", "aria-label": "Next month" },
    "›"
  );
  const todayBtn = el("button", { class: "cal__today", type: "button" }, "Today");
  const tbody = el("tbody");
  const table = el(
    "table",
    { class: "cal__table", role: "grid", "aria-labelledby": `${uid}-title` },
    el(
      "thead",
      {},
      el(
        "tr",
        {},
        ...Array.from({ length: 7 }, (_, i) => {
          const d = (weekStart + i) % 7;
          return el("th", { scope: "col", abbr: WEEKDAYS_LONG[d] }, WEEKDAYS[d]);
        })
      )
    ),
    tbody
  );
  const banner = el("div", { class: "cal__banner", role: "status", hidden: true });
  const legend = el("p", { class: "cal__legend" });
  const selectedPanel = el("section", { class: "cal__selected", "aria-labelledby": `${uid}-sel` });
  const upcomingPanel = el("section", { class: "cal__upcoming", "aria-labelledby": `${uid}-up` });
  const note = el("p", { class: "cal__note", hidden: true });

  const sheet = el(
    "div",
    { class: "cal__sheet" },
    el(
      "div",
      { class: "cal__binding", "aria-hidden": "true" },
      ...Array.from({ length: 9 }, () => el("i"))
    ),
    el("header", { class: "cal__head" }, prev, title, next, todayBtn),
    banner,
    el("div", { class: "cal__stage" }, table),
    legend
  );
  const agenda = el("aside", { class: "cal__agenda" }, selectedPanel, upcomingPanel);
  const root = el(
    "div",
    { class: "cal", "data-state": "loading", "aria-busy": "true" },
    sheet,
    agenda,
    note
  );
  mount.replaceChildren(root);
  const stage = sheet.querySelector(".cal__stage");

  /* ----------------------------------------------------------------- data */
  const bucket = () => months.get(monthKey(year, month));

  async function loadMonth(y, m) {
    const key = monthKey(y, m);
    if (months.has(key)) return months.get(key);
    const grid = buildMonthGrid(y, m, weekStart);
    const { min, max } = gridRange(grid);
    let result;
    try {
      result = await fetchRange(min, max);
    } catch (err) {
      result = { events: [], mode: "error", error: { message: String(err?.message || err) } };
    }
    const entry = { ...result, byDay: eventsByDay(result.events || []) };
    // A failure is not remembered — the next visit (or Retry) asks again.
    if (result.mode !== "error") months.set(key, entry);
    if (result.mode === "busy" || result.mode === "detailed") sawMode = result.mode;
    return entry;
  }

  async function loadUpcoming() {
    if (upcoming) return upcoming;
    let result;
    try {
      result = await fetchRange(`${today}T00:00:00+05:30`, `${addDays(today, 75)}T00:00:00+05:30`);
    } catch {
      result = { events: [], mode: "error" };
    }
    upcoming = result;
    if (result.mode === "busy" || result.mode === "detailed") sawMode = result.mode;
    return upcoming;
  }

  /* --------------------------------------------------------------- paint */
  function dayEvents(key) {
    return bucket()?.byDay.get(key) || [];
  }

  function describeDay(key, events) {
    const n = events.length;
    const noun =
      sawMode === "busy"
        ? n === 1
          ? "booked slot"
          : "booked slots"
        : n === 1
          ? "event"
          : "events";
    return `${longDate(key)}${key === today ? ", today" : ""}, ${n ? `${n} ${noun}` : "nothing scheduled"}`;
  }

  function paintMarks(events) {
    if (!events.length) return null;
    const dots = el(
      "span",
      { class: "cal__dots", "aria-hidden": "true" },
      ...events.slice(0, 3).map(() => el("i"))
    );
    if (sawMode === "busy") {
      const bars = events
        .slice(0, 3)
        .map((e, i) =>
          el(
            "span",
            { class: "cal__bar", style: `--i:${i}`, title: formatRange(e) },
            compactTime(e)
          )
        );
      return el("span", { class: "cal__marks", "aria-hidden": "true" }, ...bars, dots);
    }
    const chips = events
      .slice(0, 2)
      .map((e, i) =>
        el("span", { class: "cal__chip", style: `--i:${i}`, title: e.title }, e.title)
      );
    const more =
      events.length > 2 ? el("span", { class: "cal__more" }, `+${events.length - 2}`) : null;
    return el("span", { class: "cal__marks", "aria-hidden": "true" }, ...chips, more, dots);
  }

  function paintGrid() {
    const cells = buildMonthGrid(year, month, weekStart);
    const first = utc(`${year}-${String(month + 1).padStart(2, "0")}-01`);
    monthEl.textContent = MONTH.format(first);
    yearEl.textContent = String(year);
    const rows = [];
    for (let w = 0; w < 6; w++) {
      const tds = cells.slice(w * 7, w * 7 + 7).map((cell) => {
        const events = dayEvents(cell.key);
        const isSel = cell.key === selected;
        const classes = [
          "cal__cell",
          cell.inMonth ? "" : "is-outside",
          cell.weekday === 0 || cell.weekday === 6 ? "is-weekend" : "",
          cell.key === today ? "is-today" : "",
          isSel ? "is-selected" : "",
          events.length ? "has-events" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const btn = el(
          "button",
          {
            class: "cal__day",
            type: "button",
            tabindex: isSel ? "0" : "-1",
            "data-day": cell.key,
            "aria-label": describeDay(cell.key, events),
          },
          el("span", { class: "cal__num" }, String(cell.day)),
          paintMarks(events)
        );
        return el(
          "td",
          { class: classes, role: "gridcell", "aria-selected": isSel ? "true" : "false" },
          btn
        );
      });
      rows.push(el("tr", {}, ...tds));
    }
    tbody.replaceChildren(...rows);
  }

  function itemNode(event) {
    const detailed = event.hasTitle;
    const meta = [];
    if (event.startKey !== event.lastKey) meta.push(spanLabel(event));
    return el(
      "li",
      { class: `cal__item${detailed ? "" : " is-booked"}` },
      el("span", { class: "cal__when" }, formatRange(event)),
      el("strong", { class: "cal__what" }, event.title),
      event.merged > 1
        ? el("span", { class: "cal__meta" }, `${event.merged} bookings overlap`)
        : null,
      meta.length ? el("span", { class: "cal__meta" }, meta.join(" · ")) : null,
      event.location ? el("span", { class: "cal__where" }, event.location) : null,
      event.description
        ? el(
            "span",
            { class: "cal__desc" },
            event.description.length > 180
              ? `${event.description.slice(0, 180)}…`
              : event.description
          )
        : null,
      event.link && detailed
        ? el(
            "a",
            { class: "cal__link", href: event.link, target: "_blank", rel: "noopener" },
            "Open event →"
          )
        : null
    );
  }

  function paintSelected() {
    const events = dayEvents(selected);
    const d = utc(selected);
    selectedPanel.replaceChildren(
      el(
        "header",
        { class: "cal__sel-head" },
        el(
          "span",
          { class: "cal__stamp", "aria-hidden": "true" },
          el("b", {}, String(d.getUTCDate())),
          el("i", {}, MONTH_SHORT.format(d).toUpperCase())
        ),
        el(
          "div",
          {},
          el(
            "h4",
            { class: "cal__h", id: `${uid}-sel` },
            longDate(selected).replace(/ \d{4}$/, "")
          ),
          el(
            "p",
            { class: "cal__sub" },
            selected === today ? "Today" : selected < today ? "Past" : "Ahead",
            " · ",
            events.length
              ? `${events.length} ${sawMode === "busy" ? (events.length === 1 ? "booked slot" : "booked slots") : events.length === 1 ? "event" : "events"}`
              : "nothing scheduled"
          )
        )
      ),
      events.length
        ? el("ul", { class: "cal__list" }, ...events.map(itemNode))
        : el(
            "p",
            { class: "cal__empty" },
            sawMode === "busy"
              ? "No booked slots on this day."
              : "Nothing on the calendar for this day."
          )
    );
  }

  function paintUpcoming() {
    const items = collapseSeries(
      (upcoming?.events || []).filter((e) => e.end >= now).sort((a, b) => a.start - b.start)
    ).slice(0, 5);
    upcomingPanel.replaceChildren(
      el("h4", { class: "cal__h cal__h--small", id: `${uid}-up` }, "Coming up"),
      items.length
        ? el(
            "ol",
            { class: "cal__coming" },
            ...items.map((e) => {
              const d = utc(e.startKey);
              const series = e.series
                ? `Every ${e.series.weekday}${e.series.every === "fortnight" ? " fortnight" : ""} · ${formatTime(e.start)}`
                : null;
              return el(
                "li",
                {},
                el(
                  "button",
                  { class: "cal__go", type: "button", "data-day": e.startKey },
                  el(
                    "span",
                    { class: "cal__stamp cal__stamp--small", "aria-hidden": "true" },
                    el("b", {}, String(d.getUTCDate())),
                    el("i", {}, MONTH_SHORT.format(d).toUpperCase())
                  ),
                  el(
                    "span",
                    { class: "cal__go-text" },
                    el("strong", {}, e.title),
                    el("span", {}, series || `${WEEKDAYS[d.getUTCDay()]} · ${formatRange(e)}`)
                  )
                )
              );
            })
          )
        : el(
            "p",
            { class: "cal__empty" },
            upcoming ? "Nothing coming up in the next ten weeks." : "Checking the calendar…"
          )
    );
  }
  function paintChrome() {
    const mode = sawMode;
    root.dataset.mode = mode;
    legend.replaceChildren(
      el("span", { class: "cal__key cal__key--today" }, "Today"),
      mode === "busy"
        ? el("span", { class: "cal__key cal__key--bar" }, "Booked time")
        : el("span", { class: "cal__key cal__key--chip" }, "Event"),
      el("span", { class: "cal__tz" }, "Times in IST")
    );
    if (mode === "busy") {
      explainBusyMode();
      note.hidden = false;
      note.replaceChildren(
        el("strong", {}, "Booked slots only. "),
        "This calendar currently shares when the Council is busy, not what it is doing. Event names, places and details will appear here the moment the calendar is shared publicly."
      );
    } else if (mode === "detailed") {
      const links = calendarLinks();
      note.hidden = false;
      note.replaceChildren(
        "Want these in your own calendar? ",
        el(
          "a",
          { href: links.add, target: "_blank", rel: "noopener" },
          "Add the SAC calendar to Google Calendar →"
        )
      );
    } else {
      note.hidden = true;
    }
  }

  function paintBanner(entry) {
    if (entry?.mode === "error") {
      banner.hidden = false;
      banner.replaceChildren(
        el("span", {}, "The calendar couldn't be reached just now."),
        el(
          "button",
          {
            class: "cal__retry",
            type: "button",
            onclick: () => show(year, month, { force: true }),
          },
          "Try again"
        )
      );
    } else {
      banner.hidden = true;
      banner.replaceChildren();
    }
  }

  function paintAll(entry) {
    paintGrid();
    paintSelected();
    paintUpcoming();
    paintChrome();
    paintBanner(entry);
  }

  /* ----------------------------------------------------------- navigation */
  async function turnPage(direction, swap) {
    const animate = typeof stage.animate === "function" && !isReducedMotion();
    if (!animate) {
      await swap();
      return;
    }
    const tilt = direction > 0 ? -10 : 10;
    const out = stage.animate(
      [
        { transform: "rotateX(0deg) translateY(0)", opacity: 1 },
        { transform: `rotateX(${tilt}deg) translateY(${direction > 0 ? -10 : 10}px)`, opacity: 0 },
      ],
      { duration: 130, easing: "ease-in", fill: "forwards" }
    );
    await Promise.all([out.finished.catch(() => {}), swap()]);
    stage
      .animate(
        [
          {
            transform: `rotateX(${-tilt}deg) translateY(${direction > 0 ? 10 : -10}px)`,
            opacity: 0,
          },
          { transform: "rotateX(0deg) translateY(0)", opacity: 1 },
        ],
        { duration: 220, easing: "cubic-bezier(.2,.8,.3,1)" }
      )
      .finished.catch(() => {});
    out.cancel();
  }

  async function show(y, m, { force = false, direction = 0 } = {}) {
    if (destroyed || busy) return;
    busy = true;
    root.dataset.state = "loading";
    root.setAttribute("aria-busy", "true");
    if (force) months.delete(monthKey(y, m));
    try {
      await turnPage(direction, async () => {
        year = y;
        month = m;
        const entry = await loadMonth(y, m);
        if (destroyed) return;
        paintAll(entry);
      });
    } finally {
      busy = false;
      if (!destroyed) {
        const entry = bucket();
        root.dataset.state = entry?.mode === "error" || !entry ? "error" : "ready";
        root.setAttribute("aria-busy", "false");
      }
    }
  }

  /** Page by `delta` months, keeping the same day-of-month where it exists. */
  const stepMonth = (delta) => {
    const dom = Number(selected.slice(8));
    const lastDay = new Date(Date.UTC(year, month + delta + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(year, month + delta, Math.min(dom, lastDay)));
    selected = d.toISOString().slice(0, 10);
    return show(d.getUTCFullYear(), d.getUTCMonth(), { direction: delta });
  };

  function selectDay(key, { focus = true } = {}) {
    const d = utc(key);
    const target = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    const sameMonth = target.y === year && target.m === month;
    selected = key;
    if (sameMonth) {
      paintGrid();
      paintSelected();
      if (focus) tbody.querySelector(`[data-day="${key}"]`)?.focus();
      return Promise.resolve();
    }
    return show(target.y, target.m, {
      direction: target.y * 12 + target.m > year * 12 + month ? 1 : -1,
    }).then(() => {
      if (focus) tbody.querySelector(`[data-day="${key}"]`)?.focus();
    });
  }

  /* -------------------------------------------------------------- events */
  prev.addEventListener("click", () => stepMonth(-1));
  next.addEventListener("click", () => stepMonth(1));
  todayBtn.addEventListener("click", () => selectDay(today));

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-day]");
    if (target && root.contains(target)) selectDay(target.dataset.day);
  });

  tbody.addEventListener("keydown", (event) => {
    const day = event.target.closest?.("[data-day]")?.dataset.day;
    if (!day) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let key = null;
    if (event.key in moves) key = addDays(day, moves[event.key]);
    else if (event.key === "Home")
      key = addDays(day, -((utc(day).getUTCDay() - weekStart + 7) % 7));
    else if (event.key === "End")
      key = addDays(day, 6 - ((utc(day).getUTCDay() - weekStart + 7) % 7));
    else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const d = utc(day);
      const delta = event.key === "PageUp" ? -1 : 1;
      const lastDay = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta + 1, 0)
      ).getUTCDate();
      const t = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, Math.min(d.getUTCDate(), lastDay))
      );
      selectDay(t.toISOString().slice(0, 10));
      return;
    }
    if (key) {
      event.preventDefault();
      selectDay(key);
    }
  });

  // Swipe sideways to turn the page on touch screens.
  let touch = null;
  sheet.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touch = { x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );
  sheet.addEventListener(
    "touchend",
    (e) => {
      if (!touch) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 45) stepMonth(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );

  /* ----------------------------------------------------------------- boot */
  paintAll(null);
  Promise.all([loadStyles(), loadUpcoming()])
    .then(() => show(year, month))
    .catch(() => show(year, month));

  return {
    destroy() {
      destroyed = true;
      mount.dataset.bound = "false";
    },
    select: selectDay,
    get month() {
      return { year, month };
    },
  };
}
