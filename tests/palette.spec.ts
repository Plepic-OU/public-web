import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * .impeccable/design.json is the machine-readable mirror of the palette: the
 * file an agent or a generator reads to learn what colours this system has.
 * Nothing compared it to the stylesheet, and it had drifted badly.
 *
 * Until 2026-09-01 it declared 8 colours, each with a generated 8-step
 * "tonalRamp". All 8 canonical values were right; none of the 64 ramp values
 * appeared anywhere in css/styles.css. That was not corruption: the impeccable
 * sidecar schema asks for a synthesised ramp per token to render a strip under
 * each swatch in its critique panel. The problem is that nothing in the file
 * marked which values were real and which were decoration, and the synthesised
 * ones sat close enough to mislead, offering #12732d beside the real brand
 * green #137b30 and #48443d beside the real secondary ink #4a4a45. It also
 * omitted the eight working neutrals entirely, so a tool needing a border
 * colour would find none declared and invent one.
 *
 * Kaido's call, 2026-09-01: the palette is the greens, the orange and the
 * creams he designed, plus the neutrals already in the stylesheet, and nothing
 * synthesised. The panel degrades safely without ramps (live-browser.js reads
 * `m.tonalRamp || null` and `c.tonalRamp?.length`), so the strip simply stops
 * rendering.
 *
 * Both failure modes are the same bug: the file was allowed to disagree with
 * the stylesheet. This test removes that freedom. The stylesheet is the source
 * of truth; design.json must mirror it exactly, in both directions.
 */

const root = (p: string) => join(__dirname, '..', p);
const read = (p: string) => readFileSync(root(p), 'utf8');

type ColorMeta = {
  role: string;
  displayName: string;
  canonical: string;
  cssVar: string;
  alsoCssVar?: string[];
  purpose: string;
};

const design = JSON.parse(read('.impeccable/design.json'));
const colorMeta: Record<string, ColorMeta> = design.extensions.colorMeta;

/** Every `--name: #hex` pair in the stylesheet's :root block. */
function rootVars(): Map<string, string> {
  const css = read('css/styles.css');
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  expect(block, 'css/styles.css has no :root block').not.toBeNull();
  const out = new Map<string, string>();
  for (const m of block![1].matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out.set(m[1], m[2].toLowerCase());
  }
  return out;
}

/** Every CSS variable design.json claims, mapped to the hex it claims for it. */
function declaredVars(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, meta] of Object.entries(colorMeta)) {
    for (const v of [meta.cssVar, ...(meta.alsoCssVar ?? [])]) {
      expect(out.has(v), `design.json declares ${v} twice (second time under "${key}")`).toBe(false);
      out.set(v, meta.canonical.toLowerCase());
    }
  }
  return out;
}

test.describe('palette file mirrors the stylesheet @palette', () => {
  test('no colour in design.json is absent from :root', () => {
    const actual = rootVars();
    const orphans = [...declaredVars()]
      .filter(([v]) => !actual.has(v))
      .map(([v, hex]) => `${v} (${hex})`);

    expect(
      orphans,
      'design.json names CSS variables that css/styles.css does not define. Either the token was renamed or removed in the stylesheet and design.json was not updated, or the entry was invented. Fix design.json; the stylesheet is the source of truth.',
    ).toEqual([]);
  });

  test('no colour in :root is absent from design.json', () => {
    const declared = declaredVars();
    const undeclared = [...rootVars()]
      .filter(([v]) => !declared.has(v))
      .map(([v, hex]) => `${v} (${hex})`);

    expect(
      undeclared,
      'css/styles.css defines colours that design.json does not declare. An agent reading design.json will not know these exist and will invent its own value for the same job, which is how off-system colour enters the system. Add an entry with role, displayName, canonical, cssVar and purpose.',
    ).toEqual([]);
  });

  test('every declared hex matches the stylesheet exactly', () => {
    const actual = rootVars();
    const wrong: string[] = [];
    for (const [v, hex] of declaredVars()) {
      const real = actual.get(v);
      if (real && real !== hex) wrong.push(`${v}: design.json says ${hex}, stylesheet says ${real}`);
    }

    expect(
      wrong,
      'design.json states a different value than the stylesheet for the same token. A near-miss hex is worse than a missing one: it renders as a colour that looks right beside the real thing.',
    ).toEqual([]);
  });

  test('no generated tonal ramps survive', () => {
    // Ramps carried the authority of the file with none of its accuracy: they
    // were synthesised for display, never derived from the stylesheet, and
    // nothing distinguished them from the canonical values beside them. If a
    // ramp is ever wanted again, derive it from real tokens and check it here
    // rather than reintroducing free-floating arrays.
    const withRamps = Object.entries(colorMeta)
      .filter(([, m]) => 'tonalRamp' in m)
      .map(([k]) => k);

    expect(
      withRamps,
      'A tonalRamp is back in design.json. Every previous ramp value was synthesised for display and matched nothing in the stylesheet.',
    ).toEqual([]);
  });

  test('every entry carries the fields a reader needs', () => {
    const bad: string[] = [];
    for (const [key, m] of Object.entries(colorMeta)) {
      for (const f of ['role', 'displayName', 'canonical', 'cssVar', 'purpose'] as const) {
        if (!m[f] || typeof m[f] !== 'string') bad.push(`${key} is missing ${f}`);
      }
      if (m.canonical && !/^#[0-9a-f]{6}$/.test(m.canonical.toLowerCase())) {
        bad.push(`${key} canonical "${m.canonical}" is not a 6-digit hex`);
      }
      if (m.role && !['primary', 'secondary', 'neutral'].includes(m.role)) {
        bad.push(`${key} has role "${m.role}", expected primary, secondary or neutral`);
      }
    }
    expect(bad, 'design.json entries are incomplete; purpose is what stops a reader guessing which grey to use.').toEqual([]);
  });
});
