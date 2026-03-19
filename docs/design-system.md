# Plepic Design System

Living document. Updated as decisions are made.

## Brand

- **Tagline:** Curious play. Epic growth.
- **Personality:** Playful, Experimental, Confidently Humble
- **Emotion:** Curiosity + Trust
- **Symbol:** Digitized butterfly — nature rendered as geometric data

## Color Palette

### Two-Tier Green Strategy

Green `#16a34a` fails WCAG AA (3.08:1) on cream `#faf7f2` for small text.
Use two tiers:

- **`#16a34a`** — large text only (h1 accent at 76px+ bold, passes AA at 3:1)
- **`#0d7a36`** — small text (nav-cta, labels, code snippets, passes AA at 5.1:1)

| Token | Value | Usage | Contrast on cream |
|-------|-------|-------|-------------------|
| Green (primary) | `#22c55e` | Accents, highlights, butterfly fills, badge border | decorative |
| Green dark | `#16a34a` | **Large text only**: h1 accent, butterfly strokes | 3.08:1 (AA large) |
| Green darker | `#0d7a36` | **Small text**: nav-cta, code, labels, badge text | 5.10:1 (AA) |
| Green light | `#dcfce7` | Badge border, surfaces | decorative |
| Green surface | `#f0fdf4` | Section backgrounds, badge bg | decorative |
| Claude orange (CTA) | `#d97757` | Primary action buttons — ties to Claude Code brand | n/a (bg) |
| Claude orange dark | `#b8604a` | Button hover | n/a (bg) |
| CTA text | `#3d1f14` | Dark brown text ON Claude orange buttons | 4.79:1 (AA) |
| Background | `#faf7f2` | Page background (warm cream) | n/a |
| Background alt | `#f3efe7` | Alternating sections | n/a |
| Surface | `#ffffff` | Cards, panels | n/a |
| Text | `#1c1c1a` | Primary text (warm near-black) | 15.97:1 (AAA) |
| Text secondary | `#4a4a45` | Body text, descriptions | 8.34:1 (AAA) |
| Text muted | `#6b6b60` | Qualifier, small muted text | 5.04:1 (AA) |
| Text quiet | `#8a8a80` | Decorative only (trust bar behind opacity) | 3.26:1 (fails AA) |
| Border | `#e5e2dc` | Card borders, dividers | decorative |

### Color Rules

1. **Never use `#16a34a` on small text** — always `#0d7a36`
2. **CTA buttons use dark text** `#3d1f14` on `#d97757` — not white (white is 3.12:1, fails)
3. **Butterfly SVG strokes** use `#16a34a` (decorative, not text)
4. **Butterfly SVG body fills** use `#166534` (decorative)
5. **Trust bar** at `opacity: 0.65` — reduces effective contrast, acceptable for supplementary content

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
- Section headings: `clamp(1.5rem, 1.25rem + 2vw, 2.25rem)` — Zilla Slab 600
- Body: 1.1rem, line-height 1.6
- Small/qualifier: 0.8rem, line-height normal
- Labels (mono): 0.75rem, uppercase, letter-spacing 0.12em
- Code snippet: 0.72rem JetBrains Mono

### Line-Height Trap (Critical)

Body has `line-height: 1.7`. This leaks into compact components via inheritance.
**Every compact component must set `line-height: normal`:**
- `.logo`
- `.nav a`
- `.badge-base`
- `.btn-primary`
- `.hero-qualifier`
- `.hero-code`
- `.code-snippet`
- All labels, tags, stats

## Hero Composition

### Layout
- **Grid:** `1.4fr 0.6fr` — text dominates, butterfly supports
- **Alignment:** `align-items: end` — right column bottom-aligns with left column
- **Butterfly column:** `align-items: center` — butterfly + code centered horizontally
- **White space:** Intentional empty space upper-right creates diagonal eye flow
- **Vertical centering:** Flexbox on `.hero` with `min-height: 100vh`, content shifted with `margin: -5vh auto 0`
- **Bottom anchor:** "Trusted by" bar at viewport bottom, opacity 0.65

### Alignment Rule (Critical)
Nav, hero grid, and trust bar MUST share identical container:
- `max-width: 1120px`
- `padding: 0 2rem`
- `margin: 0 auto`

### Element Hierarchy
1. **Heading** — hero moment, upper-left, massive (4.8rem), forced 3-line break
2. **Body copy** — below heading, max-width 480px, €504 bold
3. **CTA button** — Claude orange with dark text, below body
4. **Badge** — above heading, tight spacing (0.75rem), pulsing green dot
5. **Qualifier** — below CTA, quiet (0.8rem, `#6b6b60`)
6. **Butterfly + code** — center-aligned in right column, code tight below butterfly (margin-top: -1.5rem compensates SVG viewBox whitespace)
7. **Trust bar** — viewport bottom, opacity 0.65, 9 company names

