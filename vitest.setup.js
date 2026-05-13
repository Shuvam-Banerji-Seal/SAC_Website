/**
 * SAC IISER Kolkata — Vitest Setup
 * Provides global mocks for browser APIs not available in jsdom.
 */

if (typeof globalThis.IntersectionObserver === 'undefined') {
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
  }
  globalThis.IntersectionObserver = MockIntersectionObserver;
}

// Mock localStorage for jsdom
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] ?? null,
  };
}

// Mock matchMedia for jsdom
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (query) => ({
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
