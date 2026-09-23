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
 *
 * The hover target is .tt-art, the Card's photo plate: the living tabletop
 * rebuild replaced the old .team-photo box with it. Hover belongs to .tt-seat,
 * the untransformed wrapper, so the tilt cannot move the card out from under
 * the pointer and the hit test stays stable.
 */

const INSTRUCTORS = ['joosep', 'kaido', 'vootele', 'jevgeni'];

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
      await page.hover(`.team-card[data-instructor="${who}"] .tt-art`);
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

    await page.hover('.team-card[data-instructor="kaido"] .tt-art');
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('1');

    await page.hover('.team-header h2');
    await expect.poll(() => opacityOf(page, 'kaido'), { timeout: 2000 }).toBe('0');
  });

  test('the panel is fully visible and never steals the pointer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();
    await page.hover('.team-card[data-instructor="kaido"] .tt-art');
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

  test('a second-row card raises its slide inside the section, and it paints', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    // With five cards the grid has two rows, so the panel no longer hangs
    // past the section: a first-row slide covers the top of the grid, a
    // second-row slide hangs up from its bottom edge. This guards the second
    // case, whose panel box has no height and once dropped the slide below
    // the grid entirely. #team still carries .reveal, which makes it a
    // stacking context, so the comparison also proves the slide is not
    // painted over by anything.
    //
    // Mouse moves by coordinate, never page.hover(): that helper scrolls its
    // target into view, which would move the strip between the screenshots.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const grid = document.querySelector('.team-grid').getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + grid.bottom - window.innerHeight + 40, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const card = await page
      .locator('.team-card[data-instructor="jevgeni"] .tt-art')
      .boundingBox();
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await expect.poll(() => opacityOf(page, 'jevgeni'), { timeout: 2000 }).toBe('1');

    const geometry = await page.evaluate(() => {
      const s = document
        .querySelector('.instructor-slide[data-instructor="jevgeni"]')
        .getBoundingClientRect();
      const grid = document.querySelector('.team-grid').getBoundingClientRect();
      const team = document.querySelector('#team').getBoundingClientRect();
      const top = Math.max(0, Math.round(s.top)) + 2;
      return {
        slideBottom: s.bottom, gridBottom: grid.bottom, teamTop: team.top,
        slideTop: s.top,
        band: { x: Math.round(s.left), y: top, width: Math.round(s.width), height: Math.round(Math.min(s.bottom, window.innerHeight)) - 2 - top },
      };
    });
    expect(Math.round(geometry.slideBottom)).toBe(Math.round(geometry.gridBottom));
    expect(geometry.slideTop).toBeGreaterThan(geometry.teamTop);
    expect(geometry.band.height).toBeGreaterThan(20);

    const shown = await page.screenshot({ clip: geometry.band });
    await page.mouse.move(4, 4);
    await expect.poll(() => opacityOf(page, 'jevgeni'), { timeout: 2000 }).toBe('0');
    const hidden = await page.screenshot({ clip: geometry.band });
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
