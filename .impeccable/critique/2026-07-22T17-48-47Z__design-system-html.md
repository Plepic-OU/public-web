---
target: brand identity (design-system.html + index.html)
total_score: 33
p0_count: 0
p1_count: 2
timestamp: 2026-07-22T17-48-47Z
slug: design-system-html
---
# Brand Identity Critique — plepic.com (design-system.html + index.html)

Run 2026-07-22. Five independent assessments: design review (A), deterministic detector (B), adversarial skeptics on ICP fit (C1), strategy fit (C2), distinctiveness (C3). Parent verified key claims against source and git.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | index.html nav lacks `aria-current` (subpages have it) |
| 2 | Match System / Real World | 4 | Developer-native, Töötukassa mechanics named, real pseudocode |
| 3 | User Control and Freedom | 3 | Sticky CTA appear/disappear can feel jumpy |
| 4 | Consistency and Standards | 3 | Lockup order contradicts canon; uppercase leaks beyond sanctioned homes; tagline treatment varies |
| 5 | Error Prevention | 3 | No forms = prevention by architecture |
| 6 | Recognition Rather Than Recall | 4 | Short nav, labeled sections, grouped FAQ |
| 7 | Flexibility and Efficiency | 3 | No FAQ jump-nav on a very long scroll |
| 8 | Aesthetic and Minimalist Design | 3 | Stat duplication; post-CTA Skill Tree band dilutes ending |
| 9 | Error Recovery | 3 | 404 exists; not deeply audited |
| 10 | Help and Documentation | 4 | Price in hero, subsidy math in FAQ, refund promise present |
| **Total** | | **33/40** | **Good — weaknesses are brand-craft, not usability** |

## Anti-Patterns Verdict

**LLM assessment (A):** passes for laypeople; a design-literate CTO clocks two tells: uppercase tracked mono eyebrow on 7/7 homepage sections, and two centered big-number stat cards ("8.7", "300+") — the hero-metric template PRODUCT.md bans by name, duplicating the hero badge's numbers. Lane-level: warm cream + slab display + mono labels + restrained green sits in the 2026 "Anthropic-adjacent warm-paper" family; ~60-70% of the identity is lane, not property. Genuinely owned: crystalline butterfly at display size, ember-orange CTA on cream, asymmetric badge radius, the loop pseudocode. Verdict: distinctive identity wearing a default-family outfit.

