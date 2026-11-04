import { test, expect, Page } from '@playwright/test';

/**
 * js/flight.js: the companions over the homepage hero. The design guard reads
 * the module as text; these are the three rules only a browser can see.
 */

// The host and both hinges: a landed companion holds its place but its wings
// still breathe, so the hinges are what prove a frame ran.
const transforms = (page: Page) =>
  page.locator('.flier').evaluateAll((fliers) => fliers.map((f) =>
    [f, f.querySelector('.mark-hinge--left'), f.querySelector('.mark-hinge--right')]
      .map((el) => (el as HTMLElement).style.transform).join(' | ')));

test.describe('the flight companions', () => {
  test('two or three companions fly, inert and hidden from assistive tech', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.flier')).toHaveCount(testInfo.project.name === 'mobile' ? 2 : 3, { timeout: 8000 });
    const layer = page.locator('.hero > .flight');
    await expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    // Every companion is the cloned, hinged mark, never a redrawn one.
    await expect(page.locator('.flier.mark-live')).toHaveCount(await page.locator('.flier').count());
    // The first companion launches at once; the others wait their turn.
    const before = await transforms(page);
    await page.waitForTimeout(600);
    const after = await transforms(page);
    expect(after[0]).not.toBe(before[0]);
  });

  test('reduced motion builds no companion at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3500);
    await expect(page.locator('.flight')).toHaveCount(0);
  });

  test('the loop stops while the hero is off screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.flier').first()).toHaveClass(/mark-live/, { timeout: 8000 });
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const before = await transforms(page);
    await page.waitForTimeout(800);
    expect(await transforms(page)).toEqual(before);
  });
});
