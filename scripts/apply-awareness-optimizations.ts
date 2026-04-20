/**
 * One-shot awareness optimizations for "Claude Code Training - Search" campaign.
 *
 * Context: awareness-mode campaign, fixed budget. Impression Share = 10%,
 * 87.6% of reach lost to budget. These changes free spend from low-value
 * queries and reweight toward cheaper Finnish reach.
 *
 * Actions applied (all reversible in Google Ads UI):
 *   1. Negative keywords — stop paying for generic Anthropic shoppers:
 *      - "claude" [EXACT]           — 107 impressions/week, not training buyers
 *      - "claude enterprise pricing" [PHRASE]
 *      - "claude code subscription" [PHRASE]
 *   2. Pause "claude code" broad-match (id 2246481407233) — €3 avg CPC, QS=3
 *   3. Finland bid modifier −50% (still covered for 2026 expansion priming,
 *      just at half the bid since training sales motion is EE-first)
 *
 * Usage:
 *   npx ts-node scripts/apply-awareness-optimizations.ts           # dry run
 *   npx ts-node scripts/apply-awareness-optimizations.ts --apply   # mutate
 */

import "dotenv/config";
import { GoogleAdsApi, enums, ResourceNames } from "google-ads-api";
import { addNegativeKeyword, pauseKeyword } from "./ads-operations";

const CAMPAIGN_ID = "23672333274";         // Claude Code Training - Search
const CAMPAIGN_NAME = "Claude Code Training - Search";
const AD_GROUP_ID = "201333005744";         // Claude Code & Agentic Coding Keywords
const CLAUDE_CODE_BROAD_KEYWORD_ID = "2246481407233";
const FINLAND_GEO_TARGET = "2246";          // Google geo target constant

const NEGATIVE_KEYWORDS: Array<{
  text: string;
  match: "EXACT" | "PHRASE" | "BROAD";
  reason: string;
}> = [
  {
    text: "claude",
    match: "EXACT",
    reason: "Generic Anthropic interest (107 impr/wk, high CPC, not training buyers). EXACT to avoid blocking multi-word relevant queries.",
  },
  {
    text: "claude enterprise pricing",
    match: "PHRASE",
    reason: "Shopping for Anthropic enterprise plans, not Plepic training.",
  },
  {
    text: "claude code subscription",
    match: "PHRASE",
    reason: "Shopping for Claude product subscription, not training.",
  },
];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getCustomer() {
  const api = new GoogleAdsApi({
    client_id: env("ADS_CLIENT_ID"),
    client_secret: env("ADS_CLIENT_SECRET"),
    developer_token: env("ADS_DEVELOPER_TOKEN"),
  });
  return api.Customer({
    customer_id: env("ADS_CUSTOMER_ID").replace(/-/g, ""),
    refresh_token: env("ADS_REFRESH_TOKEN"),
    login_customer_id: process.env.ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, ""),
  });
}

async function findExistingFinlandCriterion(): Promise<{
  resourceName: string;
  bidModifier: number | null;
} | null> {
  const customer = getCustomer();
  const rows = await customer.query(`
    SELECT
      campaign_criterion.resource_name,
      campaign_criterion.location.geo_target_constant,
      campaign_criterion.bid_modifier,
      campaign_criterion.negative
    FROM campaign_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign_criterion.type = 'LOCATION'
      AND campaign_criterion.negative = FALSE
  `);
  for (const r of rows as any[]) {
    const cc = r.campaign_criterion;
    const gtc = cc?.location?.geo_target_constant as string | undefined;
    if (gtc && gtc.endsWith(`/${FINLAND_GEO_TARGET}`)) {
      return {
        resourceName: cc.resource_name,
        bidModifier: cc.bid_modifier ?? null,
      };
    }
  }
  return null;
}

async function setFinlandBidModifier(apply: boolean) {
  const existing = await findExistingFinlandCriterion();
  if (!existing) {
    console.log(
      `  [FI] no existing location criterion for Finland (geo ${FINLAND_GEO_TARGET}) on campaign ${CAMPAIGN_ID}.`
    );
    console.log(
      `       Skipping — won't create one without explicit direction. Check campaign targeting.`
    );
    return { success: false, skipped: true };
  }

  console.log(
    `  [FI] current bid modifier: ${existing.bidModifier ?? "(unset = 1.0)"} → target: 0.5 (-50%)`
  );
  if (!apply) return { success: true, dryRun: true };

  const customer = getCustomer();
  const res = await customer.campaignCriteria.update([
    {
      resource_name: existing.resourceName,
      bid_modifier: 0.5,
    },
  ]);
  console.log(`       applied:`, JSON.stringify(res));
  return { success: true };
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(`\nApply awareness optimizations to "${CAMPAIGN_NAME}" (${CAMPAIGN_ID})`);
  console.log(apply ? "MODE: APPLY\n" : "MODE: DRY RUN (pass --apply to mutate)\n");

  // 1. Negative keywords
  console.log("1. Negative keywords");
  for (const neg of NEGATIVE_KEYWORDS) {
    console.log(`  [NEG] "${neg.text}" [${neg.match}]  — ${neg.reason}`);
    if (apply) {
      const r = await addNegativeKeyword(CAMPAIGN_ID, neg.text, neg.match, neg.reason, CAMPAIGN_NAME);
      console.log(`        → ${r.success ? "OK" : `FAIL ${r.error}`}`);
    }
  }

  // 2. Pause "claude code" broad
  console.log(`\n2. Pause "claude code" broad-match (id ${CLAUDE_CODE_BROAD_KEYWORD_ID})`);
  if (apply) {
    const r = await pauseKeyword(
      CLAUDE_CODE_BROAD_KEYWORD_ID,
      AD_GROUP_ID,
      "Awareness-mode pruning: €3 avg CPC, QS=3. Keep 'claude code training' phrase (QS=5) as the relevant match.",
      "claude code",
      CAMPAIGN_NAME
    );
    console.log(`   → ${r.success ? "OK" : `FAIL ${r.error}`}`);
  }

  // 3. Finland bid modifier
  console.log(`\n3. Finland bid modifier (-50%)`);
  await setFinlandBidModifier(apply);

  console.log("\nDone.");
  if (!apply) console.log("(Re-run with --apply to actually mutate.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
