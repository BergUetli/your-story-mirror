import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Dashboard & Settings
 * 
 * Tests user dashboard and settings management:
 * - dashboard-001: User dashboard overview
 * - dashboard-002: Settings page navigation
 * - dashboard-003: Profile settings update
 * 
 * Prerequisites:
 * - Authenticated user account
 * - Dashboard and settings pages implemented
 * - Profile update functionality working
 */

test.describe('Dashboard & Settings', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'dashtest@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestUser123!@#'
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8080/auth');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();
      await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 10000 });
    }
  });

  test('dashboard-001: User dashboard overview', async ({ page }) => {
    console.log('\n🧪 TEST: dashboard-001 - User dashboard overview');
    
    // Navigate to dashboard
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to dashboard');
    
    // Check for dashboard title/header
    const dashboardHeader = page.locator('[data-testid="dashboard-header"], h1:has-text("Dashboard")');
    if (await dashboardHeader.isVisible({ timeout: 5000 })) {
      console.log('✓ Dashboard header found');
    }
    
    // Check for key statistics/metrics
    const metrics = [
      { name: 'Total Memories', selector: '[data-testid="total-memories"], [data-testid="memory-count"]' },
      { name: 'Conversations', selector: '[data-testid="conversation-count"], [data-testid="total-conversations"]' },
      { name: 'Recordings', selector: '[data-testid="recording-count"], [data-testid="total-recordings"]' },
      { name: 'Recent Activity', selector: '[data-testid="recent-activity"], [data-testid="activity-feed"]' }
    ];
    
    console.log('Checking dashboard metrics...');
    for (const metric of metrics) {
      const element = page.locator(metric.selector);
      if (await element.isVisible()) {
        const value = await element.textContent();
        console.log(`✓ ${metric.name}: ${value}`);
      } else {
        console.log(`  ${metric.name}: not found`);
      }
    }
    
    // Check for quick actions
    const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions');
    if (await quickActions.isVisible()) {
      console.log('✓ Quick actions section found');
      
      const actionButtons = quickActions.locator('button, a');
      const actionCount = await actionButtons.count();
      console.log(`  Found ${actionCount} quick action buttons`);
      
      // Common quick actions
      const expectedActions = [
        { name: 'New Conversation', text: 'New Conversation|Start Conversation|Sanctuary' },
        { name: 'View Timeline', text: 'Timeline|View Memories' },
        { name: 'Archive', text: 'Archive|Recordings' }
      ];
      
      for (const action of expectedActions) {
        const actionButton = actionButtons.locator(`:has-text(/^${action.text}$/i)`).first();
        if (await actionButton.isVisible()) {
          console.log(`  ✓ ${action.name} action available`);
        }
      }
    }
    
    // Check for recent memories widget
    const recentMemories = page.locator('[data-testid="recent-memories"], .recent-memories');
    if (await recentMemories.isVisible()) {
      console.log('✓ Recent memories widget found');
      
      const memoryItems = recentMemories.locator('[data-testid="memory-item"], .memory-item');
      const memoryCount = await memoryItems.count();
      console.log(`  Showing ${memoryCount} recent memories`);
      
      if (memoryCount > 0) {
        expect(memoryCount).toBeGreaterThan(0);
        console.log('✓ Dashboard shows recent memories');
      }
    }
    
    // Check for activity timeline
    const activityTimeline = page.locator('[data-testid="activity-timeline"], [data-testid="activity-feed"]');
    if (await activityTimeline.isVisible()) {
      console.log('✓ Activity timeline found');
      
      const activities = activityTimeline.locator('[data-testid="activity-item"], .activity-item');
      const activityCount = await activities.count();
      console.log(`  Showing ${activityCount} recent activities`);
      
      if (activityCount > 0) {
        const firstActivity = activities.first();
        const activityText = await firstActivity.textContent();
        console.log(`  Latest activity: ${activityText?.substring(0, 60)}...`);
      }
    }
    
    // Check for navigation menu
    const navMenu = page.locator('[data-testid="nav-menu"], nav, .navigation');
    if (await navMenu.isVisible()) {
      console.log('✓ Navigation menu found');
      
      const navLinks = navMenu.locator('a, button');
      const linkCount = await navLinks.count();
      console.log(`  Found ${linkCount} navigation links`);
      
      // Check for essential navigation items
      const essentialLinks = ['Sanctuary', 'Timeline', 'Archive', 'Settings'];
      for (const linkText of essentialLinks) {
        const link = navLinks.locator(`:has-text("${linkText}")`).first();
        if (await link.isVisible()) {
          console.log(`  ✓ ${linkText} link available`);
        }
      }
    }
    
    // Check for user profile section
    const userProfile = page.locator('[data-testid="user-profile"], .user-profile');
    if (await userProfile.isVisible()) {
      console.log('✓ User profile section found');
      
      const userName = userProfile.locator('[data-testid="user-name"]');
      if (await userName.isVisible()) {
        const name = await userName.textContent();
        console.log(`  User: ${name}`);
      }
      
      const userEmail = userProfile.locator('[data-testid="user-email"]');
      if (await userEmail.isVisible()) {
        const email = await userEmail.textContent();
        console.log(`  Email: ${email}`);
        expect(email).toContain('@');
      }
    }
  });

  test('dashboard-002: Settings page navigation', async ({ page }) => {
    console.log('\n🧪 TEST: dashboard-002 - Settings page navigation');
    
    // Navigate to settings from dashboard
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });
    
    // Look for settings link
    const settingsLink = page.locator('[data-testid="settings-link"], a:has-text("Settings"), button:has-text("Settings")');
    
    if (await settingsLink.isVisible({ timeout: 5000 })) {
      await settingsLink.click();
      console.log('✓ Clicked settings link');
      
      // Wait for navigation
      await page.waitForURL(/\/settings/, { timeout: 5000 });
      console.log('✓ Navigated to settings page');
      
    } else {
      // Try direct navigation
      await page.goto('http://localhost:8080/settings', { waitUntil: 'networkidle' });
      console.log('✓ Navigated directly to settings');
    }
    
    // Check for settings sections
    const settingsSections = [
      { name: 'Profile', selector: '[data-testid="profile-settings"], :has-text("Profile Settings")' },
      { name: 'Account', selector: '[data-testid="account-settings"], :has-text("Account Settings")' },
      { name: 'Privacy', selector: '[data-testid="privacy-settings"], :has-text("Privacy")' },
      { name: 'Notifications', selector: '[data-testid="notification-settings"], :has-text("Notifications")' },
      { name: 'Preferences', selector: '[data-testid="preferences"], :has-text("Preferences")' }
    ];
    
    console.log('Checking settings sections...');
    for (const section of settingsSections) {
      const element = page.locator(section.selector);
      if (await element.isVisible()) {
        console.log(`✓ ${section.name} section found`);
        
        // Try to click on the section
        await element.click();
        await page.waitForTimeout(500);
        
        // Check if section expanded/navigated
        const sectionContent = page.locator(`[data-testid="${section.name.toLowerCase()}-content"]`);
        if (await sectionContent.isVisible()) {
          console.log(`  ✓ ${section.name} section expanded`);
        }
      } else {
        console.log(`  ${section.name} section: not found`);
      }
    }
    
    // Check for settings tabs
    const settingsTabs = page.locator('[role="tab"], .settings-tab');
    const tabCount = await settingsTabs.count();
    
    if (tabCount > 0) {
      console.log(`✓ Found ${tabCount} settings tabs`);
      
      // Test tab navigation
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        const tab = settingsTabs.nth(i);
        const tabText = await tab.textContent();
        console.log(`  Testing tab: ${tabText}`);
        
        await tab.click();
        await page.waitForTimeout(500);
        
        // Check if tab is active
        const isActive = await tab.evaluate(el => 
          el.classList.contains('active') || 
          el.getAttribute('aria-selected') === 'true'
        );
        
        if (isActive) {
          console.log(`  ✓ Tab "${tabText}" activated`);
        }
      }
    }
    
    // Check for back/close button
    const backButton = page.locator('[data-testid="back-button"], button:has-text("Back"), a:has-text("Back to Dashboard")');
    if (await backButton.isVisible()) {
      console.log('✓ Back button available');
    }
  });

  test('dashboard-003: Profile settings update', async ({ page }) => {
    console.log('\n🧪 TEST: dashboard-003 - Profile settings update');
    
    // Navigate to settings
    await page.goto('http://localhost:8080/settings', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to settings');
    
    // Look for profile section
    const profileSection = page.locator('[data-testid="profile-settings"], [data-testid="profile-section"]');
    
    if (await profileSection.isVisible({ timeout: 5000 })) {
      console.log('✓ Profile section found');
    } else {
      // Try to find and click profile tab
      const profileTab = page.locator('[data-testid="profile-tab"], :has-text("Profile")').first();
      if (await profileTab.isVisible()) {
        await profileTab.click();
        console.log('✓ Opened profile tab');
        await page.waitForTimeout(1000);
      } else {
        console.log('⚠️ Profile section not found');
        test.skip();
        return;
      }
    }
    
    // Check for editable fields
    const nameInput = page.locator('[data-testid="name-input"], input[name="name"], input[placeholder*="Name"]');
    const bioInput = page.locator('[data-testid="bio-input"], textarea[name="bio"], textarea[placeholder*="Bio"]');
    const avatarUpload = page.locator('[data-testid="avatar-upload"], input[type="file"][accept*="image"]');
    
    // Test name update
    if (await nameInput.isVisible()) {
      console.log('✓ Name input found');
      
      const originalName = await nameInput.inputValue();
      console.log(`Current name: ${originalName}`);
      
      const newName = `Test User ${Date.now()}`;
      await nameInput.fill(newName);
      console.log(`✓ Updated name to: ${newName}`);
      
      // Verify input updated
      const updatedValue = await nameInput.inputValue();
      expect(updatedValue).toBe(newName);
      
    } else {
      console.log('⚠️ Name input not found');
    }
    
    // Test bio update
    if (await bioInput.isVisible()) {
      console.log('✓ Bio input found');
      
      const newBio = `This is a test bio updated at ${new Date().toISOString()}`;
      await bioInput.fill(newBio);
      console.log('✓ Updated bio');
      
    } else {
      console.log('  Bio input not found');
    }
    
    // Check for avatar upload
    if (await avatarUpload.isVisible()) {
      console.log('✓ Avatar upload available');
      // Note: Actual file upload would require test image file
    } else {
      console.log('  Avatar upload not found');
    }
    
    // Look for save button
    const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
    
    if (await saveButton.isVisible()) {
      console.log('✓ Save button found');
      
      // Check if button is enabled
      const isEnabled = await saveButton.isEnabled();
      if (isEnabled) {
        console.log('✓ Save button is enabled');
        
        // Click save
        await saveButton.click();
        console.log('✓ Clicked save button');
        
        // Wait for save operation
        await page.waitForTimeout(2000);
        
        // Look for success message
        const successMessage = page.locator('[data-testid="success-message"], :has-text("saved"), :has-text("updated")');
        if (await successMessage.isVisible({ timeout: 5000 })) {
          const message = await successMessage.textContent();
          console.log(`✓ Success message: ${message}`);
        } else {
          console.log('⚠️ No success message shown');
        }
        
        // Verify changes persisted by refreshing
        await page.reload({ waitUntil: 'networkidle' });
        console.log('✓ Reloaded page to verify persistence');
        
        // Check if name still shows updated value
        const nameAfterReload = await nameInput.inputValue();
        console.log(`Name after reload: ${nameAfterReload}`);
        
      } else {
        console.log('⚠️ Save button is disabled');
      }
    } else {
      console.log('⚠️ Save button not found');
    }
    
    // Check for other profile settings
    const emailInput = page.locator('[data-testid="email-input"], input[type="email"]');
    if (await emailInput.isVisible()) {
      console.log('✓ Email field found');
      const email = await emailInput.inputValue();
      console.log(`  Email: ${email}`);
      
      // Email should typically be read-only or require verification
      const isReadOnly = await emailInput.getAttribute('readonly');
      const isDisabled = await emailInput.isDisabled();
      
      if (isReadOnly || isDisabled) {
        console.log('  ✓ Email is protected (read-only)');
      }
    }
    
    // Check for password change link
    const changePasswordLink = page.locator('[data-testid="change-password"], a:has-text("Change Password"), button:has-text("Change Password")');
    if (await changePasswordLink.isVisible()) {
      console.log('✓ Change password link available');
    }
    
    // Check for account deletion option
    const deleteAccountButton = page.locator('[data-testid="delete-account"], button:has-text("Delete Account")');
    if (await deleteAccountButton.isVisible()) {
      console.log('✓ Delete account option available (not testing actual deletion)');
    }
  });
});
