import { defineConfig, devices } from '@playwright/test';

const BASE = 'http://localhost:4321/cs-edu-site/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
