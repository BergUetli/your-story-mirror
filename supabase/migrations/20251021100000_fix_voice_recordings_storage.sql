-- Comprehensive fix for voice-recordings storage bucket and RLS policies
-- This migration ensures the bucket exists and has proper permissions

-- Step 1: Create the voice-recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings', 
  false,  -- Private bucket (users need authentication)
  52428800,  -- 50MB file size limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/x-wav']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/x-wav'];

-- Step 2: Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can upload their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Guest users can access voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can access guest voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can access guest voice recordings" ON storage.objects;

-- Step 4: Create comprehensive policies for AUTHENTICATED USERS
-- INSERT policy (upload)
CREATE POLICY "Authenticated users can upload voice recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Match user folder: /user_id/filename
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Alternative: path starts with user ID
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- SELECT policy (download/view/list)
CREATE POLICY "Authenticated users can view voice recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-recordings'
  AND (
    -- Authenticated users can view their own files
    (
      auth.uid() IS NOT NULL
      AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR name ~ ('^' || auth.uid()::text || '/')
      )
    )
    OR
    -- Anyone can view guest/demo files
    name ~ '^guest-'
    OR
    name ~ '^demo-'
  )
);

-- UPDATE policy (modify metadata)
CREATE POLICY "Authenticated users can update voice recordings"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid() IS NOT NULL
  AND (
    -- Match user folder
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- DELETE policy (remove files) - CRITICAL FOR DELETION
CREATE POLICY "Authenticated users can delete voice recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid() IS NOT NULL
  AND (
    -- Match user folder
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    name ~ ('^' || auth.uid()::text || '/')
  )
);

-- Step 5: Create policies for GUEST/UNAUTHENTICATED USERS
-- Allow guests to manage files in guest- and demo- folders
CREATE POLICY "Anyone can access guest voice recordings"
ON storage.objects FOR ALL
USING (
  bucket_id = 'voice-recordings'
  AND (
    name ~ '^guest-'
    OR
    name ~ '^demo-'
  )
)
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND (
    name ~ '^guest-'
    OR
    name ~ '^demo-'
  )
);

-- Step 6: Add helpful comments
COMMENT ON POLICY "Authenticated users can upload voice recordings" ON storage.objects 
IS 'Allows authenticated users to upload voice recordings to their own folder';

COMMENT ON POLICY "Authenticated users can view voice recordings" ON storage.objects 
IS 'Allows users to view their own recordings, and anyone to view guest/demo recordings';

COMMENT ON POLICY "Authenticated users can delete voice recordings" ON storage.objects 
IS 'Allows authenticated users to delete their own voice recording files - required for archive cleanup';

COMMENT ON POLICY "Anyone can access guest voice recordings" ON storage.objects 
IS 'Allows unauthenticated users to manage recordings in guest and demo folders for testing';

-- Verification note
-- Run this to verify policies: SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%voice%';
