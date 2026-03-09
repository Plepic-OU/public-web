# API Credentials Setup

This directory stores API credentials for Google Analytics and Google Ads.
**These files are gitignored and must never be committed.**

## Required Credentials

### 1. Google Analytics 4 Service Account

**File:** `ga-service-account.json`

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select project: `plepic-analytics`
3. Enable "Google Analytics Data API"
4. Go to IAM & Admin → Service Accounts
5. Create service account: `plepic-analytics@PROJECT_ID.iam.gserviceaccount.com`
6. Create and download JSON key
7. Save as `ga-service-account.json` in this directory
8. In GA4 Admin → Property → Property Access Management:
   - Add service account email as Viewer

**GA4 Property ID:** `G-65CCEV6RS9` (numeric ID needed for API)

### 2. Google Ads API Credentials

**File:** `ads-credentials.json`

**Setup Steps:**
1. In Google Cloud Console (same project):
   - Enable "Google Ads API"
2. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
   - Apply for developer token (Basic access level)
3. Create OAuth2 credentials:
   - Create OAuth 2.0 Client ID (Desktop application)
   - Download client secrets
4. Generate refresh token using OAuth2 flow
5. Create `ads-credentials.json`:

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "developer_token": "YOUR_DEVELOPER_TOKEN",
  "customer_id": "178-7457-2217",
  "login_customer_id": "178-7457-2217"
}
```

**Google Ads Customer ID:** `AW-17874572217` (format: `178-7457-2217` for API)

## GitHub Actions Secrets

For automated workflows, add these secrets to the repository:

| Secret Name | Value |
|-------------|-------|
| `GA_SERVICE_ACCOUNT_JSON` | Contents of `ga-service-account.json` |
| `ADS_CLIENT_ID` | OAuth client ID |
| `ADS_CLIENT_SECRET` | OAuth client secret |
| `ADS_REFRESH_TOKEN` | OAuth refresh token |
| `ADS_DEVELOPER_TOKEN` | Google Ads developer token |
| `ADS_CUSTOMER_ID` | `1787457221` (no dashes) |

## Testing Credentials

```bash
# Test GA4 credentials
npx ts-node scripts/export-analytics.ts --test

# Test Ads credentials
npx ts-node scripts/export-ads.ts --test
```

## Security Notes

- Never commit credential files
- Rotate refresh tokens periodically
- Use least-privilege access (Viewer for GA4, Basic for Ads)
- Monitor API usage in Cloud Console
