/**
 * "Boring ads" pass on "Claude Code Training - Search" (campaign 23672333274).
 *
 * Thesis (Urmet Seepter, 2026-09): when the ad is only text, the copy IS the
 * targeting. The job is not to win clicks, it is to stop the wrong ones. Say
 * exactly what you sell, who it is for, and what it costs, so the wrong people
 * scroll past.
 *
 * Evidence, 2026-08-11..2026-09-09: EUR70.96 spend, 681 impressions, 17 clicks,
 * 2 conversions, EUR4.17 average CPC. Impression share 90.9%, 0.0% lost to
 * budget. Volume is not the constraint; click quality is. About half the spend
 * went to individual-learner queries ("claude code tutorial", "learn claude",
 * "claude academy courses", "claude obuchenie", "how to code with claude").
 * Both live ads lead with the after-subsidy price and "Up To 80% State
 * Subsidy" - a discount hook that makes a EUR2,520 B2B course look cheap to
 * exactly those people. Strategy/Plepic Strategy.md: publish the mechanism,
 * never the after-subsidy figure.
 *
 * Every claim below is taken verbatim from plepic.com/training/ on 2026-09-10.
 *
 * Usage:
 *   npx tsx scripts/apply-boring-ads.ts            # dry run
 *   npx tsx scripts/apply-boring-ads.ts --apply    # mutate
 */

import "dotenv/config";
import { GoogleAdsApi, enums, ResourceNames } from "google-ads-api";
import { addNegativeKeyword, loadCredentials, formatCustomerId } from "./ads-operations";

const APPLY = process.argv.includes("--apply");
const CAMPAIGN_ID = "23672333274";
const CAMPAIGN_NAME = "Claude Code Training - Search";
const AD_GROUP_ID = "201333005744";
const LANDING = "https://www.plepic.com/training/";

// ---------------------------------------------------------------- 1. new RSA
// Pinned position 1 = what + who. Pinned position 2 = the price. Those two
// always serve, so the ad disqualifies before it invites. Eight headlines, not
// fifteen: a large pool lets the algorithm assemble a vague combination.
const HEADLINES: Array<{ text: string; pin?: 1 | 2 | 3 }> = [
  { text: "Claude Code Training For Teams", pin: 1 },
  { text: "€2,520 +VAT Per Developer", pin: 2 },
  { text: "Next Cohort Starts 16 Oct", },
  { text: "6 Fridays, 50 Academic Hours" },
  { text: "2+ Yrs Experience Required" },
  { text: "For Employers, Not Beginners" },
  { text: "300+ Engineers Trained" },
  { text: "8.7/10 Course Rating" },
];

const DESCRIPTIONS: Array<{ text: string; pin?: 1 | 2 }> = [
  {
    text: "Claude Code training for development teams. €2,520 +VAT per developer, 6 Fridays online.",
    pin: 1,
  },
  { text: "Estonian employers: Töötukassa reimburses 80% of the invoice, up to €2,500 per employee." },
  { text: "Next cohort starts 16 October. 50 academic hours, ~20 participants, 2+ years experience." },
  { text: "Ship a real feature in your own codebase. Rated 8.7/10 by 300+ engineers trained." },
];

// ------------------------------------------------- 2. ad to pause (the control)
// 817349148367: 305 impressions, 8 clicks, EUR28.17, 0 conversions. Keeps
// 817418213237 (2 conversions) as the control against the new ad. Paused, not
// removed, so it is one click to restore.
const AD_TO_PAUSE = "817349148367";

// -------------------------------------------------------- 3. assets to unlink
// Unlinked from the campaign, not deleted. Each either states a retired or
// stale fact, or repeats the discount hook the new ad is built to avoid.
const UNLINK: Array<{ assetId: string; fieldType: "SITELINK" | "CALLOUT"; what: string; why: string }> = [
  { assetId: "384023810696", fieldType: "SITELINK", what: 'Next Squad: Waitlist', why: '"Squad" was retired on 2026-08-31; the site says cohort, and it now has a date.' },
  { assetId: "384023810699", fieldType: "SITELINK", what: 'Up to 80% Subsidy / after-subsidy price vs €2,520 per dev', why: "The discount hook, in the most clickable slot." },
  { assetId: "384023810705", fieldType: "CALLOUT", what: "Up To 80% State Subsidy", why: "Same hook repeated. The subsidy now appears once, in a description." },
  { assetId: "331019881451", fieldType: "SITELINK", what: "About Plepic / Software development agency", why: "Sells the agency, not the course. Invites the wrong click." },
  { assetId: "323120986903", fieldType: "SITELINK", what: 'Agentic Coding Training / "With Claude Code. Master"', why: "Description is truncated mid-word." },
];

