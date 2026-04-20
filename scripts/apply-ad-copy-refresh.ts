/**
 * One-shot: replace the current RSA on "Claude Code Training - Search" with a
 * QS-focused version that includes "Claude Code Course" phrasing and pins the
 * three target keywords to guaranteed positions.
 *
 * Strategy: create NEW ad, pause OLD ad. Preserves history on both sides; the
 * old ad's Ad Strength data stays intact for comparison.
 *
 * Usage:
 *   npx ts-node scripts/apply-ad-copy-refresh.ts           # dry run
 *   npx ts-node scripts/apply-ad-copy-refresh.ts --apply   # create + pause
 */

import "dotenv/config";
import { GoogleAdsApi, enums } from "google-ads-api";

const CAMPAIGN_ID = "23672333274";
const AD_GROUP_ID = "201333005744";
const OLD_AD_ID = "801367641043";

// Google's ServedAssetFieldType enum for RSA pinning:
// HEADLINE_1 = 2, HEADLINE_2 = 3, HEADLINE_3 = 4
// DESCRIPTION_1 = 5, DESCRIPTION_2 = 6
const HEADLINE_1 = enums.ServedAssetFieldType.HEADLINE_1;
const HEADLINE_2 = enums.ServedAssetFieldType.HEADLINE_2;
const DESCRIPTION_1 = enums.ServedAssetFieldType.DESCRIPTION_1;

const FINAL_URL = "https://plepic.com/training/";

const HEADLINES: Array<{ text: string; pin?: number }> = [
  { text: "Claude Code Training",        pin: HEADLINE_1 },
  { text: "Claude Code Course",          pin: HEADLINE_1 },
  { text: "Agentic Coding Training",     pin: HEADLINE_2 },
  { text: "6 Fridays With Senior Devs" },
  { text: "300+ Developers Trained" },
  { text: "Master Claude Code" },
  { text: "Töötukassa Covers 80%" },
  { text: "For Dev Teams" },
  { text: "Ship 3-5x Faster With AI" },
  { text: "Build Real Software With AI" },
  { text: "Next Squad Starts May 8" },
  { text: "Max 20 Per Squad" },
  { text: "Get Claude Code Certified" },
  { text: "Agentic Development Training" },
  { text: "Built for Senior Developers" },
];

const DESCRIPTIONS: Array<{ text: string; pin?: number }> = [
  {
    text: "6-week hands-on Claude Code training. Master agentic workflows. Töötukassa covers 80%.",
    pin: DESCRIPTION_1,
  },
  { text: "Build with AI agents, not just chat. Real projects, production workflows. Only €504." },
  { text: "300+ devs trained. Trusted by Helmes, Holm Bank & Delfi. Max 20 per squad." },
  { text: "Claude Code course for devs: 6 Fridays, real production work, 2+ yrs exp." },
];

const PATH_1 = "training";
const PATH_2 = "claude-code";

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

function validateCopy() {
  const errs: string[] = [];
  for (const h of HEADLINES) {
    if (h.text.length > 30) errs.push(`Headline too long (${h.text.length}): "${h.text}"`);
  }
  for (const d of DESCRIPTIONS) {
    if (d.text.length > 90) errs.push(`Description too long (${d.text.length}): "${d.text}"`);
  }
  if (PATH_1.length > 15) errs.push(`Path 1 too long (${PATH_1.length})`);
  if (PATH_2.length > 15) errs.push(`Path 2 too long (${PATH_2.length})`);
  if (HEADLINES.length < 3 || HEADLINES.length > 15) errs.push(`Headlines count ${HEADLINES.length} (need 3-15)`);
  if (DESCRIPTIONS.length < 2 || DESCRIPTIONS.length > 4) errs.push(`Descriptions count ${DESCRIPTIONS.length} (need 2-4)`);
  return errs;
}

async function createNewAd(apply: boolean) {
  const customer = getCustomer();
  const adGroupResource = `customers/${env("ADS_CUSTOMER_ID").replace(/-/g, "")}/adGroups/${AD_GROUP_ID}`;

  const ad = {
    ad_group: adGroupResource,
    status: enums.AdGroupAdStatus.ENABLED,
    ad: {
      final_urls: [FINAL_URL],
      responsive_search_ad: {
        headlines: HEADLINES.map((h) => ({
          text: h.text,
          ...(h.pin !== undefined ? { pinned_field: h.pin } : {}),
        })),
        descriptions: DESCRIPTIONS.map((d) => ({
          text: d.text,
          ...(d.pin !== undefined ? { pinned_field: d.pin } : {}),
        })),
        path1: PATH_1,
        path2: PATH_2,
      },
    },
  };

  console.log("\nNew ad payload:");
  console.log(`  Final URL: ${FINAL_URL}`);
  console.log(`  Path: /${PATH_1}/${PATH_2}`);
  console.log(`  Headlines: ${HEADLINES.length}`);
  console.log(`  Descriptions: ${DESCRIPTIONS.length}`);

  if (!apply) {
    console.log("\nDRY RUN — pass --apply to create + pause old.");
    return null;
  }

  const res = await customer.adGroupAds.create([ad]);
  const resourceName = (res as any)?.results?.[0]?.resource_name;
  console.log(`\nCreated: ${resourceName}`);
  return resourceName;
}

async function pauseOldAd(apply: boolean) {
  const customer = getCustomer();
  const resourceName = `customers/${env("ADS_CUSTOMER_ID").replace(/-/g, "")}/adGroupAds/${AD_GROUP_ID}~${OLD_AD_ID}`;
  console.log(`\nPausing old ad: ${resourceName}`);
  if (!apply) return;
  const res = await customer.adGroupAds.update([
    { resource_name: resourceName, status: enums.AdGroupAdStatus.PAUSED },
  ]);
  console.log(`  → ${JSON.stringify((res as any)?.results?.[0] ?? res)}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const errs = validateCopy();
  if (errs.length) {
    console.error("Validation failed:");
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`Refreshing RSA on campaign ${CAMPAIGN_ID}, ad group ${AD_GROUP_ID}`);
  console.log(apply ? "MODE: APPLY" : "MODE: DRY RUN");

  await createNewAd(apply);
  await pauseOldAd(apply);

  console.log("\nDone.");
  if (!apply) console.log("(Re-run with --apply to mutate.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
