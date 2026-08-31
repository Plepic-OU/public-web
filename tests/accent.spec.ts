import { test, expect } from '@playwright/test';
import { PRODUCTION_PAGES } from './pages';

/**
 * The One Accent Rule, enforced against the RENDERED page.
 *
 * Canon, design-system.html section 3: "Exactly one accent element per
 * viewport: a CTA button OR an urgency badge OR an accent dot; the mobile
 * sticky CTA yields."
 *
 * Accent is the one warm colour in a green-on-cream palette, so its whole job
 * is that it appears once. Two accent elements in one screen and neither is
 * the thing to click. Source-reading cannot answer this: whether two CTAs
 * share a viewport depends on where they land after layout, at that width,
 * which only the browser knows.
 *
 * WHAT "PER VIEWPORT" MEANS HERE: not just the fold. This scrolls the page in
 * half-viewport steps and counts what is on screen at each stop, because a
 * second accent element three screens down is still two accent elements in one
 * viewport when the reader gets there.
 *
 * THE STICKY CTA IS EXCLUDED, AND THAT IS AN OPEN QUESTION. Canon says "the
 * mobile sticky CTA yields", which reads two ways: the sticky CTA hides when a
 * real CTA is on screen, or it simply is not counted as the page's accent
 * element. Measured 2026-08-31 on mobile (375px): homepage, training and
 * scopeful all render the sticky CTA alongside an in-content CTA near the foot
 * of the page, so under the first reading those three pages are in violation
 * today. Excluding it, every page holds at exactly one. This test enforces the
 * unambiguous half so the content rule is guarded now; if "yields" means
 * "hides", drop the .sticky-cta exclusion below and the test tightens.
 */

// --accent, #e26c45.
const ACCENT = 'rgb(226, 108, 69)';

for (const p of PRODUCTION_PAGES) {
  test(`at most one accent element per viewport on ${p.name} (The One Accent Rule) @accent`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');

    // Reveal-on-scroll sections would otherwise hide accent elements from the
    // count simply by not having been scrolled to yet.
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    });

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.floor(page.viewportSize()!.height / 2);
    let worst: { count: number; y: number; elements: string[] } = { count: 0, y: 0, elements: [] };

    for (let y = 0; y <= height; y += step) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      // Let a scroll-driven class change settle before reading the frame.
      await page.waitForTimeout(120);

      const onScreen = await page.evaluate((accent) => {
        const found: string[] = [];
        document.querySelectorAll('*').forEach((el) => {
          const cs = getComputedStyle(el);
          // Accent as a filled surface. Accent text and hairline borders are
          // not the "accent element" the rule rations; the CTA, badge and dot
          // it names are all filled.
          if (cs.backgroundColor !== accent) return;
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
          // See the header note: the sticky CTA yields, so it is not counted.
          if (el.closest('.sticky-cta')) return;
          const r = el.getBoundingClientRect();
          if (r.width * r.height < 16) return; // hairlines and collapsed nodes
          if (r.bottom <= 0 || r.top >= window.innerHeight) return;
          const cls = el.className?.toString?.().trim().split(/\s+/).slice(0, 3).join('.') ?? '';
          found.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} (${Math.round(r.width)}x${Math.round(r.height)})`);
        });
        return found;
      }, ACCENT);

      if (onScreen.length > worst.count) worst = { count: onScreen.length, y, elements: onScreen };
    }

    expect(
      worst.count,
      `${p.path} shows ${worst.count} accent elements at once, scrolled to y=${worst.y}: ${worst.elements.join(', ')}. Accent is the single warm colour in the palette and it points at the one thing to click; a second one makes both ordinary. Demote one to a secondary button, or change the rule on design-system.html first: The One Accent Rule, section 3.`
    ).toBeLessThanOrEqual(1);
  });
}
