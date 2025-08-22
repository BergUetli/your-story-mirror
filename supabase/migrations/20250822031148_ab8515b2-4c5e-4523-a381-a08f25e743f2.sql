-- Security fixes for user data protection and visitor logs

-- Fix 1: Ensure user_id is not nullable for better security
DO $$ 
BEGIN
  -- Only alter if column is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Fix 2: Create user ownership validation function (replace if exists)
CREATE OR REPLACE FUNCTION public.validate_user_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user can only modify their own record
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only modify their own records';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Safely create triggers (drop if exists first)
DROP TRIGGER IF EXISTS validate_user_ownership_insert ON public.users;
CREATE TRIGGER validate_user_ownership_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_ownership();

DROP TRIGGER IF EXISTS validate_user_ownership_update ON public.users;
CREATE TRIGGER validate_user_ownership_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_ownership();

-- Fix 4: Improve visitor_logs security
DROP POLICY IF EXISTS "Anyone can log memory views" ON public.visitor_logs;

CREATE POLICY "Can log views for public memories only"
ON public.visitor_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memories 
    WHERE id = memory_id 
    AND recipient = 'public'
  )
);

-- Fix 5: Add rate limiting for visitor logs
CREATE OR REPLACE FUNCTION public.check_visitor_log_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent more than 5 logs per visitor per memory per hour (reduced from 10)
  IF (
    SELECT COUNT(*) 
    FROM public.visitor_logs 
    WHERE visitor_id = NEW.visitor_id 
    AND memory_id = NEW.memory_id 
    AND viewed_at > (now() - interval '1 hour')
  ) >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many views for this memory';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS visitor_log_rate_limit ON public.visitor_logs;
CREATE TRIGGER visitor_log_rate_limit
  BEFORE INSERT ON public.visitor_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_visitor_log_rate_limit();