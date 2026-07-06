/**
 * test/unit/improvements.test.js — tests for all recent improvements:
 * - image-set() fallback for raster textures
 * - decoding=async on all dynamically created <img>
 * - SW cache for individual club pages
 * - SRI integrity for Three.js CDN
 * - Skip-to-content link
 * - Focus-visible styles
 * - Global reduced-motion safety net
 * - Font-size scale CSS variable
 * - Settings panel new controls (font-size, reduce-motion, sound)
 * - Clubs search
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, "../.." + rel), "utf-8");

describe("Phase 1.1: image-set() for raster textures", () => {
  const mainCss = read("/css/main.css");
  const homeCss = read("/css/pages/home.css");

  it("main.css uses image-set() for natural-paper.png", () => {
    expect(mainCss).toContain("image-set(");
    expect(mainCss).toContain("natural-paper.png");
  });

  it("home.css uses image-set() for newspaper-bg.jpg (lead-article)", () => {
    // At least one image-set call should reference newspaper-bg.jpg
    const imageSetBlocks = homeCss.match(/image-set\([^)]*newspaper-bg[^)]*\)/g);
    expect(imageSetBlocks).toBeTruthy();
    expect(imageSetBlocks.length).toBeGreaterThanOrEqual(1);
  });

  it("home.css uses image-set() for old-paper.jpg", () => {
    const imageSetBlocks = homeCss.match(/image-set\([^)]*old-paper[^)]*\)/g);
    expect(imageSetBlocks).toBeTruthy();
  });
});

describe("Phase 1.2: decoding=async on dynamically created <img>", () => {
  const clubs = read("/js/pages/clubs.js");
  const clubImages = read("/js/pages/club-images.js");
  const gallery = read("/js/pages/gallery.js");
  const events = read("/js/pages/events.js");
  const home = read("/js/pages/home.js");

  it("clubs.js has decoding: async", () => {
    expect(clubs).toContain('decoding: "async"');
  });

  it("club-images.js has decoding: async", () => {
    expect(clubImages).toContain('decoding: "async"');
  });

  it("gallery.js has decoding: async", () => {
    expect(gallery).toContain('decoding: "async"');
  });

  it("events.js has decoding: async", () => {
    expect(events).toContain('decoding: "async"');
  });

  it("home.js has decoding: async", () => {
    expect(home).toContain('decoding: "async"');
  });
});

describe("Phase 1.3: mobile background simplification", () => {
  const mainCss = read("/css/main.css");

  it("touch device media query reduces background layers for home page", () => {
    expect(mainCss).toContain("(hover: none) and (pointer: coarse)");
    expect(mainCss).toContain('body[data-page="home"]');
    expect(mainCss).toContain("var(--paper-grain)");
  });
});

describe("Phase 1.4: SW cache for individual club pages", () => {
  const sw = read("/sw.js");

  it("sw.js caches all 12 individual club pages", () => {
    const clubPages = [
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
    clubPages.forEach((page) => {
      expect(sw).toContain(`"${page}"`);
    });
  });

  it("sw.js no longer references the old club.html template", () => {
    expect(sw).not.toContain('"pages/club.html"');
  });
});

describe("Phase 1.5: SRI integrity for Three.js CDN", () => {
  const index = read("/index.html");

  it("index.html has modulepreload with integrity for Three.js", () => {
    expect(index).toContain('rel="modulepreload"');
    expect(index).toContain("three@0.171.0");
    expect(index).toContain('integrity="sha384-');
    expect(index).toContain('crossorigin="anonymous"');
  });
});

describe("Phase 2.1: skip-to-content link", () => {
  const mainJs = read("/js/main.js");
  const componentsCss = read("/css/components.css");

  it("main.js injects skip-to-content link", () => {
    expect(mainJs).toContain("skip-link");
    expect(mainJs).toContain("#main-content");
    expect(mainJs).toContain("Skip to content");
  });

  it("main.js sets id=main-content on <main>", () => {
    expect(mainJs).toContain('mainEl.id = "main-content"');
  });

  it("components.css defines .skip-link styles", () => {
    expect(componentsCss).toContain(".skip-link");
    expect(componentsCss).toContain(".skip-link:focus");
  });
});

describe("Phase 2.2: global focus-visible styles", () => {
  const resetCss = read("/css/reset.css");

  it("reset.css defines :focus-visible outline", () => {
    expect(resetCss).toContain(":focus-visible");
    expect(resetCss).toContain("outline:");
    expect(resetCss).toContain("outline-offset:");
  });

  it("reset.css defines focus-visible for a, button, input, select, textarea", () => {
    expect(resetCss).toContain("a:focus-visible");
    expect(resetCss).toContain("button:focus-visible");
    expect(resetCss).toContain("input:focus-visible");
    expect(resetCss).toContain("select:focus-visible");
    expect(resetCss).toContain("textarea:focus-visible");
  });
});

describe("Phase 2.3: global reduced-motion safety net", () => {
  const variablesCss = read("/css/variables.css");

  it("variables.css has global prefers-reduced-motion: reduce block", () => {
    expect(variablesCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(variablesCss).toContain("animation-duration: 0.001ms");
    expect(variablesCss).toContain("transition-duration: 0.001ms");
  });

  it("variables.css has data-reduce-motion override", () => {
    expect(variablesCss).toContain('[data-reduce-motion="on"]');
  });
});

describe("Phase 3.1: font-size scale variable", () => {
  const variablesCss = read("/css/variables.css");
  const mainCss = read("/css/main.css");

  it("variables.css defines --fs-scale in :root", () => {
    expect(variablesCss).toContain("--fs-scale: 1");
  });

  it("main.css body uses --fs-scale", () => {
    expect(mainCss).toContain("--fs-scale");
    expect(mainCss).toContain("calc(var(--fs-base) * var(--fs-scale))");
  });
});

describe("Phase 3.2: settings panel new controls", () => {
  const settingsJs = read("/js/components/settings.js");

  it("settings.js handles font-size control", () => {
    expect(settingsJs).toContain("fontSize");
    expect(settingsJs).toContain("applyFontSize");
    expect(settingsJs).toContain("font-size-btn");
    expect(settingsJs).toContain("data-font-size");
  });

  it("settings.js handles reduce-motion toggle", () => {
    expect(settingsJs).toContain("reduceMotion");
    expect(settingsJs).toContain("applyReduceMotion");
    expect(settingsJs).toContain("settings-reduce-motion");
    expect(settingsJs).toContain("data-reduce-motion");
  });

  it("settings.js handles sound toggle", () => {
    expect(settingsJs).toContain("settings-sound");
    expect(settingsJs).toContain("applySound");
    expect(settingsJs).toContain("setSoundEnabled");
  });

  it("settings.js persists new prefs to localStorage", () => {
    expect(settingsJs).toContain("savePrefs");
    expect(settingsJs).toContain("loadPrefs");
  });
});

describe("Phase 3.2: calligraphy and three-fold respect manual reduce-motion", () => {
  const calligraphy = read("/js/utils/calligraphy.js");
  const threeFold = read("/js/components/three-fold.js");

  it("calligraphy.js checks data-reduce-motion attribute", () => {
    expect(calligraphy).toContain('getAttribute("data-reduce-motion")');
  });

  it("three-fold.js checks data-reduce-motion attribute", () => {
    expect(threeFold).toContain('getAttribute("data-reduce-motion")');
  });
});

describe("Phase 3.4: clubs search", () => {
  const clubsHtml = read("/pages/clubs.html");
  const clubsJs = read("/js/pages/clubs.js");
  const clubsCss = read("/css/pages/clubs.css");

  it("clubs.html has search input", () => {
    expect(clubsHtml).toContain('id="clubs-search"');
    expect(clubsHtml).toContain('type="search"');
    expect(clubsHtml).toContain('aria-label="Search clubs');
  });

  it("clubs.js wires input event on search", () => {
    expect(clubsJs).toContain("clubs-search");
    expect(clubsJs).toContain('addEventListener("input"');
    expect(clubsJs).toContain("data-club-name");
  });

  it("clubs.js shows 'no results' message", () => {
    expect(clubsJs).toContain("No clubs match that search");
  });

  it("clubs.css styles the search input", () => {
    expect(clubsCss).toContain(".clubs-search");
    expect(clubsCss).toContain(".clubs-search-wrap");
  });
});

describe("Phase 6.1: Open Graph + JSON-LD", () => {
  const index = read("/index.html");

  it("index.html has Open Graph meta tags", () => {
    expect(index).toContain('property="og:type"');
    expect(index).toContain('property="og:title"');
    expect(index).toContain('property="og:description"');
    expect(index).toContain('property="og:image"');
    expect(index).toContain('property="og:site_name"');
  });

  it("index.html has Twitter Card meta tags", () => {
    expect(index).toContain('name="twitter:card"');
    expect(index).toContain('name="twitter:title"');
    expect(index).toContain('name="twitter:description"');
    expect(index).toContain('name="twitter:image"');
  });

  it("index.html has JSON-LD structured data", () => {
    expect(index).toContain('type="application/ld+json"');
    expect(index).toContain('"@type": "Organization"');
    expect(index).toContain("Student Activity Council");
  });
});

describe("Phase 6.2: Print stylesheet", () => {
  const printCss = read("/css/print.css");
  const index = read("/index.html");

  it("print.css exists and targets @media print", () => {
    expect(printCss).toContain("@media print");
  });

  it("print.css hides interactive elements", () => {
    expect(printCss).toContain("#loader");
    expect(printCss).toContain(".settings-fab");
    expect(printCss).toContain(".viewer-overlay");
    expect(printCss).toContain(".skip-link");
  });

  it("print.css styles the ob-table for print", () => {
    expect(printCss).toContain(".ob-table");
    expect(printCss).toContain("border-collapse");
  });

  it("index.html links print.css with media=print", () => {
    expect(index).toContain('media="print"');
    expect(index).toContain("print.css");
  });
});

describe("Phase 6.3: Events page search", () => {
  const eventsHtml = read("/pages/events.html");
  const eventsJs = read("/js/pages/events.js");

  it("events.html has search input", () => {
    expect(eventsHtml).toContain('id="events-search"');
    expect(eventsHtml).toContain('type="search"');
  });

  it("events.js wires search input", () => {
    expect(eventsJs).toContain("events-search");
    expect(eventsJs).toContain('addEventListener("input"');
    expect(eventsJs).toContain("data-event-search");
  });

  it("events.js shows no-results message", () => {
    expect(eventsJs).toContain("No events match");
  });

  it("events.js respects manual reduce-motion override", () => {
    expect(eventsJs).toContain("data-reduce-motion");
  });
});

describe("Phase 6.4: Gallery category filter tabs", () => {
  const galleryHtml = read("/pages/gallery.html");
  const galleryJs = read("/js/pages/gallery.js");
  const galleryCss = read("/css/pages/gallery.css");

  it("gallery.html has filter wrap element", () => {
    expect(galleryHtml).toContain('id="gallery-filter-wrap"');
  });

  it("gallery.js creates filter tabs", () => {
    expect(galleryJs).toContain("gallery-filter-tab");
    expect(galleryJs).toContain("data-filter");
    expect(galleryJs).toContain("gallery__club");
    expect(galleryJs).toContain("data-gallery-club");
  });

  it("gallery.js wires filter click handler", () => {
    expect(galleryJs).toContain("gallery-filter-tab");
    expect(galleryJs).toContain("is-selected");
  });

  it("gallery.css styles filter tabs", () => {
    expect(galleryCss).toContain(".gallery-filter-tab");
    expect(galleryCss).toContain(".gallery-filter-bar");
    expect(galleryCss).toContain(".gallery-filter-wrap");
  });

  it("gallery.js respects manual reduce-motion override", () => {
    expect(galleryJs).toContain("data-reduce-motion");
  });
});

describe("Phase 6.5: Error states for failed JSONL", () => {
  const dom = read("/js/utils/dom.js");
  const mainCss = read("/css/main.css");

  it("dom.js exports showError helper", () => {
    expect(dom).toContain("export function showError");
    expect(dom).toContain("error-state");
    expect(dom).toContain('role: "alert"');
  });

  it("dom.js showError has retry button", () => {
    expect(dom).toContain("location.reload");
  });

  it("main.css styles error state", () => {
    expect(mainCss).toContain(".error-state");
    expect(mainCss).toContain(".error-state__title");
    expect(mainCss).toContain(".error-state__detail");
    expect(mainCss).toContain(".error-state__btn");
  });

  it("home.js uses showError on fetch failure", () => {
    const home = read("/js/pages/home.js");
    expect(home).toContain("showError");
    expect(home).toContain("Could not load club data");
  });

  it("clubs.js uses showError on fetch failure", () => {
    const clubs = read("/js/pages/clubs.js");
    expect(clubs).toContain("showError");
    expect(clubs).toContain("Could not load clubs");
  });

  it("events.js uses showError on fetch failure", () => {
    const events = read("/js/pages/events.js");
    expect(events).toContain("showError");
    expect(events).toContain("Could not load events");
  });

  it("gallery.js uses showError on fetch failure", () => {
    const gallery = read("/js/pages/gallery.js");
    expect(gallery).toContain("showError");
    expect(gallery).toContain("Could not load gallery");
  });
});

describe("Phase 6.6: Responsive tables for club OB data", () => {
  const clubCss = read("/css/pages/club.css");
  const clubImages = read("/js/pages/club-images.js");

  it("club.css has card layout for small screens", () => {
    expect(clubCss).toContain("max-width: 480px");
    expect(clubCss).toContain("data-label");
    expect(clubCss).toContain("content: attr(data-label)");
  });

  it("club-images.js adds data-label to table cells", () => {
    expect(clubImages).toContain("addTableDataLabels");
    expect(clubImages).toContain("data-label");
    expect(clubImages).toContain(".ob-table");
  });
});
