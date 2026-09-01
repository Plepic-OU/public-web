import { test, expect } from '@playwright/test';
import { PRODUCTION_PAGES } from './pages';

/**
 * The Dark Placement Rule, enforced against the RENDERED page.
 *
 * design-guard.spec.ts already greps the HTML for `on-dark`, `panel-dark` and
 * inline dark backgrounds. That guard shipped on 2026-08-27 and immediately
 * missed the thing it existed to catch: the site footer was `--dark-surface`
 * on every page, set by a `.footer` rule in the shared stylesheet, so no HTML
 * file contained a string to grep for. Reading the source cannot answer "is
 * this page dark"; only the browser can.
 *
 * So this test renders each page and reads computed backgrounds. It checks the
 * two dark NEUTRALS specifically rather than "anything with low luminance",
 * because the brand greens are legitimately dark and are not the dark theme:
 * --green-dark (#0d5822) sits below any sensible luminance threshold and is a
 * correct background for a cursor or a hover state.
 */

// The dark theme's two surfaces, from css/styles.css :root.
const DARK_NEUTRALS = new Set([
  'rgb(28, 28, 26)', // --dark        #1c1c1a
  'rgb(38, 38, 36)', // --dark-surface #262624
]);

// design-system.html is deliberately absent from the shared list: it is the
// specimen page that documents the dark device, and documenting a device is
// not using it.
for (const p of PRODUCTION_PAGES) {
  test(`no dark surface renders on ${p.name} (The Dark Placement Rule) @light-mode`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');

    // Reveal-on-scroll sections start hidden; unhide them so nothing escapes
    // the scan by never having been painted.
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    });

    const offenders = await page.evaluate((darkList: string[]) => {
      const dark = new Set(darkList);
      const found: string[] = [];
      document.querySelectorAll('*').forEach((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        if (!dark.has(bg)) return;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < 100) return; // ignore hairlines and hidden nodes
        const cls = el.className.toString().trim().split(/\s+/).slice(0, 3).join('.');
        found.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} (${bg}, ${Math.round(r.width)}x${Math.round(r.height)})`);
      });
      return found;
    }, [...DARK_NEUTRALS]);

    expect(
      offenders,
      `${p.path} renders a dark surface. The public site is light, on every page, with no exemptions. Note the offending colour may come from the shared stylesheet rather than this page's markup, which is how the footer slipped past the source-level guard in design-guard.spec.ts. Change the rule on design-system.html first if you mean to: The Dark Placement Rule, section 3 (Neutrals).`
    ).toEqual([]);
  });
}
