# Handoff: the living tabletop, phase 1. Instructor cards and the breathing mark

A build prompt for a coding agent working in `public-web`. It carries every decision from the 2026-09-03 to 2026-09-06 design conversation, so do not re-open them; the "Superseded" table says what was tried and rejected. Read `design-system.html`, `css/styles.css`, `PRODUCT.md` and `tests/design-guard.spec.ts` before writing anything.

## 1. What this is

Plepic's design system evolves from a marketing-site reference into a product UI system with one register: game feel on the paper canon, working name "living tabletop". Objects have weight, hover lifts and tilts them, state changes spring and settle, valid targets call to you. Nothing about it is a HUD: no dark, no neon, no glow, no gradient text. The play is in physics and feedback, never in colour.

Phase 1 ships the foundation through one surface: the three instructor cards on the homepage become living tabletop cards, and the butterfly mark becomes a component that breathes at rest, exact in colour and geometry, at every size.

## 2. Decisions locked

1. The mission leads the identity, not an audience: engineers becoming agentic engineers; performance pay and incentive alignment; curious play to epic growth; small teams moving fast; skin in the game; engineering craft.
2. Transformation leads. Play is one deliberate dose, and the dose is game UI: cards, sheets, boards, loadouts, in a tabletop grammar (Magic cards, character sheets, tech trees), rendered with the juice of modern digital card games.
3. Art direction: crystalline. The butterfly's facet language is the whole art style. People are low-poly portraits triangulated from photos; concepts are crystals; backgrounds are shards.
4. The butterfly geometry is locked as it is (22 facets, Appendix A of `docs/metamorphosis-hero-prompt.md`). Its evolution is life, not shape: at rest, outside the hero, it is the exact SVG, animated by motion only. Colours are never lit, tinted or shifted.
5. Architecture, taken as the default for this spec pending Kaido's confirmation: vanilla, zero-build, inside `public-web`. Tokens in `css/styles.css`, components as ES modules served like `js/crystalline-metamorphosis.js`, portraits generated offline and committed. No framework, no bundler, no runtime dependency added. Custom elements are chosen so a React wrapper for Claude Design can be generated later without a rewrite.
6. Instructor cards ship first (confirmed). The recommended sequence after that, not yet confirmed: the cohort loadout builder, then the character sheet.

## 3. Scope

In: motion, elevation, material and state tokens; `<plepic-mark>`; the Card; the portrait pipeline and three portraits; the homepage team section rebuilt on the Card; the canon page updated; tests and baselines.
Out: the hero (`js/crystalline-metamorphosis.js` and its poster stay untouched); the header and footer logo (they adopt `<plepic-mark>` in a later PR once the cards have shipped); `/jobs`; sound (reserved for the builder); tiers and power numbers on people; any React or Claude Design work.

## 4. Hard locks and the gates that enforce them

- Palette is closed. Every hex on a production page must be in the canon list (`tests/design-guard.spec.ts`, "no off-canon colors"). Portrait SVGs carry photo colours, so they ship as external files under `images/portraits/`, referenced by `<img>`, never inlined.
- The butterfly polygons are byte-identical everywhere. The guard checks the slot-6 asymmetry on every page that inlines the mark; `<plepic-mark>` must therefore enhance an inline SVG, never replace it with a copy from JS.
- `--green-vivid` is never text on light. Headings are ink with at most one green phrase. One `--accent` element per viewport: the cards carry none; the ember head inside the set glyph is part of the locked mark, not an accent element.
- No dark surface on a production page (The Dark Placement Rule). No side-stripe accent borders (The Flat-By-Default Rule). Badge radius `20px 4px 16px` stays. No em-dashes in copy. Every `var()` must resolve.
- No new claims. Card copy is the existing name and present-tense day-job line. A number or date added to a page needs a `claims-receipts.log` line in the same PR (`scripts/check-claims.mjs`); the cards add none.
- CI runs `npm run lint`, `tests/design-guard.spec.ts`, `tests/a11y.spec.ts`, `tests/security.spec.ts`; `deploy.yml` strips `docs/specs` from the artifact. Visual baselines in `tests/visual.spec.ts-snapshots` will change: refresh with `npm run test:visual:update` and commit them.

## 5. Deliverables

### 5.1 Tokens, appended to `:root` in `css/styles.css`

