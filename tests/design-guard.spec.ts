import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Design Guard — machine-enforced rules from the Plepic Design System.
 * Canon: design-system.html (reference + named rules) + css/styles.css (tokens).
 *
 * These are static source checks (no browser). When one fails, the fix is
 * either to follow the named rule or to change the rule on design-system.html
 * first; never to silence the test.
 */

const ROOT = path.resolve(__dirname, '..');

// Customer-facing production pages. design-system.html is exempt where noted
// (it documents the rules and uses em-dashes as internal label separators).
const PRODUCTION_PAGES = [
  'index.html',
  'training/index.html',
  'scopeful/index.html',
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

  test('the mark is never restyled, only animated (The Mark-Motion Rule)', () => {
    // Canon, design-system.html section 12: "Choreographed motion that resolves
    // to the locked mark is sanctioned; static effects (glow, gradient,
    // drop-shadow, per-facet opacity, outline-only wings) stay banned. Motion
    // animates the mark; it never restyles it."
    //
    // metamorphosis.spec.ts guards the motion half, but it needs WebGL and CI
    // never runs it, so the restyling half was unguarded everywhere. This is a
    // source check precisely so it runs on any machine: the banned effects are
    // all attributes on the inlined SVG.
    //
    // Scoped to the mark's own <svg>, not the page: a gradient elsewhere is a
    // different question, governed by its own rule.
    const SIGNATURE = 'points="147,105 110,68 55,48"';
    for (const page of PRODUCTION_PAGES) {
      const marks = (read(page).match(/<svg[\s\S]*?<\/svg>/g) || []).filter((s) => s.includes(SIGNATURE));
      expect(marks.length, `${page} should inline the butterfly mark exactly as the other pages do`).toBeGreaterThan(0);
      for (const svg of marks) {
        // Glow and drop-shadow arrive as filters; gradients as paint servers.
        for (const effect of ['filter=', '<linearGradient', '<radialGradient', 'drop-shadow', '<feGaussianBlur', '<feDropShadow']) {
          expect(svg.includes(effect), `${page}: the butterfly carries "${effect}". The mark is locked geometry; motion animates it, it is never restyled.`).toBe(false);
        }
        // Per-facet opacity and outline-only wings are facet-level, so they are
        // checked on <polygon> alone. The two antenna <path>s carry a
        // deliberate opacity="0.7" and are part of the locked artwork.
        const facets = svg.match(/<polygon[^>]*>/g) || [];
        for (const facet of facets) {
          expect(/\bopacity=/.test(facet), `${page}: a wing facet carries per-facet opacity, which is banned:\n${facet}`).toBe(false);
          expect(/fill="none"/.test(facet), `${page}: a wing facet is outline-only (fill="none"), which is banned:\n${facet}`).toBe(false);
        }
      }
    }
  });

  test('green payload rule: ink headings, one green payload phrase max', () => {
    // Headings are ink with at most one load-bearing green phrase via .highlight.
    // Only two .highlight color rules exist (brand on light, vivid on dark);
    // full-green headings — inline or via heading-level CSS — are banned.
    const css = read('css/styles.css');
    const highlightRules = css.match(/[^{}/]*\.highlight[^{}]*\{[^}]*\}/g) || [];
    expect(highlightRules.length, 'exactly two .highlight color rules (light + on-dark)').toBe(2);
    expect(highlightRules.some(r => /--green-brand/.test(r)), '.highlight must be brand green on light').toBe(true);
    expect(highlightRules.some(r => /--green-vivid/.test(r)), '.on-dark .highlight must be vivid green').toBe(true);
    const headingGreenRules = (css.match(/^[^{}/@]*\bh[1-4][^{}]*\{[^}]*--green[^}]*\}/gm) || [])
      .filter(r => !/\.brand|\.logo-wordmark/.test(r));
    expect(headingGreenRules, 'heading-level CSS rules must not set green (wordmark exempt)').toEqual([]);
    for (const page of PRODUCTION_PAGES) {
      const html = stripComments(read(page));
      const headings = html.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/g) || [];
      for (const h of headings) {
        const greenInline = /style="[^"]*color:\s*(var\(--green|#00c638|#137b30|#0d5822)/i.test(h);
        expect(greenInline, `${page}: heading carries inline green; use one .highlight payload:\n${h.slice(0, 120)}`).toBe(false);
        const payloads = (h.match(/class="[^"]*highlight/g) || []).length;
        expect(payloads <= 1, `${page}: heading has ${payloads} payload phrases, max is one:\n${h.slice(0, 120)}`).toBe(true);
      }
    }
  });

  test('no off-canon colors: every 6-digit hex belongs to the canon list', () => {
    // The palette is closed. Canon = the token palette + the peach status
    // pair (now used only by the design-system page's own ds-wip / ds-ct-fail
    // pills; badges went neutral 2026-08-01). Any other 6-digit hex in the
    // stylesheet or in production page styles is a leak. Tints of canon
    // colors use rgba(), never new hex.
    const CANON = new Set([
      // Greens
      '#00c638', '#137b30', '#0d5822', '#c5f6d3', '#edfcf1',
      // Accent + peach status-pill pair (ds-wip / ds-ct-fail)
      '#e26c45', '#fdf0eb', '#a3502e',
      // Backgrounds / surfaces
      '#faf7f2', '#f3efe7', '#ffffff', '#1c1c1a', '#262624',
      // Text
      '#4a4a45', '#6b6b60', '#e5e2dc', '#a3a39a',
      // Borders
      '#3a3a38',
    ]);
    const checkHexes = (label: string, text: string) => {
      const hexes = text.match(/#[0-9a-f]{6}\b/gi) || [];
      for (const hex of hexes) {
        expect(CANON.has(hex.toLowerCase()), `${label} contains off-canon color ${hex}`).toBe(true);
      }
    };
    checkHexes('css/styles.css', read('css/styles.css'));
    for (const page of PRODUCTION_PAGES) {
      const html = stripComments(read(page));
      const styleAttrs = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).join('\n');
      const styleBlocks = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
      checkHexes(`${page} inline styles`, styleAttrs + '\n' + styleBlocks);
    }
  });

  test('every var() resolves: no references to undeclared custom properties', () => {
    // An unresolvable var() is invalid at computed-value time, so the property
    // falls back to inherit and the page renders one tier flatter, in silence.
    // css/styles.css declares every token in :root and declares no custom
    // property outside it; a page that invents its own token name is off-canon
    // by the same rule that closes the palette.
    const css = read('css/styles.css');
    const rootBlocks = [...css.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
    expect(rootBlocks.length, 'css/styles.css must declare its tokens in a :root block').toBeGreaterThan(0);
    const declared = new Set(rootBlocks.flatMap((block) => [...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])));
    // var(--name) and var(--name, fallback) are both references; a fallback
    // inside a fallback is caught on the next pass of the same global regex.
    const undeclared = (label: string, text: string) =>
      [...new Set([...text.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))]
        .filter((name) => !declared.has(name))
        .map((name) => `${name} in ${label}`);
    let offenders = undeclared('css/styles.css', css);
    for (const page of PRODUCTION_PAGES) {
      const styleBlocks = (stripComments(read(page)).match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
      offenders = offenders.concat(undeclared(`${page} <style>`, styleBlocks));
    }
    expect(offenders, 'these var() references name a custom property no :root declares; add the token to css/styles.css or use the token that exists').toEqual([]);
  });

  // Enabled after the training-hero stat cards were recast (critique P1):
  // the mech-* class family is the rejected pre-2026 era and must not grow.
  test('no mech-* legacy class names', () => {
    const sources = ['css/styles.css', ...PRODUCTION_PAGES];
    for (const src of sources) {
      expect(read(src).includes('mech-'), `${src} uses mech-* legacy naming`).toBe(false);
    }
  });

  test('no production page carries a dark surface (The Dark Placement Rule)', () => {
    // June 2026 (623f623) put a full-bleed dark closing section on the homepage
    // because canon documented the dark device without saying where it belongs.
    // Kaido, 2026-08-27: "no exemptions. No dark mode in my public web." So the
    // rule is the whole site, not a page list that can drift. design-system.html
    // is the one place dark still renders, because it is the specimen page that
    // documents the device; it is not a production page and is not checked here.
    // These pages carry inline <style> blocks, so this reads file text
    // (comments stripped), not class attributes alone.
    for (const page of PRODUCTION_PAGES) {
      const html = stripComments(read(page));
      const offenders = [
        ...(html.match(/\bon-dark\b/g) || []),
        ...(html.match(/\bpanel-dark\b/g) || []),
        ...(html.match(/background[^;{}]*var\(--dark(-surface)?\)/g) || []),
        // The token is not the only way in: the literal values behind --dark and
        // --dark-surface are both on the canon hex list, so the off-canon-colour
        // test would wave them through. Matched only after `background`, so ink
        // text (color: #1c1c1a) stays legal.
        ...(html.match(/background[^;{}]*#(1c1c1a|262624)/gi) || []),
      ];
      expect(offenders, `${page} carries a dark surface. The public site is light, on every page, with no exemptions. Recast this as a light panel or section, or change the rule on design-system.html first: The Dark Placement Rule, section 3 (Neutrals).`).toEqual([]);
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
