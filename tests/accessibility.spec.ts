import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests (@a11y)
 *
 * Uses axe-core to detect WCAG violations.
 * These tests provide objective pass/fail for Ralph Loop.
 *
 * Run: npm run test:a11y
 */

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'agent', path: '/agent/' },
  { name: 'training', path: '/training/' },
];

for (const page of pages) {
  test.describe(`${page.name} accessibility @a11y`, () => {
    test(`${page.name} has no critical accessibility violations`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter to critical and serious violations only
      const critical = results.violations.filter(v =>
        v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        const summary = critical.map(v =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
        ).join('\n');
        console.log(`\nAccessibility violations on ${page.name}:\n${summary}\n`);
      }

      expect(critical, `Found ${critical.length} critical/serious a11y violations`).toHaveLength(0);
    });

    test(`${page.name} has no color contrast issues @a11y`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: browserPage })
        .withRules(['color-contrast', 'color-contrast-enhanced'])
        .analyze();

      if (results.violations.length > 0) {
        const summary = results.violations.map(v =>
          `${v.id}: ${v.nodes.length} elements with contrast issues`
        ).join('\n');
        console.log(`\nContrast issues on ${page.name}:\n${summary}\n`);
      }

      expect(results.violations).toHaveLength(0);
    });

    test(`${page.name} images have alt text @a11y`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      const imagesWithoutAlt = await browserPage.locator('img:not([alt])').count();
      const imagesWithEmptyAlt = await browserPage.locator('img[alt=""]').count();
      const decorativeImages = await browserPage.locator('img[role="presentation"], img[aria-hidden="true"]').count();

      // Empty alt is OK for decorative images
      const problematic = imagesWithoutAlt;

      expect(problematic, `Found ${problematic} images without alt attribute`).toBe(0);
    });

    test(`${page.name} interactive elements are keyboard accessible @a11y`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      // Check that all clickable elements are focusable
      const clickableNotFocusable = await browserPage.evaluate(() => {
        const clickable = document.querySelectorAll('a, button, [onclick], [role="button"]');
        let count = 0;
        clickable.forEach(el => {
          const tabIndex = el.getAttribute('tabindex');
          if (tabIndex === '-1') count++;
        });
        return count;
      });

      expect(clickableNotFocusable, 'Interactive elements with tabindex="-1"').toBe(0);
    });
  });
}
