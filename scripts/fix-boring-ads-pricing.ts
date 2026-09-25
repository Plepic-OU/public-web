/**
 * Correction to the 2026-09-10 "boring ads" pass, after Kaido's review.
 *
 * What the first pass got wrong. Strategy/Plepic Strategy.md says: "Töötukassa
 * reimburses 80% of the invoice including VAT, capped at €2,500 per employee
 * over three years. €2,520 is set so 80% lands just inside that cap. Publish
 * the mechanism, never the after-subsidy figure - no competitor does, and the
 * number is only true once the buyer is qualified."
 *
 * Removing the old "if eligible" price hook was right: it quoted an
 * after-subsidy figure, and so is the real cost to a qualified buyer. But the
 * first pass then pinned the bare list price to a permanent headline slot and
 * unlinked the subsidy assets outright. That published the number that repels
 * and deleted the mechanism that sells - the exact inversion of the rule.
 *
 * Pinning also costs Ad Rank. The 2026-08 audit recorded ad strength EXCELLENT
 * on this ad group with no pinned headlines, and pinning is a documented
 * strength penalty. (The pinned ad's own strength was never measured: it read
 * 2 = PENDING while still under review, not 4 = POOR.) Under the standing
 * visibility-first strategy (TARGET_IMPRESSION_SHARE, market supply-capped at
 * ~90-145 impressions/week, 0% lost to budget) Ad Rank is the whole lever, so
 * pinning is a cost with no offsetting gain.
 *
 * Urmet's thesis still holds; it just lands on the mechanism, not the price.
 * The filter is "Töötukassa reimburses Estonian employers 80%" plus "2+ years
 * experience" - that says who this is for far more sharply than a list price
 * nobody actually pays.
 *
 * Changes:
 *   1. Rewrite ad 824137909366 in place: no pins, twelve concrete headlines,
 *      the mechanism restored, list price never appearing without what+who.
 *   2. Re-link a subsidy sitelink and callout that state the mechanism only.
 *   3. Drop two over-broad negatives that fight the visibility goal:
 *      "what is" (blocks category discovery by Estonian CTOs) and "skills"
 *      (blocks Plepic's own curriculum vocabulary).
 *
 * Deliberately NOT done here: ad 817418213237 still serves a headline and a
 * description quoting the after-subsidy cost, which breaks the same rule. It is the only APPROVED ad in the group right now
 * (824137909366 is still under review), so pausing it today risks taking the
 * campaign dark. Pause it once the rewritten ad is approved.
 *
 * Usage:
 *   npx tsx scripts/fix-boring-ads-pricing.ts            # dry run
 *   npx tsx scripts/fix-boring-ads-pricing.ts --apply
 */

import "dotenv/config";
import { GoogleAdsApi, enums, ResourceNames } from "google-ads-api";
import { loadCredentials, formatCustomerId } from "./ads-operations";

const APPLY = process.argv.includes("--apply");
const CAMPAIGN_ID = "23672333274";
const AD_ID = "824137909366";
const LANDING = "https://www.plepic.com/training/";

const HEADLINES = [
  "Claude Code Training For Teams",
  "Töötukassa Reimburses 80%",
  "Next Cohort Starts 16 Oct",
  "6 Fridays, 50 Academic Hours",
  "2+ Yrs Experience Required",
  "For Estonian Dev Teams",
  "€2,520 +VAT Per Developer",
  "300+ Engineers Trained",
  "8.7/10 Course Rating",
  "Ship In Your Own Codebase",
  "Agentic Engineering Training",
  "~20 Per Cohort, 6 Fridays",
];

const DESCRIPTIONS = [
  "Agentic engineering for dev teams. €2,520 +VAT per developer, six Fridays online.",
  "Töötukassa reimburses Estonian employers 80% of the invoice including VAT.",
  "Next cohort starts 16 October. 50 academic hours, ~20 participants, 2+ years experience.",
  "Ship a real feature in your own codebase. Rated 8.7/10 by 300+ engineers trained.",
];

const RESTORE_SITELINK = {
  linkText: "Töötukassa Subsidy",
  d1: "80% of the invoice incl. VAT",
  d2: "Capped €2,500 per employee",
  url: "https://www.plepic.com/training/#pricing",
};
const RESTORE_CALLOUT = "Töötukassa Reimburses 80%";
const DROP_NEGATIVES = ["what is", "skills"];

const LIMITS = { headline: 30, description: 90, callout: 25, sitelinkText: 25, sitelinkDesc: 35 };
function check(label: string, text: string, max: number): boolean {
  const n = [...text].length;
  if (n > max) console.error(`  TOO LONG ${label}: ${n}/${max} "${text}"`);
  return n <= max;
}

