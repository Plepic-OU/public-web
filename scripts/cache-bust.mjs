#!/usr/bin/env node
/**
 * Cache-busting for the zero-build static site.
 *
 * GitHub Pages serves assets with `cache-control: max-age=600`, and the CSS
 * and JS are referenced by plain URLs (`css/styles.css`, `/js/foo.js`), so a
 * returning visitor keeps stale assets for up to 10 minutes after a deploy
 * (or until a hard-reload). This stamps a short content hash onto each
 * versioned asset's URL in every HTML page, so the URL changes only when the
 * file's bytes change: changed assets bust immediately, unchanged ones stay
 * cached. Run at deploy time, after any HTML edits, before upload.
 *
 * Usage: node scripts/cache-bust.mjs [rootDir]   (default: cwd)
 *
 * It rewrites references to the assets listed in ASSETS below. Each reference
 * form is matched with/without an existing `?v=...` (idempotent re-runs).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.argv[2] || process.cwd());

// Assets to version, by their on-disk path relative to ROOT. Only files that
// actually change between deploys need listing; pinned vendor libs are
// optional (they change rarely and are already immutable by version).
const ASSETS = [
  'css/styles.css',
  'js/crystalline-metamorphosis.js',
  'scripts/tracking.js',
  'vendor/three.module.min.js',
];

/** 8-char content hash for an asset, or null if the file is missing. */
function hashOf(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 8);
}

const versions = new Map();
for (const a of ASSETS) {
  const h = hashOf(a);
  if (h) versions.set(a, h);
  else console.warn(`[cache-bust] skip (not found): ${a}`);
}

/** Recursively collect every .html file under ROOT. */
function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Stamp an asset's URL only where it appears as a real reference — inside a
// quote (href/src/import-map value) or an import() call — never in comments
// or prose. The URL is captured up to the basename, plus an optional existing
// ?v=... (so re-runs are idempotent), and must be immediately followed by the
// closing quote or ) so partial/incidental matches are skipped.
function bust(content, relPath, hash) {
  const base = relPath.split('/').pop();               // e.g. styles.css
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // (opening " ' or `)(url ... basename)(optional ?v=hash)(closing " ' ` or ))
  const re = new RegExp(
    `(["'\`])([^"'\`()\\s]*${escaped})(\\?v=[0-9a-f]+)?(["'\`)])`,
    'g',
  );
  return content.replace(re, (_m, open, path, _v, close) => `${open}${path}?v=${hash}${close}`);
}

let changed = 0;
for (const file of htmlFiles(ROOT)) {
  let content = readFileSync(file, 'utf8');
  const before = content;
  for (const [relPath, hash] of versions) content = bust(content, relPath, hash);
  if (content !== before) {
    writeFileSync(file, content);
    changed++;
    console.log(`[cache-bust] ${relative(ROOT, file)}`);
  }
}

console.log(`[cache-bust] stamped ${versions.size} assets across ${changed} file(s).`);
for (const [a, h] of versions) console.log(`  ${a} -> ?v=${h}`);
