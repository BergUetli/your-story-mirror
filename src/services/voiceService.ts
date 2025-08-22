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

// Top ElevenLabs voices with their IDs
export const VOICES: Voice[] = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm, conversational female voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear, professional female voice' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Mature, authoritative male voice' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Young, friendly male voice' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Gentle, nurturing female voice' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Energetic, youthful female voice' },
];

class VoiceService {
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    console.log('✅ VoiceService initialized with Supabase client');
    this.testSupabaseConnection();
  }

  private async testSupabaseConnection() {
    try {
      console.log('🧪 Testing ElevenLabs API key and connection...');
      
      // First test if the API key is accessible with debug function
      const { data: debugData, error: debugError } = await supabase.functions.invoke('debug-key');
      
      if (debugError) {
        console.error('❌ Debug function failed:', debugError);
        return;
      }
      
      console.log('🔑 Debug key result:', debugData);
      
      if (debugData.hasKey) {
        console.log('✅ ElevenLabs API key is accessible');
        
        // Now test the actual TTS function
        const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
          body: { text: 'test', voiceId: VOICES[0].id }
        });
        
        if (error) {
          console.warn('⚠️ ElevenLabs TTS function test failed:', error);
        } else {
          console.log('✅ ElevenLabs TTS function is accessible');
        }
      } else {
        console.error('❌ ElevenLabs API key not found:', debugData);
      }
    } catch (error) {
      console.warn('⚠️ Could not test ElevenLabs function:', error);
    }
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    try {
      const requestBody = {
        text,
        voiceId: options.voiceId || VOICES[0].id, // Default to Aria - warm, conversational
        model: options.model || 'eleven_turbo_v2_5', // Use Turbo v2.5 for better quality and speed
        voiceSettings: options.voiceSettings || {
          stability: 0.71, // Higher stability for more consistent voice
          similarity_boost: 0.5, // Lower similarity boost for more natural variation
          style: 0.0, // Neutral style
          use_speaker_boost: true // Enable speaker boost for clearer audio
        }
      };

      console.log('🎤 Calling ElevenLabs TTS with:', { text: text.substring(0, 50) + '...', voiceId: requestBody.voiceId });

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Supabase function invoke error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ No audio data received from ElevenLabs');
        throw new Error('No audio data received');
      }

      // The response should be audio data - handle different response formats
      let audioBlob;
      if (data instanceof ArrayBuffer) {
        audioBlob = new Blob([data], { type: 'audio/mpeg' });
      } else if (typeof data === 'string') {
        // Handle base64 encoded audio
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      } else {
        audioBlob = new Blob([data], { type: 'audio/mpeg' });
      }
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.currentAudio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        if (this.currentAudio) {
          this.currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          this.currentAudio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            // Fallback to browser TTS on error
            this.speakWithBrowserTTS(text).then(resolve).catch(reject);
          };
          this.currentAudio.play().catch(() => {
            // Fallback to browser TTS if audio play fails
            this.speakWithBrowserTTS(text).then(resolve).catch(reject);
          });
        }
      });
    } catch (error) {
      console.error('Error with ElevenLabs TTS, falling back to browser TTS:', error);
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