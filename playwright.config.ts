import { defineConfig, devices } from '@playwright/test';

/**
 * Automated Testing Suite for Ralph Loop
 *
 * Tests provide objective pass/fail criteria for autonomous operation:
 * - Visual regression (screenshot comparison)
 * - Accessibility (axe-core violations)
 * - Layout (horizontal scroll, touch targets)
 *
 * Run: npm test
 * Update snapshots: npm run test:visual:update
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './tests/results',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: './tests/report', open: 'never' }]
  ],

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // Mobile viewport - critical for touch targets and responsive
    {
      name: 'mobile',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    // Tablet viewport
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    // Desktop viewport
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    command: 'npx serve -l 8080 .',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
