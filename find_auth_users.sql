-- Find all authenticated users in auth.users
SELECT 
  id as auth_user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Find all entries in users table
SELECT 
  user_id,
  email,
  name
FROM users
ORDER BY created_at DESC;

-- Check if there's a mapping between auth.users and users table
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.user_id as users_table_user_id,
  u.email as users_table_email,
  u.name
FROM auth.users au
LEFT JOIN users u ON au.id = u.user_id
ORDER BY au.created_at DESC;
