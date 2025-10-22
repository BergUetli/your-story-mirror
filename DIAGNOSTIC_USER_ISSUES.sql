-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR USER-RELATED ISSUES
-- ============================================================================
-- This script diagnoses why memories can't be saved and voice recordings 
-- don't appear for your user account
-- 
-- ISSUES:
-- 1. Foreign key constraint error when saving memories
-- 2. Voice recordings not appearing in Archive
--
-- ROOT CAUSE: User account might not exist in auth.users table
-- ============================================================================

-- ====================
-- STEP 1: Check if your user exists in auth.users
-- ====================
-- Replace 'YOUR_EMAIL_HERE' with your actual email address
-- This should return 1 row if your account exists

SELECT 
  'auth.users CHECK' as check_name,
  count(*) as user_count,
  json_agg(json_build_object(
    'id', id,
    'email', email,
    'created_at', created_at,
    'email_confirmed_at', email_confirmed_at
  )) as users
FROM auth.users
WHERE email = 'apoorvamohan04@gmail.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- ====================
-- STEP 2: Check if you have a user_profiles entry
-- ====================
-- This table stores extended profile information

SELECT 
  'user_profiles CHECK' as check_name,
  count(*) as profile_count,
  json_agg(json_build_object(
    'user_id', user_id,
    'preferred_name', preferred_name,
    'onboarding_completed', onboarding_completed,
    'created_at', created_at
  )) as profiles
FROM user_profiles up
WHERE EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE au.email = 'apoorvamohan04@gmail.com' -- ⚠️ CHANGE THIS TO YOUR EMAIL
  AND au.id = up.user_id
);

-- ====================
-- STEP 3: Check voice_recordings for your user
-- ====================
-- Shows all voice recordings linked to your account

SELECT 
  'voice_recordings CHECK' as check_name,
  count(*) as recording_count,
  json_agg(json_build_object(
    'id', id,
    'session_id', session_id,
    'recording_type', recording_type,
    'storage_path', storage_path,
    'duration_seconds', duration_seconds,
    'created_at', created_at
  ) ORDER BY created_at DESC) as recordings
FROM voice_recordings vr
WHERE EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE au.email = 'apoorvamohan04@gmail.com' -- ⚠️ CHANGE THIS TO YOUR EMAIL
  AND au.id::text = vr.user_id
);

-- ====================
-- STEP 4: Check memories for your user
-- ====================
-- Shows all memories linked to your account

SELECT 
  'memories CHECK' as check_name,
  count(*) as memory_count,
  json_agg(json_build_object(
    'id', id,
    'title', title,
    'recipient', recipient,
    'created_at', created_at
  ) ORDER BY created_at DESC) as memories
FROM memories m
WHERE EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE au.email = 'apoorvamohan04@gmail.com' -- ⚠️ CHANGE THIS TO YOUR EMAIL
  AND au.id = m.user_id
);

-- ====================
-- STEP 5: Find orphaned records (without valid user_id)
-- ====================
-- Identifies voice_recordings that reference non-existent users

SELECT 
  'ORPHANED voice_recordings' as check_name,
  count(*) as orphaned_count,
  json_agg(DISTINCT vr.user_id) as orphaned_user_ids
FROM voice_recordings vr
LEFT JOIN auth.users au ON au.id::text = vr.user_id
WHERE au.id IS NULL;

-- ====================
-- STEP 6: Find orphaned memories
-- ====================

SELECT 
  'ORPHANED memories' as check_name,
  count(*) as orphaned_count,
  json_agg(DISTINCT m.user_id) as orphaned_user_ids
FROM memories m
LEFT JOIN auth.users au ON au.id = m.user_id
WHERE au.id IS NULL;

-- ====================
-- DIAGNOSTIC SUMMARY
-- ====================
-- Run this to get a complete overview

WITH user_check AS (
  SELECT id, email FROM auth.users WHERE email = 'apoorvamohan04@gmail.com' -- ⚠️ CHANGE THIS
),
profile_check AS (
  SELECT user_id FROM user_profiles WHERE user_id IN (SELECT id FROM user_check)
),
recordings_check AS (
  SELECT COUNT(*) as count FROM voice_recordings WHERE user_id IN (SELECT id::text FROM user_check)
),
memories_check AS (
  SELECT COUNT(*) as count FROM memories WHERE user_id IN (SELECT id FROM user_check)
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_check) THEN '✅ User exists in auth.users'
    ELSE '❌ User DOES NOT exist in auth.users - THIS IS THE PROBLEM!'
  END as auth_user_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM profile_check) THEN '✅ User profile exists'
    ELSE '⚠️ User profile missing (will be created on next login)'
  END as profile_status,
  COALESCE((SELECT count FROM recordings_check), 0) as voice_recordings_count,
  COALESCE((SELECT count FROM memories_check), 0) as memories_count,
  (SELECT id FROM user_check) as user_id_if_exists;

-- ============================================================================
-- SOLUTION STEPS
-- ============================================================================

-- IF USER DOES NOT EXIST IN auth.users:
-- 1. You need to sign up again with that email address
-- 2. OR contact the database admin to check why the account was deleted
-- 3. OR if you're using a test account, create it properly through the app

-- IF USER EXISTS BUT NO RECORDINGS APPEAR:
-- 1. Check the voice_recordings table has data with your user_id
-- 2. Check RLS policies are not blocking access
-- 3. Check browser console for errors when loading Archive page

-- IF MEMORIES WON'T SAVE:
-- 1. Ensure your user exists in auth.users (this query shows that)
-- 2. Check the user_id being sent matches your auth.users.id
-- 3. Check browser console for the exact error message
