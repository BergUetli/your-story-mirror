interface VoiceOptions {
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
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
  private currentAudio: HTMLAudioElement | null = null;

  async generateSpeech(
    text: string, 
    options: VoiceOptions = {}
  ): Promise<string> {
    const {
      voiceId = '9BWtsMINqrJLrRacOk9x', // Default to Aria
      model = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.8
    } = options;

    try {
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
          voiceSettings: {
            stability,
            similarity_boost: similarityBoost,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stop();

      const audioUrl = await this.generateSpeech(text, options);
      
      return new Promise((resolve, reject) => {
        this.currentAudio = new Audio(audioUrl);
        
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        this.currentAudio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        this.currentAudio.play().catch(reject);
      });
    } catch (error) {
      console.error('Error speaking:', error);
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