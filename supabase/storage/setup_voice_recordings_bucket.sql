-- Create storage bucket for voice recordings
-- This should be run in the Supabase dashboard or via CLI

-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings', 
  false,  -- Private bucket
  52428800,  -- 50MB file size limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for voice recordings bucket - users can only access their own recordings
CREATE POLICY "Users can upload their own voice recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own voice recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own voice recordings"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;