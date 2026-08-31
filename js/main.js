/**
 * main.js — entry point. Runs on every page.
 *
 *  1. Applies saved theme / text-size / motion / sound prefs (no FOUC)
 *  2. Renders the sidebar navigation
 *  3. Renders the footer
 *  4. Wires the sidebar toggle (mobile off-canvas)
 *  5. Initialises the lightweight settings panel
 *  6. Dispatches to the page-specific initialiser based on body[data-page]
 *
 * Three.js was removed in the lightweight redesign (new_design.md).
 */
import { onReady } from "./utils/dom.js";
import { renderNavbar } from "./components/navbar.js";
import { renderFooter } from "./components/footer.js";
import { setupNavbarFold } from "./components/navbar-fold.js";
import { initSettings, applyPrefs, loadPrefs } from "./components/settings.js";
import { initViewer } from "./components/viewer.js";
import { initHome } from "./pages/home.js";
import { initClubs } from "./pages/clubs.js";
import { initClubImages } from "./pages/club-images.js";
import { initClubPage } from "./pages/club-page.js";
import { initEvents } from "./pages/events.js";
import { initGallery } from "./pages/gallery.js";
import { initLoader } from "./loader.js";
import { initAmbientMusic } from "./utils/music.js";
import { initBackToTop } from "./components/back-to-top.js";

const initializers = {
  home: initHome,
  clubs: initClubs,
  events: initEvents,
  gallery: initGallery,
};

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

  renderNavbar(page);
  renderFooter();
  setupNavbarFold();
  initSettings();
  initAmbientMusic();
  initBackToTop();
  const { initReadingProgress } = await import("./components/reading-progress.js");
  initReadingProgress();
  initViewer();
  initializers[page]?.();

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
    const { renderArchiveStats } = await import("./pages/home.js");
    renderArchiveStats("about-stats");
  }

  // Individual club pages (data-club-slug) — load images from JSONL
  if (document.body.dataset.clubSlug) {
    await Promise.all([initClubPage(), initClubImages()]);
  }

  // Register Service Worker for asset caching (production only).
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/SAC_Website/sw.js").catch(() => {});
  }
});
