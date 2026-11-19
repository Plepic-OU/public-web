import { test, expect, type Page } from '@playwright/test';

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'training', path: '/training/' },
  { name: 'scopeful', path: '/scopeful/' },
];

// Scroll the page top to bottom the way a visitor would, then back to the
// top. Almost every section carries .reveal, which hides it until the page's
// IntersectionObserver sees it, and the homepage portraits are
// loading="lazy". A full-page capture taken without scrolling never triggers
// either, so it shot every section below the fold as an empty band and the
// snapshot guarded section heights only. Scrolling runs the page's own reveal
// and lazy-load code, so a broken observer fails here too, which forcing the
// .visible class would hide. Steps are half a viewport, well inside the
// observer's 15% threshold, with a pause for its callback and the image
// requests to start.
const scrollThrough = async (page: Page) => {
  await page.evaluate(async () => {
    const pause = () => new Promise((resolve) => setTimeout(resolve, 120));
    const step = Math.round(window.innerHeight / 2);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await pause();
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await pause();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  // Every section must have been revealed by the scroll.
  await expect(page.locator('.reveal:not(.visible)')).toHaveCount(0);

  // Every image that has a source must have finished loading.
  await expect
    .poll(() => page.evaluate(() => [...document.images]
      .filter((img) => img.currentSrc && !img.complete).length))
    .toBe(0);

  // Let the reveal fades and slide-ups settle. Only CSS transitions are
  // awaited: they are finite, while the page also runs infinite animations
  // (the breathing mark) whose finished promise never settles.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a instanceof CSSTransition)
    .map((a) => a.finished.catch(() => {}))));
};

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

    // A full-page capture never brings content-visibility: auto boxes near the viewport, so they would shoot as blank placeholders.
    await browserPage.addStyleTag({ content: '* { content-visibility: visible !important; }' });

    await scrollThrough(browserPage);

    const screenshot = await browserPage.screenshot({ fullPage: true, mask });

    // An absolute pixel budget, not a ratio: these captures are 4,500 to
    // 11,300px tall, so the old 5% ratio let a rewritten paragraph through.
    // Measured on the scrolled captures: run-to-run noise peaks at 16 pixels
    // (29 of 30 runs are pixel-identical), and a one-word copy change
    // ("Every" to "Each" on /scopeful/) moves 1,477 pixels on desktop and 738
    // on mobile. 200 sits well clear of both.
    await expect(screenshot).toMatchSnapshot(`${page.name}-${testInfo.project.name}.png`, {
      maxDiffPixels: 200,
    });
  });
}
