/**
 * sw.js — Service Worker for SAC Website asset caching.
 *
 * Caches static assets (CSS, JS, textures, fonts) on first load.
 * Serves from cache on subsequent loads, with network fallback.
 * Dynamic content (JSONL, markdown) is always fetched from network
 * but cached with a short TTL.
 */

const CACHE_NAME = "sac-v10";

const STATIC_ASSETS = [
  // Core
  "index.html",
  "css/reset.css",
  "css/variables.css",
  "css/main.css",
  "css/components.css",
  "css/settings.css",
  "css/viewer.css",
  "css/pages/home.css",
  "css/pages/about.css",
  "css/pages/clubs.css",
  "css/pages/club.css",
  "css/pages/events.css",
  "css/pages/gallery.css",
  "css/loader.css",
  "css/preloader.css",
  "js/main.js",
  "js/config.js",
  "js/data.js",
  "js/loader.js",
  "js/preloader.js",
  "js/utils/dom.js",
  "js/utils/text-measure.js",
  "js/pretext/analysis.js",
  "js/pretext/bidi.js",
  "js/pretext/layout.js",
  "js/pretext/line-break.js",
  "js/pretext/line-text.js",
  "js/pretext/measurement.js",
  "js/pretext/rich-inline.js",
  "js/pretext/generated/bidi-data.js",
  "js/components/navbar.js",
  "js/components/navbar-fold.js",
  "js/components/footer.js",
  "js/components/settings.js",
  "js/components/viewer.js",
  "js/pages/home.js",
  "js/pages/clubs.js",
  "js/pages/club.js",
  "js/pages/events.js",
  "js/pages/gallery.js",
  // Textures
  "assets/natural-paper.png",
  "assets/paper-fibers.png",
  "assets/paper.png",
  "assets/groovepaper.png",
  "assets/rice-paper.png",
  "assets/stressed-linen.png",
  "assets/old-wall.png",
  // Sub-pages
  "pages/about.html",
  "pages/clubs.html",
  "pages/events.html",
  "pages/gallery.html",
  "pages/aarshi.html",
  "pages/arts.html",
  "pages/radio.html",
  "pages/ikqc.html",
  "pages/literary.html",
  "pages/movie.html",
  "pages/music.html",
  "pages/nature.html",
  "pages/nrutya.html",
  "pages/pixel.html",
  "pages/academics.html",
  "pages/hostel.html",
];

const DYNAMIC_ASSETS = ["public/assets/processed/assets_map.jsonl"];

/* -------------------------------------------------------------------------
 * Install — cache static assets
 * ------------------------------------------------------------------------- */

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Some assets may not exist (e.g., pages that don't exist yet).
        // Don't fail the whole install for missing assets.
        console.warn("[SW] Some static assets failed to cache:", err);
      });
    })
  );
});

/* -------------------------------------------------------------------------
 * Activate — clean old caches
 * ------------------------------------------------------------------------- */

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    })
  );
});

/* -------------------------------------------------------------------------
 * Fetch — serve from cache first, fall back to network
 * ------------------------------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Dynamic assets (JSONL, markdown) — network first, cache fallback
  if (DYNAMIC_ASSETS.some((path) => url.pathname.endsWith(path))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — stale-while-revalidate: serve from cache instantly,
  // update cache from network in the background so next load is fresh.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok && url.pathname.startsWith("/SAC_Website/")) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      });
    })
  );
});
