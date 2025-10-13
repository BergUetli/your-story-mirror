-- 1) Ensure users.user_id is unique to be a valid FK target
CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_key ON public.users(user_id);

-- 2) Point memories.user_id FK to public.users.user_id instead of auth.users
-- First, find the actual current FK name and drop it
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'memories'
    AND table_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%user_id%'
  LIMIT 1;
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.memories DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- Add new FK referencing public.users.user_id
ALTER TABLE public.memories
  ADD CONSTRAINT memories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(user_id)
  ON DELETE CASCADE;

-- 3) Seed/ensure demo profile exists so FK validation passes for demo inserts
INSERT INTO public.users (
  user_id,
  name,
  email,
  birth_date,
  birth_place,
  current_location,
  age,
  onboarding_completed
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Demo User',
  'demo@youremembered.app',
  '1980-12-01',
  'San Francisco, CA',
  'New York, NY',
  44,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  birth_date = EXCLUDED.birth_date,
  birth_place = EXCLUDED.birth_place,
  current_location = EXCLUDED.current_location,
  age = EXCLUDED.age,
  onboarding_completed = EXCLUDED.onboarding_completed;
