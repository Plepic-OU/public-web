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
| Green (primary) | `#22c55e` | Accents, highlights, butterfly |
| Green dark | `#16a34a` | Text accents, strokes, headings |
| Green darker | `#0d7a36` | Deep accents |
| Green light | `#dcfce7` | Badges, surfaces |
| Green surface | `#f0fdf4` | Section backgrounds |
| Amber (CTA) | `#e68a00` | Buttons, action elements |
| Amber dark | `#c27400` | Button hover |
| Background | `#faf7f2` | Page background (warm cream) |
| Background alt | `#f3efe7` | Alternating sections |
| Surface | `#ffffff` | Cards, panels |
| Text | `#1c1c1a` | Primary text (warm near-black) |
| Text secondary | `#555550` | Body text, descriptions |
| Text muted | `#8a8a80` | Captions, meta |
| Border | `#e5e2dc` | Card borders, dividers |

## Typography

| Role | Font | Weight | Source |
|------|------|--------|--------|
| Headings / Logo | Zilla Slab | 600 (heading), 700 (logo) | Google Fonts |
| Body | Plus Jakarta Sans | 400, 500, 600 | Google Fonts |
| Code | JetBrains Mono | 400, 700 | Google Fonts |

**Google Fonts import:**
```
Zilla+Slab:wght@400;500;600;700
Plus+Jakarta+Sans:wght@400;500;600;700
JetBrains+Mono:wght@400;700
```

### Type Scale (fluid)
- Hero heading: `clamp(2.5rem, 2rem + 3vw, 3.8rem)` — Zilla Slab 600
- Section heading: ~2.2rem
- Body: ~1rem–1.125rem
- Small: ~0.85rem

## Hero Butterfly

- **Style:** Geometric faceted — triangular polygons with green stroke borders
- **Forewing:** #3 Swept Back — sharp tips swept backwards
- **Hindwing:** #10 Streamlined — flows seamlessly from forewings, no separate tails
- **Body:** Diamond-shaped segments, ellipse head
- **Antennae:** Curved with club tips
- **Colors:** Green gradient fills at varying opacities (0.05–0.25), `#16a34a` strokes (0.7–1.5px)
- **Exploration files:** `butterfly-options.html`, `butterfly-geo.html`, `butterfly-tails.html`, `butterfly-forewings.html`

## Layout Principles

- **Theme:** Light mode only. No dark mode.
- **Hero:** Asymmetric 2-column grid — text left, butterfly right
- **Text alignment:** Left-aligned (not centered)
- **Max width:** 1120px container
- **Desktop-first** responsive
- **Primary viewport:** 1440×900 (MacBook Pro 15")
- **Breakpoints:** Stack to single column at ~900px, mobile adjustments at ~480px

## Buttons

- **Primary (CTA):** Amber `#e68a00`, white text, rounded `16px`, hover lifts + darkens
- **Secondary:** Green outline `#22c55e`, transparent background

## Components

- **Badge:** Green surface bg, organic border-radius `20px 4px 16px 4px`, pulsing dot
- **Code snippet:** Dark bg `#1c1c1a`, green mono text, rounded `8px`

## Anti-Patterns (DO NOT)

- No cyan, no neon, no dark mode
- No glassmorphism, gradient text, glowing accents
- No all-caps headings
- No centered-everything layouts
- No SVG blur filters pretending to be painterly
- No AI slop aesthetics from 2024-2025
