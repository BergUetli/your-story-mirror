-- COMPREHENSIVE STORAGE DELETE POLICIES FIX
-- Run this in Supabase Dashboard → SQL Editor to enable proper delete functionality

-- First, ensure the voice-recordings bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings', 
  false,  -- Private bucket
  52428800,  -- 50MB file size limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (must be enabled for policies to work)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to recreate them fresh (avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Guest users can access voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can access guest voice recordings" ON storage.objects;

-- CREATE ENHANCED POLICIES FOR AUTHENTICATED USERS
-- Policy for INSERT (upload)
CREATE POLICY "Users can upload their own voice recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings' 
  AND (
    -- Match user folder: /user_id/filename
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Alternative: path starts with user ID
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- Policy for SELECT (download/view)
CREATE POLICY "Users can view their own voice recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-recordings'
  AND (
    -- Match user folder: /user_id/filename
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Alternative: path starts with user ID
    name ~ ('^' || auth.uid()::text || '/')
    OR
    -- Allow access to demo recordings
    name ~ '^demo-'
  )
);

-- Policy for UPDATE (modify metadata)
CREATE POLICY "Users can update their own voice recordings"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voice-recordings'
  AND (
    -- Match user folder: /user_id/filename
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Alternative: path starts with user ID
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- CRITICAL: Policy for DELETE (this is what enables deletion!)
CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-recordings'
  AND (
    -- Match user folder: /user_id/filename
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Alternative: path starts with user ID
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- CREATE POLICIES FOR GUEST USERS (unauthenticated)
-- Guest users can access recordings in guest folders
CREATE POLICY "Public can access guest voice recordings"
ON storage.objects FOR ALL
USING (
  bucket_id = 'voice-recordings'
  AND (
    -- Allow access to guest recordings
    name ~ '^guest-'
    OR
    -- Allow access to demo recordings
    name ~ '^demo-'
  )
)
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND (
    -- Allow creation in guest folders
    name ~ '^guest-'
    OR
    -- Allow creation in demo folders
    name ~ '^demo-'
  )
);

-- VERIFICATION QUERIES (optional - for testing)
-- You can run these to verify the policies work:

-- Check if bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'voice-recordings';

-- Check existing policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test file path matching (replace 'your-user-id' with actual user ID):
-- SELECT 'your-user-id'::text = (storage.foldername('your-user-id/test.webm'))[1] AS should_be_true;

-- Comments for reference
COMMENT ON POLICY "Users can delete their own voice recordings" ON storage.objects 
IS 'Allows authenticated users to delete their own voice recording files from storage';

COMMENT ON POLICY "Public can access guest voice recordings" ON storage.objects 
IS 'Allows unauthenticated users to manage recordings in guest and demo folders';