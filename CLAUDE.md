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

**Local development:** `npm run serve` starts a local server on port 8080.

**Branching:** `main` is protected. All changes via PRs from feature branches. Create the branch BEFORE making any changes.

### Design Workflow

**Never bulk-rewrite HTML/CSS for design changes.** Design is not refactoring.

1. **Feature branch first.** Before touching any file.
2. **One section at a time.** Start with the hero or one key component. Get feedback before expanding.
3. **Visual iteration loop (Chrome DevTools MCP):**
   - Start local server: `npm run serve`
   - Open page via `navigate_page` MCP tool
   - Make a CSS/HTML change
   - `take_screenshot` → evaluate the result visually
   - Adjust and repeat
   - Never write more than ~20 lines of CSS without screenshotting
4. **For major redesigns:** Create a standalone `prototype.html` first. Iterate on it. Only port to production files once the design is proven.
5. **Playwright for verification:** After design work is done, run `npm run test:visual` as a final quality gate.

**Design principles ≠ token swaps.** "Nature-digital fusion" means organic shapes and asymmetric layouts, not `--color-cyan` → `--color-green`.

**Deployment:** GitHub Pages from `main` branch. Merge PR = deploy. Custom domain: plepic.com

**Design system:** CSS custom properties in `:root`. Full reference at `prototype-design-system.html`.

**Locked palette (2026-04-01):** All greens at H=137°. System saturation S=73%, vivid exception S=100%. Accent S-matched.
- `--green` (`#00c638`) — decorative: dots, fills, dark-mode headings. Not text on light.
- `--green-brand` (`#137b30`) — logo, headings, links. AA on cream/white.
- `--green-dark` (`#0d5822`) — body text. AAA on cream/white.
- `--green-light` (`#c5f6d3`) — badge fills, borders.
- `--green-surface` (`#edfcf1`) — tinted backgrounds.
- `--accent` (`#e26c45`) — CTA buttons, urgency badges. One per viewport max.

**Key CSS patterns:**
- Nature-digital aesthetic with `Zilla Slab` (headings/logo), `Plus Jakarta Sans` (body), `JetBrains Mono` (code)
- Light mode only. Warm cream background `#faf7f2`, no pure black/white
- CSS grid layouts
- All spacing uses `--space-*` tokens
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

All scripts auto-load `.env` via `dotenv/config` — no manual `source .env` needed.
