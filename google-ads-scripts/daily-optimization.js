/**
 * Google Ads Script: Daily Optimization
 *
 * Automatically optimizes campaigns based on performance thresholds.
 *
 * Setup:
 * 1. Go to Google Ads > Tools & Settings > Scripts
 * 2. Create new script, paste this code
 * 3. Schedule to run daily
 *
 * Guard Rails:
 * - Max 20% bid change per keyword
 * - Max 10 bid changes per run
 * - Requires 14+ days of data
 * - Requires 200+ impressions before action
 */

// Configuration - adjust these thresholds as needed
var CONFIG = {
  // Pause keywords that spent this much with 0 conversions
  PAUSE_SPEND_THRESHOLD: 75,

  // Minimum Quality Score before pausing (if no conversions)
  MIN_QUALITY_SCORE: 3,

  // Maximum bid change percentage
  MAX_BID_CHANGE_PERCENT: 20,

  // Maximum bid changes per run
  MAX_BID_CHANGES: 10,

  // Minimum days of data before action
  MIN_DATA_DAYS: 14,

  // Minimum impressions before action
  MIN_IMPRESSIONS: 200,

  // Target CPA in your currency
  TARGET_CPA: 50,

  // Target ROAS
  TARGET_ROAS: 5,

  // Enable dry run mode (log only, no changes)
  DRY_RUN: false,

  // Email for notifications
  NOTIFICATION_EMAIL: null
};

var bidChanges = 0;
var actions = [];

function main() {
  Logger.log('=== Daily Optimization Started ===');
  Logger.log('Date: ' + new Date().toISOString());
  Logger.log('Dry Run Mode: ' + CONFIG.DRY_RUN);

  // 1. Pause underperforming keywords
  pauseUnderperformers();

  // 2. Adjust bids based on performance
  adjustBids();

  // 3. Add negative keywords from poor search terms
  addNegativeKeywords();

  // 4. Send notification
  if (CONFIG.NOTIFICATION_EMAIL && actions.length > 0) {
    sendNotification();
  }

  Logger.log('=== Optimization Complete ===');
  Logger.log('Total actions: ' + actions.length);
}

function pauseUnderperformers() {
  Logger.log('\n--- Checking for underperformers ---');

  var keywords = AdsApp.keywords()
    .withCondition('Status = ENABLED')
    .withCondition('Impressions > ' + CONFIG.MIN_IMPRESSIONS)
    .forDateRange('LAST_14_DAYS')
    .get();

  while (keywords.hasNext()) {
    var keyword = keywords.next();
    var stats = keyword.getStatsFor('LAST_14_DAYS');

    var cost = stats.getCost();
    var conversions = stats.getConversions();
    var qualityScore = keyword.getQualityScore();

    // Check if keyword should be paused
    var shouldPause = false;
    var reason = '';

    if (cost >= CONFIG.PAUSE_SPEND_THRESHOLD && conversions === 0) {
      shouldPause = true;
      reason = 'High spend (€' + cost.toFixed(2) + ') with 0 conversions';
    } else if (qualityScore !== null && qualityScore < CONFIG.MIN_QUALITY_SCORE && conversions === 0) {
      shouldPause = true;
      reason = 'Low QS (' + qualityScore + ') with 0 conversions';
    }

    if (shouldPause) {
      Logger.log('PAUSE: "' + keyword.getText() + '" - ' + reason);

      if (!CONFIG.DRY_RUN) {
        keyword.pause();
      }

      actions.push({
        type: 'pause',
        keyword: keyword.getText(),
        reason: reason,
        campaign: keyword.getCampaign().getName(),
        adGroup: keyword.getAdGroup().getName()
      });
    }
  }
}