### Nav
- **Links:** Agentic Coding, Training, Team (removed Clients, Contact for cleanliness)
- **CTA style:** Green outline `#22c55e` border, `#0d7a36` text — avoids competing with hero CTA
- **Font:** 0.9rem, weight 500, line-height normal

## Hero Butterfly

### Shape
- **Forewing:** #3 Swept Back — sharp angular tips swept backwards
- **Hindwing:** #10 Streamlined — flows seamlessly from forewings, no separate tails
- **Body:** Diamond-shaped segments, ellipse head
- **Antennae:** Curved with club tips

### SVG Specifications
- **ViewBox:** `0 0 300 280` (content ends ~y=240, 37px whitespace below)
- **Container:** `max-width: 280px`, `aspect-ratio: 300/280`
- **Facet fills:** Green shades, opacities boosted 1.6x from original (range 0.08–0.64)
- **Facet strokes:** `#16a34a`, widths from 0.5px (outer) to 1.5px (leading edge)
- **Position:** Center-aligned (`align-items: center`), bottom-aligned (`align-self: end`)
- **Ambient glow:** `radial-gradient` pseudo-element, 200% width, green at 6% opacity
- **Code snippet:** Directly below, `margin-top: -1.5rem` to compensate viewBox whitespace, `opacity: 0.6`, color `#0d7a36`

## Responsive

- **Primary viewport:** 1440x900 @2x (MacBook Pro 15")
- **Secondary test:** 1366x768 (common business laptop)
- **Approach:** Desktop-first
- **Breakpoints:**
  - `900px` — hero stacks to single column, center text, butterfly on top
  - `600px` — mobile: hamburger nav (44x44px min touch target), reduce heading
  - `768px` — show/hide sticky CTA

## Buttons

- **Primary (CTA):** Claude orange `#d97757`, dark text `#3d1f14`, `border-radius: 14px`, `padding: 1rem 2.25rem`, `font-weight: 600`, hover lifts + darkens to `#b8604a`
- **Secondary (Nav):** Green outline `#22c55e`, `#0d7a36` text, `border-radius: 10px`
- **Touch targets:** All interactive elements minimum 44x44px

## Components

- **Badge:** Green surface bg `#f0fdf4`, text `#0d7a36`, organic border-radius `20px 4px 16px`, pulsing green dot, `line-height: normal`
- **Code snippet (hero):** No border/bg, `opacity: 0.6`, color `#0d7a36`, decorative detail
- **Code snippet (general):** White bg, green mono text, `border-radius: 8px`, 1px border
- **Trust bar:** Absolute positioned at bottom, `opacity: 0.65`, uppercase labels with line divider
- **Panels/Cards:** White bg, 1px border `#e5e2dc`, `border-radius: 16px`

## Anti-Patterns (DO NOT)

- No cyan, no neon, no dark mode
- No glassmorphism, gradient text, glowing accents
- No all-caps headings (except trust bar labels and mono labels)
- No centered-everything layouts on desktop
- No SVG blur filters or glow filters
- No AI slop aesthetics from 2024-2025
- No equal 50/50 grid splits — use asymmetry
- No same spacing everywhere — use rhythm (tight groupings + generous separations)
- No competing warm elements (nav CTA is green outline, hero CTA is Claude orange)
- No white text on Claude orange (fails contrast) — use dark brown `#3d1f14`
- No `#16a34a` green on small text — use `#0d7a36`
- No `#8a8a80` as text color (fails AA on cream) — use `#6b6b60` or darker

## Implementation Process

### For each section:
1. **Read** the existing HTML structure
2. **Identify** what CSS classes it uses and what needs to change
3. **Change CSS** to match design system tokens — one property at a time
4. **Screenshot** at 1440x900 @2x after each change
5. **Measure** computed styles with JS if visual comparison is ambiguous
6. **Commit** when the section looks right

### Common pitfalls:
- `body { line-height: 1.7 }` leaks into everything — add `line-height: normal` to compact components
- SVG colors are HTML attributes, not CSS — must edit the HTML directly
- CSS custom variables that were renamed/changed cascade unpredictably — use hardcoded hex when precision matters
- SVG viewBox may have whitespace beyond visible content — use negative margins to compensate
- Opacity reduces effective contrast — account for it in WCAG calculations
