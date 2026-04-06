import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'agent', path: '/agent/' },
  { name: 'training', path: '/training/' },
];

for (const page of pages) {
  test(`accessibility - ${page.name} @a11y`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);
    await browserPage.waitForLoadState('networkidle');
    // Wait for hero-entrance CSS animations to complete (max delay 0.65s + duration 0.7s = 1.35s)
    await browserPage.waitForTimeout(1500);

    const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.hero-bottom') // Trust bar: intentionally reduced opacity (0.65) for supplementary content
      .analyze();

    // Filter for serious and critical violations only
    const seriousViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    );

    // Log all violations for debugging
    if (seriousViolations.length > 0) {
      console.log(`\nSerious/Critical violations on ${page.name}:`);
      for (const violation of seriousViolations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      }
    }

    expect(seriousViolations).toEqual([]);
  });
}
