# Google Ads Scripts

These scripts run directly in the Google Ads UI - no developer token or API approval needed.

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `export-to-sheets.js` | Export performance data to Google Sheets | Daily 6 AM |
| `daily-optimization.js` | Auto-optimize bids, pause underperformers | Daily 7 AM |

## Setup Instructions

### Step 1: Create Google Sheet (for export script)

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Plepic Ads Data"
3. Create these tabs (sheets): `Summary`, `Campaigns`, `Keywords`, `SearchTerms`
4. Copy the spreadsheet URL

### Step 2: Add Export Script

1. Go to [Google Ads](https://ads.google.com)
2. Click **Tools & Settings** (wrench icon) → **Scripts**
3. Click the **+** button to create a new script
4. Name it "Daily Export to Sheets"
5. Delete the default code and paste contents of `export-to-sheets.js`
6. Replace `YOUR_GOOGLE_SHEET_URL_HERE` with your spreadsheet URL
7. Click **Authorize** and grant permissions
8. Click **Preview** to test (check the Logs tab for output)
9. Click **Run** to execute once
10. Set up schedule: **Frequency** → Daily, **Time** → 6:00 AM

### Step 3: Add Optimization Script

1. In Google Ads Scripts, create another new script
2. Name it "Daily Optimization"
3. Paste contents of `daily-optimization.js`
4. Review the `CONFIG` section and adjust values if needed:
   - `TARGET_CPA`: Your target cost per conversion
   - `CONVERSION_VALUE`: Value of a form signup (€504)
   - `PAUSE_SPEND_NO_CONVERSION`: Spend threshold before pausing (€50)
5. **Important:** Keep `DRY_RUN: true` for first run
6. Click **Preview** to see what changes would be made
7. Review the logs carefully
8. When satisfied, set `DRY_RUN: false`
9. Schedule: **Frequency** → Daily, **Time** → 7:00 AM

## What the Scripts Do

### Export Script
- Exports yesterday's data to Google Sheets
- Creates daily rows in Summary tab (historical tracking)
- Overwrites Campaigns/Keywords/SearchTerms tabs with latest data
- Search terms cover last 7 days for better patterns

### Optimization Script
- **Pauses keywords** that spent >€50 with 0 conversions (over 7 days)
- **Pauses keywords** with Quality Score ≤3 and no conversions
- **Increases bids** for keywords with ROAS >10:1 (up to 20%)
- **Decreases bids** for keywords with CPA >€200 (down 20%)
- **Adds negative keywords** for irrelevant search terms with spend

### Irrelevant Terms (Auto-Negative)
The script automatically adds negatives for search terms containing:
- Job-related: free, jobs, salary, career, hiring, recruit, resume, cv
- Educational: certificate, degree, university, college
- Other: download, pdf, tutorial, youtube

## Monitoring

### Check Script Runs
1. Go to **Tools & Settings** → **Scripts**
2. Click on script name
3. View **History** tab to see all runs
4. Click any run to see detailed logs

### View Data in Sheets
The Google Sheet becomes your analytics dashboard:
- **Summary** tab: Daily trends over time
- **Keywords** tab: Current keyword performance
- **SearchTerms** tab: What people actually searched

### Email Notifications (Optional)
In `daily-optimization.js`, set:
```javascript
NOTIFY_EMAIL: 'your@email.com',
```

## Safety Features

1. **DRY_RUN mode**: Preview all changes before executing
2. **Labels**: Paused keywords get labeled `auto-paused` for easy filtering
3. **Conservative thresholds**: Default €50 spend threshold prevents premature pauses
4. **Max 20% bid change**: Prevents drastic bid swings
5. **Logging**: All actions logged for review

## Reverting Changes

### Re-enable Auto-Paused Keywords
1. In Google Ads, go to **Keywords**
2. Filter by label: `auto-paused`
3. Review each keyword
4. Select and click **Enable** to reactivate

### Undo Bid Changes
Bid changes are incremental (max 20%). If needed:
1. Check script logs for original bid amounts
2. Manually adjust bids in Google Ads UI

## Customization

### Change Thresholds
Edit the `CONFIG` object in `daily-optimization.js`:
```javascript
var CONFIG = {
  PAUSE_SPEND_NO_CONVERSION: 75,  // More conservative
  TARGET_CPA: 80,                  // Lower target
  MAX_BID_CHANGE_PERCENT: 15,     // Smaller bid changes
  // ...
};
```

### Add Irrelevant Patterns
Edit the `IRRELEVANT_PATTERNS` array:
```javascript
var IRRELEVANT_PATTERNS = [
  'free', 'jobs', // ... existing
  'internship',   // Add new terms
  'volunteer',
];
```

## Troubleshooting

### "No data exported"
- Ensure campaigns have impressions in the date range
- Check that Google Ads account has active campaigns

### "Authorization required"
- Click the **Authorize** button in the script editor
- Grant all requested permissions

### "Sheet not found"
- Verify the spreadsheet URL is correct
- Ensure all required tabs exist (Summary, Campaigns, etc.)

### "Quota exceeded"
- Google Ads Scripts have daily limits
- Reduce `LIMIT` values in queries if needed
