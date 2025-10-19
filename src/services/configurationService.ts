import { supabase } from '@/integrations/supabase/client';

export interface SystemConfiguration {
  id?: string;
  conversation_end_timeout_ms: number;
  natural_end_grace_period_ms: number;
  speaking_check_interval_ms: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CONFIG: SystemConfiguration = {
  conversation_end_timeout_ms: 5000, // 5 seconds default
  natural_end_grace_period_ms: 3000, // 3 seconds after Solin stops speaking
  speaking_check_interval_ms: 500, // Check every 500ms
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