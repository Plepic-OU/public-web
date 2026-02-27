# Google Ads Automation - Setup Status

**Last Updated:** 2026-02-27
**Status:** Waiting for Basic Access approval

---

## Current State

| Component | Status |
|-----------|--------|
| API Scripts (`scripts/export-ads.ts`, `optimize-ads.ts`) | Ready |
| Config (`analytics/ads-config.json`) | Ready (autonomous_mode: false) |
| GitHub Actions workflow | Ready (`.github/workflows/ads-optimization.yml`) |
| Google Ads Scripts (backup) | Ready (`google-ads-scripts/`) |
| Basic Access Application | **SUBMITTED** - 2026-02-27 |
| Developer Token | Test Account Access (waiting for upgrade) |

---

## When Basic Access is Approved

Run these steps in order:

### Step 1: Verify API Access
```bash
cd public-web
npx ts-node scripts/export-ads.ts --test
```
Expected: Should connect without "Test Account" error.

### Step 2: Test Export
```bash
npx ts-node scripts/export-ads.ts
```
Expected: Creates `analytics/reports/YYYY-MM-DD-ads.json`

### Step 3: Test Optimization (Dry Run)
```bash
npx ts-node scripts/optimize-ads.ts --dry-run
```
Expected: Shows recommendations without making changes.

### Step 4: Add GitHub Secrets

Go to: https://github.com/Plepic-OU/public-web/settings/secrets/actions

Add these secrets:
- `GOOGLE_ADS_CLIENT_ID` - OAuth client ID
- `GOOGLE_ADS_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_ADS_REFRESH_TOKEN` - From `analytics/credentials/`
- `GOOGLE_ADS_DEVELOPER_TOKEN` - From API Center
- `GOOGLE_ADS_CUSTOMER_ID` - `1787457221` (without dashes)
- `NOTIFICATION_EMAIL` - kaido@plepic.com

Optional (for email notifications):
- `SMTP_USERNAME`
- `SMTP_PASSWORD`

### Step 5: Enable Autonomous Mode

Edit `analytics/ads-config.json`:
```json
{
  "autonomous_mode": true,
  "notifications": {
    "notification_email": "kaido@plepic.com"
  }
}
```

### Step 6: Test Full Pipeline
```bash
npm run analytics:pipeline
```

### Step 7: Trigger GitHub Actions Manually

Go to: https://github.com/Plepic-OU/public-web/actions/workflows/ads-optimization.yml

Click "Run workflow" to test the scheduled job.

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/export-ads.ts` | Exports campaigns, keywords, search terms to JSON |
| `scripts/optimize-ads.ts` | Pauses underperformers, adjusts bids |
| `scripts/ads-operations.ts` | API wrapper with safety limits |
| `analytics/ads-config.json` | Thresholds and settings |
| `analytics/reports/` | Daily performance exports |
| `analytics/actions/` | Logs of all automated changes |
| `.github/workflows/ads-optimization.yml` | Daily scheduled workflow (6 AM UTC) |
| `google-ads-scripts/` | Backup: Native Google Ads Scripts |

---

## Guard Rails (Built-in Safety)

- Max 20% bid change per keyword
- Max 10 bid changes per day
- Keywords must have €75+ spend AND 0 conversions before pause
- 14 days minimum data required before action
- 200+ impressions required before action
- All actions logged to `analytics/actions/`

---

## Troubleshooting

**"Test Account Access" error:**
- Basic Access not yet approved, or wrong developer token

**OAuth errors:**
- Regenerate refresh token: `npx ts-node scripts/get-ads-refresh-token.ts`

**No data returned:**
- Check customer ID is correct (without dashes)
- Verify campaigns exist and have recent activity

---

## Application Details

- **Submitted:** 2026-02-27
- **Design Document:** `docs/google-ads-api-design.md`
- **API Center:** https://ads.google.com/aw/apicenter

Typical approval time: days to weeks. Check API Center for status updates.
