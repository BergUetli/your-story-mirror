-- Fix the search_path security warnings for the functions I just created
CREATE OR REPLACE FUNCTION public.validate_user_ownership()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the user can only modify their own record
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only modify their own records';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_visitor_log_rate_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;