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

// The living tabletop rules below read declarations, not file text, so a rule
// that names a .tt-* class is returned as { selector, body }. CSS comments come
// out first: css/styles.css explains --accent and the dark tokens in prose
// right beside these rules, and prose must never trip a declaration check. A
// rule body carries no braces of its own, so the flat match is enough, and
// inside a @media block the text between the block's brace and the rule's brace
// is that rule's own selector.
const ttRules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim(), body: m[2] }))
    .filter((rule) => rule.selector.includes('.tt-'));

// Every custom property declared in the stylesheet's :root blocks.
const rootTokens = (css: string) =>
  new Set([...css.matchAll(/:root\s*\{([\s\S]*?)\}/g)]
    .flatMap((block) => [...block[1].matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])));

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

  test('living tabletop: the Card spends no accent (One Accent Element)', () => {
    // The cards carry no accent element at all. The one warm thing on a card is
    // the butterfly's ember head, and that head is part of the locked mark,
    // inlined as SVG, so it is geometry rather than an accent the component
    // chose. Breaking this looks like a card that warms up as it lifts: an
    // accent-tinted foil band, plate border or hover shadow, and the piece stops
    // reading as printed stock and starts reading as a HUD highlight.
    // Declarations only, never page text, because the inline mark is legitimately
    // full of #e26c45.
    const rules = ttRules(read('css/styles.css'));
    expect(rules.length, 'no .tt-* rule found in css/styles.css; the Card was renamed and this guard now checks nothing').toBeGreaterThan(0);
    const offenders = rules.filter((rule) => /--accent|#e26c45/i.test(rule.body)).map((rule) => rule.selector);
    expect(offenders, 'these Card rules reach for the accent. The Card is ink and green only: use a token that exists, or change the rule on design-system.html first.').toEqual([]);
  });

  test('living tabletop: elevation is ink, never a colour', () => {
    // Elevation on the tabletop is a hard offset print of the object, so the
    // drop shadow is var(--text) and nothing else. Give it a colour and it stops
    // being a shadow and becomes a glow, which is the console register the canon
    // rejects. The hover token is the tempting one, because a card that has just
    // lifted off the table looks like an invitation to light it. The comma is
    // banned with the colours: one ink offset is the whole language, and a
    // second stacked layer is where a glow gets in past a first layer that
    // still says var(--text). Comments come out first, so a token quoted in
    // prose never counts as a second declaration.
    const css = read('css/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const shadows = [...css.matchAll(/(--ink-shadow-(?:rest|hover))\s*:([^;]+);/g)];
    expect(shadows.map((m) => m[1]).sort(), 'css/styles.css must declare both ink shadow tokens exactly once each').toEqual(['--ink-shadow-hover', '--ink-shadow-rest']);
    for (const [, name, value] of shadows) {
      expect(value.includes('var(--text)'), `${name} is ${value.trim()}; elevation is ink, so the colour must be var(--text). Follow the rule or change canon (design-system.html, section 11) first.`).toBe(true);
      expect(/--accent|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|,/i.test(value), `${name} is ${value.trim()}; it carries a colour or a second shadow layer. One ink offset only: change the rule on design-system.html before you change this token.`).toBe(false);
    }
  });

  test('living tabletop: the Card never sets a dark background (The Dark Placement Rule)', () => {
    // The page-level dark guard reads pages, so a component can walk dark back
    // onto a light site underneath it: a dark plate behind the grain is the
    // obvious way to make the foil band pop, and it would ship on every page
    // that ever places a Card without a single page changing. Same two shapes as
    // the page guard, the token and the two literal values behind it, matched
    // only after `background` so ink borders and ink text stay legal.
    const rules = ttRules(read('css/styles.css'));
    expect(rules.length, 'no .tt-* rule found in css/styles.css; the Card was renamed and this guard now checks nothing').toBeGreaterThan(0);
    const offenders = rules
      .filter((rule) => /background[^;{}]*var\(--dark(-surface)?\)/.test(rule.body)
        || /background[^;{}]*#(1c1c1a|262624)/i.test(rule.body))
      .map((rule) => rule.selector);
    expect(offenders, 'these Card rules paint a dark surface. The public site is light on every page with no exemptions, components included. Recast this on --surface or --bg, or change the rule on design-system.html first: The Dark Placement Rule, section 3 (Neutrals).').toEqual([]);
  });

  test('living tabletop: every token the living tabletop depends on is declared in :root', () => {
    // js/tabletop.js and js/plepic-mark.js set custom properties inline, and the
    // transform and the breath keyframes read them back. An unresolvable var()
    // is invalid at computed-value time, so the card would simply stop tilting
    // and the mark would fold flat, in silence, with nothing in the console.
    // The var() guard above catches a name CSS references and :root forgot; this
    // one catches the mirror failure, a token deleted from :root because no rule
    // in the stylesheet appeared to use it while a module still writes it.
    // --tilt-x and --tilt-y earn their place here more than any other name on
    // the list: no rule in the stylesheet writes var(--tilt-x), only
    // js/tabletop.js reads it through getPropertyValue, so the var() guard
    // above is blind to them by construction. Delete them from :root and every
    // test stays green while getPropertyValue returns "", degrees() falls back
    // to 0, and the cards quietly stop rotating.
    const REQUIRED = [
      '--ink-shadow-rest', '--ink-shadow-hover',
      '--tilt-x', '--tilt-y',
      '--tilt-enabled', '--tt-lift', '--tt-rx', '--tt-ry', '--tt-foil-x', '--tt-foil-y',
      '--mark-perspective',
      '--breath-period', '--breath-open', '--wingbeat-dur', '--wingbeat-open',
      '--grain-opacity', '--foil-opacity',
    ];
    const declared = rootTokens(read('css/styles.css'));
    const missing = REQUIRED.filter((name) => !declared.has(name));
    expect(missing, 'these living tabletop tokens are missing from :root in css/styles.css. A module writes or a keyframe reads every one of them: declare it with its default, or take the token out of the modules and canon first.').toEqual([]);
  });

  test('living tabletop: js/plepic-mark.js carries no copy of the mark geometry', () => {
    // <plepic-mark> enhances the SVG the page inlines and never renders one of
    // its own, which is what keeps a single copy of the locked butterfly on the
    // site: the copy the slot-6 guard above checks. A module holding its own
    // coordinates would pass every page-level geometry test and still paint a
    // different butterfly the moment JavaScript ran, and no visual baseline
    // would flag it, because both drawings look like a butterfly. The pairs are
    // read out of the inline mark rather than typed here, so this guard cannot
    // drift from the geometry either.
    const module = read('js/plepic-mark.js');
    expect(module.includes('points='), 'js/plepic-mark.js names a points attribute. The module must clone nodes out of the inline SVG: keep the coordinates in the page, comments included, or change the contract in docs/specs first.').toBe(false);
    // Only real coordinate PAIRS, and only from the butterfly. Splitting every
    // points attribute on the page into bare tokens put "0", "1" and "20" in
    // the needle list, and every one of them appears in the module as a plain
    // number, so the guard could accuse an editor of copying the mark over a
    // loop bound. A pair carries a comma, which no number in the module does.
    const pairs = [...new Set([...read('index.html').matchAll(/points="([^"]+)"/g)]
      .flatMap((m) => m[1].trim().split(/\s+/))
      .filter((token) => /^\d+,\d+$/.test(token)))];
    expect(pairs.length, 'index.html no longer inlines the mark, so this guard has no geometry left to compare against').toBeGreaterThan(20);
    const copied = pairs.filter((pair) => module.includes(pair));
    expect(copied, 'js/plepic-mark.js repeats coordinates from the locked mark. Read them from the DOM instead; do not keep a second copy, not even in prose.').toEqual([]);
  });

  test('living tabletop: the paper grain carries no colour of its own', () => {
    // The grain is one fractalNoise tile desaturated by feColorMatrix and
    // multiplied over the card, so it darkens the paper and never tints it. A
    // hex inside the data URI is how a texture smuggles a colour past the closed
    // palette: the off-canon guard above reads the stylesheet as text, and a
    // percent-encoded %23 is not a # to it, so a warm noise tile would ship
    // unseen. Both spellings are checked here for that reason.
    const uris = [...read('css/styles.css').matchAll(/url\("(data:[^"]*)"\)/g)].map((m) => m[1]);
    expect(uris.length, 'no data: URI found in css/styles.css; the grain tile moved and this guard now checks nothing').toBeGreaterThan(0);
    for (const uri of uris) {
      // Three spellings, because banning only #rrggbb leaves two open doors:
      // #rgb is a colour too, and so is every CSS named colour, which needs no
      // punctuation at all to reach a fill or a flood-color.
      expect(uri.match(/(#|%23)[0-9a-f]{3,8}\b/gi) || [], 'a data: URI in css/styles.css carries a colour. Desaturate it in the filter as the grain does, or put the tint on a canon token and change design-system.html first.').toEqual([]);
      expect(uri.match(/(fill|stroke|flood-color|stop-color|lighting-color)\s*=?\s*['"]?[a-z]{3,}/gi) || [], 'a data: URI in css/styles.css names a paint. A tile that paints is a tile that can tint; the grain must get its value from the filter alone.').toEqual([]);
      // The desaturation this test is named after was never actually asserted.
      // A tile whose feColorMatrix is deleted still contains no hex, so it
      // passed every check above while multiplying full-saturation fractal
      // noise over the card.
      if (/feTurbulence/i.test(uri)) {
        expect(/feColorMatrix[^>]*type=['"]?saturate['"]?[^>]*values=['"]?0/i.test(uri), 'the fractal-noise tile in css/styles.css is not desaturated. feTurbulence emits full-colour noise; without feColorMatrix type="saturate" values="0" the grain tints every card it multiplies over.').toBe(true);
      }
    }
  });
});
