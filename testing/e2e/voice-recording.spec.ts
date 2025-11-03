/**
 * REAL E2E Tests for Voice Recording
 * These tests will catch the actual bugs:
 * - Audio recording only captures one side
 * - Enhanced mode not working properly
 */

import { test, expect } from '@playwright/test';

test.describe('Voice Recording - REAL TESTS', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sanctuary page
    await page.goto('http://localhost:8080/sanctuary');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('voice-001: Standard recording captures microphone audio', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Start recording
    const startButton = page.locator('[data-testid="start-recording"]');
    await startButton.click();
    
    // Wait for recording to start
    await page.waitForSelector('[data-testid="recording-indicator"]');
    
    // Speak into microphone (simulate)
    await page.waitForTimeout(3000);
    
    // Stop recording
    const stopButton = page.locator('[data-testid="stop-recording"]');
    await stopButton.click();
    
    // Check that recording was saved
    await page.waitForSelector('[data-testid="recording-saved"]');
    
    // Navigate to archive
    await page.goto('http://localhost:8080/archive');
    
    // Check that latest recording exists
    const latestRecording = page.locator('[data-testid="recording-item"]').first();
    await expect(latestRecording).toBeVisible();
    
    // Play recording and verify audio exists
    await latestRecording.click();
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible();
    
    // Check audio duration > 0
    const duration = await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.duration);
    expect(duration).toBeGreaterThan(0);
  });

  test('voice-002: Enhanced mode captures BOTH user and AI audio', async ({ page, context }) => {
    // Grant permissions
    await context.grantPermissions(['microphone']);
    
    // Enable enhanced recording mode
    const enhancedToggle = page.locator('[data-testid="enhanced-recording-toggle"]');
    await enhancedToggle.click();
    
    // This should request screen share permission
    // Check if permission dialog appears
    const permissionPrompt = page.locator('text=/share.*screen/i');
    await expect(permissionPrompt).toBeVisible({ timeout: 5000 });
    
    // Start recording
    const startButton = page.locator('[data-testid="start-recording"]');
    await startButton.click();
    
    // Wait for AI to speak
    await page.waitForTimeout(5000);
    
    // Stop recording
    const stopButton = page.locator('[data-testid="stop-recording"]');
    await stopButton.click();
    
    // Check recording metadata
    await page.goto('http://localhost:8080/archive');
    const latestRecording = page.locator('[data-testid="recording-item"]').first();
    await latestRecording.click();
    
    // Verify recording has "enhanced" or "dual audio" indicator
    const enhancedBadge = page.locator('[data-testid="enhanced-recording-badge"]');
    await expect(enhancedBadge).toBeVisible();
    
    // THIS TEST WILL FAIL IF ONLY ONE SIDE IS RECORDED
    // Check audio waveform or metadata to confirm dual channels
    const audioInfo = page.locator('[data-testid="audio-info"]');
    const infoText = await audioInfo.textContent();
    expect(infoText).toContain('2 channels'); // Should be stereo with both tracks
  });

  test('voice-003: Audio playback works with transcript sync', async ({ page }) => {
    // Navigate to archive
    await page.goto('http://localhost:8080/archive');
    
    // Select first recording
    const recording = page.locator('[data-testid="recording-item"]').first();
    await recording.click();
    
    // Play audio
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();
    
    // Wait for audio to start
    await page.waitForTimeout(1000);
    
    // Check that transcript is visible
    const transcript = page.locator('[data-testid="transcript"]');
    await expect(transcript).toBeVisible();
    
    // Check that current word/phrase is highlighted
    const highlighted = page.locator('[data-testid="transcript-highlight"]');
    await expect(highlighted).toBeVisible();
    
    // Verify highlight moves as audio plays
    const firstHighlight = await highlighted.textContent();
    await page.waitForTimeout(2000);
    const secondHighlight = await highlighted.textContent();
    
    // Highlights should change as audio progresses
    expect(firstHighlight).not.toBe(secondHighlight);
  });
});