async function main() {
  console.log("=== boring-ads pricing correction ===");
  console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN\n");

  let ok = true;
  for (const h of HEADLINES) ok = check("headline", h, LIMITS.headline) && ok;
  for (const d of DESCRIPTIONS) ok = check("description", d, LIMITS.description) && ok;
  ok = check("callout", RESTORE_CALLOUT, LIMITS.callout) && ok;
  ok = check("sitelink text", RESTORE_SITELINK.linkText, LIMITS.sitelinkText) && ok;
  ok = check("sitelink d1", RESTORE_SITELINK.d1, LIMITS.sitelinkDesc) && ok;
  ok = check("sitelink d2", RESTORE_SITELINK.d2, LIMITS.sitelinkDesc) && ok;
  if (!ok) { console.error("\nLength validation failed. Nothing sent."); process.exit(1); }
  console.log("Length validation passed.\n");

  console.log(`1. REWRITE AD ${AD_ID} (no pins)`);
  for (const h of HEADLINES) console.log(`   H  ${h}`);
  for (const d of DESCRIPTIONS) console.log(`   D  ${d}`);
  console.log(`\n2. RESTORE MECHANISM ASSETS`);
  console.log(`   SITELINK "${RESTORE_SITELINK.linkText}" / ${RESTORE_SITELINK.d1} / ${RESTORE_SITELINK.d2}`);
  console.log(`   CALLOUT  "${RESTORE_CALLOUT}"`);
  console.log(`\n3. DROP NEGATIVES: ${DROP_NEGATIVES.map((n) => `"${n}"`).join(", ")}`);

  if (!APPLY) { console.log("\nDry run complete. Re-run with --apply."); return; }

  const cr = loadCredentials();
  const customerId = formatCustomerId(cr.customer_id);
  const client = new GoogleAdsApi({ client_id: cr.client_id, client_secret: cr.client_secret, developer_token: cr.developer_token });
  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: cr.refresh_token,
    login_customer_id: cr.login_customer_id ? formatCustomerId(cr.login_customer_id) : undefined,
  });

  console.log("\n--- applying ---");

  try {
    await customer.ads.update([
      {
        resource_name: ResourceNames.ad(customerId, AD_ID),
        final_urls: [LANDING],
        responsive_search_ad: {
          headlines: HEADLINES.map((text) => ({ text })),
          descriptions: DESCRIPTIONS.map((text) => ({ text })),
          path1: "training",
          path2: "teams",
        },
      },
    ]);
    console.log(`OK  rewrote ad ${AD_ID} with no pinned assets`);
  } catch (e: any) {
    console.error(`FAIL rewrite ad ${AD_ID}:`, e.message, JSON.stringify(e.errors || "", null, 1));
  }

  try {
    const a = await customer.assets.create([
      {
        final_urls: [RESTORE_SITELINK.url],
        sitelink_asset: { link_text: RESTORE_SITELINK.linkText, description1: RESTORE_SITELINK.d1, description2: RESTORE_SITELINK.d2 },
      },
    ]);
    const rn = a.results?.[0]?.resource_name;
    await customer.campaignAssets.create([
      { campaign: ResourceNames.campaign(customerId, CAMPAIGN_ID), asset: rn, field_type: enums.AssetFieldType.SITELINK },
    ]);
    console.log(`OK  sitelink "${RESTORE_SITELINK.linkText}" -> ${rn}`);
  } catch (e: any) {
    console.error("FAIL restore sitelink:", e.message, JSON.stringify(e.errors || "", null, 1));
  }

  try {
    const a = await customer.assets.create([{ callout_asset: { callout_text: RESTORE_CALLOUT } }]);
    const rn = a.results?.[0]?.resource_name;
    await customer.campaignAssets.create([
      { campaign: ResourceNames.campaign(customerId, CAMPAIGN_ID), asset: rn, field_type: enums.AssetFieldType.CALLOUT },
    ]);
    console.log(`OK  callout "${RESTORE_CALLOUT}" -> ${rn}`);
  } catch (e: any) {
    console.error("FAIL restore callout:", e.message, JSON.stringify(e.errors || "", null, 1));
  }

  const negs = (await customer.query(`
    SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD' AND campaign.id = ${CAMPAIGN_ID}`)) as any[];
  for (const text of DROP_NEGATIVES) {
    const hit = negs.find((r) => r.campaign_criterion.keyword.text === text);
    if (!hit) { console.error(`SKIP negative "${text}" not found`); continue; }
    try {
      await customer.campaignCriteria.remove([
        `customers/${customerId}/campaignCriteria/${CAMPAIGN_ID}~${hit.campaign_criterion.criterion_id}`,
      ]);
      console.log(`OK  removed negative "${text}"`);
    } catch (e: any) {
      console.error(`FAIL remove negative "${text}":`, e.message, JSON.stringify(e.errors || "", null, 1));
    }
  }

  console.log("\n--- done ---");
}

main().catch((e) => { console.error(e); process.exit(1); });
