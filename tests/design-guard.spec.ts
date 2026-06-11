import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Design Guard — machine-enforced rules from the Plepic Design System.
 * Canon: DESIGN.md + design-system.html (the public reference page).
 *
 * These are static source checks (no browser). When one fails, the fix is
 * either to follow the named rule or to change the rule in DESIGN.md first;
 * never to silence the test.
 */

const ROOT = path.resolve(__dirname, '..');

// Customer-facing production pages. design-system.html is exempt where noted
// (it documents the rules and uses em-dashes as internal label separators).
const PRODUCTION_PAGES = [
  'index.html',
  'training/index.html',
  'scopeful/index.html',
  'claude-code/index.html',
  '404.html',
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');

test.describe('design guard @design-guard', () => {
  test('no side-stripe accent borders (The Flat-By-Default Rule)', () => {
    const css = read('css/styles.css');
    const offenders = css.match(/border-(left|right):\s*[2-9](\.\d+)?px\s+solid/g) || [];
    expect(offenders, 'border-left/right thicker than 1px as a colored stripe is banned; use full borders or tints').toEqual([]);
  });

  test('no em-dashes in customer-facing copy (brand voice rule)', () => {
    for (const page of PRODUCTION_PAGES) {
      const visible = stripComments(read(page));
      const hits = visible.match(/—|&mdash;/g) || [];
      expect(hits, `${page} contains ${hits.length} em-dash(es); use commas, colons, or periods`).toEqual([]);
    }
  });

  test('the retired --green alias stays retired (The Vivid Text Ban)', () => {
    const css = read('css/styles.css');
    expect(css.includes('--green:'), 'do not redefine the --green alias; name tokens explicitly').toBe(false);
    expect(css.match(/var\(--green\)/g) || [], 'var(--green) is retired; use --green-vivid / --green-brand / --green-dark explicitly').toEqual([]);
  });

  test('no off-system color literals (The 73% Rule)', () => {
    // Colors that have previously leaked in and were purged. The palette is
    // locked; new needs are met by existing tokens, not new hex values.
    const banned = ['#d97757', '#22c55e', '#d15a35', 'rgba(217, 119, 87', 'rgba(34, 197, 94'];
    const sources = ['css/styles.css', ...PRODUCTION_PAGES];
    for (const src of sources) {
      const content = read(src).toLowerCase();
      for (const hex of banned) {
        expect(content.includes(hex), `${src} contains off-system color ${hex}`).toBe(false);
      }
    }
  });

  test('badge signature radius intact (20px 4px 16px)', () => {
    const css = read('css/styles.css');
    const occurrences = css.match(/border-radius:\s*20px 4px 16px/g) || [];
    expect(occurrences.length, 'the asymmetric badge radius is a locked signature on .badge and .badge-base').toBeGreaterThanOrEqual(2);
  });

  test('butterfly mark geometry is locked (slot-6 asymmetry present)', () => {
    // The right wing's slot-6 facet is deliberately DK (#0d5822) where the
    // left wing has B; this is the hand-crafted asymmetry that is locked.
    // Any page inlining the mark must carry it unmodified.
    const slot6 = /<polygon points="153,165 272,150 250,178" fill="#0d5822"/;
    for (const page of PRODUCTION_PAGES) {
      const html = read(page);
      if (html.includes('points="147,105 110,68 55,48"')) {
        expect(slot6.test(html), `${page} inlines the butterfly but the slot-6 asymmetry is missing or recolored`).toBe(true);
      }
    }
  });

  test('green payload: at most one highlight per heading (The Green Payload Rule)', () => {
    for (const page of PRODUCTION_PAGES) {
      const html = stripComments(read(page));
      const headings = html.match(/<h[123][^>]*>[\s\S]*?<\/h[123]>/g) || [];
      for (const h of headings) {
        const count = (h.match(/class="highlight"/g) || []).length;
        expect(count, `${page}: a heading carries ${count} highlights; one green phrase max:\n${h.slice(0, 120)}`).toBeLessThanOrEqual(1);
      }
    }
  });

  // Enable after the training-hero stat cards are recast (critique P1):
  // the mech-* class family is the rejected pre-2026 era and must not grow.
  test.fixme('no mech-* legacy class names', () => {
    const sources = ['css/styles.css', ...PRODUCTION_PAGES];
    for (const src of sources) {
      expect(read(src).includes('mech-'), `${src} uses mech-* legacy naming`).toBe(false);
    }
  });
});
