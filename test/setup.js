/**
 * test/setup.js — global test setup for vitest.
 *
 * Provides a minimal DOM environment (via jsdom) and common helpers
 * that every test file can use without re-importing.
 */
import { vi } from "vitest";

// ── Mock IntersectionObserver (not in jsdom) ──────────────────────
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
  }
  observe(el) {
    this.elements.add(el);
  }
  unobserve(el) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }
  // Helper for tests: trigger intersection for all observed elements
  trigger(isIntersecting = true) {
    const entries = Array.from(this.elements).map((target) => ({
      isIntersecting,
      target,
      intersectionRatio: isIntersecting ? 1 : 0,
    }));
    this.callback(entries, this);
  }
}
global.IntersectionObserver = MockIntersectionObserver;

// ── Mock matchMedia (not fully in jsdom) ──────────────────────────
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// ── Mock ResizeObserver ───────────────────────────────────────────
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mock navigator.serviceWorker ──────────────────────────────────
if (!navigator.serviceWorker) {
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      register: () => Promise.resolve(),
      getRegistrations: () => Promise.resolve([]),
      controller: null,
    },
    writable: true,
    configurable: true,
  });
}

// ── Mock document.fonts ───────────────────────────────────────────
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: {
      ready: Promise.resolve(),
      size: 0,
      check: () => true,
      load: () => Promise.resolve(),
    },
    writable: true,
    configurable: true,
  });
}

// ── Mock caches API (Service Worker CacheStorage) ─────────────────
if (!global.caches) {
  global.caches = {
    open: () =>
      Promise.resolve({
        match: () => Promise.resolve(undefined),
        put: () => Promise.resolve(),
        addAll: () => Promise.resolve(),
      }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: () => Promise.resolve(undefined),
  };
}

// ── Helper: create a minimal document body for page tests ─────────
global.setupPage = (pageId = "home") => {
  document.body.setAttribute("data-page", pageId);
  document.body.innerHTML = "";
  return document.body;
};

// ── Helper: wait for async operations ─────────────────────────────
global.flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
