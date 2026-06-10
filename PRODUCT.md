# Product

## Register

brand

## Users

Developers with 2+ years of experience and the CTOs / engineering leads of software agencies (10-50 employees) in Estonia, expanding toward Finland. They arrive from Google Ads, LinkedIn, or word of mouth to judge whether Plepic's agentic coding training is credible enough to book a call. They are technical peers: they smell hype instantly.

## Product Purpose

plepic.com is the marketing site for Plepic OÜ: agentic coding training (Claude Code) for dev teams, plus the Scopeful product page. Static HTML + CSS, no build system. Success is booked calls and training signups via external links; there are no on-site forms. The design system itself is public and canonical at /design-system (design-system.html + css/styles.css).

## Brand Personality

Warm, grounded, distinctive. Credible and calm: expert without hype. Warmth in service of authority, never cuteness. Tagline: "Curious play. Epic growth." The EN brand line names the category (agentic coding for dev teams); the ET line names the outcome (tulemuspõhine digimuutus). Three pillars: Agentic coding (what we do), Performance and learning held in conscious tension (culture), Aligned incentives (we win only when clients win).

## Anti-references

- AI slop aesthetics. The site's own rule: if it could be any AI startup's template, it is wrong.
- The pre-2026-03 sci-fi mech look: cyan, neon, glow effects, glassmorphism, gradient text. Replaced by the nature-digital identity; never reintroduce.
- Generic SaaS landing grammar: hero-metric templates, centered-everything desktop layouts, all-caps headings (mono labels and trust bar excepted).
- Em-dashes in customer-facing copy (the design-system page uses them internally as label separators only).

## Design Principles

1. Brand first, pixels second. Every token, type choice, and component exists to express the identity stated in design-system.html Section 1.
2. The palette (green H137 at S73, vivid S100 exception, accent H15), the crystalline butterfly mark, and the type stack (Zilla Slab / Plus Jakarta Sans / JetBrains Mono) are locked. Improvements work within them; identity preservation beats novelty.
3. One accent per viewport: a single orange element (CTA button or urgency badge), never two.
4. Nature-digital fusion means organic shapes and asymmetric layouts (1.4fr / 0.6fr grids), not token swaps.
5. Prove, don't claim: numbers, demos, and shipped work over adjectives.
6. Light mode only. Dark sections are for emphasis, not a theme toggle.

## Accessibility & Inclusion

WCAG AA minimum, enforced by axe-core Playwright tests in CI and live contrast calculations on the design-system page. Two-tier green strategy: --green-brand (AA) for headings and links on light, --green-dark (AAA) for body text; --green-vivid is never text on light backgrounds. Compact components must set line-height: normal to escape the body's 1.7 inheritance.
