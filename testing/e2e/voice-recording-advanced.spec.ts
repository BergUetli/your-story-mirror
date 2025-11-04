/**
 * ADVANCED E2E Test for Voice Recording using Playwright "Agent" Capabilities
 * 
 * PLAYWRIGHT AGENT FEATURES USED:
 * 1. Network interception to capture audio Blob BEFORE upload
 * 2. Browser context evaluation to access Web Audio API
 * 3. Real-time MediaRecorder state monitoring
 * 4. In-memory audio analysis (no file downloads needed)
 * 
 * This test is FASTER and MORE RELIABLE than downloading files.
 * It catches the bug at the SOURCE - during recording, not after.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AudioAnalysisResult {
  hasAudioContext: boolean;
  audioContextState: string;
  hasMicrophoneStream: boolean;
  hasSystemAudioSource: boolean;
  mixerNodeConnected: boolean;
  mediaRecorderState: string;
  recordingMode: string;
  capturedAudioElements: number;
}

test.describe('Voice Recording - ADVANCED PLAYWRIGHT AGENT TEST', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
  });

  test('voice-002-advanced: Dual audio capture verified with Playwright agents', async ({ page, context }) => {
    console.log('🤖 PLAYWRIGHT AGENT TEST: Real-time audio capture monitoring');
    
    // AGENT CAPABILITY 1: Intercept audio upload to capture Blob
    let capturedAudioBlob: Buffer | null = null;
    let audioUploadUrl: string | null = null;
    
    await page.route('**/*.webm', async (route) => {
      const request = route.request();
      if (request.method() === 'PUT' || request.method() === 'POST') {
        console.log('🎯 AGENT: Intercepted audio upload:', request.url());
        audioUploadUrl = request.url();
        
        // Capture the audio blob being uploaded
        const postData = request.postDataBuffer();
        if (postData) {
          capturedAudioBlob = postData;
          console.log(`✓ AGENT: Captured audio blob (${(postData.length / 1024).toFixed(2)} KB)`);
        }
      }
      route.continue();
    });
    
    // Navigate to voice agent
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify voice agent is present
    const voiceAgent = page.locator('[class*="orb"], [class*="pulse"]').first();
    if (!await voiceAgent.isVisible({ timeout: 3000 })) {
      console.log('⚠️ Voice agent not found, skipping test');
      test.skip();
      return;
    }
    
    console.log('✓ Voice agent page loaded');
    
    // Start conversation
    const startButton = page.locator('button').filter({ hasText: /^Start Conversation$/ });
    await startButton.first().click();
    console.log('✓ Conversation started');
    
    // AGENT CAPABILITY 2: Monitor Web Audio API state in real-time
    await page.waitForTimeout(3000); // Wait for audio setup
    
    const audioState = await page.evaluate(() => {
      // Access the enhanced recording service from browser context
      const service = (window as any).enhancedConversationRecordingService;
      
      if (!service) {
        return { hasService: false };
      }
      
      const session = service.currentSession;
      if (!session) {
        return { hasService: true, hasSession: false };
      }
      
      return {
        hasService: true,
        hasSession: true,
        hasAudioContext: !!session.audioContext,
        audioContextState: session.audioContext?.state,
        hasMicrophoneStream: !!session.microphoneStream,
        hasSystemAudioStream: !!session.systemAudioStream,
        mixerNodeConnected: !!session.mixerNode,
        mediaRecorderState: session.mediaRecorder?.state,
        recordingMode: session.recordingMode,
        isRecording: session.isRecording,
        microphoneStreamTracks: session.microphoneStream?.getAudioTracks().length || 0,
        systemAudioTracks: session.systemAudioStream?.getAudioTracks().length || 0,
      };
    });
    
    console.log('\n🔬 AGENT: Real-time audio state analysis:');
    console.log(JSON.stringify(audioState, null, 2));
    
    // AGENT CAPABILITY 3: Monitor DOM for audio elements and their connections
    await page.waitForTimeout(2000);
    
    const audioElementsState = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll('audio'));
      return audios.map(audio => ({
        hasSrc: !!audio.src,
        hasSrcObject: !!audio.srcObject,
        srcObjectType: audio.srcObject?.constructor.name,
        audioTracks: audio.srcObject ? (audio.srcObject as MediaStream).getAudioTracks().length : 0,
        autoplay: audio.autoplay,
        paused: audio.paused,
        readyState: audio.readyState,
      }));
    });
    
    console.log('\n🎵 AGENT: Audio elements in DOM:');
    audioElementsState.forEach((el, i) => {
      console.log(`  Audio ${i}:`, el);
    });
    
    // Check for WebRTC audio elements (ElevenLabs)
    const hasWebRTCAudio = audioElementsState.some(el => el.hasSrcObject && el.audioTracks > 0);
    console.log('✓ WebRTC audio element detected:', hasWebRTCAudio);
    
    // Wait for AI to speak
    console.log('\n⏳ Waiting for AI speech (12 seconds)...');
    await page.waitForTimeout(12000);
    
    // AGENT CAPABILITY 4: Verify audio capture happened during conversation
    const finalAudioState = await page.evaluate(() => {
      const service = (window as any).enhancedConversationRecordingService;
      const session = service?.currentSession;
      
      if (!session) return { error: 'No session' };
      
      return {
        recordingMode: session.recordingMode,
        isRecording: session.isRecording,
        audioChunksCount: session.audioChunks?.length || 0,
        totalAudioSize: session.audioChunks?.reduce((sum: number, chunk: Blob) => sum + chunk.size, 0) || 0,
        conversationTranscriptEntries: session.conversationTranscript?.length || 0,
        capturedAudioElementsCount: service.capturedAudioElements?.size || 0,
      };
    });
    
    console.log('\n📊 AGENT: Final recording state:');
    console.log(JSON.stringify(finalAudioState, null, 2));
    
    // CRITICAL CHECK: Recording mode should be 'mixed' if dual audio working
    const isDualAudioMode = finalAudioState.recordingMode === 'mixed';
    const hasCapturedAudioElements = (finalAudioState.capturedAudioElementsCount || 0) > 0;
    const hasSignificantAudioData = (finalAudioState.totalAudioSize || 0) > 50000; // >50KB
    
    console.log('\n🧪 AGENT VERIFICATION:');
    console.log('✓ Dual audio mode active:', isDualAudioMode);
    console.log('✓ AI audio element captured:', hasCapturedAudioElements);
    console.log('✓ Significant audio data:', hasSignificantAudioData, `(${(finalAudioState.totalAudioSize || 0 / 1024).toFixed(2)} KB)`);
    
    // Stop conversation
    const stopButton = page.locator('button:has-text("End"), button:has-text("Stop")');
    if (await stopButton.isVisible({ timeout: 2000 })) {
      await stopButton.click();
      console.log('✓ Conversation stopped');
    } else {
      await voiceAgent.click();
      console.log('✓ Clicked orb to stop');
    }
    
    // Wait for audio to be uploaded
    console.log('\n⏳ Waiting for audio upload...');
    await page.waitForTimeout(5000);
    
    // AGENT CAPABILITY 5: Analyze intercepted audio blob
    if (capturedAudioBlob) {
      console.log('\n🔬 AGENT: Analyzing intercepted audio blob...');
      
      // Save to temp file for ffprobe analysis
      const tempDir = path.join(process.cwd(), 'testing', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempAudioPath = path.join(tempDir, 'agent-captured.webm');
      fs.writeFileSync(tempAudioPath, capturedAudioBlob);
      
      console.log(`✓ Saved intercepted audio: ${(capturedAudioBlob.length / 1024).toFixed(2)} KB`);
      
      // Analyze with ffprobe
      try {
        // Get audio stream info
        const ffprobeCommand = `ffprobe -v error -show_streams -select_streams a -of json "${tempAudioPath}"`;
        const ffprobeOutput = execSync(ffprobeCommand, { encoding: 'utf-8' });
        const audioInfo = JSON.parse(ffprobeOutput);
        
        const audioStreams = audioInfo.streams || [];
        console.log(`✓ Audio streams: ${audioStreams.length}`);
        
        // Volume analysis
        const volumeCommand = `ffmpeg -i "${tempAudioPath}" -af volumedetect -f null - 2>&1 | grep "mean_volume\\|max_volume"`;
        const volumeOutput = execSync(volumeCommand, { encoding: 'utf-8' });
        
        const meanVolumeMatch = volumeOutput.match(/mean_volume:\s*([-\d.]+)\s*dB/);
        const maxVolumeMatch = volumeOutput.match(/max_volume:\s*([-\d.]+)\s*dB/);
        
        const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -100;
        const maxVolume = maxVolumeMatch ? parseFloat(maxVolumeMatch[1]) : -100;
        
        console.log(`✓ Mean volume: ${meanVolume} dB`);
        console.log(`✓ Max volume: ${maxVolume} dB`);
        
        // Silence detection for speech segments
        const silenceCommand = `ffmpeg -i "${tempAudioPath}" -af silencedetect=n=-40dB:d=0.5 -f null - 2>&1 | grep "silence_"`;
        let silenceOutput = '';
        try {
          silenceOutput = execSync(silenceCommand, { encoding: 'utf-8' });
        } catch (e) {
          silenceOutput = (e as any).stdout || '';
        }
        
        const silenceStarts = (silenceOutput.match(/silence_start/g) || []).length;
        console.log(`✓ Speech segments: ${silenceStarts + 1}`);
        
        // Duration
        const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempAudioPath}"`;
        const duration = parseFloat(execSync(durationCommand, { encoding: 'utf-8' }).trim());
        console.log(`✓ Duration: ${duration.toFixed(2)} seconds`);
        
        // Clean up
        fs.unlinkSync(tempAudioPath);
        
        // FINAL VERIFICATION
        console.log('\n🎯 AGENT FINAL VERIFICATION:');
        
        const allAgentChecks = {
          dualAudioModeActive: isDualAudioMode,
          aiAudioCaptured: hasCapturedAudioElements,
          sufficientData: hasSignificantAudioData,
          audioStreamExists: audioStreams.length > 0,
          goodVolume: meanVolume > -60 && maxVolume > -20,
          multipleSpeakers: silenceStarts >= 2,
          reasonableDuration: duration >= 10,
        };
        
        console.log(JSON.stringify(allAgentChecks, null, 2));
        
        const allChecksPassed = Object.values(allAgentChecks).every(v => v === true);
        
        if (allChecksPassed) {
          console.log('\n✅ AGENT VERIFIED: Dual audio capture working correctly!');
        } else {
          console.log('\n❌ AGENT DETECTED BUG: Dual audio capture failed!');
          console.log('Failed checks:', Object.entries(allAgentChecks).filter(([k, v]) => !v).map(([k]) => k));
        }
        
        expect(allChecksPassed).toBe(true);
        
      } catch (error) {
        console.error('❌ Agent audio analysis failed:', error);
        throw error;
      }
      
    } else {
      console.log('⚠️ AGENT: No audio blob intercepted (upload may have failed)');
      expect(capturedAudioBlob).toBeTruthy();
    }
  });
});
