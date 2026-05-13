/**
 * SAC IISER Kolkata — Performance & LazyLoad Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LazyLoader } from '../../src/utils/lazyLoad.js';

function createMockImg(data = {}) {
  return {
    dataset: { src: 'test.jpg', ...data },
    addEventListener: vi.fn(),
    classList: { add: vi.fn() },
    getBoundingClientRect: () => ({ top: 9999 }),
  };
}

describe('LazyLoader', () => {
  let lazyLoader;

  beforeEach(() => {
    lazyLoader = new LazyLoader();
  });

  afterEach(() => {
    lazyLoader.disconnectAll();
    vi.restoreAllMocks();
  });

  it('should be an instance of LazyLoader', () => {
    expect(lazyLoader).toBeInstanceOf(LazyLoader);
  });

  it('should have empty observers map initially', () => {
    expect(lazyLoader.observers.size).toBe(0);
  });

  it('should have loadedCount of 0 initially', () => {
    expect(lazyLoader.loadedCount).toBe(0);
  });

  it('should skip already loaded images', () => {
    const img = createMockImg({ loaded: 'true' });
    lazyLoader.observeImage(img);
    expect(lazyLoader.observers.size).toBe(0);
  });

  it('should not observe images without data-src', () => {
    const img = createMockImg();
    img.dataset.src = undefined;
    lazyLoader.observeImage(img);
    expect(lazyLoader.observers.size).toBe(0);
  });

  it('should disconnect all observers', () => {
    const img = createMockImg();
    lazyLoader.observeImage(img);
    expect(lazyLoader.observers.size).toBe(1);

    lazyLoader.disconnectAll();
    expect(lazyLoader.observers.size).toBe(0);
  });

  it('should find images in container', () => {
    const img1 = createMockImg();
    const img2 = createMockImg();
    const container = { querySelectorAll: () => [img1, img2] };

    const count = lazyLoader.observeAllImages(container);
    expect(count).toBe(2);
  });

  it('should observe sections with callback', () => {
    const section = {
      dataset: {},
      getBoundingClientRect: () => ({ top: 9999 }),
    };
    const callback = vi.fn();
    lazyLoader.observeSection(section, callback);
    expect(lazyLoader.observers.size).toBe(1);
  });

  it('should call callback immediately if element is in viewport', () => {
    const section = {
      dataset: {},
      getBoundingClientRect: () => ({ top: 0, bottom: 100, left: 0, right: 100 }),
    };
    const callback = vi.fn();
    lazyLoader.observeSection(section, callback);
    expect(callback).toHaveBeenCalled();
    expect(lazyLoader.observers.size).toBe(0);
  });
});

describe('LazyLoader image swapping', () => {
  let lazyLoader;

  beforeEach(() => {
    lazyLoader = new LazyLoader();
  });

  afterEach(() => {
    lazyLoader.disconnectAll();
    vi.restoreAllMocks();
  });

  it('should swap data-src to src when triggered', () => {
    const mockObserve = vi.fn();
    const mockUnobserve = vi.fn();

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn().mockImplementation(() => ({
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: vi.fn(),
      }))
    );

    const img = createMockImg({ src: '/test-image.jpg' });

    lazyLoader.observeImage(img);

    expect(mockObserve).toHaveBeenCalledTimes(1);

    const callback = global.IntersectionObserver.mock.calls[0][0];
    callback([{ isIntersecting: true, target: img }]);

    expect(mockUnobserve).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});
