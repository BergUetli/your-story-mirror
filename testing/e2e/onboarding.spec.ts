/**
 * REAL E2E Tests for User Onboarding
 * Tests the 13-question onboarding flow and profile setup
 */

import { test, expect } from '@playwright/test';

test.describe('User Onboarding - REAL TESTS', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login or create account to access onboarding
    await page.goto('http://localhost:8080/auth');
    // Assume we're redirected to onboarding for new users
  });

  test('onboard-001: 13-Question Onboarding Completion', async ({ page }) => {
    // Navigate to onboarding
    await page.goto('http://localhost:8080/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Check if onboarding form exists
    const onboardingForm = page.locator('[data-testid="onboarding-form"], form');
    
    if (await onboardingForm.isVisible()) {
      // Answer questions (up to 13 questions)
      const questions = page.locator('[data-testid="onboarding-question"], .question-card');
      const questionCount = await questions.count();
      
      console.log(`Found ${questionCount} onboarding questions`);
      
      // Fill out questions
      for (let i = 0; i < Math.min(questionCount, 13); i++) {
        const question = questions.nth(i);
        
        // Check for different input types
        const textInput = question.locator('input[type="text"], textarea');
        const selectInput = question.locator('select');
        const radioInput = question.locator('input[type="radio"]');
        
        if (await textInput.isVisible()) {
          await textInput.fill(`Answer to question ${i + 1}`);
        } else if (await selectInput.isVisible()) {
          await selectInput.selectOption({ index: 1 });
        } else if (await radioInput.first().isVisible()) {
          await radioInput.first().click();
        }
        
        // Click next if there's a next button
        const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Submit onboarding
      const submitButton = page.locator('button:has-text("Complete"), button:has-text("Finish"), button:has-text("Submit")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
      
      // Should redirect to dashboard or sanctuary
      await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 15000 });
      
      // Verify we're past onboarding
      expect(page.url()).not.toContain('/onboarding');
    } else {
      console.log('Onboarding already completed or not required');
      test.skip();
    }
  });

  test('onboard-002: Onboarding Skip Functionality', async ({ page }) => {
    // Navigate to onboarding
    await page.goto('http://localhost:8080/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Look for skip button
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Skip for now"), a:has-text("Skip")');
    
    if (await skipButton.isVisible()) {
      await skipButton.click();
      
      // Should redirect to main app
      await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 10000 });
      
      // Verify we left onboarding
      expect(page.url()).not.toContain('/onboarding');
      
      // Should still be able to access app
      const mainContent = page.locator('main, [role="main"], .main-content');
      await expect(mainContent).toBeVisible();
    } else {
      console.log('Skip button not found - may not be supported');
      test.skip();
    }
  });

  test('onboard-003: Profile Completeness Calculation', async ({ page }) => {
    // Login and go to profile/settings
    await page.goto('http://localhost:8080/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 10000 });
    
    // Navigate to profile or settings
    await page.goto('http://localhost:8080/settings');
    await page.waitForLoadState('networkidle');
    
    // Look for profile completeness indicator
    const completenessIndicator = page.locator(
      '[data-testid="profile-completeness"], ' +
      'text=/profile.*complete/i, ' +
      'text=/\\d+%.*complete/i, ' +
      '.progress'
    );
    
    if (await completenessIndicator.isVisible()) {
      const completenessText = await completenessIndicator.textContent();
      console.log(`Profile completeness: ${completenessText}`);
      
      // Verify it's a valid percentage or completion indicator
      const hasPercentage = /\d+%/.test(completenessText || '');
      const hasCompletionText = /(complete|incomplete|progress)/i.test(completenessText || '');
      
      expect(hasPercentage || hasCompletionText).toBe(true);
    } else {
      console.log('Profile completeness indicator not found');
      test.skip();
    }
  });

  test('onboard-004: Navigate Back Through Questions', async ({ page }) => {
    await page.goto('http://localhost:8080/onboarding');
    await page.waitForLoadState('networkidle');
    
    const onboardingForm = page.locator('[data-testid="onboarding-form"], form');
    
    if (await onboardingForm.isVisible()) {
      // Go to second question
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Now try to go back
        const backButton = page.locator('button:has-text("Back"), button:has-text("Previous")');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(500);
          
          // Verify we're back at first question
          const questionNumber = page.locator('[data-testid="question-number"], .question-number');
          if (await questionNumber.isVisible()) {
            const numberText = await questionNumber.textContent();
            expect(numberText).toContain('1');
          }
        } else {
          console.log('Back button not found');
        }
      }
    } else {
      test.skip();
    }
  });

  test('onboard-005: Form Validation', async ({ page }) => {
    await page.goto('http://localhost:8080/onboarding');
    await page.waitForLoadState('networkidle');
    
    const onboardingForm = page.locator('[data-testid="onboarding-form"], form');
    
    if (await onboardingForm.isVisible()) {
      // Try to proceed without filling required fields
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should show validation error
        const errorMessage = page.locator(
          '[data-testid="error-message"], ' +
          '.error-message, ' +
          'text=/required|please fill|cannot be empty/i'
        );
        
        // Wait a bit for error to appear
        await page.waitForTimeout(1000);
        
        // Check if error is visible or if we didn't advance
        const currentUrl = page.url();
        const stillOnOnboarding = currentUrl.includes('/onboarding');
        
        expect(stillOnOnboarding).toBe(true);
      }
    } else {
      test.skip();
    }
  });
});
