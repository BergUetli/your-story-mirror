-- Add voice provider settings to system_configuration table
ALTER TABLE public.system_configuration
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'elevenlabs',
ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT DEFAULT 'agent_3201k6n4rrz8e2wrkf9tv372y0w4',
ADD COLUMN IF NOT EXISTS openai_model TEXT DEFAULT 'gpt-4o-realtime-preview-2024-12-17',
ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT DEFAULT '';

-- Add comments for clarity
COMMENT ON COLUMN public.system_configuration.voice_provider IS 'Voice provider to use: elevenlabs, openai, or vapi';
COMMENT ON COLUMN public.system_configuration.elevenlabs_agent_id IS 'ElevenLabs agent ID for voice conversations';
COMMENT ON COLUMN public.system_configuration.openai_model IS 'OpenAI model to use for realtime conversations';
COMMENT ON COLUMN public.system_configuration.vapi_assistant_id IS 'VAPI assistant ID for voice conversations';