// --------------------------------------------------------- 4. assets to add
const NEW_SITELINKS = [
  {
    linkText: "Price and Next Cohort",
    d1: "€2,520 +VAT per developer",
    d2: "Next cohort starts 16 October",
    url: "https://www.plepic.com/training/#pricing",
  },
  {
    linkText: "Who Should Join",
    d1: "2+ years of professional dev work",
    d2: "Your own codebase, all 6 Fridays",
    url: "https://www.plepic.com/training/",
  },
];

const NEW_CALLOUTS = ["€2,520 +VAT Per Developer", "2+ Years Experience"];

// ------------------------------------------------------------ 5. negatives
// Note: none of these search terms individually reached the EUR25 negative-
// keyword threshold in ads-config.json (the largest was EUR6.36). They are
// added as a cluster: together they are roughly half of all spend, and every
// one of them is an individual learning to use Claude, not an employer buying
// team training. The existing "tutorial" and "free" negatives are EXACT, which
// is why "claude code tutorial" still cost EUR4.35 - these widen them to PHRASE.
// Deliberately NOT added: "kurs"/Cyrillic "course" (would block Russian-speaking
// Estonian buyers), bare "learn"/"learning" (would block the "learn agentic ai"
// keyword), "agentic ai" (core vocabulary), "certificate" (an employer may
// reasonably check whether one is included).
const NEGATIVES: Array<{ text: string; why: string }> = [
  { text: "tutorial", why: "Individual learner. EXACT negative already existed and did not hold." },
  { text: "tutorials", why: "Plural of the above; negatives do not match plurals." },
  { text: "beginner", why: "Course requires 2+ years of professional experience." },
  { text: "beginners", why: "Same." },
  { text: "getting started", why: "Free-documentation intent." },
  { text: "get started", why: "Same." },
  { text: "how to start", why: "Same." },
  { text: "how to code", why: "Same." },
  { text: "academy", why: '"claude academy courses" cost EUR6.07 on one click, 0 conversions.' },
  { text: "learn claude", why: "Individual self-teaching; EUR4.25 per click, 0 conversions." },
  { text: "learning with claude", why: "Same intent, different phrasing." },
  { text: "what is", why: "Definition seeker, never a buyer." },
  { text: "claude design", why: "Different product entirely." },
  { text: "for education", why: "Schools and students, not employers." },
  { text: "обучение", why: 'Russian "training" as a self-study query; EUR3.52, 0 conversions.' },
  { text: "free", why: "Widens the existing EXACT negative." },
  { text: "certification", why: "Credential shoppers; the paused keyword drew them at QS 2." },
  { text: "skills", why: 'Claude "skills" how-tos; the paused keyword scored QS 1.' },
  { text: "download", why: "Wants the tool, not training." },
  { text: "login", why: "Wants Anthropic, not Plepic." },
];

// ---------------------------------------------------------------- validation
const LIMITS = { headline: 30, description: 90, callout: 25, sitelinkText: 25, sitelinkDesc: 35 };
function check(label: string, text: string, max: number): boolean {
  const n = [...text].length;
  const ok = n <= max;
  if (!ok) console.error(`  TOO LONG ${label}: ${n}/${max} "${text}"`);
  return ok;
}

function validate(): boolean {
  let ok = true;
  for (const h of HEADLINES) ok = check("headline", h.text, LIMITS.headline) && ok;
  for (const d of DESCRIPTIONS) ok = check("description", d.text, LIMITS.description) && ok;
  for (const c of NEW_CALLOUTS) ok = check("callout", c, LIMITS.callout) && ok;
  for (const s of NEW_SITELINKS) {
    ok = check("sitelink text", s.linkText, LIMITS.sitelinkText) && ok;
    ok = check("sitelink desc1", s.d1, LIMITS.sitelinkDesc) && ok;
    ok = check("sitelink desc2", s.d2, LIMITS.sitelinkDesc) && ok;
  }
  return ok;
}

const PIN = {
  1: enums.ServedAssetFieldType.HEADLINE_1,
  2: enums.ServedAssetFieldType.HEADLINE_2,
  3: enums.ServedAssetFieldType.HEADLINE_3,
} as const;
const DPIN = {
  1: enums.ServedAssetFieldType.DESCRIPTION_1,
  2: enums.ServedAssetFieldType.DESCRIPTION_2,
} as const;

