import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every spec runs somewhere, and the somewhere is written down.
 *
 * tests/light-mode.spec.ts and tests/instructor-slide.spec.ts were absent from
 * ci.yml for their whole lives. Nothing was broken and nothing reported it:
 * they passed locally whenever someone thought to run them, and a PR that
 * broke either one would have merged green. light-mode is the suite written
 * because the source-level design guard missed a dark footer, so the gap
 * removed exactly the check that catches what the other check cannot see.
 *
 * The failure mode is silence, so the fix cannot be another thing to remember.
 * This asserts that every tests/*.spec.ts is either named in the ci.yml
 * playwright command or listed below as local-only WITH a reason. Adding a
 * spec and forgetting CI now fails the PR that adds it.
 */

const ROOT = path.resolve(__dirname, '..');

// Suites that genuinely cannot run on a Linux GitHub runner. A reason is
// mandatory: "local-only" without one is how a suite quietly stops mattering.
const LOCAL_ONLY: Record<string, string> = {
  'visual.spec.ts':
    'snapshot baselines are macOS-generated; font rasterisation differs on Linux and every snapshot fails',
  'metamorphosis.spec.ts':
    'needs a real GPU for WebGL2; the headless Linux runner has no context and the hero silently falls back to the poster',
};

test('every spec file runs in CI or is declared local-only @ci-coverage', () => {
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');

  // The tests job runs one `npx playwright test <paths...>` line.
  const runLine = ci.split('\n').find((l) => l.includes('npx playwright test'));
  expect(runLine, '.github/workflows/ci.yml no longer has an `npx playwright test` line; this guard cannot read it').toBeTruthy();

  const inCI = new Set((runLine!.match(/tests\/[\w.-]+\.spec\.ts/g) || []).map((p) => path.basename(p)));
  const onDisk = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.spec.ts'));

  const unaccounted = onDisk.filter((f) => !inCI.has(f) && !(f in LOCAL_ONLY));
  expect(
    unaccounted,
    'these spec files run nowhere but on a developer machine. Add each to the `npx playwright test` line in .github/workflows/ci.yml, or add it to LOCAL_ONLY here with the reason it cannot run on a Linux runner.'
  ).toEqual([]);

  // A stale name in either list is the same silence in reverse: CI would try
  // to run a spec that no longer exists, or this file would excuse one.
  const ghosts = [...inCI, ...Object.keys(LOCAL_ONLY)].filter((f) => !onDisk.includes(f));
  expect(ghosts, 'these names appear in ci.yml or LOCAL_ONLY but no such spec file exists; delete the stale entry').toEqual([]);
});
