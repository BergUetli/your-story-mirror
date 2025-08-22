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
    this.testSupabaseConnection();
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

    // Use ElevenLabs if enabled, otherwise browser TTS
    if (this.elevenLabsEnabled) {
      console.log('🎤 Using ElevenLabs TTS');
      return this.speakWithElevenLabs(text, options);
    } else {
      console.log('🎤 Using browser TTS');
      return this.speakWithBrowserTTS(text);
    }
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
      });

      console.log('📡 Supabase function response:', {
        error: response.error,
        dataType: typeof response.data,
        dataSize: response.data instanceof Blob ? response.data.size : 'unknown'
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

      // Handle the audio response properly - Supabase functions return binary data as Blob
      let audioBlob: Blob;
      
      if (audioData instanceof Blob) {
        audioBlob = audioData;
        console.log('✅ Using audio data as Blob');
      } else if (audioData instanceof ArrayBuffer) {
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        console.log('✅ Converted ArrayBuffer to Blob');
      } else {
        // Handle other formats if needed
        console.log('🔄 Converting unknown data type to Blob');
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      }
      
      console.log('🎵 Created audio blob, size:', audioBlob.size, 'bytes');
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
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
            reject(e);
          };
          this.currentAudio.play().catch(reject);
        }
      });
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed, falling back to browser TTS:', error);
      return this.speakWithBrowserTTS(text);
    }
  }

  private speakWithBrowserTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Browser TTS not supported');
        resolve();
        return;
      }

      console.log('🎤 Starting browser TTS...');
      
      // Ensure voices are loaded
      let voices = speechSynthesis.getVoices();
      console.log('🎤 Available voices:', voices.length);
      
      if (voices.length === 0) {
        console.log('🎤 Waiting for voices to load...');
        speechSynthesis.addEventListener('voiceschanged', () => {
          voices = speechSynthesis.getVoices();
          console.log('🎤 Voices loaded:', voices.length);
          this.createUtterance(text, voices, resolve);
        });
      } else {
        this.createUtterance(text, voices, resolve);
      }
    });
  }

  private createUtterance(text: string, voices: SpeechSynthesisVoice[], resolve: () => void): void {
    console.log('🎤 All available voices:');
    voices.forEach((voice, i) => {
      console.log(`  ${i}: ${voice.name} (${voice.lang}) - Local: ${voice.localService}`);
    });

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find the best available voice
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') ||
      voice.name.includes('Microsoft') ||
      voice.name.includes('Samantha') || 
      voice.name.includes('Alex') || 
      voice.name.includes('Daniel') ||
      voice.name.includes('Zira') ||
      (voice.lang.startsWith('en') && voice.localService === false)
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log('🎤 Selected voice:', preferredVoice.name, `(${preferredVoice.lang})`);
    } else {
      console.log('🎤 Using default voice');
    }

    console.log('🎤 Speech settings - Rate:', 0.85, 'Pitch:', 1.1, 'Volume:', 0.9);
    
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;

    utterance.onstart = () => console.log('🎤 Speech started');
    utterance.onend = () => {
      console.log('🎤 Speech ended');
      resolve();
    };
    utterance.onerror = (event) => {
      console.error('🎤 Browser TTS error:', event);
      resolve();
    };

    speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Also stop browser TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  isPlaying(): boolean {
    return this.currentAudio && !this.currentAudio.paused;
  }
}

export const voiceService = new VoiceService();
export type { VoiceOptions, Voice };