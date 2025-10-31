import { supabase } from '@/integrations/supabase/client';

export type VoiceProvider = 'elevenlabs' | 'openai' | 'vapi';

export interface SystemConfiguration {
  id?: string;
  // Voice Provider Settings
  voice_provider: VoiceProvider;
  elevenlabs_agent_id: string;
  openai_model: string;
  vapi_assistant_id: string;
  // Conversation timing
  conversation_end_timeout_ms: number;
  natural_end_grace_period_ms: number;
  speaking_check_interval_ms: number;
  // Audio mixing parameters
  audio_ducking_enabled: boolean;
  audio_ducking_amount: number; // 0-1, how much to reduce mic volume when agent speaks
  audio_ducking_attack_ms: number; // How fast to reduce volume
  audio_ducking_release_ms: number; // How fast to restore volume
  audio_buffer_delay_ms: number; // Delay for agent audio playback
  audio_agent_volume: number; // 0-1, agent audio volume
  audio_mic_volume: number; // 0-1, microphone volume
  audio_timestamp_correlation: boolean; // Enable timestamp tracking
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CONFIG: SystemConfiguration = {
  // Voice Provider Settings
  voice_provider: 'elevenlabs',
  elevenlabs_agent_id: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4',
  openai_model: 'gpt-4o-realtime-preview-2024-12-17',
  vapi_assistant_id: '',
  // Conversation timing
  conversation_end_timeout_ms: 5000, // 5 seconds default
  natural_end_grace_period_ms: 3000, // 3 seconds after Solin stops speaking
  speaking_check_interval_ms: 500, // Check every 500ms
  // Audio mixing defaults
  audio_ducking_enabled: true,
  audio_ducking_amount: 0.3, // Reduce mic to 30% when agent speaks
  audio_ducking_attack_ms: 50, // Fast attack
  audio_ducking_release_ms: 200, // Slower release
  audio_buffer_delay_ms: 0, // No delay by default
  audio_agent_volume: 1.0, // Full volume
  audio_mic_volume: 1.0, // Full volume
  audio_timestamp_correlation: true, // Enable timestamps
};

class ConfigurationService {
  private config: SystemConfiguration = DEFAULT_CONFIG;
  private listeners: ((config: SystemConfiguration) => void)[] = [];

  /**
   * Get current configuration
   */
  getConfig(): SystemConfiguration {
    return { ...this.config };
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: SystemConfiguration) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  /**
   * Load configuration from database
   */
  async loadConfiguration(): Promise<SystemConfiguration> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to load configuration from database:', error);
        // Use defaults if database fails
        return this.config;
      }

      if (data) {
        this.config = {
          ...DEFAULT_CONFIG,
          ...data,
        };
        console.log('✅ Configuration loaded from database:', this.config);
      } else {
        console.log('📋 No configuration found in database, using defaults:', this.config);
      }

      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return this.config;
    }
  }

  /**
   * Save configuration to database
   */
  async saveConfiguration(newConfig: Partial<SystemConfiguration>): Promise<SystemConfiguration> {
    try {
      const updatedConfig = {
        ...this.config,
        ...newConfig,
      };

      // Try to update existing configuration first
      const { data: existingConfig } = await supabase
        .from('system_configuration')
        .select('id')
        .limit(1)
        .maybeSingle();

      let result;
      if (existingConfig?.id) {
        // Update existing
        result = await supabase
          .from('system_configuration')
          .update(updatedConfig)
          .eq('id', existingConfig.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('system_configuration')
          .insert(updatedConfig)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Failed to save configuration:', result.error);
        // If database save fails, still update local config for this session
        this.config = updatedConfig;
        this.notifyListeners();
        throw result.error;
      }

      this.config = result.data;
      console.log('✅ Configuration saved to database:', this.config);
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<SystemConfiguration> {
    return await this.saveConfiguration(DEFAULT_CONFIG);
  }

  /**
   * Get conversation end timeout in milliseconds
   */
  getConversationEndTimeout(): number {
    return this.config.conversation_end_timeout_ms;
  }

  /**
   * Get natural end grace period in milliseconds
   */
  getNaturalEndGracePeriod(): number {
    return this.config.natural_end_grace_period_ms;
  }

  /**
   * Get speaking check interval in milliseconds
   */
  getSpeakingCheckInterval(): number {
    return this.config.speaking_check_interval_ms;
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();

// Auto-load configuration when service is imported
configurationService.loadConfiguration().catch(console.error);