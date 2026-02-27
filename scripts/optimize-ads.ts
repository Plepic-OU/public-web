/**
 * Google Ads Daily Optimization Script
 *
 * Runs after data export to automatically optimize ads:
 * - Pause underperforming keywords
 * - Adjust bids based on ROAS/CPA
 * - Add negative keywords from search terms
 *
 * Usage:
 *   npx ts-node scripts/optimize-ads.ts
 *   npx ts-node scripts/optimize-ads.ts --dry-run
 *   npx ts-node scripts/optimize-ads.ts --date 2026-02-17
 */

import * as fs from "fs";
import * as path from "path";
import {
  pauseKeyword,
  enableKeyword,
  adjustBid,
  addNegativeKeyword,
  loadConfig,
  getTodayActionsSummary,
  AdsConfig,
} from "./ads-operations";

const REPORTS_DIR = path.join(__dirname, "../analytics/reports");

interface AdsReport {
  date: string;
  summary: {
    total_spend: number;
    total_conversions: number;
    cost_per_conversion: number;
  };
  keywords: Array<{
    keyword_id: string;
    keyword_text: string;
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
  }>;
  search_terms: Array<{
    search_term: string;
    keyword_text: string;
    ad_group_id: string;
    campaign_id: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  }>;
}

interface OptimizationResult {
  date: string;
  dry_run: boolean;
  keywords_evaluated: number;
  search_terms_evaluated: number;
  actions: {
    keywords_paused: number;
    bids_adjusted: number;
    negative_keywords_added: number;
  };
  recommendations: string[];
}

