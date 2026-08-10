/**
 * Demote 8 junk primary conversion actions to secondary. Approved by Kaido 2026-08-10.
 *
 * These are Smart-campaign / local-business / YouTube defaults that can never fire
 * for a search campaign selling training, yet all are primary_for_goal=true, which
 * makes every conversion report meaningless. Under Target Impression Share bidding
 * this does not corrupt bidding; it blocks any future move to conversion bidding.
 *
 * Demotes only — never deletes (repo doctrine: pause, don't delete). Fully
 * reversible by setting primary_for_goal back to true. Dry-run unless --apply.
 */
import "dotenv/config";
import { GoogleAdsApi } from "google-ads-api";

const APPLY = process.argv.includes("--apply");

const DEMOTE = new Set([
  "Smart campaign map directions",
  "Clicks to call",
  "Calls from Smart Campaign Ads",
  "Smart campaign ad clicks to call",
  "Smart campaign map clicks to call",
  "Local actions - Directions",
  "YouTube follow-on views",
  "YouTube channel subscriptions",
]);
const KEEP_PRIMARY = ["Training Registration Click", "Strategy Session Booking"];

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.ADS_CLIENT_ID!, client_secret: process.env.ADS_CLIENT_SECRET!,
    developer_token: process.env.ADS_DEVELOPER_TOKEN!,
  });
  const customer = client.Customer({
    customer_id: process.env.ADS_CUSTOMER_ID!.replace(/-/g, ""), refresh_token: process.env.ADS_REFRESH_TOKEN!,
  });

  const actions = await customer.query(`
    SELECT conversion_action.resource_name, conversion_action.name, conversion_action.primary_for_goal
    FROM conversion_action WHERE conversion_action.status != 'REMOVED'`) as any[];

  // Abort rather than demote the wrong thing if an action was renamed.
  const names = new Set(actions.map((r) => r.conversion_action?.name));
  const missing = [...DEMOTE].filter((n) => !names.has(n));
  if (missing.length) throw new Error(`ABORT — expected conversion actions not found: ${missing.join(", ")}`);

  const todo = actions.filter((r) => DEMOTE.has(r.conversion_action?.name) && r.conversion_action?.primary_for_goal === true);
  console.log(`${todo.length} to demote:`);
  todo.forEach((r) => console.log(`  - ${r.conversion_action.name}`));
  for (const k of KEEP_PRIMARY) {
    const a = actions.find((r) => r.conversion_action?.name === k);
    console.log(`  keeping primary: ${k} (primary=${a?.conversion_action?.primary_for_goal})`);
  }
  if (!todo.length) { console.log("Nothing to do."); return; }
  if (!APPLY) { console.log("DRY RUN — nothing written. Re-run with --apply."); return; }

  await customer.conversionActions.update(
    todo.map((r) => ({ resource_name: r.conversion_action.resource_name, primary_for_goal: false })) as any,
  );

  const stillPrimary = (await customer.query(`
    SELECT conversion_action.name, conversion_action.primary_for_goal FROM conversion_action
    WHERE conversion_action.status != 'REMOVED'`) as any[])
    .filter((r) => r.conversion_action?.primary_for_goal === true).map((r) => r.conversion_action.name);
  console.log(`\nVERIFY still primary: ${stillPrimary.join(", ") || "(none)"}`);
  const leftovers = stillPrimary.filter((n) => DEMOTE.has(n));
  if (leftovers.length) throw new Error(`still junk-primary: ${leftovers.join(", ")}`);
  console.log("Done. Only the two real conversion actions remain primary.");
}
main().catch((e) => { console.error("ERR", e?.message || e); process.exit(1); });
