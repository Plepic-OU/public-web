---
name: analytics-review
description: Run a GA4 + Google Ads review of plepic.com — pull current data via the export scripts, compute week-over-week deltas, write the review to analytics/reviews/, and apply high-priority fixes. Use for weekly analytics reviews, conversion-value questions, or when deciding whether a metric has crossed an action threshold.
---

# Analytics review (plepic.com)

## Data sources

GA4 + Ads data is queried live on demand via the export scripts (`scripts/export-analytics.ts`, `scripts/export-ads.ts`). Each invocation overwrites a temp report at `analytics/reports/YYYY-MM-DD-{ga4,ads}.json`. No historical archive is maintained; query by `--date` for prior periods.

## Conversion values

Modeled values, not realized revenue. Clicks are intent (lead value), not sales. The site emits only click/intent events today (registration and booking happen on external Google Forms/Calendar), so the completion rows score only if real completion tracking is added later.

| Event | Value | Type |
|-------|-------|------|
| `form_submit` (completed registration) | €2,520 | completion (net/seat, not currently emitted) |
| `calendar_booking` (completed call) | €50 | completion (not currently emitted) |
| `google_form_signup` (form click) | €50 | intent |
| `calendar_click` (book-a-call click) | €25 | intent |
| Email/Phone contact click | €5 | intent |
| Discord click | €2 | intent |
| LinkedIn click | €1 | intent |

## Review process

1. Run the export scripts to pull current data
2. Re-run with `--date` flag for prior week to compute deltas
3. Generate review in `analytics/reviews/YYYY-MM-DD-review.md`
4. Identify actionable improvements
5. Implement high-priority fixes directly

## Decision thresholds

**Site performance:**
- Bounce rate >70% on any page → investigate immediately
- Conversion rate drops >20% week-over-week → urgent review
- Mobile bounce >desktop+15% → mobile UX issue

**Google Ads triggers:**
- CPC rises >30% week-over-week → review ad copy/targeting
- CTR drops below 2% → ad fatigue, need creative refresh
- Quality Score <5 on any keyword → landing page or relevance issue
- Cost per conversion >€100 → pause/review campaign
- ROAS drops below 5:1 → investigate funnel

Acting on any of these is bounded by the Google Ads Operations Guardrails in `CLAUDE.md` — read them before changing anything in the Ads account.