- Elevation as ink offsets, the tabletop's shadow language: `--ink-shadow-rest: 3px 3px 0 var(--text)`, `--ink-shadow-hover: 6px 12px 0 var(--text)`. Ink only, never `--accent`.
- Tilt: `--tilt-x: 16deg`, `--tilt-y: 20deg`, `--lift-height: 12px`, `--tilt-dur: 220ms` with `--ease-settle`.
- Breath (the mark): `--breath-period: 4.6s`, `--breath-open: 34deg`, `--breath-offset: 0.35s`, `--breath-bob: 1.5px`, `--wingbeat-dur: 1.1s`, `--wingbeat-open: 62deg`.
- Material: `--grain-opacity: 0.28`, `--foil-opacity: 0.45`.
- Tiers (`core`, `advanced`, `signature`) are documented but not applied to people in this phase.

### 5.2 `<plepic-mark>` in `js/plepic-mark.js`

Progressive enhancement of the inline mark. The page inlines the exact SVG inside `<plepic-mark>`; without JS or under reduced motion that is the whole component. With JS the element reads the inline SVG and rebuilds it as three stacked `<svg>` layers with the same viewBox: left wing (the 11 left polygons), right wing (the 11 right polygons), core (body, antennae with tips, head). Polygon strings are copied from the inline source, never typed into the module.

Motion, CSS only, all values from 5.1:
- Wings hinge on the body axis: each wing layer has `transform-origin: 50% 50%` and rotates about Y inside a container with `perspective` equal to three times the rendered width. Open slow, close a touch faster: keyframe at 58% reaches `--breath-open`, `--ease-calm`, period `--breath-period`, the right wing delayed by `--breath-offset`.
- Core bobs `--breath-bob` on the same period. Antennae idle plus and minus 2.5 degrees on 5.3 s and 6.1 s periods, `transform-box: view-box`, origin at the antenna root (150, 86).
- Hover on pointer devices: one wingbeat to `--wingbeat-open` over `--wingbeat-dur`, then back to the breath.
- `prefers-reduced-motion: reduce` disables every animation; the layered mark is then identical to the flat one.

Sizes: display (300 px), card art and set glyph (120 px and 15 px), nav (30 px). One file, `width` set by the host. Under 32 px the wings still hinge; the antennae idle is invisible and may be skipped.

### 5.3 The Card, `.tt-card` in `css/styles.css`, behaviour in `js/tabletop.js`

Anatomy, top to bottom, all inside a 2 px ink border with `--rounded-lg` corners and `--ink-shadow-rest`:
1. Inner bevel: 1 px `--border` inset 7 px, `--rounded-sm`.
2. Name plate: `--font-display` 700, ink, on `--bg`, 1 px ink border; right side carries the set glyph, a 15 px `<plepic-mark>`.
3. Art window: the crystalline portrait as `<img>`, 1 px ink border, inset shadow `inset 0 2px 6px rgba(28,28,26,.18)`. The portrait fills the window edge to edge; its shard backdrop is generated in 5.4.
4. Type line: `--font-mono`, 9.5 px, letter-spacing .08em, uppercase, `--text-2`, e.g. `Instructor · Practitioner`. No numbers.
5. Text box: the day-job line, `--font-body`, `--text-2`, name of the company in ink.
6. Foot plate: `--font-mono` collector line `PLEPIC · INSTRUCTOR`, no numbers, no power.
7. Paper grain over everything: an SVG `feTurbulence` data URI at `--grain-opacity`, `mix-blend-mode: multiply`, pointer-events none.
8. Foil layer, only on `[data-foil]` cards: a green-family diagonal band (`transparent 40%`, `rgba(0,198,56,.22) 46%`, `rgba(197,246,211,.95) 50%`, mirrored), `background-size: 260%`, `multiply`, `--foil-opacity`, position driven by the tilt. At rest the band sits at `8% 8%`, a corner glint.

Behaviour (`js/tabletop.js`, one module, applies to every `[data-tilt]` element):
- Pointer over: lift `--lift-height`, shadow to `--ink-shadow-hover`, `rotateX` and `rotateY` from the pointer's offset within the element, capped at `--tilt-x` and `--tilt-y`, transition `--tilt-dur --ease-settle`. Foil position follows the same offset. Pointer out: everything returns.
- Only on `(hover: hover) and (pointer: fine)`; never on touch. Disabled under reduced motion (lift and shadow may remain, no rotation).
- No sound in this phase.
- Reserve the card's box size in CSS so the portrait `<img>` (with `width` and `height` attributes) causes no layout shift.

