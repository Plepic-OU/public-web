# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plepic is a static marketing website for an Estonian tech training company. The site promotes agentic coding training using Claude Code, targeting developers with 2+ years experience.

## Architecture

**Static HTML + CSS only** - No build system, bundler, or JavaScript framework. Files are served directly.

```
index.html          # Homepage
agent/index.html    # What is an AI Agent? (educational)
training/index.html # Training program details & enrollment
css/styles.css      # Single stylesheet with CSS custom properties
images/             # All static assets (logos, photos)
docs/               # Design documents and one-pagers
```

## Development

**Local development:** Open HTML files directly in browser or use any static file server.

**Branching:** All development work should be done in a separate feature branch, not directly on `main`.

**Deployment:** GitHub Pages from `main` branch. Push to main = deploy. Custom domain: plepic.com

**Design system:** CSS uses custom properties (design tokens) defined in `:root`. Reference `docs/plans/2026-01-03-plepic-homepage-design.md` for design decisions.

**Key CSS patterns:**
- Starcraft-inspired retro-futuristic aesthetic with `Orbitron` (headings/logo), `Exo 2` (body), and `Share Tech Mono` (code/labels)
- CSS grid layouts with broken grid designs
- Brand colors: cyan `--color-cyan: #00ffff` and orange `--color-orange: #ff6600` on dark void `--color-void: #050508`
- All spacing uses 8px base unit via `--space-*` tokens
- Fonts loaded via `<link>` in HTML (not CSS @import) for faster discovery

## Content Notes

- English content for Estonian market
- No forms on site - contact via external links (email, phone, LinkedIn, Google Calendar)
- Registration uses external Google Forms (QR code)
- Company logos are inline SVGs for performance, also PNG images
- Team photos use `filter: grayscale(100%)`

---

## Analytics-Driven Improvements

### Data Location
- GA4 reports: `analytics/reports/YYYY-MM-DD-ga4.json`
- Ads reports: `analytics/reports/YYYY-MM-DD-ads.json`
- Action logs: `analytics/actions/YYYY-MM-DD.json`
- Optimization config: `analytics/ads-config.json`

### Analytics IDs
- GA4 Property: `G-65CCEV6RS9`
- Google Ads: `AW-17874572217` (Customer ID: `178-7457-2217`)

### Conversion Values
| Event | Value |
|-------|-------|
| Google Form signup | €504 |
| Calendar booking | €50 |
| Email/Phone contact | €5 |
| LinkedIn click | €1 |

### Weekly Review Process
When asked to review analytics or improve the site:
1. Read the most recent reports in `analytics/reports/`
2. Compare to previous week's data
3. Generate review in `analytics/reviews/YYYY-MM-DD-review.md`
4. Identify actionable improvements
5. Implement high-priority fixes directly

### Key Metrics (Full Funnel)
- **Traffic:** sessions, users, traffic sources, device split
- **Engagement:** bounce rate, time on page, scroll depth, pages/session
- **Conversion:** form signups, calendar bookings, contact clicks
- **Ad Efficiency:** CTR, CPC, ROAS, cost per conversion

### Decision Thresholds

**Site Performance:**
- Bounce rate >70% on any page → investigate immediately
- Conversion rate drops >20% week-over-week → urgent review
- Mobile bounce >desktop+15% → mobile UX issue

**Google Ads Triggers:**
- CPC rises >30% week-over-week → review ad copy/targeting
- CTR drops below 2% → ad fatigue, need creative refresh
- Quality Score <5 on any keyword → landing page or relevance issue
- Cost per conversion >€100 → pause/review campaign
- ROAS drops below 5:1 → investigate funnel

---

## Ads-Driven Website Improvements

### When Quality Score is Low (<5)
1. Check landing page relevance to keyword
2. Ensure keyword appears in H1 and first paragraph
3. Verify page load speed
4. Check mobile experience
5. Suggest landing page content updates

### When CTR is Low (<2%)
1. Review ad copy vs landing page promise
2. Check if headline matches search intent
3. Suggest more compelling CTA language
4. Consider new ad variations to test

### When Cost per Conversion is High (>€100)
1. Analyze which keywords are spending without converting
2. Identify high-traffic, low-conversion pages
3. Review conversion path friction
4. Suggest A/B test ideas for landing page

### When Search Terms Show Opportunity
1. Identify high-converting search terms
2. Check if website content covers these topics
3. Suggest new content or page sections
4. Flag irrelevant search terms for negative keywords

---

## Autonomous Google Ads Operations

User controls monthly spend limits directly via Google Ads. AI optimizes allocation within those limits. All actions are logged to `analytics/actions/`.

### ALLOWED - AI Acts Immediately

**Keyword Management:**
- PAUSE keyword if: spend >€50 with 0 conversions
- PAUSE keyword if: QS <3 and no conversions in 14 days
- ENABLE paused keyword if: QS improved to >5
- ADD negative keyword: from search terms with high spend, 0 conversions, irrelevant intent

**Bid Adjustments:**
- INCREASE bid up to 20%: for keywords with ROAS >10 and room in budget
- DECREASE bid by 20%: for keywords with CPA >2x target
- Set bid to €0.01: effectively pause without losing history

**Budget Redistribution:**
- REDISTRIBUTE daily budget: from underperforming to top-performing campaigns

### REQUIRES APPROVAL - AI Proposes, User Confirms
- Creating new campaigns
- Creating new ad groups
- Writing new ad copy
- Changing campaign-level settings
- Budget increases beyond current monthly limit
- Enabling previously paused campaigns

### NEVER ALLOWED
- Deleting campaigns/ad groups (only pause)
- Changing billing settings
- Account-level settings

---

## Screenshot-Driven Fixes

When user provides annotated screenshot (circles, arrows, highlights):
1. Identify the HTML element(s) in the highlighted area
2. Determine the issue type:
   - Red circle/oval = something wrong, needs fixing
   - Arrow pointing = "look at this" / alignment issue
   - X mark = remove this
   - Highlight = emphasize/improve this
3. Locate element in HTML by text content or structure
4. Propose minimal fix
5. Implement directly
6. Offer to take new screenshot for comparison

---

## Volatile Content (Update Directly in HTML)

| Content | File | Search Pattern |
|---------|------|----------------|
| Training dates | training/index.html | "March 6" or date range |
| Developers trained | index.html | "100+" or stats near hackathon |
| NPS score | index.html | "8.4/10" |
| Pricing | training/index.html | "€2520" or "€504" |
| Next cohort | training/index.html | cohort number/dates |

When updating stats:
1. Search for old value
2. Replace with new value
3. Check all 3 HTML files for consistency
4. Update any meta descriptions if relevant

---

## Cross-Page Consistency

These must be identical across index.html, agent/index.html, training/index.html:
- Lines 8-51: Analytics scripts
- Header HTML structure (nav links, CTA button)
- Footer HTML (contact info, links)
- CSS link path

Before any PR, verify consistency with diff checks.

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `export-analytics.ts` | Pull GA4 data | `npx ts-node scripts/export-analytics.ts` |
| `export-ads.ts` | Pull Google Ads data | `npx ts-node scripts/export-ads.ts` |
| `optimize-ads.ts` | Run autonomous optimization | `npx ts-node scripts/optimize-ads.ts` |

Add `--test` flag to test API connections, `--dry-run` for optimize-ads to preview without changes.
