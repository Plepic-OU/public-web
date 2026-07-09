#!/usr/bin/env node
/**
 * Comprehensive state/viewport capture harness for visual verification.
 *
 * Renders a URL across the states and viewports that a real visitor hits,
 * writing labeled full-page screenshots plus a metrics.json so verification
 * agents can both LOOK at the result and reason over measured geometry.
 * This is the shared "eyes" for the verify-ui workflow; it is deliberately
 * generic (any page), with the metamorphosis hero as the default target.
 *
 * Usage:
 *   node scripts/capture-states.mjs <url> <outDir> [--full] [--hero]
 *
 *   <url>     page to render (e.g. https://www.plepic.com/ or localhost)
 *   <outDir>  directory for screenshots + metrics.json
 *   --hero    also capture the metamorphosis load sequence + arc phases
 *             and measure the butterfly/code geometry (hero-specific probes)
 *
 * States captured (always): initial (~150ms), settled (~2.5s).
 * With --hero: the poster→canvas swap frames, delay-hold, mid-arc phases,
 * and post-arc rest, plus butterfly-vs-code geometry.
 *
 * Viewports: mobile 390x844 (dpr3), tablet 820x1180, laptop 1440x900,
 * desktop 1920x1080, wide 2560x1440. Reduced-motion pass at 1440.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2] || 'https://www.plepic.com/';
const outDir = process.argv[3] || './capture';
const hero = process.argv.includes('--hero');
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, dpr: 3, mobile: true },
  { name: 'tablet', width: 820, height: 1180, dpr: 2 },
  { name: 'laptop', width: 1440, height: 900, dpr: 2 },
  { name: 'desktop', width: 1920, height: 1080, dpr: 1 },
  { name: 'wide', width: 2560, height: 1440, dpr: 1 },
];

// Scan a screenshot region for the butterfly's visible bounds (strong green)
// and the ember head centroid (its true body axis). Runs in the page.
async function heroGeom(page) {
  const shot = await page.screenshot();
  return page.evaluate((b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
        const dpr = img.width / window.innerWidth;
        const stage = document.getElementById('metaStage');
        if (!stage) return resolve({ error: 'no #metaStage' });
        const st = stage.getBoundingClientRect();
        // Scan ONLY the stage box (plus a little below for the code), never
        // the whole column — the header logo is also a green butterfly and
        // would poison a full-height scan.
        const x0 = Math.round(st.left*dpr), x1 = Math.round(st.right*dpr), W = x1-x0;
        const y0 = Math.round(st.top*dpr), y1 = Math.round((st.bottom+70)*dpr), H = y1-y0;
        const d = ctx.getImageData(x0, y0, W, H).data;
        const green = (x,y)=>{const o=(y*W+x)*4;return d[o+1]>110 && d[o+1]>d[o]+30 && d[o+1]>d[o+2]+20;};
        const ember = (x,y)=>{const o=(y*W+x)*4;return d[o]>200 && d[o+1]>90 && d[o+1]<150 && d[o+2]<110;};
        let low=-1, high=-1, minX=W, maxX=-1, ex=0, en=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          if (green(x,y)) { if(low<0)low=y; high=y; if(x<minX)minX=x; if(x>maxX)maxX=x; }
          if (ember(x,y)) { ex+=x; en++; }
        }
        const toX = px => Math.round(st.left + px/dpr);
        const toY = py => Math.round(st.top + py/dpr);
        const codeT = [...document.querySelectorAll('#metaCode .meta-code-line .t')].find(t=>t.textContent.trim());
        let codeCx=null, codeTop=null;
        if (codeT) {
          const range=document.createRange(); range.selectNodeContents(codeT);
          const cr=range.getClientRects(); codeCx=Math.round((cr[0].left+cr[cr.length-1].right)/2); codeTop=Math.round(cr[0].top);
        }
        resolve({
          stageTop: Math.round(st.top), stageBottom: Math.round(st.bottom),
          butterflyTop: high>=0?toY(high):null, butterflyBottom: low>=0?toY(low):null,
          butterflyCx: (minX<=maxX)?toX((minX+maxX)/2):null,
          emberAxisCx: en?toX(ex/en):null,
          codeCx, codeTop,
          isLive: stage.classList.contains('is-live'),
          posterOpacity: getComputedStyle(stage.querySelector('.meta-poster')).opacity,
          phase: document.getElementById('metaCode')?.dataset.phase,
        });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, shot.toString('base64'));
}

// Prefer the bundled Chromium; fall back to system Chrome (same Blink/V8) if
// the bundled binary isn't installed. --enable-unsafe-swiftshader lets WebGL
// run under software rendering in headless/CI.
const LAUNCH = { args: ['--enable-unsafe-swiftshader'] };
let browser;
try {
  browser = await chromium.launch(LAUNCH);
} catch {
  browser = await chromium.launch({ ...LAUNCH, channel: 'chrome' });
}
const metrics = { url, capturedAt: null, viewports: {} };

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERR: ' + e.message));

  await page.goto(url + '?nc=' + vp.name + Date.now(), { waitUntil: 'domcontentloaded' });

  const vpData = { consoleErrors: [], states: {} };

  // INITIAL (first paint / poster)
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(outDir, `${vp.name}-1-initial.png`), fullPage: false });
  if (hero) vpData.states.initial = await heroGeom(page);

  // SETTLED / rest (after delay + potential arc; hero holds ~5s then plays)
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outDir, `${vp.name}-2-settled.png`), fullPage: false });
  if (hero) vpData.states.settled = await heroGeom(page);

  if (hero) {
    // mid-arc (crawl) — wait for the delayed metamorphosis to start
    await page.waitForFunction(() => document.getElementById('metaCode')?.dataset.phase === 'crawl', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, `${vp.name}-3-crawl.png`), fullPage: false });
    vpData.states.crawl = await heroGeom(page);
    // post-arc rest
    await page.waitForFunction(() => document.getElementById('metaCode')?.dataset.phase === 'rest', null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, `${vp.name}-4-restfinal.png`), fullPage: false });
    vpData.states.restFinal = await heroGeom(page);
  }

  vpData.consoleErrors = consoleErrors.filter(e =>
    !e.includes('doubleclick') && !e.includes('Content Security') && !e.includes('CSP') && !e.includes('google'));
  metrics.viewports[vp.name] = vpData;
  await ctx.close();
}

// Reduced-motion pass (laptop)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url + '?rm=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, 'reduced-motion.png'), fullPage: false });
  metrics.reducedMotion = hero ? await heroGeom(page) : { captured: true };
  await ctx.close();
}

await browser.close();
writeFileSync(join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log('captured to', outDir);
console.log(JSON.stringify(metrics, null, 2));
