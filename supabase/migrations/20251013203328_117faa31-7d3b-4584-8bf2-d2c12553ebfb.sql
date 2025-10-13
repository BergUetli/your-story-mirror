-- Remove foreign key constraint on users.user_id if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_id_fkey;

-- Insert demo user profile with basic data
INSERT INTO users (
  user_id,
  name,
  email,
  birth_date,
  birth_place,
  current_location,
  age,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Demo User',
  'demo@youremembered.app',
  '1980-12-01',
  'San Francisco, CA',
  'New York, NY',
  44,
  true,
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  birth_date = EXCLUDED.birth_date,
  birth_place = EXCLUDED.birth_place,
  current_location = EXCLUDED.current_location,
  age = EXCLUDED.age,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at = now();