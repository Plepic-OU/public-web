#!/usr/bin/env node
// CI gate (claims job): every money/date token ADDED to a page in a PR must
// gain a receipt line in claims-receipts.log in the same PR.
//
// Port of the vault's ship-gates.sh CLAIM_PAT — keep the semantics identical.
// A wrong price once shipped because volatile values are hardcoded in HTML
// with no machine check; this makes the human verification leave a trace.
//
// No dependencies. Run locally with: node scripts/check-claims.mjs
// (diffs origin/$BASE_REF...HEAD; BASE_REF defaults to main).

import { execFileSync } from 'node:child_process';

const base = process.env.BASE_REF || 'main';
const range = `origin/${base}...HEAD`;

// Money, percentage, or date. Matches the WHOLE token (€2,520 not €2) so it
// can be compared against the receipt.
const CLAIM_PAT =
  /(€[0-9][0-9.,]*|[0-9][0-9.,]* ?EUR|[0-9][0-9.,]*%|20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]|[0-9]+\.[0-9]+\.20[0-9][0-9])/g;

function addedLines(paths) {
  const out = execFileSync('git', ['diff', '-U0', range, '--', ...paths], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1));
}

// Pages a visitor can never reach. deploy.yml deletes each of these from the
// artifact, so a number on one of them cannot mislead a customer, which is the
// only thing this gate exists to prevent. They are excluded because they are
// the pages that legitimately document values: design-system.html alone states
// dozens of CSS percentages, a crop offset and a filter strength among them,
// and every one of them would demand a receipt that means nothing. Requiring
// receipts for those trains the habit of writing a receipt to get past a gate,
// which is the opposite of what a receipt is for. Keep this list in step with
// the "Remove orphan files from deploy" step in .github/workflows/deploy.yml:
// if a page here ever becomes publicly reachable, it belongs back in the scan.
const INTERNAL_PAGES = new Set([
  'design-system.html',
  'font-compare.html',
  'demo-tenders.html',
  'card-directions.html',
  'card-editorial.html',
]);

// --- tokens added to pages ---------------------------------------------------
const tokens = new Set();
for (const raw of addedLines(['*.html', ...[...INTERNAL_PAGES].map((page) => `:(exclude)${page}`)])) {
  // Cache-bust query strings (?v=...) are not claims.
  const line = raw.replace(/\?v=[^"'\s>]*/g, '');
  for (const m of line.matchAll(CLAIM_PAT)) {
    const tok = m[0].replace(/[.,]+$/, '');
    if (tok) tokens.add(tok);
  }
}

if (tokens.size === 0) {
  console.log('claims: no money/date tokens added to pages — pass');
  process.exit(0);
}

// --- receipts added in the same diff ------------------------------------------
// Format: <token> | <source>. Comment lines (#) never count as receipts.
const receipts = new Set();
for (const line of addedLines(['claims-receipts.log'])) {
  if (line.trimStart().startsWith('#')) continue;
  const i = line.indexOf('|');
  if (i > 0) receipts.add(line.slice(0, i).trim());
}

const missing = [...tokens].filter((t) => !receipts.has(t));
if (missing.length === 0) {
  console.log(`claims: ${tokens.size} token(s) added, all receipted — pass`);
  process.exit(0);
}

console.error('claims: money/date tokens added to pages without a receipt:');
for (const t of missing) console.error(`  ${t}`);
console.error('');
console.error('Verify each value against its owning system (plan Sheet, Pipedrive,');
console.error('pricing docs), then add one line per token to claims-receipts.log');
console.error('in this same PR:');
console.error('  <token> | <source you verified it against>');
process.exit(1);
