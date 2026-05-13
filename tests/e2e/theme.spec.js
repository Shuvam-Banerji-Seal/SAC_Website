/**
 * SAC IISER Kolkata — Theme E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });
  });

  test('theme toggle button exists', async ({ page }) => {
    const toggle = page.locator('.theme-toggle');
    await expect(toggle).toBeVisible();
  });

  test('clicking toggle switches theme', async ({ page }) => {
    const toggle = page.locator('.theme-toggle');
    const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    await toggle.click();
    const afterFirst = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(afterFirst).not.toBe(initial);

    await toggle.click();
    const afterSecond = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(afterSecond).toBe(initial);
  });

  test('theme persists across reload', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sac-theme', 'light'));
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('light mode has correct background color', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('background-color')
    );
    expect(bg).toBeTruthy();
  });
});

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });
  });

  test('hamburger toggle is visible on mobile', async ({ page }) => {
    const toggle = page.locator('.navbar-toggle');
    await expect(toggle).toBeVisible();
  });

  test('menu opens and closes on toggle click', async ({ page }) => {
    const toggle = page.locator('.navbar-toggle');
    const links = page.locator('.navbar-links');

    await toggle.click();
    await expect(links).toHaveClass(/navbar-links--open/);

    await toggle.click();
    await expect(links).not.toHaveClass(/navbar-links--open/);
  });

  test('menu closes after clicking a nav link', async ({ page }) => {
    const toggle = page.locator('.navbar-toggle');
    const links = page.locator('.navbar-links');

    await toggle.click();
    await expect(links).toHaveClass(/navbar-links--open/);

    await page.click('.navbar-links a:first-child');
    await expect(links).not.toHaveClass(/navbar-links--open/);
  });

  test('nav links are large enough for touch targets', async ({ page }) => {
    const link = page.locator('.navbar-links a').first();
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test('theme toggle is accessible on mobile menu', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });
});
