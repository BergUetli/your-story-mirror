/**
 * Sound Effects Service for Solin Interface
 * Provides audio feedback for memory operations and UI interactions
 */

export class SoundEffectsService {
  private static instance: SoundEffectsService;
  private audioContext: AudioContext | null = null;

  public static getInstance(): SoundEffectsService {
    if (!SoundEffectsService.instance) {
      SoundEffectsService.instance = new SoundEffectsService();
    }
    return SoundEffectsService.instance;
  }

  private constructor() {
    // Don't initialize AudioContext until needed - this prevents the browser warning
    // about AudioContext being created before user gesture
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎵 SoundEffects: AudioContext created after user gesture');
    } catch (error) {
      console.warn('🎵 SoundEffects: Audio context not available:', error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    
    if (this.audioContext?.state === 'suspended') {
      try {
        console.log('🎵 SoundEffects: Resuming suspended AudioContext');
        await this.audioContext.resume();
        console.log('🎵 SoundEffects: AudioContext resumed successfully');
      } catch (error) {
        console.warn('🎵 SoundEffects: Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Play a happy whooshing sound for memory appearance
   * Creates a pleasant swoosh with rising tone
   */
  async playHappyWhoosh(): Promise<void> {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext) return;

      // Create oscillator for the whoosh tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Configure the whoosh sound
      oscillator.type = 'sine';
      
      // Rising frequency sweep from 200Hz to 800Hz over 0.6 seconds
      const now = this.audioContext.currentTime;
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.6);
      
      // Envelope: quick rise, sustain, then fade out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1); // Quick rise
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.3); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // Fade out
      
      // Start and stop
      oscillator.start(now);
      oscillator.stop(now + 0.8);
      
      console.log('🎵 Playing happy whoosh sound effect');
    } catch (error) {
      console.warn('Failed to play whoosh sound:', error);
    }
  }

  /**
   * Play a soft notification chime for memory saves
   */
  async playMemorySaveChime(): Promise<void> {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sine';
      
      const now = this.audioContext.currentTime;
      
      // Gentle two-tone chime: C5 -> E5
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
      
      // Soft envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.06, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      oscillator.start(now);
      oscillator.stop(now + 0.6);
      
      console.log('🔔 Playing memory save chime');
    } catch (error) {
      console.warn('Failed to play save chime:', error);
    }
  }

  /**
   * Play a gentle success tone for successful operations
   */
  async playSuccessChime(): Promise<void> {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sine';
      
      const now = this.audioContext.currentTime;
      
      // Triumphant three-note progression: C5 -> E5 -> G5
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.15); // E5  
      oscillator.frequency.setValueAtTime(783.99, now + 0.3); // G5
      
      // Clear, confident envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.25);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      oscillator.start(now);
      oscillator.stop(now + 0.7);
      
      console.log('✅ Playing success chime');
    } catch (error) {
      console.warn('Failed to play success chime:', error);
    }
  }
}

// Export singleton instance
export const soundEffects = SoundEffectsService.getInstance();