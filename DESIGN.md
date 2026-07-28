---
name: Plepic Nature-Digital Design System
description: Locked green-on-cream identity for plepic.com, crystalline precision in organic material
colors:
  green-vivid: "#00c638"
  green-brand: "#137b30"
  green-dark: "#0d5822"
  green-light: "#c5f6d3"
  green-surface: "#edfcf1"
  accent: "#e26c45"
  bg-cream: "#faf7f2"
  bg-alt: "#f3efe7"
  surface-white: "#ffffff"
  dark: "#1c1c1a"
  dark-surface: "#262624"
  text-ink: "#1c1c1a"
  text-secondary: "#4a4a45"
  text-muted: "#6b6b60"
  text-on-dark: "#e5e2dc"
  text-on-dark-2: "#a3a39a"
  border: "#e5e2dc"
  border-dark: "#3a3a38"
typography:
  display:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "clamp(3rem, 2.5rem + 3.5vw, 4.8rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "clamp(1.5rem, 1.25rem + 2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "clamp(1.15rem, 1rem + 0.5vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Hanken Grotesk, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "normal"
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  2xl: "16px"
  badge: "20px 4px 16px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
motion:
  duration:
    fast: "150ms"
    base: "300ms"
    settle: "550ms"
    entrance: "700ms"
  easing:
    settle: "cubic-bezier(0.16, 1, 0.3, 1)"
    calm: "ease-in-out"
  patterns:
    crystalline-assembly: "facets scale up from centre and settle into the locked mark on load; symmetric outward stagger; settle easing"
    metamorphosis-refactor: "homepage hero signature: the crystalline caterpillar crawls, cocoons, and unfurls into the locked mark while the synced code line evolves into while(task) { explore → act → verify }; spring physics, 13.6s arc (crawl 4.6 + gather 2.6 + chrysalis 3.0 + unfurl 3.4), plays once 5s after hero boot, desktop motion-enabled only; creature and code are one locked unit"
    wing-breathe: "4s perpetual wing idle, +/-2deg rotate"
    light-shift: "7s brightness-only wave across facets; light catching a crystal, never a glow"
    hero-choreography: "five-step staggered hero entrance, rise + fade"
    scroll-reveal: "intersection-triggered fade + 16px rise"
    hover-lift: "translateY(-3px) + soft shadow, interactive cards only"
    accent-pulse: "3s CTA heartbeat ring (the one accent)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-ink}"
    rounded: "{rounded.md}"
    padding: "0.7rem 1.4rem"
  button-outline:
    textColor: "{colors.green-brand}"
    rounded: "{rounded.md}"
    padding: "0.7rem 1.4rem"
  button-outline-hover:
    backgroundColor: "{colors.green-surface}"
    textColor: "{colors.green-brand}"
  button-ghost:
    textColor: "{colors.green-brand}"
    padding: "0.7rem 0.5rem"
  badge-default:
    backgroundColor: "{colors.green-surface}"
    textColor: "{colors.green-dark}"
    rounded: "{rounded.badge}"
    padding: "0.2rem 0.65rem"
  badge-urgency:
    backgroundColor: "#fdf0eb"
    textColor: "#a3502e"
    rounded: "{rounded.badge}"
    padding: "0.2rem 0.65rem"
  badge-hero:
    backgroundColor: "{colors.green-surface}"
    textColor: "{colors.green-brand}"
    rounded: "{rounded.badge}"
    padding: "0.3rem 0.9rem"
  card-info:
    backgroundColor: "{colors.green-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  panel:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
---

# Design System: Plepic Nature-Digital

## 1. Overview

**Creative North Star: "Curious Play, Epic Growth"**

The tagline is also the name's decoder ring: PLEPIC = PL(ay) + EPIC. "Curious play" names the PL, "Epic growth" names the EPIC.

Play is the saturated half: vivid green dots and antenna tips, the butterfly's swapped wing fills, asymmetric badge corners. Growth is the discipline: one hue (137) at one saturation (73%), AAA body text, full borders, one warm action per viewport. Prove rather than claim: real pseudocode, visible subsidy arithmetic, live contrast ratios on /design-system. Density is calm and editorial: cream canvas, tight groupings, generous separations, asymmetric grids (1.4fr/0.6fr). Light mode only; dark sections are emphasis, never a theme. WCAG AA minimum, CI-enforced; AAA for body text. The pre-2026 sci-fi mech era (cyan, neon, glow, glassmorphism, gradient text) is rejected: if it could be any AI startup's page, it is wrong.

## 2. Colors

### Primary
- **Brand Green** (#137b30): logo, headings, links, outline buttons. AA on cream and white (5.0:1). The default green.
- **Deep Green** (#0d5822): AAA body text (8.1:1) and the butterfly's leaf body. Never a highlight; it disappears at heading sizes.
- **Vivid Green** (#00c638): the play color, S=100% exception. Decorative only on light (dots, icons, chart bars, borders, focus rings); on dark it is text (7.4:1 AAA): headings, links, labels.
- **Light Green** (#c5f6d3): badge fills, borders around tinted panels.
- **Surface Green** (#edfcf1): tinted backgrounds for favored cards and info panels.

### Secondary
- **Ember Orange** (#e26c45): action and urgency, nothing else. CTA buttons (ink text, 5.3:1), urgency badges, the butterfly's head. Hue 15, S=73%.

### Neutral
- **Cream** (#faf7f2): the body canvas, locked.
- **Alt Cream** (#f3efe7): alternating section backgrounds.
- **White** (#ffffff): card and panel surfaces on cream.
- **Ink** (#1c1c1a): default text and the dark section background.
- **Secondary Text** (#4a4a45), **Muted Text** (#6b6b60): supporting copy; #6b6b60 is the floor for text.
- **On-Dark Text** (#e5e2dc): headings and lead lines in dark sections, not paragraphs.
- **On-Dark Body** (#a3a39a): dark-section paragraphs (6.7:1 AA); vivid is emphasis there, not paragraphs.
- **Border** (#e5e2dc), **Dark Border** (#3a3a38).

### Named Rules
**The One Accent Rule.** Exactly one accent-colored element per viewport (CTA button OR urgency badge OR accent dot); the mobile sticky CTA yields; states use opacity or brightness, never accent variants.

**The 73% Rule.** Every green except vivid shares S=73%; vivid's S=100% is the lone decorative exception; new needs are met by existing steps, never new colors.

**The Vivid Text Ban.** #00c638 is never text on a light background (2.5:1); the retired `--green` alias stays retired, name tokens explicitly.

**The Two-Tier Green Rule.** Headings and links get Brand Green (AA); green body text gets Deep Green (AAA); highlights are Brand Green on light, Vivid Green inside `.on-dark`.

## 3. Typography

**Display:** Bitter (Georgia, serif) · **Body:** Hanken Grotesk (-apple-system, sans-serif) · **Label/Mono:** JetBrains Mono (monospace). Warmth in service of authority, never cuteness.

### Hierarchy
Metrics per frontmatter `typography`.
- **Display**: hero headlines only.
- **Headline**: section H2s, at most one green payload phrase (Green Payload Rule).
- **Title**: H3/H4, card and panel headings.
- **Body**: 1rem to 1.1rem, 65 to 75ch line length.
- **Label**: section kickers, spec annotations, trust-bar text; ink on light, Vivid Green inside `.on-dark`, `.label-muted` in Muted Text. The only sanctioned uppercase.

### Named Rules
**The Line-Height Trap Rule.** Body's 1.7 line-height leaks into compact components by inheritance; every compact component (logo, nav links, badges, buttons, labels, code blocks) sets `line-height: normal`.

**The Green Payload Rule.** Headings are near-black ink with at most one green phrase (1 to 3 words) marking the payload, the word carrying the heading's claim; no payload, no green, and roughly a third of headings stay plain. One exception: a definition heading may highlight the whole definition. `.highlight` is Brand Green on light, Vivid Green inside `.on-dark`, never Deep Green (it disappears at heading sizes).

## 4. Elevation

Flat by default: structure from 1px or 1.5px full borders (#e5e2dc light, #3a3a38 dark) and tint fills; depth only as state response or one featured exception per page. The ghost-card pattern (1px border plus wide soft shadow at rest) is prohibited.

### Shadow Vocabulary
- **Code ambient** (`box-shadow: 0 2px 8px rgba(28, 28, 26, 0.04)`): the one resting shadow, under inline code snippets.
- **Hover lift** (`box-shadow: 0 8px 24px rgba(28, 28, 26, 0.06)` with `translateY(-2px)`): cards on hover only.
- **Tooltip** (`box-shadow: 0 8px 24px rgba(28, 28, 26, 0.1)`): floating layers.
- **Featured glow** (`box-shadow: 0 4px 24px rgba(0, 198, 56, 0.1)`): the featured pricing card; at most one per page.
- **Accent pulse** (`box-shadow: 0 0 0 8px rgba(226, 108, 69, 0)` keyframed from 0.3 opacity): the CTA heartbeat, 3s loop.

### Named Rules
**The Flat-By-Default Rule.** A resting element that needs separation gets a border or a tint, never a shadow; shadows are state (hover, floating) or the one featured exception.

## 5. Motion

One signature easing: `--ease-settle` for anything that arrives and lands; `--ease-calm` for anything that loops, so it reads as breathing. Durations: `--dur-fast` (colour, opacity), `--dur-base` (default transition, hover lift), `--dur-settle` (assembly, wing flap), `--dur-entrance` (hero choreography); the `--transition-*` aliases build on these. New motion reaches for a token, never a raw value.

### Named Patterns
Definitions are tokenized in the frontmatter (`motion.patterns`). Beyond those: Crystalline Assembly staggers symmetrically so both wings' Nth facets arrive together, body outward, ember head and vivid antenna tips last, ~1.3s; Wing-Breathe starts only after the assembly; Hero Choreography's five steps are badge, headline, subhead, CTA, qualifier.

### The Metamorphosis Refactor (signature)

Developer becomes agentic engineer, told twice at once: the caterpillar becomes the butterfly while the code line beneath evolves into `while(task) { explore → act → verify }`. The synced code line is what makes the arc a domain claim instead of a transformation cliché.

**Trigger.** The hero mounts at rest; a single 5000ms timer after module boot fires one `replay()`; the arc plays exactly once. No scroll trigger, no auto-loop.

**Movements.** Crawl 4.6s, gather 2.6s, chrysalis 3.0s, unfurl 3.4s, then rest; 13.6s. The 22 facets are constant; matter reorganizes. Motion is spring forces, never tweens; the feel lives in the module's spring constants. A deadband snap and shader rest gate land the rest pose byte-exact on the locked mark; rest then breathes per Wing-Breathe and Light-Shift.

**Code sync.** The code block derives every beat from the module's phase clock (`phaseInfo()`), never wall clock, so creature and code cannot desync. Crawl types the loop body; gather and chrysalis hold it dimmed, cursor frozen; unfurl types `while(task) `; rest holds the canonical line.

**Gating and fallback (as shipped).** Reduced motion, viewport at or under 900px, Save-Data, deviceMemory under 2, or missing WebGL2: no download, static poster plus finished line. Init failure, GPU context loss, sustained slow frames: same fallback, never freezing mid-refactor. The render loop pauses offscreen and on hidden tabs; loads over 2.5s mount at rest.

**Locked assets.** `js/crystalline-metamorphosis.js` (physics rig and choreography), the `index.html` hero (stage, inline poster SVG, Refactor block, gate script), `metamorphosis-hero.html` (lab reference: full arc on load, replay control), `docs/metamorphosis-hero-prompt.md` (design intent), `tests/metamorphosis.spec.ts` (byte-exact rest pose, reduced-motion poster, code resolution, DPR clamps, offscreen pause, teardown).

**Rules.** (a) The animation and its synced code block are one locked unit: never ship or retime one side alone. (b) The sequence resolves to the locked mark per the Mark-Motion Rule.

Open follow-up: a static or small-viewport telling of the story; the pattern reaches desktop motion-enabled visitors only.

### Named Rules
**The Mark-Motion Rule.** Choreographed motion that resolves to the locked static mark is sanctioned; static effects (glow, gradient, drop-shadow, opacity-dimmed or outline-only wings) stay banned. Motion animates the mark, never restyles it.

**The Reduced-Motion Rule.** Every animation has a `prefers-reduced-motion: reduce` branch that lands on the static end state instantly; shipping without one is a defect, not a polish item.

## 6. Components

### Buttons
Colors and padding per frontmatter `components`.
- **Sizes:** 10px radius default, 12px `.btn-lg` (heroes), 8px `.btn-sm` (nav, dense rows); 1.5px border slot on all variants so sizes never shift.
- **Primary:** weight 600; one per viewport, no exceptions.
- **Outline:** on dark, border and text switch to Vivid Green.
- **Ghost:** underlined text link with arrow.
- **Hover / Focus:** `filter: brightness(0.92)` on fills, 150ms; focus ring 2px Vivid Green outline offset 2px.
- **Pairing:** heroes pair primary + ghost; two solid buttons side by side are prohibited; outline only where no primary shares the row.

### Badges
Fills per frontmatter; the asymmetric radius (20px 4px 16px) is a locked signature.
- **Default:** Light Green border, pulsing Vivid Green dot.
- **Urgency:** Ember dot; counts as the viewport's accent.
- **Hero variant** (`.badge-base`): same anatomy, animated dot; one per hero.

### Cards / Containers
- **Corners:** panels 14px, content cards up to 16px, never beyond.
- **Background:** white on cream, cream on white, Surface Green for the favored option (Light Green border), ink via `.on-dark`.
- **Reference-page grammar:** design-system.html presents specimens in white panels; a cream panel appears there only as the demonstrated variant on a white surface.
- **Border:** always a full 1px border; side-stripe accents prohibited. No shadow at rest; hover lift on interactive cards only.
- **Padding:** 32px panels, 16px compact info cards.

### Inputs / Fields
No forms by design (conversion via external links). Any future input inherits the panel grammar: white fill, 1px border, 10px radius, focus ring per buttons.

### Navigation
Fixed header, frosted cream (rgba(250,247,242,0.9) + 12px blur), bottom border on scroll; lockup left, text links + green outline CTA right. Mobile: hamburger to full overlay, Escape closes. Links weight 500; nav sets `line-height: normal`.

### Logo & Wordmark (signature)
- **Wordmark** (`.logo-wordmark`): "Plepic" in Bitter 600, 0.01em tracking, Brand Green (#137b30); Vivid Green inside `.on-dark`, ink on `.on-brand`. Domain or marketing contexts read "Plepic.com" with ".com" in Secondary Text (#4a4a45).
- **Lockup** (`.logo-lockup`): wordmark + butterfly, `gap: 0.5rem`, vertically centered; canonical order is wordmark first, butterfly to the right. Stacked variant (`.logo-lockup--stacked`, butterfly above via `column-reverse`) for square or centered placements such as social cards.
- **Mark sizes:** two locked cuts. The 22-facet master at 48px and above (heroes, posters, downloads); below 48px (nav lockups, favicon, compact badges) the 8-facet small mark from /design-system Section 8: same outer silhouette from merged master facets, no antennae, head r=12, `shape-rendering="geometricPrecision"`. Both locked; copy verbatim, never re-derive.
- **Tagline:** the canonical on-screen form is exactly `Curious play. Epic growth.` (sentence case, two periods); never re-case or re-punctuate. The title-case form survives only as the Section 1 North Star in prose.

### Pull Quote (signature)
Bitter italic 1.35rem, ink, max 56ch, 7px Vivid Green dot before the cite. No border rules, no background.

### Code Snippet (signature)
JetBrains Mono 0.8rem, Deep Green on white, 8px radius, 1px border, the one ambient shadow. Loop pseudocode `while(task) { explore → act → verify }`. Canonical verbs (2026-07-08): **explore** (only an agent explores; scripts fetch) and **verify** (what separates an agent from blind automation).

### Sticky CTA (mobile)
Bottom-fixed frosted bar with a full-width primary button; below 768px only; yields whenever another primary CTA is on screen (One Accent Rule, enforced in JS).

## 7. Do's and Don'ts

The named rules above are the canon. Not stated elsewhere:
- **Do** copy the butterfly SVG verbatim from /design-system Section 8; geometry, facet colors, and the slot-6/7 fill swap are locked.
- **Don't** add hero-metric stat-card templates, centered-everything desktop layouts, or all-caps headings (mono labels and trust bar excepted).
- **Don't** use em-dashes in customer-facing copy; periods, commas, colons.
- **Don't** recolor, re-facet, mirror, or add static effects to the butterfly mark. Sanctioned: the locked 8-facet small mark below 48px, the complete solid mark as a low-opacity ambient watermark, and motion per the Mark-Motion Rule.
