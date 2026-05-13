import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for loader to complete
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });
  });

  test('all nav links exist', async ({ page }) => {
    const navLinks = page.locator('[data-nav-link]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('clicking nav link scrolls to correct section', async ({ page }) => {
    await page.click('a[href="#about"]');
    await page.waitForTimeout(1200); // smooth scroll

    const aboutSection = page.locator('#about');
    const boundingBox = await aboutSection.boundingBox();
    expect(boundingBox.y).toBeCloseTo(72, -1);
  });

  test('smooth scroll behavior works', async ({ page }) => {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    await page.click('a[href="#clubs"]');
    await page.waitForTimeout(1500);

    const clubsSection = page.locator('#clubs');
    const clubsBox = await clubsSection.boundingBox();
    expect(clubsBox.y).toBeCloseTo(72, -1);
  });

  test('mobile menu toggles open and closed', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });

    // Initially menu should be hidden
    const links = page.locator('.navbar-links');
    await expect(links).not.toHaveClass(/navbar-links--open/);

    // Open menu
    await page.click('.navbar-toggle');
    await expect(links).toHaveClass(/navbar-links--open/);

    // Close by clicking toggle
    await page.click('.navbar-toggle');
    await expect(links).not.toHaveClass(/navbar-links--open/);
  });

  test('mobile menu closes when clicking a link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('loader-overlay'), null, {
      timeout: 12000,
    });

    await page.click('.navbar-toggle');
    const links = page.locator('.navbar-links');
    await expect(links).toHaveClass(/navbar-links--open/);

    // Click a nav link
    await page.click('.navbar-links a:first-child');
    await expect(links).not.toHaveClass(/navbar-links--open/);
  });

  test('no navigation links are broken', async ({ page }) => {
    const links = page.locator('a[href]');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && !href.startsWith('#')) {
        // Should be valid URL or root-relative path
        expect(href.startsWith('/') || href.startsWith('http')).toBeTruthy();
      }
    }
  });
});
