import { test, expect } from '@playwright/test';
import { PRODUCTION_PAGES } from './pages';

/**
 * The Reduced-Motion Rule, enforced against the RENDERED page.
 *
 * Canon, design-system.html section 12: "Every animation has a
 * prefers-reduced-motion branch that lands on the static end state instantly.
 * Shipping without one is a defect, not a polish item."
 *
 * metamorphosis.spec.ts already asserts the WebGL hero honours the preference,
 * but it needs a GPU and CI never runs it, so nothing checked the CSS layer at
 * all. css/styles.css declares 17 @keyframes against 10 reduced-motion blocks;
 * whether every animated element is covered is not a question source-reading
 * can answer, because a keyframe and the branch that disables it live in
 * different rules and a new animation is one CSS block away from having none.
 *
 * So this renders each page with the preference set and asks the browser which
 * animations are still running. That is the only reading that cannot be
 * fooled by a branch that exists but does not match.
 */

// Canonical reduced-motion CSS sets a token duration (0.01ms) rather than
// removing the animation, so a running animation is only a defect above a
// threshold a human could perceive as motion.
const PERCEPTIBLE_MS = 100;

for (const p of PRODUCTION_PAGES) {
  test(`no perceptible animation survives reduced motion on ${p.name} (The Reduced-Motion Rule) @motion`, async ({ page }) => {
    // Set the preference with emulateMedia, NOT test.use({ reducedMotion }).
    // playwright.config.ts sets `use` per project, and a project-level `use`
    // beats a file-level test.use() here: the option is silently dropped, the
    // page renders with full motion, and the test then reports every ordinary
    // animation as a violation. Verified 2026-08-31 —
    // matchMedia('(prefers-reduced-motion: reduce)') read false under
    // test.use() and true under emulateMedia. Call it before goto so
    // animations that run on load are covered too.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');

    // Reveal-on-scroll sections start hidden. Unhide them so a transition that
    // only fires on reveal cannot escape by never having been triggered.
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    });
    await page.waitForTimeout(200);

    const offenders = await page.evaluate((thresholdMs: number) => {
      return document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => {
          const timing = a.effect?.getTiming();
          const duration = typeof timing?.duration === 'number' ? timing.duration : 0;
          const iterations = timing?.iterations ?? 1;
          const target = (a.effect as KeyframeEffect | undefined)?.target;
          const cls = target?.className?.toString().trim().split(/\s+/).slice(0, 3).join('.') ?? '';
          const name = (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || 'animation';
          return { duration, iterations, name, node: `${target?.tagName?.toLowerCase() ?? '?'}${cls ? '.' + cls : ''}` };
        })
        .filter((a) => a.duration > thresholdMs)
        .map((a) => `${a.node}: ${a.name} (${Math.round(a.duration)}ms x${a.iterations})`);
    }, PERCEPTIBLE_MS);

    expect(
      offenders,
      `${p.path} keeps animating under prefers-reduced-motion. Every animation needs a branch that lands on the static end state instantly. Note the animation may be declared in the shared stylesheet rather than this page's markup. Canon: The Reduced-Motion Rule, design-system.html section 12.`
    ).toEqual([]);
  });
}
