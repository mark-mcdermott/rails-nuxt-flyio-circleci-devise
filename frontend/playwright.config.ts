// frontend/playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './spec/e2e',
  use: {
    baseURL: 'http://localhost:3001',
    browserName: 'chromium',
    headless: true, // Change to `false` to see the browser in action
  },
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: true,
  },
});