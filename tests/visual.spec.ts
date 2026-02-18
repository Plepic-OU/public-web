import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Captures screenshots and compares against baselines.
 * Detects unintended visual changes.
 *
 * Run: npm run test:visual
 * Update baselines: npm run test:visual:update
 */

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'agent', path: '/agent/' },
  { name: 'training', path: '/training/' },
];

for (const page of pages) {
  test.describe(`${page.name} visual`, () => {
    test(`${page.name} above-the-fold matches baseline`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForFunction(() => document.fonts.ready);
      await browserPage.waitForLoadState('networkidle');

      // Wait a bit for any animations to settle
      await browserPage.waitForTimeout(500);

      await expect(browserPage).toHaveScreenshot(`${page.name}-viewport.png`);
    });

    test(`${page.name} full page matches baseline`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForFunction(() => document.fonts.ready);
      await browserPage.waitForLoadState('networkidle');
      await browserPage.waitForTimeout(500);

      await expect(browserPage).toHaveScreenshot(`${page.name}-full.png`, {
        fullPage: true,
      });
    });
  });
}

test.describe('component visual', () => {
  test('header matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.fonts.ready);

    const header = page.locator('header');
    await expect(header).toHaveScreenshot('header.png');
  });

  test('footer matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.fonts.ready);

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer.png');
  });
});
