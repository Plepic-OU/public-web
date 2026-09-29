/**
 * Estonian ad group pointing at /et/. Kaido 2026-09-29: "let's put it live along
 * with the planned google ads and seo changes."
 *
 * Why: "claude code koolitus" and "claude code kursus" were paused on 2026-09-29
 * because they landed on the English /training/ page (QS 1). /et/ is now live,
 * so Estonian searches get an Estonian ad and an Estonian page. Keyword Planner
 * (2026-09-28) puts these at 0-20 searches a month: this is relevance, not reach.
 *
 * The campaign's sitelinks and callouts are English. Ad-group assets of a type
 * replace the campaign's for that ad group, so the Estonian ad carries its own
 * sitelinks and callouts and never shows English extensions.
 * The two paused English-group keywords stay paused. Logged in analytics/ADS.md.
 *
 * Dry-run by default. --validate sends a validate-only mutate. --apply writes.
 */
import "dotenv/config";
import { GoogleAdsApi, enums, ResourceNames } from "google-ads-api";

const APPLY = process.argv.includes("--apply");
const VALIDATE = process.argv.includes("--validate");

const CAMPAIGN_ID = "23672333274";
const LANDING = "https://plepic.com/et/";

const KEYWORDS = ["claude code koolitus", "claude code kursus", "claude koolitus", "claude kursus"];
// Estonian twins of the campaign's "free" and "what is" negatives.
const NEGATIVES = ["tasuta", "mis on"];

// Facts as on the live /et/ page, 2026-09-29.
const HEADLINES = [
  "Claude Code koolitus",
  "Claude Code kursus",
  "Agentne arendus tiimidele",
  "Töötukassa hüvitab 80%",
  "Uus kohort algab 16. oktoobril",
  "6 reedet, 37,5 tundi",
  "300+ koolitatud inseneri",
  "Osalejate hinnang 8,7/10",
  "Lõpuprojekt oma koodibaasis",
  "Eesti arendustiimidele",
  "Kolm kohorti müüdi välja",
  "Kogenud arendajatele",
  "Koolitajad on praktikud",
];
const DESCRIPTIONS = [
  "Agentne arendus Claude Code'iga: spetsifikatsioonid, piirangud, kontrollid ja agendid.",
  "Töötukassa hüvitab Eesti tööandjale 80% koolitusarvest koos käibemaksuga.",
  "Uus kohort algab 16. oktoobril: 6 reedet, 37,5 tundi, kuni 20 osalejat.",
  "Teete päris funktsionaalsuse valmis oma koodibaasis. Osalejate hinnang 8,7/10.",
];
const SITELINKS = [
  { text: "Õppekava", url: `${LANDING}#programm` },
  { text: "Koolitajad", url: `${LANDING}#koolitajad` },
  { text: "Hind ja koolitustoetus", url: `${LANDING}#hind` },
  { text: "Küsimused ja vastused", url: `${LANDING}#kkk` },
];
const CALLOUTS = [
  "Töötukassa hüvitab 80%",
  "6 reedet, 37,5 tundi",
  "300+ koolitatud inseneri",
  "Töö oma koodibaasis",
  "Kuni 20 osalejat",
  "Plepicu tunnistus",
  "Veebis, Google Meetis",
  "2520 € + km osaleja kohta",
];

function validateLengths(): boolean {
  let ok = true;
  const check = (list: string[], max: number, what: string) => {
    for (const t of list) {
      if (t.length > max) { console.error(`${what} too long (${t.length}>${max}): ${t}`); ok = false; }
      if (/[—–]/.test(t)) { console.error(`dash in ${what}: ${t}`); ok = false; }
    }
  };
  check(HEADLINES, 30, "headline");
  check(DESCRIPTIONS, 90, "description");
  check(SITELINKS.map((s) => s.text), 25, "sitelink");
  check(CALLOUTS, 25, "callout");
  return ok && HEADLINES.length <= 15 && DESCRIPTIONS.length <= 4;
}

async function main() {
  if (!validateLengths()) { console.error("Length validation failed. Nothing sent."); process.exit(1); }
  console.log(`MODE: ${APPLY ? "APPLY" : VALIDATE ? "VALIDATE-ONLY" : "DRY RUN"}`);
  if (!APPLY && !VALIDATE) { console.log({ KEYWORDS, NEGATIVES, HEADLINES, DESCRIPTIONS, SITELINKS, CALLOUTS }); return; }

  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!, client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const cid = process.env.ADS_CUSTOMER_ID!.replace(/-/g, "");
  const customer = client.Customer({
    customer_id: cid, refresh_token: process.env.ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.ADS_LOGIN_CUSTOMER_ID || undefined,
  });

  // One atomic mutate with temp ids: -1 is the ad group, -2 onwards the assets.
  const ag = ResourceNames.adGroup(cid, "-1");
  let tmp = -2;
  const assetOps: any[] = [];
  const linkOps: any[] = [];
  for (const s of SITELINKS) {
    const rn = ResourceNames.asset(cid, String(tmp--));
    assetOps.push({ entity: "asset", operation: "create", resource: {
      resource_name: rn, final_urls: [s.url], sitelink_asset: { link_text: s.text } } });
    linkOps.push({ entity: "ad_group_asset", operation: "create", resource: {
      ad_group: ag, asset: rn, field_type: enums.AssetFieldType.SITELINK } });
  }
  for (const c of CALLOUTS) {
    const rn = ResourceNames.asset(cid, String(tmp--));
    assetOps.push({ entity: "asset", operation: "create", resource: {
      resource_name: rn, callout_asset: { callout_text: c } } });
    linkOps.push({ entity: "ad_group_asset", operation: "create", resource: {
      ad_group: ag, asset: rn, field_type: enums.AssetFieldType.CALLOUT } });
  }

  const ops: any[] = [
    { entity: "ad_group", operation: "create", resource: {
      resource_name: ag, campaign: ResourceNames.campaign(cid, CAMPAIGN_ID),
      name: "Claude Code koolitus", status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD, cpc_bid_micros: 10000 } },
    ...KEYWORDS.map((text) => ({ entity: "ad_group_criterion", operation: "create", resource: {
      ad_group: ag, status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: { text, match_type: enums.KeywordMatchType.PHRASE } } })),
    ...NEGATIVES.map((text) => ({ entity: "ad_group_criterion", operation: "create", resource: {
      ad_group: ag, negative: true, keyword: { text, match_type: enums.KeywordMatchType.PHRASE } } })),
    { entity: "ad_group_ad", operation: "create", resource: {
      ad_group: ag, status: enums.AdGroupAdStatus.ENABLED,
      ad: { final_urls: [LANDING], responsive_search_ad: {
        headlines: HEADLINES.map((text) => ({ text })),
        descriptions: DESCRIPTIONS.map((text) => ({ text })),
        path1: "koolitus", path2: "claude-code" } } } },
    ...assetOps,
    ...linkOps,
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