async function main() {
  console.log(`=== boring-ads pass on ${CAMPAIGN_NAME} ===`);
  console.log(APPLY ? "MODE: APPLY (mutating)\n" : "MODE: DRY RUN (no changes)\n");

  if (!validate()) {
    console.error("\nLength validation failed. Nothing was sent.");
    process.exit(1);
  }
  console.log("Length validation passed.\n");

  console.log("1. NEW RESPONSIVE SEARCH AD");
  for (const h of HEADLINES) console.log(`   H${h.pin ? ` pin=${h.pin}` : "  "} ${h.text}`);
  for (const d of DESCRIPTIONS) console.log(`   D${d.pin ? ` pin=${d.pin}` : "  "} ${d.text}`);
  console.log(`   final url: ${LANDING}  path: training/teams\n`);
  console.log(`2. PAUSE AD ${AD_TO_PAUSE} (0 conversions on EUR28.17)\n`);
  console.log("3. UNLINK ASSETS");
  for (const u of UNLINK) console.log(`   ${u.fieldType} ${u.assetId}: ${u.what}\n      ${u.why}`);
  console.log("\n4. NEW ASSETS");
  for (const s of NEW_SITELINKS) console.log(`   SITELINK "${s.linkText}" / ${s.d1} / ${s.d2} -> ${s.url}`);
  for (const c of NEW_CALLOUTS) console.log(`   CALLOUT  "${c}"`);
  console.log(`\n5. NEGATIVE KEYWORDS (${NEGATIVES.length}, all PHRASE)`);
  for (const n of NEGATIVES) console.log(`   "${n.text}" - ${n.why}`);

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to send.");
    return;
  }

  const credentials = loadCredentials();
  const customerId = formatCustomerId(credentials.customer_id);
  const client = new GoogleAdsApi({
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    developer_token: credentials.developer_token,
  });
  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: credentials.refresh_token,
    login_customer_id: credentials.login_customer_id ? formatCustomerId(credentials.login_customer_id) : undefined,
  });

  console.log("\n--- applying ---");

  // 1. create the ad
  try {
    const res = await customer.adGroupAds.create([
      {
        ad_group: ResourceNames.adGroup(customerId, AD_GROUP_ID),
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          final_urls: [LANDING],
          responsive_search_ad: {
            headlines: HEADLINES.map((h) => ({ text: h.text, ...(h.pin ? { pinned_field: PIN[h.pin] } : {}) })),
            descriptions: DESCRIPTIONS.map((d) => ({ text: d.text, ...(d.pin ? { pinned_field: DPIN[d.pin] } : {}) })),
            path1: "training",
            path2: "teams",
          },
        },
      },
    ]);
    console.log("OK  created RSA:", JSON.stringify(res.results?.map((r: any) => r.resource_name)));
  } catch (e: any) {
    console.error("FAIL create RSA:", e.message, JSON.stringify(e.errors || "", null, 1));
  }

  // 2. pause the losing ad
  try {
    await customer.adGroupAds.update([
      {
        resource_name: ResourceNames.adGroupAd(customerId, AD_GROUP_ID, AD_TO_PAUSE),
        status: enums.AdGroupAdStatus.PAUSED,
      },
    ]);
    console.log(`OK  paused ad ${AD_TO_PAUSE}`);
  } catch (e: any) {
    console.error(`FAIL pause ad ${AD_TO_PAUSE}:`, e.message, JSON.stringify(e.errors || "", null, 1));
  }

  // 3. unlink stale assets
  for (const u of UNLINK) {
    try {
      await customer.campaignAssets.remove([
        `customers/${customerId}/campaignAssets/${CAMPAIGN_ID}~${u.assetId}~${u.fieldType}`,
      ]);
      console.log(`OK  unlinked ${u.fieldType} ${u.assetId}`);
    } catch (e: any) {
      console.error(`FAIL unlink ${u.fieldType} ${u.assetId}:`, e.message, JSON.stringify(e.errors || "", null, 1));
    }
  }

  // 4. create and link new assets
  for (const s of NEW_SITELINKS) {
    try {
      const a = await customer.assets.create([
        { final_urls: [s.url], sitelink_asset: { link_text: s.linkText, description1: s.d1, description2: s.d2 } },
      ]);
      const rn = a.results?.[0]?.resource_name;
      await customer.campaignAssets.create([
        { campaign: ResourceNames.campaign(customerId, CAMPAIGN_ID), asset: rn, field_type: enums.AssetFieldType.SITELINK },
      ]);
      console.log(`OK  sitelink "${s.linkText}" -> ${rn}`);
    } catch (e: any) {
      console.error(`FAIL sitelink "${s.linkText}":`, e.message, JSON.stringify(e.errors || "", null, 1));
    }
  }
  for (const c of NEW_CALLOUTS) {
    try {
      const a = await customer.assets.create([{ callout_asset: { callout_text: c } }]);
      const rn = a.results?.[0]?.resource_name;
      await customer.campaignAssets.create([
        { campaign: ResourceNames.campaign(customerId, CAMPAIGN_ID), asset: rn, field_type: enums.AssetFieldType.CALLOUT },
      ]);
      console.log(`OK  callout "${c}" -> ${rn}`);
    } catch (e: any) {
      console.error(`FAIL callout "${c}":`, e.message, JSON.stringify(e.errors || "", null, 1));
    }
  }

  // 5. negatives (via ads-operations so each lands in the daily action log)
  for (const n of NEGATIVES) {
    const r = await addNegativeKeyword(CAMPAIGN_ID, n.text, "PHRASE", n.why, CAMPAIGN_NAME);
    if (!r.success) console.error(`FAIL negative "${n.text}": ${r.error}`);
  }

  console.log("\n--- done ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
