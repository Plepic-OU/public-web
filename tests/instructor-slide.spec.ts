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

    // Move off by coordinate, not page.hover('.team-header h2').
    //
    // hover() scrolls its target into view and returns while the page is still
    // settling, and the pointer then stays at a fixed screen position while the
    // layout slides beneath it. Traced 2026-08-31: the slide began dismissing
    // correctly (opacity 1 -> 0.25), then ~300ms later the still-moving page
    // put a team photo back under the unmoved cursor, the slide re-raised, and
    // the poll timed out on a feature that works. The suite was not in CI, so
    // this failed on main unnoticed.
    //
    // The paint test below already moves by coordinate for the same reason.
    // The page top-left corner is empty and scrolls nothing.
    await page.mouse.move(4, 4);
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
    // of the next section's heading. Geometry only: see the paint test below
    // for whether those pixels actually reach the screen.
    expect(geometry.slideBottom).toBeLessThan(geometry.nextHeadingTop);

    // A wide overlay must not widen the document.
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
  });

  test('the overhanging bottom of the panel actually paints', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    // Fitting is not showing. #team also carries .reveal, whose
    // transform: translateY(0) makes the section a stacking context and traps
    // the panel's z-index inside it; .outcome-section, later in the DOM and
    // opaque, then painted over the bottom of the panel while every geometric
    // assertion above still passed. This compares the same strip of screen
    // hovered and at rest, so anything painting over it shows up as no change.
    //
    // Everything here moves the mouse by coordinate, never page.hover(): that
    // helper scrolls its target into view, which would move the strip between
    // the two screenshots and make them differ for the wrong reason.
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Park the whole panel inside the viewport; the clip is viewport-relative.
    await page.evaluate(() => {
      const grid = document.querySelector('.team-grid').getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + grid.top - 100, behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));

    const card = await page
      .locator('.team-card[data-instructor="kaido"] .team-photo')
      .boundingBox();
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('1');

    // The strip of panel that hangs BELOW the team section, and nothing else.
    // Include even a pixel of the part inside the section and the comparison
    // passes on that pixel alone, proving nothing about the overhang.
    const band = await page.evaluate(() => {
      const s = document
        .querySelector('.instructor-slide[data-instructor="kaido"]')
        .getBoundingClientRect();
      const team = document.querySelector('#team').getBoundingClientRect();
      const y = Math.round(team.bottom) + 2;
      return {
        x: Math.round(s.left),
        y,
        width: Math.round(s.width),
        height: Math.round(s.bottom) - 2 - y,
        fitsViewport: s.bottom <= window.innerHeight,
      };
    });
    expect(band.fitsViewport).toBe(true);
    // A band worth measuring: the panel must really hang past the section.
    expect(band.height).toBeGreaterThan(20);

    const shown = await page.screenshot({ clip: band });

    // Off every card, without scrolling: the page top-left corner is empty.
    await page.mouse.move(4, 4);
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('0');
    const hidden = await page.screenshot({ clip: band });

    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(scrollBefore);
    expect(shown.equals(hidden)).toBe(false);
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
