-- Fix for Archive page: Create voice_recordings table
-- This SQL should be run in the Supabase SQL Editor

-- Create update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Voice recordings table for storing conversation audio metadata and search functionality
CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recording metadata
  session_id TEXT NOT NULL, -- Links to conversation session
  recording_type TEXT NOT NULL DEFAULT 'conversation', -- 'conversation', 'memory_creation', 'voice_search'
  
  -- Audio file information  
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  original_filename TEXT,
  file_size_bytes INTEGER,
  duration_seconds NUMERIC(8,2),
  
  -- Audio technical details
  mime_type TEXT DEFAULT 'audio/webm',
  compression_type TEXT DEFAULT 'opus',
  sample_rate INTEGER DEFAULT 48000,
  bit_rate INTEGER DEFAULT 64000,
  
  -- Content and search
  transcript_text TEXT, -- Full transcript for text search
  conversation_summary TEXT, -- AI-generated summary
  memory_ids UUID[], -- Associated memory IDs created during this recording
  topics TEXT[], -- Extracted topics/themes for search
  
  -- Session context
  session_mode TEXT, -- daily_journal, memory_creation, memory_browsing, general_chat
  conversation_phase TEXT, -- greeting, mode_selection, active_conversation, wrap_up
  
  -- Metadata and lifecycle
  is_compressed BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 90, -- Auto-delete after this many days
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_recordings
CREATE POLICY "Users can view their own voice recordings"
ON public.voice_recordings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice recordings"
ON public.voice_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice recordings"
ON public.voice_recordings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice recordings"
ON public.voice_recordings
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_session_id ON public.voice_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_created_at ON public.voice_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_expires_at ON public.voice_recordings(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_recordings_memory_ids ON public.voice_recordings USING GIN(memory_ids);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_topics ON public.voice_recordings USING GIN(topics);

-- Full-text search on transcript
CREATE INDEX IF NOT EXISTS idx_voice_recordings_transcript_search 
ON public.voice_recordings 
USING gin(to_tsvector('english', COALESCE(transcript_text, '')));

-- Add trigger for updated_at
CREATE TRIGGER update_voice_recordings_updated_at
  BEFORE UPDATE ON public.voice_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically set expiration date
CREATE OR REPLACE FUNCTION set_voice_recording_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiration date based on retention_days
  IF NEW.retention_days IS NOT NULL THEN
    NEW.expires_at = NEW.created_at + (NEW.retention_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiration date on insert/update
CREATE TRIGGER set_voice_recording_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.voice_recordings
  FOR EACH ROW
  EXECUTE FUNCTION set_voice_recording_expiration();

-- Comments for documentation
COMMENT ON TABLE public.voice_recordings IS 'Stores metadata for conversation audio recordings with voice search capabilities';
COMMENT ON COLUMN public.voice_recordings.session_id IS 'Unique identifier for the conversation session';
COMMENT ON COLUMN public.voice_recordings.storage_path IS 'Path to audio file in Supabase Storage bucket';
COMMENT ON COLUMN public.voice_recordings.transcript_text IS 'Full conversation transcript for text-based search';
COMMENT ON COLUMN public.voice_recordings.memory_ids IS 'Array of memory IDs created during this recording session';
COMMENT ON COLUMN public.voice_recordings.topics IS 'Extracted conversation topics for thematic search';
COMMENT ON COLUMN public.voice_recordings.retention_days IS 'Number of days to keep this recording before auto-deletion';