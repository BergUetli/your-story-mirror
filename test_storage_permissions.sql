-- STORAGE PERMISSIONS DIAGNOSTIC SCRIPT
-- Run this in Supabase Dashboard → SQL Editor to test delete permissions

-- 1. Check if voice-recordings bucket exists
SELECT 
  'BUCKET CHECK' as test_type,
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN id = 'voice-recordings' THEN '✅ Bucket exists'
    ELSE '❌ Bucket missing'
  END as status
FROM storage.buckets 
WHERE id = 'voice-recordings'
UNION ALL
SELECT 
  'BUCKET CHECK' as test_type,
  'voice-recordings' as id,
  'voice-recordings' as name,
  null as public,
  null as file_size_limit,
  null as allowed_mime_types,
  '❌ Bucket does not exist - run setup script first!' as status
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings');

-- 2. Check RLS status on storage.objects
SELECT 
  'RLS CHECK' as test_type,
  'storage.objects' as table_name,
  CASE 
    WHEN rowsecurity THEN '✅ RLS enabled on storage.objects'
    ELSE '❌ RLS not enabled - policies won\'t work!'
  END as status
FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Check existing storage policies
SELECT 
  'POLICY CHECK' as test_type,
  policyname as policy_name,
  cmd as command_type,
  CASE 
    WHEN policyname LIKE '%delete%' THEN '✅ Delete policy exists'
    WHEN policyname LIKE '%upload%' OR policyname LIKE '%insert%' THEN '✅ Upload policy exists' 
    WHEN policyname LIKE '%view%' OR policyname LIKE '%select%' THEN '✅ View policy exists'
    ELSE '📝 Other policy'
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname ILIKE '%voice%'
ORDER BY policyname;

-- 4. Test path matching function (for current user if authenticated)
SELECT 
  'PATH MATCHING TEST' as test_type,
  auth.uid()::text as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '⚠️  Not authenticated - testing with sample paths'
    ELSE '✅ Testing with current user ID: ' || auth.uid()::text
  END as auth_status;

-- Test path matching with sample data
SELECT 
  'PATH TEST' as test_type,
  sample_path,
  (storage.foldername(sample_path))[1] as extracted_user_id,
  CASE 
    WHEN (storage.foldername(sample_path))[1] = 'user123' THEN '✅ Path parsing works'
    ELSE '❌ Path parsing issue'
  END as result
FROM (
  VALUES 
    ('user123/conv_12345_conversation.webm'),
    ('user123/recording_67890.webm'),
    ('guest-abc123/demo_recording.webm')
) AS test_data(sample_path);

-- 5. Quick policy test (if you have test data)
-- Uncomment and modify this section if you want to test with actual files:
/*
SELECT 
  'FILE ACCESS TEST' as test_type,
  name as file_path,
  bucket_id,
  CASE 
    WHEN auth.uid()::text = (storage.foldername(name))[1] THEN '✅ User owns this file'
    WHEN name ~ '^guest-' THEN '✅ Guest file accessible'
    ELSE '❌ Access denied'
  END as access_result
FROM storage.objects 
WHERE bucket_id = 'voice-recordings' 
LIMIT 5;
*/

-- SUMMARY
SELECT 
  '📋 DIAGNOSTIC SUMMARY' as test_type,
  'If all checks show ✅, delete functionality should work' as message,
  'If you see ❌, run the fix_storage_delete_policies.sql script first' as action_needed;