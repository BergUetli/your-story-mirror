/**
 * Authentication Helper for E2E Tests
 * Handles login/signup page variations and uses environment variables
 */

import { Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestUser123!@#'
};

export const ADMIN_USER = {
  email: process.env.ADMIN_TEST_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_TEST_PASSWORD || 'TestAdmin123!@#'
};

/**
 * Login helper that handles both sign-in and sign-up page layouts
 * Automatically clicks "Sign In" tab if needed
 */
export async function login(page: Page, email?: string, password?: string) {
  const userEmail = email || TEST_USER.email;
  const userPassword = password || TEST_USER.password;

  // Navigate to auth page
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });

  // Check if we're on signup page and need to switch to sign in
  const signInTab = page.locator(
    'button:has-text("Sign In"):not([type="submit"]), ' +
    'button:has-text("Log In"):not([type="submit"]), ' +
    'a:has-text("Sign In"), ' +
    'a:has-text("Log In"), ' +
    '[role="tab"]:has-text("Sign In"), ' +
    '[role="tab"]:has-text("Log In")'
  );

  // Click sign in tab if visible (means we're on signup page)
  if (await signInTab.isVisible({ timeout: 2000 })) {
    console.log('📝 Clicking "Sign In" tab...');
    await signInTab.first().click();
    await page.waitForTimeout(500);
  }

  // Look for sign in link/text if tabs don't exist
  const signInLink = page.locator(
    'a:has-text("Already have an account"), ' +
    ':has-text("Sign in instead"), ' +
    ':has-text("Login instead")'
  );

  if (await signInLink.isVisible({ timeout: 2000 })) {
    console.log('📝 Clicking "Sign In" link...');
    await signInLink.first().click();
    await page.waitForTimeout(500);
  }

  // Fill in credentials
  console.log(`📧 Logging in as: ${userEmail}`);
  
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(userEmail);
  await passwordInput.fill(userPassword);

  // Submit form
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for navigation
  console.log('⏳ Waiting for authentication...');
  await page.waitForURL(/\/(dashboard|sanctuary|timeline|onboarding)/, { timeout: 10000 });
  
  console.log('✅ Login successful!');
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Look for logout button/link
  const logoutButton = page.locator(
    '[data-testid="logout"], ' +
    'button:has-text("Log Out"), ' +
    'button:has-text("Sign Out"), ' +
    'a:has-text("Log Out"), ' +
    'a:has-text("Sign Out")'
  );

  if (await logoutButton.isVisible({ timeout: 5000 })) {
    await logoutButton.click();
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    console.log('✅ Logout successful!');
  } else {
    // Try user menu first
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [aria-label="User menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(500);
      
      const logoutInMenu = page.locator('button:has-text("Log Out"), a:has-text("Log Out")');
      if (await logoutInMenu.isVisible()) {
        await logoutInMenu.click();
        await page.waitForURL(/\/auth/, { timeout: 5000 });
        console.log('✅ Logout successful!');
      }
    }
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/auth') && !url.includes('/login');
}

/**
 * Get current user email from UI
 */
export async function getCurrentUserEmail(page: Page): Promise<string | null> {
  const userEmail = page.locator('[data-testid="user-email"], .user-email');
  
  if (await userEmail.isVisible({ timeout: 2000 })) {
    return await userEmail.textContent();
  }
  
  return null;
}
