import { supabase } from '@/integrations/supabase/client';

interface VoiceOptions {
  voiceId?: string;
  model?: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
  };
}

interface Voice {
  id: string;
  name: string;
  description: string;
}

// Top ElevenLabs voices with their IDs and distinct characteristics
export const VOICES: Voice[] = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm, conversational female voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear, professional female voice' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Deep, mature male voice' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Young, friendly male voice' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Gentle, nurturing female voice' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Energetic, youthful female voice' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'British, sophisticated male voice' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Calm, meditative unisex voice' },
];

class VoiceService {
  private currentAudio: HTMLAudioElement | null = null;
  private elevenLabsEnabled: boolean = false;
  private audioStreamCallbacks: ((audioElement: HTMLAudioElement) => void)[] = [];

  constructor() {
    console.log('✅ VoiceService initialized with Supabase client');
    this.elevenLabsEnabled = true;  // ✅ Force ElevenLabs always
    //this.testSupabaseConnection(); disabled by Rishi on 23 August 2025, skip this autocheck that resets it. 
  }

  private async testSupabaseConnection() {
    try {
      console.log('🧪 Running comprehensive diagnostic test...');
      
      // First, test our debug function to check secret access
      console.log('🔍 Testing secret access...');
      const { data: debugResults, error: debugError } = await supabase.functions.invoke('debug-secrets');
      
      if (debugError) {
        console.error('❌ Debug secrets test failed:', debugError);
      } else {
        console.log('🔐 Secret Debug Results:', debugResults);
        
        // If ElevenLabs key is still not found, there's a secret sync issue
        if (!debugResults?.elevenLabsKeyFound) {
          console.warn('🚨 ELEVENLABS_API_KEY not found in edge function environment!');
          console.warn('📋 Available API-related keys:', debugResults?.allApiKeys || 'none');
          console.warn('🔧 This suggests a secret synchronization issue between Supabase dashboard and edge functions');
          console.warn('💡 Try: 1) Wait 2-3 minutes for sync 2) Re-add the secret 3) Check secret name matches exactly');
        }
      }
      
      const { data: testResults, error: testError } = await supabase.functions.invoke('comprehensive-test');
      
      if (testError) {
        console.error('❌ Comprehensive test failed:', testError);
        console.log('ℹ️ Falling back to browser TTS');
        return;
      }

      console.log('📊 Comprehensive Test Results:');
      console.log(`✅ Passed: ${testResults.passed}/${testResults.totalTests} tests`);
      
      if (testResults.failed > 0) {
        console.log('❌ Failed tests:');
        testResults.results.filter(r => !r.success).forEach(result => {
          console.log(`  - ${result.step}: ${result.error}`);
        });
      }

      // Log detailed results for debugging
      testResults.results.forEach(result => {
        if (result.success) {
          console.log(`✅ ${result.step}:`, result.data);
        } else {
          console.error(`❌ ${result.step}:`, result.error);
        }
      });

      // Determine if ElevenLabs is working
      const elevenLabsWorking = testResults.results
        .filter(r => r.step.includes('ElevenLabs') || r.step.includes('TTS'))
        .every(r => r.success);

      if (elevenLabsWorking) {
        console.log('🎉 ElevenLabs fully functional! Re-enabling TTS...');
        this.elevenLabsEnabled = true;
      } else {
        console.log('⚠️ ElevenLabs issues detected. Using browser TTS fallback.');
        this.elevenLabsEnabled = false;
      }
      
    } catch (error) {
      console.error('💥 Could not run comprehensive test:', error);
      console.log('ℹ️ Defaulting to browser TTS');
      this.elevenLabsEnabled = false;
    }
  }

  private getVoiceSettings(voiceId: string) {
    // Different voice settings for more distinct character
    const voiceConfigs: { [key: string]: { stability: number; similarity_boost: number; style?: number; use_speaker_boost?: boolean } } = {
      '9BWtsMINqrJLrRacOk9x': { stability: 0.45, similarity_boost: 0.75, style: 0.2 }, // Aria - warm, expressive
      'EXAVITQu4vr4xnSDxMaL': { stability: 0.75, similarity_boost: 0.85, style: 0.0 }, // Sarah - professional, clear
      'CwhRBWXzGAHq8TQ4Fs17': { stability: 0.85, similarity_boost: 0.65, style: 0.1 }, // Roger - deep, authoritative
      'TX3LPaxmHKxFdv7VOQHJ': { stability: 0.35, similarity_boost: 0.80, style: 0.4 }, // Liam - young, energetic
      'XB0fDUnXU5powFXDhCwa': { stability: 0.65, similarity_boost: 0.90, style: 0.0 }, // Charlotte - gentle, stable
      'cgSgspJ2msm6clMCkdW9': { stability: 0.25, similarity_boost: 0.75, style: 0.5 }, // Jessica - energetic, varied
      'IKne3meq5aSn9XLyUdCD': { stability: 0.70, similarity_boost: 0.80, style: 0.2 }, // Charlie - British, refined
      'SAz9YHcvj6GT2YYXdXww': { stability: 0.80, similarity_boost: 0.70, style: 0.1 }, // River - calm, meditative
    };

    return voiceConfigs[voiceId] || { stability: 0.5, similarity_boost: 0.75, style: 0.2 };
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    // Stop any currently playing audio
    this.stop();
    console.log('🔊 SPEAK() function was called');
    console.log('🧪 Using speakWithElevenLabs...');
    // Force ElevenLabs TTS usage as requested by Rishi
    console.log('🎤 Forcing ElevenLabs TTS');
    return this.speakWithElevenLabs(text, options);
  }
    
