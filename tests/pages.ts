/**
 * The production page list, in one place.
 *
 * Every suite used to carry its own copy, and they drifted: light-mode.spec.ts
 * checked six pages while a11y.spec.ts and security.spec.ts checked two, so
 * jobs, scopeful, privacy and 404 shipped with no accessibility scan and no
 * CSP assertion. A new page was one edit away from being covered by some
 * suites and invisible to the rest.
 *
 * Add a page HERE and every rendered suite picks it up. Keep it in step with
 * PRODUCTION_PAGES in design-guard.spec.ts, which names files on disk because
 * its checks read source rather than render.
 *
 * design-system.html is deliberately absent: it is the specimen page that
 * documents the design system, not a page a customer lands on.
 */
export const PRODUCTION_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'training', path: '/training/' },
  { name: 'scopeful', path: '/scopeful/' },
  { name: 'jobs', path: '/jobs/' },
  { name: 'privacy', path: '/privacy/' },
  { name: '404', path: '/404.html' },
];
