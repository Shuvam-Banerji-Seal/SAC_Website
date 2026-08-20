/* Lightweight settings with backwards-compatible preference keys. All font
   choices are local system stacks; choosing one never downloads a font. */
import { $ } from "../utils/dom.js";
import { setSoundEnabled } from "../utils/calligraphy.js";
import { setAmbientEnabled } from "../utils/music.js";

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "style") node.setAttribute(key, value);
    else if (key.startsWith("on") && typeof value === "function")
      node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value !== null && value !== undefined)
      node.setAttribute(key, value === true ? "" : value);
  });
  children.flat().forEach((child) => {
    if (child !== null && child !== undefined && child !== false)
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

const KEY = "sac-site-prefs";
const FS_SCALE = { s: 0.85, m: 1, l: 1.2, S: 0.85, M: 1, L: 1.2 };

export const FONT_PRESETS = {
  newspaper: {
    label: "Newspaper",
    display: 'Impact, "Arial Narrow Bold", sans-serif',
    body: 'Georgia, "Times New Roman", serif',
  },
  modern: { label: "Modern", display: '"Trebuchet MS", Arial, sans-serif', body: "Georgia, serif" },
  typewriter: {
    label: "Typewriter",
    display: '"Special Elite", "Courier New", monospace',
    body: '"Special Elite", "Courier New", monospace',
  },
  gothic: { label: "Gothic", display: "Georgia, serif", body: "Georgia, serif" },
  classical: {
    label: "Classical",
    display: "Garamond, Georgia, serif",
    body: "Garamond, Georgia, serif",
  },
  monospace: {
    label: "Monospace",
    display: '"Courier New", monospace',
    body: '"Courier New", monospace',
  },
  oldenglish: {
    label: "Old English",
    display: "Palatino, Georgia, serif",
    body: "Palatino, Georgia, serif",
  },
};

export const TEXTURES = {
  fresh: { label: "Fresh" },
  aged: { label: "Aged" },
  rustic: { label: "Rustic" },
  notice: { label: "Notice" },
  dark: { label: "Dark" },
  kraft: { label: "Kraft" },
  parchment: { label: "Parchment" },
  slate: { label: "Slate" },
  natural: { label: "Natural paper" },
  fibers: { label: "Paper fibers" },
  rice: { label: "Rice paper" },
  linen: { label: "Stressed linen" },
  groove: { label: "Groove paper" },
  wall: { label: "Old wall" },
  newsprint: { label: "Newsprint" },
  ledger: { label: "Ledger" },
  blueprint: { label: "Blueprint" },
};

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage can be blocked */
  }
}

export function applyTheme(prefs) {
  const theme =
    prefs.theme || (prefs.dark === true ? "dark" : prefs.dark === "auto" ? "auto" : "light");
  const dark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.toggleAttribute("data-theme", dark);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.setAttribute("data-theme", "light");
}

export function applyFont(prefs) {
  const font = FONT_PRESETS[prefs.font || "newspaper"] || FONT_PRESETS.newspaper;
  document.documentElement.style.setProperty("--font-display", font.display);
  document.documentElement.style.setProperty("--font-body", font.body);
  document.documentElement.style.setProperty("--font-serif", font.body);
}

export function applyFontSize(prefs) {
  const size = prefs.fontSize || "m";
  document.documentElement.style.setProperty("--fs-scale", FS_SCALE[size] ?? 1);
}

export function applyTexture(prefs) {
  document.documentElement.setAttribute("data-texture", prefs.texture || "fresh");
}

export function applyReduceMotion(prefs) {
  if (prefs.reduceMotion) document.documentElement.setAttribute("data-reduce-motion", "on");
  else document.documentElement.removeAttribute("data-reduce-motion");
}

export function applySound(prefs) {
  setSoundEnabled(prefs.sound === true);
}

export function applyAmbient(prefs) {
  setAmbientEnabled(prefs.ambient === true);
}

export function applyPrefs(prefs) {
  applyTheme(prefs);
  applyFont(prefs);
  applyFontSize(prefs);
  applyTexture(prefs);
  applyReduceMotion(prefs);
  applySound(prefs);
  applyAmbient(prefs);
}

function optionButton(className, value, label, selected) {
  return el(
    "button",
    { type: "button", class: `${className}${selected ? " is-selected" : ""}`, "data-value": value },
    label
  );
}