  private async speakWithElevenLabs(text: string, options: VoiceOptions = {}): Promise<void> {
    try {
      const voiceId = options.voiceId || VOICES[0].id;
      const voiceSettings = options.voiceSettings || this.getVoiceSettings(voiceId);
      
      const requestPayload = {
        text,
        voiceId,
        model: options.model || 'eleven_turbo_v2_5',
        voiceSettings
      };

      console.log('🎤 Calling ElevenLabs TTS with voice:', VOICES.find(v => v.id === voiceId)?.name || 'Unknown');
      console.log('🔧 Voice settings:', voiceSettings);
      console.log('📤 Request payload:', requestPayload);

      // Call our Supabase edge function (auto-uses the correct project via the Supabase client)
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: requestPayload,
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(typeof error === 'string' ? error : 'Edge function call failed');
      }

      // Get the base64 audio data (function may return text or JSON)
      let base64Audio: string | undefined;
      if (typeof data === 'string') {
        base64Audio = data;
      } else if (data && typeof data === 'object' && 'audioContent' in data) {
        base64Audio = (data as any).audioContent;
      }

      console.log('🔍 Received audio data type:', typeof base64Audio);
      console.log('🔍 Audio data length:', base64Audio?.length ?? 0);
      
      if (!base64Audio || base64Audio.length === 0) {
        throw new Error('No audio data received from edge function');
      }

      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      
      console.log('🎵 Created audio blob, size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Audio blob is empty - no valid audio data received');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🔗 Created audio URL:', audioUrl);
      
      this.currentAudio = new Audio(audioUrl);
      
      // Add load event listener to check if audio loads properly
      this.currentAudio.addEventListener('loadstart', () => console.log('🎵 Audio loading started'));
      this.currentAudio.addEventListener('canplay', () => console.log('✅ Audio can play'));
      this.currentAudio.addEventListener('error', (e) => console.error('❌ Audio element error:', e));
      
      console.log('✅ Playing ElevenLabs audio');
      
      return new Promise((resolve, reject) => {
        if (this.currentAudio) {
          this.currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            console.log('🎤 ElevenLabs audio finished');
            resolve();
          };
          this.currentAudio.onerror = (e) => {
            console.error('❌ Audio playback error:', e);
            URL.revokeObjectURL(audioUrl);
            reject(new Error(`Audio playback failed: ${e instanceof Event ? e.type : 'unknown error'}`));
          };
          
          // CRITICAL: Notify callbacks BEFORE play() so they can capture with createMediaElementSource
          // createMediaElementSource can only be called on an audio element that hasn't started playing
          if (this.audioStreamCallbacks.length > 0) {
            console.log(`🎵 Notifying ${this.audioStreamCallbacks.length} callback(s) about new ElevenLabs audio element (BEFORE play)`);
            this.audioStreamCallbacks.forEach(callback => {
              try {
                console.log('📢 Calling audio stream callback with audio element');
                callback(this.currentAudio!);
                console.log('✅ Audio stream callback completed successfully');
              } catch (error) {
                console.error('❌ Audio stream callback error:', error);
                console.error('❌ Error details:', error);
              }
            });
          } else {
            console.warn('⚠️ No audio stream callbacks registered - recording may be microphone-only');
          }
          
          this.currentAudio.play().catch(reject);
        }
      });
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed:', error);
      throw error;
    }
  }


  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  isPlaying(): boolean {
    return this.currentAudio && !this.currentAudio.paused;
  }

  /**
   * Register a callback to be notified when ElevenLabs audio starts playing
   * This enables conversation recording services to capture the audio stream
   */
  onAudioElementCreated(callback: (audioElement: HTMLAudioElement) => void): void {
    this.audioStreamCallbacks.push(callback);
  }

  /**
   * Unregister an audio stream callback
   */
  offAudioElementCreated(callback: (audioElement: HTMLAudioElement) => void): void {
    const index = this.audioStreamCallbacks.indexOf(callback);
    if (index !== -1) {
      this.audioStreamCallbacks.splice(index, 1);
    }
  }
}

export const voiceService = new VoiceService();
export type { VoiceOptions, Voice };