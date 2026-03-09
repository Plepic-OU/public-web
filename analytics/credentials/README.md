# API Credentials Setup

All credentials are managed via **environment variables** — no JSON files needed.

## Local Development

Add credentials to `.env` in the project root (gitignored):

```bash
# Google Analytics 4
GA4_PROPERTY_ID=515893461
GA_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GA_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA_SERVICE_ACCOUNT_JSON='{"type":"service_account", ...}'  # Full JSON, single line

# Google Ads API
ADS_CUSTOMER_ID=1234567890
ADS_DEVELOPER_TOKEN=your-developer-token
ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
ADS_CLIENT_SECRET=your-client-secret
ADS_REFRESH_TOKEN=your-refresh-token
```

Then source before running scripts:

```bash
source .env
npx ts-node scripts/export-analytics.ts
npx ts-node scripts/export-ads.ts
```

## CI (GitHub Actions)

Secrets are configured as GitHub Actions repository secrets. The analytics workflow passes them as env vars automatically.

| Secret | Description |
|--------|-------------|
| `GA4_PROPERTY_ID` | GA4 numeric property ID |
| `GA_SERVICE_ACCOUNT_JSON` | Full service account JSON (single line) |
| `ADS_DEVELOPER_TOKEN` | Google Ads developer token |
| `ADS_CLIENT_ID` | OAuth client ID |
| `ADS_CLIENT_SECRET` | OAuth client secret |
| `ADS_REFRESH_TOKEN` | OAuth refresh token |
| `ADS_CUSTOMER_ID` | Google Ads customer ID (no dashes) |

## Obtaining Credentials

### Google Analytics 4 Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Analytics Data API"
3. Create a service account and generate a JSON key
4. Add the service account email as Viewer in GA4 Admin → Property Access Management
5. Paste the JSON key content into `GA_SERVICE_ACCOUNT_JSON` env var

### Google Ads API
1. Enable "Google Ads API" in Cloud Console
2. Apply for a developer token at [Google Ads API Center](https://ads.google.com/aw/apicenter)
3. Create OAuth 2.0 Client ID (Desktop application)
4. Generate a refresh token via the OAuth2 flow

## Testing Credentials

```bash
source .env
npx ts-node scripts/export-analytics.ts --test
npx ts-node scripts/export-ads.ts --test
```

## Security Notes

- `.env` is gitignored — never commit it
- Rotate refresh tokens periodically
- Use least-privilege access (Viewer for GA4, Basic for Ads)
- Monitor API usage in Cloud Console
