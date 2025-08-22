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
      
      const requestBody = {
        text,
        voiceId,
        model: options.model || 'eleven_turbo_v2_5',
        voiceSettings
      };

      console.log('🎤 Calling ElevenLabs TTS with voice:', VOICES.find(v => v.id === voiceId)?.name || 'Unknown');
      console.log('🔧 Voice settings:', voiceSettings);

      const response = await supabase.functions.invoke('elevenlabs-tts', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Supabase function response:', {
        error: response.error,
        dataType: typeof response.data,
        dataSize: response.data instanceof Blob ? response.data.size : (typeof response.data === 'string' ? response.data.length : 'unknown'),
        dataPreview: typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : 'not string'
      });

      if (response.error) {
        console.error('❌ ElevenLabs TTS error:', response.error);
        throw response.error;
      }

      // The response.data should be the binary audio data
      const audioData = response.data;
      
      if (!audioData) {
        throw new Error('No audio data received');
      }

      console.log('🔍 Audio data type received:', typeof audioData);

      // Handle the audio response properly - Supabase functions can return binary data in different formats
      let audioBlob: Blob;
      
      if (audioData instanceof Blob) {
        audioBlob = audioData;
        console.log('✅ Using audio data as Blob');
      } else if (audioData instanceof ArrayBuffer) {
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        console.log('✅ Converted ArrayBuffer to Blob');
      } else if (typeof audioData === 'string') {
        // If data comes as base64 string, decode it
        console.log('🔄 Converting base64 string to Blob');
        try {
          const binaryString = atob(audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        } catch (e) {
          console.error('❌ Failed to decode base64 audio data:', e);
          throw new Error('Invalid audio data format received');
        }
      } else {
        // Handle other formats if needed
        console.log('🔄 Converting unknown data type to Blob');
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      }
      
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
            console.error('❌ Audio playback error details:', {
              error: e,
              currentTime: this.currentAudio?.currentTime,
              duration: this.currentAudio?.duration,
              readyState: this.currentAudio?.readyState,
              networkState: this.currentAudio?.networkState,
              src: this.currentAudio?.src
            });
            URL.revokeObjectURL(audioUrl);
            reject(new Error(`Audio playback failed: ${(e as Event).type || 'unknown error'}`));
          };
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
}

export const voiceService = new VoiceService();
export type { VoiceOptions, Voice };