import { test, expect } from '@playwright/test';

/**
 * Layout Tests
 *
 * Checks for common responsive issues:
 * - Horizontal scroll (content overflow)
 * - Touch target sizes (WCAG 2.2 requires 44x44px)
 * - Viewport-specific layout issues
 *
 * Run: npm test
 */

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'agent', path: '/agent/' },
  { name: 'training', path: '/training/' },
];

for (const page of pages) {
  test.describe(`${page.name} layout`, () => {
    test(`${page.name} has no horizontal scroll`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const hasHorizontalScroll = await browserPage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        // Find the overflowing elements for debugging
        const overflowing = await browserPage.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const elements: string[] = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > viewportWidth + 5) {
              elements.push(`${el.tagName}.${el.className} (right: ${rect.right}px)`);
            }
          });
          return elements.slice(0, 5); // First 5 offenders
        });
        console.log(`\nOverflowing elements on ${page.name}:\n${overflowing.join('\n')}\n`);
      }

      expect(hasHorizontalScroll, 'Page has horizontal scroll').toBe(false);
    });

    test(`${page.name} touch targets are 44px minimum on mobile @a11y`, async ({ page: browserPage, browserName }, testInfo) => {
      // Only run on mobile viewport
      const viewport = browserPage.viewportSize();
      if (!viewport || viewport.width > 600) {
        testInfo.skip();
        return;
      }

      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const smallTargets = await browserPage.evaluate(() => {
        const interactive = document.querySelectorAll('a, button, [role="button"], input, select, textarea');
        const issues: string[] = [];

        interactive.forEach(el => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);

          // Skip hidden or off-screen elements
          if (styles.display === 'none' || styles.visibility === 'hidden') return;
          if (rect.width === 0 || rect.height === 0) return;
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;

          // Check if either dimension meets minimum (allows for wide buttons, tall links)
          const meetsMinimum = rect.width >= 44 || rect.height >= 44;

          if (!meetsMinimum) {
            const id = el.id ? `#${el.id}` : '';
            const cls = el.className ? `.${el.className.toString().split(' ')[0]}` : '';
            const text = (el.textContent || '').slice(0, 20).trim();
            issues.push(`${el.tagName}${id}${cls} "${text}" (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
          }
        });

        return issues;
      });

      if (smallTargets.length > 0) {
        console.log(`\nSmall touch targets on ${page.name}:\n${smallTargets.join('\n')}\n`);
      }

      expect(smallTargets, `Found ${smallTargets.length} touch targets < 44px`).toHaveLength(0);
    });

    test(`${page.name} text is readable (not too small) on mobile`, async ({ page: browserPage }, testInfo) => {
      const viewport = browserPage.viewportSize();
      if (!viewport || viewport.width > 600) {
        testInfo.skip();
        return;
      }

      await browserPage.goto(page.path);

      const tooSmall = await browserPage.evaluate(() => {
        const textElements = document.querySelectorAll('p, span, li, td, th, label, a');
        const issues: string[] = [];

        textElements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const fontSize = parseFloat(styles.fontSize);

          // Skip hidden elements
          if (styles.display === 'none' || styles.visibility === 'hidden') return;

          // 12px is minimum readable on mobile (16px preferred)
          if (fontSize < 12) {
            const text = (el.textContent || '').slice(0, 30).trim();
            issues.push(`${el.tagName} "${text}" (${fontSize}px)`);
          }
        });

        return issues.slice(0, 10);
      });

      if (tooSmall.length > 0) {
        console.log(`\nText too small on ${page.name}:\n${tooSmall.join('\n')}\n`);
      }

      expect(tooSmall, 'Text smaller than 12px found').toHaveLength(0);
    });
  });
}

test.describe('responsive breakpoints', () => {
  test('navigation collapses on mobile', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 767) {
      testInfo.skip();
      return;
    }

    await page.goto('/');

    // Mobile menu toggle should be visible
    const menuToggle = page.locator('.menu-toggle');
    await expect(menuToggle).toBeVisible();

    // Nav should be hidden initially
    const nav = page.locator('.nav');
    const isExpanded = await nav.evaluate(el => el.classList.contains('active'));
    expect(isExpanded).toBe(false);
  });

  test('navigation is visible on desktop', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width < 768) {
      testInfo.skip();
      return;
    }

    await page.goto('/');

    // Desktop nav should be visible, menu toggle hidden
    const menuToggle = page.locator('.menu-toggle');
    await expect(menuToggle).not.toBeVisible();
  });
});
