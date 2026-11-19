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
// .visible class would hide. Steps are half a viewport, so every section
// spends several steps in view (the observer fires once 15% of a section is
// visible), with a pause for its callback and the image requests to start.
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
    // Two frames: the first runs the page's scroll handler and observers,
    // which clear the header's .scrolled state and the sticky CTA (70px of
    // body padding on mobile); the second lays the result out.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  // Every section must have been revealed by the scroll.
  await expect(page.locator('.reveal:not(.visible)')).toHaveCount(0);

  // Every image that has a source must have finished loading.
  await expect
    .poll(() => page.evaluate(() => [...document.images]
      .filter((img) => img.currentSrc && !img.complete).length))
    .toBe(0);
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

    // animations: 'disabled' finishes the reveal transitions and resets the
    // infinite animations (breathing mark, pulses) to their first frame, so
    // the capture does not depend on when it is taken.
    const screenshot = await browserPage.screenshot({ fullPage: true, mask, animations: 'disabled' });

    // No pixel budget. Measured: repeated captures are pixel-identical, while
    // a one-digit change moves 13 to 18 pixels and a one-word change that
    // reflows its line ("Every" to "Each" on /scopeful/) moves 1,477 on
    // desktop. The per-pixel threshold is 0.1 because the default 0.2 let a
    // body-text colour change (#1c1c1a to #3a3a3a) through with 0 pixels
    // counted. A macOS or Chromium update that changes glyph rendering fails
    // all six: regenerate with npm run test:visual:update and check the new
    // baselines by eye.
    await expect(screenshot).toMatchSnapshot(`${page.name}-${testInfo.project.name}.png`, {
      threshold: 0.1,
    });
  });
}
