import { test, expect } from '@playwright/test';

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'agent', path: '/agent/' },
  { name: 'training', path: '/training/' },
];

for (const page of pages) {
  test(`visual regression - ${page.name}`, async ({ page: browserPage }, testInfo) => {
    await browserPage.goto(page.path);

    // Wait for page and fonts to load
    await browserPage.waitForLoadState('networkidle');
    await browserPage.waitForLoadState('domcontentloaded');

    // Wait for fonts to fully render (Google Fonts may have slight delays)
    await browserPage.waitForTimeout(1000);

    const screenshot = await browserPage.screenshot({ fullPage: true });

    await expect(screenshot).toMatchSnapshot(`${page.name}-${testInfo.project.name}.png`, {
      maxDiffPixelRatio: 0.05,
    });
  });
}
