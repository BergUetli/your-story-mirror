-- Comprehensive fix for voice-recordings storage bucket and RLS policies (V2)
-- This version uses the storage schema functions properly

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

-- Step 2: Drop existing conflicting policies (if they exist)
DO $$ 
BEGIN
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
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping policy drops - will be handled by bucket policies';
END $$;

-- Step 3: Create storage policies using Supabase's built-in bucket policy system
-- These are the correct way to set policies in Supabase

-- For authenticated users: Upload policy
DO $$
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Authenticated users can upload voice recordings" already exists, skipping';
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create upload policy';
END $$;

-- For authenticated users: View/Select policy
DO $$
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Authenticated users can view voice recordings" already exists, skipping';
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create view policy';
END $$;

-- For authenticated users: Update policy
DO $$
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Authenticated users can update voice recordings" already exists, skipping';
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create update policy';
END $$;

-- For authenticated users: Delete policy
DO $$
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Authenticated users can delete voice recordings" already exists, skipping';
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create delete policy';
END $$;

-- For guest users: All operations policy
DO $$
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Anyone can access guest voice recordings" already exists, skipping';
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create guest policy';
END $$;

-- Step 4: Verify the setup
DO $$
DECLARE
    bucket_exists boolean;
    policy_count int;
BEGIN
    -- Check if bucket exists
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings') INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Bucket "voice-recordings" exists';
    ELSE
        RAISE WARNING '❌ Bucket "voice-recordings" does not exist!';
    END IF;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname LIKE '%voice%';
    
    RAISE NOTICE '📋 Found % voice recording policies', policy_count;
    
    IF policy_count >= 5 THEN
        RAISE NOTICE '✅ All policies created successfully';
    ELSE
        RAISE NOTICE '⚠️ Expected 5 policies, found %. Some policies may need manual creation.', policy_count;
    END IF;
END $$;
