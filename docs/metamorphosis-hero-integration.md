# Crystalline Metamorphosis hero — integration note

Live demo: `/metamorphosis-hero.html` (mirrors the production hero; noindex).
Spec: [metamorphosis-hero-prompt.md](metamorphosis-hero-prompt.md). CI: `tests/metamorphosis.spec.ts`.

## Mount

```html
<script type="importmap">
  { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js" } }
</script>

<div class="meta-stage" id="metaStage">
  <div class="meta-poster" aria-hidden="true"><!-- exact mark SVG, geometricPrecision --></div>
</div>

<script type="module">
  import { init } from '/js/crystalline-metamorphosis.js';
  const hero = init(document.getElementById('metaStage'), {
    onLive() { stage.classList.add('is-live'); },   // cross-fade poster → canvas
    onFallback(reason) { /* poster stays; optional telemetry */ },
  });
  // hero.replay()  — explicit user trigger only; no auto-replay
  // hero.destroy() — full GPU + listener teardown (route change, one-shot reveal)
</script>
```

Copy `.meta-stage` / `.meta-poster` CSS from the demo page. Stage aspect is 32/23;
the poster svg is 66.67% of stage height, centered, so the poster and the WebGL
rest pose align pixel-for-pixel at swap.

## DOM/ARIA contract

- The canvas is `aria-hidden="true"`, `pointer-events: none`, opaque cream. It
  never blocks hero text or CTA; the module touches no DOM outside the stage.
- Poster is visible by default (correct with zero JS). `onLive()` fires one frame
  after the first presented WebGL frame; only then hide the poster.
- Fallback paths that keep the poster: `prefers-reduced-motion` (never runs the
  timeline), no WebGL2, `saveData`, `deviceMemory < 2`, renderer init failure,
  context loss, sustained real frame cost over budget (quality tier 4).
- Slow loads (>2.5s to init) skip the story and settle directly at rest, so the
  swap never regresses butterfly → caterpillar.

## Weight and budget

Pinned `three@0.185.1` module ≈ 87 KB gzip (import map, no addons, cacheable)
plus this module ≈ 19 KB gzip unminified (comments included; zero-build site).
The host gates BEFORE the dynamic import, so reduced-motion / saveData / weak
devices download none of it. Zero external assets — geometry and materials are
fully procedural. Per frame: physics ≈ 0.15 ms + geometry ≈ 0.13 ms CPU, 8 draw
calls, ~1,100 dynamic verts, no postprocessing. DPR ≤ 2 (≤ 1.5 coarse pointers).
Loop pauses offscreen (IntersectionObserver) and on hidden tabs.

Quality tiers (auto step-down, never up): T0 full → T1 DPR×0.8 → T2 DPR×0.66 +
1 physics substep + dispersion off → T3 tremor + light-sweep off → T4 poster.
Scheduling gaps ≥ 80 ms (occluded window, background tab) never count toward
demotion. Live probe: `window.__metaHero._state()` on the demo page.

## Color exactness (locked)

`THREE.ColorManagement.enabled = false`, `NoToneMapping`, raw ShaderMaterials
only, colors as normalized Uint8 attributes: a settled face-on facet renders the
exact locked hex (CI asserts byte-equality at all 22 facet centroids + head +
tips + body + antenna blend + background). Do not add tone mapping, lighting
libraries, or built-in materials to this scene without re-running that gate.

Spec deviations, accepted for pixel-exact rest (DoD #2 outranks per the spec's
own sacrifice order): NoToneMapping instead of ACES; shallow un-beveled prisms
(depth 5, sides pre-darkened toward deep green); poster `geometricPrecision`
(not `crispEdges`) so the swap is invisible; contact shadow uses DESIGN.md's
shadow ink `rgba(28,28,26,·)`; gait wave travels tail→head (head leads); rest
breathing is a post-spring display rotation (asymmetric shaped sine), not the
pressure springs idling — springs must fully settle for the byte-exact gate.

The host's `onFallback` must remove `is-live` (restoring the poster): after a
tier-4 perf demotion or WebGL context loss the canvas is dead, and a dead
canvas must never stay frontmost.
