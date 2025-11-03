import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  testDir: './testing/e2e',
  fullyParallel: false, // Run tests sequentially for more reliable results
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for consistent results
  
  // Global setup - login once for all tests
  globalSetup: './testing/e2e/global-setup.ts',
  
  reporter: [
    ['html', { outputFolder: 'testing/playwright-report' }],
    ['json', { outputFile: 'testing/playwright-results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Use saved authentication state for all tests
    storageState: '.auth/user.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true, // Server already running
    timeout: 120 * 1000,
  },
});