### 5.4 Portrait pipeline, `scripts/triangulate-portrait.mjs`

Offline, deterministic, committed output. Dev dependencies `sharp` and `delaunator` only; nothing ships to the browser.
- Input: `images/kaido.png` (transparent cut-out, arms crossed), `images/joosep.png`, `images/vootele.jpg`. Square crop, head and shoulders, 800 px working size. Kaido's choice to flip: the live team card uses `images/kaido.jpg` (smiling, football shirt); generate both and let him pick.
- Points: about 700, weighted to edges (Sobel magnitude) with a seeded random fill, plus the four corners and edge midpoints. Delaunay over the points. Each triangle filled with the mean colour of the pixels it covers. Skin and clothing keep their photo colours; no quantisation.
- Background: where the source is transparent or near-white, the triangles are filled from the shard palette `--green-light`, `--green-surface`, `--green-brand`, `--green-dark`, `--green-vivid` in the proportions 40, 30, 15, 10, 5, chosen per triangle by seeded hash, so the backdrop reads as the same crystal as the mark.
- Output: `images/portraits/<name>.svg`, `viewBox 0 0 400 400`, one `<polygon>` per triangle, `shape-rendering="geometricPrecision"`, target under 90 KB each. Parameters (points, seed, edge weight) are flags with the defaults recorded in the file header, so a portrait can be regenerated identically.

### 5.5 Homepage team section, `index.html`

`section#team` keeps its heading, its `data-instructor` hooks and the career-slide hover in `css/styles.css` (the `.team-showcase:has(.team-card[data-instructor]:hover) .instructor-slide[...]` rules). Each `article.team-card` becomes a `.tt-card` with `data-tilt` and `data-foil`, the portrait from 5.4 in the art window, the existing name in the name plate and the existing day-job line in the text box. Grid: three cards, `1fr 1fr 1fr` at desktop, stacked under 720 px; card width 280 to 300 px in the 1120 px container. The middle card no longer needs `team-card-right`.

### 5.6 Canon, `design-system.html`

Update, do not duplicate: Section 6 gains the Card with one live demo (a cream-panel variant only, per the "Cards canon" guard); Section 8 gains `<plepic-mark>` at the four sizes; Section 11 replaces the Wing-Breathe pattern ("2deg idle over 4s") with the hinge breath and its tokens, and adds Tilt and Lift as named patterns; Section 5 or a new panel lists the 5.1 tokens. The Anti-Patterns section gains: no HUD (dark, glow, bars), no sound on marketing pages, no tiers or power on people.

### 5.7 Verification

- `npm test` green (lint, a11y, visual, with baselines refreshed).
- `node scripts/capture-states.mjs http://localhost:8080 <outDir>` at 1440, 1024 and 390: the three cards render, tilt on hover at 1440, stack at 390, no horizontal scroll, no layout shift on load.
- Reduced motion checked in the browser: mark flat and still, cards without rotation.
- Flat-vs-layered check: with JS disabled the mark on the page is pixel-identical to the inline SVG.
- Weight: `js/plepic-mark.js` plus `js/tabletop.js` under 6 KB gzipped together; portraits under 90 KB each.

## 6. Superseded, and why

| Tried | Rejected because |
| --- | --- |
| Console / HUD register (dark, glow, XP bars) | Banned by canon; the play must be earned by craft, not by relaxing a rule. |
| Print (duotone photo) and Glossy (full-colour stage, gradient crystal) art directions | Crystalline chosen: one geometry from logo to card art. |
| Living gem rest state (lit facets, reflections, clearcoat) | Colours are no longer exact; read as "too much". |
| Exact colour with extruded depth | Per-facet extrusion broke the shape; even watertight, depth without light reads as cut-outs. |
| Per-facet extruded prisms in general | Facets must share corners; the hero's own rule. |
| Tiers and power numbers on instructor cards | Ranks real people in public; unverifiable numbers trip the claims gate. |

## 7. Open, decided later

The cohort loadout builder (Board, Slot, Hand, Meter, snap with sound, confirm to proposal) and the character sheet; header and footer adopting `<plepic-mark>`; whether the hero's WebGL rest breath converges on the CSS breath's numbers; a generated React wrapper package for Claude Design sync; module tiers and the rarity gem, which belong to the builder.
