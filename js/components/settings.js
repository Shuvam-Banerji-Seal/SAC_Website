/**
 * components/settings.js — settings panel, dark mode, font/texture switching.
 *
 * Architecture:
 *   1. On DOMContentLoaded, read localStorage and apply saved preferences.
 *   2. Wire up the floating trigger button, overlay, and panel.
 *   3. On preference change, update CSS data-attributes on <html> and
 *      save to localStorage.
 *   4. Google Fonts are loaded lazily (only when a font preset is first
 *      selected, not on every page load).
 */
import { $, pageUrl } from "../utils/dom.js";

/* -------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = "sac-site-prefs";

const FONT_PRESETS = {
  newspaper: {
    label: "Newspaper",
    families: '"Playfair Display", Georgia, serif',
    weights: "400;700;900",
    google: "Playfair+Display:wght@400;700;900",
  },
  modern: {
    label: "Modern",
    families: '"EB Garamond", Georgia, serif',
    weights: "400;600;700",
    google: "EB+Garamond:wght@400;600;700",
  },
  typewriter: {
    label: "Typewriter",
    families: '"Special Elite", "Courier New", monospace',
    weights: "400",
    google: "Special+Elite",
  },
  gothic: {
    label: "Gothic",
    families: '"IM Fell English", Georgia, serif',
    weights: "400",
    google: "IM+Fell+English",
  },
  classical: {
    label: "Classical",
    families: '"Cormorant", Georgia, serif',
    weights: "400;600;700",
    google: "Cormorant:wght@400;600;700",
  },
  mono: {
    label: "Monospace",
    families: '"IBM Plex Mono", "Courier New", monospace',
    weights: "400;500;700",
    google: "IBM+Plex+Mono:wght@400;500;700",
  },
  oldenglish: {
    label: "Old English",
    families: '"UnifrakturMaguntia", "Times New Roman", serif',
    weights: "400",
    google: "UnifrakturMaguntia",
    displayOnly: true,
  },

};

const TEXTURES = {
  fresh: {
    label: "Fresh",
    bg: "#f8f5ef",
    fg: "#1a1612",
    accent: "#9e1818",
    preview: "assets/natural-paper.png",
  },
  aged: {
    label: "Aged",
    bg: "#e8dcbb",
    fg: "#2b2016",
    accent: "#8b3a3a",
    preview: "assets/paper.png",
  },
  rustic: {
    label: "Rustic",
    bg: "#e0d4b8",
    fg: "#2a1e0e",
    accent: "#8b2828",
    preview: "assets/old-paper.jpg",
  },
  notice: {
    label: "Notice Board",
    bg: "#c9a87c",
    fg: "#2a1e0a",
    accent: "#8b2020",
    preview: "assets/groovepaper.png",
  },
  dark: {
    label: "Dark",
    bg: "#2a2520",
    fg: "#d4c9b8",
    accent: "#d43636",
    preview: "assets/old-wall.png",
  },
  kraft: {
    label: "Kraft",
    bg: "#c4a26c",
    fg: "#2e1e0a",
    accent: "#7a1e1e",
    preview: "assets/groovepaper.png",
  },
  parchment: {
    label: "Parchment",
    bg: "#f0e6cc",
    fg: "#3a2a14",
    accent: "#6b1e1e",
    preview: "assets/rice-paper.png",
  },
  slate: {
    label: "Slate",
    bg: "#2d3748",
    fg: "#e2e8f0",
    accent: "#fc8181",
    preview: "assets/stressed-linen.png",
  },
};

/* -------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

let panelEl = null;
let overlayEl = null;
let fabEl = null;
let loadedFonts = { newspaper: true }; // newspaper is already loaded via <link>

/* -------------------------------------------------------------------------
 * Persistence
 * ------------------------------------------------------------------------- */

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota exceeded, ignore */
  }
}

/* -------------------------------------------------------------------------
 * Apply helpers
 * ------------------------------------------------------------------------- */

function applyTheme(prefs) {
  const root = document.documentElement;
  // Dark mode
  if (prefs.dark === true) {
    root.setAttribute("data-theme", "dark");
  } else if (prefs.dark === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", "light");
  }
}

function applyFont(prefs) {
  const preset = prefs.font || "newspaper";
  const config = FONT_PRESETS[preset];
  if (!config) return;
  if (config.displayOnly) {
    document.documentElement.style.setProperty("--font-display", config.families);
  } else {
    document.documentElement.style.setProperty("--font-display", config.families);
    document.documentElement.style.setProperty("--font-serif", config.families);
  }
  loadGoogleFont(preset);
}

function applyTexture(prefs) {
  const texture = prefs.texture || "fresh";
  document.documentElement.setAttribute("data-texture", texture);
}

function applyAmbient(prefs) {
  const enabled = prefs.ambient !== false;
  // Dynamic import so settings.js works even if music.js is not loaded
  import("../utils/music.js").then(({ setAmbientEnabled }) => {
    setAmbientEnabled(enabled);
  }).catch(() => {
    // music.js may be unavailable in test env
  });
}


