/**
 * Add Estonian to the search campaign's language targeting. Approved by Kaido 2026-08-10.
 * The campaign targeted English only, excluding Estonian-UI searchers in Estonia.
 * Reversible: remove the campaign_criterion to undo. Dry-run unless --apply.
 */
import "dotenv/config";
import { GoogleAdsApi } from "google-ads-api";

const APPLY = process.argv.includes("--apply");
const ET = "languageConstants/1043"; // verified via language_constant, code=et

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!, client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const customer = client.Customer({
    customer_id: process.env.ADS_CUSTOMER_ID!.replace(/-/g, ""), refresh_token: process.env.ADS_REFRESH_TOKEN!,
  });

  const camps = await customer.query(`
    SELECT campaign.resource_name, campaign.name FROM campaign WHERE campaign.status='ENABLED'`) as any[];
  if (camps.length !== 1) throw new Error(`expected exactly 1 enabled campaign, found ${camps.length}`);
  const camp = camps[0].campaign;

  const langs = (await customer.query(`
    SELECT campaign_criterion.language.language_constant FROM campaign_criterion
    WHERE campaign_criterion.type='LANGUAGE' AND campaign.status='ENABLED'`) as any[])
    .map((r) => r.campaign_criterion?.language?.language_constant);
  console.log(`campaign "${camp.name}" languages: ${langs.join(", ")}`);

  if (langs.includes(ET)) { console.log("Estonian already targeted. Nothing to do."); return; }
  if (!APPLY) { console.log(`DRY RUN — would add ${ET} (Estonian). Re-run with --apply.`); return; }

  await customer.campaignCriteria.create([
    { campaign: camp.resource_name, language: { language_constant: ET }, negative: false } as any,
  ]);

  const after = (await customer.query(`
    SELECT campaign_criterion.language.language_constant FROM campaign_criterion
    WHERE campaign_criterion.type='LANGUAGE' AND campaign.status='ENABLED'`) as any[])
    .map((r) => r.campaign_criterion?.language?.language_constant);
  console.log(`VERIFY languages now: ${after.join(", ")}`);
  if (!after.includes(ET)) throw new Error("Estonian still missing after write");
  console.log("Estonian language targeting added.");
}
main().catch((e) => { console.error("ERR", e?.message || e); process.exit(1); });
