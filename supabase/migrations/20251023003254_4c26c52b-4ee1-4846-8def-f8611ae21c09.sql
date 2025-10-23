-- Add metadata column to voice_recordings table for storing additional recording information
ALTER TABLE public.voice_recordings
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;