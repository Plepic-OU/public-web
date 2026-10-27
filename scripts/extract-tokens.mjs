#!/usr/bin/env node
/**
 * Publishes the design tokens on their own as css/tokens.css.
 *
 * css/styles.css owns every token value in its single `:root` block. Other
 * Plepic apps (skill.plepic.com) link https://plepic.com/css/tokens.css to
 * get the live values instead of a pinned copy, without pulling in the whole
 * site stylesheet. Run at deploy time, before upload; the committed source
 * keeps one home for every value.
 *
 * Usage: node scripts/extract-tokens.mjs [rootDir]   (default: cwd)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || process.cwd());

const css = readFileSync(join(ROOT, 'css/styles.css'), 'utf8');
const start = css.indexOf(':root {');
const end = css.indexOf('\n}\n', start) + 2;

writeFileSync(join(ROOT, 'css/tokens.css'), css.slice(start, end) + '\n');
