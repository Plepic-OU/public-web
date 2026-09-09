# Claude Design canvas
The Plepic design system as a published Claude Design canvas. Live at https://claude.ai/code/artifact/1d34b86f-8fa6-40ad-9631-fd3b6d3865ac and scoped by `docs/specs/2026-09-08-claude-design-sync.md`.
Ten artboards on three pages. **Identity:** Foundations, Type, Voice, Logo. **System:** Layout, Motion, Components. **Objects:** Mark, Card, Hero.
**The repository is still the truth.** Nothing in an artboard is typed by hand. `build.py` reads every token out of the `:root` block in `css/styles.css`, lifts each portrait crop and every animation keyframe out of its own rule, extracts both inlinings of the mark verbatim from `index.html`, and derives the facet slot table from the geometry. If the canvas disagrees with the stylesheet, the canvas is stale.
## The build refuses rather than lies
`build.py` stops if the mark is not 22 facets, if the hinge partition is not 11/11, or if the number of swapped facet slots is not two. A change to the mark therefore fails the build instead of producing a canvas that quietly disagrees with the page. Add a check here whenever you add a claim that a value could falsify.
## To update the canvas after a design change
1. Run `python3 design-canvas/build.py`. It rewrites the ten `.dc.html` artboards and `canvas.json`.
2. Seed a fresh page. The template lives in the bundled `design` skill:
   ```
   node "<design skill dir>/seed-canvas.mjs" \
     --template "<design skill dir>/payload.template.html" \
     --out plepic-design-system.html --title "Plepic Design System" \
     --artboard Main.dc.html   --artboard Type.dc.html \
     --artboard Voice.dc.html  --artboard Logo.dc.html \
     --artboard Layout.dc.html --artboard Motion.dc.html \
     --artboard Components.dc.html \
     --artboard Mark.dc.html   --artboard Card.dc.html \
     --artboard Hero.dc.html \
     --image joosep.jpg --image kaido.jpg --image vootele.jpg \
     --canvas canvas.json
   ```
3. Check it: `node "<design skill dir>/seed-canvas.mjs" --check plepic-design-system.html`.
4. Republish to the same artifact URL. Publishing without the URL creates a second canvas, which is the one failure this whole spec exists to prevent.
## Four things that are deliberate
- **No PNG/PDF export.** A canvas that declares export can be shared inside the org only. The canvas is public, so export is not declared and its Export buttons do nothing.
- **The seeded page is not committed.** It is about 2.6 MB of editor payload. `.gitignore` holds it out; these sources rebuild it.
- **No volatile values.** No artboard carries a price, a date, a seat count or a rating. The Hero artboard is a wireframe for this reason: the live hero carries four of them, and a screenshot would hide them in pixels where the claims gate cannot see them.
- **Ligatures are off.** JetBrains Mono ligates `--` into a single long dash, which silently renames every token on the canvas.
## Frame heights
`canvas.json` sets a fixed frame per artboard, and surplus frame is harmless while clipping is not. After a content change, measure the real height at 1120px wide and give the frame about five percent of slack.
