import { createClient } from '@supabase/supabase-js';

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
  private supabase: any = null;
  private isSupabaseAvailable = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.isSupabaseAvailable = true;
        console.log('Supabase initialized for Voice service');
      } else {
        console.warn('Supabase environment variables not found. Using browser TTS fallback.');
        this.isSupabaseAvailable = false;
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.isSupabaseAvailable = false;
    }
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    // Try ElevenLabs first if Supabase is available
    if (!this.isSupabaseAvailable || !this.supabase) {
      console.warn('Supabase/ElevenLabs not configured, using browser TTS');
      return this.speakWithBrowserTTS(text);
    }

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

      const { data, error } = await this.supabase.functions.invoke('elevenlabs-tts', {
        body: requestBody
      });

      if (error) {
        throw error;
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
        resolve(); // Don't fail, just resolve silently
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a nice voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex') || 
        voice.name.includes('Daniel') ||
        voice.name.includes('Zira') ||
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        resolve(); // Don't fail, just resolve
      };

      speechSynthesis.speak(utterance);
    });
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