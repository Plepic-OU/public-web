---
target: "Plepic design system (re-measure after PRs #128-#137)"
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-06-11T12-35-18Z
slug: design-system-html
---
# Critique: Plepic Design System (re-measure after PRs #128-#137)

Date: 2026-06-11. Assessment A: independent design-director agent (fresh context, 30 screenshots). Assessment B: bundled detector, CLI scan of 6 pages + in-page overlay on homepage and /training/.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | aria-current + nav underline shipped; external-exit cues (Calendar/Forms) still missing |
| 2 | Match System / Real World | 4 | Developer-fluent: loop pseudocode, Tootukassa mechanics, real arithmetic |
| 3 | User Control and Freedom | 3 | On-brand 404 with recovery; DS page has no route back to the site |
| 4 | Consistency and Standards | 2 | mech-* legacy classes, .btn-secondary undocumented alias, butterfly watermark opacity vs locked doctrine, centered inner pages, #a3a39a unnamed |
| 5 | Error Prevention | 3 | No on-site forms; risk exported to external surfaces |
| 6 | Recognition Rather Than Recall | 3 | Three CTA labels resolve to one calendar link; "Scopeful"/"Squad" unexplained at first contact |
| 7 | Flexibility and Efficiency | 2 | Single linear path; sticky CTA + DS jump nav are the only accelerators |
| 8 | Aesthetic and Minimalist Design | 4 | One Accent Rule is machine-enforced (verified live); genuine restraint |
| 9 | Error Recovery | 3 | 404 now on-brand with butterfly + wayfinding |
| 10 | Help and Documentation | 3 | Grouped FAQ with schema.org; public design system |
| **Total** | | **30/40** | **Good band (up from 26/40 baseline, 2026-06-10)** |

## What moved the score
Status visibility (2->3): aria-current nav state. Error recovery (2->3): the 404 rebuild. Aesthetics (3->4): closing dark section, one-accent enforcement in JS, side-stripe and token-integrity fixes. Consistency improved in substance but new findings (mech-*, watermark) hold it at 2.

## Anti-Patterns Verdict
Emphatically not AI slop on the homepage or DS page; the residue is "B2B template creep on inner pages." Detector (CLI): the previously real hits (side-stripes, em-dash body copy on production) are gone; remaining items are known false positives (single-font from CSS-loaded fonts, cream = locked identity, scopeful/DS numbered sequences are real sequences) plus DS-page internal em-dashes (documented separator exception). Overlay: training dropped from 7 to 5 hits (line-length hits cleared); remaining real items are the ghost-card shadows (.pricing-card-featured specimen + a span), curriculum-timeline cramped padding, faq-list top-border flush, repeated kickers, 85-char caps trust bar, 11.5px hero code line. gradient-text + theater on body = self-detection artifact of the inline CSP workaround (known FP).

## Priority Issues
1. **[P1] Training hero ships the system's own banned pattern under the rejected era's name.** .mech-viewport/.mech-hud-stats/.stat-card render four hero-metric stat cards (DESIGN.md Don't list bans this exact template); class names are from the disowned sci-fi era. The page ads land on is the most template-like surface. Fix: rename classes; recast the four specs (6/50/20/2+) as a quiet mono spec line or captions in the illustration frame.
2. **[P1] Watermark butterfly contradicts locked logo doctrine.** styles.css ~679: .butterfly-svg opacity 0.28 on the homepage hero; DS Section 8 says no opacity-based wings, no effects on the mark. Fix: codify an ambient/watermark tier in Section 8 with allowed opacity and contexts, or replace with solid light-green facets.
3. **[P2] Three CTA labels resolve to one calendar link.** "Talk to Kaido" / "Book a Hackathon for Your Team" / "Book a 30-minute call" all open the same booking page. Ambiguity at the conversion action. Fix: one verbal system per destination or distinct booking links per intent.
4. **[P2] Asymmetric doctrine lives only on the homepage.** Inner pages center everything (.text-center: 5 training, 6 scopeful, 4 claude-code, 0 home). Fix: apply 1.4fr/0.6fr grammar to at least the training hero.
5. **[P3] Naming/token drift:** .btn-secondary undocumented alias (5 production uses), #a3a39a unnamed dark-muted text, 404 title em-dash, footer nav omits Team/Skill Tree (decide deliberately), duplicate reduced-motion blocks, CLAUDE.md still lists agent/index.html.

## Persona Red Flags (delta-focused)
- **Jordan:** three booking labels, "Squad"/"Scopeful" vocabulary before definition, harness jargon in image alt before definition, two prices in hero with eligibility three sections down.
- **Casey:** render-blocking fonts on 3G; watermark+code eat top half of 500px hero; forms.gle exit is an unbranded white page at the commitment moment. Sticky CTA yield verified working.
- **Riley:** 3x guarantee promise huge, terms only in an FAQ answer; 8.7/300+ unsourced; DS Button System specimen shows three orange primaries in one viewport while the rule bans it; DS logo "On brand" tile: green facets vanish on green.
- **Marek:** unsourced multipliers remain his hype-sniff; saved by price-up-front, Tootukassa arithmetic (now named), real logos, checkable instructors, reg code, public DS. He books or bookmarks.

## System-Evolution Gaps
- Motion still undocumented on the DS page (production runs a real choreography; --transition tokens exist). Most obvious next section.
- No imagery direction (training-hero illustration style, logo monochrome treatment, video framing).
- Components still undocumented on the page: testimonial grid, curriculum accordion, stat trio, webinar banner, video frame, logo row, skill tags, tooltip, .nav-cta.
- DS page lacks site chrome (no header/skip link/route back).
- Naming layer: retire or document .btn-secondary, mech-*; name --text-on-dark-muted.

## Minor Observations
Trust bar 11.5px tracked caps at legibility floor; EE flag emoji degrades on Windows; training testimonials are the only unlabeled section; DS Section 10 pricing specimen buttons are dead # links; incentive equation animation fires below fold; duplicate reduced-motion blocks; console easter egg on-voice; clean heading outline.

## Questions to Consider
1. Training page is where money decides; homepage is where the doctrine lives. Which one is the design system?
2. The funnel's highest-stakes moments happen in Google's UI with zero Plepic identity. What does the system owe the moment that converts?
3. Doctrine vs production disagreements (mech stats, watermark opacity) now exist in writing. Should CI lint for banned patterns the way it lints contrast?
