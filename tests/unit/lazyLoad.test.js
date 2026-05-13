/**
 * SAC IISER Kolkata — LazyLoad Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LazyLoader } from '../../src/utils/lazyLoad.js';

describe('LazyLoader viewport check', () => {
  let lazyLoader;

  beforeEach(() => {
    lazyLoader = new LazyLoader();
    document.body.innerHTML = '';
  });

  it('should correctly detect elements in viewport', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
    });

    const result = lazyLoader._isInViewport(el);
    expect(result).toBe(true);
  });

  it('should detect elements outside viewport', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 9999,
      bottom: 10099,
      left: 0,
      right: 100,
    });

    const result = lazyLoader._isInViewport(el);
    expect(result).toBe(false);
  });
});
