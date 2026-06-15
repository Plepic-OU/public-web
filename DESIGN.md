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
  border: "#e5e2dc"
  border-dark: "#3a3a38"
typography:
  display:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontSize: "clamp(3rem, 2.5rem + 3.5vw, 4.8rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontSize: "clamp(1.5rem, 1.25rem + 2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontSize: "clamp(1.15rem, 1rem + 0.5vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, sans-serif"
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

The tagline is the design doctrine. Curious play is the saturated half: the vivid green that flashes in dots, antenna tips, and dark-mode headings; the crystalline butterfly with its deliberately asymmetric wing; the asymmetric badge corners; the console easter egg. Epic growth is the grown-up half: a single locked hue (137) at a single system saturation (73%), AAA body text, full borders instead of decoration, one warm action per viewport. Every surface holds both. Play without the discipline is noise; discipline without the play is any other B2B site.

The audience is developers and CTOs who smell hype instantly, so the system proves rather than claims: real pseudocode in heroes, visible subsidy arithmetic, contrast ratios computed live on the public reference page (/design-system). Density is calm and editorial: cream canvas, generous section spacing with tight internal groupings, asymmetric grids (1.4fr/0.6fr) over 50/50.

Motion follows the same split: a choreographed hero entrance and butterfly wing-breathe carry the play; everything else is restrained state response (300ms ease-out transitions, scroll reveals). Every animation has a `prefers-reduced-motion` alternative; that is not optional. This system explicitly rejects its own pre-2026 sci-fi mech era (cyan, neon, glow, glassmorphism, gradient text) and the generic AI-startup template look: if it could be any AI startup's page, it is wrong.

**Key Characteristics:**
- One green hue (137) in five locked steps; one orange accent, one per viewport
- Slab-serif display warmth over geometric sans body
- Flat surfaces, full borders, tint fills; shadows only as state response
- Light mode only; dark sections are emphasis, never a theme
- WCAG AA minimum, enforced in CI; AAA for body text
- The crystalline butterfly mark is locked geometry, never recolored or re-faceted

## 2. Colors

A single-hue green system on a warm cream canvas, with one split-complementary orange that is rationed like a scarce resource.

### Primary
- **Brand Green** (#137b30): the identity workhorse. Logo, headings, links, labels, outline buttons. AA on cream and white (5.0:1). When in doubt, this is the green.
- **Deep Green** (#0d5822): high-contrast body text and the butterfly's leaf body. AAA on cream and white (8.1:1). Never use it as a highlight; at heading sizes it is indistinguishable from ink.
- **Vivid Green** (#00c638): the play color, S=100% exception. Decorative only on light backgrounds: dots, icons, chart bars, borders, focus rings. On dark it is promoted to text duty (7.4:1 AAA): headings, links, labels.
- **Light Green** (#c5f6d3): badge fills and borders around tinted panels.
- **Surface Green** (#edfcf1): tinted backgrounds for favored cards and info panels.

### Secondary
- **Ember Orange** (#e26c45): action and urgency, nothing else. CTA buttons (with dark ink text, 5.3:1), urgency badges, the butterfly's head. Hue 15, saturation-matched to the greens at 73%.

### Neutral
- **Cream** (#faf7f2): the body canvas. Locked brand decision; warmth lives here, in the type, and in the mark.
- **Alt Cream** (#f3efe7): alternating section backgrounds.
- **White** (#ffffff): card and panel surfaces on cream.
- **Ink** (#1c1c1a): default text and the dark section background.
- **Secondary Text** (#4a4a45) and **Muted Text** (#6b6b60): supporting copy; #6b6b60 is the floor, nothing lighter may carry text.
- **On-Dark Text** (#e5e2dc): body text inside dark sections; vivid green is for emphasis there, not paragraphs.
- **Border** (#e5e2dc) and **Dark Border** (#3a3a38): the structural lines that replace shadows.

### Named Rules
**The One Accent Rule.** Exactly one accent-colored element per viewport: a CTA button OR an urgency badge OR an accent dot, never two. The mobile sticky CTA yields (hides) whenever another primary action is on screen. No accent hover variants; states use opacity or brightness.

**The 73% Rule.** Every green except vivid shares S=73%. Vivid's S=100% is the lone decorative exception. New colors do not enter the system; new needs are met by the existing steps.

**The Vivid Text Ban.** #00c638 is never text on a light background (2.5:1). The retired `--green` alias pointed here; always name tokens explicitly.

**The Two-Tier Green Rule.** Headings and links get Brand Green (AA); body text that needs green gets Deep Green (AAA). Highlights use Brand Green on light, Vivid Green inside `.on-dark`.

## 3. Typography

**Display Font:** Zilla Slab (with Georgia, serif)
**Body Font:** Plus Jakarta Sans (with -apple-system, sans-serif)
**Label/Mono Font:** JetBrains Mono (with monospace)

**Character:** A warm slab serif gives the headings their grounded, bookish authority; the geometric sans keeps body copy modern and quiet; the mono carries the developer-native voice in labels and code. Warmth in service of authority, never cuteness.

### Hierarchy
- **Display** (700, clamp(3rem, 2.5rem + 3.5vw, 4.8rem), 1.05, -0.025em): hero headlines only.
- **Headline** (700, clamp(1.5rem, 1.25rem + 2vw, 2.25rem), 1.15): section H2s, often carrying one green payload phrase (see the Green Payload Rule).
- **Title** (700, clamp(1.15rem, 1rem + 0.5vw, 1.5rem), 1.15): H3/H4, card and panel headings.
- **Body** (400, 1rem to 1.1rem, 1.7): paragraphs, capped at 65 to 75ch line length.
- **Label** (600, 0.75rem, 0.12em tracking, uppercase, mono): the section kicker (`.label`), spec annotations, and trust-bar text. The only sanctioned uppercase.

### Named Rules
**The Line-Height Trap Rule.** Body's 1.7 line-height leaks into compact components by inheritance. Every compact component (logo, nav links, badges, buttons, labels, code blocks) must set `line-height: normal`.

**The Green Payload Rule.** Headings are near-black ink with at most one green phrase marking the payload: the word or phrase carrying the heading's claim ("value", "measure", "LLM Loop", "your codebase"). No payload, no green: roughly a third of headings stay plain, and the device works because it is not everywhere. Keep the phrase to 1 to 3 words; the one exception is a definition heading, which may highlight the whole definition when the definition is the payload. Color mechanics: `.highlight` is Brand Green on light and Vivid Green inside `.on-dark`. Never Deep Green: it disappears at heading sizes.

## 4. Elevation

Flat by default. Surfaces are flat at rest; structure comes from 1px or 1.5px full borders (#e5e2dc on light, #3a3a38 on dark) and tint fills (Surface Green for favored panels), never from decoration shadows. Depth appears only as a response to state or as a single featured exception per page. The ghost-card pattern (1px border plus a wide soft shadow on the same resting element) is prohibited.

### Shadow Vocabulary
- **Code ambient** (`box-shadow: 0 2px 8px rgba(28, 28, 26, 0.04)`): the one resting shadow, under inline code snippets; barely there.
- **Hover lift** (`box-shadow: 0 8px 24px rgba(28, 28, 26, 0.06)` with `translateY(-2px)`): cards on hover only.
- **Tooltip** (`box-shadow: 0 8px 24px rgba(28, 28, 26, 0.1)`): floating layers earn a real shadow.
- **Featured glow** (`box-shadow: 0 4px 24px rgba(0, 198, 56, 0.1)`): the featured pricing card; at most one per page.
- **Accent pulse** (`box-shadow: 0 0 0 8px rgba(226, 108, 69, 0)` keyframed from 0.3 opacity): the CTA heartbeat, 3s loop.

### Named Rules
**The Flat-By-Default Rule.** If a resting element needs separation, give it a border or a tint, not a shadow. Shadows are state (hover, floating) or the one featured exception.

## 5. Motion

Motion is the moving half of "Curious Play." A flat, restrained system earns its life through choreography, not decoration: nothing pulses for attention, but the things that move do so with intent and one shared character. The signature is a single easing curve, `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-settle`): motion arrives fast and settles soft, like a crystal locking into place. Perpetual idles use plain ease-in-out (`--ease-calm`) so they read as breathing, not as events.

### Duration and Easing
Four duration steps, all tokenized: 150ms (`--dur-fast`, state response: colour, opacity), 300ms (`--dur-base`, the default transition and hover lift), 550ms (`--dur-settle`, the crystalline assembly and wing flap), 700ms (`--dur-entrance`, the hero choreography). The three `--transition-*` aliases are built on these tokens. Two easings: `--ease-settle` for anything that arrives and lands, `--ease-calm` for anything that loops. New motion reaches for a token, never a raw value.

### Named Patterns
- **Crystalline Assembly** (signature): on load the hero butterfly builds itself. Each facet scales up from its own centre and settles into the locked mark, staggered symmetrically so both wings' Nth facet arrive together, building outward from the body; the ember head and vivid antenna tips pop last. About 1.3s on the settle curve. The mark crystallises rather than fades, making "crystalline precision in organic material" literal.
- **Wing-Breathe**: the perpetual idle, a 2deg rotation on the wing groups over 4s, starting after the assembly so the two never compete.
- **Light-Shift**: a slow brightness wave travelling outward across the facets every 7s, brightness only, no blur or added colour, so it reads as light catching a crystal.
- **Hero Choreography**: the hero text enters in five rise-and-fade steps (badge, headline, subhead, CTA, qualifier).
- **Scroll Reveal**: content fades and rises 16px as it enters the viewport, once.
- **Hover Lift**: interactive cards rise 3px onto a soft shadow; the only resting-to-hover depth change (see Elevation).
- **Accent Pulse**: the one warm action per viewport carries a 3s heartbeat ring.

### Named Rules
**The Mark-Motion Rule.** The butterfly is locked geometry and locked colour, but it may move. Choreographed motion that resolves to the locked static mark (Crystalline Assembly, Wing-Breathe, Light-Shift) is sanctioned and is the system's signature moment. It is distinct from the still-banned static effects on the mark: glow, gradient, drop-shadow, opacity-dimmed or outline-only wings. Motion animates the mark; it never restyles it.

**The Reduced-Motion Rule.** Every animation has a `prefers-reduced-motion: reduce` branch that lands on the static end state instantly: the assembled mark, the entered hero, the revealed code. Reduced motion is never a degraded experience, only a still one. Shipping an animation without its reduced-motion branch is a defect, not a polish item.

## 6. Components

Calm and grounded: quiet bordered surfaces, one warm action, nothing shouts.

### Buttons
- **Shape:** softly rounded (10px default; 12px for `.btn-lg` in heroes, 8px for `.btn-sm` in nav and dense rows). 1.5px border slot on all variants so sizes never shift between variants.
- **Primary:** Ember Orange fill with ink text (#1c1c1a on #e26c45, 5.3:1), weight 600. One per viewport, no exceptions.
- **Outline:** transparent with Brand Green border and text; hover fills with Surface Green. On dark, border and text switch to Vivid Green.
- **Ghost:** underlined text link with arrow, Brand Green; the "or just look first" option.
- **Hover / Focus:** `filter: brightness(0.92)` on fills, 150ms; focus ring is a 2px Vivid Green outline offset 2px.
- **Pairing:** a hero pairs primary + ghost. Two solid buttons side by side are prohibited; outline appears only where no primary shares the row.

### Badges
- **Shape:** the signature asymmetric radius (20px 4px 16px), a deliberate organic imperfection echoing the butterfly's asymmetric wing.
- **Default:** Surface Green fill, Deep Green text, Light Green border, pulsing Vivid Green dot.
- **Urgency:** warm tint (#fdf0eb), rust text (#a3502e), Ember dot; counts as the viewport's accent element.
- **Hero variant** (`.badge-base`): same anatomy at larger padding (0.3rem 0.9rem) with the dot animated; one per hero.

### Cards / Containers
- **Corner Style:** panels 14px, content cards up to 16px; never beyond.
- **Background:** white on cream, cream on white, Surface Green when one card is the favored option (with Light Green border), ink (#1c1c1a) for dark emphasis panels via `.on-dark`.
- **Shadow Strategy:** none at rest (see Elevation); hover lift only on interactive cards.
- **Border:** always a full 1px border; side-stripe accent borders are prohibited.
- **Internal Padding:** 32px panels, 16px compact info cards.

### Inputs / Fields
The site has no forms by design (conversion happens via external calendar and Google Forms links). If an input ever ships, it inherits the panel grammar: white fill, 1px border, 10px radius, focus ring per buttons.

### Navigation
- Fixed header, frosted cream (rgba(250,247,242,0.9) + 12px blur), bottom border appears on scroll. Logo lockup left, text links + green outline CTA right. Mobile: hamburger to full overlay, Escape closes. Body links 500 weight; nav must set `line-height: normal`.

### Pull Quote (signature)
- Zilla Slab italic at 1.35rem, ink text, max 56ch, with a 7px Vivid Green dot before the cite. No border rules, no background.

### Code Snippet (signature)
- JetBrains Mono 0.8rem, Deep Green on white, 8px radius, 1px border, the one ambient shadow. Used for loop pseudocode (`while(task) { think → act → observe }`) in heroes and comparisons.

### Sticky CTA (mobile)
- Bottom-fixed frosted bar with a full-width primary button; appears only below 768px, and yields whenever the hero or any other primary CTA is on screen (the One Accent Rule, enforced in JS).

## 7. Do's and Don'ts

### Do:
- **Do** use Brand Green (#137b30) for text on light and Deep Green (#0d5822) when body text needs AAA.
- **Do** keep exactly one accent element per viewport; let the sticky CTA yield.
- **Do** use asymmetric grids (1.4fr/0.6fr) and rhythm: tight groupings, generous separations.
- **Do** set `line-height: normal` on every compact component.
- **Do** give every animation a `prefers-reduced-motion` alternative.
- **Do** copy the butterfly SVG verbatim from /design-system Section 8; geometry, facet colors, and the slot-6 asymmetry are locked.
- **Do** prove instead of claim in copy: numbers, pseudocode, shipped work.

### Don't:
- **Don't** use Vivid Green (#00c638) as text on light backgrounds; it fails AA at 2.5:1.
- **Don't** reintroduce the sci-fi mech era: no cyan, neon, glow effects, glassmorphism, or gradient text (PRODUCT.md anti-reference, by name).
- **Don't** use `border-left` or `border-right` thicker than 1px as a colored accent stripe; full borders, tints, or nothing.
- **Don't** pair a 1px border with a wide soft shadow on a resting element (the ghost-card tell).
- **Don't** add hero-metric stat-card templates, centered-everything desktop layouts, or all-caps headings (mono labels and trust bar excepted).
- **Don't** use em-dashes in customer-facing copy; periods, commas, colons.
- **Don't** invent new colors, accent hover variants, or a dark theme; dark sections are emphasis, not a toggle.
- **Don't** recolor, re-facet, mirror, or add static effects (glow, gradient, drop-shadow) to the butterfly mark, and never give facets per-facet fill opacity or outline-only wings. Two placements are sanctioned: the complete solid mark as an ambient watermark at a low group opacity (the hero), and choreographed motion that resolves to the locked mark (Section 5, The Mark-Motion Rule).
- **Don't** ship AI-slop aesthetics: if it could be any AI startup's template, it is wrong (PRODUCT.md, verbatim).
