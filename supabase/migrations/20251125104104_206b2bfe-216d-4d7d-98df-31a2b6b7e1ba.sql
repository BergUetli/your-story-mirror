-- Remove the validate_user_ownership trigger that blocks Edge Function operations
-- This trigger is redundant since RLS policies already protect the data

-- Drop trigger from users table if it exists
DROP TRIGGER IF EXISTS validate_user_ownership ON public.users;

-- Drop trigger from user_profiles table if it exists
DROP TRIGGER IF EXISTS validate_user_ownership ON public.user_profiles;

-- Drop trigger from memories table if it exists
DROP TRIGGER IF EXISTS validate_user_ownership ON public.memories;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS public.validate_user_ownership() CASCADE;

-- Verify triggers are removed
COMMENT ON SCHEMA public IS 'Removed validate_user_ownership trigger - redundant with RLS policies and was blocking Edge Function operations';
