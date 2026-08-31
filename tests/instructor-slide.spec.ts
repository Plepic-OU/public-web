import { test, expect } from '@playwright/test';

/**
 * The instructor slide preview: hovering a team card raises that
 * instructor's career slide over the grid.
 *
 * The feature is pure CSS (:has() plus a hover media query), so nothing
 * else fails when it breaks. These are the guards that catch it: the right
 * slide for the right card, dismissal on mouse-away, no clipping by the
 * card's overflow: hidden, no overhang into the next section, and no image
 * download at all on touch devices.
 */

const INSTRUCTORS = ['joosep', 'kaido', 'vootele'];

const opacityOf = (page, who) =>
  page.evaluate(
    (w) => getComputedStyle(
      document.querySelector(`.instructor-slide[data-instructor="${w}"]`),
    ).opacity,
    who,
  );

test.describe('instructor slide preview', () => {
  test('each card raises its own slide, and only its own', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    for (const who of INSTRUCTORS) {
      await page.hover(`.team-card[data-instructor="${who}"] .team-photo`);
      await expect
        .poll(() => opacityOf(page, who), { timeout: 2000 })
        .toBe('1');

      for (const other of INSTRUCTORS.filter((i) => i !== who)) {
        expect(await opacityOf(page, other)).toBe('0');
      }
    }
  });

  test('the slide dismisses when the pointer moves away', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    await page.hover('.team-card[data-instructor="kaido"] .team-photo');
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('1');

    await page.hover('.team-header h2');
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('0');
  });

  test('the panel is fully visible and never steals the pointer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();
    await page.hover('.team-card[data-instructor="kaido"] .team-photo');
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('1');

    const geometry = await page.evaluate(() => {
      const slide = document.querySelector('.instructor-slide[data-instructor="kaido"]');
      const s = slide.getBoundingClientRect();
      const grid = document.querySelector('.team-grid').getBoundingClientRect();
      const next = document.querySelector('.outcome-section');
      return {
        pointerEvents: getComputedStyle(slide.parentElement).pointerEvents,
        loaded: slide.complete && slide.naturalWidth > 0,
        slideTop: s.top, slideBottom: s.bottom, slideWidth: s.width,
        gridTop: grid.top, gridWidth: grid.width,
        nextHeadingTop: next.querySelector('h2').getBoundingClientRect().top,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    // pointer-events: none is what makes mouse-away dismissal reliable: the
    // panel must never own :hover, or it would keep itself open.
    expect(geometry.pointerEvents).toBe('none');
    expect(geometry.loaded).toBe(true);

    // The panel escapes .team-card's overflow: hidden by being its sibling.
    expect(Math.round(geometry.slideTop)).toBe(Math.round(geometry.gridTop));
    expect(geometry.slideWidth).toBeGreaterThanOrEqual(geometry.gridWidth - 1);

    // It overhangs the cards, but must land in section padding, not on top
    // of the next section's heading.
    expect(geometry.slideBottom).toBeLessThan(geometry.nextHeadingTop);

    // A wide overlay must not widen the document.
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
  });

  test('touch devices get no panel and download no slide images', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'this is the touch-device guard');

    const slideRequests: string[] = [];
    page.on('request', (req) => {
      if (/\/images\/slide-\w+\.webp/.test(req.url())) slideRequests.push(req.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const display = await page.evaluate(
      () => getComputedStyle(document.querySelector('.instructor-slides')).display,
    );
    expect(display).toBe('none');
    expect(slideRequests).toEqual([]);
  });
});
