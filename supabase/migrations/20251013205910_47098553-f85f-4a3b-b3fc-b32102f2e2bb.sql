-- Add permissive SELECT policy for demo user on users table
CREATE POLICY "Allow demo user profile access (TEMPORARY)"
ON public.users
AS PERMISSIVE
FOR SELECT
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);