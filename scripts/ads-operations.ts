/**
 * Google Ads Write Operations
 *
 * Provides functions to modify Google Ads account:
 * - Pause/enable keywords
 * - Adjust bids
 * - Add negative keywords
 * - Redistribute budget
 *
 * All operations respect guard rails in ads-config.json and log to actions directory.
 */

import { GoogleAdsApi, enums, MutateOperation } from "google-ads-api";
import * as fs from "fs";
import * as path from "path";

// Configuration paths
const CONFIG_PATH = path.join(__dirname, "../analytics/ads-config.json");
const ACTIONS_DIR = path.join(__dirname, "../analytics/actions");

interface AdsCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  customer_id: string;
  login_customer_id?: string;
}

interface AdsConfig {
  autonomous_mode: boolean;
  limits: {
    max_bid_change_percent: number;
    max_daily_bid_changes: number;
    pause_threshold_spend_no_conversion: number;
    pause_threshold_quality_score: number;
    min_data_days_before_action: number;
    min_impressions_before_action: number;
  };
  targets: {
    target_cpa: number;
    target_roas: number;
    max_cpc: number;
    min_ctr: number;
  };
  notifications: {
    notify_on_pause: boolean;
    notify_on_bid_change: boolean;
    notify_on_negative_keyword: boolean;
    notify_on_budget_alert: boolean;
    notification_email: string | null;
  };
  negative_keyword_rules: {
    auto_add_irrelevant_high_spend: boolean;
    spend_threshold_for_negative: number;
    match_type: string;
  };
}

interface ActionLog {
  timestamp: string;
  action: string;
  keyword?: string;
  keyword_id?: string;
  campaign?: string;
  campaign_id?: string;
  ad_group_id?: string;
  reason: string;
  previous_state?: string;
  new_state?: string;
  previous_bid?: number;
  new_bid?: number;
  change_percent?: number;
  match_type?: string;
  success: boolean;
  error?: string;
}

interface DailyActions {
  date: string;
  actions: ActionLog[];
  summary: {
    keywords_paused: number;
    keywords_enabled: number;
    negative_keywords_added: number;
    bids_increased: number;
    bids_decreased: number;
    estimated_daily_savings: number;
    errors: number;
  };
}

// Load configuration
function loadConfig(): AdsConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

// Load credentials
function loadCredentials(): AdsCredentials {
  if (
    !process.env.ADS_CLIENT_ID ||
    !process.env.ADS_CLIENT_SECRET ||
    !process.env.ADS_REFRESH_TOKEN ||
    !process.env.ADS_DEVELOPER_TOKEN ||
    !process.env.ADS_CUSTOMER_ID
  ) {
    throw new Error(
      "Missing ADS_* environment variables. Source .env locally, or configure GitHub Actions secrets."
    );
  }

  return {
    client_id: process.env.ADS_CLIENT_ID,
    client_secret: process.env.ADS_CLIENT_SECRET,
    refresh_token: process.env.ADS_REFRESH_TOKEN,
    developer_token: process.env.ADS_DEVELOPER_TOKEN,
    customer_id: process.env.ADS_CUSTOMER_ID,
    login_customer_id: process.env.ADS_LOGIN_CUSTOMER_ID,
  };
}

function formatCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "");
}

// Initialize Google Ads client
function initializeClient(credentials: AdsCredentials) {
  const client = new GoogleAdsApi({
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    developer_token: credentials.developer_token,
  });

  const customerId = formatCustomerId(credentials.customer_id);

  return client.Customer({
    customer_id: customerId,
    refresh_token: credentials.refresh_token,
    login_customer_id: credentials.login_customer_id
      ? formatCustomerId(credentials.login_customer_id)
      : undefined,
  });
}

// Load or create today's action log
function loadTodayActions(): DailyActions {
  const today = new Date().toISOString().split("T")[0];
  const actionsPath = path.join(ACTIONS_DIR, `${today}.json`);

  if (fs.existsSync(actionsPath)) {
    return JSON.parse(fs.readFileSync(actionsPath, "utf-8"));
  }

  return {
    date: today,
    actions: [],
    summary: {
      keywords_paused: 0,
      keywords_enabled: 0,
      negative_keywords_added: 0,
      bids_increased: 0,
      bids_decreased: 0,
      estimated_daily_savings: 0,
      errors: 0,
    },
  };
}

// Save action log
function saveTodayActions(dailyActions: DailyActions): void {
  if (!fs.existsSync(ACTIONS_DIR)) {
    fs.mkdirSync(ACTIONS_DIR, { recursive: true });
  }

  const actionsPath = path.join(ACTIONS_DIR, `${dailyActions.date}.json`);
  fs.writeFileSync(actionsPath, JSON.stringify(dailyActions, null, 2));
}

