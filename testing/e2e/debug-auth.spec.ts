/**
 * DEBUG TEST - Find out why authentication is failing
 */

import { test, expect } from '@playwright/test';

test('DEBUG: Check auth page and credentials', async ({ page }) => {
  console.log('\n=== DEBUG AUTH TEST ===\n');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL || 'NOT SET');
  console.log('TEST_USER_PASSWORD:', process.env.TEST_USER_PASSWORD ? '***SET***' : 'NOT SET');
  
  // Navigate to auth page
  console.log('\n1. Navigating to /auth...');
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'debug-auth-page.png', fullPage: true });
  console.log('✓ Screenshot saved: debug-auth-page.png');
  
  // Check what's on the page
  console.log('\n2. Checking page elements...');
  
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  
  const url = page.url();
  console.log('Current URL:', url);
  
  // Look for tabs
  const signInTab = page.locator('button:has-text("Sign In"), a:has-text("Sign In"), [role="tab"]:has-text("Sign In")');
  const signUpTab = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up"), [role="tab"]:has-text("Sign Up")');
  
  console.log('Sign In tab visible:', await signInTab.isVisible().catch(() => false));
  console.log('Sign Up tab visible:', await signUpTab.isVisible().catch(() => false));
  
  // Look for input fields
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');
  
  console.log('Email input visible:', await emailInput.isVisible().catch(() => false));
  console.log('Password input visible:', await passwordInput.isVisible().catch(() => false));
  console.log('Submit button visible:', await submitButton.isVisible().catch(() => false));
  
  // If sign in tab exists, click it
  if (await signInTab.isVisible({ timeout: 2000 })) {
    console.log('\n3. Clicking Sign In tab...');
    await signInTab.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug-after-signin-click.png', fullPage: true });
    console.log('✓ Screenshot saved: debug-after-signin-click.png');
  }
  
  // Try to fill in credentials
  console.log('\n4. Attempting to fill credentials...');
  
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestUser123!@#';
  
  console.log('Using email:', testEmail);
  console.log('Using password:', testPassword.substring(0, 3) + '***');
  
  try {
    await emailInput.fill(testEmail);
    console.log('✓ Email filled');
    
    await passwordInput.fill(testPassword);
    console.log('✓ Password filled');
    
    await page.screenshot({ path: 'debug-credentials-filled.png', fullPage: true });
    console.log('✓ Screenshot saved: debug-credentials-filled.png');
    
    // Click submit
    console.log('\n5. Clicking submit button...');
    await submitButton.click();
    console.log('✓ Submit clicked');
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'debug-after-submit.png', fullPage: true });
    console.log('✓ Screenshot saved: debug-after-submit.png');
    
    // Check new URL
    const newUrl = page.url();
    console.log('\nAfter submit:');
    console.log('New URL:', newUrl);
    console.log('Still on /auth?', newUrl.includes('/auth'));
    
    // Look for error messages
    const errorMessage = page.locator('[role="alert"], .error, .alert-error, :has-text("Invalid"), :has-text("incorrect"), :has-text("failed")');
    if (await errorMessage.isVisible({ timeout: 1000 })) {
      const errorText = await errorMessage.textContent();
      console.log('⚠️ ERROR MESSAGE:', errorText);
    } else {
      console.log('No error messages found');
    }
    
    // Check for success indicators
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    console.log('User menu visible:', await userMenu.isVisible({ timeout: 1000 }).catch(() => false));
    
  } catch (error) {
    console.error('❌ Error during login:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }
  
  console.log('\n=== END DEBUG TEST ===\n');
  console.log('Check the screenshots in your project root folder!');
});
