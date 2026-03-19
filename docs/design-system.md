# Plepic Design System

Living document. Updated as decisions are made.

## Brand

- **Tagline:** Curious play. Epic growth.
- **Personality:** Playful, Experimental, Confidently Humble
- **Emotion:** Curiosity + Trust
- **Symbol:** Digitized butterfly — nature rendered as geometric data

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Green (primary) | `#22c55e` | Accents, highlights, butterfly fills |
| Green dark | `#16a34a` | Text accents, butterfly strokes, heading accent |
| Green darker | `#0d7a36` | Deep accents |
| Green light | `#dcfce7` | Badges, surfaces |
| Green surface | `#f0fdf4` | Section backgrounds |
| Claude orange (CTA) | `#d97757` | Primary action buttons — ties to Claude Code brand |
| Claude orange dark | `#b8604a` | Button hover |
| Background | `#faf7f2` | Page background (warm cream) |
| Background alt | `#f3efe7` | Alternating sections |
| Surface | `#ffffff` | Cards, panels |
| Text | `#1c1c1a` | Primary text (warm near-black) |
| Text secondary | `#4a4a45` | Body text, descriptions |
| Text muted | `#8a8a80` | Captions, meta, qualifier text |
| Border | `#e5e2dc` | Card borders, dividers |

## Typography

| Role | Font | Weight | Source |
|------|------|--------|--------|
| Headings / Logo | Zilla Slab | 700 (hero heading, logo), 600 (section headings) | Google Fonts |
| Body | Plus Jakarta Sans | 400, 500, 600 | Google Fonts |
| Code | JetBrains Mono | 400, 700 | Google Fonts |

**Google Fonts import:**
```
Zilla+Slab:wght@400;500;600;700
Plus+Jakarta+Sans:wght@400;500;600;700
JetBrains+Mono:wght@400;700
```

### Type Scale
- Hero heading: `clamp(3rem, 2.5rem + 3.5vw, 4.8rem)` — Zilla Slab 700, line-height 1.05
- Body: 1.1rem, line-height 1.6
- Small/qualifier: 0.8rem
- Code snippet: 0.75rem JetBrains Mono

## Hero Composition

### Layout
- **Grid:** `1.4fr 0.6fr` — text dominates, butterfly supports
- **Alignment:** `align-items: end` — right column bottom-aligns with left column
- **White space:** Intentional empty space upper-right creates diagonal eye flow
- **Vertical centering:** Flexbox on `.hero`, content shifted slightly up with `margin: -5vh auto 0`
- **Bottom anchor:** "Trusted by" bar with company names at viewport bottom

### Alignment Rule (Critical)
Nav, hero grid, and trust bar MUST share identical container:
- `max-width: 1120px`
- `padding: 0 2rem`
- `margin: 0 auto`
Verified at 0px difference on both left and right edges.

### Element Hierarchy
1. **Heading** — hero moment, upper-left, massive (4.8rem)
2. **Body copy** — below heading, max-width 480px
3. **CTA button** — amber, below body
4. **Badge** — above heading, tight spacing (0.75rem)
5. **Qualifier** — below CTA, quiet (0.8rem muted)
6. **Butterfly + code** — lower-right, bottom-aligned with qualifier
7. **Trust bar** — viewport bottom, very quiet (opacity 0.35)

### Nav
- **CTA style:** Green outline (not amber) — avoids competing with hero CTA
- **Container:** Same max-width as hero grid
- **Layout:** Flexbox, space-between

## Hero Butterfly

### Shape
- **Forewing:** #3 Swept Back — sharp angular tips swept backwards
- **Hindwing:** #10 Streamlined — flows seamlessly from forewings, no separate tails
- **Body:** Diamond-shaped segments, ellipse head
- **Antennae:** Curved with club tips

### SVG Specifications
- **ViewBox:** `0 0 300 280`
- **Container:** `max-width: 280px`, `aspect-ratio: 300/280`
- **Facet fills:** Green shades at varying opacities (0.05–0.25)
- **Facet strokes:** `#16a34a`, widths from 0.5px (outer) to 1.5px (leading edge)
- **Stroke linejoin:** Not specified (default miter) — keeps geometric feel
- **Position:** Right-aligned (`align-items: flex-end`), bottom-aligned (`align-self: end`)
- **Ambient glow:** `radial-gradient` pseudo-element, 200% width, green at 6% opacity

### Exploration Files (committed)
- `butterfly-options.html` — 10 different visual approaches
- `butterfly-geo.html` — 12 geometric facet variations
- `butterfly-tails.html` — 12 hindwing anatomy variations
- `butterfly-forewings.html` — 12 forewing shape variations
- `font-compare.html` — 12 font options with reasoning

## Responsive

- **Primary viewport:** 1440×900 (MacBook Pro 15")
- **Approach:** Desktop-first
- **Breakpoints:**
  - `1200px` — scale down heading, reduce max-width
  - `900px` — stack to single column, center text, butterfly on top
  - `600px` — mobile: hide nav, reduce heading to 2.2rem

## Buttons

- **Primary (CTA):** Claude orange `#d97757`, white text, `border-radius: 14px`, hover lifts + darkens to `#b8604a`
- **Secondary (Nav):** Green outline `#22c55e`, transparent background, `border-radius: 10px`

## Components

- **Badge:** Green surface bg, organic border-radius `20px 4px 16px 4px`, pulsing green dot
- **Code snippet:** White bg, green mono text, `border-radius: 8px`, 1px border, subtle shadow
- **Trust bar:** Absolute positioned at bottom, opacity 0.35, uppercase labels with line divider

## Anti-Patterns (DO NOT)

- No cyan, no neon, no dark mode
- No glassmorphism, gradient text, glowing accents
- No all-caps headings (except trust bar labels)
- No centered-everything layouts on desktop
- No SVG blur filters pretending to be painterly
- No AI slop aesthetics from 2024-2025
- No equal 50/50 grid splits — use asymmetry
- No same spacing everywhere — use rhythm (tight groupings + generous separations)
- No competing warm elements (nav CTA is green outline, hero CTA is Claude orange)