export function initSettings() {
  const fab = document.getElementById("settings-fab") || $("#settings-fab");
  const panel = document.getElementById("settings-panel") || $("#settings-panel");
  const overlay = document.getElementById("settings-overlay") || $("#settings-overlay");
  if (!fab || !panel || !overlay || panel.__sacSettingsBound) return;
  panel.__sacSettingsBound = true;

  const prefs = loadPrefs();
  applyPrefs(prefs);
  const close = () => {
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    panel.classList.add("is-open");
    overlay.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    panel.querySelector("button")?.focus();
  };
  fab.addEventListener("click", () => (panel.classList.contains("is-open") ? close() : open()));
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  clear(panel);
  const persist = () => {
    savePrefs(prefs);
    applyPrefs(prefs);
  };
  const theme = el("div", { class: "settings-seg" });
  [
    ["light", "Light"],
    ["dark", "Dark"],
    ["auto", "Auto"],
  ].forEach(([value, label]) => {
    const current =
      prefs.theme || (prefs.dark === true ? "dark" : prefs.dark === "auto" ? "auto" : "light");
    const button = optionButton("theme-option", value, label, current === value);
    button.addEventListener("click", () => {
      prefs.theme = value;
      prefs.dark = value === "dark" ? true : value === "auto" ? "auto" : false;
      theme
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("is-selected", item === button));
      persist();
    });
    theme.append(button);
  });
  const darkToggle = el("input", { id: "settings-dark", type: "checkbox" });
  darkToggle.checked = prefs.dark === true || prefs.theme === "dark";
  darkToggle.addEventListener("change", () => {
    prefs.dark = darkToggle.checked;
    prefs.theme = darkToggle.checked ? "dark" : "light";
    persist();
  });
  const themeLegacy = el(
    "label",
    { class: "settings-toggle", for: "settings-dark" },
    "Dark mode",
    darkToggle
  );

  const size = el("div", { class: "settings-seg" });
  ["s", "m", "l"].forEach((value) => {
    const button = optionButton(
      "font-size-btn",
      value,
      value.toUpperCase(),
      (prefs.fontSize || "m") === value || (prefs.fontSize || "m") === value.toUpperCase()
    );
    button.dataset.fontSize = value;
    button.setAttribute("data-font-size", value);
    button.addEventListener("click", () => {
      prefs.fontSize = value;
      size
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("is-selected", item === button));
      persist();
    });
    size.append(button);
  });

  const fontGrid = el("div", { class: "font-grid" });
  Object.entries(FONT_PRESETS).forEach(([value, config]) => {
    const button = optionButton(
      "font-option",
      value,
      config.label,
      (prefs.font || "newspaper") === value
    );
    button.dataset.font = value;
    button.style.fontFamily = config.display;
    button.append(el("span", { class: "font-option__preview" }, "Aa"));
    button.addEventListener("click", () => {
      prefs.font = value;
      fontGrid
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("is-selected", item === button));
      persist();
    });
    fontGrid.append(button);
  });

  const textureGrid = el("div", { class: "texture-grid" });
  Object.entries(TEXTURES).forEach(([value, config]) => {
    const button = optionButton(
      "texture-option",
      value,
      config.label,
      (prefs.texture || "fresh") === value
    );
    button.dataset.texture = value;
    button.addEventListener("click", () => {
      prefs.texture = value;
      textureGrid
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("is-selected", item === button));
      persist();
    });
    textureGrid.append(button);
  });

  const toggle = (id, label, checked, onChange) => {
    const input = el("input", { id, type: "checkbox" });
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    return el("label", { class: "settings-toggle", for: id }, label, input);
  };

  panel.append(
    el(
      "button",
      { class: "settings-close", type: "button", "aria-label": "Close settings", onClick: close },
      "×"
    ),
    el("h2", { class: "settings-panel__title" }, "Settings"),
    el(
      "div",
      { class: "settings-group" },
      el("span", { class: "settings-group__label" }, "Appearance"),
      theme,
      themeLegacy
    ),
    el(
      "div",
      { class: "settings-group" },
      el("span", { class: "settings-group__label" }, "Text size"),
      size
    ),
    el(
      "details",
      { class: "settings-group settings-advanced" },
      el("summary", { class: "settings-group__label" }, "Typography"),
      fontGrid
    ),
    el(
      "details",
      { class: "settings-group settings-advanced" },
      el("summary", { class: "settings-group__label" }, "Paper texture"),
      textureGrid
    ),
    el(
      "div",
      { class: "settings-group" },
      toggle("settings-reduce-motion", "Reduce motion", !!prefs.reduceMotion, (value) => {
        prefs.reduceMotion = value;
        persist();
      }),
      toggle("settings-sound", "Paper ruffling sounds", !!prefs.sound, (value) => {
        prefs.sound = value;
        persist();
      }),
      toggle("settings-ambient", "Calm reading ambience", !!prefs.ambient, (value) => {
        prefs.ambient = value;
        persist();
      })
    )
  );
}
