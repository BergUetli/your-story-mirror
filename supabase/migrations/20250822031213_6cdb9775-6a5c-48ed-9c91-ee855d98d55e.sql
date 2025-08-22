-- Enhanced security fixes - handling existing objects properly

-- Fix 1: User ownership validation function
CREATE OR REPLACE FUNCTION public.validate_user_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user can only modify their own record
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Users can only modify their own records';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Add triggers for user table validation (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_user_ownership_insert') THEN
    CREATE TRIGGER validate_user_ownership_insert
      BEFORE INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_user_ownership();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_user_ownership_update') THEN
    CREATE TRIGGER validate_user_ownership_update
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_user_ownership();
  END IF;
END $$;

-- Fix 3: Update visitor logs policy (handle existing)
DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'visitor_logs' 
    AND policyname IN ('Anyone can log memory views', 'Can log views for public memories only')
  ) THEN
    DROP POLICY IF EXISTS "Anyone can log memory views" ON public.visitor_logs;
    DROP POLICY IF EXISTS "Can log views for public memories only" ON public.visitor_logs;
  END IF;
  
  -- Create the new secure policy
  EXECUTE 'CREATE POLICY "Secure visitor logging" ON public.visitor_logs FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories 
      WHERE id = memory_id 
      AND recipient = ''public''
    )
  )';
END $$;

-- Fix 4: Rate limiting for visitor logs
CREATE OR REPLACE FUNCTION public.check_visitor_log_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent spam: max 3 logs per visitor per memory per 30 minutes
  IF (
    SELECT COUNT(*) 
    FROM public.visitor_logs 
    WHERE visitor_id = NEW.visitor_id 
    AND memory_id = NEW.memory_id 
    AND viewed_at > (now() - interval '30 minutes')
  ) >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Please wait before viewing this memory again';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limit trigger (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'visitor_log_rate_limit') THEN
    CREATE TRIGGER visitor_log_rate_limit
      BEFORE INSERT ON public.visitor_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.check_visitor_log_rate_limit();
  END IF;
END $$;