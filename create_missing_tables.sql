-- Create missing tables that are causing 404 errors

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT false,
  first_conversation_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create system_configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_configuration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for system_configuration (public read)
ALTER TABLE public.system_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system configuration"
ON public.system_configuration
FOR SELECT
USING (true);

-- Insert default configuration
INSERT INTO public.system_configuration (key, value, description) 
VALUES ('app_config', '{"version": "1.0.0"}', 'Main app configuration')
ON CONFLICT (key) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_system_configuration_key ON public.system_configuration(key);

-- Verify tables exist
SELECT 
    'user_profiles' as table_name, 
    COUNT(*) as row_count 
FROM public.user_profiles
UNION ALL
SELECT 
    'system_configuration' as table_name, 
    COUNT(*) as row_count 
FROM public.system_configuration
UNION ALL
SELECT 
    'voice_recordings' as table_name, 
    COUNT(*) as row_count 
FROM public.voice_recordings;