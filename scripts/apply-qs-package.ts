/**
 * Quality Score package. Kaido 2026-09-28: "Implement everything yourself."
 *
 * Why: on every keyword, landing page experience and expected CTR sat BELOW_AVERAGE
 * for 13 straight weeks; ad relevance was ABOVE_AVERAGE (AVERAGE on
 * "agentic engineering"). Two parts below average cap QS at 3. This attacks both:
 *   1. Agentic keywords move to their own ad group with an ad that repeats their
 *      theme. The old copies are paused, not removed.
 *   2. The two Estonian keywords pause: English landing page, "koolitus" QS 1,
 *      Keyword Planner ~0 searches a month.
 *   3. Campaign negatives for definition-seeking searches that never click.
 *   4. The old ad group is renamed to what it now holds.
 * Logged in analytics/ADS.md.
 *
 * Dry-run by default. --validate sends a validate-only mutate. --apply writes.
 */
import "dotenv/config";
import { GoogleAdsApi, enums, ResourceNames } from "google-ads-api";

const APPLY = process.argv.includes("--apply");
const VALIDATE = process.argv.includes("--validate");

const CAMPAIGN_ID = "23672333274";
const OLD_AD_GROUP_ID = "201333005744";
const LANDING = "https://plepic.com/training/";

const MOVE = [
  { id: "2376055593960", text: "agentic engineering" },
  { id: "2389188117509", text: "agentic coding" },
  { id: "2447197933904", text: "agentic coding course" },
  { id: "2459082486125", text: "agentic coding training" },
  { id: "2492761672223", text: "agentic engineering training" },
];
const PAUSE_ONLY = [
  { id: "2491288708534", text: "claude code koolitus" },
  { id: "2491288708694", text: "claude code kursus" },
];

// Facts as on the live /training/ page and the live ad, 2026-09-28.
const HEADLINES = [
  "Agentic Engineering Training",
  "Agentic Coding Course",
  "Agentic Engineering For Teams",
  "Learn The Agentic Method",
  "Specs, Guardrails, Agents",
  "Töötukassa Reimburses 80%",
  "Next Cohort Starts 16 Oct",
  "6 Fridays, 37.5 Hours",
  "300+ Engineers Trained",
  "8.7/10 Course Rating",
  "Ship In Your Own Codebase",
  "For Estonian Dev Teams",
  "2+ Yrs Experience Required",
  "First Three Cohorts Sold Out",
  "Taught With Claude Code",
];
const DESCRIPTIONS = [
  "Agentic engineering for dev teams: specs, guardrails, verification and parallel agents.",
  "Töötukassa reimburses Estonian employers 80% of the invoice including VAT.",
  "Next cohort starts 16 October. 37.5 hours, up to 20 participants, 2+ years experience.",
  "Ship a real feature in your own codebase. Rated 8.7/10 by 300+ engineers trained.",
];

const NEGATIVES: { text: string; match: "EXACT" | "PHRASE" }[] = [
  { text: "agentic ai", match: "EXACT" },
  { text: "agentic", match: "EXACT" },
  { text: "agentic al", match: "EXACT" },
  { text: "meaning", match: "PHRASE" },
  { text: "definition", match: "PHRASE" },
  { text: "what is", match: "PHRASE" },
  { text: "agentic ide", match: "PHRASE" },
  { text: "agentic design", match: "PHRASE" },
  { text: "examples", match: "PHRASE" },
];

function validateLengths(): boolean {
  let ok = HEADLINES.length >= 3 && HEADLINES.length <= 15 && DESCRIPTIONS.length >= 2 && DESCRIPTIONS.length <= 4;
  for (const h of HEADLINES) if (h.length > 30) { console.error(`headline too long (${h.length}): ${h}`); ok = false; }
  for (const d of DESCRIPTIONS) if (d.length > 90) { console.error(`description too long (${d.length}): ${d}`); ok = false; }
  for (const t of [...HEADLINES, ...DESCRIPTIONS]) if (/[—–]/.test(t)) { console.error(`dash in copy: ${t}`); ok = false; }
  return ok;
}

async function main() {
  if (!validateLengths()) { console.error("Length validation failed. Nothing sent."); process.exit(1); }
  console.log(`MODE: ${APPLY ? "APPLY" : VALIDATE ? "VALIDATE-ONLY" : "DRY RUN"}`);
  if (!APPLY && !VALIDATE) { console.log({ MOVE, PAUSE_ONLY, HEADLINES, DESCRIPTIONS, NEGATIVES }); return; }

  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!, client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const cid = process.env.ADS_CUSTOMER_ID!.replace(/-/g, "");
  const customer = client.Customer({
    customer_id: cid, refresh_token: process.env.ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.ADS_LOGIN_CUSTOMER_ID || undefined,
  });

  // One atomic mutate: new ad group (temp id -1), its keywords and ad, pauses,
  // rename and negatives. Either all of it lands or none of it does.
  const newAg = ResourceNames.adGroup(cid, "-1");
  const oldKw = (id: string) => ResourceNames.adGroupCriterion(cid, OLD_AD_GROUP_ID, id);
  const ops: any[] = [
    { entity: "ad_group", operation: "create", resource: {
      resource_name: newAg, campaign: ResourceNames.campaign(cid, CAMPAIGN_ID),
      name: "Agentic Engineering", status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD, cpc_bid_micros: 10000 } },
    ...MOVE.map((k) => ({ entity: "ad_group_criterion", operation: "create", resource: {
      ad_group: newAg, status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: { text: k.text, match_type: enums.KeywordMatchType.EXACT } } })),
    { entity: "ad_group_ad", operation: "create", resource: {
      ad_group: newAg, status: enums.AdGroupAdStatus.ENABLED,
      ad: { final_urls: [LANDING], responsive_search_ad: {
        headlines: HEADLINES.map((text) => ({ text })),
        descriptions: DESCRIPTIONS.map((text) => ({ text })),
        path1: "training", path2: "agentic" } } } },
    ...[...MOVE, ...PAUSE_ONLY].map((k) => ({ entity: "ad_group_criterion", operation: "update", resource: {
      resource_name: oldKw(k.id), status: enums.AdGroupCriterionStatus.PAUSED } })),
    { entity: "ad_group", operation: "update", resource: {
      resource_name: ResourceNames.adGroup(cid, OLD_AD_GROUP_ID), name: "Claude Code Training" } },
    ...NEGATIVES.map((n) => ({ entity: "campaign_criterion", operation: "create", resource: {
      campaign: ResourceNames.campaign(cid, CAMPAIGN_ID), negative: true,
      keyword: { text: n.text, match_type: enums.KeywordMatchType[n.match] } } })),
  ];

  const res = await customer.mutateResources(ops, { validate_only: !APPLY } as any);
  if (!APPLY) { console.log(`VALIDATE-ONLY PASSED for ${ops.length} operations. Nothing written.`); return; }
  console.log(`APPLIED ${ops.length} operations.`);
  for (const r of (res as any).mutate_operation_responses || []) {
    const v = Object.values(r).find((x: any) => x?.resource_name) as any;
    if (v) console.log("  ", v.resource_name);
  }
}

main().catch((e) => {
  console.error("ERR", e?.errors ? JSON.stringify(e.errors.map((x: any) => x.message)) : (e?.message || e));
  process.exit(1);
});
