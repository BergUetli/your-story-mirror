-- Fix: Delete orphan user record in public.users that doesn't match auth.users
-- The real authenticated user is 19e6ba16-8a06-447e-951d-ceb0299bbdb0
-- The orphan record 39f59831-88c2-4b5b-ba3b-045f5e25d7c8 needs to be removed

-- Step 1: Delete orphan user_profiles entry
DELETE FROM user_profiles
WHERE user_id = '39f59831-88c2-4b5b-ba3b-045f5e25d7c8';

-- Step 2: Delete orphan users entry
DELETE FROM users
WHERE user_id = '39f59831-88c2-4b5b-ba3b-045f5e25d7c8';

-- Step 3: Ensure public.users has the correct record for the auth user
INSERT INTO users (user_id, email, name)
VALUES (
  '19e6ba16-8a06-447e-951d-ceb0299bbdb0',
  'berguetli@gmail.com',
  'Rishi'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name;