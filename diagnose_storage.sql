-- ========================================
-- VOICE RECORDINGS STORAGE DIAGNOSTICS
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor to diagnose storage issues

-- ===== 1. CHECK BUCKET CONFIGURATION =====
SELECT 
  '🪣 BUCKET CHECK' as section,
  COALESCE(
    (SELECT 
      json_build_object(
        'exists', true,
        'id', id,
        'name', name,
        'public', public,
        'file_size_limit', file_size_limit,
        'allowed_mime_types', allowed_mime_types,
        'status', '✅ Bucket configured correctly'
      )::text
    FROM storage.buckets 
    WHERE id = 'voice-recordings'),
    '❌ Bucket does NOT exist - apply migration first!'
  ) as result;

-- ===== 2. CHECK RLS STATUS =====
SELECT 
  '🔒 RLS CHECK' as section,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is ENABLED on storage.objects'
    ELSE '❌ RLS is DISABLED - policies will not work!'
  END as result
FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- ===== 3. CHECK STORAGE POLICIES =====
SELECT 
  '📜 POLICIES CHECK' as section,
  COUNT(*) as policy_count,
  string_agg(policyname || ' (' || cmd || ')', E'\n  ') as policies,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ All required policies exist'
    WHEN COUNT(*) > 0 THEN '⚠️ Some policies exist but may be incomplete'
    ELSE '❌ NO policies found - apply migration!'
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice%';

-- ===== 4. LIST SPECIFIC POLICIES =====
SELECT 
  '📋 POLICY DETAILS' as section,
  policyname as policy_name,
  cmd as operation,
  CASE cmd
    WHEN 'INSERT' THEN '⬆️ Upload'
    WHEN 'SELECT' THEN '👁️ View/Download'
    WHEN 'UPDATE' THEN '✏️ Modify'
    WHEN 'DELETE' THEN '🗑️ Delete'
    WHEN 'ALL' THEN '🔓 All Operations'
  END as description,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice%'
ORDER BY 
  CASE cmd
    WHEN 'INSERT' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ===== 5. CHECK CURRENT USER =====
SELECT 
  '👤 USER CHECK' as section,
  CASE 
    WHEN auth.uid() IS NULL THEN '⚠️ NOT authenticated (guest mode)'
    ELSE '✅ Authenticated as: ' || auth.uid()::text
  END as result,
  auth.uid()::text as user_id;

-- ===== 6. TEST PATH MATCHING =====
-- This tests if the path matching logic in policies works correctly
WITH test_paths AS (
  SELECT * FROM (VALUES
    ('a1b2c3d4-5678-90ab-cdef-1234567890ab/conv_123_conversation.webm', 'a1b2c3d4-5678-90ab-cdef-1234567890ab'),
    ('guest-12345/demo_recording.webm', 'guest-12345'),
    ('demo-test/test_audio.wav', 'demo-test')
  ) AS t(path, expected_folder)
)
SELECT 
  '🧪 PATH MATCHING TEST' as section,
  path,
  (storage.foldername(path))[1] as extracted_folder,
  expected_folder,
  CASE 
    WHEN (storage.foldername(path))[1] = expected_folder THEN '✅ Correct'
    ELSE '❌ Failed'
  END as result
FROM test_paths;

-- ===== 7. CHECK EXISTING FILES (if any) =====
SELECT 
  '📁 FILES CHECK' as section,
  COUNT(*) as file_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' files in voice-recordings bucket'
    ELSE '⚠️ No files yet (this is normal for new setup)'
  END as status
FROM storage.objects 
WHERE bucket_id = 'voice-recordings';

-- ===== 8. SUMMARY & ACTION ITEMS =====
SELECT 
  '📊 SUMMARY' as section,
  CASE 
    WHEN (
      EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings')
      AND EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects' AND rowsecurity = true)
      AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%voice%') >= 5
    ) THEN '✅ ALL CHECKS PASSED - Storage is configured correctly!'
    WHEN NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings') THEN '❌ BUCKET MISSING - Apply migration: 20251021100000_fix_voice_recordings_storage.sql'
    WHEN NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects' AND rowsecurity = true) THEN '❌ RLS DISABLED - Apply migration to enable RLS'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%voice%') < 5 THEN '❌ POLICIES MISSING - Apply migration to create policies'
    ELSE '⚠️ PARTIAL CONFIGURATION - Review individual checks above'
  END as result;

-- ===== ADDITIONAL DEBUG INFO =====
-- Uncomment these if you need more detailed debugging:

-- Check all storage buckets:
-- SELECT * FROM storage.buckets;

-- Check all storage policies (not just voice):
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check recent storage objects:
-- SELECT name, bucket_id, created_at FROM storage.objects ORDER BY created_at DESC LIMIT 10;