function loadAdsReport(date: string): AdsReport | null {
  const reportPath = path.join(REPORTS_DIR, `${date}-ads.json`);
  if (!fs.existsSync(reportPath)) {
    console.error(`Ads report not found: ${reportPath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf-8"));
}

function loadHistoricalData(
  endDate: string,
  days: number
): Map<string, { totalSpend: number; totalConversions: number }> {
  const keywordStats = new Map<
    string,
    { totalSpend: number; totalConversions: number }
  >();

  for (let i = 0; i < days; i++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const report = loadAdsReport(dateStr);

    if (report) {
      for (const keyword of report.keywords) {
        const key = keyword.keyword_id;
        const existing = keywordStats.get(key) || {
          totalSpend: 0,
          totalConversions: 0,
        };
        existing.totalSpend += keyword.cost;
        existing.totalConversions += keyword.conversions;
        keywordStats.set(key, existing);
      }
    }
  }

  return keywordStats;
}

async function evaluateKeywordsForPause(
  report: AdsReport,
  config: AdsConfig,
  dryRun: boolean
): Promise<number> {
  let pausedCount = 0;
  const historicalData = loadHistoricalData(
    report.date,
    config.limits.min_data_days_before_action
  );

  for (const keyword of report.keywords) {
    if (keyword.status !== "ENABLED") continue;

    const historical = historicalData.get(keyword.keyword_id);
    if (!historical) continue;

    // Rule 1: High spend, no conversions
    if (
      historical.totalSpend >= config.limits.pause_threshold_spend_no_conversion &&
      historical.totalConversions === 0
    ) {
      console.log(
        `[PAUSE] ${keyword.keyword_text}: €${historical.totalSpend.toFixed(2)} spent, 0 conversions over ${config.limits.min_data_days_before_action} days`
      );

      if (!dryRun) {
        const result = await pauseKeyword(
          keyword.keyword_id,
          keyword.ad_group_id,
          `€${historical.totalSpend.toFixed(2)} spent with 0 conversions over ${config.limits.min_data_days_before_action} days`,
          keyword.keyword_text
        );
        if (result.success) pausedCount++;
      } else {
        pausedCount++;
      }
      continue;
    }

    // Rule 2: Very low quality score with no conversions
    if (
      keyword.quality_score !== null &&
      keyword.quality_score <= config.limits.pause_threshold_quality_score &&
      historical.totalConversions === 0 &&
      historical.totalSpend > 20
    ) {
      console.log(
        `[PAUSE] ${keyword.keyword_text}: QS=${keyword.quality_score}, €${historical.totalSpend.toFixed(2)} spent, 0 conversions`
      );

      if (!dryRun) {
        const result = await pauseKeyword(
          keyword.keyword_id,
          keyword.ad_group_id,
          `Quality Score ${keyword.quality_score}/10 with €${historical.totalSpend.toFixed(2)} spent and 0 conversions`,
          keyword.keyword_text
        );
        if (result.success) pausedCount++;
      } else {
        pausedCount++;
      }
    }
  }

  return pausedCount;
}

async function evaluateBidAdjustments(
  report: AdsReport,
  config: AdsConfig,
  dryRun: boolean
): Promise<number> {
  let adjustedCount = 0;

  for (const keyword of report.keywords) {
    if (keyword.status !== "ENABLED") continue;
    if (keyword.impressions < config.limits.min_impressions_before_action) continue;
    if (keyword.average_cpc <= 0) continue;

    const currentBidMicros = Math.round(keyword.average_cpc * 1_000_000);

    // Calculate ROAS if we have conversions
    if (keyword.conversions > 0 && keyword.cost > 0) {
      // Assume €504 per conversion (form signup value)
      const conversionValue = keyword.conversions * 504;
      const roas = conversionValue / keyword.cost;

      // High ROAS - increase bid to get more volume
      if (roas >= config.targets.target_roas * 2) {
        const newBidMicros = Math.round(
          currentBidMicros * (1 + config.limits.max_bid_change_percent / 100)
        );

        console.log(
          `[INCREASE BID] ${keyword.keyword_text}: ROAS ${roas.toFixed(1)}:1, €${keyword.average_cpc.toFixed(2)} → €${(newBidMicros / 1_000_000).toFixed(2)}`
        );

        if (!dryRun) {
          const result = await adjustBid(
            keyword.keyword_id,
            keyword.ad_group_id,
            currentBidMicros,
            newBidMicros,
            `High ROAS (${roas.toFixed(1)}:1), increasing bid to capture more volume`,
            keyword.keyword_text
          );
          if (result.success) adjustedCount++;
        } else {
          adjustedCount++;
        }
        continue;
      }
    }

    // High CPA - decrease bid
    if (keyword.conversions > 0 && keyword.cost > 0) {
      const cpa = keyword.cost / keyword.conversions;

      if (cpa > config.targets.target_cpa * 2) {
        const newBidMicros = Math.round(
          currentBidMicros * (1 - config.limits.max_bid_change_percent / 100)
        );

        console.log(
          `[DECREASE BID] ${keyword.keyword_text}: CPA €${cpa.toFixed(2)} (2x target), €${keyword.average_cpc.toFixed(2)} → €${(newBidMicros / 1_000_000).toFixed(2)}`
        );

        if (!dryRun) {
          const result = await adjustBid(
            keyword.keyword_id,
            keyword.ad_group_id,
            currentBidMicros,
            newBidMicros,
            `High CPA (€${cpa.toFixed(2)}), reducing bid`,
            keyword.keyword_text
          );
          if (result.success) adjustedCount++;
        } else {
          adjustedCount++;
        }
      }
    }
  }

  return adjustedCount;
}

async function evaluateSearchTermsForNegatives(
  report: AdsReport,
  config: AdsConfig,
  dryRun: boolean
): Promise<number> {
  let addedCount = 0;

  if (!config.negative_keyword_rules.auto_add_irrelevant_high_spend) {
    return 0;
  }

  // Irrelevant patterns to look for
  const irrelevantPatterns = [
    /\bfree\b/i,
    /\bjobs?\b/i,
    /\bsalary\b/i,
    /\bcareer\b/i,
    /\bhiring\b/i,
    /\brecruit/i,
    /\bresume\b/i,
    /\bcv\b/i,
    /\bdownload\b/i,
    /\bpdf\b/i,
    /\bcertificat/i,
    /\bdegree\b/i,
    /\buniversity\b/i,
    /\bcollege\b/i,
  ];

  for (const term of report.search_terms) {
    // Skip if low spend
    if (term.cost < config.negative_keyword_rules.spend_threshold_for_negative) {
      continue;
    }

    // Skip if has conversions
    if (term.conversions > 0) continue;

    // Check if matches irrelevant patterns
    const isIrrelevant = irrelevantPatterns.some((pattern) =>
      pattern.test(term.search_term)
    );

    if (isIrrelevant) {
      console.log(
        `[NEGATIVE] "${term.search_term}": €${term.cost.toFixed(2)} spent, 0 conversions, irrelevant term`
      );

      if (!dryRun) {
        const result = await addNegativeKeyword(
          term.campaign_id,
          term.search_term,
          config.negative_keyword_rules.match_type as "EXACT" | "PHRASE" | "BROAD",
          `High spend (€${term.cost.toFixed(2)}) with 0 conversions, irrelevant search intent`
        );
        if (result.success) addedCount++;
      } else {
        addedCount++;
      }
    }
  }

  return addedCount;
}

function generateRecommendations(
  report: AdsReport,
  config: AdsConfig
): string[] {
  const recommendations: string[] = [];

  // Check for quality score issues
  const lowQsKeywords = report.keywords.filter(
    (k) =>
      k.quality_score !== null &&
      k.quality_score < 5 &&
      k.status === "ENABLED" &&
      k.impressions > 100
  );

  if (lowQsKeywords.length > 0) {
    recommendations.push(
      `${lowQsKeywords.length} keywords have Quality Score < 5. Review landing page relevance.`
    );
  }

  // Check overall CTR
  const avgCtr =
    report.keywords.reduce((sum, k) => sum + k.ctr, 0) / report.keywords.length;
  if (avgCtr < config.targets.min_ctr * 100) {
    recommendations.push(
      `Average CTR (${avgCtr.toFixed(2)}%) is below target. Consider refreshing ad copy.`
    );
  }

  // Check for high-value search terms not in keywords
  const highValueTerms = report.search_terms.filter(
    (t) => t.conversions > 0 && t.cost / t.conversions < config.targets.target_cpa
  );

  if (highValueTerms.length > 0) {
    recommendations.push(
      `${highValueTerms.length} search terms have good CPA. Consider adding as exact match keywords.`
    );
  }

  // Budget pacing
  // This would require budget.json data, keeping simple for now

  return recommendations;
}

async function runOptimization(
  date?: string,
  dryRun: boolean = false
): Promise<OptimizationResult> {
  const targetDate = date || new Date().toISOString().split("T")[0];

  console.log(`\n=== Google Ads Optimization - ${targetDate} ===`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

  const config = loadConfig();
  const report = loadAdsReport(targetDate);

  if (!report) {
    throw new Error(`No ads report found for ${targetDate}`);
  }

  if (!config.autonomous_mode) {
    console.log("Autonomous mode is disabled. Exiting.");
    return {
      date: targetDate,
      dry_run: dryRun,
      keywords_evaluated: 0,
      search_terms_evaluated: 0,
      actions: { keywords_paused: 0, bids_adjusted: 0, negative_keywords_added: 0 },
      recommendations: ["Autonomous mode disabled in ads-config.json"],
    };
  }

  console.log(`Evaluating ${report.keywords.length} keywords...`);
  const keywordsPaused = await evaluateKeywordsForPause(report, config, dryRun);

  console.log(`\nEvaluating bid adjustments...`);
  const bidsAdjusted = await evaluateBidAdjustments(report, config, dryRun);

  console.log(`\nEvaluating ${report.search_terms.length} search terms...`);
  const negativesAdded = await evaluateSearchTermsForNegatives(
    report,
    config,
    dryRun
  );

  console.log(`\nGenerating recommendations...`);
  const recommendations = generateRecommendations(report, config);

  const result: OptimizationResult = {
    date: targetDate,
    dry_run: dryRun,
    keywords_evaluated: report.keywords.length,
    search_terms_evaluated: report.search_terms.length,
    actions: {
      keywords_paused: keywordsPaused,
      bids_adjusted: bidsAdjusted,
      negative_keywords_added: negativesAdded,
    },
    recommendations,
  };

  // Print summary
  console.log("\n=== Optimization Summary ===");
  console.log(`Keywords paused: ${keywordsPaused}`);
  console.log(`Bids adjusted: ${bidsAdjusted}`);
  console.log(`Negative keywords added: ${negativesAdded}`);

  if (recommendations.length > 0) {
    console.log("\nRecommendations:");
    recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  }

  if (!dryRun) {
    const summary = getTodayActionsSummary();
    console.log(`\nTotal actions today: ${summary.keywords_paused + summary.bids_increased + summary.bids_decreased + summary.negative_keywords_added}`);
    if (summary.errors > 0) {
      console.log(`Errors: ${summary.errors}`);
    }
  }

  return result;
}

// CLI handling
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateIndex = args.indexOf("--date");
const date = dateIndex !== -1 ? args[dateIndex + 1] : undefined;

runOptimization(date, dryRun).catch((error) => {
  console.error("Optimization failed:", error);
  process.exit(1);
});
