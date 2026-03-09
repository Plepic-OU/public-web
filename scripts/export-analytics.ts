/**
 * Google Analytics 4 Data Export Script
 *
 * Exports daily analytics data from GA4 using the Data API.
 * Run daily via GitHub Actions or locally.
 *
 * Usage:
 *   npx ts-node scripts/export-analytics.ts
 *   npx ts-node scripts/export-analytics.ts --test
 *   npx ts-node scripts/export-analytics.ts --date 2026-02-17
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import * as fs from "fs";
import * as path from "path";

// Configuration
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "465026539"; // Numeric property ID
const CREDENTIALS_PATH = path.join(
  __dirname,
  "../analytics/credentials/ga-service-account.json"
);
const REPORTS_DIR = path.join(__dirname, "../analytics/reports");

// Conversion event values (EUR)
const CONVERSION_VALUES: Record<string, number> = {
  form_submit: 504,
  google_form_signup: 504,
  calendar_click: 50,
  calendar_booking: 50,
  contact_click: 5,
  email_click: 5,
  phone_click: 5,
  linkedin_click: 1,
};

interface GA4Report {
  date: string;
  property_id: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    sessions: number;
    users: number;
    new_users: number;
    page_views: number;
    avg_session_duration: number;
    bounce_rate: number;
    pages_per_session: number;
  };
  pages: Array<{
    path: string;
    page_views: number;
    sessions: number;
    bounce_rate: number;
    avg_time_on_page: number;
  }>;
  traffic_sources: Array<{
    source: string;
    medium: string;
    sessions: number;
    users: number;
    conversions: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  countries: Array<{
    country: string;
    sessions: number;
    users: number;
  }>;
  conversions: Array<{
    event_name: string;
    count: number;
    value: number;
  }>;
  total_conversion_value: number;
}

async function initializeClient(): Promise<BetaAnalyticsDataClient> {
  // Check for credentials file or environment variable
  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    // Use credentials from environment variable (GitHub Actions)
    const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON);
    return new BetaAnalyticsDataClient({ credentials });
  }

  if (fs.existsSync(CREDENTIALS_PATH)) {
    // Use credentials file (local development)
    return new BetaAnalyticsDataClient({
      keyFilename: CREDENTIALS_PATH,
    });
  }

  throw new Error(
    "No credentials found. Set GA_SERVICE_ACCOUNT_JSON env var or create " +
      CREDENTIALS_PATH
  );
}

async function fetchSummaryMetrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Report["summary"]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
      { name: "screenPageViewsPerSession" },
    ],
  });

  const row = response.rows?.[0];
  if (!row?.metricValues) {
    return {
      sessions: 0,
      users: 0,
      new_users: 0,
      page_views: 0,
      avg_session_duration: 0,
      bounce_rate: 0,
      pages_per_session: 0,
    };
  }

  return {
    sessions: parseInt(row.metricValues[0]?.value || "0"),
    users: parseInt(row.metricValues[1]?.value || "0"),
    new_users: parseInt(row.metricValues[2]?.value || "0"),
    page_views: parseInt(row.metricValues[3]?.value || "0"),
    avg_session_duration: parseFloat(row.metricValues[4]?.value || "0"),
    bounce_rate: parseFloat(row.metricValues[5]?.value || "0"),
    pages_per_session: parseFloat(row.metricValues[6]?.value || "0"),
  };
}

async function fetchPageMetrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Report["pages"]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 20,
  });

  return (
    response.rows?.map((row) => ({
      path: row.dimensionValues?.[0]?.value || "",
      page_views: parseInt(row.metricValues?.[0]?.value || "0"),
      sessions: parseInt(row.metricValues?.[1]?.value || "0"),
      bounce_rate: parseFloat(row.metricValues?.[2]?.value || "0"),
      avg_time_on_page: parseFloat(row.metricValues?.[3]?.value || "0"),
    })) || []
  );
}

async function fetchTrafficSources(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Report["traffic_sources"]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "conversions" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 15,
  });

  return (
    response.rows?.map((row) => ({
      source: row.dimensionValues?.[0]?.value || "(direct)",
      medium: row.dimensionValues?.[1]?.value || "(none)",
      sessions: parseInt(row.metricValues?.[0]?.value || "0"),
      users: parseInt(row.metricValues?.[1]?.value || "0"),
      conversions: parseInt(row.metricValues?.[2]?.value || "0"),
    })) || []
  );
}

async function fetchDeviceCategories(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Report["devices"]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
  });

  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  let total = 0;

  response.rows?.forEach((row) => {
    const category = row.dimensionValues?.[0]?.value?.toLowerCase() || "";
    const sessions = parseInt(row.metricValues?.[0]?.value || "0");
    total += sessions;
    if (category in devices) {
      devices[category as keyof typeof devices] = sessions;
    }
  });

  // Convert to percentages
  if (total > 0) {
    devices.desktop = Math.round((devices.desktop / total) * 100);
    devices.mobile = Math.round((devices.mobile / total) * 100);
    devices.tablet = Math.round((devices.tablet / total) * 100);
  }

  return devices;
}

async function fetchCountries(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Report["countries"]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });

  return (
    response.rows?.map((row) => ({
      country: row.dimensionValues?.[0]?.value || "",
      sessions: parseInt(row.metricValues?.[0]?.value || "0"),
      users: parseInt(row.metricValues?.[1]?.value || "0"),
    })) || []
  );
}

async function fetchConversions(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<{ conversions: GA4Report["conversions"]; total_value: number }> {
  // Fetch key events (conversion events)
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: Object.keys(CONVERSION_VALUES),
        },
      },
    },
  });

  const conversions: GA4Report["conversions"] = [];
  let total_value = 0;

  response.rows?.forEach((row) => {
    const eventName = row.dimensionValues?.[0]?.value || "";
    const count = parseInt(row.metricValues?.[0]?.value || "0");
    const value = (CONVERSION_VALUES[eventName] || 0) * count;

    conversions.push({
      event_name: eventName,
      count,
      value,
    });

    total_value += value;
  });

  return { conversions, total_value };
}

async function exportAnalytics(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  console.log(`Exporting GA4 data for ${targetDate}...`);

  const client = await initializeClient();

  // Fetch all data in parallel
  const [summary, pages, trafficSources, devices, countries, conversionData] =
    await Promise.all([
      fetchSummaryMetrics(client, GA4_PROPERTY_ID, targetDate, targetDate),
      fetchPageMetrics(client, GA4_PROPERTY_ID, targetDate, targetDate),
      fetchTrafficSources(client, GA4_PROPERTY_ID, targetDate, targetDate),
      fetchDeviceCategories(client, GA4_PROPERTY_ID, targetDate, targetDate),
      fetchCountries(client, GA4_PROPERTY_ID, targetDate, targetDate),
      fetchConversions(client, GA4_PROPERTY_ID, targetDate, targetDate),
    ]);

  const report: GA4Report = {
    date: targetDate,
    property_id: GA4_PROPERTY_ID,
    date_range: {
      start: targetDate,
      end: targetDate,
    },
    summary,
    pages,
    traffic_sources: trafficSources,
    devices,
    countries,
    conversions: conversionData.conversions,
    total_conversion_value: conversionData.total_value,
  };

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Write report
  const reportPath = path.join(REPORTS_DIR, `${targetDate}-ga4.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);

  // Print summary
  console.log("\n--- Summary ---");
  console.log(`Sessions: ${summary.sessions}`);
  console.log(`Users: ${summary.users}`);
  console.log(`Bounce Rate: ${(summary.bounce_rate * 100).toFixed(1)}%`);
  console.log(`Conversions: ${conversionData.conversions.length} events`);
  console.log(`Total Value: €${conversionData.total_value}`);
}

async function testConnection(): Promise<void> {
  console.log("Testing GA4 API connection...");
  try {
    const client = await initializeClient();

    // Simple test query
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "sessions" }],
    });

    const sessions = response.rows?.[0]?.metricValues?.[0]?.value || "0";
    console.log(`Connection successful! Sessions (last 7 days): ${sessions}`);
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
  exportAnalytics(date).catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  });
}
