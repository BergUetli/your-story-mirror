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
  private supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  private supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  private isSupabaseAvailable = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.isSupabaseAvailable = !!(this.supabaseUrl && this.supabaseAnonKey);
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    // If Supabase is not available, use browser's built-in TTS as fallback
    if (!this.isSupabaseAvailable) {
      return this.speakWithBrowserTTS(text);
    }

    try {
      const voiceId = options.voiceId || VOICES[0].id;
      const model = options.model || 'eleven_multilingual_v2';
      const voiceSettings = options.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.8,
      };

      const response = await fetch(`${this.supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          text,
          voiceId,
          model,
          voiceSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
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