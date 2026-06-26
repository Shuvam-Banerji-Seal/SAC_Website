/**
 * main.js — entry point. Runs on every page.
 *
 *  1. Applies saved theme/font/texture preferences (no FOUC)
 *  2. Renders the navbar (with active-link highlighting)
 *  3. Renders the footer
 *  4. Wires up the paper-fold navbar reveal/toggle (mobile pull-down
 *     + desktop corner-fold side drawer)
 *  5. Initialises the settings panel (dark mode, font/texture picker)
 *  6. Dispatches to the page-specific initialiser based on body[data-page]
 */
import { onReady } from "./utils/dom.js";
import { renderNavbar } from "./components/navbar.js";
import { renderFooter } from "./components/footer.js";
import { setupNavbarFold } from "./components/navbar-fold.js";
import { initSettings } from "./components/settings.js";
import { initViewer } from "./components/viewer.js";
import { initPaperFold } from "./components/three-fold.js";
import { initHome } from "./pages/home.js";
import { initClubs } from "./pages/clubs.js";
import { initClubImages } from "./pages/club-images.js";
import { initEvents } from "./pages/events.js";
import { initGallery } from "./pages/gallery.js";

const initializers = {
  home: initHome,
  clubs: initClubs,
  events: initEvents,
  gallery: initGallery,
};

onReady(() => {
  const page = document.body.dataset.page || "home";

  // Apply saved theme BEFORE anything renders to prevent FOUC.
  // Reads from localStorage and sets data-theme / data-texture on <html>.
  try {
    const prefs = JSON.parse(localStorage.getItem("sac-site-prefs") || "{}");
    if (prefs.dark === true) document.documentElement.setAttribute("data-theme", "dark");
    else if (prefs.dark === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      document.documentElement.setAttribute("data-theme", "dark");
    if (prefs.texture) document.documentElement.setAttribute("data-texture", prefs.texture);
  } catch {
    /* ignore */
  }

  renderNavbar(page);
  renderFooter();
  setupNavbarFold();
  initSettings();
  initViewer();
  initPaperFold();
  initializers[page]?.();

  // Individual club pages (data-club-slug) — load images from JSONL
  if (document.body.dataset.clubSlug) {
    initClubImages();
  }

  // Register Service Worker for asset caching (production only).
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/SAC_Website/sw.js").catch(() => {});
  }
});