function applyAll(prefs) {
  applyTheme(prefs);
  applyFont(prefs);
  applyTexture(prefs);
  applyFontSize(prefs);
  applyReduceMotion(prefs);
  applySound(prefs);
  applyAmbient(prefs);
}

/* ── Font size ────────────────────────────────────────── */
const FONT_SIZE_MAP = { s: "0.85", m: "1", l: "1.2" };
function applyFontSize(prefs) {
  const scale = FONT_SIZE_MAP[prefs.fontSize] || "1";
  document.documentElement.style.setProperty("--fs-scale", scale);
}

/* ── Reduce motion ─────────────────────────────────────── */
function applyReduceMotion(prefs) {
  if (prefs.reduceMotion === "on") {
    document.documentElement.setAttribute("data-reduce-motion", "on");
  } else {
    document.documentElement.removeAttribute("data-reduce-motion");
  }
}

/* ── Sound ─────────────────────────────────────────────── */
function applySound(prefs) {
  // Import setSoundEnabled lazily to avoid loading the audio module
  // if sound settings haven't been changed.
  import("../utils/calligraphy.js")
    .then((mod) => mod.setSoundEnabled(prefs.sound !== false))
    .catch(() => {});
}

/* -------------------------------------------------------------------------
 * Google Fonts loader
 * ------------------------------------------------------------------------- */

