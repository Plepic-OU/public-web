# Prompt: Plepic Crystalline Metamorphosis — 3D Hero

A generation prompt for a production-grade, WebGL/Three.js hero animation: a crystalline caterpillar that crawls, cocoons, and unfurls into the Plepic butterfly logo, then breathes at rest. Feed this file to a strong coding model to generate the animation. It is written to the caliber of ambitious Three.js scene prompts, but the subject is a **brand hero**, not an explorable world, so every ambition is bought with a strict performance and integration budget.

The single most important requirement is **performance**: this runs behind hero text on **every page load** of a zero-build static site. A beautiful animation that drops frames, blocks paint, or bloats the bundle is a failure. Ambition is spent only where the frame budget allows it.

---

## 1. The vision

A single shard of green crystal is alive. It begins as a **caterpillar** assembled from faceted triangular crystal segments, low and heavy, crawling with a real muscular inchworm gait across a warm cream void. Light travels across its facets like a slow wave catching cut gemstone. It gathers, curls, and hangs in a moment of held tension: a **chrysalis**, still but breathing. Then, under visible fluid pressure, it **unfurls**: wings emerge crumpled and small, pump full, tremble, bloom slightly past their final shape, and settle. At rest it becomes the **exact Plepic butterfly mark**, breathing gently, catching light. The whole arc reads as one continuous act of transformation, biological and inevitable, never mechanical.

This is the literal expression of Plepic's doctrine: *Curious play, epic growth.* The caterpillar is the raw developer; the butterfly is the same craftsman transformed by agentic tooling. **The triangles are the constant** through the whole journey: the same crystal facets, their edges and corners evolving. Nothing appears or vanishes; matter reorganizes.

The first frame must already be alive. No loading screen, no spinner, no intro card. The canvas mounts and the creature is already there, mid-breath or mid-crawl.

---

## 2. Hard brand locks (non-negotiable)

These come from the Plepic design system (`DESIGN.md`, `design-system.html`). The animation must honor them exactly. A visually stunning piece that violates a lock is rejected.

**Palette — use ONLY these values. No other colors exist in this scene.**

| Role | Hex | Use |
| --- | --- | --- |
| Vivid green | `#00c638` | The play color; brightest facets, light-catch highlights, antenna tips |
| Brand green | `#137b30` | Mid facets |
| Deep green | `#0d5822` | Deep facets, body, shadow-side of crystal |
| Ember orange | `#e26c45` | The head only. Exactly one warm element. Never a second. |
| Cream | `#faf7f2` | The background void. The only background. |
| Ink | `#1c1c1a` | If any text/UI is needed |

No cyan, no neon, no gradient-on-text, no rainbow refraction, no glow bloom that shifts hue. Refraction and light-play must stay **within this green family** — dispersion may vary brightness and the three greens, never introduce a new hue. Warmth in the scene comes only from the single ember head and the cream void.

**The resting state IS the locked logo.** When the animation settles, the silhouette and facet layout must resolve to the exact Plepic butterfly mark: 22 wing facets (11 mirrored pairs), a leaf-body, two antennae with vivid tips, an ember head. The canonical 2D facet coordinates (viewBox `0 0 300 280`) are provided in Appendix A and are the ground truth for the settled pose. The 3D crystal may have depth and volume during motion, but at rest, viewed head-on, it must read as that mark, pixel-faithful in silhouette and facet color placement.

**Geometry doctrine:** triangles are the atomic shape. The caterpillar, the chrysalis, and the butterfly are all built from the **same set of triangular crystal facets**, continuously reshaping. Never fade one shape out and another in.

**No em-dashes in any visible copy. Light mode only** (cream background, this is not a dark scene). The mark is **never** recolored, mirrored, or given a foreign glow; choreographed motion resolving to the locked mark is the one sanctioned way to animate it.

---

## 3. The four movements (motion doctrine: forces, not tweens)

Animate **physical forces acting on mass over time**, never interpolation between endpoints. The prior 2D attempt failed precisely because it tweened corner positions along paths; it read as dead. Every movement below must be driven by a simulated system (spring, pressure, wave, soft-body constraint), and the logo is where the physics **settles**, not a target dragged toward.

