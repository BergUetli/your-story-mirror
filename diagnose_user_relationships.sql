-- Diagnostic query to understand the relationship between auth.users and users table

-- Step 1: Check what's in auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 2: Check what's in users table
SELECT 
  'users table' as source,
  user_id,
  email,
  name,
  created_at
FROM users
ORDER BY created_at DESC;

-- Step 3: Check the foreign key constraint on user_profiles
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_profiles' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- Step 4: Try to match users by email
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  u.user_id as users_table_user_id,
  u.email as users_table_email,
  u.name,
  CASE 
    WHEN au.id = u.user_id THEN '✅ IDs Match'
    WHEN au.id IS NULL THEN '❌ No auth.users record'
    WHEN u.user_id IS NULL THEN '❌ No users table record'
    ELSE '⚠️ IDs Mismatch'
  END as status
FROM auth.users au
FULL OUTER JOIN users u ON au.email = u.email
WHERE au.email IN (
  'neurosugerryindia@gmail.com',
  'apoorvamohan04@gmail.com',
  'chirag.de.jain@gmail.com',
  'berguetli@gmail.com'
)
ORDER BY au.email, u.email;

-- Step 5: Check if the emails exist in either table
SELECT 
  'Email Check' as info,
  email,
  EXISTS(SELECT 1 FROM auth.users WHERE email = e.email) as in_auth_users,
  EXISTS(SELECT 1 FROM users WHERE email = e.email) as in_users_table
FROM (
  VALUES 
    ('neurosugerryindia@gmail.com'),
    ('apoorvamohan04@gmail.com'),
    ('chirag.de.jain@gmail.com'),
    ('berguetli@gmail.com')
) AS e(email);