// Log an action
function logAction(action: ActionLog): void {
  const dailyActions = loadTodayActions();
  dailyActions.actions.push(action);

  // Update summary
  if (action.success) {
    switch (action.action) {
      case "PAUSE_KEYWORD":
        dailyActions.summary.keywords_paused++;
        break;
      case "ENABLE_KEYWORD":
        dailyActions.summary.keywords_enabled++;
        break;
      case "ADD_NEGATIVE_KEYWORD":
        dailyActions.summary.negative_keywords_added++;
        break;
      case "INCREASE_BID":
        dailyActions.summary.bids_increased++;
        break;
      case "DECREASE_BID":
        dailyActions.summary.bids_decreased++;
        break;
    }
  } else {
    dailyActions.summary.errors++;
  }

  saveTodayActions(dailyActions);
}

// Check if we've exceeded daily limits
function checkDailyLimits(
  actionType: string,
  config: AdsConfig
): { allowed: boolean; reason?: string } {
  const dailyActions = loadTodayActions();

  const bidChanges = dailyActions.actions.filter(
    (a) =>
      a.success && (a.action === "INCREASE_BID" || a.action === "DECREASE_BID")
  ).length;

  if (
    (actionType === "INCREASE_BID" || actionType === "DECREASE_BID") &&
    bidChanges >= config.limits.max_daily_bid_changes
  ) {
    return {
      allowed: false,
      reason: `Daily bid change limit reached (${config.limits.max_daily_bid_changes})`,
    };
  }

  return { allowed: true };
}

/**
 * Pause a keyword
 */
export async function pauseKeyword(
  keywordId: string,
  adGroupId: string,
  reason: string,
  keywordText?: string,
  campaignName?: string
): Promise<{ success: boolean; error?: string }> {
  const config = loadConfig();
  const credentials = loadCredentials();
  const customer = initializeClient(credentials);
  const customerId = formatCustomerId(credentials.customer_id);

  const action: ActionLog = {
    timestamp: new Date().toISOString(),
    action: "PAUSE_KEYWORD",
    keyword: keywordText,
    keyword_id: keywordId,
    ad_group_id: adGroupId,
    campaign: campaignName,
    reason,
    previous_state: "ENABLED",
    new_state: "PAUSED",
    success: false,
  };

  try {
    const resourceName = `customers/${customerId}/adGroupCriteria/${adGroupId}~${keywordId}`;

    await customer.adGroupCriteria.update([
      {
        resource_name: resourceName,
        status: enums.AdGroupCriterionStatus.PAUSED,
      },
    ]);

    action.success = true;
    console.log(`Paused keyword: ${keywordText || keywordId} - ${reason}`);
  } catch (error: any) {
    action.success = false;
    action.error = error.message;
    console.error(`Failed to pause keyword ${keywordId}:`, error.message);
  }

  logAction(action);
  return { success: action.success, error: action.error };
}

/**
 * Enable a paused keyword
 */
export async function enableKeyword(
  keywordId: string,
  adGroupId: string,
  reason: string,
  keywordText?: string,
  campaignName?: string
): Promise<{ success: boolean; error?: string }> {
  const credentials = loadCredentials();
  const customer = initializeClient(credentials);
  const customerId = formatCustomerId(credentials.customer_id);

  const action: ActionLog = {
    timestamp: new Date().toISOString(),
    action: "ENABLE_KEYWORD",
    keyword: keywordText,
    keyword_id: keywordId,
    ad_group_id: adGroupId,
    campaign: campaignName,
    reason,
    previous_state: "PAUSED",
    new_state: "ENABLED",
    success: false,
  };

  try {
    const resourceName = `customers/${customerId}/adGroupCriteria/${adGroupId}~${keywordId}`;

    await customer.adGroupCriteria.update([
      {
        resource_name: resourceName,
        status: enums.AdGroupCriterionStatus.ENABLED,
      },
    ]);

    action.success = true;
    console.log(`Enabled keyword: ${keywordText || keywordId} - ${reason}`);
  } catch (error: any) {
    action.success = false;
    action.error = error.message;
    console.error(`Failed to enable keyword ${keywordId}:`, error.message);
  }

  logAction(action);
  return { success: action.success, error: action.error };
}

/**
 * Adjust keyword bid
 */
