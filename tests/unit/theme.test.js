/**
 * SAC IISER Kolkata — Theme System Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentTheme,
  setTheme,
  toggleTheme,
  initTheme,
} from '../../src/components/shared/ThemeToggle.js';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set theme and persist to localStorage', () => {
    setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('sac-theme')).toBe('light');
  });

  it('should set theme to dark', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should get current theme', () => {
    setTheme('dark');
    expect(getCurrentTheme()).toBe('dark');
    setTheme('light');
    expect(getCurrentTheme()).toBe('light');
  });

  it('should default to dark when no theme is set', () => {
    expect(getCurrentTheme()).toBe('dark');
  });

  it('should toggle between dark and light', () => {
    setTheme('dark');
    toggleTheme();
    expect(getCurrentTheme()).toBe('light');
    toggleTheme();
    expect(getCurrentTheme()).toBe('dark');
  });

  it('should init theme from localStorage preference', () => {
    localStorage.setItem('sac-theme', 'light');
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should init theme from prefers-color-scheme', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: true,
      })),
    });
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: false,
      })),
    });
  });
});
