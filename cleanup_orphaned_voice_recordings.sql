-- CLEANUP ORPHANED VOICE RECORDINGS
-- Run this to remove database records that don't have corresponding audio files in storage

-- First, let's see what we have in the voice_recordings table
SELECT 
  'CURRENT RECORDS' as status,
  id,
  user_id,
  session_id,
  storage_path,
  created_at,
  CASE 
    WHEN storage_path IS NULL THEN '❌ No storage path'
    WHEN storage_path = '' THEN '❌ Empty storage path'  
    ELSE '✅ Has storage path'
  END as storage_status,
  conversation_summary
FROM voice_recordings 
ORDER BY created_at DESC;

-- Count records by storage status
SELECT 
  'STORAGE STATUS SUMMARY' as report_type,
  CASE 
    WHEN storage_path IS NULL OR storage_path = '' THEN 'Missing Storage Path'
    ELSE 'Has Storage Path'
  END as status,
  COUNT(*) as count
FROM voice_recordings 
GROUP BY CASE 
  WHEN storage_path IS NULL OR storage_path = '' THEN 'Missing Storage Path'
  ELSE 'Has Storage Path'
END;

-- Show records created today (likely the ones you just made)
SELECT 
  'TODAYS RECORDS' as status,
  id,
  user_id,
  session_id,
  storage_path,
  created_at,
  conversation_summary
FROM voice_recordings 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- CLEANUP: Uncomment the lines below to actually delete orphaned records
-- ⚠️ WARNING: This will permanently delete database records without storage files!

-- DELETE FROM voice_recordings 
-- WHERE storage_path IS NULL OR storage_path = '';

-- After cleanup, verify what remains:
-- SELECT 'AFTER CLEANUP' as status, COUNT(*) as remaining_records 
-- FROM voice_recordings;