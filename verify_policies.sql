-- Verify the policies were created correctly
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice%'
ORDER BY policyname;

-- Check bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'voice-recordings';

-- Test if current user can authenticate
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
    ELSE '✅ Authenticated as: ' || auth.uid()::text
  END as auth_status;
