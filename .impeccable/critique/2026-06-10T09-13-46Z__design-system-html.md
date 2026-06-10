---
target: Plepic design system (design-system.html + production pages)
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-06-10T09-13-46Z
slug: design-system-html
---
# Critique: Plepic Design System (design-system.html + production application)

Date: 2026-06-10. Assessment A: independent design-director agent (browser + source, 32 screenshots). Assessment B: bundled detector, CLI scan of 5 pages + in-page overlay scan of homepage, /training/, /design-system.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No current-page indicator: zero aria-current, no active nav style on any page |
| 2 | Match System / Real World | 4 | Genuinely peer-voiced: loop pseudocode, visible subsidy math, no buzzwords |
| 3 | User Control and Freedom | 3 | Mobile menu fine; sticky CTA not dismissible; unannounced external calendar jump |
| 4 | Consistency and Standards | 1 | Orange highlight on /claude-code/ vs green elsewhere; badge-base vs badge-default; Squad vs Cohort; 8.7 vs 8.4; grayscale vs color photos; em-dash rule broken site-wide |
| 5 | Error Prevention | 3 | Minimal interactive surface; external links flagged in nav only |
| 6 | Recognition Rather Than Recall | 3 | Price repeated well; "Squad" never defined at first use |
| 7 | Flexibility and Efficiency | 2 | Skip link exists; no Estonian-language path despite ET brand line and Estonian ICP |
| 8 | Aesthetic and Minimalist Design | 3 | Calm and distinctive; incentive section half-empty; training hero centers everything |
| 9 | Error Recovery | 2 | 404 page is bare: no brand moment, minimal wayfinding |
| 10 | Help and Documentation | 3 | 12-item FAQ with schema.org markup, but flat and ungrouped |
| **Total** | | **26/40** | **Acceptable: strong identity layer, inconsistently applied system** |

## Anti-Patterns Verdict

**LLM assessment:** Largely escapes the template look. The locked crystalline butterfly (slot-6 asymmetry, DK-B-V facet rule), the cream-and-slab identity, the console easter egg, and honest pre-commercial copy would not come out of a prompt mill. The residue is in rhythm and self-rule violations, not aesthetics: an uppercase mono eyebrow on 100% of sections, hero-metric stat cards, several 50/50 grids against the system's own asymmetry principle, and 26 em-dashes in customer-facing copy on a site whose own design system bans them.

