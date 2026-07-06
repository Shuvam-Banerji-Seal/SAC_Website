/**
 * js/utils/music.js — background ambient music controller.
 *
 * Lazy-loads an MP3 via an <audio> element, gated behind the first user
 * gesture (same unlock pattern as calligraphy.js). Routes audio through
 * the existing AudioContext + master chain from calligraphy.js for ducking
 * and consistent volume control.
 *
 * Exports:
 *   initAmbientMusic()        — create the audio element (does NOT play)
 *   setAmbientEnabled(bool)   — enable/disable ambient playback
 *   isAmbientEnabled()        — current enabled state
 */

import { pageUrl } from "./dom.js";

const STORAGE_KEY = "sac-site-prefs";
const AUDIO_SRC = pageUrl("assets/audio/ambient.mp3");
const DEFAULT_VOLUME = 0.15;

let audioEl = null;
let mediaSource = null;
let gainNode = null;
let enabled = false;
let gestureUnlocked = false;
let pendingPlay = false;

/* ── Unlock on first gesture ─────────────────────────────────── */

function onFirstGesture() {
  gestureUnlocked = true;
  if (pendingPlay && enabled && audioEl) {
    audioEl.play().catch(noop);
  }
  pendingPlay = false;
}

if (typeof window !== "undefined") {
  document.addEventListener("click", onFirstGesture, { once: true, passive: true });
  document.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });
}

function noop() {}

/* ── Preference helpers ──────────────────────────────────────── */

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writePrefs(patch) {
  try {
    const prefs = readPrefs();
    Object.assign(prefs, patch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota exceeded, ignore */
  }
}

/* ── Public API ──────────────────────────────────────────────── */

export function isAmbientEnabled() {
  return enabled;
}

export function setAmbientEnabled(value) {
  enabled = !!value;
  writePrefs({ ambient: enabled });

  if (!audioEl) return;

  if (enabled && gestureUnlocked) {
    audioEl.play().catch(noop);
  } else {
    audioEl.pause();
  }
}

/**
 * Create the <audio> element and wire it to the existing AudioContext
 * master chain (from calligraphy.js) via a MediaElementSource → gain
 * node → destination. Does NOT auto-play — waits for a user gesture.
 */
export function initAmbientMusic() {
  if (audioEl) return;

  try {
    audioEl = new Audio();
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.src = AUDIO_SRC;
  } catch {
    /* audio element creation failed — fail silently */
    return;
  }

  // Load saved preference (default: enabled)
  const prefs = readPrefs();
  enabled = prefs.ambient !== false;

  // Route through AudioContext → gain → destination for volume ducking
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      // Reuse the existing context from calligraphy.js if available,
      // otherwise create a minimal standalone one.
      // Note: we can't directly access calligraphy's audioCtx (module-scoped),
      // so we access it via the global if set, or create our own.
      const ctx = window.__sacAudioCtx || new AC();

      gainNode = ctx.createGain();
      gainNode.gain.value = DEFAULT_VOLUME;

      mediaSource = ctx.createMediaElementSource(audioEl);
      mediaSource.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Expose the context so calligraphy.js can reuse it if needed
      if (!window.__sacAudioCtx) {
        window.__sacAudioCtx = ctx;
      }
    }
  } catch {
    // If AudioContext routing fails, the audio element still works
    // standalone (just without gain control through the chain).
  }

  // Handle load errors gracefully
  audioEl.addEventListener("error", function () {
    audioEl = null;
    mediaSource = null;
    gainNode = null;
  }, { once: true });
}
