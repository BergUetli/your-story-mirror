/**
 * Global Setup - Login Once for All Tests
 * This logs in once and saves the authentication state
 * All tests will reuse this logged-in state (no re-login needed)
 */

import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../../.auth/user.json');

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Global Setup: Logging in once for all tests...\n');

  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to auth page
    console.log('📝 Navigating to auth page...');
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('networkidle');

    // Check if we need to click "Sign In" tab
    const signInTab = page.locator(
      'button:has-text("Sign In"):not([type="submit"]), ' +
      'a:has-text("Sign In"), ' +
      '[role="tab"]:has-text("Sign In")'
    );

    if (await signInTab.isVisible({ timeout: 2000 })) {
      console.log('📝 Clicking "Sign In" tab...');
      await signInTab.first().click();
      await page.waitForTimeout(500);
    }

    // Get credentials from environment
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestUser123!@#';

    console.log(`📧 Logging in as: ${email}`);

    // Fill in credentials
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();

    // Wait for successful login
    await page.waitForURL(/\/(dashboard|sanctuary|timeline|onboarding)/, { 
      timeout: 10000 
    });

    console.log('✅ Login successful!');
    console.log(`📍 Redirected to: ${page.url()}`);

    // Save authentication state
    await page.context().storageState({ path: authFile });
    console.log(`💾 Auth state saved to: ${authFile}`);
    console.log('\n🎉 All tests will reuse this session (no re-login needed)\n');

  } catch (error) {
    console.error('❌ Login failed during global setup:');
    console.error(error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
