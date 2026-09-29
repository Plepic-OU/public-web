# Google Ads: state and change log

Read this before you say anything about Ads, and append to it when you change the account or the landing page. Live numbers come from the API, never from this page.

## Rules

- Authority rules live in the vault's root `CLAUDE.md`. This page records what was done and why.
- Log every account change and every `/training/` change the day it ships: date, what, why, the check that judges it.
- Judge a change at its check date against its stated check. At ~600 impressions a month, a week-over-week reading is noise.
- The website keeps shipping. Log a page change here; do not hold it for Ads.

## Current setup (2026-09-28)

- One campaign, "Claude Code Training - Search": Estonia, English + Estonian, Target Impression Share 90% top of page, EUR 7 CPC cap, EUR 15/day. The bidding strategy is deliberate; do not propose replacing it.
- Demand, not budget, is the limit: ~90% impression share, 0% lost to budget since August.
- Campaign counts only two conversions: registration-form click and booking click (campaign goals narrowed 2026-08-10). Account-level primary flags on Google-generated actions are immutable and do not affect this campaign.
- GA4 real traffic is hostname `plepic.com` / `www.plepic.com`. Before 2026-09-28, `localhost` and `127.0.0.1` sessions are CI test runs; exclude them.
- Ad clicks were partly invisible to GA4 until 2026-09-27 (CSP). Do not compare conversions across that date.

## Quality Score (2026-09-28)

QS is 3 or lower on every keyword. Components, unchanged every week since July: landing page experience BELOW_AVERAGE and expected CTR BELOW_AVERAGE on every keyword; ad relevance ABOVE_AVERAGE, AVERAGE on "agentic engineering". Two parts below average cap QS at 3, so ad copy alone cannot lift it. Mobile Lighthouse on `/training/` is 100, so speed is not the landing-page problem; relevance to the searched phrase is.

## Decisions

- Registration-form click is worth EUR 2,520, the seat price (Kaido 2026-08-27, reconfirmed 2026-09-28). The site sends the same value.
- Subsidy wording is "Töötukassa reimburses 80%" in ads and page headlines (Kaido 2026-09-28). The 50% de minimis case is stated once, in the `/training/` subsidy card.

## Change log

| Date | Change | Why | Check (date: criterion) |
|---|---|---|---|
| 2026-08-01 | 11 campaign negatives incl. exact `claude code` | product-seekers, 39% of impressions | done |
| 2026-08-10 | Campaign goals narrowed to form + booking click | junk conversions | done |
| 2026-09-10 to 09-15 | Ad copy rewrites, sitelinks, callouts | "boring ads" pricing pass | not judged |
| 2026-09-27 | Ad final URLs to apex, sitelinks replaced | apex domain move | not judged |
| 2026-09-28 | `/training/` H1: "Claude Code training for dev teams" | landing page relevance for the intent keywords | 2026-11-23: landing page experience at least AVERAGE on 3 of 6 scored keywords |
| 2026-09-28 | GA4 reports from plepic.com hosts only | CI traffic was most of GA4's sessions | next weekly report: no localhost rows |
| 2026-09-29 | New ad group "Agentic Engineering" (5 keywords moved, old copies paused) with its own ad; old group renamed "Claude Code Training"; ET keywords paused; 9 definition negatives (`scripts/apply-qs-package.ts`) (agentic ai, agentic, meaning, definition, what is, agentic ide, agentic design, examples) | expected CTR, ad relevance | 2026-11-23: CTR at least 3% (from ~1.6%), avg CPC below EUR 3.99 |
| 2026-09-28 | Form click value 50 to 2,520 on the site; "up to 80%" to "80%" on /, /training/, /jobs/ | one value per action; Kaido's wording | done |
