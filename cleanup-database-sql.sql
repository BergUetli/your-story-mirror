-- Database Cleanup SQL Script
-- Run this in Supabase SQL Editor to clear all memories and artifacts while preserving users
-- This bypasses Row Level Security and ensures complete cleanup

-- STEP 1: Disable RLS temporarily for cleanup (if you have admin access)
-- ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE memory_artifacts DISABLE ROW LEVEL SECURITY;

-- STEP 2: Delete all data in correct order (respecting foreign key constraints)

-- Delete memory-artifact relationships first
DELETE FROM memory_artifacts;

-- Delete all memories
DELETE FROM memories;

-- Delete all artifacts  
DELETE FROM artifacts;

-- Delete voice recordings if table exists
DELETE FROM voice_recordings WHERE true;

-- STEP 3: Re-enable RLS (if you disabled it above)
-- ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY; 
-- ALTER TABLE memory_artifacts ENABLE ROW LEVEL SECURITY;

-- STEP 4: Verify cleanup
SELECT 
  'memories' as table_name, 
  count(*) as remaining_records 
FROM memories
UNION ALL
SELECT 
  'artifacts' as table_name, 
  count(*) as remaining_records 
FROM artifacts
UNION ALL  
SELECT 
  'memory_artifacts' as table_name, 
  count(*) as remaining_records 
FROM memory_artifacts;

-- STEP 5: Verify users are preserved (optional)
-- SELECT count(*) as user_count FROM auth.users;