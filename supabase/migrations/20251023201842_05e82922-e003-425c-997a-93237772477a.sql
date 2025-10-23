-- Add audio mixing configuration columns to system_configuration table
ALTER TABLE public.system_configuration 
ADD COLUMN IF NOT EXISTS audio_ducking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audio_ducking_amount NUMERIC(3,2) DEFAULT 0.3 CHECK (audio_ducking_amount >= 0 AND audio_ducking_amount <= 1),
ADD COLUMN IF NOT EXISTS audio_ducking_attack_ms INTEGER DEFAULT 50 CHECK (audio_ducking_attack_ms >= 10),
ADD COLUMN IF NOT EXISTS audio_ducking_release_ms INTEGER DEFAULT 200 CHECK (audio_ducking_release_ms >= 50),
ADD COLUMN IF NOT EXISTS audio_buffer_delay_ms INTEGER DEFAULT 0 CHECK (audio_buffer_delay_ms >= 0),
ADD COLUMN IF NOT EXISTS audio_agent_volume NUMERIC(3,2) DEFAULT 1.0 CHECK (audio_agent_volume >= 0 AND audio_agent_volume <= 1),
ADD COLUMN IF NOT EXISTS audio_mic_volume NUMERIC(3,2) DEFAULT 1.0 CHECK (audio_mic_volume >= 0 AND audio_mic_volume <= 1),
ADD COLUMN IF NOT EXISTS audio_timestamp_correlation BOOLEAN DEFAULT true;

-- Add comment explaining the new fields
COMMENT ON COLUMN public.system_configuration.audio_ducking_enabled IS 'Enable automatic microphone volume reduction when agent speaks';
COMMENT ON COLUMN public.system_configuration.audio_ducking_amount IS 'Target volume level for microphone when ducked (0-1)';
COMMENT ON COLUMN public.system_configuration.audio_ducking_attack_ms IS 'Time in ms to reduce volume when agent starts speaking';
COMMENT ON COLUMN public.system_configuration.audio_ducking_release_ms IS 'Time in ms to restore volume when agent stops speaking';
COMMENT ON COLUMN public.system_configuration.audio_buffer_delay_ms IS 'Delay in ms for agent audio playback for better timing alignment';
COMMENT ON COLUMN public.system_configuration.audio_agent_volume IS 'Agent voice volume level (0-1)';
COMMENT ON COLUMN public.system_configuration.audio_mic_volume IS 'Microphone recording volume level (0-1)';
COMMENT ON COLUMN public.system_configuration.audio_timestamp_correlation IS 'Enable correlation tracking between audio chunks and transcript entries';