**Movement I — Crawl (the caterpillar).** A soft-bodied, weighted inchworm gait. A muscular contraction wave travels head-to-tail: segments compress and grip (prolegs anchor), then release and extend, and the body advances as the *net* of the wave, not on a separate position track. The crystal facets in the compressed segment visibly deform (edges shorten) and catch light differently as they tilt. Weight and follow-through: the head leads, the body drags, the tail settles last. Duration: a few seconds of legible crawling before it gathers.

**Movement II — Chrysalis (held tension).** The segments draw together and the form curls and hangs. This is **not a pause with nothing happening**: a hanging chrysalis has a faint pendular sway, a slow internal breathing pulse, and an occasional micro-twitch of stored energy. Stillness rendered as held tension, never a frozen frame. A subtle darkening/consolidation of facets, light narrowing to a seam. Short but felt.

**Movement III — Unfurl (the butterfly).** The core moment. Wings emerge **crumpled and small**, pressed near the body, then inflate under simulated **fluid (hemolymph) pressure**: a per-wing pressure scalar rising via an under-damped spring, so the wing fills fast then slows against resistance, **overshoots slightly past full, then relaxes** (the unmistakable signature of pressure filling, impossible with a tween). Wing-root facets lead, tip facets lag (root-to-tip vein inflation). **The two wings are asymmetric in time**: one leads the other by a beat; they never move in lockstep. **Tremor** scaled by the rate of pressure change: high-frequency, low-amplitude jitter that is strongest while filling and calms to near-zero at rest, perceptible as life but never as shaking. Forewings fill before hindwings.

**Movement IV — Rest (breathing at the logo).** The settled butterfly is **never geometrically frozen**. It breathes: a slow, asymmetric open-close of the wings (open slow, close a touch faster), each wing phase-offset, driven by the same spring system idling, not a rigid rotate keyframe. A slow **light-shift** travels across the facets every several seconds (brightness only, light catching a crystal, never a colored glow). The antennae carry the faintest idle. This is the state the hero sits in indefinitely.

**Loop behavior:** after the first full metamorphosis on load, the piece rests in Movement IV (breathing butterfly) indefinitely. Do **not** auto-replay the full crawl on a loop (it would distract from hero copy). Optionally allow a gentle, occasional full replay on a long timer (e.g. once every 60–90s) or on explicit user trigger only. Rest is the default resting state.

---

## 4. True-3D crystalline rendering

The facets are **real 3D crystal**, not flat shapes with a drop shadow.

- Each facet is a beveled triangular prism / cut-gem facet with genuine depth, so the creature has volume and the light rakes across real surfaces. At rest, head-on, the depth reads as the flat logo; in motion, the depth is visible as the form turns and light travels.
- **Materials over geometry.** Invest in a crystal/gem material: internal facet reflection, a controlled refraction/dispersion kept strictly within the green family, a subtle Fresnel edge-brightening (toward vivid green at grazing angles), and a slow specular travel (the light-shift). The gemstone read comes from the material and lighting, not from polygon count.
- **Lighting:** a warm key consistent with the cream void, a cool green fill from internal bounce, and one slow-moving specular that produces the light-shift wave. ACES-Filmic tone mapping. No hue-shifting bloom; if bloom is used, it stays within green/cream luminance and is extremely restrained.
- **Depth of field:** optional, very subtle, only if it survives the frame budget. Silhouette clarity beats bokeh.
- **The ember head** is the single warm accent: a small ember-orange gem, slightly emissive, the one warm point in an all-green-and-cream frame. Never add a second warm element.

The camera is essentially **locked head-on** (this is a logo, it must read as the mark), with at most a very slight, slow parallax drift or breathing dolly. This is not an orbit-explorable scene. No orbit controls, no user camera.

---

## 5. PERFORMANCE — the load-bearing requirement

This is the section that decides success. The animation integrates into **plepic.com**: a static, zero-build HTML/CSS site (no bundler, no framework, no npm at runtime) with a strict design system, and it runs in the **hero of pages that load on every visit**, including from paid ads and on mobile. Treat every millisecond and every kilobyte as scarce.

