/**
 * Make "Conversions" mean something on the search campaign. Approved by Kaido 2026-08-10.
 *
 * FIRST ATTEMPT FAILED, AND THE REASON MATTERS. The obvious lever —
 * conversion_action.primary_for_goal = false on the 8 Smart-campaign / local /
 * YouTube defaults — is rejected by the API: "Mutates are not allowed for the
 * requested resource" / "The field attempted to be mutated is immutable".
 * Google generates those actions itself (origin 3/5/7) and will not let an API
 * client edit them. Do not retry that approach.
 *
 * The lever that works is campaign_conversion_goal: per campaign, per
 * (category, origin) pair, with a biddable flag. Narrowing it to the two real
 * goals makes the campaign count only conversions it can actually earn.
 *
 * The category/origin pairs are not guessed. conversion_action reports
 * Training Registration Click as (13, 2) and Strategy Session Booking as
 * (14, 2); everything else belongs to a Smart-campaign, local-action, call or
 * YouTube surface this search campaign does not run.
 *
 * Note the campaign bids on Target Impression Share, which ignores conversions
 * entirely, so this changes reporting today and bidding only if the strategy
 * ever changes. Fully reversible: set biddable back to true.
 *
 * Dry-run unless --apply. --validate runs a validate-only mutate (writes nothing).
 */
import "dotenv/config";
import { GoogleAdsApi } from "google-ads-api";

const APPLY = process.argv.includes("--apply");
const VALIDATE = process.argv.includes("--validate");

// Verified against conversion_action, not assumed.
const KEEP = new Map([
  ["13:2", "Training Registration Click"],
  ["14:2", "Strategy Session Booking"],
]);

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!, client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const customer = client.Customer({
    customer_id: process.env.ADS_CUSTOMER_ID!.replace(/-/g, ""), refresh_token: process.env.ADS_REFRESH_TOKEN!,
  });

  // Guard: refuse to run if the two real goals are not both present and biddable.
  // Without them, turning everything else off would leave the campaign with no
  // conversion goal at all.
  const rows = await customer.query(`
    SELECT campaign.id, campaign_conversion_goal.resource_name, campaign_conversion_goal.category,
           campaign_conversion_goal.origin, campaign_conversion_goal.biddable
    FROM campaign_conversion_goal WHERE campaign.status='ENABLED'`) as any[];

  const key = (g: any) => `${g.category}:${g.origin}`;
  for (const [k, name] of KEEP) {
    const found = rows.find((r) => key(r.campaign_conversion_goal) === k);
    if (!found?.campaign_conversion_goal?.biddable) {
      throw new Error(`ABORT — goal ${k} (${name}) is missing or already non-biddable; refusing to leave the campaign with no goal`);
    }
  }

  const todo = rows.filter((r) => {
    const g = r.campaign_conversion_goal;
    return !KEEP.has(key(g)) && g.biddable === true;
  });

  console.log(`${todo.length} goal(s) to set biddable=false:`);
  todo.forEach((r) => console.log(`  category=${r.campaign_conversion_goal.category} origin=${r.campaign_conversion_goal.origin}`));
  for (const [k, name] of KEEP) console.log(`  keeping biddable: ${k} (${name})`);

  if (!todo.length) { console.log("Nothing to do."); return; }

  const ops = todo.map((r) => ({ resource_name: r.campaign_conversion_goal.resource_name, biddable: false }));

  if (!APPLY && !VALIDATE) { console.log("DRY RUN — nothing written. Re-run with --apply (or --validate)."); return; }
  if (VALIDATE) {
    await customer.campaignConversionGoals.update(ops as any, { validate_only: true } as any);
    console.log("VALIDATE-ONLY PASSED — permitted. Nothing written.");
    return;
  }

  await customer.campaignConversionGoals.update(ops as any);

  const after = (await customer.query(`
    SELECT campaign_conversion_goal.category, campaign_conversion_goal.origin,
           campaign_conversion_goal.biddable FROM campaign_conversion_goal
    WHERE campaign.status='ENABLED'`) as any[])
    .filter((r) => r.campaign_conversion_goal?.biddable === true)
    .map((r) => key(r.campaign_conversion_goal));
  console.log(`\nVERIFY biddable goals now: ${after.join(", ") || "(none)"}`);
  const strays = after.filter((k) => !KEEP.has(k));
  if (strays.length) throw new Error(`unexpected goals still biddable: ${strays.join(", ")}`);
  if (after.length !== KEEP.size) throw new Error(`expected ${KEEP.size} biddable goals, found ${after.length}`);
  console.log("Done. The campaign now counts only the two conversions it can actually earn.");
}
main().catch((e) => {
  console.error("ERR", e?.errors ? JSON.stringify(e.errors.map((x: any) => x.message)) : (e?.message || e));
  process.exit(1);
});
