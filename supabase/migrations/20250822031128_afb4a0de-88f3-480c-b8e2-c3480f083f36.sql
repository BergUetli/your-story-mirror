-- Fix 1: Add stronger validation to users table
-- Ensure user_id cannot be null and add constraint
ALTER TABLE public.users 
ALTER COLUMN user_id SET NOT NULL;

-- Add check to ensure user_id matches auth.uid() for extra security
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

-- Add trigger for INSERT operations
CREATE TRIGGER validate_user_ownership_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_ownership();

-- Add trigger for UPDATE operations  
CREATE TRIGGER validate_user_ownership_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_ownership();

-- Fix 2: Improve visitor_logs security - require memory to be public
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

-- Fix 3: Add rate limiting function for visitor logs to prevent spam
CREATE OR REPLACE FUNCTION public.check_visitor_log_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent more than 10 logs per visitor per memory per hour
  IF (
    SELECT COUNT(*) 
    FROM public.visitor_logs 
    WHERE visitor_id = NEW.visitor_id 
    AND memory_id = NEW.memory_id 
    AND viewed_at > (now() - interval '1 hour')
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded for visitor logs';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER visitor_log_rate_limit
  BEFORE INSERT ON public.visitor_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_visitor_log_rate_limit();