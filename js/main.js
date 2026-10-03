/**
 * main.js — entry point. Runs on every page.
 *
 *  1. Applies saved theme / text-size / motion / sound prefs (no FOUC)
 *  2. Renders the sidebar navigation and footer
 *  3. Wires the sidebar toggle (mobile off-canvas) and the settings panel
 *  4. Loads ONLY the current page's script (body[data-page] / data-club-slug)
 *  5. Defers everything that is not needed for first paint to idle time
 *
 * Load budget. Every page used to import every other page's script (home,
 * clubs, events, gallery, campus life, the club pages …) — about 40 module
 * requests on a cold phone load. Now the entry brings the shell, and a page
 * brings its own code. Each HTML page also carries a <link rel="modulepreload">
 * for its module, so the fetch starts with the document instead of waiting
 * for this file to run.
 *
 * Three.js was removed in the lightweight redesign (docs/new-design.md).
 */
import { onReady } from "./utils/dom.js";
import { renderNavbar } from "./components/navbar.js";
import { renderFooter } from "./components/footer.js";
import { setupNavbarFold } from "./components/navbar-fold.js";
import { initSearchLauncher } from "./components/search-launcher.js";
import { initSettings, applyPrefs, loadPrefs } from "./components/settings.js";
import { initLoader } from "./loader.js";
import { initBackToTop } from "./components/back-to-top.js";
import { applyThumbView, loadThumbView } from "./utils/view-pref.js";

/** One lazy loader per page type — nothing is fetched until it is the page. */
const PAGES = {
  home: () => import("./pages/home.js").then((m) => m.initHome),
  clubs: () => import("./pages/clubs.js").then((m) => m.initClubs),
  events: () => import("./pages/events.js").then((m) => m.initEvents),
  gallery: () => import("./pages/gallery.js").then((m) => m.initGallery),
  "campus-life": () => import("./pages/campus-life.js").then((m) => m.initCampusLife),
};

/** Run `fn` when the browser is idle (or soon after, where it can't tell). */
function whenIdle(fn, timeout = 1500) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 200);
}

/**
 * Register the service worker once the page has finished loading and the
 * browser is idle. Registering it during load made the worker's install fetch
 * compete with the page's own first-paint downloads.
 *
 * Resolve relative to THIS module, not a hard-coded "/SAC_Website/" — the
 * repo is mirrored under /SAC_website/ (lowercase w) on the primary Pages
 * domain, where the old absolute path 404'd and the SW never registered.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  const register = () =>
    whenIdle(() => {
      try {
        const swUrl = new URL("../sw.js", import.meta.url);
        navigator.serviceWorker.register(swUrl).catch(() => {});
      } catch {
        /* URL resolution failed — non-fatal */
      }
    }, 4000);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

onReady(async () => {
  const page = document.body.dataset.page || "home";

  // Every page gets the same small letterpress entrance, not only the home
  // page. The module guard makes this safe if a legacy page still includes
  // js/loader.js directly.
  initLoader();

  // Apply saved prefs BEFORE anything renders to prevent FOUC.
  try {
    applyPrefs(loadPrefs());
  } catch {
    /* ignore */
  }

  // The thumb-wall preference (pinned cards vs contact sheet) applies on
  // EVERY page — club and events grids honour it even though only Gallery
  // and Campus Life carry the switch.
  try {
    applyThumbView(loadThumbView());
  } catch {
    /* ignore */
  }

  renderNavbar(page);
  renderFooter();
  setupNavbarFold();
  initSearchLauncher(); // "/" and Ctrl/⌘ K; the palette itself loads on first use
  initSettings();
  initBackToTop();

  // The page's own script — started now, not after the idle work below.
  const pageReady = PAGES[page]?.()
    .then((init) => init())
    .catch((err) => console.error(`[main] could not start the ${page} page:`, err));

  // Skip-to-content link — injected once, targets <main>.
  // WCAG 2.1 SC 2.4.1 (Bypass Blocks).
  const mainEl = document.querySelector("main");
  if (mainEl && !mainEl.id) mainEl.id = "main-content";
  if (!document.querySelector(".skip-link")) {
    const skipLink = document.createElement("a");
    skipLink.href = "#main-content";
    skipLink.className = "skip-link";
    skipLink.textContent = "Skip to content";
    document.body.prepend(skipLink);
  }

  // About page: live archive stats under the intro
  if (page === "about") {
    const { renderCouncilFacts } = await import("./components/council-facts.js");
    renderCouncilFacts("about-stats");
  }

  // Individual club pages (data-club-slug) — load images from JSONL
  const clubPage = document.body.dataset.clubSlug
    ? Promise.all([import("./pages/club-page.js"), import("./pages/club-images.js")])
        .then(([profile, images]) => Promise.all([profile.initClubPage(), images.initClubImages()]))
        // the jump bar is built last, once every section (gallery, portraits…) exists
        .then(() => import("./components/section-nav.js"))
        .then((nav) => nav.initClubSectionNav())
        .catch((err) => console.error("[main] could not start the club page:", err))
    : null;

  // Not needed for first paint: the lightbox (it listens at the document, so
  // it only has to exist before someone clicks a plate), the ambient-music
  // element (preload="none" — nothing is downloaded until it is switched on),
  // and the reading-progress rule.
  whenIdle(async () => {
    const [{ initViewer }, { initAmbientMusic }, { initReadingProgress }] = await Promise.all([
      import("./components/viewer.js"),
      import("./utils/music.js"),
      import("./components/reading-progress.js"),
    ]);
    initViewer();
    initAmbientMusic();
    initReadingProgress();
  });

  registerServiceWorker();
  await Promise.all([pageReady, clubPage]);
});
