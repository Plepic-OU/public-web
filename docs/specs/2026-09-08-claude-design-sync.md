# Handoff: syncing the Plepic design system to Claude Design

A scoping spec, not a build prompt. It answers what would be generated, from what source of truth, what stays hand-authored, and what breaks when the two diverge. Nothing here is decided until Kaido says so; every open question is marked.

## 1. Why this exists, and what it is not

Section 2.5 of `docs/specs/2026-09-06-living-tabletop-instructor-cards.md` chose custom elements over a framework so that "a React wrapper for Claude Design can be generated later without a rewrite". That was an architectural bet made in advance of a decision. This spec is where the decision gets made.

The bet has held so far. `<plepic-mark>` is a custom element that enhances inline SVG, and the Card is plain markup plus CSS with two custom properties written by a module. Neither carries framework assumptions. Nothing has been built for Claude Design: no package, no wrapper, no sync, no directory.

**This is not a rebuild of the design system.** `design-system.html` plus `css/styles.css` are canonical and stay canonical. Anything generated is downstream of them.

## 2. The question that decides everything else

**Is Claude Design a consumer of the design system, or a second home for it?**

A consumer reads the tokens and components, renders them, and has no opinion. Divergence is then a one-way problem, and the fix is to regenerate. A second home means designs originate there and flow back, which needs a merge story, and the whole history of this repo says that ends in two truths and a stale one.

The recommendation is **consumer, one-way, generated**. Everything below assumes it until Kaido says otherwise. **OPEN: Kaido confirms.**

## 3. What would go across, and in what order

Ordered by how much each earns its place, not by how easy it is.

| Rank | What | Why it is worth generating | Cost |
| --- | --- | --- | --- |
| 1 | The 75 `:root` tokens | Colour, type, spacing and motion are the whole identity, they are already machine-readable, and they are what a designer reaches for first | Low. One parser over one block |
| 2 | `<plepic-mark>` | The single most reused object on the site, and the one with locked geometry that must never be redrawn by hand | Medium. The SVG must travel verbatim, the breath is CSS |
| 3 | The Card | The component this whole branch built, and the pattern the loadout builder will extend | Medium |
| 4 | Panels, badges, buttons | The furniture every page uses | Medium, and largely mechanical |
| 5 | The hero | Three.js, WebGL, 69 KB, a poster fallback and a byte-exact rest pose | High, and almost certainly not worth it |

**Recommendation: ranks 1 and 2 only, first.** Tokens plus the mark is a real, useful, small deliverable that proves the pipeline. Ranks 3 and 4 follow once the pipeline is boring. Rank 5 stays out; the hero is a page, not a component.

## 4. Generated from what, exactly

The source of truth is `css/styles.css` for tokens and the inline SVG in `index.html` for the mark's geometry. Not the spec, not `design-system.html` prose, not a hand-kept copy.

- **Tokens.** Parse the single `:root` block. It is already the thing the design guard asserts against, so a generator that reads it inherits that guarantee. Emit whatever shape Claude Design consumes.
- **The mark.** The 22 polygons plus the five core nodes travel verbatim. `js/plepic-mark.js` deliberately contains no coordinate, and `tests/design-guard.spec.ts` fails if one appears, so the generator must extract from the page rather than from the module, and must never hand-write a polygon. The same guard should be extended to cover the generated output.
- **Components.** **OPEN:** generated from the CSS, or hand-written React that imports the tokens? Generating React from CSS classes is where this kind of project usually dies. Hand-written components that consume generated tokens is the boring option and probably the right one, at the cost of the components being a second implementation that can drift. Kaido decides.

## 5. What stays hand-authored, and never generates

- Every page. Claude Design gets components, not `index.html`.
- The hero and `js/crystalline-metamorphosis.js`.
- Copy. No generated component carries a Plepic sentence, a price, a date or a cohort claim; `scripts/check-claims.mjs` cannot see a package, and a claim that escapes into one escapes the gate that exists to catch it.
- `design-system.html` itself. It is the canon a human reads.

## 6. How drift is prevented, which is the only part that really matters

A generated artefact that nobody checks is worse than no artefact, because it looks current. Three mechanisms, in order of strength:

1. **Regenerate in CI and fail on a diff.** The generator runs, and if its output differs from what is committed, the build fails. This makes drift impossible rather than unlikely. It is the same shape as the visual baselines already in this repo.
2. **Extend the geometry guard.** The design guard already asserts that the locked mark is byte-identical wherever it is inlined. The generated package is another such place, and it should be added to the same test rather than given its own.
3. **One direction, enforced socially.** Nothing flows back from Claude Design. If a design starts there, it is re-authored here before it ships.

**OPEN:** whether the package lives in this repo (generated, committed, CI-checked) or its own. Same repo is strongly recommended: the generator, its source and its test then move in one commit, and the CI check above is trivial. A separate repo needs a release dance and will drift the first week someone is busy.

## 7. What breaks if they diverge

Worth stating plainly, because it is the argument for section 6.

- **The mark drifts** and Plepic has two butterflies. This is the one that matters. The geometry is locked, the asymmetry in slot 6 is hand-crafted, and the hero lands on it byte-exact. A second, slightly different mark in a design tool is how a brand quietly loses its logo.
- **Tokens drift** and a design is approved in a green the site cannot produce. Cheap to detect, annoying to unwind.
- **A component drifts** and the design tool shows an interaction the site does not have, which is how a promise gets made in a review that the site then breaks.

## 8. Recommended first slice

One PR, small enough to finish and prove the shape:

1. A generator that reads the `:root` block and the inline mark, and emits tokens plus one `<PlepicMark>` component.
2. Its output committed.
3. A CI job that regenerates and fails on a diff.
4. The geometry guard extended to the generated mark.
5. A line in `PRODUCT.md` saying the package is downstream and never edited by hand.

No Card, no panels, no hero. If that slice is boring to run twice, the rest is mechanical. If it is not, better to learn it on 75 tokens and one butterfly.

## 9. Open, for Kaido

1. Consumer or second home. Section 2 recommends consumer.
2. Components generated from CSS, or hand-written React over generated tokens. Section 4 leans hand-written.
3. Same repo or its own. Section 6 recommends same repo.
4. Whether Claude Design is a real commitment at all, or an option the architecture keeps open at no cost. It is entirely reasonable to close this and rely on the fact that nothing about the current build blocks it later.