**Deterministic scan (CLI, post side-stripe fix):** 8 findings; the 4 side-stripe hits from the pre-fix scan are gone (shipped in PR #128). Remaining real items: em-dash overuse and aphoristic cadence on the public design-system page. In-page overlay scan added: ghost-card pattern (1px border + 24px shadow) on .pricing-card-featured, .tooltip and .shift-col:hover; tiny text (11.52px homepage, 8.8px spec labels on DS page); body line lengths of 132 to 155 chars on /training/ and the DS page; cramped padding on .faq-list and .curriculum-timeline; repeated section kickers (4 on homepage, 3 on training); sub-AA label contrast on DS swatch chips.

**Off-system colors confirmed in styles.css:** rgba(217,119,87) = #d97757 (Claude/Anthropic orange) in btn-pulse keyframes (l. 440); rgba(34,197,94) = #22c55e (Tailwind green-500) in the hero radial gradient (l. 664) and the featured pricing card shadow (l. 2219). Three foreign colors hiding inside a locked palette.

**False positives dismissed:** single-font CLI hits (fonts load from CSS; overlay confirms Plus Jakarta Sans at ~70%); cream-palette (locked brand identity, identity-preservation wins); numbered markers on /scopeful/ (a real 3-step flow) and on the DS page (document section numbering); white-on-accent button contrast (production .btn-primary uses dark text at ~7:1; the hits were the DS page's own swatch labels); gradient-text and theater-phrase overlay hits (self-detection artifact of the inline injection workaround used to bypass the site CSP).

## Overall Impression

A real brand with a disciplined identity core, undermined by application drift. The system's sharpest rules (one accent per viewport, no vivid as text on light, no em-dashes) are each violated in production, and the public reference page sells a program that no longer exists. The single biggest opportunity: make the homepage END somewhere, and make the system's own rules hold.

## What's Working

1. **The butterfly mark is a genuine, disciplined identity asset.** Locked geometry documented to construction-spec level, deliberate asymmetry, pixelation fix, downloadable assets. Survives 16px to 120px.
2. **Accessibility as grammar:** two-tier green strategy, live contrast table computed in-page, skip link, reduced-motion guards, zero inline styles in production HTML.
3. **Prove-don't-claim copy at its best:** agent-vs-chat comparison, visible subsidy arithmetic, "We're building this with agencies, not for them," console easter egg for the audience that opens DevTools.

## Priority Issues

1. **[P1] Locked rules are broken in production.** (a) /claude-code/ H1 highlight renders in orange (styles.css:1264), orange is reserved for CTA/urgency; (b) .flow-step-num on /scopeful/ uses --green (aliases --green-vivid) as text on white, ~2.3:1, the exact thing the system forbids; (c) mobile shows two orange CTAs in one viewport (sticky + hackathon), violating one-accent-per-viewport; (d) three off-system colors (#d97757, #22c55e twice). Why: the system's credibility is its discipline; every exception erodes it, and the ICP notices. Fix: token-integrity pass over styles.css: revert (a) to green, (b) to --green-brand, retire or rename the --green alias, replace foreign rgba values with token-derived ones, add a sticky-CTA yield rule when another .btn-primary is on screen.
2. **[P1] The homepage has no ending.** It ends at FAQ then a skinny footer; the conversion moment is buried mid-page. /training/ already proves the pattern (closing CTA + "Questions? Talk to Kaido" reassurance). Why: peak-end rule on the highest-traffic page; the external calendar jump carries zero reassurance microcopy. Fix: closing dark CTA section on the homepage (the system documents dark sections but never uses them), with reassurance line ("30 minutes, no prep, no obligation").
3. **[P1] 26 em-dashes in customer-facing copy** (index 11, training 10, scopeful 3, claude-code 2) against the brand's own locked voice rule. Fix: one copy pass across 4 pages; DS-page internal label separators stay.
4. **[P2] The public reference page is stale and incomplete.** Hero specimen sells "5 days / Cohort 3 April 2026 / NPS 8.4"; production sells "6 Fridays / Squad 3 Q3 2026 / 8.7 score". Production runs ~14 components the system never documents (stat cards, team cards, FAQ accordion, pricing pair, timeline, flow steps, sticky CTA, footer...) plus a second undocumented badge system (.badge-base). Motion exists in production (hero entrance, reveal, wing-breathe, hover lifts) but the system says nothing about it; wing-breathe keyframes are defined twice. No imagery direction despite the training hero illustration being the best nature-digital asset on the site. Fix: document/extract pass to bring the canon up to production reality.
5. **[P2] Trust-arithmetic inconsistencies.** 9 trust-bar names vs 6 client logos; "8.7 Avg. Training Score" (no n, no scale) vs FAQ "NPS 8.4/10"; "3x" guarantee vs "3-5x" claim elsewhere; grayscale team photos on home vs color avatars on training. Why: this is precisely what a hype-smelling CTO pattern-matches as inflation. Fix: clarify pass to reconcile numbers and choose one photo treatment.

## Persona Red Flags

**Jordan (first-timer):** "Squad" never defined ("Squad 3: Q3 2026" badge vs FAQ saying "cohorts"); three conversion paths with no stated relationship; silent external jump to Google Calendar; public /design-system contradicts the live offer.

**Casey (mobile, distracted):** double-orange viewport (which is THE action?); sticky CTA label never adapts to context; render-blocking font stylesheet plus ~60KB inline SVG on slow connections; lone EE flag emoji renders inconsistently.

**Riley (stress tester):** 9 names vs 6 logos; 8.7 vs 8.4 metrics; unfalsifiable "3x or we keep working" guarantee vs "3-5x" claim; photo-treatment inconsistency; bare 404.

**Marek (skeptical Estonian dev-agency CTO, 90 seconds):** orange "Estonia's Claude Code experts" headline reads like a banner ad exactly where skepticism peaks; subsidy described without naming Tootukassa; no Estonian-language path despite the ET brand line; no hard technical artifact above the fold (the 49-slide webinar deck and real CLAUDE.md examples sit one or two clicks deep); stat inconsistencies pattern-match as inflation.

## Minor Observations

- FAQ summary focus uses UA-default blue outline, not the system focus ring; the ring itself (vivid on cream) is ~2.25:1 vs the 3:1 non-text guideline.
- Footer lacks secondary nav links to Training/Scopeful/Claude Code.
- .mech-viewport / .mech-hud-stats legacy class names from the banned sci-fi era still live in styles.css (~l. 1900+).
- .btn-secondary duplicates .btn-outline; five redundant .highlight page overrides restate the base rule.
- The DS page itself: 220 inline style attributes, no jump nav for an ~11,900px page, 8.8px spec labels, clipped neutrals strip at 500px.
- claude-code/index.html carries the only 3 inline styles in production.
- section.hero clips a positioned child (overlay finding); harmless today, a trap for future hero additions.

## Questions to Consider

1. Should the public design-system page render living production components (same partials, same data) so drift becomes impossible rather than merely visible?
2. Your audience smells hype instantly and your strongest proof artifacts are below the fold. What would the homepage look like if the most technical artifact, not the most polished sentence, had to appear above the fold?
3. "One accent per viewport" is the system's sharpest rule and the mobile sticky CTA breaks it by design. Does the rule need a stacking-context clause, or does the sticky CTA need to yield?
