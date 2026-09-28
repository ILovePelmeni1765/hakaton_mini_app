import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();

export default defineConfig({
  testDir: './e2e', timeout: 30_000, use: { baseURL: externalBaseURL || 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: externalBaseURL ? undefined : { command: 'vite --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile-safari', testMatch: /(?:home-address|account|back-navigation|mobile-feedback|report-feedback|workspace-usability|reported-issues)\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
});
