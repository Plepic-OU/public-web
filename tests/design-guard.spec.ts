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
  'jobs/index.html',
  '404.html',
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');

// For copy-voice checks: reduce the page to what a visitor actually reads.
// Strips HTML comments AND <script>/<style> blocks, so punctuation inside
// code (JS/CSS comments, animation logic) never trips a customer-facing rule.
const visibleCopy = (html: string) =>
  stripComments(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

test.describe('design guard @design-guard', () => {
  test('no side-stripe accent borders (The Flat-By-Default Rule)', () => {
    const css = read('css/styles.css');
    const offenders = css.match(/border-(left|right):\s*[2-9](\.\d+)?px\s+solid/g) || [];
    expect(offenders, 'border-left/right thicker than 1px as a colored stripe is banned; use full borders or tints').toEqual([]);
  });

  test('no em-dashes in customer-facing copy (brand voice rule)', () => {
    for (const page of PRODUCTION_PAGES) {
      const visible = visibleCopy(read(page));
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

  test('small butterfly mark is locked (merged silhouette, hindwing fill swap, geometricPrecision)', () => {
    // The below-48px cut (nav lockups, favicon): 8 merged facets sharing the
    // master's outer vertices. Any page inlining it must carry it unmodified:
    // right-wing hindwing pair swaps B and DK, and the svg renders with
    // geometricPrecision (crispEdges is master-only).
    const smallLeadFacet = 'points="147,105 110,68 55,48 20,72 15,108 147,130"';
    const precisionRoot = /<svg[^>]*shape-rendering="geometricPrecision"[^>]*><polygon points="147,105 110,68 55,48 20,72 15,108 147,130"/;
    const rightHindUpperB = /<polygon points="153,178 250,178 218,195 225,220" fill="#137b30"/;
    const rightHindLowerDK = /<polygon points="153,195 225,220 200,240 165,232" fill="#0d5822"/;
    for (const page of PRODUCTION_PAGES) {
      const html = read(page);
      if (html.includes(smallLeadFacet)) {
        expect(precisionRoot.test(html), `${page} inlines the small mark without shape-rendering="geometricPrecision"`).toBe(true);
        expect(rightHindUpperB.test(html), `${page}: small mark right hindwing upper facet must be B (#137b30), the locked fill swap`).toBe(true);
        expect(rightHindLowerDK.test(html), `${page}: small mark right hindwing lower facet must be DK (#0d5822), the locked fill swap`).toBe(true);
      }
    }
  });

  test('headings are ink: no green heading styling (The Green Payload Rule, L3)', () => {
    // Headings are ink everywhere. .highlight markup spans stay (reversibility)
    // but every .highlight rule must resolve to `color: inherit` — never green —
    // and production headings must not inline green text color.
    const css = read('css/styles.css');
    const highlightRules = css.match(/[^{}/]*\.highlight[^{}]*\{[^}]*\}/g) || [];
    expect(highlightRules.length, 'expected .highlight rules to exist in styles.css').toBeGreaterThanOrEqual(2);
    for (const rule of highlightRules) {
      expect(/color:\s*inherit/.test(rule), `.highlight must be color: inherit (ink):\n${rule}`).toBe(true);
      expect(/--green|#00c638|#137b30|#0d5822/i.test(rule), `.highlight rule reintroduces green:\n${rule}`).toBe(false);
    }
    for (const page of PRODUCTION_PAGES) {
      const html = stripComments(read(page));
      const headings = html.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/g) || [];
      for (const h of headings) {
        const greenInline = /style="[^"]*color:\s*(var\(--green|#00c638|#137b30|#0d5822)/i.test(h);
        expect(greenInline, `${page}: heading carries inline green; headings are ink:\n${h.slice(0, 120)}`).toBe(false);
      }
    }
  });

  // Enabled after the training-hero stat cards were recast (critique P1):
  // the mech-* class family is the rejected pre-2026 era and must not grow.
  test('no mech-* legacy class names', () => {
    const sources = ['css/styles.css', ...PRODUCTION_PAGES];
    for (const src of sources) {
      expect(read(src).includes('mech-'), `${src} uses mech-* legacy naming`).toBe(false);
    }
  });

  test('design-system page: cream panels only as the demonstrated variant (Cards canon)', () => {
    // The reference page presents specimens inside white panels (white on
    // cream); .panel-cream appears only as the demonstrated variant on a white
    // surface, tagged data-demo="panel-cream". Cream-on-cream furniture is banned.
    const html = stripComments(read('design-system.html'));
    const tags = html.match(/<[^>]*class="[^"]*\bpanel-cream\b[^"]*"[^>]*>/g) || [];
    for (const tag of tags) {
      expect(tag.includes('data-demo="panel-cream"'), `design-system.html: unsanctioned .panel-cream (cream furniture is banned; only the tagged variant demo may use it):\n${tag.slice(0, 160)}`).toBe(true);
    }
    expect(tags.length, 'design-system.html: exactly one demonstrative .panel-cream specimen is sanctioned').toBe(1);
  });
});
