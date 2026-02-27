# Google Ads API Design Document

**Company:** Plepic OÜ
**Application:** Google Ads Basic Access
**Date:** February 2026

---

## 1. Company Overview

Plepic OÜ is an Estonian technology training company specializing in agentic coding courses. We help professional developers (2+ years experience) learn to build AI-powered development workflows using Claude Code and similar tools.

**Website:** https://plepic.com
**Location:** Estonia, European Union
**Business Type:** B2B Technology Training

---

## 2. Use Case Description

We are building an automated system to optimize our Google Ads campaigns for lead generation. The system will:

1. **Export Performance Data**: Daily extraction of campaign, keyword, and search term performance metrics
2. **Analyze Performance**: Identify underperforming keywords and opportunities
3. **Execute Optimizations**: Make bid adjustments, pause underperformers, add negative keywords
4. **Log All Actions**: Maintain audit trail of all changes made

### Business Goals
- Reduce wasted ad spend on non-converting keywords
- Improve ROAS (Return on Ad Spend)
- Automate routine optimization tasks
- Maintain quality lead generation for training programs

---

## 3. API Operations Required

### Read Operations (GoogleAdsService.Search)

| Resource | Purpose | Frequency |
|----------|---------|-----------|
| campaigns | Get campaign performance, budgets, status | Daily |
| ad_groups | Get ad group performance metrics | Daily |
| ad_group_keywords | Get keyword performance, QS, bids | Daily |
| search_term_view | Identify converting/wasting search terms | Daily |
| metrics | CTR, CPC, conversions, cost, impressions | Daily |

**Example Query:**
```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.impressions,
  metrics.clicks,i 
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_14_DAYS
```

### Write Operations (GoogleAdsService.Mutate)

| Operation | Purpose | Guard Rails |
|-----------|---------|-------------|
| Update keyword bid | Adjust bids based on performance | Max ±20% per change |
| Update keyword status | Pause underperformers | €75+ spend, 0 conversions |
| Create negative keyword | Block irrelevant searches | Pattern matching, manual review |

**Daily Limits:**
- Maximum 10 bid changes per day
- Maximum 5 keyword pauses per day
- All operations logged to JSON files

---

## 4. Data Handling

### Data Storage
- Performance reports: JSON files stored locally (`analytics/reports/YYYY-MM-DD-ads.json`)
- Action logs: JSON files stored locally (`analytics/actions/YYYY-MM-DD.json`)
- No cloud storage of raw API data

### Data Retention
- Reports retained for 90 days for trend analysis
- Action logs retained indefinitely for audit purposes

### Privacy & PII
- No personal user data collected from API
- Only aggregate metrics (impressions, clicks, costs)
- No customer data, email addresses, or identifying information accessed

---

## 5. Rate Limiting & Quotas

### Expected Usage
- **API Calls per Day:** ~50-100 (well within quotas)
- **Operations per Day:** ~2,880 maximum (within Explorer limits)
- **Accounts Managed:** 1 (own account only)

### Our Implementation
- Single daily batch run at 6:00 AM UTC
- Exponential backoff on rate limit errors
- Caching to minimize redundant API calls

---

## 6. Security Measures

### Authentication
- OAuth 2.0 with refresh tokens
- Credentials stored in environment variables
- No credentials committed to version control

### Access Control
- Single developer account access
- No third-party access to credentials
- API access limited to our own Google Ads account

### Audit Trail
- All API operations logged with timestamps
- Action logs include before/after values
- Weekly review of automated changes

---

## 7. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
│                 (Scheduled: 6 AM UTC)                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              export-ads.ts                              │
│   - Fetches campaigns, keywords, search terms           │
│   - Saves to analytics/reports/YYYY-MM-DD-ads.json      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              optimize-ads.ts                            │
│   - Reads performance data                              │
│   - Applies guard rails from ads-config.json            │
│   - Executes allowed optimizations                      │
│   - Logs all actions                                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              ads-operations.ts                          │
│   - API wrapper with safety checks                      │
│   - Enforces daily limits                               │
│   - Handles OAuth refresh                               │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Configuration & Guard Rails

```json
{
  "limits": {
    "max_bid_change_percent": 20,
    "max_daily_bid_changes": 10,
    "pause_threshold_spend_no_conversion": 75,
    "min_data_days_before_action": 14,
    "min_impressions_before_action": 200
  },
  "targets": {
    "target_cpa": 50,
    "target_roas": 5
  }
}
```

---

## 9. Compliance

- **GDPR:** No personal data processed; only aggregate ad metrics
- **Google Ads Terms:** Compliance with all Google Ads API terms of service
- **No Reselling:** API access for internal use only, not resold to third parties

---

## 10. Contact Information

**Technical Contact:**
Kaido Koort
kaido@plepic.com
+372 5077 333

**Company:**
Plepic OÜ
Estonia
