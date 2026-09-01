import { test, expect } from '@playwright/test';

import { PUBLIC_PAGES } from './pages';

// frame-src is asserted per page. Every public page currently locks frames
// out entirely; a page that must embed a third party overrides its value in
// FRAME_SRC below rather than dropping out of the sweep.
const FRAME_SRC: Record<string, string> = {};
const pages = PUBLIC_PAGES.map((p) => ({
  ...p,
  frameSrc: FRAME_SRC[p.name] ?? "frame-src 'none'",
}));

const expectedCSPDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

for (const page of pages) {
  test(`security headers - ${page.name} has CSP meta tag @security`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);

    const cspMeta = browserPage.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(cspMeta).toHaveCount(1);

    const content = await cspMeta.getAttribute('content');
    expect(content).toBeTruthy();

    for (const directive of expectedCSPDirectives) {
      expect(content).toContain(directive);
    }
    expect(content).toContain(page.frameSrc);
  });

  test(`security headers - ${page.name} has referrer policy @security`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);

    const referrerMeta = browserPage.locator('meta[name="referrer"]');
    await expect(referrerMeta).toHaveCount(1);

    const content = await referrerMeta.getAttribute('content');
    expect(content).toBe('strict-origin-when-cross-origin');
  });
}
