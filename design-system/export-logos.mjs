// Export the lockup variants as files for print and for anything outside the
// site: PDF (vector, fonts embedded), SVG (glyphs as outlines, via poppler's
// pdftocairo) and PNG on transparency. Every variant is the header lockup from
// index.html under the site's own stylesheet and fonts, so nothing is redrawn.
// Run it when design-system/build.py says the lockup changed.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'design-system/assets/Logos');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const LOCKUP = INDEX.match(/<a href="\/" class="logo-lockup"[\s\S]*?<\/a>/)[0]
  .replace(/^<a [^>]*>/, '<span class="logo-lockup">')
  .replace(/<\/a>$/, '</span>');
const WORDMARK = '<span class="logo-wordmark">Plepic</span>';
// The domain wordmark, as on the social card (images/plepic-og.png): .com in text-2.
const DOMAIN = '<span class="logo-wordmark">Plepic<span style="color: var(--text-2)">.com</span></span>';

const VARIANTS = {
  'plepic-lockup': LOCKUP,
  'plepic-lockup-stacked': LOCKUP.replace('class="logo-lockup"', 'class="logo-lockup logo-lockup--stacked"'),
  'plepic-lockup-on-brand': `<span class="on-brand">${LOCKUP}</span>`,
  'plepic-com-lockup': LOCKUP.replace(WORDMARK, DOMAIN),
  'plepic-com-wordmark': DOMAIN,
};

const css = url.pathToFileURL(path.join(ROOT, 'css/styles.css')).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plepic-logos-'));
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, markup] of Object.entries(VARIANTS)) {
  const doc = path.join(tmp, name + '.html');
  // zoom 4 scales the lockup as one unit: the mark lands on its 120px art size.
  fs.writeFileSync(doc, `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="${css}">
<style>html, body { margin: 0; min-height: 0; background: transparent; } #lockup { display: inline-block; zoom: 4; } @page { margin: 0; }</style>
</head><body><div id="lockup">${markup}</div></body></html>`);
  await page.goto(url.pathToFileURL(doc).href);
  await page.evaluate(() => document.fonts.ready);
  const box = await page.locator('#lockup').boundingBox();
  const pdf = path.join(OUT, name + '.pdf');
  await page.pdf({ path: pdf, width: Math.ceil(box.width) + 'px', height: Math.ceil(box.height) + 'px', pageRanges: '1' });
  execFileSync('pdftocairo', ['-svg', pdf, path.join(OUT, name + '.svg')]);
  await page.locator('#lockup').screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true });
  console.log(name, Math.ceil(box.width) + 'x' + Math.ceil(box.height));
}
await browser.close();
