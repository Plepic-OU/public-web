import { test, expect } from '@playwright/test';

/**
 * <plepic-mark>: the two things about the breathing mark that only a browser
 * can see, and that shipped broken once each.
 *
 * The design guard next door reads the files as text, which is enough for the
 * geometry and the tokens and blind to both of these.
 */

test.describe('the breathing mark', () => {
  test('the hover wingbeat reaches --wingbeat-open, whatever the breath was doing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the wingbeat is a fine-pointer hover');

    // The beat and the breath both animate transform on the same layer, and
    // the later one in the animation list wins. Named beat-first, the beat was
    // masked for its entire run: the wing crept to --breath-open (34deg) and
    // never reached --wingbeat-open (62deg), on five of six arrival phases.
    // Nothing failed, because the wing still moved and still looked like a
    // butterfly. The arrival phase is swept because that is what decided
    // whether the old bug showed: a beat that only plays when the pointer
    // happens to land early in the 4.6s cycle is still broken.
    // The homepage, because that is the surface that ships: every mark there
    // is a 15px set glyph on a card, and a glyph that small can never hold its
    // own hover once the card under it moves, so the card's hover is what
    // drives its beat. Testing the standalone specimen instead would pass
    // while the shipping mark never beat once.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#team').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const seat = page.locator('.tt-seat').first();
    const wing = seat.locator('.mark-live .mark-layer--left');
    await expect(wing).toHaveCount(1);

    for (const phase of [200, 1600, 3200]) {
      await page.mouse.move(5, 5);
      await page.waitForTimeout(phase);

      const box = (await seat.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      let peak = 0;
      for (let i = 0; i < 14; i++) {
        await page.waitForTimeout(70);
        peak = Math.max(peak, await wing.evaluate((el) => {
          const m = getComputedStyle(el).transform.match(/matrix3d\(([^)]+)\)/);
          if (!m) return 0;
          const v = m[1].split(',').map(Number);
          return Math.abs((Math.atan2(v[2], v[0]) * 180) / Math.PI);
        }));
      }
      // 62deg is --wingbeat-open; 34deg is --breath-open. Landing between the
      // two is the signature of the masking bug, not of a smaller beat.
      expect(
        Math.round(peak),
        `arriving ${phase}ms into the breath, the wing opened to ${Math.round(peak)}deg. The hover wingbeat must reach --wingbeat-open (62deg); stopping near --breath-open (34deg) means the breath is winning the transform cascade again, so put the beat LAST in the animation list.`,
      ).toBeGreaterThan(55);
    }
  });

  test('the beat composes with the breath instead of replacing it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the wingbeat is a fine-pointer hover');

    // The sibling test above fixed the beat being MASKED by putting it last in
    // the animation list. That left the opposite defect: last also means the
    // beat takes `transform` outright, so a hover arriving mid-breath snapped
    // the wing from wherever it was to the beat's own zero. Measured on
    // 2026-09-12 the worst single frame moved 21.26deg, which is a visible
    // step, not motion. The fix is structural: span.mark-hinge carries the
    // breath, the svg layer inside it carries the beat, and nested transforms
    // compose. This asserts the composition two ways at once.
    await page.goto('/');
    await page.locator('.tt-seat').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      const angle = (el: Element | null) => {
        if (!el) return 0;
        const matrix = getComputedStyle(el).transform.match(/matrix3d\(([^)]+)\)/);
        if (!matrix) return 0;
        const m11 = Number(matrix[1].split(',')[0]);
        return (Math.acos(Math.max(-1, Math.min(1, m11))) * 180) / Math.PI;
      };
      const hinge = document.querySelector('.tt-seat .mark-live .mark-hinge--left');
      const layer = document.querySelector('.tt-seat .mark-live .mark-layer--left');
      (window as unknown as { __wing: number[] }).__wing = [];
      const tick = () => {
        const wing = (window as unknown as { __wing: number[] }).__wing;
        wing.push(angle(hinge) + angle(layer));
        if (wing.length < 160) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.waitForTimeout(350);
    await page.locator('.tt-seat').first().hover();
    await page.waitForTimeout(2200);

    const samples = await page.evaluate(
      () => (window as unknown as { __wing: number[] }).__wing,
    );
    const steps = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
    const worst = Math.max(...steps);
    const peak = Math.max(...samples);

    // A beat that replaced the breath peaked at exactly --wingbeat-open. One
    // that composes carries the breath's own angle on top of it.
    expect(
      Math.round(peak),
      `the wing peaked at ${Math.round(peak)}deg. Composed, the beat (62deg) rides on the breath, so the peak sits above --wingbeat-open alone; landing on 62 means the beat is replacing the breath again rather than adding to it.`,
    ).toBeGreaterThan(64);

    // 6.1deg is the beat's own fastest frame; 21.3deg was the snap.
    expect(
      Number(worst.toFixed(2)),
      `the wing moved ${worst.toFixed(2)}deg in a single frame. Anything past ~12deg is the hover-in snap returning: the breath and the beat are sharing one box again, so put the breath back on .mark-hinge and leave the beat on .mark-layer.`,
    ).toBeLessThan(12);
  });

  test('reduced motion leaves the authored SVG untouched', async ({ browser }) => {
    // The mark is progressive enhancement, so under reduced motion the element
    // must be the flat locked SVG and not a still copy of the layered one: no
    // layers built, nothing hidden, no perspective on the host.
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const state = await page.evaluate(() => {
      const el = document.querySelector('plepic-mark')!;
      return {
        live: el.classList.contains('mark-live'),
        layers: el.querySelectorAll('.mark-layer').length,
        polygons: el.querySelectorAll('polygon').length,
        visibility: getComputedStyle(el.querySelector('svg')!).visibility,
      };
    });

    expect(state.live, 'the host was enhanced under reduced motion').toBe(false);
    expect(state.layers, 'layers were built under reduced motion').toBe(0);
    expect(state.polygons, 'the inline mark must still be the whole component, all 22 facets of it').toBe(22);
    expect(state.visibility, 'the authored SVG was hidden with nothing stacked over it').toBe('visible');

    await context.close();
  });
});
