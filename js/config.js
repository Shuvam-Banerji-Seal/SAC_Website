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
  "Official website of the Student Activity Council (SAC) at IISER Kolkata. Showcase of 10 cultural clubs, their members, events, and achievements.";

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
