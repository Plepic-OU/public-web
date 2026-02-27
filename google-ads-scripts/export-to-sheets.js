/**
 * Google Ads Script: Export Performance Data to Google Sheets
 *
 * Setup:
 * 1. Create a Google Sheet
 * 2. Copy the sheet URL and paste it in SPREADSHEET_URL below
 * 3. Go to Google Ads > Tools & Settings > Scripts
 * 4. Create new script, paste this code
 * 5. Schedule to run daily
 */

// Configuration
var SPREADSHEET_URL = 'YOUR_GOOGLE_SHEET_URL_HERE';
var DATE_RANGE = 'LAST_14_DAYS';

function main() {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');

  // Export campaigns
  exportCampaigns(spreadsheet, today);

  // Export keywords
  exportKeywords(spreadsheet, today);

  // Export search terms
  exportSearchTerms(spreadsheet, today);

  Logger.log('Export complete: ' + today);
}

function exportCampaigns(spreadsheet, date) {
  var sheet = getOrCreateSheet(spreadsheet, 'Campaigns');

  var query =
    "SELECT CampaignId, CampaignName, CampaignStatus, " +
    "Impressions, Clicks, Cost, Conversions, ConversionValue " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE Impressions > 0 " +
    "DURING " + DATE_RANGE;

  var report = AdsApp.report(query);
  var rows = report.rows();

  var data = [[
    'Date', 'Campaign ID', 'Campaign Name', 'Status',
    'Impressions', 'Clicks', 'Cost', 'Conversions', 'Conv. Value'
  ]];

  while (rows.hasNext()) {
    var row = rows.next();
    data.push([
      date,
      row['CampaignId'],
      row['CampaignName'],
      row['CampaignStatus'],
      row['Impressions'],
      row['Clicks'],
      row['Cost'],
      row['Conversions'],
      row['ConversionValue']
    ]);
  }

  if (data.length > 1) {
    sheet.clear();
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
}

function exportKeywords(spreadsheet, date) {
  var sheet = getOrCreateSheet(spreadsheet, 'Keywords');

  var query =
    "SELECT CampaignName, AdGroupName, Criteria, KeywordMatchType, " +
    "QualityScore, CpcBid, Impressions, Clicks, Cost, Conversions, " +
    "Status " +
    "FROM KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE Impressions > 0 " +
    "DURING " + DATE_RANGE;

  var report = AdsApp.report(query);
  var rows = report.rows();

  var data = [[
    'Date', 'Campaign', 'Ad Group', 'Keyword', 'Match Type',
    'Quality Score', 'CPC Bid', 'Impressions', 'Clicks', 'Cost',
    'Conversions', 'Status'
  ]];

  while (rows.hasNext()) {
    var row = rows.next();
    data.push([
      date,
      row['CampaignName'],
      row['AdGroupName'],
      row['Criteria'],
      row['KeywordMatchType'],
      row['QualityScore'],
      row['CpcBid'],
      row['Impressions'],
      row['Clicks'],
      row['Cost'],
      row['Conversions'],
      row['Status']
    ]);
  }

  if (data.length > 1) {
    sheet.clear();
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
}

function exportSearchTerms(spreadsheet, date) {
  var sheet = getOrCreateSheet(spreadsheet, 'Search Terms');

  var query =
    "SELECT CampaignName, AdGroupName, Query, " +
    "Impressions, Clicks, Cost, Conversions " +
    "FROM SEARCH_QUERY_PERFORMANCE_REPORT " +
    "WHERE Impressions > 0 " +
    "DURING " + DATE_RANGE;

  var report = AdsApp.report(query);
  var rows = report.rows();

  var data = [[
    'Date', 'Campaign', 'Ad Group', 'Search Term',
    'Impressions', 'Clicks', 'Cost', 'Conversions'
  ]];

  while (rows.hasNext()) {
    var row = rows.next();
    data.push([
      date,
      row['CampaignName'],
      row['AdGroupName'],
      row['Query'],
      row['Impressions'],
      row['Clicks'],
      row['Cost'],
      row['Conversions']
    ]);
  }

  if (data.length > 1) {
    sheet.clear();
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
}

function getOrCreateSheet(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}
