# Claude Design canvas
The Plepic design system as a published Claude Design canvas. Live at https://claude.ai/code/artifact/1d34b86f-8fa6-40ad-9631-fd3b6d3865ac and scoped by `docs/specs/2026-09-08-claude-design-sync.md`.
**The stylesheet is still the truth.** Nothing in an artboard is typed by hand. `build.py` reads every token out of the `:root` block in `css/styles.css`, lifts each portrait transform out of its own rule, and extracts the mark's SVG verbatim from `index.html`. If the canvas disagrees with the stylesheet, the canvas is stale.
## To update the canvas after a design change
1. Run `python3 design-canvas/build.py`. It rewrites the four `.dc.html` artboards and `canvas.json`.
2. Seed a fresh page. The template lives in the bundled `design` skill; the command is one line:
   ```
   node "<design skill dir>/seed-canvas.mjs" \
     --template "<design skill dir>/payload.template.html" \
     --out plepic-design-system.html --title "Plepic Design System" \
     --artboard Main.dc.html --artboard Type.dc.html \
     --artboard Card.dc.html --artboard Mark.dc.html \
     --image joosep.jpg --image kaido.jpg --image vootele.jpg \
     --canvas canvas.json
   ```
3. Check it: `node "<design skill dir>/seed-canvas.mjs" --check plepic-design-system.html`.
4. Republish to the same artifact URL. Publishing without the URL creates a second canvas, which is the one failure this whole spec exists to prevent.
## Two things that are deliberate
- **No PNG/PDF export.** A canvas that declares export can be shared inside the org only. The canvas is public, so export is not declared and its Export buttons do nothing.
- **The seeded page is not committed.** It is 2 MB of editor payload. `.gitignore` holds it out; these sources rebuild it.
## Frame heights
`canvas.json` sets a fixed frame per artboard, and surplus frame is harmless while clipping is not. After a content change, measure the real height at 1120px wide and give the frame about 5 percent of slack.
