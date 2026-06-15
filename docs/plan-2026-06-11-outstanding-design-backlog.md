# Outstanding Design Backlog: Plan (2026-06-11)

> STATUS: ALL TRANCHES EXECUTED 2026-06-11.
> T1 = PR #135 (suite 26/26 green), T4 = PR #136, T5 = PR #137,
> T3 = critique re-measure 26 -> 30/40 (snapshot in PR #138),
> T2 = parent repo PR #96 (pointer at 748c567).
> Next backlog lives in .impeccable/critique/2026-06-11T12-35-18Z__design-system-html.md
> (two new P1s: training-hero mech-* stat cards, watermark butterfly doctrine).

Everything left after PRs #128-#134 closed the critique's P1/P2 items.
Each tranche is one PR. Concrete edits below.

---

## Tranche 1: Test suite green-up (~30 min, recommended first)

`npm test` currently fails on 6 a11y + 2 security tests. All pre-existing,
all diagnosed, all small. After this PR the suite is green and CI becomes
a real gate.

### 1a. Footer Privacy link contrast (fixes all 6 a11y failures)

Diagnosis: axe flags ONE element on all three pages: the footer Privacy
link inherits the global `a { color: var(--green-brand) }` (#137b30) on
the dark footer (#2a2a25) = 2.68:1. It also fails link-in-text-block
(1.89:1 vs the surrounding #9a9a90 text).

Fix in `css/styles.css` (after `.footer-company-info strong`, ~line 1228):

    .footer-company-info a {
      color: var(--green-vivid);          /* 7.4:1 on dark, AAA */
      text-decoration: underline;          /* satisfies link-in-text-block */
      text-underline-offset: 3px;
    }

### 1b. Security test: stale frame-src expectation (fixes 2 failures)

`tests/security.spec.ts:17` expects `frame-src 'none'` on every page, but
/claude-code/ legitimately allows `https://www.youtube-nocookie.com` for
the webinar embed. The page is right; the test is stale.

Fix: per-page expected directives:

    const pages = [
      { name: 'homepage',    path: '/',             frameSrc: "frame-src 'none'" },
      { name: 'claude-code', path: '/claude-code/', frameSrc: "frame-src https://www.youtube-nocookie.com" },
      { name: 'training',    path: '/training/',    frameSrc: "frame-src 'none'" },
    ];

### 1c. A11y test: stop scanning YouTube's internal DOM

axe reaches into the YouTube iframe on /claude-code/ and flags Google's
own `#movie_player` div (aria-prohibited-attr). Not our markup.

Fix in `tests/a11y.spec.ts` (~line 17), next to the existing
`.exclude('.hero-bottom')`:

    .exclude('iframe')   // third-party embed internals (YouTube) are not ours to fix

---

## Tranche 2: Parent repo submodule bump (~5 min)

The parent repo's `public-web` pointer is 7 merges behind
(d4baa0e -> post-#134 main). Mechanics: branch off `master` in the parent,
commit only the submodule pointer, PR, merge, return to `grant-visuals`.
Your grant work stays untouched (the dirty Scopeful file is simply not staged).

---

## Tranche 3: Re-critique (~10 min, no code)

Re-run `$impeccable critique design-system.html`. Baseline was 26/40
(0 P0, 3 P1). All three P1s and both P2s are now shipped, so the score
should move; the trend line tells us if tranches 4/5 are worth their cost.

---

## Tranche 4: Small leftovers (one PR, ~1-2 h)

1. **404 page**: closer to brand than the critique suggested, but has real
   drift: white text on the orange button (system is dark-on-orange, like
   .btn-primary), a banned accent hover variant (#d15a35) + glow shadow,
   14px button radius, no butterfly mark, no wayfinding. Fix: align the
   button to system tokens, add the butterfly SVG (copy from /design-system
   Section 8), add text links to /training/, /claude-code/, /scopeful/.
2. **Footer secondary nav** (4 pages): the footer has contact links but no
   site links. Add a small row: Claude Code / Training / Scopeful / Privacy.
   Cross-page consistency rule applies: same markup on all four pages.
3. **FAQ grouping** (index.html:505): 12 flat items -> 3 groups with small
   headings: The Program / Pricing & Subsidy / Approach. Markup-only
   regrouping of existing `<details>` items; no copy changes.
4. **Tootukassa naming** (NEEDS KAIDO'S YES/NO): the subsidy copy says
   "Estonian state subsidy via the employer portal" without naming the
   institution. An Estonian CTO knows Tootukassa; naming it adds
   credibility. One-line copy change on / and /training/ if approved.

---

## Tranche 5: DS-page component specimens (~half a day, one section at a time)

/design-system documents buttons/badges/heroes/logo but production runs
~14 more components, now documented textually in DESIGN.md only. Add
rendered specimens to the page (the page IS public and pitched as the
canonical reference):

- Wave 1 (most reused): pull quote, stat card, info card variants,
  FAQ accordion, sticky CTA (static specimen).
- Wave 2: team card + skill tags, pricing pair, timeline, flow steps,
  comparison cards, footer.
- Plus: a sticky jump-nav for the page (it's ~12,000px and growing).

Per the design workflow: feature branch, one specimen section at a time,
screenshot every change, no parallel agents.

---

## Parked (deliberately not scheduled)

- **220-inline-style refactor** of design-system.html: pure churn; labels
  and contrast are already fixed.
- **Living partials** (DS page rendering the same HTML as production):
  needs a build step on a deliberately build-free site. Revisit only if
  drift recurs despite DESIGN.md.
- **Estonian-language site**: real strategic question (Estonian ICP, ET
  brand line), but it belongs in marketing strategy, not this arc.
- **Performance pass** (render-blocking fonts, ~60KB inline SVG per page):
  do when Lighthouse/GA4 shows it costs conversions.
- **Pre-existing failures elsewhere**: none left after Tranche 1.
