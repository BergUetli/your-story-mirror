-- Check if voice-recordings bucket exists and its configuration
SELECT * FROM storage.buckets WHERE id = 'voice-recordings';

-- Check existing policies for voice-recordings
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice%'
ORDER BY policyname;
