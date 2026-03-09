/**
 * Google Ads Data Export Script
 *
 * Exports daily Google Ads performance data including campaigns,
 * ad groups, keywords, and search terms.
 *
 * Usage:
 *   npx ts-node scripts/export-ads.ts
 *   npx ts-node scripts/export-ads.ts --test
 *   npx ts-node scripts/export-ads.ts --date 2026-02-17
 */

import { GoogleAdsApi, enums } from "google-ads-api";
import * as fs from "fs";
import * as path from "path";

// Configuration
const REPORTS_DIR = path.join(__dirname, "../analytics/reports");

interface AdsCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  customer_id: string;
  login_customer_id?: string;
}

interface CampaignData {
  campaign_id: string;
  campaign_name: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  average_cpc: number;
  cost_per_conversion: number;
  roas: number;
}

interface AdGroupData {
  ad_group_id: string;
  ad_group_name: string;
  campaign_id: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  average_cpc: number;
}

interface KeywordData {
  keyword_id: string;
  keyword_text: string;
  match_type: string;
  ad_group_id: string;
  campaign_id: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  average_cpc: number;
  quality_score: number | null;
}

interface SearchTermData {
  search_term: string;
  keyword_text: string;
  ad_group_id: string;
  campaign_id: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
}

interface AdsReport {
  date: string;
  account: {
    customer_id: string;
    currency: string;
  };
  summary: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    overall_ctr: number;
    average_cpc: number;
    total_conversions: number;
    cost_per_conversion: number;
    conversion_value: number;
    roas: number;
  };
  campaigns: CampaignData[];
  ad_groups: AdGroupData[];
  keywords: KeywordData[];
  search_terms: SearchTermData[];
}

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

function initializeClient(credentials: AdsCredentials): GoogleAdsApi {
  return new GoogleAdsApi({
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    developer_token: credentials.developer_token,
  });
}

function formatCustomerId(customerId: string): string {
  // Remove dashes and ensure it's just numbers
  return customerId.replace(/-/g, "");
}

function microsToCurrency(micros: number): number {
  return Number((micros / 1_000_000).toFixed(2));
}

async function fetchCampaigns(
  customer: any,
  date: string
): Promise<CampaignData[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date = '${date}'
    AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;

  const campaigns: CampaignData[] = [];

  try {
    const response = await customer.query(query);

    for (const row of response) {
      const cost = microsToCurrency(row.metrics?.cost_micros || 0);
      const conversions = row.metrics?.conversions || 0;
      const conversionsValue = row.metrics?.conversions_value || 0;

      campaigns.push({
        campaign_id: String(row.campaign?.id || ""),
        campaign_name: row.campaign?.name || "",
        status: row.campaign?.status || "",
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: Number(((row.metrics?.ctr || 0) * 100).toFixed(2)),
        cost,
        conversions,
        conversions_value: conversionsValue,
        average_cpc: microsToCurrency(row.metrics?.average_cpc || 0),
        cost_per_conversion: conversions > 0 ? Number((cost / conversions).toFixed(2)) : 0,
        roas: cost > 0 ? Number((conversionsValue / cost).toFixed(2)) : 0,
      });
    }
  } catch (error) {
    console.error("Error fetching campaigns:", error);
  }

  return campaigns;
}

async function fetchAdGroups(
  customer: any,
  date: string
): Promise<AdGroupData[]> {
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.campaign,
      ad_group.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc
    FROM ad_group
    WHERE segments.date = '${date}'
    AND ad_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;

  const adGroups: AdGroupData[] = [];

  try {
    const response = await customer.query(query);

    for (const row of response) {
      adGroups.push({
        ad_group_id: String(row.ad_group?.id || ""),
        ad_group_name: row.ad_group?.name || "",
        campaign_id: row.ad_group?.campaign?.split("/").pop() || "",
        status: row.ad_group?.status || "",
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: Number(((row.metrics?.ctr || 0) * 100).toFixed(2)),
        cost: microsToCurrency(row.metrics?.cost_micros || 0),
        conversions: row.metrics?.conversions || 0,
        average_cpc: microsToCurrency(row.metrics?.average_cpc || 0),
      });
    }
  } catch (error) {
    console.error("Error fetching ad groups:", error);
  }

  return adGroups;
}

async function fetchKeywords(
  customer: any,
  date: string
): Promise<KeywordData[]> {
  const query = `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.ad_group,
      ad_group.campaign,
      ad_group_criterion.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      ad_group_criterion.quality_info.quality_score
    FROM keyword_view
    WHERE segments.date = '${date}'
    AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 100
  `;

  const keywords: KeywordData[] = [];

  try {
    const response = await customer.query(query);

    for (const row of response) {
      keywords.push({
        keyword_id: String(row.ad_group_criterion?.criterion_id || ""),
        keyword_text: row.ad_group_criterion?.keyword?.text || "",
        match_type: row.ad_group_criterion?.keyword?.match_type || "",
        ad_group_id: row.ad_group_criterion?.ad_group?.split("/").pop() || "",
        campaign_id: row.ad_group?.campaign?.split("/").pop() || "",
        status: row.ad_group_criterion?.status || "",
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: Number(((row.metrics?.ctr || 0) * 100).toFixed(2)),
        cost: microsToCurrency(row.metrics?.cost_micros || 0),
        conversions: row.metrics?.conversions || 0,
        average_cpc: microsToCurrency(row.metrics?.average_cpc || 0),
        quality_score: row.ad_group_criterion?.quality_info?.quality_score || null,
      });
    }
  } catch (error) {
    console.error("Error fetching keywords:", error);
  }

  return keywords;
}

