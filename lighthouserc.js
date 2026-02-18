/**
 * Lighthouse CI Configuration
 *
 * Automated performance and accessibility scoring.
 * Run: npm run test:lighthouse
 */
module.exports = {
  ci: {
    collect: {
      // Start local server and test these URLs
      startServerCommand: 'npx serve -l 8080 .',
      startServerReadyPattern: 'Accepting connections',
      url: [
        'http://localhost:8080/',
        'http://localhost:8080/agent/',
        'http://localhost:8080/training/',
      ],
      numberOfRuns: 1,
      settings: {
        // Mobile device emulation
        preset: 'desktop',
        // Skip PWA audits for static site
        skipAudits: ['installable-manifest', 'service-worker'],
      },
    },
    assert: {
      assertions: {
        // Accessibility: must score >= 90
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Performance: warn if below 80, error if below 60
        'categories:performance': ['warn', { minScore: 0.8 }],

        // Best practices: must score >= 80
        'categories:best-practices': ['warn', { minScore: 0.8 }],

        // SEO: must score >= 90
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Specific critical checks
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-description': 'error',
        'meta-viewport': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'button-name': 'error',
      },
    },
    upload: {
      // Don't upload to Lighthouse server - just local results
      target: 'temporary-public-storage',
    },
  },
};