**Non-negotiable budget:**

- **60 fps** on a modern laptop; **stay at or above 30 fps on a mid-range 2023 phone.** If the budget is threatened, sacrifice effects (DoF, bloom, refraction samples, tremor detail) **before** silhouette fidelity or the correctness of the resting logo.
- **`devicePixelRatio` clamped to 2** (ideally to `min(devicePixelRatio, 1.5)` on mobile). Never render at native DPR on high-density displays.
- **Adaptive quality:** measure frame time and step down quality tiers automatically (disable DoF → reduce refraction → reduce shadow res → drop tremor sub-steps → simplify material) to hold the frame target. Ship a documented tier ladder.
- **Pause when offscreen and when the tab is hidden.** Use `IntersectionObserver` to stop the render loop when the hero scrolls out of view, and the Page Visibility API to pause on hidden tabs. The render loop must not run when nothing is visible.
- **Total transferred weight budget:** the animation (library + code) must be lean. Prefer a **pinned, import-mapped Three.js** loaded as an ES module (`<script type="importmap">` mapping `three` and `three/addons/` to one pinned version), with **only the modules actually used**. No bundler, no build step, so it drops into the static site as-is. Do not pull in heavy addon stacks you do not use. State the approximate transferred size and justify it.
- **Procedural only.** No external model files, textures, HDRIs, or image assets. All geometry and materials generated in code. This keeps the payload tiny and the piece self-contained and reproducible.
- **No layout jank / no main-thread blocking on load.** The canvas must not delay first paint of the hero text. Hero copy and CTA render immediately; the canvas initializes without blocking, and if WebGL is slow to come up, the poster fallback (below) shows first.
- **Memory discipline:** dispose geometries/materials/render targets correctly; no per-frame allocations in the render loop; reuse buffers. If an occasional full replay is enabled, it must not leak.

**Reduced motion and fallback (required, not optional):**

- Honor `prefers-reduced-motion: reduce`: **do not run the physics timeline.** Render the **static, settled butterfly logo** immediately (or show the poster image) and stop. Reduced motion lands on the finished mark, never on a blank or degraded frame.
- **Static poster fallback:** provide a crisp static render of the resting butterfly (SVG or a pre-rendered image using the exact locked geometry) that shows when WebGL is unavailable, when the device fails a capability check, or before the canvas is ready. The hero must look correct and on-brand with zero JavaScript / no WebGL.
- **Capability gating:** detect WebGL2 (fallback WebGL1 or poster), detect low-power / `saveData`, and on failure serve the poster instead of a janky 3D scene. A low-end device gets the beautiful static mark, not a slideshow.

**Integration constraints:**

- Self-contained: one JS module (plus the import map) and a `<canvas>` that mounts into a hero container. It must layer **behind or beside hero text** without interfering with text legibility, links, or the CTA. Text and CTA stay fully accessible and clickable; the canvas is `aria-hidden`, `pointer-events: none` unless interaction is explicitly added later.
- The canvas background is the cream void (`#faf7f2`) so it blends seamlessly into the page; alternatively a transparent canvas over the cream section. Match the page background exactly.
- Respect the existing design system: this piece adds **no new colors, no new fonts**. If any label/UI is shown (it generally should not be), it uses the system tokens.
- Ship a documented `init()` / `destroy()` so the site can mount and fully tear down the animation (e.g. after a one-time signature reveal, or on route change), releasing all GPU resources.

---

## 6. Deliverable and structure

- A **single self-contained implementation**: an HTML file (or a JS module plus a minimal HTML host) using import-mapped Three.js, no build step, that drops into a static site. Inline or clearly separated, but zero external assets.
- Clear separation of concerns: geometry/facet generation, the physics rig (springs, pressure, gait wave, noise), the material/lighting, the render loop with adaptive quality, and the integration shell (mount, IntersectionObserver, visibility, reduced-motion, poster fallback).
- **Documented quality tiers** and the measured frame cost of each major effect, so the piece can be tuned to the real budget.
- A short **integration note**: how to mount it into a hero container, the DOM/ARIA contract, and how to swap in the static poster.

