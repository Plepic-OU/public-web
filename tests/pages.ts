/**
 * The public page lists, in one place.
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
 */
export const PRODUCTION_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'training', path: '/training/' },
  { name: 'scopeful', path: '/scopeful/' },
  { name: 'jobs', path: '/jobs/' },
  { name: 'privacy', path: '/privacy/' },
  { name: '404', path: '/404.html' },
];

/**
 * Public, but not a page a customer lands on to buy something.
 *
 * /design-system/ went live on 2026-09-01. It had been in the repo all along
 * and PRODUCT.md called it "public and canonical at /design-system", but the
 * deploy workflow deleted it from every build as an orphan file, so the URL
 * 404'd. It now ships, with noindex so it does not compete with /training/
 * and /scopeful/ in search.
 *
 * IT IS SEPARATE FROM PRODUCTION_PAGES ON PURPOSE, and the reason is not
 * leniency. A specimen page cannot obey two of the rules it documents: it
 * shows the whole button family at once, so it holds five accent elements in
 * a viewport where The One Accent Rule allows one, and it is the only place
 * the dark device is rendered at all, which The Dark Placement Rule forbids
 * everywhere else. Those two suites read PRODUCTION_PAGES and must keep
 * skipping it, or the page would have to stop showing specimens to pass.
 *
 * Everything not about being a specimen still applies, and is enforced:
 * accessibility and CSP run over PUBLIC_PAGES below.
 */
export const REFERENCE_PAGES = [{ name: 'design-system', path: '/design-system/' }];

/** Every page served to the public, whatever its job. */
export const PUBLIC_PAGES = [...PRODUCTION_PAGES, ...REFERENCE_PAGES];