async function fetchSearchTerms(
  customer: any,
  startDate: string,
  endDate: string
): Promise<SearchTermData[]> {
  const query = `
    SELECT
      search_term_view.search_term,
      segments.keyword.info.text,
      search_term_view.ad_group,
      ad_group.campaign,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.cost_micros DESC
    LIMIT 200
  `;

  const searchTerms: SearchTermData[] = [];

  try {
    const response = await customer.query(query);

    for (const row of response) {
      searchTerms.push({
        search_term: row.search_term_view?.search_term || "",
        keyword_text: row.segments?.keyword?.info?.text || "",
        ad_group_id: row.search_term_view?.ad_group?.split("/").pop() || "",
        campaign_id: row.ad_group?.campaign?.split("/").pop() || "",
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: Number(((row.metrics?.ctr || 0) * 100).toFixed(2)),
        cost: microsToCurrency(row.metrics?.cost_micros || 0),
        conversions: row.metrics?.conversions || 0,
      });
    }
  } catch (error) {
    console.error("Error fetching search terms:", error);
  }

  return searchTerms;
}

function calculateSummary(
  campaigns: CampaignData[]
): AdsReport["summary"] {
  const totals = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.cost,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
      conversions_value: acc.conversions_value + c.conversions_value,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversions_value: 0 }
  );

  return {
    total_spend: Number(totals.spend.toFixed(2)),
    total_impressions: totals.impressions,
    total_clicks: totals.clicks,
    overall_ctr: totals.impressions > 0
      ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2))
      : 0,
    average_cpc: totals.clicks > 0
      ? Number((totals.spend / totals.clicks).toFixed(2))
      : 0,
    total_conversions: totals.conversions,
    cost_per_conversion: totals.conversions > 0
      ? Number((totals.spend / totals.conversions).toFixed(2))
      : 0,
    conversion_value: Number(totals.conversions_value.toFixed(2)),
    roas: totals.spend > 0
      ? Number((totals.conversions_value / totals.spend).toFixed(2))
      : 0,
  };
}

async function exportAds(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  console.log(`Exporting Google Ads data for ${targetDate}...`);

  const credentials = loadCredentials();
  const client = initializeClient(credentials);
  const customerId = formatCustomerId(credentials.customer_id);

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: credentials.refresh_token,
    login_customer_id: credentials.login_customer_id
      ? formatCustomerId(credentials.login_customer_id)
      : undefined,
  });

  // Calculate date range for search terms (last 7 days)
  const searchTermEndDate = targetDate;
  const searchTermStartDate = new Date(
    new Date(targetDate).getTime() - 6 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  // Fetch all data
  console.log("Fetching campaigns...");
  const campaigns = await fetchCampaigns(customer, targetDate);

  console.log("Fetching ad groups...");
  const adGroups = await fetchAdGroups(customer, targetDate);

  console.log("Fetching keywords...");
  const keywords = await fetchKeywords(customer, targetDate);

  console.log("Fetching search terms (last 7 days)...");
  const searchTerms = await fetchSearchTerms(
    customer,
    searchTermStartDate,
    searchTermEndDate
  );

  // Calculate summary
  const summary = calculateSummary(campaigns);

  const report: AdsReport = {
    date: targetDate,
    account: {
      customer_id: credentials.customer_id,
      currency: "EUR",
    },
    summary,
    campaigns,
    ad_groups: adGroups,
    keywords,
    search_terms: searchTerms,
  };

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Write report
  const reportPath = path.join(REPORTS_DIR, `${targetDate}-ads.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);

  // Print summary
  console.log("\n--- Summary ---");
  console.log(`Total Spend: €${summary.total_spend}`);
  console.log(`Impressions: ${summary.total_impressions}`);
  console.log(`Clicks: ${summary.total_clicks}`);
  console.log(`CTR: ${summary.overall_ctr}%`);
  console.log(`Conversions: ${summary.total_conversions}`);
  console.log(`CPA: €${summary.cost_per_conversion}`);
  console.log(`ROAS: ${summary.roas}:1`);
  console.log(`\nCampaigns: ${campaigns.length}`);
  console.log(`Keywords: ${keywords.length}`);
  console.log(`Search Terms: ${searchTerms.length}`);
}

async function testConnection(): Promise<void> {
  console.log("Testing Google Ads API connection...");
  try {
    const credentials = loadCredentials();
    const client = initializeClient(credentials);
    const customerId = formatCustomerId(credentials.customer_id);

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: credentials.refresh_token,
      login_customer_id: credentials.login_customer_id
        ? formatCustomerId(credentials.login_customer_id)
        : undefined,
    });

    // Simple test query
    const query = `
      SELECT customer.id, customer.descriptive_name
      FROM customer
      LIMIT 1
    `;

    const response = await customer.query(query);
    const account = response[0];

    console.log(`Connection successful!`);
    console.log(`Account ID: ${account.customer?.id}`);
    console.log(`Account Name: ${account.customer?.descriptive_name}`);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes("--test")) {
  testConnection();
} else {
  const dateIndex = args.indexOf("--date");
  const date = dateIndex !== -1 ? args[dateIndex + 1] : undefined;
  exportAds(date).catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  });
}
