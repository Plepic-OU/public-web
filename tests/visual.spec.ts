import { test, expect } from '@playwright/test';

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'claude-code', path: '/claude-code/' },
  { name: 'training', path: '/training/' },
  { name: 'scopeful', path: '/scopeful/' },
];

for (const page of pages) {
  test(`visual regression - ${page.name}`, async ({ page: browserPage }, testInfo) => {
    await browserPage.goto(page.path);

    // Wait for page and fonts to load
    await browserPage.waitForLoadState('networkidle');
    await browserPage.waitForLoadState('domcontentloaded');

    // Wait for fonts to fully render (Google Fonts may have slight delays)
    await browserPage.waitForTimeout(1000);

    // The homepage hero is a live WebGL animation (non-deterministic per
    // frame). Mask its stage so the snapshot guards the rest of the page
    // without flaking on the moving butterfly; the metamorphosis suite
    // covers the hero's correctness (byte-exact rest pose, fallbacks).
    const mask = page.name === 'homepage'
      ? [browserPage.locator('.hero-visual')]
      : [];

    const screenshot = await browserPage.screenshot({ fullPage: true, mask });

    await expect(screenshot).toMatchSnapshot(`${page.name}-${testInfo.project.name}.png`, {
      maxDiffPixelRatio: 0.05,
    });
  });
}