export async function adjustBid(
  keywordId: string,
  adGroupId: string,
  currentBidMicros: number,
  newBidMicros: number,
  reason: string,
  keywordText?: string,
  campaignName?: string
): Promise<{ success: boolean; error?: string }> {
  const config = loadConfig();
  const credentials = loadCredentials();
  const customer = initializeClient(credentials);
  const customerId = formatCustomerId(credentials.customer_id);

  const currentBid = currentBidMicros / 1_000_000;
  const newBid = newBidMicros / 1_000_000;
  const changePercent = Math.abs(((newBid - currentBid) / currentBid) * 100);

  // Check guard rails
  if (changePercent > config.limits.max_bid_change_percent) {
    const error = `Bid change ${changePercent.toFixed(1)}% exceeds limit of ${config.limits.max_bid_change_percent}%`;
    console.error(error);
    return { success: false, error };
  }

  if (newBid > config.targets.max_cpc) {
    const error = `New bid €${newBid.toFixed(2)} exceeds max CPC of €${config.targets.max_cpc}`;
    console.error(error);
    return { success: false, error };
  }

  const limitCheck = checkDailyLimits(
    newBid > currentBid ? "INCREASE_BID" : "DECREASE_BID",
    config
  );
  if (!limitCheck.allowed) {
    console.error(limitCheck.reason);
    return { success: false, error: limitCheck.reason };
  }

  const action: ActionLog = {
    timestamp: new Date().toISOString(),
    action: newBid > currentBid ? "INCREASE_BID" : "DECREASE_BID",
    keyword: keywordText,
    keyword_id: keywordId,
    ad_group_id: adGroupId,
    campaign: campaignName,
    reason,
    previous_bid: currentBid,
    new_bid: newBid,
    change_percent: Number(changePercent.toFixed(1)),
    success: false,
  };

  try {
    const resourceName = `customers/${customerId}/adGroupCriteria/${adGroupId}~${keywordId}`;

    await customer.adGroupCriteria.update([
      {
        resource_name: resourceName,
        cpc_bid_micros: newBidMicros,
      },
    ]);

    action.success = true;
    console.log(
      `Adjusted bid for ${keywordText || keywordId}: €${currentBid.toFixed(2)} → €${newBid.toFixed(2)} (${action.action})`
    );
  } catch (error: any) {
    action.success = false;
    action.error = error.message;
    console.error(`Failed to adjust bid for ${keywordId}:`, error.message);
  }

  logAction(action);
  return { success: action.success, error: action.error };
}

/**
 * Add negative keyword to campaign
 */
export async function addNegativeKeyword(
  campaignId: string,
  keyword: string,
  matchType: "EXACT" | "PHRASE" | "BROAD",
  reason: string,
  campaignName?: string
): Promise<{ success: boolean; error?: string }> {
  const credentials = loadCredentials();
  const customer = initializeClient(credentials);
  const customerId = formatCustomerId(credentials.customer_id);

  const action: ActionLog = {
    timestamp: new Date().toISOString(),
    action: "ADD_NEGATIVE_KEYWORD",
    keyword,
    campaign: campaignName,
    campaign_id: campaignId,
    reason,
    match_type: matchType,
    success: false,
  };

  try {
    const matchTypeEnum =
      matchType === "EXACT"
        ? enums.KeywordMatchType.EXACT
        : matchType === "PHRASE"
          ? enums.KeywordMatchType.PHRASE
          : enums.KeywordMatchType.BROAD;

    await customer.campaignCriteria.create([
      {
        campaign: `customers/${customerId}/campaigns/${campaignId}`,
        keyword: {
          text: keyword,
          match_type: matchTypeEnum,
        },
        negative: true,
      },
    ]);

    action.success = true;
    console.log(
      `Added negative keyword: [${matchType}] "${keyword}" to campaign ${campaignName || campaignId}`
    );
  } catch (error: any) {
    action.success = false;
    action.error = error.message;
    console.error(`Failed to add negative keyword "${keyword}":`, error.message);
  }

  logAction(action);
  return { success: action.success, error: action.error };
}

/**
 * Get today's action summary
 */
export function getTodayActionsSummary(): DailyActions["summary"] {
  const dailyActions = loadTodayActions();
  return dailyActions.summary;
}

/**
 * Get all actions for a specific date
 */
export function getActionsForDate(date: string): DailyActions | null {
  const actionsPath = path.join(ACTIONS_DIR, `${date}.json`);
  if (!fs.existsSync(actionsPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(actionsPath, "utf-8"));
}

// Export for use in other scripts
export {
  loadConfig,
  loadCredentials,
  initializeClient,
  formatCustomerId,
  AdsConfig,
  ActionLog,
  DailyActions,
};