**Deterministic scan (B):** 6 findings. index.html: 1 (single-font — FALSE POSITIVE, fonts load via linked styles.css). design-system.html: 3 (100 em-dashes — internally sanctioned as label separators; numbered section markers — it is a numbered reference doc, sequence-justified; 5 aphoristic constructions — real, matches A's triplet-cadence observation). 404.html: 2 (literal font-family declarations in inline CSS — real minor). jobs/index.html clean.

**Agreement:** A's two big tells (eyebrow grammar, stat cards) are outside the detector's rule set — LLM caught what the scanner can't; the scanner's em-dash/numbered findings are false-positive-adjacent given the design-system page's sanctioned internal conventions.

## Overall Impression

The site is usable, proof-dense, and better-crafted than its size suggests; the hero is exceptional. But the brand system's public rigor claim is undercut by verifiable craft defects (faux italics, unloadable font weight, canon contradicted by 100% of shipped instances, a false hand-crafted-asymmetry story), and the founder's proposed refinements mostly aim at surfaces no buyer weighs. Single biggest opportunity: fix the four cheap, inspectable craft bugs that a technical peer could catch, and stop there until the Squad 3 gate.

## Adversarial Verification — fit to strategy, values, vision, ICP

- **ICP fit (C1): PARTIAL.** The anti-hype cream register is the right read of a hype-allergic CTO (conceded by all skeptics). But "will help convert" is empirically empty: every seat ever sold came from outbound/network (marketing.md:10); tagline appears on the homepage once, in the footer copyright row; the closing sales metaphor (mech pilot, subsidy math) contradicts the metamorphosis brand story. All three founder proposals: zero buyer impact.
- **Strategy fit (C2): REFUTED for doing this work now.** Every strategy doc names sales execution as the bottleneck (incl. founder's 2026-07-11 voice note); reviews/2026-07-13-website-lead-investigation.md: "the design lever is exhausted" (157 commits/90d, ~80% visual, ~0 qualified inbound); marketing.md July priority stack rule: "below #5 delegates or slips" — brand polish is below #5; Aug 14 reserve-by gate is 23 days out with 27 warm deals and 0 bookings. Two proposals (tagline canon, .com wordmark spec) were already codified TODAY in commit 6c5ba37 (#187) — verified in git.
- **Distinctiveness (C3): PARTIAL.** Ownable: metamorphosis-as-refactor hero story (gated off for mobile/reduced-motion — most visitors never see it), the locked 22-facet SVG at display size, the motion system, the asymmetric badge radius, design governance itself. Not ownable: wordmark = one CSS rule in Mozilla's brand typeface (Zilla Slab, recognizable to devs); tagline signable by any L&D brand; palette/type lane = Claude house style adjacency (dependence signaling for a Claude-training vendor); Estonian green-tech lane crowded (Bolt, Wise). The PL+EPIC acrostic (PLay+EPIC=PLEPIC) — the tagline's only unsignable defense — is documented nowhere.

## Focus Area Verdicts (the founder's four instincts)

**a. Butterfly "could use polish" — instinct half-right; the fix is a size program, not polish.** At 30×28px nav size the 22 facets collapse into green banding (reads striped moth/leaf; ember head ~0.8px, antenna tips invisible); header uses `shape-rendering="crispEdges"` (stair-stepping) where the hero correctly uses geometricPrecision. At hero size the mark is excellent and ownable. Fix = a simplified 6-8-facet small-size variant locked for ≤32px + favicon, plus geometricPrecision in the header. Separately, the canon contains a false claim: design-system.html:730 "No mirrored geometry" — the wings ARE exact coordinate mirrors (verified vertex-by-vertex); only slot-6/7 fills swap, and they swap the two darkest, near-identical greens — imperceptible at shipped sizes. Line 626 says the exception is "V → DK" while the geometry and line 669 say B → DK. Fix the story or make it true.

**b. Wordmark ".com in near-black" — rejected 3-0 by independent assessments.** Ink #1c1c1a on cream is ~16:1 vs the green name's 5.0:1 — a near-black TLD would out-shout the name, inverting DESIGN.md's own correct rule ("the name leads and the TLD recedes", #4a4a45). Canon for this was committed this morning (#187). No production page renders "Plepic.com" on screen (OG alt text only) — the variant is correctly scoped to off-site surfaces; keep it there. The real (deeper, currently locked-out) wordmark issue: it is unstyled text in another tech company's identity font.

**c. Tagline "refine and standardize" — already done this morning; the live question is placement.** B's site-wide sweep: every on-screen occurrence is already the canonical "Curious play. Epic growth." (title-case variants survive only in sanctioned doctrine prose + one lab doc). But it ships only in the footer legal row and on /design-system, where its one prominent specimen renders in synthesized faux italic. Options: give it one closing-panel moment, activate the PL+EPIC decoder, or accept it as internal doctrine and stop investing.

**d. "Typography could use improvements" — VALIDATED, with three confirmed defects (not the expected ones):**
1. **Faux italics site-wide (P1):** both font links load `wght` only, no `ital` axis; styles.css sets italic on the signature pull quote, testimonial quotes, and the ds tagline specimen — every italic on the site is a synthesized oblique of the brand font. Zilla Slab has a true italic; one-line URL fix.
2. **Unrenderable spec:** `.label` and DESIGN.md specify JetBrains Mono 600; pages load 400;700 only — labels render 700; the published spec cannot render.
3. **Flat scale step:** h3 clamp bottoms at h4's fixed 1.15rem — indistinguishable below ~900px.
4. **Uppercase leakage:** 19 uppercase rules; `.shift-col h3` (Plus Jakarta uppercase headings) and `.big-stat-label` violate the "mono labels + trust bar only" written rule.
Zilla Slab display authority at 700: genuinely holds at 1440 and 390. Scale ratios otherwise sound. Letter-spacing all within floors (tightest -0.025em). Line-height-trap compliance: 100%. Color token drift DESIGN.md↔CSS: zero.

## What's Working

1. The hero: price + subsidy arithmetic in the subhead, one accent, asymmetric grid, complete mobile fold. Best single frame on the site, and the pattern interrupt that buys trust with this ICP.
2. The crystalline butterfly at display size + the motion system behind it (poster-first, reduced-motion branches, choreography resolving to locked geometry).
3. Proof density over adjectives: named testimonials, monochrome client row, explicit Töötukassa mechanics, structured data, zero color-token drift, 100% line-height-trap compliance.

## Priority Issues

- **[P1] Faux italics on brand-critical text.** Signature pull quote + brand line render as synthesized obliques. Fix: add `ital` axis to the two font links (or drop italic styling). Inspectable craft gain; trivial. → `$impeccable typeset`
- **[P1] Butterfly small-size program.** The identity's crown asset smudges at the size it appears most. Fix: simplified ≤32px/favicon variant, geometricPrecision in header. → `$impeccable polish` (delegable; strategically deferrable)
- **[P2] Canon/reality contradictions on the public rigor-proof page.** Lockup order (canon butterfly-first vs 100% shipped wordmark-first), false "No mirrored geometry" claim + V→DK/B→DK contradiction, Mono 600 spec vs 400;700 loaded, uppercase rule vs 19 rules. Reconcile doc to reality, encode in design-guard. → `$impeccable document`
- **[P2] Self-banned hero-metric stat cards** duplicating hero badge numbers. Replace with one concrete hackathon outcome. → `$impeccable distill`
- **[P3] Page ends on Skill Tree detour, not the booking decision**; refund promise buried in accordion with unlinked "Conditions apply". → `$impeccable layout` / `$impeccable clarify`

## Persona Red Flags

- **Jordan (non-technical agency CEO):** "Talk to Kaido" CTA before Kaido is introduced (section 6); pseudocode is noise to him; "8.7/10" has no stated n; the logo row that converts him is two scrolls below developer-speak.
- **Casey (mobile CTO):** sticky CTA goes to /training/ while hero CTA books a call — identical orange, different intent; butterfly hidden on mobile ≤900px so the brand is one 30px smudge for half the traffic; no jump-nav on the long scroll.
- **Marten (hype-burned Tallinn CTO):** "3-5× faster" + "3x or refund… Conditions apply" with no linked conditions is exactly the multiplier pattern he distrusts; the verify story he'd probe for is on the page only as decoration; cream+serif Claude adjacency reads "another Claude-wrapper shop" until the client roster lands.

## Minor Observations

- Scroll-reveal gates all below-fold content at opacity:0 — print/reader modes/some crawlers see hero + blank page + footer (violates the skill's reveal-must-enhance-visible-default rule).
- `.progress-bar` ships a vivid-green linear-gradient (survives flat-surface doctrine).
- index.html nav lacks `aria-current`; three redundant trust surfaces; mobile ghost link breaks hero centering; 404.html inline literal font families.
- Rounded scale exists in DESIGN.md frontmatter but has no `--rounded-*` CSS tokens (radii hardcoded); non-hero h1 scale undocumented in frontmatter.
- No Finnish tagline equivalent exists (ET fallback only) while FI entry is the H2 hypothesis.

## Questions to Consider

1. If the butterfly is the only asset no competitor can copy, why does it appear legible exactly once (desktop hero) and not at all on mobile — is the identity the mark, or the cream?
2. Your ICP reads /design-system — when a technical peer finds faux italics, an unloadable weight, and a false asymmetry story on the rigor-proof page, does the training claim gain or lose?
3. Is "Curious play. Epic growth." a tagline or internal doctrine? If a tagline: one closing-panel moment + document the PL+EPIC decoder. If doctrine: delete it from the customer surface.
4. How much of the warm-paper lane is strategy (Anthropic adjacency) vs osmosis — does the identity survive if Anthropic's visual language moves next year?
5. The strategy's own rule says work below priority #5 delegates or slips, and the Aug 14 gate is 23 days out: which of these findings, if any, earns founder attention before a Squad 3 booking exists?
