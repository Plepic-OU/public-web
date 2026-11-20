import { test, expect } from '@playwright/test';

// The homepage hero's code line under the butterfly sits on the same baseline
// as the qualifier line under the CTAs. Copy edits in the left column have
// moved it before without anyone noticing; this measures it.

test.describe('hero baseline lock @hero-baseline', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the butterfly and code line render above 900px only');
  });

  for (const width of [1024, 1280, 1920]) {
    test(`code line baseline matches the qualifier baseline at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);

      const delta = await page.evaluate(() => {
        const baseline = (el: Element) => {
          const probe = document.createElement('span');
          probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
          el.appendChild(probe);
          const y = probe.getBoundingClientRect().top;
          probe.remove();
          return y;
        };
        return baseline(document.querySelector('#metaCode .meta-code-line:last-child .t')!)
          - baseline(document.querySelector('.hero-qualifier')!);
      });

      expect(Math.abs(delta), `code line baseline is ${delta.toFixed(1)}px off the qualifier baseline; retune .hero-visual .hero-code margin-bottom in index.html`).toBeLessThanOrEqual(1);
    });
  }
});