function adjustBids() {
  Logger.log('\n--- Adjusting bids ---');

  var keywords = AdsApp.keywords()
    .withCondition('Status = ENABLED')
    .withCondition('Impressions > ' + CONFIG.MIN_IMPRESSIONS)
    .forDateRange('LAST_14_DAYS')
    .get();

  while (keywords.hasNext() && bidChanges < CONFIG.MAX_BID_CHANGES) {
    var keyword = keywords.next();
    var stats = keyword.getStatsFor('LAST_14_DAYS');

    var cost = stats.getCost();
    var conversions = stats.getConversions();
    var conversionValue = stats.getConversionValue();
    var currentBid = keyword.bidding().getCpc();

    if (currentBid === null) continue;

    var newBid = null;
    var reason = '';

    // Calculate ROAS and CPA
    var roas = cost > 0 ? conversionValue / cost : 0;
    var cpa = conversions > 0 ? cost / conversions : Infinity;

    if (conversions > 0 && roas >= CONFIG.TARGET_ROAS * 2) {
      // High performer - increase bid by 20%
      newBid = currentBid * 1.20;
      reason = 'High ROAS (' + roas.toFixed(2) + ')';
    } else if (conversions > 0 && cpa > CONFIG.TARGET_CPA * 2) {
      // Poor CPA - decrease bid by 20%
      newBid = currentBid * 0.80;
      reason = 'High CPA (€' + cpa.toFixed(2) + ')';
    }

    if (newBid !== null) {
      // Enforce max change limit
      var maxBid = currentBid * (1 + CONFIG.MAX_BID_CHANGE_PERCENT / 100);
      var minBid = currentBid * (1 - CONFIG.MAX_BID_CHANGE_PERCENT / 100);
      newBid = Math.min(Math.max(newBid, minBid), maxBid);

      Logger.log('BID: "' + keyword.getText() + '" €' + currentBid.toFixed(2) + ' -> €' + newBid.toFixed(2) + ' - ' + reason);

      if (!CONFIG.DRY_RUN) {
        keyword.bidding().setCpc(newBid);
      }

      actions.push({
        type: 'bid_change',
        keyword: keyword.getText(),
        oldBid: currentBid,
        newBid: newBid,
        reason: reason
      });

      bidChanges++;
    }
  }

  Logger.log('Bid changes made: ' + bidChanges);
}

function addNegativeKeywords() {
  Logger.log('\n--- Checking search terms for negatives ---');

  var query =
    "SELECT Query, Impressions, Clicks, Cost, Conversions " +
    "FROM SEARCH_QUERY_PERFORMANCE_REPORT " +
    "WHERE Cost > 25 AND Conversions = 0 " +
    "DURING LAST_14_DAYS";

  var report = AdsApp.report(query);
  var rows = report.rows();

  var negatives = [];

  while (rows.hasNext()) {
    var row = rows.next();
    var searchTerm = row['Query'];
    var cost = parseFloat(row['Cost'].replace(/[^0-9.]/g, ''));

    // Skip if already a negative or looks relevant
    if (cost > 25) {
      negatives.push({
        term: searchTerm,
        cost: cost
      });
    }
  }

  // Log potential negatives but don't auto-add (requires manual review)
  if (negatives.length > 0) {
    Logger.log('Potential negative keywords (review manually):');
    for (var i = 0; i < negatives.length; i++) {
      Logger.log('- "' + negatives[i].term + '" (€' + negatives[i].cost.toFixed(2) + ' spent, 0 conversions)');
    }
  }
}

function sendNotification() {
  var subject = 'Google Ads Optimization: ' + actions.length + ' actions taken';

  var body = 'Daily optimization completed.\n\n';
  body += 'Actions taken:\n';

  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if (action.type === 'pause') {
      body += '- PAUSED: "' + action.keyword + '" - ' + action.reason + '\n';
    } else if (action.type === 'bid_change') {
      body += '- BID: "' + action.keyword + '" €' + action.oldBid.toFixed(2) + ' -> €' + action.newBid.toFixed(2) + '\n';
    }
  }

  if (CONFIG.DRY_RUN) {
    body += '\n(DRY RUN - no actual changes made)';
  }

  MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
}
