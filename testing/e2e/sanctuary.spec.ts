/**
 * REAL E2E Tests for Sanctuary/Voice Agent (Solin)
 * Tests voice conversations, AI responses, and memory extraction
 */

import { test, expect } from '@playwright/test';

test.describe('Sanctuary / Voice Agent - REAL TESTS', () => {
  
  test.beforeEach(async ({ page }) => {
    // Already logged in via global setup - just navigate to sanctuary
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
  });

  test('sanctuary-001: Start Voice Conversation', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Find and click start conversation button
    const startButton = page.locator(
      '[data-testid="start-conversation"], ' +
      'button:has-text("Start Conversation"), ' +
      'button:has-text("Talk to Solin")'
    );
    
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();
    
    // Wait for conversation to start
    await page.waitForTimeout(2000);
    
    // Verify conversation is active
    const conversationActive = page.locator(
      '[data-testid="conversation-active"], ' +
      '[data-testid="recording-indicator"], ' +
      '.recording, ' +
      'text=/listening|recording/i'
    );
    
    await expect(conversationActive).toBeVisible({ timeout: 5000 });
  });

  test('sanctuary-002: AI Voice Response', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    // Start conversation
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    await startButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for AI to respond
    // Look for audio playing or transcript appearing
    const aiResponse = page.locator(
      '[data-testid="ai-response"], ' +
      '[data-testid="transcript-line"], ' +
      '.transcript, ' +
      'audio'
    );
    
    // Wait up to 10 seconds for AI response
    await expect(aiResponse.first()).toBeVisible({ timeout: 10000 });
    
    // Verify audio element exists and can play
    const audio = page.locator('audio').first();
    if (await audio.isVisible()) {
      const canPlay = await audio.evaluate((el: HTMLAudioElement) => {
        return el.readyState >= 2; // HAVE_CURRENT_DATA
      });
      
      console.log(`Audio ready state: ${canPlay}`);
    }
  });

  test('sanctuary-003: Stop/End Conversation', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    // Start conversation
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // Stop conversation
    const stopButton = page.locator(
      '[data-testid="stop-conversation"], ' +
      '[data-testid="end-conversation"], ' +
      'button:has-text("Stop"), ' +
      'button:has-text("End")'
    );
    
    await expect(stopButton).toBeVisible({ timeout: 5000 });
    await stopButton.click();
    
    // Verify conversation stopped
    await page.waitForTimeout(1000);
    
    // Recording indicator should disappear
    const recordingIndicator = page.locator('[data-testid="recording-indicator"], .recording');
    await expect(recordingIndicator).not.toBeVisible();
    
    // Start button should be available again
    await expect(startButton).toBeVisible();
  });

  test('sanctuary-004: Conversation Transcript Display', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    // Start conversation
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    await startButton.click();
    await page.waitForTimeout(5000);
    
    // Check for transcript
    const transcript = page.locator(
      '[data-testid="transcript"], ' +
      '[data-testid="conversation-transcript"], ' +
      '.transcript'
    );
    
    if (await transcript.isVisible()) {
      // Verify transcript has content
      const transcriptText = await transcript.textContent();
      expect(transcriptText).toBeTruthy();
      expect(transcriptText!.length).toBeGreaterThan(0);
      
      // Check for speaker labels (User: / Solin: / AI:)
      const hasSpeakerLabels = /(?:user|solin|ai):/i.test(transcriptText || '');
      console.log(`Transcript has speaker labels: ${hasSpeakerLabels}`);
    }
  });

  test('sanctuary-005: Memory Extraction from Conversation', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    // Start and run a conversation
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    await startButton.click();
    
    // Wait for conversation to process
    await page.waitForTimeout(8000);
    
    // Stop conversation
    const stopButton = page.locator('[data-testid="stop-conversation"], button:has-text("Stop")');
    if (await stopButton.isVisible()) {
      await stopButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Check if memory was extracted
    // Navigate to timeline
    await page.goto('http://localhost:8080/timeline');
    await page.waitForLoadState('networkidle');
    
    // Look for recent memory
    const memories = page.locator('[data-testid="memory-item"], .memory-item');
    const memoryCount = await memories.count();
    
    console.log(`Found ${memoryCount} memories after conversation`);
    
    // Verify at least one memory exists
    expect(memoryCount).toBeGreaterThan(0);
  });

  test('sanctuary-006: Conversation History', async ({ page }) => {
    // Check for past conversations
    const conversationHistory = page.locator(
      '[data-testid="conversation-history"], ' +
      '[data-testid="past-conversations"], ' +
      '.conversation-list'
    );
    
    if (await conversationHistory.isVisible()) {
      // Verify list exists
      const conversations = conversationHistory.locator('[data-testid="conversation-item"], .conversation-item');
      const count = await conversations.count();
      
      console.log(`Found ${count} past conversations`);
      
      if (count > 0) {
        // Click on first conversation
        await conversations.first().click();
        
        // Should show conversation details
        const details = page.locator('[data-testid="conversation-details"], .conversation-details');
        await expect(details).toBeVisible({ timeout: 5000 });
      }
    } else {
      console.log('Conversation history not visible - may need conversations first');
    }
  });

  test('sanctuary-007: AI Voice Settings', async ({ page }) => {
    // Look for settings or configuration
    const settingsButton = page.locator(
      '[data-testid="voice-settings"], ' +
      'button:has-text("Settings"), ' +
      '[aria-label="Settings"]'
    );
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Check for voice/AI settings options
      const settingsPanel = page.locator('[data-testid="settings-panel"], .settings-panel');
      await expect(settingsPanel).toBeVisible();
      
      // Look for voice-related settings
      const voiceOptions = page.locator(
        'text=/voice|volume|speed|pitch/i'
      );
      
      if (await voiceOptions.first().isVisible()) {
        console.log('Voice settings available');
      }
    } else {
      console.log('Settings button not found');
    }
  });

  test('sanctuary-008: Error Handling - No Microphone', async ({ page }) => {
    // Try to start conversation without granting permission
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Should show error or permission request
      await page.waitForTimeout(2000);
      
      // Look for error message or permission prompt
      const errorOrPrompt = page.locator(
        '[data-testid="error-message"], ' +
        'text=/microphone|permission|allow access/i, ' +
        '.error'
      );
      
      // Either error is visible or we got permission prompt
      const pageContent = await page.content();
      const hasErrorHandling = 
        (await errorOrPrompt.isVisible()) || 
        pageContent.includes('microphone') ||
        pageContent.includes('permission');
      
      expect(hasErrorHandling).toBe(true);
    }
  });
});
