/**
 * Ad-hoc 2-week Google Ads query for keyword impression-share + rank analysis.
 * Reuses the same credentials/library as export-ads.ts but aggregates a date range.
 * Usage: npx ts-node scripts/query-2week.ts [START YYYY-MM-DD] [END YYYY-MM-DD]
 */
import "dotenv/config";
import { GoogleAdsApi } from "google-ads-api";

const START = process.argv[2] || "2026-06-30";
const END = process.argv[3] || "2026-07-12";

function fmtId(id: string): string {
  return id.replace(/-/g, "");
}
function micros(v: number): number {
  return Number(((v || 0) / 1_000_000).toFixed(2));
}
function pct(v: unknown): string {
  if (v === null || v === undefined) return "n/a";
  return (Number(v) * 100).toFixed(1) + "%";
}

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!,
    client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const customer = client.Customer({
    customer_id: fmtId(process.env.ADS_CUSTOMER_ID!),
    refresh_token: process.env.ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.ADS_LOGIN_CUSTOMER_ID
      ? fmtId(process.env.ADS_LOGIN_CUSTOMER_ID)
      : undefined,
  });

  const out: any = { window: { start: START, end: END } };

  // 1. Campaign-level totals + impression share
  const campQ = `
    SELECT campaign.id, campaign.name, campaign.status,
      metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros,
      metrics.conversions, metrics.average_cpc,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.search_top_impression_share,
      metrics.search_absolute_top_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${START}' AND '${END}'
    AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC`;
  out.campaigns = [];
  try {
    for (const r of await customer.query(campQ)) {
      out.campaigns.push({
        name: r.campaign?.name,
        status: r.campaign?.status,
        impr: r.metrics?.impressions || 0,
        clicks: r.metrics?.clicks || 0,
        ctr: pct(r.metrics?.ctr),
        cost: micros(r.metrics?.cost_micros || 0),
        conv: r.metrics?.conversions || 0,
        avg_cpc: micros(r.metrics?.average_cpc || 0),
        impr_share: pct(r.metrics?.search_impression_share),
        lost_budget: pct(r.metrics?.search_budget_lost_impression_share),
        lost_rank: pct(r.metrics?.search_rank_lost_impression_share),
        top_share: pct(r.metrics?.search_top_impression_share),
        abs_top_share: pct(r.metrics?.search_absolute_top_impression_share),
      });
    }
  } catch (e: any) {
    out.campaigns_error = String(e?.message || e);
  }

  // 2. Keyword-level with impression share + quality score.
  // NOTE: search_budget_lost_impression_share is NOT valid on keyword_view
  // (budget is a campaign setting) — query error 49 if included. Rank-lost IS is fine.
  const kwQ = `
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      ad_group_criterion.status, campaign.name,
      metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros,
      metrics.average_cpc, metrics.conversions,
      metrics.search_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.search_top_impression_share,
      metrics.search_absolute_top_impression_share,
      ad_group_criterion.quality_info.quality_score
    FROM keyword_view
    WHERE segments.date BETWEEN '${START}' AND '${END}'
    ORDER BY metrics.impressions DESC`;
  out.keywords = [];
  try {
    for (const r of await customer.query(kwQ)) {
      out.keywords.push({
        kw: r.ad_group_criterion?.keyword?.text,
        match: r.ad_group_criterion?.keyword?.match_type,
        status: r.ad_group_criterion?.status,
        campaign: r.campaign?.name,
        impr: r.metrics?.impressions || 0,
        clicks: r.metrics?.clicks || 0,
        ctr: pct(r.metrics?.ctr),
        cost: micros(r.metrics?.cost_micros || 0),
        avg_cpc: micros(r.metrics?.average_cpc || 0),
        conv: r.metrics?.conversions || 0,
        qs: r.ad_group_criterion?.quality_info?.quality_score ?? null,
        impr_share: pct(r.metrics?.search_impression_share),
        lost_rank: pct(r.metrics?.search_rank_lost_impression_share),
        top_share: pct(r.metrics?.search_top_impression_share),
        abs_top_share: pct(r.metrics?.search_absolute_top_impression_share),
      });
    }
  } catch (e: any) {
    out.keywords_error = String(e?.message || e);
  }

  // 3. Search terms (what people actually typed)
  const stQ = `
    SELECT search_term_view.search_term, campaign.name,
      metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${START}' AND '${END}'
    ORDER BY metrics.impressions DESC`;
  out.search_terms = [];
  try {
    for (const r of await customer.query(stQ)) {
      out.search_terms.push({
        term: r.search_term_view?.search_term,
        campaign: r.campaign?.name,
        impr: r.metrics?.impressions || 0,
        clicks: r.metrics?.clicks || 0,
        cost: micros(r.metrics?.cost_micros || 0),
        conv: r.metrics?.conversions || 0,
      });
    }
  } catch (e: any) {
    out.search_terms_error = String(e?.message || e);
  }

  // 4. Geo split (where users actually were)
  const geoQ = `
    SELECT user_location_view.country_criterion_id,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM user_location_view
    WHERE segments.date BETWEEN '${START}' AND '${END}'
    ORDER BY metrics.impressions DESC`;
  out.geo = [];
  try {
    for (const r of await customer.query(geoQ)) {
      out.geo.push({
        country_id: String(r.user_location_view?.country_criterion_id || "?"),
        impr: r.metrics?.impressions || 0,
        clicks: r.metrics?.clicks || 0,
        cost: micros(r.metrics?.cost_micros || 0),
        conv: r.metrics?.conversions || 0,
      });
    }
  } catch (e: any) {
    out.geo_error = String(e?.message || e);
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
