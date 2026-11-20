import { test, expect } from '@playwright/test';

/**
 * The instructor CV: one uniform HTML component per instructor.
 *
 * On a fine pointer at 1024px and up, hovering or focusing a team card shows
 * that instructor's CV over the page. On touch and narrow viewports the card's
 * button opens the same CV in a native dialog. The hover path is pure CSS
 * (:has() plus a media query), so nothing else fails when it breaks. These are
 * the guards that catch it: the right CV for the right card, dismissal on
 * mouse-away, keyboard focus, a CV that always fits the viewport, and the
 * dialog on touch.
 *
 * The hover target is .cv-open, the card-sized button. Hover belongs to
 * .tt-seat, the untransformed wrapper, so the tilt cannot move the card out
 * from under the pointer and the hit test stays stable.
 */

const INSTRUCTORS = ['joosep', 'kaido', 'vootele', 'jevgeni', 'aivo', 'ivo', 'andres', 'neeme'];

const cv = (who: string) => `.instructor-cvs .cv[data-instructor="${who}"]`;

const visibilityOf = (page, who) =>
  page.evaluate(
    (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return `${style.visibility}/${style.opacity}`;
    },
    cv(who),
  );

test.describe('instructor CV', () => {
  test('each card shows its own CV, and only its own', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    for (const who of INSTRUCTORS) {
      await page.hover(`.team-card[data-instructor="${who}"] .cv-open`);
      await expect.poll(() => visibilityOf(page, who), { timeout: 2000 }).toBe('visible/1');

      for (const other of INSTRUCTORS.filter((i) => i !== who)) {
        expect(await visibilityOf(page, other), other).toBe('hidden/0');
      }
    }
  });

  test('the CV dismisses when the pointer moves away', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    await page.hover('.team-card[data-instructor="kaido"] .cv-open');
    await expect.poll(() => visibilityOf(page, 'kaido'), { timeout: 2000 }).toBe('visible/1');

    await page.hover('.team-header h2');
    await expect.poll(() => visibilityOf(page, 'kaido'), { timeout: 2000 }).toBe('hidden/0');
  });

  test('keyboard focus on a card shows its CV', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    for (const who of INSTRUCTORS) {
      await page.focus(`.team-card[data-instructor="${who}"] .cv-open`);
      await expect.poll(() => visibilityOf(page, who), { timeout: 2000 }).toBe('visible/1');
    }
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect.poll(() => visibilityOf(page, 'neeme'), { timeout: 2000 }).toBe('hidden/0');
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    test(`every CV fits inside a ${viewport.width}x${viewport.height} viewport and never steals the pointer`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.locator('#team').scrollIntoViewIfNeeded();

      for (const who of INSTRUCTORS) {
        await page.focus(`.team-card[data-instructor="${who}"] .cv-open`);
        await expect.poll(() => visibilityOf(page, who), { timeout: 2000 }).toBe('visible/1');

        const geometry = await page.evaluate((selector) => {
          const el = document.querySelector(selector) as HTMLElement;
          const box = el.getBoundingClientRect();
          return {
            pointerEvents: getComputedStyle(el).pointerEvents,
            top: box.top, bottom: box.bottom, left: box.left, right: box.right,
            timelineBottom: el.querySelector('.cv-timeline')!.getBoundingClientRect().bottom,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
          };
        }, cv(who));

        // pointer-events: none is what makes mouse-away dismissal reliable: the
        // panel must never own :hover, or it would keep itself open.
        expect(geometry.pointerEvents, who).toBe('none');
        // The whole CV, timeline included, is inside the viewport.
        expect(geometry.top, who).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom, who).toBeLessThanOrEqual(geometry.innerHeight);
        expect(geometry.timelineBottom, who).toBeLessThanOrEqual(geometry.bottom);
        expect(geometry.left, who).toBeGreaterThanOrEqual(0);
        expect(geometry.right, who).toBeLessThanOrEqual(geometry.innerWidth);
        // A wide overlay must not widen the document.
        expect(geometry.scrollWidth, who).toBeLessThanOrEqual(geometry.innerWidth);
      }
    });
  }

  test('reduced motion: the CV appears with no transition', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'hover preview is desktop only');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const transition = await page.evaluate(
      (selector) => getComputedStyle(document.querySelector(selector)!).transitionDuration,
      cv('kaido'),
    );
    expect(parseFloat(transition)).toBeLessThan(0.001);
  });

  test('touch: a tap opens the CV in a dialog, Escape closes it, and no panel is shown', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'this is the touch-device guard');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();

    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.instructor-cvs')!).display)).toBe('none');

    for (const who of INSTRUCTORS) {
      const open = page.locator(`.team-card[data-instructor="${who}"] .cv-open`);
      await open.scrollIntoViewIfNeeded();
      await open.tap();

      const dialog = page.locator('dialog.cv-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(`.cv[data-instructor="${who}"] .cv-title`)).toContainText('Instructor');
      await expect(dialog.locator('.cv-close')).toBeVisible();

      const widths = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        dialogScroll: document.querySelector('dialog')!.scrollWidth,
        dialogClient: document.querySelector('dialog')!.clientWidth,
      }));
      expect(widths.scrollWidth, who).toBeLessThanOrEqual(widths.innerWidth);
      expect(widths.dialogScroll, who).toBeLessThanOrEqual(widths.dialogClient);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }

    await page.locator('.team-card[data-instructor="kaido"] .cv-open').tap();
    await page.locator('dialog.cv-dialog .cv-close').tap();
    await expect(page.locator('dialog.cv-dialog')).toBeHidden();
  });
});