function loadGoogleFont(preset) {
  if (loadedFonts[preset]) return;
  const config = FONT_PRESETS[preset];
  if (!config || !config.google) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${config.google}&display=swap`;
  document.head.appendChild(link);
  loadedFonts[preset] = true;
}

/* Preload all font presets so switching is instant. */
function preloadFonts() {
  Object.keys(FONT_PRESETS).forEach(loadGoogleFont);
}

/* -------------------------------------------------------------------------
 * Panel open/close
 * ------------------------------------------------------------------------- */

function openPanel() {
  if (!panelEl || !overlayEl || !fabEl) return;
  panelEl.classList.add("is-open");
  overlayEl.classList.add("is-visible");
  fabEl.classList.add("is-open");
  fabEl.setAttribute("aria-expanded", "true");
}

function closePanel() {
  if (!panelEl || !overlayEl || !fabEl) return;
  panelEl.classList.remove("is-open");
  overlayEl.classList.remove("is-visible");
  fabEl.classList.remove("is-open");
  fabEl.setAttribute("aria-expanded", "false");
}

/* -------------------------------------------------------------------------
 * Render panel inner HTML
 * ------------------------------------------------------------------------- */

function renderPanel() {
  const prefs = loadPrefs();
  const currentFont = prefs.font || "newspaper";
  const currentTexture = prefs.texture || "fresh";
  const isDark = prefs.dark === true || prefs.dark === "auto";
  const fontSize = prefs.fontSize || "m";
  const reduceMotion = prefs.reduceMotion || "auto";
  const soundEnabled = prefs.sound !== false;

  panelEl.innerHTML = `
    <div class="settings-header">
      <h2>Settings</h2>
      <button class="settings-close" aria-label="Close settings">&times;</button>
    </div>

    <!-- Dark mode -->
    <div class="settings-section">
      <span class="settings-section__label">Appearance</span>
      <div class="toggle-row">
        <div>
          <div class="toggle-row__label">Dark mode</div>
          <div class="toggle-row__desc">Dark coffee-stain newspaper</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="settings-dark" ${isDark ? "checked" : ""} />
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>

    <!-- Font -->
    <div class="settings-section">
      <span class="settings-section__label">Typography</span>
      <div class="font-grid">
        ${Object.entries(FONT_PRESETS)
          .map(
            ([key, cfg]) => `
          <button class="font-option ${currentFont === key ? "is-selected" : ""}"
                  data-font="${key}" type="button" aria-label="Select ${cfg.label} font">
            <div class="font-option__name">${cfg.label}</div>
            <div class="font-option__preview">Aa Bb</div>
          </button>`
          )
          .join("")}
      </div>
    </div>

    <!-- Font size -->
    <div class="settings-section">
      <span class="settings-section__label">Text size</span>
      <div class="font-size-row">
        <button class="font-size-btn ${fontSize === "s" ? "is-selected" : ""}" data-font-size="s" type="button" aria-label="Small text">
          <span style="font-size:0.75rem">A</span> Small
        </button>
        <button class="font-size-btn ${fontSize === "m" ? "is-selected" : ""}" data-font-size="m" type="button" aria-label="Medium text">
          <span style="font-size:1rem">A</span> Medium
        </button>
        <button class="font-size-btn ${fontSize === "l" ? "is-selected" : ""}" data-font-size="l" type="button" aria-label="Large text">
          <span style="font-size:1.25rem">A</span> Large
        </button>
      </div>
    </div>

    <!-- Texture -->
    <div class="settings-section">
      <span class="settings-section__label">Paper texture</span>
      <div class="texture-grid">
        ${Object.entries(TEXTURES)
          .map(
            ([key, cfg]) => `
          <button class="texture-option ${currentTexture === key ? "is-selected" : ""}"
                  data-texture="${key}" type="button" aria-label="${cfg.label} texture">
            <div class="texture-option__fill" style="background-color: ${cfg.bg}; background-image: url('${pageUrl(cfg.preview)}'); background-size: cover; background-position: center;"></div>
            <div class="texture-option__label">${cfg.label}</div>
          </button>`
          )
          .join("")}
      </div>
    </div>

    <!-- Accessibility -->
    <div class="settings-section">
      <span class="settings-section__label">Accessibility</span>
      <div class="toggle-row">
        <div>
          <div class="toggle-row__label">Reduce motion</div>
          <div class="toggle-row__desc">Disable animations and parallax</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="settings-reduce-motion" ${reduceMotion === "on" ? "checked" : ""} />
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="toggle-row">
        <div>
          <div class="toggle-row__label">Sound effects</div>
          <div class="toggle-row__desc">Paper scratch, pen, print sounds</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="settings-sound" ${soundEnabled ? "checked" : ""} />
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>

    <div class="settings-footer">SAC Website &middot; Settings</div>
  `;
}

/* -------------------------------------------------------------------------
 * Event wiring
 * ------------------------------------------------------------------------- */

function wireEvents() {
  const prefs = loadPrefs();

  // Toggle panel
  fabEl.addEventListener("click", () => {
    const isOpen = panelEl.classList.contains("is-open");
    if (isOpen) closePanel();
    else openPanel();
  });

  overlayEl.addEventListener("click", closePanel);

  panelEl.addEventListener("click", (e) => {
    if (e.target === panelEl) return;
    // Close button
    if (e.target.closest(".settings-close")) {
      closePanel();
      return;
    }
    // Dark mode toggle
    const darkToggle = e.target.closest("#settings-dark");
    if (darkToggle) {
      prefs.dark = darkToggle.checked;
      savePrefs(prefs);
      applyTheme(prefs);
      return;
    }
    // Font option
    const fontOption = e.target.closest(".font-option");
    if (fontOption) {
      prefs.font = fontOption.dataset.font;
      savePrefs(prefs);
      applyFont(prefs);
      panelEl.querySelectorAll(".font-option").forEach((b) => b.classList.remove("is-selected"));
      fontOption.classList.add("is-selected");
      return;
    }
    // Texture option
    const textureOption = e.target.closest(".texture-option");
    if (textureOption) {
      prefs.texture = textureOption.dataset.texture;
      savePrefs(prefs);
      applyTexture(prefs);
      panelEl.querySelectorAll(".texture-option").forEach((b) => b.classList.remove("is-selected"));
      textureOption.classList.add("is-selected");
      return;
    }
    // Font size
    const fontSizeBtn = e.target.closest(".font-size-btn");
    if (fontSizeBtn) {
      prefs.fontSize = fontSizeBtn.dataset.fontSize;
      savePrefs(prefs);
      applyFontSize(prefs);
      panelEl.querySelectorAll(".font-size-btn").forEach((b) => b.classList.remove("is-selected"));
      fontSizeBtn.classList.add("is-selected");
      return;
    }
    // Reduce motion toggle
    const reduceMotionToggle = e.target.closest("#settings-reduce-motion");
    if (reduceMotionToggle) {
      prefs.reduceMotion = reduceMotionToggle.checked ? "on" : "off";
      savePrefs(prefs);
      applyReduceMotion(prefs);
      return;
    }
    // Sound toggle
    const ambientToggle = e.target.closest("#settings-ambient");
    if (ambientToggle) {
      prefs.ambient = ambientToggle.checked;
      savePrefs(prefs);
      applyAll(prefs);
      return;
    }

    const soundToggle = e.target.closest("#settings-sound");
    if (soundToggle) {
      prefs.sound = soundToggle.checked;
      savePrefs(prefs);
      applySound(prefs);
  applyAmbient(prefs);
      return;
    }
  });

  // Keyboard: Escape closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panelEl.classList.contains("is-open")) {
      closePanel();
      fabEl.focus();
    }
  });

  // Listen for system dark mode changes when preference is "auto"
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (prefs.dark === "auto") applyTheme(prefs);
  });
}

/* -------------------------------------------------------------------------
 * Entry point
 * ------------------------------------------------------------------------- */

export function initSettings() {
  panelEl = document.getElementById("settings-panel");
  overlayEl = document.getElementById("settings-overlay");
  fabEl = document.getElementById("settings-fab");
  if (!panelEl || !overlayEl || !fabEl) return;

  // Apply saved preferences immediately
  const prefs = loadPrefs();
  applyAll(prefs);

  // Render panel content and wire events
  renderPanel();
  wireEvents();

  // Preload font presets so font switching is instant
  preloadFonts();
}
