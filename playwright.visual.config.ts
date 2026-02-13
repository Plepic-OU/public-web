import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Configuration
 *
 * Tests pages at key viewports to catch layout regressions.
 * Run with: npm run test:visual
 * Update snapshots: npm run test:visual -- --update-snapshots
 */
export default defineConfig({
  testDir: './tests/visual',
  outputDir: './tests/visual/results',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: './tests/visual/report', open: 'never' }]
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

  // Key viewport breakpoints
  projects: [
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'mobile-480',
      use: {
        viewport: { width: 480, height: 800 },
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop-1440',
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
