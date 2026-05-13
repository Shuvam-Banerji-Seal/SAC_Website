/**
 * SAC IISER Kolkata — Lazy Loading Utility
 * Uses IntersectionObserver for images and heavy sections.
 */

/**
 * LazyLoader — observes elements and loads them when they enter the viewport.
 */
export class LazyLoader {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '50px 0px';
    this.threshold = options.threshold || 0.01;
    this.observers = new Map();
    this.loadedCount = 0;
  }

  /**
   * Observe an image element for lazy loading.
   * Expects <img data-src="url" data-srcset="optional" alt="...">
   * @param {HTMLImageElement} img
   */
  observeImage(img) {
    if (img.dataset.loaded === 'true') return;

    const src = img.dataset.src;
    if (!src) return;

    const loadImage = () => {
      img.src = src;
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
      }
      img.dataset.loaded = 'true';
      this.loadedCount++;

      img.addEventListener(
        'load',
        () => {
          img.classList.add('lazy-loaded');
        },
        { once: true }
      );

      img.addEventListener(
        'error',
        () => {
          img.classList.add('lazy-error');
          console.warn(`[LazyLoader] Failed to load: ${src}`);
        },
        { once: true }
      );
    };

    // If already intersecting (e.g., above the fold), load immediately
    if (this._isInViewport(img)) {
      loadImage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadImage();
            observer.unobserve(img);
            this.observers.delete(img);
          }
        }
      },
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold,
      }
    );

    observer.observe(img);
    this.observers.set(img, observer);
  }

  /**
   * Observe a section/element for callback when it enters the viewport.
   * @param {Element} el
   * @param {Function} callback
   */
  observeSection(el, callback) {
    if (el.dataset.observed === 'true') return;

    // If already in viewport, call immediately
    if (this._isInViewport(el)) {
      callback();
      el.dataset.observed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callback();
            el.dataset.observed = 'true';
            observer.unobserve(el);
            this.observers.delete(el);
          }
        }
      },
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold,
      }
    );

    observer.observe(el);
    this.observers.set(el, observer);
  }

  /**
   * Observe all images with data-src in a container.
   * @param {Element} [container=document]
   */
  observeAllImages(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach((img) => this.observeImage(img));
    return images.length;
  }

  /**
   * Disconnect all observers.
   */
  disconnectAll() {
    for (const [, observer] of this.observers) {
      observer.disconnect();
    }
    this.observers.clear();
  }

  /**
   * Check if an element is currently in the viewport.
   * @param {Element} el
   * @returns {boolean}
   */
  _isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom >= 0 &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
      rect.right >= 0
    );
  }
}

// Singleton instance for global use
export const lazyLoader = new LazyLoader();
