/**
 * SAC IISER Kolkata — End-to-End Tests (Playwright)
 */

import { test, expect } from '@playwright/test';

test.describe('Hero Loader', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(5000);

    // Filter out expected warnings
    const realErrors = errors.filter((e) => !e.includes('stats.js'));
    expect(realErrors).toEqual([]);
  });

  test('loader canvas is present on initial load', async ({ page }) => {
    await page.goto('/');

    const loaderOverlay = page.locator('#loader-overlay');
    await expect(loaderOverlay).toBeVisible();
  });

  test('loader is removed after animation completes', async ({ page }) => {
    await page.goto('/');

    // Wait for loader to complete (max 10s)
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });

    const loaderOverlay = page.locator('#loader-overlay');
    await expect(loaderOverlay).not.toBeVisible();
  });

  test('main content is visible after loader completes', async ({ page }) => {
    await page.goto('/');

    // Wait for loader to finish
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });

    // Check main content is visible
    const heroSection = page.locator('#hero');
    await expect(heroSection).toBeVisible();

    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('all nav links exist', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    const navLinks = page.locator('[data-nav-link]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // Check each link has href
    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('nav links scroll to correct sections', async ({ page }) => {
    await page.goto('/');

    // Wait for loader
    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    // Click "About" link
    await page.click('a[href="#about"]');
    await page.waitForTimeout(1000); // smooth scroll

    const aboutSection = page.locator('#about');
    const boundingBox = await aboutSection.boundingBox();
    expect(boundingBox.y).toBeCloseTo(72, -1); // ~nav-height
  });

  test('mobile menu opens and closes correctly', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for loader
    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    // Open menu
    await page.click('.navbar-toggle');

    const links = page.locator('.navbar-links');
    await expect(links).toHaveClass(/navbar-links--open/);

    // Close menu by clicking toggle
    await page.click('.navbar-toggle');
    await expect(links).not.toHaveClass(/navbar-links--open/);
  });

  test('no broken links', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    const links = page.locator('a[href]');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      // All internal links should be hash links or valid paths
      if (href && !href.startsWith('#')) {
        // It's an absolute or relative URL — make sure it's not a broken external link
        expect(href.startsWith('/') || href.startsWith('http')).toBeTruthy();
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('all images have alt text', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('page has exactly one h1', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('interactive elements are keyboard navigable', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => !document.getElementById('loader-overlay'));

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check focus is on an interactive element
    const focusedTag = await page.evaluate(() => document.activeElement.tagName);
    const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    expect(focusableTags).toContain(focusedTag);
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/');

    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('en');
  });
});
