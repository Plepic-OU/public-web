import { test, expect, chromium, Browser, Page } from '@playwright/test';

/**
 * Crystalline Metamorphosis hero — Definition-of-Done gates.
 *
 * Enforces the generation spec (docs/metamorphosis-hero-prompt.md):
 *  - DoD #2: the settled 3D frame is byte-exact against the locked mark
 *    (all 22 facet centroids, head, antenna tips, body, background).
 *  - DoD #5: reduced motion never runs the timeline; the poster shows.
 *  - §5: DPR clamp, offscreen pause, destroy() teardown.
 *
 * WebGL2 in CI needs SwiftShader, so this suite launches its own browser
 * (project-level launch args would leak into the visual/a11y suites).
 * SwiftShader renders at software speed; the quality ladder ignores
 * scheduling gaps >= 80ms, so tiers stay put and colors stay exact.
 */

const PAGE = '/metamorphosis-hero.html';

const PAL: Record<string, string> = {
  vivid: '#00c638',
  brand: '#137b30',
  deep: '#0d5822',
  ember: '#e26c45',
  cream: '#faf7f2',
};

// Appendix A facets: 3 corners + palette key. Centroids are sampled.
const FACETS: Array<[number, number, number, number, number, number, string]> = [
  [147, 105, 110, 68, 55, 48, 'deep'], [147, 105, 55, 48, 20, 72, 'vivid'],
  [147, 105, 20, 72, 15, 108, 'brand'], [147, 130, 147, 105, 15, 108, 'vivid'],
  [147, 130, 15, 108, 28, 150, 'deep'], [147, 165, 147, 130, 28, 150, 'vivid'],
  [147, 165, 28, 150, 50, 178, 'brand'], [147, 178, 50, 178, 82, 195, 'deep'],
  [147, 178, 82, 195, 75, 220, 'vivid'], [147, 195, 75, 220, 100, 240, 'brand'],
  [147, 195, 100, 240, 135, 232, 'deep'], [153, 105, 190, 68, 245, 48, 'deep'],
  [153, 105, 245, 48, 280, 72, 'vivid'], [153, 105, 280, 72, 285, 108, 'brand'],
  [153, 130, 153, 105, 285, 108, 'vivid'], [153, 130, 285, 108, 272, 150, 'deep'],
  [153, 165, 153, 130, 272, 150, 'vivid'], [153, 165, 272, 150, 250, 178, 'deep'],
  [153, 178, 250, 178, 218, 195, 'brand'], [153, 178, 218, 195, 225, 220, 'vivid'],
  [153, 195, 225, 220, 200, 240, 'brand'], [153, 195, 200, 240, 165, 232, 'deep'],
];

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
});
test.afterAll(async () => browser.close());

async function openHero(opts: Parameters<Browser['newPage']>[0] = {}): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    ...opts,
  });
  await page.goto(`http://localhost:8080${PAGE}`, { waitUntil: 'networkidle' });
  return page;
}

test.describe('metamorphosis hero @metamorphosis', () => {
  // self-launched browser: project settings don't apply, so run once
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'runs on desktop project only');
  });

  test('settled rest pose is byte-exact against the locked mark', async () => {
    test.setTimeout(120_000);
    const page = await openHero();
    await page.waitForFunction(
      () => {
        const h = (window as any).__metaHero;
        return h?._rig?.corners.settled && h._rig.excite === 0;
      },
      null, { timeout: 60_000 },
    );
    // sample while the light sweep is parked (rig.time % 7 in [2.5, 6.5])
    await page.waitForFunction(() => {
      const t = (window as any).__metaHero._rig.time % 7;
      return t > 2.5 && t < 6.5;
    }, null, { timeout: 20_000 });

    const shot = await page.locator('#metaStage canvas').screenshot();
    const fails = await page.evaluate(
      async ({ b64, facets, pal }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c2 = document.createElement('canvas');
        c2.width = img.width; c2.height = img.height;
        const ctx = c2.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const canvas = document.querySelector('#metaStage canvas') as HTMLCanvasElement;
        const W = canvas.clientWidth, H = canvas.clientHeight;
        const sx = img.width / W, sy = img.height / H;
        const hw = (380 * (W / H)) / 2;
        const px = (dx: number, dy: number) => [
          ((dx - 150 + hw) / (2 * hw)) * W * sx,
          ((330 - (280 - dy)) / 380) * H * sy,
        ];
        const sample = (dx: number, dy: number) => {
          const [x, y] = px(dx, dy);
          const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
          return [d[0], d[1], d[2]];
        };
        const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const out: string[] = [];
        facets.forEach((F: any[], i: number) => {
          const got = sample((F[0] + F[2] + F[4]) / 3, (F[1] + F[3] + F[5]) / 3);
          const want = hex(pal[F[6]]);
          if (Math.max(...got.map((v, k) => Math.abs(v - want[k]))) > 0)
            out.push(`facet${i} got ${got} want ${want}`);
        });
        const checks: Array<[string, number, number, string]> = [
          ['head', 150, 90, pal.ember], ['tipL', 136, 41, pal.vivid],
          ['tipR', 164, 41, pal.vivid], ['body', 150, 140, pal.deep],
          ['bg', 20, 270, pal.cream],
        ];
        for (const [what, dx, dy, h] of checks) {
          const got = sample(dx, dy), want = hex(h);
          if (Math.max(...got.map((v, k) => Math.abs(v - want[k]))) > 0)
            out.push(`${what} got ${got} want ${want}`);
        }
        return out;
      },
      { b64: shot.toString('base64'), facets: FACETS, pal: PAL },
    );
    expect(fails).toEqual([]);
    await page.close();
  });

  test('reduced motion lands on the poster, never the timeline', async () => {
    const page = await openHero({ reducedMotion: 'reduce' });
    await page.waitForTimeout(600);
    expect(await page.locator('#metaStage canvas').count()).toBe(0);
    await expect(page.locator('.meta-poster')).toHaveCSS('opacity', '1');
    expect(await page.locator('#metaReplay').isHidden()).toBe(true);
    await page.close();
  });

  test('DPR clamps to 1.5 on coarse pointers', async () => {
    const page = await openHero({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.waitForSelector('#metaStage canvas', { timeout: 15_000 });
    await page.waitForTimeout(500);
    const dpr = await page.evaluate(() => {
      const c = document.querySelector('#metaStage canvas') as HTMLCanvasElement;
      return c.width / c.clientWidth;
    });
    expect(dpr).toBeLessThanOrEqual(1.51);
    await page.close();
  });

  test('loop pauses offscreen and destroy() tears down', async () => {
    const page = await openHero();
    await page.waitForSelector('#metaStage canvas', { timeout: 15_000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.body.style.height = '400vh';
      scrollTo(0, 3000);
    });
    await page.waitForTimeout(700);
    const t1 = await page.evaluate(() => (window as any).__metaHero._rig.time);
    await page.waitForTimeout(700);
    const t2 = await page.evaluate(() => (window as any).__metaHero._rig.time);
    expect(t2).toBe(t1);
    const gone = await page.evaluate(() => {
      (window as any).__metaHero.destroy();
      return !document.querySelector('#metaStage canvas');
    });
    expect(gone).toBe(true);
    await page.close();
  });
});
