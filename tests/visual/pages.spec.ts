import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Configure the pages array below with your site's pages.
 * Run: npm run test:visual
 * Update snapshots: npm run test:visual:update
 */

// Configure your pages here
const pages = [
  { name: 'homepage', path: '/' },
  // { name: 'about', path: '/about/' },
  // { name: 'contact', path: '/contact/' },
];

for (const page of pages) {
  test.describe(`${page.name} visual tests`, () => {
    test(`${page.name} - full page screenshot`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForFunction(() => document.fonts.ready);
      await browserPage.waitForLoadState('networkidle');

      await expect(browserPage).toHaveScreenshot(`${page.name}-full.png`, {
        fullPage: true,
      });
    });

    test(`${page.name} - above the fold`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForFunction(() => document.fonts.ready);
      await browserPage.waitForLoadState('networkidle');

      await expect(browserPage).toHaveScreenshot(`${page.name}-viewport.png`);
    });

    test(`${page.name} - no horizontal scroll`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      const hasHorizontalScroll = await browserPage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });
}

test.describe('accessibility checks', () => {
  test('touch targets on mobile', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 600) {
      test.skip();
      return;
    }

    await page.goto('/');

    const interactiveElements = await page.locator('a, button, [role="button"]').all();

    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        // WCAG 2.2 requires 44x44px minimum touch targets
        expect(box.width >= 44 || box.height >= 44).toBe(true);
      }
    }
  });
});
