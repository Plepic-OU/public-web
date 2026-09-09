# Consolidating the Plepic design system into Claude Design
Claude Design becomes the one home for the design system. Kaido decided this on 2026-09-09; it reverses the recommendation this document carried on 2026-09-08, which is kept in section 9. The destination is full consolidation, with `css/styles.css` eventually generated from Claude Design. The route there is staged, because nothing that ships today can move until a generated stylesheet can satisfy the gates that already guard the site. Stage 1 is built and live.
## 1. What was decided
| Question | Decision | What it rules out |
| --- | --- | --- |
| Consumer of the system, or its home? | **Its home.** The system is authored in Claude Design and the stylesheet is generated from it | A second canonical copy anywhere. Kaido: "I don't want multiple homes" |
| Who can see it? | **Public**, and linked from plepic.com | An org-only canvas, and therefore PNG/PDF export (section 4) |
| What happens to `css/styles.css`? | **Deferred.** Decide once the canvas has been lived with | Committing now to a reverse generator nobody has used |
| What first? | **Rewrite this spec and build a first canvas** | A build that starts at the stylesheet end |
The audience is every Plepic instructor, not only the two people who touch the repo. That is the reason the home moves at all: `design-system.html` and `css/styles.css` are reachable by someone with a checkout, and a canvas is reachable by anyone with a link.
## 2. Why the route is staged
Full consolidation is a destination, not a step. A stylesheet generated from a design tool must still pass the design guard's 19 source assertions, the claims gate, the cache-bust step and the visual baselines. None of that machinery can read a canvas today, and none of it should be weakened so that it can. So the canvas earns the authoring role in stages, and each stage has an exit test that is not "it feels ready".
| Stage | Direction | Exit test |
| --- | --- | --- |
| **1. Mirror** (built 2026-09-09) | Site to canvas, generated | The canvas covers everything visual, shows the site's real values, and a token change is one command away from being reflected |
| **2. Live with it** | Still site to canvas | Nobody reaches for `design-system.html` or the stylesheet to answer a design question. If they do, the canvas is missing something, and the answer is to widen the canvas, not to advance the stage |
| **3. Authoring moves** | Canvas to site, generated | A generated `css/styles.css` passes the full gate set unedited, twice running |
Stage 3 is where the reverse generator has to exist, and where its output has to be trusted by CI rather than by a person reading a diff. It is the expensive stage. Stages 1 and 2 cost almost nothing and settle whether it is worth paying for.
## 3. Stage 1, as built
`design-canvas/build.py` generates ten artboards from `css/styles.css`, `index.html` and `design-system.html`, and `seed-canvas.mjs` seeds them into a published canvas on three pages.
| Page | Artboards | What it settles |
| --- | --- | --- |
| **Identity** | Foundations, Type, Voice, Logo | The palette and the neutral roles, the three faces and the scale, the tagline and the headline pattern, the lockup and its three grounds |
| **System** | Layout, Motion, Components | The space scale and the container, the durations and eases running live, the buttons, badges, panel, row and nav |
| **Objects** | The mark, The card, Hero | The construction spec and the facet law, the graded editorial column at rest and lifted, the hero composition |
No value is typed into an artboard by hand. `build.py` reads every token out of the `:root` block, lifts each portrait crop and every animation keyframe out of its own rule, extracts both inlinings of the mark verbatim, and derives the facet slot table from the geometry rather than transcribing it. It refuses to build unless it finds 22 facets, an 11/11 hinge partition and exactly two swapped facet slots, so a change to the mark stops the build instead of quietly producing a canvas that disagrees with the page.
Motion and Components are live: the duration dots run, the mark breathes, and hovering a button, a card or the right-hand butterfly does on the canvas what it does on the site.
Change the site, run `python3 build.py`, re-seed, republish. If the canvas ever disagrees with the stylesheet, the stylesheet is right and the canvas is stale; the canvas says so on a sticky note.
Live at https://claude.ai/code/artifact/1d34b86f-8fa6-40ad-9631-fd3b6d3865ac
## 4. What public cost
A Claude Design canvas that declares PNG/PDF export can be shared inside the org only. One without export can be shared by public link. Public was the decision, so export is not declared, and the canvas's Export buttons do nothing. That is the trade, and it is the right way round: a design system nobody outside the repo can open is the problem being solved.
The canvas is published private and has to be set public once, by hand, from its share menu. Nothing in this repo can do that.
## 5. Linking it from plepic.com, and the contradiction in the way
`PRODUCT.md` states that the design system "is public and canonical at /design-system (design-system.html + css/styles.css)". It is not. `.github/workflows/deploy.yml` deletes `design-system.html` from every build, so `/design-system` and `/design-system.html` both return 404 today. The claim has been false for as long as the deploy list has existed.
Consolidation resolves it in the right direction: `/design-system` should reach the canvas, not an un-deleted page. Until that redirect exists, `PRODUCT.md` is making a public claim the site does not honour, which is exactly the class of thing the claims gate was built to stop.
**OPEN:** where plepic.com carries the link. The footer reaches every page and costs nothing; `/about` is where a reader would look for it. Kaido decides.
## 6. What never moves, whatever the stylesheet does
- **The gates.** The CSS that ships is the CSS the design guard, the claims gate and the visual baselines see. A canvas is a source, never a gate.
- **The mark's geometry.** Twenty-two facets, one body, two antennae, one ember. `js/plepic-mark.js` carries no coordinate and a guard fails if one appears. Anything generated inherits that rule; nothing hand-draws a polygon, in either direction.
- **Volatile values.** The canvas carries the words that never change: the tagline, the two positioning lines, the headline pattern. It carries no price, no date, no seat count and no rating, because `scripts/check-claims.mjs` cannot see a canvas and a claim that escapes into one escapes the gate that exists to catch it. The Voice artboard lists what stays in the page instead, and the Hero artboard is a wireframe rather than a screenshot for exactly this reason: the live hero carries four such values, and a screenshot would hide them in pixels.
- **Pages.** Every `.html` file stays hand-authored, and so does `js/crystalline-metamorphosis.js`. The Hero artboard documents the composition and the rules around it; the WebGL mark's geometry and choreography live in that module and cannot become an artboard.
## 7. Drift, while two artefacts exist
Stages 1 and 2 have two artefacts and one truth. `build.py` is deterministic, so the cheap mechanism is a guard that regenerates the artboards and fails on a diff, with `python3 build.py` as the fix. That catches a token change landing in the stylesheet without reaching the canvas.
It does not catch a stale *publish*: seeding and publishing are manual, so the guard can only prove the working files are current. That is still the failure worth catching, because a wrong value reaches the canvas through the working files or not at all.
**Recommendation:** add the guard when stage 2 starts, not now. Today there is one commit and no drift to catch, and a guard added before anyone has changed a token is a guard nobody has seen bite.
## 8. Open
1. Where plepic.com links to the canvas (section 5).
2. What `css/styles.css` becomes, deferred by Kaido until the canvas has been lived with (section 2).
3. Whether the regenerate-and-diff guard lands now or with stage 2 (section 7).
## 9. Superseded on 2026-09-09
| The 2026-09-08 draft said | Now | Why |
| --- | --- | --- |
| Claude Design is a **consumer**; the recommendation is one-way and generated, with the stylesheet canonical | Claude Design is the **home**; the stylesheet is generated from it, eventually | Kaido: the design system should have one home, and it should be the one every instructor can open |
| A React package, generated, committed and CI-checked in this repo | No package. The deliverable is a canvas | A package serves code. The audience is instructors, and it needs a link |
| First slice: tokens and `<PlepicMark>`, ranks 1 and 2 only | First slice: tokens, type, the Card and the mark, as artboards | Ranked by generation cost, the Card was expensive. As an artboard it is markup, so the ranking no longer applies |
| Ranks 3 to 5 deferred; the hero ruled out | The hero is still ruled out | Unchanged. It is a page, not a component |
| **OPEN:** consumer or second home | Decided, above | |
| **OPEN:** components generated from CSS, or hand-written | Moot at stage 1. Returns at stage 3 as "what generates the stylesheet" | |
| **OPEN:** same repo or its own | Same repo. `design-canvas/` holds the generator and the working files | The generator has to read `css/styles.css`, so it lives beside it |
