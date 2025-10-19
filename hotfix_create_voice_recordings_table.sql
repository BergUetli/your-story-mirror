-- HOTFIX: Create voice_recordings table for voice search functionality
-- This should be run directly in the Supabase SQL editor

-- Create voice_recordings table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recording metadata
  session_id TEXT NOT NULL,
  recording_type TEXT NOT NULL DEFAULT 'conversation',
  
  -- Audio file information  
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  file_size_bytes INTEGER,
  duration_seconds NUMERIC(8,2),
  
  -- Audio technical details
  mime_type TEXT DEFAULT 'audio/webm',
  compression_type TEXT DEFAULT 'opus',
  sample_rate INTEGER DEFAULT 48000,
  bit_rate INTEGER DEFAULT 64000,
  
  -- Content and search
  transcript_text TEXT,
  conversation_summary TEXT,
  memory_ids UUID[],
  topics TEXT[],
  
  -- Session context
  session_mode TEXT,
  conversation_phase TEXT,
  
  -- Metadata and lifecycle
  is_compressed BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 90,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (if not already enabled)
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can create their own voice recordings" ON public.voice_recordings; 
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON public.voice_recordings;

-- Create RLS policies
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

-- Create indexes for efficient queries
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

-- Function to set expiration date (if it doesn't exist)
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

-- Create trigger for expiration (if it doesn't exist)
DROP TRIGGER IF EXISTS set_voice_recording_expiration_trigger ON public.voice_recordings;
CREATE TRIGGER set_voice_recording_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.voice_recordings
  FOR EACH ROW
  EXECUTE FUNCTION set_voice_recording_expiration();

-- Add comments
COMMENT ON TABLE public.voice_recordings IS 'Stores metadata for conversation audio recordings with voice search capabilities';

-- Display success message
SELECT 'Voice recordings table created successfully' as result;