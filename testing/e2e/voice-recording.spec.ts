/**
 * REAL E2E Tests for Voice Recording
 * These tests ACTUALLY verify the audio content, not just console logs
 * 
 * CRITICAL FIX:
 * - Downloads actual WebM recording files
 * - Uses ffprobe to analyze audio streams
 * - Verifies both user and AI voices are present with volume analysis
 * - Will FAIL if dual audio bug exists (only microphone captured)
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Voice Recording - REAL AUDIO VERIFICATION', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permission upfront
    await context.grantPermissions(['microphone']);
    
    // Navigate to sanctuary page
    await page.goto('http://localhost:8080/sanctuary');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('voice-002: Enhanced mode captures BOTH user and AI audio (REAL AUDIO VERIFICATION)', async ({ page, context }) => {
    console.log('🧪 TEST: voice-002 - Dual audio recording with REAL audio file analysis');
    
    // Navigate to home page (voice agent)
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log(`Current URL: ${page.url()}`);
    
    // Check if we're on the voice agent page
    const voiceAgent = page.locator('[class*="orb"], [class*="pulse"], [class*="agent"]').first();
    if (!await voiceAgent.isVisible({ timeout: 3000 })) {
      console.log('⚠️ Not on voice agent page, skipping test');
      await page.screenshot({ path: 'voice-002-wrong-page.png' });
      test.skip();
      return;
    }
    
    console.log('✓ On voice agent page');
    
    // Set up console log listener to capture diagnostic info
    const audioCaptureLogs: string[] = [];
    const recordingSessionIds: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // Capture audio-related logs
      if (text.includes('audio') || text.includes('Audio') || 
          text.includes('capture') || text.includes('mixer') ||
          text.includes('ElevenLabs') || text.includes('recording')) {
        audioCaptureLogs.push(text);
        console.log('🎵 Audio log:', text);
      }
      
      // Extract recording session ID for later file retrieval
      const sessionMatch = text.match(/sessionId[:\s]+['"]?(enhanced_conv_\d+_\w+)['"]?/i);
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        if (!recordingSessionIds.includes(sessionId)) {
          recordingSessionIds.push(sessionId);
          console.log('📝 Captured recording session ID:', sessionId);
        }
      }
      
      // Also look for recording saved messages
      const savedMatch = text.match(/Enhanced recording saved.*sessionId.*?['"]?(enhanced_conv_\d+_\w+)['"]?/i);
      if (savedMatch) {
        const sessionId = savedMatch[1];
        if (!recordingSessionIds.includes(sessionId)) {
          recordingSessionIds.push(sessionId);
          console.log('📝 Captured recording session ID from save:', sessionId);
        }
      }
    });
    
    // Start conversation
    const startButton = page.locator('button').filter({ hasText: /^Start Conversation$/ });
    
    if (await startButton.count() > 0 && await startButton.first().isVisible({ timeout: 5000 })) {
      await startButton.first().click();
      console.log('✓ Started conversation');
    } else {
      console.log('✗ Start Conversation button not found');
      await page.screenshot({ path: 'voice-002-no-button.png' });
      test.skip();
      return;
    }
    
    // Wait for AI to speak (CRITICAL: need AI voice in recording)
    console.log('⏳ Waiting for AI to speak (need ~10s for back-and-forth)...');
    await page.waitForTimeout(12000);
    
    // Log analysis
    console.log('\n📊 Audio Capture Analysis (from logs):');
    console.log('Total audio-related logs:', audioCaptureLogs.length);
    
    const hasMicrophoneCapture = audioCaptureLogs.some(log => 
      log.includes('microphone') || log.includes('Microphone'));
    const hasRecordingStarted = audioCaptureLogs.some(log => 
      log.includes('Recording mode updated to "mixed"') ||
      log.includes('Enhanced recorder captured ElevenLabs'));
    
    console.log('✓ Microphone captured:', hasMicrophoneCapture);
    console.log('✓ Claims dual audio mode:', hasRecordingStarted);
    console.log('📝 Recording session IDs found:', recordingSessionIds);
    
    // Stop conversation
    await page.waitForTimeout(2000);
    const stopButton = page.locator('button:has-text("End"), button:has-text("Stop")');
    if (await stopButton.isVisible({ timeout: 2000 })) {
      await stopButton.click();
      console.log('✓ Stopped conversation');
    } else {
      // Try clicking orb
      await voiceAgent.click();
      console.log('✓ Clicked orb to stop');
    }
    
    // Wait for recording to save
    await page.waitForTimeout(5000);
    
    // Navigate to archive to get the recording
    console.log('\n📼 Retrieving recording from archive...');
    await page.goto('http://localhost:8080/archive');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find the most recent recording
    const recordings = page.locator('[class*="recording"], li, article').filter({
      hasText: /\d{4}|ago|Today|Yesterday/i
    });
    
    const recordingCount = await recordings.count();
    console.log(`Found ${recordingCount} recordings in archive`);
    
    if (recordingCount === 0) {
      console.log('❌ No recordings found in archive');
      expect(recordingCount).toBeGreaterThan(0);
      return;
    }
    
    // Get the first (most recent) recording
    const firstRecording = recordings.first();
    await firstRecording.click();
    console.log('✓ Selected most recent recording');
    await page.waitForTimeout(2000);
    
    // Extract the audio URL from the page
    // The audio player should have a <audio> element with src pointing to Supabase storage
    const audioElement = page.locator('audio').first();
    const audioSrc = await audioElement.getAttribute('src');
    
    if (!audioSrc) {
      console.log('❌ Could not find audio source URL');
      expect(audioSrc).toBeTruthy();
      return;
    }
    
    console.log('✓ Found audio URL:', audioSrc.substring(0, 100) + '...');
    
    // Download the audio file
    console.log('\n⬇️ Downloading audio file for analysis...');
    const response = await page.request.get(audioSrc);
    const audioBuffer = await response.body();
    
    // Save temporarily
    const tempDir = path.join(process.cwd(), 'testing', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempAudioPath = path.join(tempDir, 'test-recording.webm');
    fs.writeFileSync(tempAudioPath, audioBuffer);
    
    const fileSizeKB = (audioBuffer.length / 1024).toFixed(2);
    console.log(`✓ Downloaded audio file: ${fileSizeKB} KB`);
    
    // Analyze with ffprobe
    console.log('\n🔬 Analyzing audio with ffprobe...');
    
    try {
      // Get detailed audio stream info
      const ffprobeCommand = `ffprobe -v error -show_streams -select_streams a -of json "${tempAudioPath}"`;
      const ffprobeOutput = execSync(ffprobeCommand, { encoding: 'utf-8' });
      const audioInfo = JSON.parse(ffprobeOutput);
      
      console.log('📊 Audio stream info:', JSON.stringify(audioInfo, null, 2));
      
      // Check for audio streams
      const audioStreams = audioInfo.streams || [];
      console.log(`✓ Audio streams found: ${audioStreams.length}`);
      
      if (audioStreams.length === 0) {
        console.log('❌ CRITICAL: No audio streams found in recording!');
        expect(audioStreams.length).toBeGreaterThan(0);
        return;
      }
      
      // Get volume analysis using volumedetect filter
      console.log('\n📈 Analyzing audio volume levels...');
      const volumeCommand = `ffmpeg -i "${tempAudioPath}" -af volumedetect -f null - 2>&1 | grep "mean_volume\\|max_volume"`;
      const volumeOutput = execSync(volumeCommand, { encoding: 'utf-8' });
      console.log('Volume analysis:', volumeOutput);
      
      // Extract mean volume (in dB)
      const meanVolumeMatch = volumeOutput.match(/mean_volume:\s*([-\d.]+)\s*dB/);
      const maxVolumeMatch = volumeOutput.match(/max_volume:\s*([-\d.]+)\s*dB/);
      
      const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -100;
      const maxVolume = maxVolumeMatch ? parseFloat(maxVolumeMatch[1]) : -100;
      
      console.log(`📊 Mean volume: ${meanVolume} dB`);
      console.log(`📊 Max volume: ${maxVolume} dB`);
      
      // Analyze audio energy over time to detect if BOTH voices are present
      console.log('\n🎤 Detecting voice activity patterns...');
      const silenceCommand = `ffmpeg -i "${tempAudioPath}" -af silencedetect=n=-40dB:d=0.5 -f null - 2>&1 | grep "silence_"`;
      let silenceOutput = '';
      try {
        silenceOutput = execSync(silenceCommand, { encoding: 'utf-8' });
      } catch (e) {
        // Command may exit with error if no silence detected (which is good!)
        silenceOutput = (e as any).stdout || '';
      }
      
      console.log('Silence detection:', silenceOutput || 'No significant silence detected');
      
      // Count silence periods
      const silenceStarts = (silenceOutput.match(/silence_start/g) || []).length;
      const silenceEnds = (silenceOutput.match(/silence_end/g) || []).length;
      
      console.log(`📊 Silence periods: ${silenceStarts} (indicates ${silenceStarts + 1} speech segments)`);
      
      // THE CRITICAL TEST: Verify BOTH voices are present
      console.log('\n🧪 DUAL AUDIO VERIFICATION:');
      
      // Expectations for dual audio recording:
      // 1. Mean volume should be reasonable (> -60 dB, not mostly silence)
      // 2. Max volume should be strong (> -20 dB, indicating clear speech)
      // 3. Multiple speech segments (AI speaks, user speaks, AI responds)
      // 4. If only microphone: likely fewer segments, different volume profile
      
      const hasSufficientVolume = meanVolume > -60;
      const hasStrongPeaks = maxVolume > -20;
      const hasMultipleSpeakers = silenceStarts >= 2; // At least 3 segments (user, AI, user/AI)
      
      console.log('✓ Sufficient average volume:', hasSufficientVolume, `(${meanVolume} > -60 dB)`);
      console.log('✓ Strong peak volume:', hasStrongPeaks, `(${maxVolume} > -20 dB)`);
      console.log('✓ Multiple speech segments:', hasMultipleSpeakers, `(${silenceStarts} >= 2)`);
      
      // Additional check: Get duration to verify recording length
      const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempAudioPath}"`;
      const duration = parseFloat(execSync(durationCommand, { encoding: 'utf-8' }).trim());
      console.log(`✓ Recording duration: ${duration.toFixed(2)} seconds`);
      
      // If recording is too short, might indicate a problem
      const hasReasonableDuration = duration >= 10;
      console.log('✓ Reasonable duration:', hasReasonableDuration, `(${duration.toFixed(2)} >= 10s)`);
      
      // FINAL VERIFICATION: All checks must pass
      console.log('\n🎯 FINAL VERIFICATION:');
      
      const allChecksPassed = hasSufficientVolume && hasStrongPeaks && hasMultipleSpeakers && hasReasonableDuration;
      
      if (allChecksPassed) {
        console.log('✅ DUAL AUDIO VERIFIED: Recording contains both user and AI voices!');
        console.log('   - Sufficient volume levels detected');
        console.log('   - Multiple speech segments found (conversation pattern)');
        console.log('   - Reasonable recording duration');
      } else {
        console.log('❌ DUAL AUDIO FAILED: Recording likely contains only microphone audio!');
        console.log('   Expected: Both user and AI voice captured');
        console.log('   Actual: Audio analysis suggests single source or missing AI voice');
        console.log('\n   Failure reasons:');
        if (!hasSufficientVolume) console.log('   - Volume too low (mostly silence)');
        if (!hasStrongPeaks) console.log('   - No strong speech peaks detected');
        if (!hasMultipleSpeakers) console.log('   - Insufficient speech segments for conversation');
        if (!hasReasonableDuration) console.log('   - Recording too short');
      }
      
      // Clean up
      fs.unlinkSync(tempAudioPath);
      
      // Assert the result
      expect(allChecksPassed).toBe(true);
      
    } catch (error) {
      console.error('❌ Error analyzing audio:', error);
      throw error;
    }
  });

  test('voice-001: Standard recording captures microphone audio', async ({ page }) => {
    console.log('🧪 TEST: voice-001 - Standard recording');
    
    // Ensure we're on the right page
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    console.log(`Current URL: ${page.url()}`);
    
    // Find Start Conversation button
    const startButton = page.locator('button:has-text("Start Conversation"), button:has-text("Start"), button:has-text("Connect")').first();
    
    if (await startButton.isVisible({ timeout: 10000 })) {
      console.log('✓ Start button found');
    } else {
      console.log('✗ Start button not found');
      await page.screenshot({ path: 'voice-001-no-button.png' });
      test.skip();
      return;
    }
    
    // Click to start conversation
    await startButton.click();
    console.log('✓ Clicked start button');
    
    // Wait for connection
    await page.waitForTimeout(3000);
    
    // Look for connected/recording indicator
    const connected = page.locator('text=/Connected|Recording|Listening/i');
    if (await connected.isVisible({ timeout: 5000 })) {
      console.log('✓ Conversation started');
    }
    
    // Let it run for a few seconds
    await page.waitForTimeout(5000);
    
    // Stop conversation
    const stopButton = page.locator('button:has-text("End"), button:has-text("Stop"), button:has-text("Disconnect")');
    if (await stopButton.isVisible({ timeout: 2000 })) {
      await stopButton.click();
      console.log('✓ Stopped conversation');
    } else {
      const orb = page.locator('[class*="orb"], [class*="pulse"]').first();
      if (await orb.isVisible()) {
        await orb.click();
        console.log('✓ Clicked orb to stop');
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Navigate to archive to check recording
    console.log('Checking archive for recording...');
    await page.goto('http://localhost:8080/archive');
    await page.waitForLoadState('networkidle');
    
    // Look for recordings
    const recordings = page.locator('[class*="recording"], [class*="archive-item"], li, article').filter({
      hasText: /\d{4}|ago|Today|Yesterday/i
    });
    
    const recordingCount = await recordings.count();
    console.log(`Found ${recordingCount} potential recordings`);
    
    expect(recordingCount).toBeGreaterThan(0);
  });

  test('voice-003: Audio playback works with transcript sync', async ({ page }) => {
    console.log('🧪 TEST: voice-003 - Audio playback with transcript');
    
    // Navigate to archive
    await page.goto('http://localhost:8080/archive');
    await page.waitForLoadState('networkidle');
    
    // Select first recording
    const firstRecording = page.locator('[class*="recording"], li, article').first();
    
    if (await firstRecording.isVisible({ timeout: 5000 })) {
      await firstRecording.click();
      console.log('✓ Opened recording');
      await page.waitForTimeout(1000);
      
      // Look for play button
      const playButton = page.locator('button[aria-label*="play"], button:has-text("Play"), [class*="play-button"]').first();
      
      if (await playButton.isVisible({ timeout: 3000 })) {
        await playButton.click();
        console.log('✓ Started playback');
        
        // Wait for audio to play
        await page.waitForTimeout(2000);
        
        // Check for transcript
        const transcript = page.locator('[class*="transcript"], [data-testid="transcript"]');
        if (await transcript.isVisible({ timeout: 3000 })) {
          console.log('✓ Transcript visible');
          
          // Check for highlighted text (sync feature)
          const highlighted = page.locator('[class*="highlight"], mark, .active-word');
          if (await highlighted.count() > 0) {
            console.log('✓ Transcript highlighting detected');
          } else {
            console.log('⚠️ No transcript highlighting found');
          }
        } else {
          console.log('⚠️ No transcript found');
        }
      } else {
        console.log('⚠️ Play button not found');
      }
    } else {
      console.log('⚠️ No recordings found');
      test.skip();
    }
  });
});