---

## 7. Definition of done

The piece succeeds only if all of these hold:

1. **It reads as alive.** A viewer watching the unfurl feels fluid pressure inflating a real wing (crumpled → pump → overshoot → tremble → settle, wings asymmetric in time). No moment reads as tween/interpolation. This is judged by watching the motion, not by inspecting endpoints.
2. **It resolves to the exact locked butterfly mark** at rest (silhouette, 22 facets, colors, ember head, antennae with vivid tips), pixel-faithful head-on.
3. **It holds the frame budget:** 60 fps desktop, ≥30 fps mid-range mobile, DPR-clamped, offscreen/hidden paused, adaptive quality proven.
4. **It integrates cleanly:** self-contained, import-mapped Three.js, no build step, no external assets, lean transferred size, hero text stays legible and interactive, canvas is `aria-hidden` and non-blocking.
5. **It degrades gracefully:** reduced-motion and no-WebGL both land on a crisp on-brand static butterfly poster, never a blank or janky frame.
6. **It stays on-brand:** only the six palette values, green-only refraction, one ember accent, cream void, no banned effects (cyan, neon, hue-shift bloom, gradient text, foreign glow on the mark).

Sacrifice order when the budget is tight: drop DoF, then bloom, then refraction samples, then tremor sub-steps, then shadow resolution, then facet bevel depth. **Never** sacrifice: the resting logo's correctness, silhouette clarity, the palette, or 30 fps on mobile.

---

## Appendix A — Canonical settled butterfly geometry (ground truth for the resting pose)

2D facet coordinates, viewBox `0 0 300 280`. The 3D crystal must resolve to this layout head-on. Each line: three triangle vertices, then the facet fill color. Left wing = 11 facets, right wing = 11 facets (mirror).

**Left wing**
```
147,105 110,68 55,48    #0d5822
147,105 55,48 20,72     #00c638
147,105 20,72 15,108    #137b30
147,130 147,105 15,108  #00c638
147,130 15,108 28,150   #0d5822
147,165 147,130 28,150  #00c638
147,165 28,150 50,178   #137b30
147,178 50,178 82,195   #0d5822
147,178 82,195 75,220   #00c638
147,195 75,220 100,240  #137b30
147,195 100,240 135,232 #0d5822
```

**Right wing**
```
153,105 190,68 245,48   #0d5822
153,105 245,48 280,72   #00c638
153,105 280,72 285,108  #137b30
153,130 153,105 285,108 #00c638
153,130 285,108 272,150 #0d5822
153,165 153,130 272,150 #00c638
153,165 272,150 250,178 #0d5822
153,178 250,178 218,195 #137b30
153,178 218,195 225,220 #00c638
153,195 225,220 200,240 #137b30
153,195 200,240 165,232 #0d5822
```

**Body:** `path M150,92 C158,120 158,150 150,200 C142,150 142,120 150,92 Z` fill `#0d5822`
**Antennae:** `M150,86 C146,72 140,55 136,42` and mirror `M150,86 C154,72 160,55 164,42`, stroke `#0d5822` width 1.8, opacity 0.7
**Antenna tips:** circles r=3.5 at `136,41` and `164,41`, fill `#00c638`
**Head:** circle r=8 at `150,90`, fill `#e26c45`

All polygon strokes equal their fill, width 0.5. `shape-rendering: crispEdges` for the flat poster.

---

## Appendix B — Motion tokens (from the Plepic design system, for continuity)

If the 3D easing needs to echo the site's 2D motion language:

- Settle easing: `cubic-bezier(0.16, 1, 0.3, 1)` (arrives fast, lands soft, like a crystal locking into place)
- Calm/idle easing: `ease-in-out`
- Durations: fast 150ms, base 300ms, settle 550ms, entrance 700ms
- Named patterns to honor in spirit: crystalline-assembly (facets settle into the locked mark), wing-breathe (perpetual gentle wing idle), light-shift (slow brightness-only wave across facets, never a glow)

These are the 2D reference values; the 3D physics rig sets its own spring constants, but the *feel* (fast arrival, soft settle, calm idle, light travelling across crystal) should carry over.
