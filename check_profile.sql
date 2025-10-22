-- Check if user_profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';

-- Check user profiles data
SELECT id, user_id, preferred_name, created_at 
FROM user_profiles 
LIMIT 5;
