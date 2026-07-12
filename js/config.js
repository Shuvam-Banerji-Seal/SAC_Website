/**
 * config.js — site-wide constants.
 *
 * Path note
 * ---------
 * The site is pure static HTML/JS/CSS with NO build step, so we don't
 * use a bundler-resolved base URL. Instead, paths in HTML and JS are
 * written relative to the document's location, and `js/utils/dom.js`
 * exports a `pageUrl(path)` helper that does the right thing from
 * any depth.
 *
 * The URL prefix the deployed site is served under is already baked
 * into `assets_map.jsonl` (see the `public_url` field of every entry
 * — that's the value the website uses for `<img src>` and `fetch()`
 * of the markdown files). To redeploy at a different path, regenerate
 * the jsonl via `sac-assets-map --site-base /my/path/`.
 */
export const SITE_TITLE = "Student Activity Council — IISER Kolkata";
export const SITE_DESCRIPTION =
  "Official website of the Student Activity Council (SAC) at IISER Kolkata. Showcase of 29 clubs — cultural, sports, academic, and hostel — their members, events, and achievements.";

/** YouTube Data API v3 — set your API key and channel ID here.
 *  Create a key at https://console.cloud.google.com/apis/credentials
 *  and restrict it by HTTP referrer to your domain.
 *  Leave as empty strings to hide the YouTube section. */
export const YOUTUBE = {
  API_KEY: "AIzaSyD7QG2qJeomHIT0d1_7JAztF_QDqS6_x5c",
  CHANNEL_ID: "UCG4CBJCFakSLL9fHcJbye6A",
  MAX_RESULTS: 4,
};

/** Google Calendar API v3 — set your API key and a public calendar ID.
 *  Create a key at https://console.cloud.google.com/apis/credentials
 *  restrict by referrer, and make sure the calendar visibility is "public".
 *  Leave as empty strings to hide the Calendar section. */
export const CALENDAR = {
  API_KEY: "AIzaSyDix1gYEkzR-s2qYg_K2o0HZ67Cw5aQZwQ",
  CALENDAR_ID: "sbs22ms076@iiserkol.ac.in",
  MAX_RESULTS: 6,
};

/** Navigation entries. `href` is a path relative to the site ROOT
 *  (e.g. "pages/clubs.html"). The navbar renderer uses pageUrl() to
 *  adapt it for the current page's depth. */
export const NAV_ITEMS = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "about", label: "About", href: "pages/about.html" },
  { id: "clubs", label: "Clubs", href: "pages/clubs.html" },
  { id: "events", label: "Events", href: "pages/events.html" },
  { id: "gallery", label: "Gallery", href: "pages/gallery.html" },
];
