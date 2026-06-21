/**
 * main.js — entry point. Runs on every page.
 *
 *  1. Renders the navbar (with active-link highlighting)
 *  2. Renders the footer
 *  3. Wires up the paper-fold navbar reveal/toggle (mobile pull-down
 *     + desktop corner-fold side drawer)
 *  4. Dispatches to the page-specific initialiser based on body[data-page]
 */
import { onReady } from "./utils/dom.js";
import { renderNavbar } from "./components/navbar.js";
import { renderFooter } from "./components/footer.js";
import { setupNavbarFold } from "./components/navbar-fold.js";
import { initHome } from "./pages/home.js";
import { initClubs } from "./pages/clubs.js";
import { initClub } from "./pages/club.js";
import { initEvents } from "./pages/events.js";
import { initGallery } from "./pages/gallery.js";

const initializers = {
  home: initHome,
  clubs: initClubs,
  club: initClub,
  events: initEvents,
  gallery: initGallery,
};

onReady(() => {
  const page = document.body.dataset.page || "home";
  renderNavbar(page);
  renderFooter();
  setupNavbarFold();
  initializers[page]?.();
});
